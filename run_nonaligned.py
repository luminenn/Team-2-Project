"""Run non-aligned course verification."""
import sys
sys.argv = ["cli", "analyze", 
    "reports/mastershell-engl2044-nonaligned-export.json",
    "--out", "nonaligned-verification.json",
    "--no-cache", "--config", "config.json"]
from cvc_rubric.cli import main
main(standalone_mode=False)
