"""内核单元测试（stdlib unittest，零第三方依赖）。

覆盖（对应需求文档条款）：
- 状态机迁移与收敛（§4.3）
- 证据账本哈希链与防篡改（§11 审计防篡改）、结论绑定完整性（§9.5 门禁）
- 报告门禁 Fail-closed（§9.5）
- 确定性可复现：两次独立执行产出相同账本摘要（§10 可复现）
- run_dir 路径白名单（§11 输入校验 / 防目录穿越）
"""

from __future__ import annotations

import contextlib
import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sciret_kernel import report as report_mod  # noqa: E402
from sciret_kernel.__main__ import PathGuardError, guard_run_dir, main  # noqa: E402
from sciret_kernel.jsonio import canonical_json, sha256_text  # noqa: E402
from sciret_kernel.ledger import Ledger, LedgerError  # noqa: E402
from sciret_kernel.pipeline import ledger_digest, run_all  # noqa: E402
from sciret_kernel.state import RunState, StateError, StepStatus  # noqa: E402
from sciret_kernel.workflow import steps_for  # noqa: E402

GOAL = "检索并综述固态电解质界面阻抗的表征方法"


@contextlib.contextmanager
def freeze_clock(stamp: str):
    """冻结所有产生墙钟时间的模块。

    注意：三处都要打补丁——state._now / ledger._utc_now / report._utc_now 各自独立，
    只patch 其中一处会出现"部分记录用真时间"的混合账本，测试结论不可信。
    """
    with mock.patch("sciret_kernel.state._now", return_value=stamp), \
         mock.patch("sciret_kernel.ledger._utc_now", return_value=stamp), \
         mock.patch("sciret_kernel.report._utc_now", return_value=stamp):
        yield


def make_run(tmp: Path, name: str = "run-test") -> Path:
    run_dir = tmp / name
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir


def plan(run_dir: Path, workflow: str = "research", lit_source: str = "local", task_id: str | None = None) -> RunState:
    return RunState.create(
        run_dir,
        task_id=task_id or run_dir.name,
        goal=GOAL,
        workflow=workflow,
        lit_source=lit_source,
        sources=["crossref", "openalex"],
        steps=steps_for(workflow),
    )


