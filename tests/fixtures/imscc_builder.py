"""
Test helper: programmatically build minimal .imscc ZIP archives in memory.

Usage
-----
    from tests.fixtures.imscc_builder import IMSCCBuilder

    builder = IMSCCBuilder(title="My Course", code="CS-101", term="Fall 2027")
    builder.add_page("p1", "Welcome", "<h1>Welcome</h1>")
    builder.add_module("mod-1", "Week 1", position=1, item_ids=["p1"])
    path = builder.write(tmp_path / "course.imscc")
"""
from __future__ import annotations

import io
import zipfile
from pathlib import Path
from typing import Optional


class IMSCCBuilder:
    """Builds a minimal but structurally valid .imscc ZIP for testing."""

    def __init__(
        self,
        title: str = "Test Course",
        code: str = "TEST-101",
        term: str = "Fall 2027",
    ) -> None:
        self._title = title
        self._code = code
        self._term = term
        # {identifier: {"href": str, "type": str, "html": str}}
        self._resources: dict[str, dict] = {}
        # [{id, title, position, items: [{id, title, type, resource_id}]}]
        self._modules: list[dict] = []
        self._syllabus_html: Optional[str] = None
        # list of (arcname, bytes)
        self._extra_files: list[tuple[str, bytes]] = []

    # ------------------------------------------------------------------
    # Resource adders
    # ------------------------------------------------------------------

    def add_page(self, ident: str, title: str, html: str) -> "IMSCCBuilder":
        path = f"wiki_content/{ident}.html"
        self._resources[ident] = {
            "href": path,
            "type": "webcontent",
            "title": title,
            "content": html.encode(),
        }
        return self

    def add_assignment(
        self,
        ident: str,
        title: str,
        body_html: str,
        due_date: Optional[str] = None,
        rubric: bool = False,
    ) -> "IMSCCBuilder":
        due_xml = f"<due_at>{due_date}</due_at>" if due_date else ""
        rubric_xml = "<rubric><title>Rubric</title></rubric>" if rubric else ""
        xml = (
            f"<?xml version='1.0'?><assignment>"
            f"<title>{title}</title>"
            f"<body>{body_html}</body>"
            f"{due_xml}{rubric_xml}"
            f"</assignment>"
        )
        path = f"assignments/{ident}.xml"
        self._resources[ident] = {
            "href": path,
            "type": "associatedcontent/imscc_xmlv1p1/learning-application-resource",
            "title": title,
            "content": xml.encode(),
        }
        return self

    def add_quiz(
        self, ident: str, title: str, question_count: int = 3
    ) -> "IMSCCBuilder":
        items_xml = "".join(
            f"<item ident='q{i}'><itemmetadata/></item>"
            for i in range(question_count)
        )
        xml = (
            f"<?xml version='1.0'?>"
            f"<questestinterop>"
            f"<assessment title='{title}'>"
            f"<section>{items_xml}</section>"
            f"</assessment>"
            f"</questestinterop>"
        )
        path = f"quizzes/{ident}.xml"
        self._resources[ident] = {
            "href": path,
            "type": "imsqti_xmlv1p2/imscc_xmlv1p1/assessment",
            "title": title,
            "content": xml.encode(),
        }
        return self

    def add_discussion(
        self, ident: str, title: str, body_html: str
    ) -> "IMSCCBuilder":
        xml = (
            f"<?xml version='1.0'?><topic>"
            f"<title>{title}</title>"
            f"<text>{body_html}</text>"
            f"</topic>"
        )
        path = f"discussions/{ident}.xml"
        self._resources[ident] = {
            "href": path,
            "type": "imsdt_xmlv1p1",
            "title": title,
            "content": xml.encode(),
        }
        return self

    def set_syllabus(self, html: str) -> "IMSCCBuilder":
        self._syllabus_html = html
        return self

    def add_module(
        self,
        mod_id: str,
        title: str,
        position: int,
        item_ids: Optional[list[str]] = None,
    ) -> "IMSCCBuilder":
        items = []
        for idx, rid in enumerate(item_ids or [], start=1):
            res = self._resources.get(rid, {})
            items.append({
                "id": f"{mod_id}-item-{idx}",
                "title": res.get("title", rid),
                "type": res.get("type", ""),
                "resource_id": rid,
                "position": idx,
            })
        self._modules.append({
            "id": mod_id,
            "title": title,
            "position": position,
            "items": items,
        })
        return self

    def add_web_resource(
        self, filename: str, content: bytes, mime: str = ""
    ) -> "IMSCCBuilder":
        self._extra_files.append((f"web_resources/{filename}", content))
        return self

    # ------------------------------------------------------------------
    # Builders
    # ------------------------------------------------------------------

    def _build_manifest(self) -> bytes:
        res_xml = ""
        for ident, r in self._resources.items():
            res_xml += (
                f'  <resource identifier="{ident}" type="{r["type"]}" '
                f'href="{r["href"]}">\n'
                f'    <file href="{r["href"]}"/>\n'
                f'  </resource>\n'
            )

        items_xml = ""
        for mod in self._modules:
            items_xml += f'    <item identifier="{mod["id"]}">\n'
            items_xml += f'      <title>{mod["title"]}</title>\n'
            for item in mod["items"]:
                items_xml += (
                    f'      <item identifier="{item["id"]}" '
                    f'identifierref="{item["resource_id"]}">\n'
                    f'        <title>{item["title"]}</title>\n'
                    f'      </item>\n'
                )
            items_xml += "    </item>\n"

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1"
          identifier="course-manifest">
  <metadata>
    <schema>IMS Common Cartridge</schema>
    <schemaversion>1.1.0</schemaversion>
    <lom:lom xmlns:lom="http://ltsc.ieee.org/xsd/LOM">
      <lom:general>
        <lom:title><lom:string>{self._title}</lom:string></lom:title>
      </lom:general>
    </lom:lom>
  </metadata>
  <organizations>
    <organization identifier="org1" structure="rooted-hierarchy">
      <title>{self._title}</title>
{items_xml}    </organization>
  </organizations>
  <resources>
{res_xml}  </resources>
</manifest>""".encode()

    def _build_course_settings(self) -> bytes:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<course>
  <title>{self._title}</title>
  <course_code>{self._code}</course_code>
  <term>{self._term}</term>
</course>""".encode()

    def _build_module_meta(self) -> bytes:
        mods_xml = ""
        for mod in self._modules:
            items_xml = ""
            for item in mod["items"]:
                items_xml += (
                    f"    <item identifier='{item['id']}'>\n"
                    f"      <title>{item['title']}</title>\n"
                    f"      <content_type>{item['type']}</content_type>\n"
                    f"      <identifierref>{item['resource_id']}</identifierref>\n"
                    f"      <position>{item['position']}</position>\n"
                    f"    </item>\n"
                )
            mods_xml += (
                f"  <module identifier='{mod['id']}'>\n"
                f"    <title>{mod['title']}</title>\n"
                f"    <position>{mod['position']}</position>\n"
                f"{items_xml}"
                f"  </module>\n"
            )
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<modules>
{mods_xml}</modules>""".encode()

    def write(self, path: Path) -> Path:
        """Write the .imscc ZIP to *path* and return it."""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("imsmanifest.xml", self._build_manifest())
            zf.writestr(
                "course_settings/course_settings.xml",
                self._build_course_settings(),
            )
            zf.writestr(
                "course_settings/module_meta.xml",
                self._build_module_meta(),
            )
            if self._syllabus_html is not None:
                zf.writestr(
                    "course_settings/syllabus_body.html",
                    self._syllabus_html.encode(),
                )
            for ident, r in self._resources.items():
                zf.writestr(r["href"], r["content"])
            for arcname, content in self._extra_files:
                zf.writestr(arcname, content)

        path.write_bytes(buf.getvalue())
        return path

    def to_bytes(self) -> bytes:
        """Return the ZIP archive as bytes (for in-memory tests)."""
        tmp = Path(__file__).parent / "_tmp_imscc.zip"
        self.write(tmp)
        data = tmp.read_bytes()
        tmp.unlink()
        return data
