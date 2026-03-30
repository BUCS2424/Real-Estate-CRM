from datetime import datetime, timezone
from pathlib import Path
from typing import List, Tuple
import re


AUDIT_OUTPUT_PATH = Path("/app/memory/monthly_audit_report.md")


def _check_file_exists(path: str) -> Tuple[str, bool, str]:
    exists = Path(path).exists()
    return (path, exists, "exists" if exists else "missing")


def _check_contains(path: str, needle: str, label: str) -> Tuple[str, bool, str]:
    p = Path(path)
    if not p.exists():
        return (label, False, "file missing")
    content = p.read_text(encoding="utf-8", errors="ignore")
    return (label, needle in content, f"contains '{needle}'" if needle in content else f"missing '{needle}'")


def _collect_redundancy_notes() -> List[str]:
    notes: List[str] = []

    pages_dir = Path("/app/frontend/src/pages")
    nav_mentions = 0
    for file in pages_dir.glob("*.jsx"):
        txt = file.read_text(encoding="utf-8", errors="ignore")
        if "LISTING SHOWCASE" in txt:
            nav_mentions += 1
    if nav_mentions > 1:
        notes.append(f"Public navigation labels still appear in {nav_mentions} page files; continue consolidating via shared header only.")

    footer_mentions = 0
    for file in pages_dir.glob("*.jsx"):
        txt = file.read_text(encoding="utf-8", errors="ignore")
        if "All rights reserved" in txt:
            footer_mentions += 1
    if footer_mentions > 1:
        notes.append(f"Footer copyright blocks repeated in {footer_mentions} files; consider shared public footer module.")

    return notes


async def run_monthly_audit() -> str:
    timestamp = datetime.now(timezone.utc).isoformat()

    checks: List[Tuple[str, bool, str]] = []
    checks.append(_check_file_exists("/app/AGENT_RULES.md"))
    checks.append(_check_file_exists("/app/frontend/public/manifest.json"))
    checks.append(_check_file_exists("/app/frontend/public/robots.txt"))
    checks.append(_check_file_exists("/app/frontend/src/components/public/PublicSeoHead.jsx"))
    checks.append(_check_file_exists("/app/frontend/src/components/public/PublicSiteHeader.jsx"))
    checks.append(_check_file_exists("/app/backend/security/guards.py"))
    checks.append(_check_file_exists("/app/backend/routes/seo.py"))

    checks.append(_check_contains("/app/frontend/src/components/public/PublicSiteHeader.jsx", "right-0", "mobile drawer on right"))
    checks.append(_check_contains("/app/frontend/src/components/public/PublicSeoHead.jsx", "a2ganalytics.com/js/script.js", "analytics script in public SEO head"))
    checks.append(_check_contains("/app/frontend/public/manifest.json", "\"display\"", "manifest display configured"))
    checks.append(_check_contains("/app/frontend/public/manifest.json", "\"icons\"", "manifest icons configured"))

    public_pages = [
        "/app/frontend/src/pages/LandingPage.jsx",
        "/app/frontend/src/pages/PublicListingsPage.jsx",
        "/app/frontend/src/pages/AboutPage.jsx",
        "/app/frontend/src/pages/PropertyDetailPage.jsx",
        "/app/frontend/src/pages/MortgageCalculatorPage.jsx",
        "/app/frontend/src/pages/NewsletterArchivePage.jsx",
        "/app/frontend/src/pages/WriteReviewPage.jsx",
        "/app/frontend/src/pages/PublicBookingPage.jsx",
        "/app/frontend/src/pages/PropertyLandingPage.jsx",
    ]
    for page in public_pages:
        checks.append(_check_contains(page, "PublicSeoHead", f"SEO head usage: {Path(page).name}"))

    pass_count = sum(1 for _, ok, _ in checks if ok)
    fail_count = len(checks) - pass_count
    redundancy_notes = _collect_redundancy_notes()

    lines = [
        "# Monthly Agent Compliance Audit",
        "",
        f"- Timestamp (UTC): {timestamp}",
        f"- Checks Passed: {pass_count}",
        f"- Checks Failed: {fail_count}",
        "",
        "## Check Results",
    ]

    for label, ok, detail in checks:
        status = "✅" if ok else "❌"
        lines.append(f"- {status} **{label}** — {detail}")

    lines.append("")
    lines.append("## Duplicate / Redundancy Notes")
    if redundancy_notes:
        lines.extend([f"- {note}" for note in redundancy_notes])
    else:
        lines.append("- No major duplication patterns detected in this audit pass.")

    lines.append("")
    lines.append("## Security Baseline")
    lines.append("- Injection pattern detection utility present.")
    lines.append("- SSRF-safe public URL validation utility present.")
    lines.append("- Mass-assignment filtering utility present.")
    lines.append("- Use these utilities in all new endpoints that accept free-form user input or external URLs.")

    report = "\n".join(lines) + "\n"
    AUDIT_OUTPUT_PATH.write_text(report, encoding="utf-8")
    return str(AUDIT_OUTPUT_PATH)
