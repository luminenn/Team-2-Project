"""
IMSCC parser: converts a Canvas .imscc export to a course object dict.

Public API:
    parse_imscc(path: str) -> tuple[dict, list[str]]

The returned dict matches the CourseObject schema in models.py exactly.
Every top-level key is always present; missing data is [] or null.
"""
from __future__ import annotations

import hashlib
import logging
import mimetypes
import os
import re
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Optional
from urllib.parse import unquote, urljoin
from xml.etree import ElementTree as ET

from bs4 import BeautifulSoup, Tag

from cvc_rubric.parser.adapter import CourseSourceAdapter

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_ZIP_MAGIC = b"PK\x03\x04"

# IMS content types
_TYPE_PAGE = "webcontent"                          # imsbasiclti or webcontent
_TYPE_ASSIGNMENT = "assignment"                    # associatedcontent/imscc_xmlv1p*
_TYPE_QUIZ = "imsqti"
_TYPE_DISCUSSION = "imsdt"                         # discussion topic
_TYPE_DISCUSSION_TOPIC = "discussiontopic"
_TYPE_SYLLABUS = "syllabus"
_TYPE_FILE = "imswl"                               # web link (not used for files)

_CANVAS_NS = "http://canvas.instructure.com/xsd/cccv1p0"

_VIDEO_PLATFORMS = re.compile(
    r"(youtube\.com/embed|youtu\.be|vimeo\.com|kaltura|"
    r"canvas\.instructure\.com.*media_objects|canvastudio)",
    re.I,
)

