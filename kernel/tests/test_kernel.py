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

from sciret_kernel import chaos, corpus, online, report as report_mod  # noqa: E402
from sciret_kernel.__main__ import PathGuardError, guard_run_dir, main  # noqa: E402
from sciret_kernel.jsonio import canonical_json, sha256_text  # noqa: E402
from sciret_kernel.ledger import Ledger, LedgerError  # noqa: E402
from sciret_kernel.pipeline import (  # noqa: E402
    CoveragePolicy,
    DEFAULT_COVERAGE,
    execute_step,
    ledger_digest,
    run_all,
)
from sciret_kernel.resilience import (  # noqa: E402
    PermanentError,
    RetryPolicy,
    TransientError,
    classify_http_error,
    map_ordered,
    run_with_retry,
)
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

    def test_crash_leftover_running_step_can_be_taken_over(self) -> None:
        """崩溃遗留的僵死 RUNNING 必须可被接管（否则崩溃后续跑永久卡死）。"""
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            state = plan(run_dir)
            # 模拟：R1 开工后进程被强杀 → 状态停在 RUNNING，结果永远写不出来
            state.start_step(run_dir, "R1")
            self.assertEqual(state.step("R1").status, StepStatus.RUNNING)
            first_attempts = state.step("R1").attempts

            # 重新加载（等价于新进程读盘）与 start_step 均**不应**抛错
            reloaded = RunState.load(run_dir)
            reloaded.start_step(run_dir, "R1")
            self.assertEqual(reloaded.step("R1").status, StepStatus.RUNNING)
            self.assertEqual(reloaded.step("R1").attempts, first_attempts + 1)
            # 接管后可正常收尾
            reloaded.finish_step(run_dir, "R1")
            self.assertEqual(reloaded.step("R1").status, StepStatus.DONE)

    def test_takeover_is_still_blocked_for_truly_running_task(self) -> None:
        """终态不可逆：即使步骤是僵死 RUNNING，终态任务也不允许再开工。"""
        with tempfile.TemporaryDirectory() as t:
            run_dir = make_run(Path(t))
            state = plan(run_dir)
            # 必须让**所有**步骤都进入终态步骤，任务才收敛为终态
            # （research 工作流有 6 步，只做 R1/R2 仍是 RUNNING）
            for sid in [s.id for s in state.steps]:
                state.start_step(run_dir, sid)
                state.finish_step(run_dir, sid)
            self.assertEqual(state.run_status.value, "DONE")

            # 把最后一个步骤伪造成 RUNNING（模拟崩溃遗留态），但**任务本身仍是终态**
            last = state.steps[-1].id
            raw = json.loads((run_dir / "state.json").read_text(encoding="utf-8"))
            for st in raw["steps"]:
                if st["id"] == last:
                    st["status"] = "RUNNING"
            (run_dir / "state.json").write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")

            reloaded = RunState.load(run_dir)
            # 终态优先于"僵死RUNNING"判定 —— 接管只服务于崩溃续跑，不破坏终态不可逆
            with self.assertRaises(StateError):
                reloaded.start_step(run_dir, last)

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


