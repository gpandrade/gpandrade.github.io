#!/usr/bin/env python3
"""Weekly papers refresh. Spec: docs/brief.md section 10.

Asks OpenAlex for the works on each author profile in src/data/sources.yaml, matches
them to src/data/papers.yaml (arXiv id, then DOI, then normalised title), appends
anything unmatched as a draft with `summary: TODO`, and writes a Markdown report with
DOI and journal_ref hints for the pull request body. One batched arXiv query supplies
verbatim titles and authors for drafts that have an arXiv id and fills empty author
lists on existing entries.

It never edits a field a human wrote (year, venue, summary, links, selected, media).
The only in-place change to an existing entry is filling an empty `authors` list;
everything else is appended at the end of the file or reported. Before writing, the
script re-parses the result and refuses to write if any other field moved.

Usage:
  python scripts/refresh.py --dry-run             print the diff and the report, write nothing
  python scripts/refresh.py --report report.md    write papers.yaml (if changed) and the report

An unreachable API is skipped and listed in the report; it is never a failure.
Python 3.11+, requests, pyyaml.
"""
from __future__ import annotations

import argparse
import datetime as dt
import difflib
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path

import requests
import yaml

ROOT = Path(__file__).resolve().parent.parent
PAPERS = ROOT / "src" / "data" / "papers.yaml"
SOURCES = ROOT / "src" / "data" / "sources.yaml"
OPENALEX_API = "https://api.openalex.org"
ARXIV_API = "https://export.arxiv.org/api/query"
S2_API = "https://api.semanticscholar.org/graph/v1"
USER_AGENT = "gpandrade.github.io refresh (https://github.com/gpandrade/gpandrade.github.io)"
PER_PAGE = 50
MAX_PAGES = 10

# Fields a human writes. Never changed on an existing entry; the verify step enforces it.
HUMAN_FIELDS = ("year", "venue", "summary", "links", "selected", "media")

# Mirrors src/content.config.ts, so a draft never fails the build.
RE_ID = re.compile(r"^[a-z0-9][a-z0-9-]*$")
RE_ARXIV = re.compile(r"^\d{4}\.\d{4,5}$")
RE_DOI = re.compile(r"^10\.\d{4,9}/\S+$")
RE_DATE = re.compile(r"^\d{4}-\d{2}(-\d{2})?$")
RE_URL = re.compile(r"^https?://\S+$")


class Skip(Exception):
    """A source could not be read. Recorded in the report, never fatal."""


# --- normalisation -----------------------------------------------------------------

def norm_doi(s: str | None) -> str | None:
    """Bare, lowercase DOI (DOIs are case-insensitive). None when empty."""
    if not s:
        return None
    s = re.sub(r"^(https?://(dx\.)?doi\.org/|doi:)\s*", "", str(s).strip(), flags=re.I)
    return s.lower() or None


def norm_arxiv(s: str | None) -> str | None:
    """A new-style arXiv id without its version, or None."""
    if not s:
        return None
    m = re.search(r"(\d{4}\.\d{4,5})(v\d+)?$", str(s).strip())
    return m.group(1) if m else None


def arxiv_from_doi(doi: str | None) -> str | None:
    m = re.match(r"10\.48550/arxiv\.(\d{4}\.\d{4,5})", doi or "", re.I)
    return m.group(1) if m else None


def norm_title(s: str | None) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", s.lower()).split())


def person(name: str | None) -> str:
    """OpenAlex sometimes gives 'Last, First'; flip it. arXiv names are used as given."""
    name = " ".join((name or "").split())
    if name.count(",") == 1:
        last, first = (p.strip() for p in name.split(","))
        if last and first:
            return f"{first} {last}"
    return name


def norm_ignore(s) -> str:
    """An ignore-list item: an OpenAlex work id, an arXiv id, or a DOI, in any common spelling."""
    s = re.sub(r"^https?://openalex\.org/", "", str(s).strip(), flags=re.I)
    if re.fullmatch(r"[wW]\d+", s):
        return s.upper()
    if "/" not in s and (a := norm_arxiv(re.sub(r"^arxiv:", "", s, flags=re.I))):
        return a
    return norm_doi(s) or s


# --- data --------------------------------------------------------------------------

@dataclass
class Work:
    """One OpenAlex (or Semantic Scholar) work, reduced to what the matcher needs."""
    id: str
    profile: str
    title: str
    year: int | None
    date: str | None
    authors: list[str]
    venue: str
    arxiv: str | None
    doi: str | None
    published: bool  # a non-preprint source, which wins over a preprint when two works merge

    @property
    def label(self) -> str:
        return f"{self.id} on {self.profile}"


