# CVC Course Design Rubric Report

**Course:** Introduction to Psychology  
**Analyzed:** 2026-07-21T22:56:59.235465+00:00  
**Rubric Version:** 2027.06  
**Prompt Version:** 2027.06.1  
**Duration:** 0.2s  

## Summary

| Rating | Count |
|--------|-------|
| 🌟 Exceptional | 0 |
| ✅ Aligned | 0 |
| ⚠️ Approaching | 0 |
| ❌ Incomplete | 0 |
| ⬜ Not Evaluable | 0 |

**Accessibility findings:** 🔴 1 errors, 🟡 4 warnings, 🔵 0 info

---

## Rubric Findings

## Accessibility Findings

### Files

**🟡 [doc-001]** PDF file "syllabus.pdf" requires manual accessibility verification.  
**Remediation:** Run the file through Adobe Acrobat's Accessibility Checker or PAC 2024. Ensure the PDF is tagged, has a logical reading order, alt text on images, and an accessible form structure if applicable.  
```html
syllabus.pdf (/files/syllabus.pdf)
```

**🟡 [doc-002]** Word document "cornell-note-template.docx" requires manual accessibility verification.  
**Remediation:** Use Word's built-in Accessibility Checker (Review → Check Accessibility). Ensure headings, alt text, table headers, and reading order are correct before uploading.  
```html
cornell-note-template.docx (/files/cornell-note-template.docx)
```

### Module 1 Overview

**🔴 [img-001]** Image missing alt attribute.  
**Remediation:** Add an alt attribute describing the image content, or alt="" if purely decorative.  
```html
<img src="brain-diagram.png"/>
```

**🟡 [med-003]** Embedded video from https://www.youtube.com/embed/vo4pMVb0R6M has unconfirmed captions (captions_declared=False).  
**Remediation:** Verify that the video has accurate captions enabled. For YouTube, open the video and confirm closed captions are available and are not auto-generated without review.  
```html
<iframe height="315" src="https://www.youtube.com/embed/vo4pMVb0R6M" width="560"></iframe>
```

### Week 1 Reading

**🟡 [lnk-004]** Link opens in a new tab/window without warning: "Reading Reflection form".  
**Remediation:** Add an aria-label that includes "(opens in new tab)" or add a visually-hidden span with that text so screen reader users are informed.  
```html
<a href="https://forms.example.com" target="_blank">Reading Reflection form</a>
```
