import json

r = json.load(open("report.json", encoding="utf-8"))
s = r["summary"]
print("=== RUBRIC SUMMARY ===")
print(f"  Aligned:        {s['aligned_count']}")
print(f"  Approaching:    {s['approaching_count']}")
print(f"  Incomplete:     {s['incomplete_count']}")
print(f"  Not Evaluable:  {s['not_evaluable_count']}")
print(f"  A11y Errors:    {s['accessibility_errors']}")
print(f"  A11y Warnings:  {s['accessibility_warnings']}")
print()
print("=== RUBRIC FINDINGS ===")
for f in r["rubric_findings"]:
    print(f"  {f['element_id']} {f['element_title']}: {f['rating']} (confidence: {f['confidence']})")
    if f.get("error_note"):
        print(f"    ERROR: {f['error_note']}")