@dataclass
class Proposal:
    title: str
    authors: list[str]
    year: int | None
    date: str | None
    venue: str
    arxiv: str | None
    doi: str | None
    works: list[Work] = field(default_factory=list)
    id: str = ""

    def entry(self) -> dict:
        e: dict = {"id": self.id, "title": self.title, "authors": self.authors, "year": self.year}
        if self.date:
            e["date"] = self.date
        e["venue"] = self.venue
        if self.arxiv:
            e["arxiv"] = self.arxiv
        if self.doi:
            e["doi"] = self.doi
        if not self.arxiv and not self.doi:
            e["links"] = [{"label": "OpenAlex", "url": f"https://openalex.org/{self.works[0].id}"}]
        e["summary"] = "TODO"
        e["draft"] = True
        return e


class Index:
    """Match by arXiv id, then DOI, then normalised title."""

    def __init__(self) -> None:
        self.by_arxiv: dict[str, object] = {}
        self.by_doi: dict[str, object] = {}
        self.by_title: dict[str, object] = {}

    def add(self, obj, arxiv: str | None, doi: str | None, title: str | None) -> None:
        if arxiv:
            self.by_arxiv.setdefault(arxiv, obj)
        if doi:
            self.by_doi.setdefault(doi, obj)
        if t := norm_title(title):
            self.by_title.setdefault(t, obj)

    def find(self, arxiv: str | None, doi: str | None, title: str | None):
        if arxiv and arxiv in self.by_arxiv:
            return self.by_arxiv[arxiv], "arXiv id"
        if doi and doi in self.by_doi:
            return self.by_doi[doi], "DOI"
        t = norm_title(title)
        if t and t in self.by_title:
            return self.by_title[t], "title"
        return None, None


# --- sources -----------------------------------------------------------------------

def http_get(session: requests.Session, url: str, params: dict, timeout: float) -> requests.Response:
    try:
        r = session.get(url, params=params, timeout=timeout)
        r.raise_for_status()
        return r
    except requests.HTTPError as e:
        raise Skip(f"HTTP {e.response.status_code} from {url}") from e
    except requests.Timeout as e:
        raise Skip(f"no answer from {url} within {timeout:g} s") from e
    except requests.RequestException as e:
        raise Skip(f"could not connect to {url} ({type(e).__name__})") from e


def openalex_works(session, author_id: str, mailto: str, api: str, timeout: float) -> list[Work]:
    raw: list[dict] = []
    for page in range(1, MAX_PAGES + 1):
        params = {
            "filter": f"authorships.author.id:{author_id}",
            "per-page": PER_PAGE,
            "page": page,
            "sort": "publication_year:desc",
            "mailto": mailto,
        }
        try:
            results = http_get(session, f"{api}/works", params, timeout).json()["results"]
        except (ValueError, KeyError, TypeError) as e:
            raise Skip(f"unexpected response shape ({e})") from e
        raw.extend(results)
        if len(results) < PER_PAGE:
            break
    return [parse_openalex_work(w, f"OpenAlex {author_id}") for w in raw]


def parse_openalex_work(w: dict, profile: str) -> Work:
    doi = norm_doi(w.get("doi"))
    arxiv = arxiv_from_doi(doi)
    for loc in w.get("locations") or []:
        for u in (loc.get("landing_page_url"), loc.get("pdf_url")):
            m = re.search(r"arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5})", u or "")
            if m and not arxiv:
                arxiv = m.group(1)
    if arxiv_from_doi(doi):
        doi = None  # an arXiv DOI adds nothing over the id
    source = (((w.get("primary_location") or {}).get("source") or {}).get("display_name")) or ""
    is_arxiv_source = bool(re.search(r"arxiv", source, re.I))
    if is_arxiv_source:
        venue = "arXiv preprint"
    elif source:
        venue = source
    else:
        venue = (w.get("type") or "TODO").replace("-", " ").capitalize()
    date = (w.get("publication_date") or "")[:7] or None
    return Work(
        id=(w.get("id") or "").rsplit("/", 1)[-1],
        profile=profile,
        title=" ".join((w.get("title") or w.get("display_name") or "").split()),
        year=w.get("publication_year"),
        date=date if date and RE_DATE.match(date) else None,
        authors=[person((a.get("author") or {}).get("display_name")) for a in w.get("authorships") or []],
        venue=venue,
        arxiv=arxiv,
        doi=doi,
        published=bool(source) and not is_arxiv_source and (w.get("type") != "preprint"),
    )


