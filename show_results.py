import json, sys

filename = sys.argv[1] if len(sys.argv) > 1 else "aligned-verification.json"
with open(filename, encoding="utf-8") as f:
    data = json.load(f)

findings = data.get("rubric_findings", [])
print(f"RESULTS: {data['meta']['course_title']}")
print("=" * 70)
aligned_count = 0
total = len(findings)
for f in findings:
    rating = f["rating"]
    mark = "PASS" if rating in ("aligned", "exceptional") else "FAIL"
    if rating in ("aligned", "exceptional"):
        aligned_count += 1
    print(f"  {f['element_id']:6} {f['element_title']:40} {rating:15} {mark}")
print("=" * 70)
pct = aligned_count / total * 100 if total > 0 else 0
result = "PASS" if pct >= 95 else "FAIL"
print(f"  Aligned or better: {aligned_count}/{total} = {pct:.1f}%")
print(f"  Target: >= 95%  Overall: {result}")
