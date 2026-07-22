"""
CLI entry point.

Commands
--------
  analyze <course_object.json>   Evaluate a pre-parsed course object JSON.
  parse   <course.imscc>         Parse an IMSCC archive → course object JSON.
  audit   <course.imscc>         Parse then analyze in one step → report JSON.

Options (analyze)
  --out PATH              Output JSON report path (default: report.json)
  --dry-run               Print token estimates only, do not call LLM
  --no-cache              Disable on-disk response cache
  --only-deterministic    Run accessibility checks only, skip LLM
  --element ID            Run a single rubric element (e.g. 1.1)
  --config PATH           Config file path (default: config.json)
  --markdown PATH         Also write a Markdown report to this path
  --log-level LEVEL       Logging level (default: INFO)

Options (parse)
  --out PATH              Output course object JSON path (default: course_object.json)
  --log-level LEVEL       Logging level

Options (audit)
  --out PATH              Output report JSON path (default: report.json)
  --keep-intermediate     Keep the intermediate course object JSON on disk
  --intermediate PATH     Path for intermediate file (default: <temp>.json)
  --dry-run               Pass through to analyze
  --no-cache              Pass through to analyze
  --only-deterministic    Pass through to analyze
  --config PATH           Config file path
  --markdown PATH         Also write a Markdown report
  --log-level LEVEL       Logging level
"""
from __future__ import annotations

import json
import logging
import sys
import tempfile
import time
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from cvc_rubric.loader import load_course_object

console = Console()


def _load_config(config_path: str) -> dict:
    path = Path(config_path)
    if not path.exists():
        console.print(f"[yellow]Config file not found at {config_path}, using defaults.[/yellow]")
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@click.group()
def main() -> None:
    """CVC Online Course Design Rubric Analysis Engine."""