_TRANSCRIPT_RE = re.compile(
    r"transcript|caption|subtitle|text version|read along", re.I
)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def _validate_zip(path: str) -> None:
    """Raise ValueError if file is not a valid ZIP by magic bytes."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {path}")
    with open(p, "rb") as f:
        magic = f.read(4)
    if magic != _ZIP_MAGIC:
        raise ValueError(
            f"'{path}' does not appear to be a ZIP archive "
            f"(magic bytes: {magic.hex()!r}). "
            "Ensure the file is a valid .imscc export."
        )


def _validate_manifest(zf: zipfile.ZipFile) -> None:
    """Raise ValueError if imsmanifest.xml is missing from the archive root."""
    names = zf.namelist()
    if "imsmanifest.xml" not in names:
        raise ValueError(
            "Archive does not contain 'imsmanifest.xml' at the root. "
            "This does not appear to be a valid IMS Common Cartridge file."
        )


# ---------------------------------------------------------------------------
# XML helpers
# ---------------------------------------------------------------------------

def _strip_ns(tag: str) -> str:
    """Strip XML namespace prefix: '{http://...}tag' -> 'tag'."""
    return tag.split("}")[-1] if "}" in tag else tag


def _find_all(root: ET.Element, local_name: str) -> list[ET.Element]:
    """Find all descendants with a given local tag name, ignoring namespace."""
    return [el for el in root.iter() if _strip_ns(el.tag) == local_name]


def _find_one(root: ET.Element, local_name: str) -> Optional[ET.Element]:
    results = _find_all(root, local_name)
    return results[0] if results else None


def _attr(el: ET.Element, *names: str) -> str:
    """Return first matching attribute value (namespace-stripped keys), or ''."""
    for name in names:
        # try bare name first, then with any namespace prefix in the key
        v = el.get(name, "")
        if v:
            return v
        # some manifests use Clark notation in attribute keys
        for k, v2 in el.attrib.items():
            if _strip_ns(k) == name and v2:
                return v2
    return ""


def _parse_xml_safe(data: bytes, source: str, warnings: list[str]) -> Optional[ET.Element]:
    """Parse XML bytes; on failure append a warning and return None."""
    try:
        return ET.fromstring(data)
    except ET.ParseError as e:
        warnings.append(f"XML parse error in '{source}': {e}")
        return None


# ---------------------------------------------------------------------------
# Manifest parsing
# ---------------------------------------------------------------------------

def _parse_manifest(
    root: ET.Element,
    warnings: list[str],
) -> tuple[dict[str, dict], list[dict]]:
    """
    Parse imsmanifest.xml.

    Returns:
        resources : {identifier -> {"type": str, "href": str}}
        org_items  : flat list of {"id", "title", "resource_id"} in document order
    """
    resources: dict[str, dict] = {}
    for res in _find_all(root, "resource"):
        ident = _attr(res, "identifier")
        rtype = _attr(res, "type").lower()
        href = unquote(_attr(res, "href"))
        if ident:
            resources[ident] = {"type": rtype, "href": href}

    org_items: list[dict] = []

    def _walk(el: ET.Element) -> None:
        local = _strip_ns(el.tag)
        if local == "item":
            ident = _attr(el, "identifier")
            id_ref = _attr(el, "identifierref")
            title_el = _find_one(el, "title")
            title = (title_el.text or "").strip() if title_el is not None else ""
            if id_ref or title:
                org_items.append({
                    "id": ident,
                    "title": title,
                    "resource_id": id_ref,
                })
        for child in el:
            _walk(child)

    for org in _find_all(root, "organization"):
        _walk(org)

    return resources, org_items


# ---------------------------------------------------------------------------
# Canvas course_settings/ parsers
# ---------------------------------------------------------------------------

def _read_zip_text(zf: zipfile.ZipFile, path: str) -> Optional[bytes]:
    """Return raw bytes for a path in the zip, or None if missing."""
    try:
        return zf.read(path)
    except KeyError:
        return None


def _parse_course_settings(zf: zipfile.ZipFile, warnings: list[str]) -> dict:
    """Read course_settings/course_settings.xml -> {title, code, term}."""
    data = _read_zip_text(zf, "course_settings/course_settings.xml")
    if data is None:
        return {"title": "", "code": "", "term": ""}
    root = _parse_xml_safe(data, "course_settings.xml", warnings)
    if root is None:
        return {"title": "", "code": "", "term": ""}

    def _text(tag: str) -> str:
        el = _find_one(root, tag)
        return (el.text or "").strip() if el is not None else ""

    title = _text("title") or _text("course_title") or _text("name")
    code = _text("course_code") or _text("code") or _text("sis_source_id")
    term = _text("term") or _text("enrollment_term") or ""
    return {"title": title, "code": code, "term": term}


def _parse_module_meta(
    zf: zipfile.ZipFile,
    warnings: list[str],
) -> list[dict]:
    """
    Read course_settings/module_meta.xml.
    Returns list of module dicts with Canvas-native ordering and items.
    """
    data = _read_zip_text(zf, "course_settings/module_meta.xml")
    if data is None:
        return []
    root = _parse_xml_safe(data, "module_meta.xml", warnings)
    if root is None:
        return []

    modules: list[dict] = []
    for mod_el in _find_all(root, "module"):
        mod_id = _attr(mod_el, "identifier")
        title_el = _find_one(mod_el, "title")
        title = (title_el.text or "").strip() if title_el is not None else ""
        pos_el = _find_one(mod_el, "position")
        try:
            position = int(pos_el.text or 0) if pos_el is not None else 0
        except ValueError:
            position = 0

        items: list[dict] = []
        for item_el in _find_all(mod_el, "item"):
            item_id = _attr(item_el, "identifier")
            item_title_el = _find_one(item_el, "title")
            item_title = (item_title_el.text or "").strip() if item_title_el is not None else ""
            content_type_el = _find_one(item_el, "content_type")
            content_type = (content_type_el.text or "").strip() if content_type_el is not None else ""
            id_ref_el = _find_one(item_el, "identifierref")
            id_ref = (id_ref_el.text or "").strip() if id_ref_el is not None else ""
            item_pos_el = _find_one(item_el, "position")
            try:
                item_pos = int(item_pos_el.text or 0) if item_pos_el is not None else 0
            except ValueError:
                item_pos = 0
            items.append({
                "id": item_id,
                "title": item_title,
                "type": content_type,
                "resource_id": id_ref,
                "_position": item_pos,
            })

        items.sort(key=lambda x: x["_position"])
        modules.append({
            "id": mod_id,
            "title": title,
            "position": position,
            "items": items,
        })

    modules.sort(key=lambda m: m["position"])
    return modules


# ---------------------------------------------------------------------------
# HTML extraction helpers
# ---------------------------------------------------------------------------

def _read_html_from_zip(
    zf: zipfile.ZipFile,
    href: str,
    warnings: list[str],
) -> str:
    """Read an HTML resource from the ZIP. Returns '' on missing/error."""
    if not href:
        return ""
    # href may be URL-encoded; decode and normalise separators
    decoded = unquote(href).replace("\\", "/").lstrip("/")
    data = _read_zip_text(zf, decoded)
    if data is None:
        warnings.append(f"HTML resource not found in archive: '{decoded}'")
        return ""
    try:
        return data.decode("utf-8", errors="replace")
    except Exception as e:
        warnings.append(f"Could not decode '{decoded}': {e}")
        return ""


def _html_to_text(html: str) -> str:
    """Extract plain text from HTML, collapsing whitespace."""
    if not html.strip():
        return ""
    try:
        soup = BeautifulSoup(html, "lxml")
        return " ".join(soup.get_text(separator=" ").split())
    except Exception:
        return ""


def _is_page_type(rtype: str) -> bool:
    return _TYPE_PAGE in rtype and "qti" not in rtype


def _is_assignment_type(rtype: str) -> bool:
    return "assignment" in rtype or "associatedcontent" in rtype


def _is_quiz_type(rtype: str) -> bool:
    return "qti" in rtype


def _is_discussion_type(rtype: str) -> bool:
    return _TYPE_DISCUSSION in rtype or _TYPE_DISCUSSION_TOPIC in rtype


def _is_syllabus_type(rtype: str) -> bool:
    return _TYPE_SYLLABUS in rtype


# ---------------------------------------------------------------------------
# Per-resource extractors
# ---------------------------------------------------------------------------

def _extract_page(
    ident: str,
    title: str,
    href: str,
    module_id: Optional[str],
    zf: zipfile.ZipFile,
    warnings: list[str],
) -> dict:
    html = _read_html_from_zip(zf, href, warnings)
    return {
        "id": ident,
        "title": title,
        "module_id": module_id,
        "html": html,
        "text": _html_to_text(html),
        "path": unquote(href),
    }


def _inner_xml(el: ET.Element) -> str:
    """Get the inner content of an XML element as a string (including child tags)."""
    # el.text + serialized children + each child's tail
    parts = []
    if el.text:
        parts.append(el.text)
    for child in el:
        parts.append(ET.tostring(child, encoding="unicode", method="html"))
    return "".join(parts).strip()


def _extract_assignment(
    ident: str,
    title: str,
    href: str,
    zf: zipfile.ZipFile,
    resources: dict[str, dict],
    warnings: list[str],
) -> dict:
    """
    Assignments are stored as XML (Canvas assignment XML) not plain HTML.
    We locate the body HTML inside the XML, plus check for a rubric resource.
    """
    html = ""
    text = ""
    due_date: Optional[str] = None
    rubric_present = False

    decoded = unquote(href).replace("\\", "/").lstrip("/") if href else ""
    raw = _read_zip_text(zf, decoded) if decoded else None

    if raw:
        # Try parsing as Canvas assignment XML first
        root = _parse_xml_safe(raw, decoded, warnings)
        if root is not None:
            # Title from XML may be more accurate than manifest/fallback
            title_el = _find_one(root, "title")
            if title_el is not None and title_el.text and title_el.text.strip():
                title = title_el.text.strip()
            body_el = _find_one(root, "body")
            if body_el is not None:
                html = _inner_xml(body_el)
            if not html:
                desc_el = _find_one(root, "description")
                if desc_el is not None:
                    html = _inner_xml(desc_el)
            # due date
            for tag in ("due_at", "due_date", "lock_at"):
                el = _find_one(root, tag)
                if el is not None and el.text and el.text.strip():
                    due_date = el.text.strip()
                    break
            # rubric: Canvas embeds a <rubric> element or references one
            rubric_present = (
                _find_one(root, "rubric") is not None
                or _find_one(root, "rubric_id") is not None
            )
        else:
            # Fall back: treat raw bytes as HTML
            html = raw.decode("utf-8", errors="replace")

    text = _html_to_text(html)

    return {
        "id": ident,
        "title": title,
        "html": html,
        "text": text,
        "rubric_present": rubric_present,
        "due_date": due_date,
    }


def _extract_quiz(
    ident: str,
    title: str,
    href: str,
    zf: zipfile.ZipFile,
    warnings: list[str],
) -> dict:
    """Parse QTI XML to get title and question count."""
    question_count = 0
    decoded = unquote(href).replace("\\", "/").lstrip("/") if href else ""

    # QTI files sometimes live in a subdirectory; the href may point to a
    # manifest-level wrapper.  Try the href directly first.
    raw = _read_zip_text(zf, decoded) if decoded else None

    if raw is None and decoded:
        # Some cartridges nest the QTI under <identifier>/<file>.xml
        alt = f"{ident}/{Path(decoded).name}"
        raw = _read_zip_text(zf, alt)
        if raw:
            decoded = alt

    if raw:
        root = _parse_xml_safe(raw, decoded, warnings)
        if root is not None:
            # QTI v1: <item>, v2: <assessmentItem>
            items = _find_all(root, "item") or _find_all(root, "assessmentItem")
            question_count = len(items)
            # Title from QTI metadata may be better than manifest title
            meta_title_el = _find_one(root, "assessmentTitle") or _find_one(root, "title")
            if meta_title_el is not None and meta_title_el.text:
                title = meta_title_el.text.strip() or title

    return {"id": ident, "title": title, "question_count": question_count}


def _extract_discussion(
    ident: str,
    title: str,
    href: str,
    zf: zipfile.ZipFile,
    warnings: list[str],
) -> dict:
    """Discussion topics may be XML or HTML; extract body text."""
    html = ""
    decoded = unquote(href).replace("\\", "/").lstrip("/") if href else ""
    raw = _read_zip_text(zf, decoded) if decoded else None

    if raw:
        root = _parse_xml_safe(raw, decoded, [])  # silent — try XML first
        if root is not None:
            body_el = None
            for tag_name in ("text", "body", "message"):
                candidate = _find_one(root, tag_name)
                if candidate is not None:
                    body_el = candidate
                    break
            if body_el is not None:
                html = _inner_xml(body_el)
            title_el = _find_one(root, "title")
            if title_el is not None and title_el.text:
                title = title_el.text.strip() or title
        else:
            html = raw.decode("utf-8", errors="replace")

    return {
        "id": ident,
        "title": title,
        "html": html,
        "text": _html_to_text(html),
    }


# ---------------------------------------------------------------------------
# File inventory
# ---------------------------------------------------------------------------

_MIME_FALLBACKS: dict[str, str] = {
    ".pdf":  "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc":  "application/msword",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".ppt":  "application/vnd.ms-powerpoint",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls":  "application/vnd.ms-excel",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".mp4":  "video/mp4",
    ".mp3":  "audio/mpeg",
    ".zip":  "application/zip",
}


def _infer_mime(name: str) -> str:
    ext = Path(name).suffix.lower()
    if ext in _MIME_FALLBACKS:
        return _MIME_FALLBACKS[ext]
    guessed, _ = mimetypes.guess_type(name)
    return guessed or "application/octet-stream"


def _inventory_files(zf: zipfile.ZipFile) -> list[dict]:
    """Return all files under web_resources/ as CourseFile dicts."""
    results: list[dict] = []
    for info in zf.infolist():
        if not info.filename.startswith("web_resources/"):
            continue
        if info.is_dir():
            continue
        name = Path(info.filename).name
        results.append({
            "name": name,
            "path": "/" + info.filename,
            "mime": _infer_mime(name),
            "size": info.file_size,
        })
    # Stable sort: path
    results.sort(key=lambda f: f["path"])
    return results


# ---------------------------------------------------------------------------
# Video discovery
# ---------------------------------------------------------------------------

def _discover_videos(
    html: str,
    page_id: str,
) -> list[dict]:
    """Scan HTML for video embeds and <video> elements."""
    if not html:
        return []
    found: list[dict] = []
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        return []

    # <video> elements
    for video_tag in soup.find_all("video"):
        if not isinstance(video_tag, Tag):
            continue
        src = video_tag.get("src", "")
        if not src:
            source_tag = video_tag.find("source")
            src = source_tag.get("src", "") if isinstance(source_tag, Tag) else ""
        caption_tracks = [
            t for t in video_tag.find_all("track")
            if isinstance(t, Tag)
            and t.get("kind", "").lower() in ("captions", "subtitles")
        ]
        captions_declared: Optional[bool] = bool(caption_tracks)
        found.append({
            "url": src,
            "source": "html5",
            "page_id": page_id,
            "captions_declared": captions_declared,
        })

    # <iframe> embeds pointing to known video platforms
    for iframe in soup.find_all("iframe"):
        if not isinstance(iframe, Tag):
            continue
        src = iframe.get("src", "")
        if not src or not _VIDEO_PLATFORMS.search(src):
            continue
        source = _platform_name(src)
        found.append({
            "url": src,
            "source": source,
            "page_id": page_id,
            "captions_declared": None,  # cannot determine from HTML alone
        })

    return found


def _platform_name(url: str) -> str:
    url_l = url.lower()
    if "youtube" in url_l or "youtu.be" in url_l:
        return "youtube"
    if "vimeo" in url_l:
        return "vimeo"
    if "kaltura" in url_l:
        return "kaltura"
    if "canvastudio" in url_l or "canvas.instructure" in url_l:
        return "canvas_studio"
    return "unknown"


# ---------------------------------------------------------------------------
# Module builder (fallback from org_items when no module_meta.xml)
# ---------------------------------------------------------------------------

def _build_modules_from_org(
    org_items: list[dict],
    resources: dict[str, dict],
) -> list[dict]:
    """
    Construct a flat module list from the manifest organization tree.
    Used when course_settings/module_meta.xml is absent.
    Groups top-level items as module headers; their children become items.
    """
    modules: list[dict] = []
    position = 1
    current_mod: Optional[dict] = None

    for item in org_items:
        rid = item.get("resource_id", "")
        res = resources.get(rid, {})
        rtype = res.get("type", "")
        title = item.get("title", "")

        # Heuristic: items with no resource_id are module/section headers
        if not rid:
            current_mod = {
                "id": item.get("id", f"mod-{position}"),
                "title": title,
                "position": position,
                "items": [],
            }
            modules.append(current_mod)
            position += 1
        else:
            if current_mod is None:
                # Items before any header go into a synthetic "Start Here" module
                current_mod = {
                    "id": "mod-0",
                    "title": "Start Here",
                    "position": 0,
                    "items": [],
                }
                modules.insert(0, current_mod)
            current_mod["items"].append({
                "id": item.get("id", ""),
                "title": title,
                "type": rtype,
                "resource_id": rid,
            })

    return modules


def _resource_to_module_map(modules: list[dict]) -> dict[str, str]:
    """Build {resource_id -> module_id} from the module list."""
    mapping: dict[str, str] = {}
    for mod in modules:
        for item in mod.get("items", []):
            rid = item.get("resource_id", "")
            if rid:
                mapping[rid] = mod["id"]
    return mapping


# ---------------------------------------------------------------------------
# Syllabus extraction
# ---------------------------------------------------------------------------

def _extract_syllabus(
    zf: zipfile.ZipFile,
    resources: dict[str, dict],
    warnings: list[str],
) -> Optional[dict]:
    """
    Look for a syllabus resource.  Canvas exports often have a dedicated
    syllabus resource type; fall back to a page titled 'syllabus'.
    """
    # Explicit syllabus resource type
    for ident, res in sorted(resources.items()):
        rtype = res.get("type", "")
        if _is_syllabus_type(rtype):
            html = _read_html_from_zip(zf, res.get("href", ""), warnings)
            if html:
                return {"html": html, "text": _html_to_text(html)}

    # Canvas also stores syllabus body in course_settings/syllabus_body.html
    raw = _read_zip_text(zf, "course_settings/syllabus_body.html")
    if raw:
        html = raw.decode("utf-8", errors="replace")
        return {"html": html, "text": _html_to_text(html)}

    return None


# ---------------------------------------------------------------------------
# Main parse function
# ---------------------------------------------------------------------------

def _clean_modules(modules: list[dict]) -> list[dict]:
    """Strip internal-only keys (_position) from module items."""
    clean = []
    for mod in modules:
        items = [
            {k: v for k, v in item.items() if not k.startswith("_")}
            for item in mod.get("items", [])
        ]
        clean.append({
            "id": mod["id"],
            "title": mod["title"],
            "position": mod["position"],
            "items": items,
        })
    return clean


def parse_imscc(path: str) -> tuple[dict, list[str]]:
    """
    Parse a Canvas .imscc file and return (course_object_dict, warnings).

    The dict matches the CourseObject schema exactly.  Every top-level key
    is always present; missing data is [] or null.

    Raises
    ------
    FileNotFoundError
        If *path* does not exist.
    ValueError
        If the file is not a valid ZIP or lacks imsmanifest.xml.
    """
    warnings: list[str] = []

    # --- Step 1: validate -----------------------------------------------
    _validate_zip(path)

    with zipfile.ZipFile(path, "r") as zf:
        _validate_manifest(zf)

        # --- Step 2: parse manifest -------------------------------------
        manifest_data = zf.read("imsmanifest.xml")
        manifest_root = _parse_xml_safe(manifest_data, "imsmanifest.xml", warnings)
        if manifest_root is None:
            raise ValueError("imsmanifest.xml could not be parsed as XML.")

        resources, org_items = _parse_manifest(manifest_root, warnings)

        # --- Step 3: Canvas metadata ------------------------------------
        course_meta = _parse_course_settings(zf, warnings)
        canvas_modules = _parse_module_meta(zf, warnings)

        if canvas_modules:
            modules = canvas_modules
        else:
            warnings.append(
                "course_settings/module_meta.xml not found; "
                "falling back to manifest organization tree."
            )
            modules = _build_modules_from_org(org_items, resources)

        # If course title still empty, try manifest metadata
        if not course_meta["title"]:
            meta_el = _find_one(manifest_root, "metadata")
            if meta_el is not None:
                lom_title = _find_one(meta_el, "title")
                if lom_title is not None:
                    string_el = _find_one(lom_title, "string")
                    course_meta["title"] = (
                        (string_el.text or "").strip() if string_el is not None
                        else (lom_title.text or "").strip()
                    )

        res_to_module = _resource_to_module_map(modules)

        # --- Step 4-6: extract typed resources --------------------------
        pages: list[dict] = []
        assignments: list[dict] = []
        quizzes: list[dict] = []
        discussions: list[dict] = []
        syllabus: Optional[dict] = None
        all_videos: list[dict] = []

        # Determine title from org_items when not in resources
        id_to_org_title: dict[str, str] = {
            item["resource_id"]: item["title"]
            for item in org_items
            if item.get("resource_id")
        }

        # Stable sort by identifier for deterministic output
        for ident, res in sorted(resources.items()):
            rtype = res.get("type", "")
            href = res.get("href", "")
            title = id_to_org_title.get(ident, Path(unquote(href)).stem if href else ident)
            module_id = res_to_module.get(ident)

            try:
                if _is_syllabus_type(rtype):
                    if syllabus is None:
                        html = _read_html_from_zip(zf, href, warnings)
                        if html:
                            syllabus = {"html": html, "text": _html_to_text(html)}

                elif _is_discussion_type(rtype):
                    disc = _extract_discussion(ident, title, href, zf, warnings)
                    discussions.append(disc)
                    all_videos += _discover_videos(disc["html"], ident)

                elif _is_quiz_type(rtype):
                    quizzes.append(_extract_quiz(ident, title, href, zf, warnings))

                elif _is_assignment_type(rtype):
                    asgn = _extract_assignment(ident, title, href, zf, resources, warnings)
                    assignments.append(asgn)
                    all_videos += _discover_videos(asgn["html"], ident)

                elif _is_page_type(rtype):
                    page = _extract_page(ident, title, href, module_id, zf, warnings)
                    pages.append(page)
                    all_videos += _discover_videos(page["html"], ident)

            except Exception as exc:
                warnings.append(
                    f"Skipping resource '{ident}' (type='{rtype}'): {exc}"
                )

        # Syllabus fallback: check course_settings/ or a page named syllabus
        if syllabus is None:
            syllabus = _extract_syllabus(zf, resources, warnings)

        if syllabus is None:
            # Last resort: find a page whose title contains "syllabus"
            for page in pages:
                if "syllabus" in page.get("title", "").lower():
                    syllabus = {"html": page["html"], "text": page["text"]}
                    break

        # --- Step 7: file inventory -------------------------------------
        files = _inventory_files(zf)

        # --- Deduplicate videos (same url+page_id) ----------------------
        seen_video_keys: set[str] = set()
        unique_videos: list[dict] = []
        for v in all_videos:
            key = f"{v['url']}|{v['page_id']}"
            if key not in seen_video_keys and v["url"]:
                seen_video_keys.add(key)
                unique_videos.append(v)

    # --- Finalise -----------------------------------------------------------
    clean_mods = _clean_modules(modules)

    course_object: dict = {
        "course": {
            "title": course_meta.get("title", ""),
            "code":  course_meta.get("code", ""),
            "term":  course_meta.get("term", ""),
        },
        "modules":     clean_mods,
        "pages":       pages,
        "assignments": assignments,
        "quizzes":     quizzes,
        "discussions": discussions,
        "files":       files,
        "videos":      unique_videos,
        "syllabus":    syllabus,
    }

    return course_object, warnings


# ---------------------------------------------------------------------------
# Adapter wrapper
# ---------------------------------------------------------------------------

class IMSCCAdapter(CourseSourceAdapter):
    """CourseSourceAdapter implementation for Canvas .imscc files."""

    def parse(self, path: str) -> tuple[dict, list[str]]:
        return parse_imscc(path)

    def validate(self, path: str) -> None:
        _validate_zip(path)
        with zipfile.ZipFile(path, "r") as zf:
            _validate_manifest(zf)
