"""提示注入检测（v2.2）：纯规则、零第三方依赖。

为什么是规则型：文献元数据（title/venue）与研究目标是**不可信外部输入**，
可能夹带针对模型的指令注入（"ignore previous instructions..."）。规则型
检测确定性强（同输入同输出）、可审计（命中留痕）、零依赖，符合内核
"确定性优先"红线；误报只 warning 不阻断（科研目标可能合法包含模式词）。

两层用法：
- scan_text：对任意文本扫描，返回命中清单（pattern_id / 片段 / span）；
- sanitize_records：对文献元数据记录的 title/venue 检测，命中字段替换为
  安全占位，原值截断留痕于 finding（恶意文本全文不入产物）。
"""

from __future__ import annotations

import re
from dataclasses import dataclass

PLACEHOLDER = "[removed:injection]"
_EXCERPT_MAX = 80
_VALUE_MAX = 120


@dataclass(frozen=True)
class Finding:
    pattern_id: str
    match_excerpt: str
    span: tuple[int, int]


# (id, 正则)。大小写不敏感；新增模式直接追加，不改检测逻辑。
PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("inj-ignore-prior", re.compile(
        r"ignore\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|messages?|rules?)",
        re.IGNORECASE)),
    ("inj-disregard-prior", re.compile(
        r"disregard\s+(?:all\s+|any\s+)?(?:of\s+the\s+|the\s+)?(?:previous|prior|above|earlier|instructions?|prompts?|rules?)",
        re.IGNORECASE)),
    ("inj-system-prompt", re.compile(r"system\s*prompt", re.IGNORECASE)),
    ("inj-role-hijack", re.compile(r"you\s+are\s+now", re.IGNORECASE)),
    ("inj-reveal-instructions", re.compile(
        r"(?:reveal|print|show|repeat|output|expose)\s+(?:me\s+)?(?:your\s+)?"
        r"(?:initial\s+|original\s+|hidden\s+|system\s+|full\s+)?(?:instructions?|prompt|system\s*prompt)",
        re.IGNORECASE)),
    ("inj-override-system", re.compile(
        r"override\s+(?:all\s+|the\s+)?(?:previous|prior|system)", re.IGNORECASE)),
    ("inj-cn-ignore-above", re.compile(
        r"忽略(?:并?遗忘)?(?:以上|上述|之前|先前|前面)(?:的)?(?:所有|全部)?(?:指令|设定|内容|要求)")),
    ("inj-cn-disregard", re.compile(
        r"(?:请|请务必|务必)?无视(?:之前|以上|上述|先前|前面)(?:的)?(?:设定|指令|要求|内容)")),
    ("inj-cn-leak-system", re.compile(
        r"(?:打印|泄露|输出|显示|告诉我)(?:一下)?(?:你?的)?(?:系统提示|系统设定|系统指令|初始提示)")),
    ("inj-cn-role-hijack", re.compile(r"你现在(?:是|扮演|改为|变成)")),
    ("inj-dev-mode", re.compile(r"developer\s*mode|开发(?:者|人员)模式", re.IGNORECASE)),
    ("inj-important-execute", re.compile(
        r"重要\s*[:：,，]?\s*请?(?:立即|必须|马上)?执行以下(?:指令|操作|内容)")),
]


def scan_text(text: str) -> list[Finding]:
    """对任意文本做规则扫描：命中清单（含 pattern_id、截断片段、span）。"""
    findings: list[Finding] = []
    if not text:
        return findings
    for pattern_id, regex in PATTERNS:
        for m in regex.finditer(str(text)):
            findings.append(Finding(pattern_id, m.group(0)[:_EXCERPT_MAX], (m.start(), m.end())))
    return findings


def sanitize_records(
    records: list[dict],
    fields: tuple[str, ...] = ("title", "venue"),
) -> tuple[list[dict], list[dict]]:
    """清洗文献元数据记录：命中字段替换为安全占位，原值截断留痕于 finding。

    返回 (clean, findings)。不修改输入记录本体（append-only 语义：
    原始记录由调用方决定是否留痕，这里只产出清洗后的副本）。
    """
    clean: list[dict] = []
    findings: list[dict] = []
    for rec in records:
        if not isinstance(rec, dict):
            clean.append(rec)
            continue
        row = dict(rec)
        for field in fields:
            value = row.get(field)
            if not isinstance(value, str) or not value:
                continue
            for hit in scan_text(value):
                row[field] = PLACEHOLDER
                findings.append({
                    "field": field,
                    "pattern_id": hit.pattern_id,
                    "match_excerpt": hit.match_excerpt,
                    "value_excerpt": value[:_VALUE_MAX],
                })
        clean.append(row)
    return clean, findings