def semantic_scholar_works(session, author_id: str, api: str, timeout: float) -> list[Work]:
    params = {"fields": "title,year,venue,externalIds,authors,publicationDate", "limit": 100}
    try:
        data = http_get(session, f"{api}/author/{author_id}/papers", params, timeout).json()["data"]
    except (ValueError, KeyError, TypeError) as e:
        raise Skip(f"unexpected response shape ({e})") from e
    out = []
    for p in data:
        ext = p.get("externalIds") or {}
        arxiv = norm_arxiv(ext.get("ArXiv"))
        doi = norm_doi(ext.get("DOI"))
        if arxiv_from_doi(doi):
            doi = None
        venue = " ".join((p.get("venue") or "").split())
        date = (p.get("publicationDate") or "")[:7] or None
        out.append(Work(
            id=p.get("paperId") or "",
            profile=f"Semantic Scholar {author_id}",
            title=" ".join((p.get("title") or "").split()),
            year=p.get("year"),
            date=date if date and RE_DATE.match(date) else None,
            authors=[person(a.get("name")) for a in p.get("authors") or []],
            venue="arXiv preprint" if re.search(r"arxiv", venue, re.I) else (venue or "TODO"),
            arxiv=arxiv,
            doi=doi,
            published=bool(venue) and not re.search(r"arxiv", venue, re.I),
        ))
    return out


def arxiv_entries(session, ids: list[str], api: str, timeout: float) -> dict[str, dict]:
    """One batched query. Returns {id: {title, authors, doi, journal_ref, published}}."""
    if not ids:
        return {}
    r = http_get(session, api, {"id_list": ",".join(ids), "max_results": len(ids)}, timeout)
    try:
        root = ET.fromstring(r.content)
    except ET.ParseError as e:
        raise Skip(f"unparsable Atom feed ({e})") from e
    ns = {"a": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
    out: dict[str, dict] = {}
    for entry in root.findall("a:entry", ns):
        aid = norm_arxiv(entry.findtext("a:id", "", ns))
        if not aid:
            continue  # the feed's own error entries have no arXiv id
        out[aid] = {
            "title": " ".join(entry.findtext("a:title", "", ns).split()),
            "authors": [" ".join(n.text.split()) for n in entry.findall("a:author/a:name", ns) if n.text],
            "doi": norm_doi(entry.findtext("arxiv:doi", None, ns)),
            "journal_ref": " ".join(entry.findtext("arxiv:journal_ref", "", ns).split()) or None,
            "published": entry.findtext("a:published", "", ns)[:7] or None,
        }
    return out


# --- papers.yaml as text -----------------------------------------------------------

class Dumper(yaml.SafeDumper):
    """pyyaml, but nested lists indented under their key, as the file is written by hand."""

    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)


def dump_entry(entry: dict) -> str:
    return yaml.dump([entry], Dumper=Dumper, sort_keys=False, allow_unicode=True, default_flow_style=None, width=1000)


def split_blocks(text: str) -> tuple[str, list[str]]:
    """The file as a head (comments) plus one text block per `- id:` entry."""
    starts = [m.start() for m in re.finditer(r"^- id:", text, re.M)]
    if not starts:
        return text, []
    ends = starts[1:] + [len(text)]
    return text[: starts[0]], [text[s:e] for s, e in zip(starts, ends)]


def fill_authors(block: str, authors: list[str]) -> str:
    """Put a flow-style authors list into an entry whose `authors` is missing or empty."""
    line = "  authors: " + yaml.dump(authors, default_flow_style=True, allow_unicode=True, width=1000).strip()
    m = re.search(r"^  authors:\s*(\[\s*\])?\s*(#.*)?$", block, re.M)
    if m:
        comment = f"  {m.group(2)}" if m.group(2) else ""
        return block[: m.start()] + line + comment + block[m.end():]
    lines = block.split("\n")
    at = 1  # after the `- id:` line, unless a one-line title is found to follow
    for j in range(len(lines) - 1):
        if re.match(r"^  title:\s*[^\s>|]", lines[j]) and re.match(r"^  [a-z_]+:", lines[j + 1]):
            at = j + 1
            break
    lines.insert(at, line)
    return "\n".join(lines)


