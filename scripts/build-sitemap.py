#!/usr/bin/env python3
"""Rebuild sitemap.xml from the site's HTML files and their git history.

Run by the pre-commit hook (.githooks/pre-commit), so every commit ships a
sitemap whose <lastmod> dates are true:
  - a page staged in this commit gets today's date;
  - every other page keeps the date of its own last commit.
New pages are appended (monthly / 0.7); pages whose file is gone are dropped;
existing entries keep their order, changefreq and priority. A page carrying a
robots noindex meta tag is left out.
"""
import datetime
import os
import re
import subprocess
import sys

BASE = "https://www.powerdoneright.com"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITEMAP = os.path.join(ROOT, "sitemap.xml")


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout


def url_for(path):
    path = path[: -len(".html")]
    if path == "index":
        return BASE + "/"
    return BASE + "/" + path.removesuffix("/index")


def main():
    pages = {}
    for path in git("ls-files", "*.html").split():
        with open(os.path.join(ROOT, path), encoding="utf-8") as f:
            if re.search(r'<meta[^>]+name="robots"[^>]+noindex', f.read(), re.I):
                continue
        pages[url_for(path)] = path

    staged = set(git("diff", "--cached", "--name-only").split())
    today = datetime.date.today().isoformat()

    def lastmod(path):
        if path in staged:
            return today
        return git("log", "-1", "--format=%cs", "--", path).strip() or today

    existing = []
    if os.path.exists(SITEMAP):
        with open(SITEMAP, encoding="utf-8") as f:
            existing = re.findall(
                r"<loc>([^<]+)</loc>.*?<changefreq>([^<]+)</changefreq><priority>([^<]+)</priority>", f.read()
            )

    rows, seen, dropped = [], set(), []
    for loc, freq, prio in existing:
        if loc in pages:
            rows.append((loc, freq, prio))
            seen.add(loc)
        else:
            dropped.append(loc)
    added = sorted(loc for loc in pages if loc not in seen)
    rows += [(loc, "monthly", "0.7") for loc in added]

    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, freq, prio in rows:
        out.append(
            f"  <url><loc>{loc}</loc><lastmod>{lastmod(pages[loc])}</lastmod>"
            f"<changefreq>{freq}</changefreq><priority>{prio}</priority></url>"
        )
    out.append("</urlset>")
    with open(SITEMAP, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")

    for loc in added:
        print(f"sitemap: added {loc}", file=sys.stderr)
    for loc in dropped:
        print(f"sitemap: dropped {loc} (no page file)", file=sys.stderr)


if __name__ == "__main__":
    main()
