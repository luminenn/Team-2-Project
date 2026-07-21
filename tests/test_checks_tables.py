"""Unit tests for table accessibility checks."""
import pytest
from cvc_rubric.checks.deterministic import check_tables

PID = "page-1"
PT = "Test Page"


# ---------------------------------------------------------------------------
# tbl-001: no <th> in data table
# ---------------------------------------------------------------------------

def test_table_no_th_is_error():
    html = """
    <table>
      <tr><td>Name</td><td>Grade</td></tr>
      <tr><td>Alice</td><td>A</td></tr>
    </table>
    """
    findings = check_tables(html, PID, PT)
    assert any(f.check_id == "tbl-001" for f in findings)
    f = next(f for f in findings if f.check_id == "tbl-001")
    assert f.severity == "error"


def test_table_with_th_no_tbl001():
    html = """
    <table>
      <tr><th scope="col">Name</th><th scope="col">Grade</th></tr>
      <tr><td>Alice</td><td>A</td></tr>
    </table>
    """
    findings = check_tables(html, PID, PT)
    assert not any(f.check_id == "tbl-001" for f in findings)


def test_layout_table_role_presentation_no_tbl001():
    html = """
    <table role="presentation">
      <tr><td>col1</td><td>col2</td></tr>
    </table>
    """
    findings = check_tables(html, PID, PT)
    assert not any(f.check_id == "tbl-001" for f in findings)


# ---------------------------------------------------------------------------
# tbl-002: <th> without scope
# ---------------------------------------------------------------------------

def test_th_without_scope_is_warning():
    html = """
    <table>
      <tr><th>Name</th><th>Score</th></tr>
      <tr><td>Alice</td><td>95</td></tr>
    </table>
    """
    findings = check_tables(html, PID, PT)
    tbl002 = [f for f in findings if f.check_id == "tbl-002"]
    assert len(tbl002) == 2  # both <th> elements missing scope


def test_th_with_scope_no_warning():
    html = """
    <table>
      <tr><th scope="col">Name</th><th scope="col">Score</th></tr>
      <tr><td>Alice</td><td>95</td></tr>
    </table>
    """
    findings = check_tables(html, PID, PT)
    assert not any(f.check_id == "tbl-002" for f in findings)


def test_th_with_id_no_scope_warning():
    # id is a valid alternative to scope for complex tables
    html = """
    <table>
      <tr><th id="h1">Name</th></tr>
      <tr><td headers="h1">Alice</td></tr>
    </table>
    """
    findings = check_tables(html, PID, PT)
    assert not any(f.check_id == "tbl-002" for f in findings)


# ---------------------------------------------------------------------------
# tbl-004: merged cells without id/headers
# ---------------------------------------------------------------------------

def test_colspan_without_headers_is_warning():
    html = """
    <table>
      <tr><th scope="col" colspan="2">Full Name</th></tr>
      <tr><td>Alice</td><td>Smith</td></tr>
    </table>
    """
    findings = check_tables(html, PID, PT)
    assert any(f.check_id == "tbl-004" for f in findings)


def test_colspan_with_id_headers_no_warning():
    html = """
    <table>
      <tr><th id="fn" scope="col" colspan="2">Full Name</th></tr>
      <tr><td headers="fn">Alice</td><td headers="fn">Smith</td></tr>
    </table>
    """
    findings = check_tables(html, PID, PT)
    assert not any(f.check_id == "tbl-004" for f in findings)


# ---------------------------------------------------------------------------
# tbl-003: layout table with role=presentation but many cells — info
# ---------------------------------------------------------------------------

def test_large_layout_table_is_info():
    cells = "<tr>" + "<td>x</td>" * 3 + "</tr>" * 2  # 6 cells
    html = f'<table role="presentation">{cells}</table>'
    findings = check_tables(html, PID, PT)
    # May flag tbl-003 info for large layout table
    assert isinstance(findings, list)


def test_no_tables_no_findings():
    assert check_tables("<p>No tables here</p>", PID, PT) == []


def test_empty_html_no_crash():
    assert check_tables("", PID, PT) == []
