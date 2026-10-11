"""Source SPI（需求 §14）：数据源接口 —— `build_url` / `parse` / `transport` / 降级。

**为什么要有它**：此前 `fetch_corpus.py` 里是两个并列函数 + 一处 `if/elif` 分派
（`fetch_crossref` / `fetch_openalex`，在 `fetch_one` 里判断）。新增一个源要改
**引擎内部**，而不是"实现一个 Source"—— 这与 §14 写的扩展形态不符，也让
"每个源的差异"和"抓取流程"两件事缠在一起。

拆成四段之后，源之间**只差数据**，其余（超时/重试/并发/降级记录/去重/排序）全部复用：

| 段 | 职责 | 谁来实现 |
|---|---|---|
| `build_url` | 由 query/rows 拼请求 URL | 源自己（唯一的"接口差异"） |
| `parse` | 响应 JSON → 归一化文献记录 | 源自己（唯一的"格式差异"） |
| `transport` | 实际发起 HTTP + 错误分类 | 默认实现（标准库 urllib，零依赖） |
| 降级/超时/重试 | 独立超时、瞬时重试、永久不重试、失败如实记录 | 引擎（统一策略） |

新增一个源 = 在本文件加一个 `XxxSource()` 构造 + 追加到 `REGISTRY`，
**不改引擎任何一行**（唯一动点是注册表本身，这正是注册表该有的作用）。

设计约束（都是踩过或想到的）：
- **零第三方依赖**：内核只用标准库（§1 红线）。故协议用 `typing.Protocol` 而非 ABC。
- **归一化记录形状固定**：`doi/title/authors/year/venue/type/license/source`。
  缺字段留空字符串或 None，**不要**编造。
- **parse 必须对畸形数据免疫**：真实 API 会返回缺字段/类型不符的项
  （`title` 是空列表、作者是 null）。parse 里跳过无标题的项并计数，不抛异常——
  一个坏条目不该让整个源失败。
"""

from __future__ import annotations

import urllib.error
import urllib.parse
import urllib.request
from typing import Callable, Protocol, runtime_checkable

from .resilience import TransientError, classify_http_error

# 统一的 User-Agent：公共元数据 API 要求可识别的调用方（§11 合规：仅元数据，不取全文）
UA = "paper-agent/2.0 (hackathon research assistant; contact: team-u046)"

#: 归一化文献记录的字段（parse 的输出契约）
#: `source` 由parse 自己填（便于追溯证据来自哪个源——审计要求）。
Record = dict[str, object]


@runtime_checkable
class Source(Protocol):
    """数据源 SPI（§14）。四段式：标识 / 建URL / 解析 / 超时。"""

    #: 源标识（写入记录、用于 source_status 的键）
    name: str

    #: 独立超时（秒）—— §6「单源/单步独立超时」
    timeout_s: float

    def build_url(self, query: str, rows: int) -> str:
        """由查询与条数拼出请求 URL。**不允许**发请求（便于纯离线测试）。"""
        ...

    def parse(self, payload: object) -> list[Record]:
        """响应 JSON → 归一化记录列表。

        必须对畸形条目免疫（跳过并丢弃，而不是抛异常）——
        真实 API 偶尔返回缺字段的项，让它拖垮整个源是得不偿失。
        """
        ...


# ── transport：默认 HTTP 实现（可替换，便于注入假 transport 做离线测试）────────

def http_get_json(url: str, timeout: float) -> object:
    """单次 GET 并解析 JSON；错误按 §6 分类为瞬时/永久。

    错误分类的**理由**（不是随手写的）：
    - HTTPError → 交给 `classify_http_error`（429/5xx 瞬时；其余 4xx 永久）；
    - URLError（连接被拒/DNS）→ 瞬时，退避后重试有意义；
    - TimeoutError → 瞬时；
    - JSONDecodeError → 瞬时（通常是网关返回 HTML 错误页，重试可能拿到真 JSON）。
    """
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - 固定官方元数据 API
            import json

            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise classify_http_error(e.code)(f"HTTP {e.code} {url}") from e
    except urllib.error.URLError as e:
        raise TransientError(f"{type(e.reason).__name__}: {e.reason}") from e
    except TimeoutError as e:
        raise TransientError(f"TimeoutError: {e}") from e
    except ValueError as e:  # json.JSONDecodeError 是ValueError 子类
        raise TransientError(f"JSONDecodeError: {e}") from e