@click.command(name="analyze")
@click.argument("course_json", metavar="<course_object.json>")
@click.option("--out", default="report.json", show_default=True, help="Output JSON report path.")
@click.option("--dry-run", is_flag=True, help="Print token estimates without calling LLM.")
@click.option("--no-cache", is_flag=True, help="Disable on-disk response cache.")
@click.option("--only-deterministic", is_flag=True, help="Run accessibility checks only.")
@click.option("--element", default=None, help="Run a single rubric element (e.g. 1.1).")
@click.option("--config", "config_path", default="config.json", show_default=True, help="Config file.")
@click.option("--markdown", "markdown_path", default=None, help="Also write a Markdown report.")
@click.option("--log-level", default=None, help="Logging level (DEBUG/INFO/WARNING).")
def cli(
    course_json: str,
    out: str,
    dry_run: bool,
    no_cache: bool,
    only_deterministic: bool,
    element: str | None,
    config_path: str,
    markdown_path: str | None,
    log_level: str | None,
):
    """Analyze a Canvas course object JSON against the CVC Online Course Design Rubric."""
    cfg = _load_config(config_path)
    _setup_logging(log_level, cfg)

    console.print(f"\n[bold blue]CVC Rubric Analysis Engine[/bold blue]")
    console.print(f"Course file : {course_json}")
    console.print(f"Output      : {out}")
    if dry_run:
        console.print("[yellow]Mode        : DRY RUN (no LLM calls)[/yellow]")
    elif only_deterministic:
        console.print("[yellow]Mode        : Deterministic checks only[/yellow]")

    # -----------------------------------------------------------------------
    # Load course object
    # -----------------------------------------------------------------------
    try:
        course, warnings = load_course_object(course_json)
    except (FileNotFoundError, ValueError) as e:
        console.print(f"[red]Failed to load course object: {e}[/red]")
        sys.exit(1)

    for w in warnings:
        console.print(f"[yellow]  ⚠ {w}[/yellow]")

    course_title = course.get_title()
    console.print(f"Course      : {course_title}\n")

    start_time = time.monotonic()

    # -----------------------------------------------------------------------
    # Deterministic checks
    # -----------------------------------------------------------------------
    accessibility_findings = []
    if not element:  # skip if targeting a single rubric element
        console.print("[bold]Running deterministic accessibility checks...[/bold]")
        try:
            from cvc_rubric.checks.deterministic import run_all
            accessibility_findings = run_all(course)
            errors_count = sum(1 for f in accessibility_findings if f.severity == "error")
            warnings_count = sum(1 for f in accessibility_findings if f.severity == "warning")
            console.print(
                f"  Found [red]{errors_count} errors[/red], "
                f"[yellow]{warnings_count} warnings[/yellow]"
            )
        except Exception as e:
            console.print(f"[red]Deterministic checks failed: {e}[/red]")

    rubric_findings = []
    report_errors = []

    # -----------------------------------------------------------------------
    # Semantic checks
    # -----------------------------------------------------------------------
    if not only_deterministic:
        from cvc_rubric.llm_client import BedrockLLMClient, ResponseCache
        from cvc_rubric.semantic_checker import SemanticChecker, load_rubric

        rubric_path = cfg.get("rubric_path", "src/cvc_rubric/rubric.json")
        try:
            rubric = load_rubric(rubric_path)
        except FileNotFoundError as e:
            console.print(f"[red]{e}[/red]")
            sys.exit(1)

        cache = ResponseCache(
            cache_dir=cfg.get("cache_dir", ".cache"),
            enabled=not no_cache,
        )
        llm_client = BedrockLLMClient(
            model_id=cfg.get("model_id", "anthropic.claude-3-5-sonnet-20241022-v2:0"),
            aws_region=cfg.get("aws_region", "us-west-2"),
            cache=cache,
            max_retries=cfg.get("max_retries", 3),
            retry_base_delay=float(cfg.get("retry_base_delay_seconds", 2.0)),
            prompt_version=cfg.get("prompt_version", "2027.06.1"),
        )
        checker = SemanticChecker(
            rubric=rubric,
            llm_client=llm_client,
            token_budget=int(cfg.get("token_budget", 6000)),
            concurrency=int(cfg.get("concurrency", 5)),
            only_element=element,
        )

        if dry_run:
            checker.dry_run(course)
            console.print("[green]Dry run complete.[/green]")
            return

        console.print("[bold]Running semantic rubric checks...[/bold]")
        rubric_findings, report_errors = checker.run(course)

        # Print quick summary
        _print_rubric_summary(rubric_findings)

    # -----------------------------------------------------------------------
    # Build and write report
    # -----------------------------------------------------------------------
    from cvc_rubric.report_builder import build_report, write_json, write_markdown

    rubric_version = "2027.06"
    prompt_version = cfg.get("prompt_version", "2027.06.1")
    if not only_deterministic and rubric_findings:
        try:
            rubric_version = load_rubric(  # type: ignore[assignment]
                cfg.get("rubric_path", "src/cvc_rubric/rubric.json")
            ).get("version", rubric_version)
        except Exception:
            pass

    duration = time.monotonic() - start_time
    report = build_report(
        course_title=course_title,
        rubric_version=rubric_version,
        prompt_version=prompt_version,
        duration_seconds=duration,
        rubric_findings=rubric_findings,
        accessibility_findings=accessibility_findings,
        errors=report_errors,
    )

    write_json(report, out)
    console.print(f"\n[green]✓ JSON report written to {out}[/green]")

    if markdown_path:
        write_markdown(report, markdown_path)
        console.print(f"[green]✓ Markdown report written to {markdown_path}[/green]")

    console.print(f"\nCompleted in {duration:.1f}s\n")


def _print_rubric_summary(findings: list) -> None:
    from rich.table import Table
    table = Table(title="Rubric Results", show_header=True, header_style="bold")
    table.add_column("Element", style="dim", width=8)
    table.add_column("Title", width=35)
    table.add_column("Rating", width=14)
    table.add_column("Confidence", justify="right", width=10)

    rating_styles = {
        "exceptional": "bold green",
        "aligned": "green",
        "approaching": "yellow",
        "incomplete": "red",
        "not_evaluable": "dim",
    }
    for f in findings:
        style = rating_styles.get(f.rating, "")
        table.add_row(
            f.element_id,
            f.element_title[:34],
            f.rating,
            f"{f.confidence:.0%}",
            style=style,
        )
    console.print(table)


# ---------------------------------------------------------------------------
# parse command
# ---------------------------------------------------------------------------

@click.command(name="parse")
@click.argument("imscc_path", metavar="<course.imscc>")
@click.option("--out", default="course_object.json", show_default=True,
              help="Output course object JSON path.")
