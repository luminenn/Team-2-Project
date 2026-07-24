"""Run aligned course verification."""
import sys
sys.argv = ["cli", "analyze", 
    "reports/aligned-introduction-to-public-speaking-export.json",
    "--out", "aligned-verification.json",
    "--no-cache", "--config", "config.json"]
from cvc_rubric.cli import main
main(standalone_mode=False)