#: transport 的签名：URL → JSON。抽成变量是为了**可注入**（测试时换假 transport 不联网）。
Transport = Callable[[str, float], object]


# ── 归一化辅助（供各源的 parse 复用，避免每个源各写一遍空值处理）────────

def _first(value: object, default: str = "") -> str:
    """取"字符串或字符串数组的第一个"（Crossref 大量用数组字段）。"""
    if isinstance(value, str):
        return value
    if isinstance(value, (list, tuple)):
        for x in value:
            if isinstance(x, str) and x.strip():
                return x
    return default


def _year_from_date_parts(value: object) -> int | None:
    """Crossref 的 `issued.date-parts` 是嵌套数组：`[[2023, 5, 17]]`。"""
    if not isinstance(value, (list, tuple)) or not value:
        return None
    first = value[0]
    if not isinstance(first, (list, tuple)) or not first:
        return None
    y = first[0]
    return y if isinstance(y, int) else None


# ── 源实现 ──────────────────────────────────────────────────────────────

class CrossrefSource:
    """Crossref REST API（https://api.crossref.org/works）。

    字段说明见 `select=` 参数：只取需要的，减少载荷。
    """

    name = "crossref"
    timeout_s = 20.0

    def build_url(self, query: str, rows: int) -> str:
        params = urllib.parse.urlencode(
            {
                "query.bibliographic": query,
                "rows": rows,
                "select": "DOI,title,author,issued,container-title,license,type",
            }
        )
        return f"https://api.crossref.org/works?{params}"

    def parse(self, payload: object) -> list[Record]:
        items = _dig(payload, "message", "items")
        out: list[Record] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            title = _first(item.get("title")).strip()
            if not title:
                # 无标题的条目无法作为证据，跳过（而不是产出空标题记录污染下游）
                continue
            out.append(
                {
                    "doi": _first(item.get("DOI")),
                    "title": title,
                    "authors": _crossref_authors(item.get("author")),
                    "year": _year_from_date_parts(_dig(item, "issued", "date-parts")),
                    "venue": _first(item.get("container-title")),
                    "type": _first(item.get("type")),
                    "license": _crossref_licenses(item.get("license")),
                    "source": self.name,
                }
            )
        return out


class OpenAlexSource:
    """OpenAlex REST API（https://api.openalex.org/works）。

    ⚠️ `select` 只接受合法字段名，含未知字段会**返回 400** —— 加字段前先查其文档。
    """

    name = "openalex"
    timeout_s = 20.0

    def build_url(self, query: str, rows: int) -> str:
        params = urllib.parse.urlencode(
            {
                "search": query,
                "per-page": rows,
                "select": "doi,title,publication_year,authorships,primary_location,type",
            }
        )
        return f"https://api.openalex.org/works?{params}"

    def parse(self, payload: object) -> list[Record]:
        items = _dig(payload, "results")
        out: list[Record] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            title = _first(item.get("title")).strip()
            if not title:
                continue
            out.append(
                {
                    # OpenAlex 的 DOI 是完整 URL，需剥前缀才是裸 DOI（与 Crossref 对齐）
                    "doi": _first(item.get("doi")).replace("https://doi.org/", ""),
                    "title": title,
                    "authors": _openalex_authors(item.get("authorships")),
                    "year": _as_int_or_none(item.get("publication_year")),
                    # ⚠️ 注意这里不能用 `_dig(..., key=...)`：它取的是 dict 的值，
                    #    而 primary_location.source 本身可能就是 dict，要再取一层 display_name。
                    "venue": _first(
                        _dig(_dig(item, "primary_location"), "source", key="display_name")
                    ),
                    "type": _first(item.get("type")),
                    # OpenAlex 不返回许可链接；留空而不是编造（§11 严禁伪造）
                    "license": "",
                    "source": self.name,
                }
            )
        return out