@click.option("--log-level", default=None, help="Logging level (DEBUG/INFO/WARNING).")
def parse_cmd(imscc_path: str, out: str, log_level: str | None) -> None:
    """Parse a Canvas .imscc archive into a course object JSON."""
    _setup_logging(log_level, {})

    console.print(f"\n[bold blue]CVC IMSCC Parser[/bold blue]")
    console.print(f"Input  : {imscc_path}")
    console.print(f"Output : {out}")

    try:
        from cvc_rubric.parser import parse_imscc
    except ImportError as e:
        console.print(f"[red]Parser not available: {e}[/red]")
        sys.exit(1)

    try:
        course_dict, warnings = parse_imscc(imscc_path)
    except FileNotFoundError as e:
        console.print(f"[red]{e}[/red]")
        sys.exit(1)
    except ValueError as e:
        console.print(f"[red]Parse error: {e}[/red]")
        sys.exit(1)

    for w in warnings:
        console.print(f"[yellow]  ⚠ {w}[/yellow]")

    out_path = Path(out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(course_dict, f, ensure_ascii=False, indent=2)

    title = course_dict.get("course", {}).get("title", "Unknown")
    console.print(f"\nCourse : {title}")
    console.print(
        f"  {len(course_dict.get('modules', []))} modules, "
        f"{len(course_dict.get('pages', []))} pages, "
        f"{len(course_dict.get('assignments', []))} assignments, "
        f"{len(course_dict.get('files', []))} files"
    )
    console.print(f"\n[green]✓ Course object written to {out}[/green]\n")


# ---------------------------------------------------------------------------
# audit command
# ---------------------------------------------------------------------------

@click.command(name="audit")
@click.argument("imscc_path", metavar="<course.imscc>")
@click.option("--out", default="report.json", show_default=True,
              help="Output report JSON path.")
@click.option("--keep-intermediate", is_flag=True,
              help="Keep the intermediate course object JSON on disk.")
@click.option("--intermediate", "intermediate_path", default=None,
              help="Path for the intermediate course object JSON.")
@click.option("--dry-run", is_flag=True, help="Print token estimates without calling LLM.")
@click.option("--no-cache", is_flag=True, help="Disable on-disk response cache.")
@click.option("--only-deterministic", is_flag=True,
              help="Run accessibility checks only, skip LLM.")
@click.option("--element", default=None, help="Run a single rubric element (e.g. 1.1).")
@click.option("--config", "config_path", default="config.json", show_default=True,
              help="Config file.")
@click.option("--markdown", "markdown_path", default=None,
              help="Also write a Markdown report.")
@click.option("--log-level", default=None, help="Logging level (DEBUG/INFO/WARNING).")
def audit_cmd(
    imscc_path: str,
    out: str,
    keep_intermediate: bool,
    intermediate_path: str | None,
    dry_run: bool,
    no_cache: bool,
    only_deterministic: bool,
    element: str | None,
    config_path: str,
    markdown_path: str | None,
    log_level: str | None,
) -> None:
    """Parse a Canvas .imscc archive then run the full rubric analysis."""
    cfg = _load_config(config_path)
    _setup_logging(log_level, cfg)

    console.print(f"\n[bold blue]CVC Audit Pipeline[/bold blue]")
    console.print(f"Input  : {imscc_path}")
    console.print(f"Report : {out}")

    # --- Step 1: parse ----------------------------------------------------
    try:
        from cvc_rubric.parser import parse_imscc
    except ImportError as e:
        console.print(f"[red]Parser not available: {e}[/red]")
        sys.exit(1)

    console.print("\n[bold]Step 1/2 — Parsing IMSCC...[/bold]")
    try:
        course_dict, parse_warnings = parse_imscc(imscc_path)
    except FileNotFoundError as e:
        console.print(f"[red]{e}[/red]")
        sys.exit(1)
    except ValueError as e:
        console.print(f"[red]Parse error: {e}[/red]")
        sys.exit(1)

    for w in parse_warnings:
        console.print(f"[yellow]  ⚠ {w}[/yellow]")

    title = course_dict.get("course", {}).get("title", "Unknown")
    console.print(f"  Course : {title}")

    # Write intermediate JSON — temp file unless --keep-intermediate or path given
    _tmp_handle = None
    if intermediate_path:
        inter_path = Path(intermediate_path)
        inter_path.parent.mkdir(parents=True, exist_ok=True)
        inter_str = str(inter_path)
    elif keep_intermediate:
        inter_str = str(Path(out).with_suffix("")) + "_course_object.json"
    else:
        _tmp_handle = tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        )
        inter_str = _tmp_handle.name

    try:
        if _tmp_handle:
            json.dump(course_dict, _tmp_handle, ensure_ascii=False)
            _tmp_handle.close()
        else:
            with open(inter_str, "w", encoding="utf-8") as f:
                json.dump(course_dict, f, ensure_ascii=False, indent=2)

        if keep_intermediate or intermediate_path:
            console.print(f"  Intermediate course object: {inter_str}")

        # --- Step 2: analyze --------------------------------------------
        console.print("\n[bold]Step 2/2 — Analyzing...[/bold]")

        # Reuse the analyze logic by loading from the temp file
        try:
            course, load_warnings = load_course_object(inter_str)
        except Exception as e:
            console.print(f"[red]Failed to load parsed course object: {e}[/red]")
            sys.exit(1)

        for w in load_warnings:
            console.print(f"[yellow]  ⚠ {w}[/yellow]")

        start_time = time.monotonic()

        # Deterministic checks
        accessibility_findings = []
        if not element:
            try:
                from cvc_rubric.checks.deterministic import run_all
                accessibility_findings = run_all(course)
                err_c = sum(1 for f in accessibility_findings if f.severity == "error")
                wrn_c = sum(1 for f in accessibility_findings if f.severity == "warning")
                console.print(
                    f"  Accessibility: [red]{err_c} errors[/red], "
                    f"[yellow]{wrn_c} warnings[/yellow]"
                )
            except Exception as e:
                console.print(f"[red]Deterministic checks failed: {e}[/red]")

        rubric_findings: list = []
        report_errors: list = []

        if not only_deterministic:
            from cvc_rubric.llm_client import BedrockLLMClient, ResponseCache
            from cvc_rubric.semantic_checker import SemanticChecker, load_rubric

            rubric_path = cfg.get("rubric_path", "src/cvc_rubric/rubric.json")
            try:
                rubric = load_rubric(rubric_path)
            except FileNotFoundError as e:
                console.print(f"[red]{e}[/red]")
                sys.exit(1)

            cache = ResponseCache(
                cache_dir=cfg.get("cache_dir", ".cache"),
                enabled=not no_cache,
            )
            llm_client = BedrockLLMClient(
                model_id=cfg.get("model_id", "anthropic.claude-3-5-sonnet-20241022-v2:0"),
                aws_region=cfg.get("aws_region", "us-west-2"),
                cache=cache,
                max_retries=cfg.get("max_retries", 3),
                retry_base_delay=float(cfg.get("retry_base_delay_seconds", 2.0)),
                prompt_version=cfg.get("prompt_version", "2027.06.1"),
            )
            checker = SemanticChecker(
                rubric=rubric,
                llm_client=llm_client,
                token_budget=int(cfg.get("token_budget", 6000)),
                concurrency=int(cfg.get("concurrency", 5)),
                only_element=element,
            )

            if dry_run:
                checker.dry_run(course)
                console.print("[green]Dry run complete.[/green]")
                return

            rubric_findings, report_errors = checker.run(course)
            _print_rubric_summary(rubric_findings)

        # Build and write report
        from cvc_rubric.report_builder import build_report, write_json, write_markdown

        rubric_version = "2027.06"
        prompt_version = cfg.get("prompt_version", "2027.06.1")

        duration = time.monotonic() - start_time
        report = build_report(
            course_title=course.get_title(),
            rubric_version=rubric_version,
            prompt_version=prompt_version,
            duration_seconds=duration,
            rubric_findings=rubric_findings,
            accessibility_findings=accessibility_findings,
            errors=report_errors,
        )

        write_json(report, out)
        console.print(f"\n[green]✓ Report written to {out}[/green]")

        if markdown_path:
            write_markdown(report, markdown_path)
            console.print(f"[green]✓ Markdown report written to {markdown_path}[/green]")

        console.print(f"\nCompleted in {duration:.1f}s\n")

    finally:
        # Clean up temp file unless user asked to keep it
        if _tmp_handle and not keep_intermediate:
            try:
                Path(inter_str).unlink(missing_ok=True)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _setup_logging(log_level: str | None, cfg: dict) -> None:
    effective = log_level or cfg.get("log_level", "INFO")
    logging.basicConfig(
        level=getattr(logging, effective.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


# ---------------------------------------------------------------------------
# Register all commands on the group
# ---------------------------------------------------------------------------

main.add_command(cli)           # analyze
main.add_command(parse_cmd)     # parse
main.add_command(audit_cmd)     # audit