class TestStateMachine(unittest.TestCase):
    def test_happy_path_and_converge(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            state = plan(run_dir)
            self.assertEqual(state.run_status.value, "PLANNED")
            state.start_step(run_dir, "R1")
            self.assertEqual(state.run_status.value, "RUNNING")
            state.finish_step(run_dir, "R1")
            self.assertEqual(state.step("R1").status, StepStatus.DONE)
            for sid, _ in steps_for("research")[1:]:
                state.start_step(run_dir, sid)
                state.finish_step(run_dir, sid)
            self.assertEqual(state.run_status.value, "DONE")  # 自动收敛
            self.assertEqual(state.step("R1").attempts, 1)

    def test_terminal_is_immutable_and_idempotent(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            state = plan(run_dir)
            for sid, _ in steps_for("research"):
                state.start_step(run_dir, sid)
                state.finish_step(run_dir, sid)
            self.assertTrue(state.is_terminal)
            with self.assertRaises(StateError):
                state.start_step(run_dir, "R1")
            # 终态幂等：重复 finish 不改变状态
            with self.assertRaises(StateError):
                state.finish_step(run_dir, "R1")

    def test_skip_and_failed_retry_and_remaining(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            state = plan(run_dir)
            state.skip_step(run_dir, "R2")  # PENDING → SKIPPED
            state.start_step(run_dir, "R1")
            state.finish_step(run_dir, "R1", error="boom")
            self.assertEqual(state.step("R1").status, StepStatus.FAILED)
            self.assertEqual(state.run_status.value, "RUNNING")  # 存在 FAILED：等调用方决策
            self.assertIn("R1", state.remaining_steps())
            self.assertNotIn("R2", state.remaining_steps())  # SKIPPED 复用
            state.start_step(run_dir, "R1")  # FAILED → RUNNING（重试）
            self.assertEqual(state.step("R1").attempts, 2)

    def test_degradation_levels(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            state = plan(run_dir)
            state.add_degradation(run_dir, level="info", source="s1", reason="限流", impact="无", resumable=True, step="R1")
            self.assertFalse(state.degraded)  # L1 不置降级
            state.add_degradation(run_dir, level="degraded", source="s2", reason="全失败回落本地", impact="覆盖收窄", resumable=True, step="R1")
            self.assertTrue(state.degraded)
            with self.assertRaises(StateError):
                state.add_degradation(run_dir, level="fatal", source="x", reason="y", impact="z", resumable=False, step="R1")


class TestLedger(unittest.TestCase):
    def test_hash_chain_and_tamper_detection(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            ledger = Ledger(run_dir)
            ledger.append("evidence", {"ev_id": "EV-0001", "tier": "fact", "kind": "literature", "title": "t", "ref": {"doi": "10.x/y"}, "producer_step": "R1"})
            ledger.append("note", {"text": "hello"})
            self.assertTrue(ledger.verify()["ok"])
            # 篡改最后一行 → 链校验必须失败
            path = run_dir / "ledger.jsonl"
            lines = path.read_text(encoding="utf-8").strip().split("\n")
            obj = json.loads(lines[-1])
            obj["text"] = "tampered"
            lines[-1] = canonical_json(obj)
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
            result = Ledger(run_dir).verify()
            self.assertFalse(result["ok"])
            self.assertEqual(result["problems"][0]["kind"], "CHAIN_MISMATCH")

    def test_evidence_enum_validation(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            ledger = Ledger(make_run(Path(t)))
            with self.assertRaises(LedgerError):
                ledger.append("evidence", {"ev_id": "EV-0001", "tier": "factual", "kind": "literature", "ref": {}, "producer_step": "R1"})
            with self.assertRaises(LedgerError):
                ledger.append("evidence", {"ev_id": "EV-0002", "tier": "fact", "kind": "paper", "ref": {}, "producer_step": "R1"})

    def test_conclusion_binding_rules(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            ledger = Ledger(run_dir)
            ledger.append("evidence", {"ev_id": "EV-0001", "tier": "artifact", "kind": "draft", "title": "draft", "ref": {"file": "d.md"}, "producer_step": "R5"})
            with self.assertRaises(LedgerError):
                ledger.append("conclusion", {"cid": "C-001", "text": "x"})  # 未绑定
            ledger.append("conclusion", {"cid": "C-001", "text": "x", "evidence_ids": ["EV-0001"]})  # artifact 绑定
            result = Ledger(run_dir).verify()
            kinds = {p["kind"] for p in result["problems"]}
            self.assertIn("NON_FACT_EVIDENCE", kinds)
            ledger.append("conclusion", {"cid": "C-002", "text": "y", "evidence_ids": ["EV-9999"]})
            kinds = {p["kind"] for p in Ledger(run_dir).verify()["problems"]}
            self.assertIn("MISSING_EVIDENCE", kinds)


class TestReportGate(unittest.TestCase):
    def test_gate_rejects_without_judgment(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            plan(run_dir)
            ledger = Ledger(run_dir)
            ledger.append("evidence", {"ev_id": "EV-0001", "tier": "fact", "kind": "literature", "title": "t", "ref": {"doi": "10.x/y"}, "producer_step": "R1"})
            ledger.append("conclusion", {"cid": "C-001", "text": "x", "evidence_ids": ["EV-0001"]})
            with self.assertRaises(report_mod.ReportGateError) as ctx:
                report_mod.assemble(run_dir)
            self.assertTrue(any("判断批次" in r for r in ctx.exception.reasons))

    def test_gate_rejects_non_fact_binding(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            plan(run_dir)
            ledger = Ledger(run_dir)
            ledger.append("evidence", {"ev_id": "EV-0001", "tier": "artifact", "kind": "draft", "title": "d", "ref": {"file": "d.md"}, "producer_step": "R5"})
            ledger.append("conclusion", {"cid": "C-001", "text": "x", "evidence_ids": ["EV-0001"]})
            ledger.append("judgment", {"judge": "rule:test@v1", "verdict": True, "rationale": "r", "evidence_ids": ["EV-0001"]})
            with self.assertRaises(report_mod.ReportGateError) as ctx:
                report_mod.assemble(run_dir)
            self.assertTrue(any("非 fact 级证据" in r for r in ctx.exception.reasons))

    def test_run_all_emits_report_on_terminal_done(self) -> None:
        """终态 DONE 必须自动出报告（P-03：终态 DONE 且报告就绪）。"""
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            state = plan(run_dir)
            ledger = Ledger(run_dir)
            out = run_all(state, run_dir, ledger)
            self.assertEqual(out["run_status"], "DONE")
            self.assertEqual(out["report"]["status"], "ready")
            self.assertTrue((run_dir / "report.json").exists())
            self.assertTrue((run_dir / "report.md").exists())
            gate = report_mod.read_gate(run_dir)
            self.assertIsNotNone(gate)
            self.assertTrue(gate["passed"])  # type: ignore[index]

            report = json.loads((run_dir / "report.json").read_text(encoding="utf-8"))
            # 契约字段齐备（§8.2）
            for key in ("title", "abstract", "sections", "conclusions"):
                self.assertIn(key, report)
            # 结论 100% 绑定 fact 级证据（§9.5）
            ev_by_id = {r.data["ev_id"]: r.data for r in ledger.evidence()}
            for c in report["conclusions"]:
                self.assertTrue(c["evidence_ids"], f"结论 {c['cid']} 未绑定证据")
                for ev in c["evidence_ids"]:
                    self.assertEqual(ev_by_id[ev].get("tier"), "fact")
            # Markdown 含结论证据角标与降级声明（§8.2）
            md = (run_dir / "report.md").read_text(encoding="utf-8")
            for c in report["conclusions"]:
                for ev in c["evidence_ids"]:
                    self.assertIn(f"[{ev}]", md)
            self.assertIn("降级", md)

    def test_tampered_ledger_invalidates_existing_report(self) -> None:
        """账本被篡改后：拒绝出报告，**并作废磁盘上残留的旧报告**（防"旧产物仍被采信"）。"""
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            state = plan(run_dir)
            ledger = Ledger(run_dir)
            run_all(state, run_dir, ledger)
            self.assertTrue((run_dir / "report.json").exists())

            # 篡改账本正文（不改 chain_hash → 哈希链重算必然不匹配）
            ledger_file = run_dir / "ledger.jsonl"
            ledger_file.write_text(
                ledger_file.read_text(encoding="utf-8").replace("关键要素", "被篡改要素"),
                encoding="utf-8",
            )

            with self.assertRaises(report_mod.ReportGateError):
                report_mod.assemble(run_dir)
            self.assertFalse((run_dir / "report.json").exists(), "残留报告必须被作废")
            self.assertTrue((run_dir / "report.json.invalid").exists(), "作废应可逆（改名隔离，不删数据）")
            gate = report_mod.read_gate(run_dir)
            self.assertFalse(gate["passed"])  # type: ignore[index]
            self.assertTrue(any("CHAIN_MISMATCH" in r for r in gate["reasons"]))  # type: ignore[index]

    def test_gate_pass_writes_gate_record(self) -> None:
        """门禁通过也必须留痕（BFF /report 的 gate 字段有据可依）。"""
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            state = plan(run_dir)
            run_all(state, run_dir, Ledger(run_dir))
            gate = report_mod.read_gate(run_dir)
            self.assertEqual(gate["passed"], True)  # type: ignore[index]
            self.assertEqual(gate["reasons"], [])  # type: ignore[index]


class TestDeterminism(unittest.TestCase):
    def test_two_runs_produce_identical_digest(self) -> None:
        """可复现（§10）：相同输入两次执行，账本摘要必须逐字节一致。

        两个前置条件缺一不可（否则断言不成立）：
        1. 相同 task_id —— `task_id = 目录名` 会进入 state/报告正文，属输入的一部分；
           故两次用**不同物理目录**（dir-one / dir-two，同时证明不依赖路径）。
        2. 相同 `at` 时间戳 —— 账本记录带秒级墙钟时间且**参与哈希链与 ledger_digest**，
           故真实运行中"跨秒"会产生不同摘要。这是**已知边界**（见 README §8工程约定），
           本用例通过显式注入 `at` 来验证「除时间戳外完全确定」这一可承诺的部分。
        """
        tmp = Path(tempfile.mkdtemp())
        try:
            digests = []
            for name in ("dir-one", "dir-two"):
                run_dir = make_run(tmp, name)
                state = plan(run_dir, task_id="run-fixed")
                ledger = Ledger(run_dir)
                with freeze_clock("2026-01-01T00:00:00Z"):
                    run_all(state, run_dir, ledger)
                digests.append(ledger_digest(ledger))
            self.assertEqual(digests[0], digests[1], "相同输入（含时间戳）两次执行的账本摘要必须一致")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_digest_differs_when_wall_clock_crosses_second(self) -> None:
        """已知边界的诚实断言：墙钟时间戳进入哈希链，跨秒执行摘要不同（非缺陷掩盖）。"""
        tmp = Path(tempfile.mkdtemp())
        try:
            digests = []
            # 目录名必须不同，否则第二次会复用已有账本文件，摘要"相同"是假象
            for idx, stamp in enumerate(("2026-01-01T00:00:00Z", "2026-01-01T00:00:05Z")):
                run_dir = make_run(tmp, f"clock-dir-{idx}")
                state = plan(run_dir, task_id="run-fixed")
                ledger = Ledger(run_dir)
                with freeze_clock(stamp):
                    run_all(state, run_dir, ledger)
                digests.append(ledger_digest(ledger))
            self.assertNotEqual(digests[0], digests[1], "时间戳进入哈希链，故摘要随墙钟变化（如实记录该边界）")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_canonical_json_stable(self) -> None:
        self.assertEqual(canonical_json({"b": 1, "a": [2, 1]}), canonical_json({"a": [2, 1], "b": 1}))
        self.assertEqual(sha256_text("中文"), sha256_text("中文"))


class TestPathGuard(unittest.TestCase):
    def test_rejects_traversal_and_relative(self) -> None:
        with self.assertRaises(PathGuardError):
            guard_run_dir("runs/../secrets")
        with self.assertRaises(PathGuardError):
            guard_run_dir("relative/path")
        with self.assertRaises(PathGuardError):
            guard_run_dir("")

    def test_enforces_runs_root_when_configured(self) -> None:
        tmp = Path(tempfile.mkdtemp())
        try:
            root = tmp / "runs"
            inside = root / "run-1"
            outside = tmp / "elsewhere"
            inside.mkdir(parents=True)
            outside.mkdir(parents=True)
            old = os.environ.get("PAPER_AGENT_RUNS_DIR")
            os.environ["PAPER_AGENT_RUNS_DIR"] = str(root)
            try:
                self.assertEqual(guard_run_dir(str(inside)), inside.resolve())
                with self.assertRaises(PathGuardError):
                    guard_run_dir(str(outside))
            finally:
                if old is None:
                    os.environ.pop("PAPER_AGENT_RUNS_DIR", None)
                else:
                    os.environ["PAPER_AGENT_RUNS_DIR"] = old
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class TestCliEndToEnd(unittest.TestCase):
    def test_full_offline_pipeline_via_cli(self) -> None:
        tmp = Path(tempfile.mkdtemp())
        try:
            run_dir = make_run(tmp, "run-cli")
            rc = main(["plan", "--run-dir", str(run_dir), "--args-json", json.dumps({"goal": GOAL, "workflow": "research", "lit_source": "local"})])
            self.assertEqual(rc, 0)
            rc = main(["run_all", "--run-dir", str(run_dir), "--args-json", "{}"])
            self.assertEqual(rc, 0)
            status = RunState.load(run_dir)
            self.assertEqual(status.run_status.value, "DONE")
            rc = main(["verify", "--run-dir", str(run_dir), "--args-json", "{}"])
            self.assertEqual(rc, 0)
            rc = main(["report", "--run-dir", str(run_dir), "--args-json", "{}"])
            self.assertEqual(rc, 0)
            self.assertTrue((run_dir / "report.json").exists())
            self.assertTrue((run_dir / "report.md").exists())
            rc = main(["cite", "--run-dir", str(run_dir), "--args-json", json.dumps({"ev": "EV-0001"})])
            self.assertEqual(rc, 0)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    unittest.main(verbosity=2)