class TestDegradationSemantics(unittest.TestCase):
    """§2.2 三级语义 + 四条可复测验收（§9.4 验收第1–4 条）。

    真实语料快照的 source_status 恒为 ok，故 L1/L2 分支在正常跑批中**不可达**；
    要验证它们只能靠①可配置覆盖策略②chaos 注入开关——这正是 §2.2①⑤ 要求存在的原因。
    """

    def _run_r1(self, tmp: Path, *, lit_source: str = "auto", task_id: str = "run-degrade",
                policy=None, chaos_scope: str | None = None,
                chaos_sources: str | None = None) -> RunState:
        run_dir = make_run(tmp, task_id)
        state = plan(run_dir, lit_source=lit_source, task_id=task_id)
        keys = (chaos.ENV_FLAG, chaos.ENV_SCOPE, chaos.ENV_SOURCES, online.ENV_OFFLINE)
        saved = {k: os.environ.get(k) for k in keys}
        # ⚠️ 必须**强制离线**：本组用例验的是"降级语义"（靠 chaos 注入制造不可用），
        # 不是"联网是否成功"。若让它真联网，结果会随 CI 网络状况飘——测试就不确定了。
        # lit_source 仍是 auto（在线语义），只是抓取会失败并回落既有快照。
        os.environ[online.ENV_OFFLINE] = "1"
        if chaos_scope:
            os.environ[chaos.ENV_FLAG] = "1"
            os.environ[chaos.ENV_SCOPE] = chaos_scope
            os.environ[chaos.ENV_SOURCES] = chaos_sources or ""
        try:
            execute_step(state, run_dir, Ledger(run_dir), "R1", policy)
        finally:
            for k, v in saved.items():
                if v is None:
                    os.environ.pop(k, None)
                else:
                    os.environ[k] = v
        return RunState.load(run_dir)

    def test_L0_all_sources_ok_no_degradation(self) -> None:
        """L0：全源可用 → 无降级记录，degraded=false。"""
        with tempfile.TemporaryDirectory() as t:
            # 用 local：本用例验的是"**源全部可用时**不判降级"，
            # 而 _run_r1 会强制离线开关 → auto 模式下抓取必然失败 → 记L1（回落）。
            # 那是**正确的**产品行为（online 回落确实该留痕），但不是本用例要验的东西。
            state = self._run_r1(Path(t), lit_source="local")
            self.assertFalse(state.degraded)
            self.assertEqual(state.degraded_reasons, [])
            self.assertEqual(state.source_status.get("crossref"), "ok:8")

    def test_L1_partial_source_down_but_coverage_sufficient_not_degraded(self) -> None:
        """L1：个别源不可用但覆盖充足 → 只记 info，**degraded 必须为 false**（P-01 病灶①③）。

        构造：阈值压到1 源 1 命中（覆盖充足），chaos 打掉 crossref（剩 openalex 1 源可用）。
        """
        with tempfile.TemporaryDirectory() as t:
            state = self._run_r1(
                Path(t),
                lit_source="auto",
                task_id="run-l1",
                policy=CoveragePolicy(min_ok_sources=1, min_hits=1),
                chaos_scope="run-l1",
                chaos_sources="crossref",
            )
            self.assertFalse(state.degraded, "覆盖充足时不得置 degraded（P-01 病灶①）")
            levels = [d["level"] for d in state.degraded_reasons]
            self.assertEqual(levels, ["info"], "应恰好记录一条 L1 info")
            self.assertIn("crossref", state.degraded_reasons[0]["source"])
            self.assertEqual(state.degraded_reasons[0]["impact"], "结果未受影响")

    def test_L2_all_sources_down_sets_degraded_with_reason(self) -> None:
        """L2：关键源缺失导致覆盖不足 → degraded=true 且原因可查（§2.2 L2 行）。"""
        with tempfile.TemporaryDirectory() as t:
            state = self._run_r1(
                Path(t),
                lit_source="auto",
                task_id="run-l2",
                policy=DEFAULT_COVERAGE,
                chaos_scope="run-l2",
                chaos_sources="crossref,openalex",
            )
            self.assertTrue(state.degraded, "覆盖不足必须置 degraded")
            l2 = [d for d in state.degraded_reasons if d["level"] == "degraded"]
            self.assertEqual(len(l2), 1)
            self.assertIn("覆盖不足", l2[0]["reason"])
            self.assertTrue(l2[0]["resumable"])
            self.assertTrue(l2[0]["impact"], "必须说明影响")
            # 注入事实必须可审计（能区分"演练注入"与"真实故障"）
            self.assertEqual(state.source_status.get("chaos"), "enabled:1")
            self.assertIn("演练注入", l2[0]["reason"])

    def test_explicit_local_never_degrades(self) -> None:
        """§2.2④ + 验收第 3 条：主动选 local 是预期路径 → 即使全源不可用也不判降级。"""
        with tempfile.TemporaryDirectory() as t:
            state = self._run_r1(
                Path(t),
                # ⚠️ 这个用例**必须**是 local（它验的就是"用户主动选离线"这条语义）。
                # 批量替换 lit_source 时我把它一起改成了 auto，导致它测的是另一件事而失败。
                lit_source="local",
                task_id="run-local",
                policy=CoveragePolicy(min_ok_sources=99, min_hits=999),
                chaos_scope="run-local",
                chaos_sources="crossref,openalex",
            )
            self.assertFalse(state.degraded, "主动离线不得判降级（P-01 病灶④）")
            self.assertEqual([d for d in state.degraded_reasons if d["level"] == "degraded"], [])

    def test_no_chaos_env_means_no_injection(self) -> None:
        """验收第 4 条：正常启动（不带 chaos）→ 不出现任何由故障注入导致的降级。"""
        with tempfile.TemporaryDirectory() as t:
            for k in (chaos.ENV_FLAG, chaos.ENV_SCOPE, chaos.ENV_SOURCES):
                os.environ.pop(k, None)
            state = self._run_r1(Path(t), lit_source="auto", task_id="run-noc", policy=DEFAULT_COVERAGE)
            self.assertFalse(state.degraded)
            self.assertNotIn("chaos", state.source_status)
            for d in state.degraded_reasons:
                self.assertNotIn("演练注入", d["reason"])

    def test_chaos_scope_does_not_leak_to_other_tasks(self) -> None:
        """作用域前缀不匹配 → 不注入（防止给 A 任务演练时污染 B 任务）。"""
        with tempfile.TemporaryDirectory() as t:
            os.environ[chaos.ENV_FLAG] = "1"
            os.environ[chaos.ENV_SCOPE] = "run-other"
            os.environ[chaos.ENV_SOURCES] = "crossref,openalex"
            try:
                state = self._run_r1(Path(t), lit_source="auto", task_id="run-mine", policy=DEFAULT_COVERAGE)
                self.assertFalse(state.degraded, "作用域不匹配时不得注入")
                self.assertNotIn("chaos", state.source_status)
            finally:
                for k in (chaos.ENV_FLAG, chaos.ENV_SCOPE, chaos.ENV_SOURCES):
                    os.environ.pop(k, None)

    def test_chaos_flag_illegal_value_fails_closed(self) -> None:
        """开关值不可识别 → **报错**而非静默当作关闭（避免演练者得到假阴性结论）。"""
        with tempfile.TemporaryDirectory() as t:
            os.environ[chaos.ENV_FLAG] = "true"  # 只接受 '1'
            os.environ[chaos.ENV_SCOPE] = "run-bad"
            os.environ[chaos.ENV_SOURCES] = "crossref"
            try:
                with self.assertRaises(chaos.ChaosConfigError):
                    self._run_r1(Path(t), lit_source="auto", task_id="run-bad", policy=DEFAULT_COVERAGE)
            finally:
                for k in (chaos.ENV_FLAG, chaos.ENV_SCOPE, chaos.ENV_SOURCES):
                    os.environ.pop(k, None)

    def test_chaos_enabled_without_scope_fails_closed(self) -> None:
        """开了 flag 但没给作用域 → 报错，防注入泄漏到全机所有任务。"""
        with tempfile.TemporaryDirectory() as t:
            os.environ[chaos.ENV_FLAG] = "1"
            os.environ.pop(chaos.ENV_SCOPE, None)
            try:
                with self.assertRaises(chaos.ChaosConfigError):
                    self._run_r1(Path(t), lit_source="auto", task_id="run-noscope", policy=DEFAULT_COVERAGE)
            finally:
                os.environ.pop(chaos.ENV_FLAG, None)

    def test_chaos_enabled_without_sources_fails_closed(self) -> None:
        """开了 flag 但没指定目标源 → 报错。

        不设默认源是刻意的：'单源不可用'（L1）与'全部源不可用'（L2）是两种不同演练，
        默认值会把演练悄悄变成另一种故障，得出错误结论。
        """
        with tempfile.TemporaryDirectory() as t:
            os.environ[chaos.ENV_FLAG] = "1"
            os.environ[chaos.ENV_SCOPE] = "run-nosrc"
            os.environ.pop(chaos.ENV_SOURCES, None)
            try:
                with self.assertRaises(chaos.ChaosConfigError):
                    self._run_r1(Path(t), lit_source="auto", task_id="run-nosrc", policy=DEFAULT_COVERAGE)
            finally:
                os.environ.pop(chaos.ENV_FLAG, None)
                os.environ.pop(chaos.ENV_SCOPE, None)

    def test_chaos_single_source_down_keeps_coverage(self) -> None:
        """单源注入 + 默认阈值(2 源) → 覆盖不足 → L2（证明阈值判定真实生效）。"""
        with tempfile.TemporaryDirectory() as t:
            state = self._run_r1(
                Path(t),
                lit_source="auto",
                task_id="run-single",
                policy=DEFAULT_COVERAGE,
                chaos_scope="run-single",
                chaos_sources="crossref",
            )
            self.assertTrue(state.degraded, "只剩 1 个成功源（阈值 2）→ 应判L2")

    def test_coverage_policy_is_configurable(self) -> None:
        """§2.2① 覆盖策略可配置：同一份语料，阈值不同 → 判定不同。"""
        loose = CoveragePolicy(min_ok_sources=1, min_hits=1)
        self.assertTrue(loose.satisfied_by(ok_sources=1, hits=1))
        self.assertFalse(DEFAULT_COVERAGE.satisfied_by(ok_sources=1, hits=1))
        self.assertTrue(DEFAULT_COVERAGE.satisfied_by(ok_sources=2, hits=4))
        #阈值非法必须报错（不静默取默认）
        with self.assertRaises(ValueError):
            CoveragePolicy(min_ok_sources=-1)
        with self.assertRaises(ValueError):
            CoveragePolicy(retrieval_limit=0)