def slug(title: str, taken: set[str], fallback: str) -> str:
    words = norm_title(title).split()
    s = ""
    for w in words:
        if len(s) + len(w) + 1 > 60 and s:
            break
        s = f"{s}-{w}" if s else w
    s = s.strip("-") or fallback.lower()
    if not RE_ID.match(s):
        s = fallback.lower()
    base, n = s, 2
    while s in taken:
        s = f"{base}-{n}"
        n += 1
    taken.add(s)
    return s


def validate(entry: dict) -> str | None:
    """A reason the entry would fail the Astro build, or None."""
    if not RE_ID.match(entry.get("id") or ""):
        return "id"
    if not (entry.get("title") or "").strip():
        return "title is empty"
    if not entry.get("authors") or not all(isinstance(a, str) and a.strip() for a in entry["authors"]):
        return "authors is empty"
    if not isinstance(entry.get("year"), int) or not 1900 <= entry["year"] <= 2100:
        return f"year {entry.get('year')!r}"
    if "date" in entry and not RE_DATE.match(str(entry["date"])):
        return f"date {entry['date']!r}"
    if not (entry.get("venue") or "").strip():
        return "venue is empty"
    if "arxiv" in entry and not RE_ARXIV.match(entry["arxiv"]):
        return f"arxiv {entry['arxiv']!r}"
    if "doi" in entry and not RE_DOI.match(entry["doi"]):
        return f"doi {entry['doi']!r}"
    for link in entry.get("links") or []:
        if not RE_URL.match(link.get("url") or ""):
            return f"link {link!r}"
    if not (entry.get("arxiv") or entry.get("doi") or entry.get("links")):
        return "nothing to link to"
    return None


# --- the run -----------------------------------------------------------------------

