#!/usr/bin/env python3
"""Keep a truthful "Updated <date>" line (and schema.org dateModified) on content pages.

The date is the last day the page's visible wording changed. Header, menu,
footer, styles and scripts are ignored, so a sitewide menu tweak does not
re-date every page.

  python3 scripts/stamp_updated.py --init      # date every in-scope page from git history
  python3 scripts/stamp_updated.py PATH...     # re-stamp these pages: today (Central time) if
                                               # their wording differs from HEAD, else keep HEAD's date

The pre-commit hook runs the second form on staged pages; the out-of-repo page
generators run it on the pages they write, so regenerating unchanged pages
leaves them byte-identical.

Blog posts are deliberately out of scope (they carry their own publish date).
"""
import datetime
import glob
import html
import os
import re
import subprocess
import sys
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://www.powerdoneright.com"

SCOPE_GLOBS = [
    "electricity/*.html", "electricity/texas/*.html", "natural-gas/*.html", "industries/*.html",
    "electricity.html", "natural-gas.html", "how-much-electricity-does-my-business-use.html",
    "renewal-guide.html", "demand-management.html", "renewable-plans.html",
]

STAMP_P = re.compile(r'\n?\s*<p class="pg-updated">.*?</p>', re.S)
STAMP_LD = re.compile(r'\n?<script type="application/ld\+json" id="pdr-updated">.*?</script>', re.S)


def git(*args, check=True):
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    if check and r.returncode:
        raise SystemExit(r.stderr)
    return r.stdout if r.returncode == 0 else None


def in_scope():
    out = set()
    for g in SCOPE_GLOBS:
        out.update(os.path.relpath(p, ROOT) for p in glob.glob(os.path.join(ROOT, g)))
    return sorted(out)


def wording(s):
    """Visible page wording, minus site chrome and the stamp itself."""
    s = STAMP_LD.sub("", STAMP_P.sub("", s))
    s = re.sub(r"<head\b.*?</head>", " ", s, flags=re.S | re.I)
    s = re.sub(r'<div class="hx-util">.*?(?=<header)', " ", s, flags=re.S)
    for tag in ("header", "footer", "script", "style", "svg", "noscript"):
        s = re.sub(rf"<{tag}\b.*?</{tag}>", " ", s, flags=re.S | re.I)
    s = re.sub(r'<nav class="mob-menu".*?</nav>', " ", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def stamped_date(s):
    m = re.search(r'<p class="pg-updated">Updated <time datetime="(\d{4}-\d{2}-\d{2})">', s or "")
    return m.group(1) if m else None


def history_date(path):
    """Date of the last commit that changed the page's wording."""
    shas = git("log", "--format=%H %cs", "--", path).split("\n")
    shas = [x.split() for x in shas if x]
    for i, (sha, day) in enumerate(shas):
        cur = git("show", f"{sha}:{path}", check=False)
        prev = git("show", f"{sha}^:{path}", check=False) if i + 1 <= len(shas) else None
        if prev is None or wording(cur) != wording(prev):
            return day
    return shas[-1][1] if shas else today()


def today():
    return datetime.datetime.now(ZoneInfo("America/Chicago")).date().isoformat()


def apply(s, day, path):
    s = STAMP_LD.sub("", STAMP_P.sub("", s))
    d = datetime.date.fromisoformat(day)
    label = f"{d:%B} {d.day}, {d.year}"
    p = f'\n      <p class="pg-updated">Updated <time datetime="{day}">{label}</time></p>'
    m = re.search(r'<h1[^>]*>.*?</h1>\s*<p class="(?:lede|hero-sub)"[^>]*>.*?</p>', s, re.S)
    if not m:
        raise SystemExit(f"{path}: no hero lede found to place the Updated line after")
    s = s[: m.end()] + p + s[m.end():]
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', s)
    url = canon.group(1) if canon else BASE + "/" + path[:-5]
    ld = ('<script type="application/ld+json" id="pdr-updated">'
          f'{{"@context":"https://schema.org","@type":"WebPage","url":"{url}","dateModified":"{day}"}}</script>')
    s = re.sub(r"\s*</head>", "\n</head>", s, count=1)  # normalise, so re-stamping is idempotent
    i = s.index("</head>")
    return s[:i] + ld + "\n" + s[i:]


def write(path, day):
    full = os.path.join(ROOT, path)
    s = open(full, encoding="utf-8").read()
    new = apply(s, day, path)
    if new != s:
        open(full, "w", encoding="utf-8").write(new)
        return True
    return False


def main(argv):
    scope = set(in_scope())
    if argv == ["--init"]:
        for path in sorted(scope):
            day = history_date(path)
            print(day, path, "(changed)" if write(path, day) else "")
        return
    for raw in argv:
        path = os.path.relpath(os.path.abspath(raw), ROOT)
        if path not in scope:
            continue
        cur = open(os.path.join(ROOT, path), encoding="utf-8").read()
        head = git("show", f"HEAD:{path}", check=False)
        if head is None or wording(cur) != wording(head):
            day = today()
        else:
            day = stamped_date(head) or history_date(path)
        if write(path, day):
            print("stamped", day, path)


if __name__ == "__main__":
    main(sys.argv[1:])