class TestOnlineRetrieval(unittest.TestCase):
    """在线检索（`lit_source` = arxiv/auto）：真联网 + 失败回落 + 绝不伪造。

    背景：此前 `arxiv`/`auto` 在 BFF 层被声明可用，但内核**根本没联网**——
    `fetch_corpus.py` 存在却无任何代码调用，`arxiv` 与 `auto` 都落到本地快照选优。
    这是典型的"契约声明了能力、后端没实现"，演示时会被识破。
    """

    def test_snapshot_name_is_stable_for_same_goal(self) -> None:
        """快照名必须由目标**稳定派生**（不能含时间戳）。

        否则同一目标两次运行产生不同文件名 → `corpus_snapshot` 字段抖动
        → 摘要不可复现，直接违反项目"可复现"红线。
        """
        a = online.snapshot_name_for("solid-state electrolyte")
        b = online.snapshot_name_for("solid-state electrolyte")
        c = online.snapshot_name_for("solid-state electrolyte ")
        self.assertEqual(a, b)
        self.assertEqual(a, c, "首尾空白不应改变快照名")
        self.assertNotEqual(a, online.snapshot_name_for("lithium dendrite"))

    def test_local_never_touches_network(self) -> None:
        """local 必须**绝不联网**（用户显式选的离线路径 + 可复现要求）。"""
        saved = os.environ.pop(online.ENV_OFFLINE, None)
        try:
            with mock.patch.object(online, "refresh_snapshot", side_effect=AssertionError("local 不应联网")) as m:
                name, snap, note = online.resolve_online("goal", "local", ["crossref"])
            m.assert_not_called()
            self.assertFalse(note["online_attempted"])
            self.assertIsInstance(snap, dict)
        finally:
            if saved is not None:
                os.environ[online.ENV_OFFLINE] = saved

    def test_online_fallback_when_offline_and_records_reason(self) -> None:
        """离线开关下：抓取不发生，但**回落原因必须留痕**。

        留痕是关键：原因若被快照里的 `ok:N` 覆盖，降级语义会误判为 L0，
        "这次其实没联网"这件事就从审计里消失了（§2.2 的前提是状态如实可见）。
        """
        saved = os.environ.get(online.ENV_OFFLINE)
        os.environ[online.ENV_OFFLINE] = "1"
        try:
            name, snap, note = online.resolve_online("solid-state electrolyte", "auto", ["crossref"])
        finally:
            if saved is None:
                os.environ.pop(online.ENV_OFFLINE, None)
            else:
                os.environ[online.ENV_OFFLINE] = saved
        self.assertTrue(note["online_attempted"])
        self.assertFalse(note["online_refresh"])
        self.assertIn("online_fallback_reason", note)
        self.assertIn("PAPER_AGENT_OFFLINE", note["online_fallback_reason"])
        # 回落到既有快照，而不是报错或返回空
        self.assertTrue(snap.get("records"), "回落时必须拿到已有快照记录")

    def test_offline_flag_makes_refresh_fail_fast(self) -> None:
        """离线开关必须让 refresh_snapshot 立刻失败，而不是真去联网试。"""
        saved = os.environ.get(online.ENV_OFFLINE)
        os.environ[online.ENV_OFFLINE] = "1"
        try:
            with mock.patch.object(online.subprocess, "run") as run:
                r = online.refresh_snapshot("goal", ["crossref"])
            run.assert_not_called()  # 关键：根本没起子进程
            self.assertFalse(r["ok"])
        finally:
            if saved is None:
                os.environ.pop(online.ENV_OFFLINE, None)
            else:
                os.environ[online.ENV_OFFLINE] = saved

    def test_local_ignores_live_snapshots(self) -> None:
        """local 必须排除 `live-*`（在线运行时产物），否则 local 不再可复现。

        回归来源：实现在线检索后，目录里多了 `live-*` 快照，而 `available_snapshots()`
        按字典序返回 → `names[0]` 变成 live-* → `local` 选中了在线产物。
        后果是用户明明选了离线，却吃到了"取决于抓取时刻"的结果，违反可复现红线。
        这个 bug 是靠 L0 降级用例意外挂掉才发现的（`'ok:8' != 'ok:4'`），
        故固化成显式用例，不等它再自然暴露一次。
        """
        import tempfile as _tf

        with _tf.TemporaryDirectory() as t:
            fake = Path(t)
            (fake / "sse-interface.json").write_text(
                json.dumps({"records": [{"title": "frozen", "doi": "10.1/frozen"}], "source_status": {"crossref": "ok:8"}}),
                encoding="utf-8",
            )
            (fake / "live-goal-abcdef123456.json").write_text(
                json.dumps({"records": [{"title": "live", "doi": "10.1/live"}], "source_status": {"crossref": "ok:4"}}),
                encoding="utf-8",
            )
            with mock.patch.object(corpus, "CORPUS_DIR", fake):
                names = corpus.available_snapshots()
                # 前提：字典序确实把 live-* 排在前面（否则这个用例测不到东西）
                self.assertTrue(names[0].startswith("live-"), f"前提失效：{names}")
                name, snap = corpus.select_snapshot("goal", "local")
                self.assertFalse(name.startswith("live-"), f"local 选中了在线快照：{name}")
                self.assertEqual(snap["records"][0]["doi"], "10.1/frozen")

    def test_no_snapshot_and_no_network_fails_closed(self) -> None:
        """既抓不到、也无快照可回落 → **报错**，绝不返回空（会产出"检索到 0 篇"的假成功）。"""
        with mock.patch.object(online, "refresh_snapshot", return_value={"ok": False, "reason": "模拟断网"}), \
             mock.patch.object(online.corpus, "available_snapshots", return_value=[]):
            with self.assertRaises(FileNotFoundError):
                online.resolve_online("goal", "auto", ["crossref"])


