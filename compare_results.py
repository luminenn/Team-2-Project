"""Compare aligned vs non-aligned course results."""
import json

with open("aligned-verification.json", encoding="utf-8") as f:
    aligned = json.load(f)
with open("nonaligned-verification.json", encoding="utf-8") as f:
    nonaligned = json.load(f)

a_findings = {f["element_id"]: f for f in aligned["rubric_findings"]}
n_findings = {f["element_id"]: f for f in nonaligned["rubric_findings"]}

all_ids = sorted(set(list(a_findings.keys()) + list(n_findings.keys())))

print("COMPARATIVE ANALYSIS: Aligned vs Non-Aligned Course")
print("=" * 80)
print(f"{'Element':<8} {'Title':<35} {'Aligned Course':<16} {'Non-Aligned':<16} {'Same?'}")
print("-" * 80)

same_rating = []
different_rating = []

for eid in all_ids:
    a = a_findings.get(eid, {})
    n = n_findings.get(eid, {})
    a_rating = a.get("rating", "N/A")
    n_rating = n.get("rating", "N/A")
    title = a.get("element_title", n.get("element_title", ""))[:34]
    same = "YES" if a_rating == n_rating else ""
    print(f"{eid:<8} {title:<35} {a_rating:<16} {n_rating:<16} {same}")
    if a_rating == n_rating:
        same_rating.append((eid, title, a_rating, a, n))
    else:
        different_rating.append((eid, title, a_rating, n_rating))

print("-" * 80)
print(f"\nElements with SAME rating: {len(same_rating)}")
print(f"Elements with DIFFERENT rating: {len(different_rating)}")

print("\n" + "=" * 80)
print("ELEMENTS WITH SAME RATING (potential miscalibration)")
print("=" * 80)
for eid, title, rating, a_data, n_data in same_rating:
    a_pass = rating in ("aligned", "exceptional")
    print(f"\n  {eid} {title}")
    print(f"    Both rated: {rating}")
    if a_pass:
        print(f"    Analysis: Both genuinely pass — both courses satisfy this element")
    else:
        print(f"    Analysis: Both genuinely fail — neither course has this content")
    print(f"    Aligned reasoning: {a_data.get('reasoning', 'N/A')[:150]}")
    print(f"    Non-aligned reasoning: {n_data.get('reasoning', 'N/A')[:150]}")

print("\n" + "=" * 80)
print("ELEMENTS WHERE COURSES DIFFER (successful separation)")
print("=" * 80)
for eid, title, a_rating, n_rating in different_rating:
    a_pass = a_rating in ("aligned", "exceptional")
    n_pass = n_rating in ("aligned", "exceptional")
    if a_pass and not n_pass:
        status = "CORRECT: Aligned passes, Non-aligned fails"
    elif not a_pass and n_pass:
        status = "INVERTED: Aligned fails, Non-aligned passes (PROBLEM)"
    elif not a_pass and not n_pass:
        status = "BOTH FAIL: Different failure modes"
    else:
        status = "BOTH PASS: Different success levels"
    print(f"  {eid} {title}: {a_rating} vs {n_rating} — {status}")

# Summary stats
a_pass_count = sum(1 for f in aligned["rubric_findings"] if f["rating"] in ("aligned", "exceptional"))
n_pass_count = sum(1 for f in nonaligned["rubric_findings"] if f["rating"] in ("aligned", "exceptional"))
total = len(aligned["rubric_findings"])
print(f"\n{'='*80}")
print(f"SUMMARY")
print(f"{'='*80}")
print(f"  Aligned course:     {a_pass_count}/{total} = {a_pass_count/total*100:.1f}% aligned or better")
print(f"  Non-aligned course: {n_pass_count}/{total} = {n_pass_count/total*100:.1f}% aligned or better")
print(f"  Separation:         {a_pass_count - n_pass_count} elements different")
print(f"  Target for aligned: >= 95% ({int(total*0.95)}/{total})")
print(f"  Target for non-aligned: < 95% (must NOT pass)")
