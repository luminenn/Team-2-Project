from tests.fixtures.imscc_builder import IMSCCBuilder
from cvc_rubric.parser.imscc import _is_assignment_type, _is_page_type, _is_quiz_type, _is_discussion_type
import tempfile, zipfile, pathlib
import xml.etree.ElementTree as ET

b = IMSCCBuilder()
b.add_assignment("a1", "Essay", "<p>x</p>")
b.add_quiz("q1", "Quiz", 3)
b.add_discussion("d1", "Disc", "<p>y</p>")
p = pathlib.Path(tempfile.mktemp(suffix=".imscc"))
b.write(p)

with zipfile.ZipFile(p) as zf:
    root = ET.fromstring(zf.read("imsmanifest.xml"))
    for res in root.iter():
        tag = res.tag.split("}")[-1]
        if tag == "resource":
            t = res.get("type", "")
            print(repr(t), "-> assign:", _is_assignment_type(t),
                  "page:", _is_page_type(t), "quiz:", _is_quiz_type(t),
                  "disc:", _is_discussion_type(t))