# ── 解析辅助 ─────────────────────────────────────────────────────────────

def _dig(obj: object, *path: str, key: str | None = None) -> object:
    """安全取值：`obj.a.b`，任一层缺失或类型不符都返回 default（不抛）。

    比 `obj.get("a",{}).get("b")` 更短，且不会在中间层是 list/None 时炸掉。
    `key` 用于取 dict 里的某个键（配合 default 取值）。
    """
    cur = obj
    for p in path:
        if not isinstance(cur, dict):
            return {} if key else []
        cur = cur.get(p)
    if cur is None:
        return {} if key else []
    return cur.get(key, "") if key else cur


def _as_int_or_none(value: object) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def _crossref_authors(value: object) -> list[str]:
    """Crossref 作者是 `{given, family}` 或 `{name}`（机构作者）。"""
    out: list[str] = []
    for a in value if isinstance(value, list) else []:
        if not isinstance(a, dict):
            continue
        given, family = a.get("given"), a.get("family")
        if isinstance(given, str) or isinstance(family, str):
            name = " ".join(x for x in [given, family] if isinstance(x, str) and x)
        else:
            name = a.get("name") if isinstance(a.get("name"), str) else ""
        if name.strip():
            out.append(name.strip())
    return out


def _crossref_licenses(value: object) -> list[str]:
    """Crossref 许可：`[{URL: ...}, ...]`。取不到就留空列表（不编造）。"""
    out: list[str] = []
    for lic in value if isinstance(value, list) else []:
        if isinstance(lic, dict):
            url = lic.get("URL")
            if isinstance(url, str) and url:
                out.append(url)
    return out


def _openalex_authors(value: object) -> list[str]:
    """OpenAlex 作者：`[{author: {display_name}}]`。"""
    out: list[str] = []
    for a in value if isinstance(value, list) else []:
        if isinstance(a, dict):
            name = _dig(a, "author", key="display_name")
            if isinstance(name, str) and name.strip():
                out.append(name.strip())
    return out


# ── 注册表（新增源唯一需要动的地方）──────────────────────────────────────

#: 源名 → 实例。**有序**：去重时按声明顺序归并，保证确定性（§可复现）。
REGISTRY: dict[str, Source] = {
    CrossrefSource.name: CrossrefSource(),
    OpenAlexSource.name: OpenAlexSource(),
}


def register(source: Source, *, replace: bool = False) -> None:
    """注册一个源。新增检索源 = 实现 Source 的四个成员 + 调用本函数。

    `replace=False` 时同名注册会报错而不是静默覆盖——覆盖会让"到底在用哪个实现"
    变成只有运行期才知道的事（而新实现可能没测过）。
    """
    name = getattr(source, "name", "")
    if not isinstance(name, str) or not name:
        raise ValueError("Source 必须有非空 name")
    if not isinstance(source.timeout_s, (int, float)) or source.timeout_s <= 0:
        raise ValueError(f"源 {name} 的 timeout_s 必须是正数")
    for member in ("build_url", "parse"):
        if not callable(getattr(source, member, None)):
            raise ValueError(f"源 {name} 缺少可调用成员 {member}")
    if not replace and name in REGISTRY:
        raise ValueError(f"源 {name} 已注册（如需覆盖请显式 replace=True）")
    REGISTRY[name] = source


def get(name: str) -> Source:
    """按名取源；不存在时抛永久错误（**不**静默跳过——那会让"配了源却没抓"不可见）。"""
    src = REGISTRY.get(name)
    if src is None:
        raise KeyError(name)
    return src


def known_sources() -> list[str]:
    return list(REGISTRY)


def default_transport() -> Transport:
    return http_get_json