def run(args) -> int:
    sources = yaml.safe_load(Path(args.sources).read_text(encoding="utf-8")) or {}
    papers_path = Path(args.papers)
    text = papers_path.read_text(encoding="utf-8")
    entries = yaml.safe_load(text) or []
    if not isinstance(entries, list) or not all(isinstance(e, dict) for e in entries):
        print(f"{papers_path}: expected a list of entries", file=sys.stderr)
        return 1
    head, blocks = split_blocks(text)
    if len(blocks) != len(entries):
        print(f"{papers_path}: {len(entries)} entries but {len(blocks)} `- id:` blocks; refusing to edit", file=sys.stderr)
        return 1

    mailto = sources.get("mailto") or ""
    profiles = [p for p in [sources.get("openalex_author_id"), *(sources.get("openalex_secondary_author_ids") or [])] if p]
    ignore = {norm_ignore(x) for x in sources.get("ignore") or []}
    today = dt.date.today().isoformat()

    index = Index()
    for e in entries:
        index.add(e, norm_arxiv(e.get("arxiv")), norm_doi(e.get("doi")), e.get("title"))

    session = requests.Session()
    session.headers["User-Agent"] = f"{USER_AGENT} mailto:{mailto}" if mailto else USER_AGENT
    skipped: list[str] = []  # "source: reason"
    counts: list[str] = []   # "OpenAlex A…: 7 works"

    # 1. Discover.
    works: list[Work] = []
    for profile in profiles:
        try:
            got = openalex_works(session, profile, mailto, args.openalex_api, args.timeout)
        except Skip as e:
            skipped.append(f"OpenAlex {profile}: {e}")
            continue
        counts.append(f"OpenAlex {profile}: {len(got)} works")
        works.extend(got)
    if s2 := sources.get("semantic_scholar_author_id"):
        try:
            got = semantic_scholar_works(session, str(s2), args.s2_api, args.timeout)
        except Skip as e:
            skipped.append(f"Semantic Scholar {s2}: {e}")
        else:
            counts.append(f"Semantic Scholar {s2}: {len(got)} works")
            works.extend(got)

    seen_work_ids: set[str] = set()
    matched: list[tuple[Work, dict, str]] = []
    ignored: list[Work] = []
    proposals: list[Proposal] = []
    proposed_index = Index()
    for w in works:
        if w.id in seen_work_ids:
            continue  # the same work on two profiles
        seen_work_ids.add(w.id)
        if {w.id, w.arxiv, w.doi} & ignore:
            ignored.append(w)
            continue
        entry, how = index.find(w.arxiv, w.doi, w.title)
        if entry is not None:
            matched.append((w, entry, how))
            continue
        p, _ = proposed_index.find(w.arxiv, w.doi, w.title)
        if p is None:
            p = Proposal(w.title, w.authors, w.year, w.date, w.venue, w.arxiv, w.doi, [w])
            proposals.append(p)
        else:
            # A preprint and its published version are two OpenAlex works; keep one draft.
            p.works.append(w)
            p.arxiv = p.arxiv or w.arxiv
            p.doi = p.doi or w.doi
            p.date = p.date or w.date
            if w.published and not any(x.published for x in p.works[:-1]):
                p.venue, p.year, p.date, p.doi = w.venue, w.year or p.year, w.date or p.date, w.doi or p.doi
        proposed_index.add(p, w.arxiv, w.doi, w.title)

    # 2. Enrich: one arXiv query for every id in the file plus every proposed one.
    arxiv_ids = sorted({a for a in (norm_arxiv(e.get("arxiv")) for e in entries) if a} | {p.arxiv for p in proposals if p.arxiv})
    arx: dict[str, dict] = {}
    if arxiv_ids:
        try:
            arx = arxiv_entries(session, arxiv_ids, args.arxiv_api, args.timeout)
        except Skip as e:
            skipped.append(f"arXiv: {e}")
        else:
            counts.append(f"arXiv: {len(arx)} of {len(arxiv_ids)} ids")

    hints: list[str] = []
    hint_keys: set[tuple] = set()

    def hint(entry: dict, key: tuple, line: str) -> None:
        if key not in hint_keys and not ({str(k) for k in key} & ignore):
            hint_keys.add(key)
            hints.append(f"`{entry.get('id')}`: {line}")

    filled: dict[int, list[str]] = {}
    for i, e in enumerate(entries):
        a = arx.get(norm_arxiv(e.get("arxiv")) or "")
        if not a:
            continue
        if not e.get("authors") and a["authors"]:
            filled[i] = a["authors"]
        preprint = "preprint" in (e.get("venue") or "").lower()
        if a["doi"] and a["doi"] != norm_doi(e.get("doi")):
            what = "no `doi`" if not e.get("doi") else f"`doi: {e['doi']}`"
            hint(e, (e.get("id"), "doi", a["doi"]), f"arXiv lists DOI {a['doi']}; the entry has {what}.")
        if a["journal_ref"] and preprint:
            hint(e, (e.get("id"), "journal_ref", a["journal_ref"]), f"arXiv lists journal_ref “{a['journal_ref']}”; the venue still says preprint.")
    for w, e, how in matched:
        if w.doi and w.doi != norm_doi(e.get("doi")):
            what = "no `doi`" if not e.get("doi") else f"`doi: {e['doi']}`"
            hint(e, (e.get("id"), "doi", w.doi), f"OpenAlex lists DOI {w.doi} ({w.venue}, {w.id}); the entry has {what}.")
        if w.arxiv and not e.get("arxiv"):
            hint(e, (e.get("id"), "arxiv", w.arxiv), f"OpenAlex lists arXiv {w.arxiv} ({w.id}); the entry has no `arxiv`.")

    # 3. Build the drafts.
    taken = {str(e.get("id")) for e in entries}
    drafts: list[dict] = []
    rejected: list[str] = []
    for p in proposals:
        a = arx.get(p.arxiv or "")
        if a:
            p.title = a["title"] or p.title
            p.authors = a["authors"] or p.authors
            p.date = p.date or a["published"]
            p.doi = p.doi or a["doi"]
        p.id = slug(p.title, taken, p.works[0].id or "draft")
        entry = p.entry()
        if reason := validate(entry):
            rejected.append(f"{p.title or p.works[0].id} ({', '.join(w.label for w in p.works)}): {reason}")
            continue
        drafts.append(entry)

    # 4. Write, as text, then prove nothing else moved.
    new_blocks = [fill_authors(b, filled[i]) if i in filled else b for i, b in enumerate(blocks)]
    new_text = head + "".join(new_blocks)
    if drafts:
        if not new_text.endswith("\n"):
            new_text += "\n"
        new_text += "\n" + "\n".join(dump_entry(d) for d in drafts)
    changed = new_text != text
    if changed:
        reparsed = yaml.safe_load(new_text) or []
        expected = [dict(e, authors=filled[i]) if i in filled else e for i, e in enumerate(entries)] + drafts
        if reparsed != expected:
            print("refresh.py: the edited file does not re-parse to the expected entries; nothing written", file=sys.stderr)
            return 1

    # 5. Report.
    n_hint = len(hints)
    title = f"Papers refresh: {len(drafts)} proposed, {n_hint} hint{'s' if n_hint != 1 else ''}"
    lines = [f"## {title}", "", f"Run on {today}. Spec: docs/brief.md section 10.", ""]
    if drafts:
        lines += [
            f"**Proposed: {len(drafts)}.** Appended to `src/data/papers.yaml` as drafts (`draft: true`, `summary: TODO`), so they do not render. "
            "For each one: check it is yours, write the one-sentence summary, fix the venue and year, then set `draft: false`. "
            "Anything that is not yours goes in `ignore` in `src/data/sources.yaml` (an OpenAlex work id, arXiv id, or DOI).",
            "",
        ]
        for p, d in zip([p for p in proposals if p.id in {d["id"] for d in drafts}], drafts):
            ids = [f"arXiv {d['arxiv']}" if d.get("arxiv") else "", f"DOI {d['doi']}" if d.get("doi") else ""]
            ids_s = ", ".join(x for x in ids if x) or "no arXiv id or DOI"
            lines.append(f"- `{d['id']}`: {d['title']} ({d['year']}). {ids_s}. From {'; '.join(w.label for w in p.works)}.")
        lines.append("")
    else:
        lines += ["**Proposed: 0.** Every work on the profiles matches an entry.", ""]
    if hints:
        lines += [f"**Hints: {n_hint}.** Nothing below was changed; edit by hand if wanted. A DOI in `ignore` silences its hint.", ""]
        lines += [f"- {h}" for h in hints] + [""]
    else:
        lines += ["**Hints: 0.**", ""]
    if rejected:
        lines += ["**Could not propose** (would fail the build; add by hand):", ""] + [f"- {r}" for r in rejected] + [""]
    if filled:
        lines += ["**Authors filled** from arXiv on: " + ", ".join(f"`{entries[i].get('id')}`" for i in filled) + ".", ""]
    by_how: dict[str, int] = {}
    for _, _, how in matched:
        by_how[how] = by_how.get(how, 0) + 1
    how_s = ", ".join(f"{n} by {how}" for how, n in by_how.items())
    lines.append(f"**Sources.** {'; '.join(counts) or 'none reachable'}. {len(matched)} works matched {len({id(e) for _, e, _ in matched})} entries ({how_s or 'none'})"
                 + (f"; {len(ignored)} ignored" if ignored else "") + ".")
    lines.append(f"**Skipped.** {'; '.join(skipped) if skipped else 'None.'}")
    if skipped:
        lines.append("A skipped source is an outage, not an error; the next run retries.")
    report = "\n".join(lines) + "\n"

    diff = "".join(difflib.unified_diff(
        text.splitlines(keepends=True), new_text.splitlines(keepends=True),
        fromfile=str(papers_path), tofile=f"{papers_path} (proposed)",
    ))
    print(diff if diff else f"{papers_path}: no change proposed.")
    print()
    print(report)

    if args.dry_run:
        print("Dry run: nothing written.")
    else:
        if changed:
            papers_path.write_text(new_text, encoding="utf-8")
            print(f"Wrote {papers_path}.")
        if args.report:
            Path(args.report).write_text(report, encoding="utf-8")
            print(f"Wrote {args.report}.")
    if args.outputs:
        with open(args.outputs, "a", encoding="utf-8") as f:
            f.write(f"title={title}\nproposed={len(drafts)}\nhints={n_hint}\nskipped={len(skipped)}\nchanged={'true' if changed else 'false'}\n")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--papers", default=str(PAPERS), help="papers.yaml to read and, without --dry-run, update")
    ap.add_argument("--sources", default=str(SOURCES), help="sources.yaml with the author ids")
    ap.add_argument("--report", help="write the Markdown report here (ignored with --dry-run)")
    ap.add_argument("--outputs", help="append title=, proposed=, hints=, skipped=, changed= lines here (GitHub Actions $GITHUB_OUTPUT)")
    ap.add_argument("--dry-run", action="store_true", help="print the proposed diff and the report; write nothing")
    ap.add_argument("--timeout", type=float, default=30, help="seconds per HTTP request")
    ap.add_argument("--openalex-api", default=OPENALEX_API, help=argparse.SUPPRESS)
    ap.add_argument("--arxiv-api", default=ARXIV_API, help=argparse.SUPPRESS)
    ap.add_argument("--s2-api", default=S2_API, help=argparse.SUPPRESS)
    return run(ap.parse_args())


if __name__ == "__main__":
    sys.exit(main())