class TestResiliencePolicy(unittest.TestCase):
    """§6 容错与降级策略表：重试分类 / 指数退避+抖动 / 受控并发保序。"""

    def test_http_error_classification(self) -> None:
        for status in (429, 500, 502, 503, 504):
            self.assertIs(classify_http_error(status), TransientError, f"HTTP {status} 应为瞬时")
        for status in (400, 401, 403, 404, 422):
            self.assertIs(classify_http_error(status), PermanentError, f"HTTP {status} 应为永久")

    def test_retry_backoff_is_exponential_with_cap_and_jitter(self) -> None:
        p = RetryPolicy(max_attempts=5, base_delay_s=1.0, cap_delay_s=4.0, factor=2.0, jitter_ratio=0.0)
        class ZeroRng:
            def random(self) -> float:
                return 0.0

        self.assertEqual(p.delay_for(1, ZeroRng()), 1.0)
        self.assertEqual(p.delay_for(2, ZeroRng()), 2.0)
        self.assertEqual(p.delay_for(3, ZeroRng()), 4.0)
        self.assertEqual(p.delay_for(4, ZeroRng()), 4.0, "必须被cap 截断")
        # 抖动上界：u→1 时不超过 base*(1+jitter)
        class OneRng:
            def random(self) -> float:
                return 1.0

        self.assertAlmostEqual(RetryPolicy(base_delay_s=1.0, jitter_ratio=0.25).delay_for(1, OneRng()), 1.25)

    def test_retry_policy_validates_bounds(self) -> None:
        for kwargs in (
            {"max_attempts": 0},
            {"base_delay_s": 0},
            {"cap_delay_s": 0.5, "base_delay_s": 1.0},
            {"factor": 0.5},
            {"jitter_ratio": 1.0},
        ):
            with self.assertRaises(ValueError, msg=str(kwargs)):
                RetryPolicy(**kwargs)

    def test_transient_error_is_retried_up_to_limit(self) -> None:
        calls = {"n": 0}
        slept: list[float] = []

        def flaky() -> str:
            calls["n"] += 1
            if calls["n"] < 3:
                raise TransientError("boom")
            return "ok"

        out = run_with_retry(flaky, policy=RetryPolicy(max_attempts=3), sleep=slept.append)
        self.assertEqual(out, "ok")
        self.assertEqual(calls["n"], 3)
        self.assertEqual(len(slept), 2, "第3 次成功前应sleep 两次")

    def test_transient_error_exhausted_reraises_last(self) -> None:
        def always() -> None:
            raise TransientError("still down")

        with self.assertRaises(TransientError):
            run_with_retry(always, policy=RetryPolicy(max_attempts=2), sleep=lambda _s: None)

    def test_permanent_error_not_retried(self) -> None:
        """4xx 不重试：重试只浪费配额并可能招致更严限流（§6「永久错误不重试」）。"""
        calls = {"n": 0}

        def denied() -> None:
            calls["n"] += 1
            raise PermanentError("403")

        with self.assertRaises(PermanentError):
            run_with_retry(denied, policy=RetryPolicy(max_attempts=5), sleep=lambda _s: None)
        self.assertEqual(calls["n"], 1, "永久错误必须只尝试一次")

    def test_map_ordered_preserves_input_order(self) -> None:
        """受控并发但**结果按输入顺序返回**——这是保确定性的关键（§6并发行）。"""
        import time as _t

        def slow_first(x: int) -> int:
            _t.sleep(0.03 if x == 0 else 0.0)
            return x * 10

        self.assertEqual(map_ordered(slow_first, [0, 1, 2, 3], workers=4), [0, 10, 20, 30])
        self.assertEqual(map_ordered(slow_first, [], workers=4), [])

    def test_map_ordered_single_worker_is_sequential(self) -> None:
        out = map_ordered(lambda x: x + 1, [1, 2, 3], workers=1)
        self.assertEqual(out, [2, 3, 4])


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
