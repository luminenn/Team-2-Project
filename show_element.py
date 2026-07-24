import json, sys

filename = sys.argv[1] if len(sys.argv) > 1 else "aligned-verification.json"
element_id = sys.argv[2] if len(sys.argv) > 2 else "1.3"

with open(filename, encoding="utf-8") as f:
    data = json.load(f)

for f in data.get("rubric_findings", []):
    if f["element_id"] == element_id:
        print(json.dumps(f, indent=2))
        break
