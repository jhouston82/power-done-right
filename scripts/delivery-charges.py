#!/usr/bin/env python3
"""Render the Texas utility delivery-charge tables into the Texas pages.

Every figure below is copied from the utility's own PUCT-approved Tariff for
Retail Delivery Service; each entry names its sheet and effective date. When a
utility revises a charge (TCRF/DCRF typically move in March and September),
edit DATA and CHECKED here and run:

    python3 scripts/delivery-charges.py

The script rewrites everything between <!-- TDU:... --> and <!-- /TDU --> in
the pages listed in PAGES. The ten DFW suburb pages are built from dallas.html
by ~/Claude/pdr-dfw-cities-generator.py, so after running this, re-run that
generator too (it copies the Dallas block and swaps the city name).
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECKED = "November 21, 2026"

# kind: 'kwh' = per kWh, 'kw' = per kW (or kVA), 'mo' = per month
DATA = {
    "oncor": {
        "name": "Oncor",
        "unit": "kW",
        "tariff_url": "https://www.oncor.com/content/oncorwww/us/en/home/about-us/regulatory/tariffs-rate-schedules.html",
        "tariff": "Oncor Electric Delivery, Tariff for Retail Delivery Service",
        "sheets": "sheets 1.2, 1.3, 5.1 and 6.1–6.7 (effective June 1 – October 4, 2026)",
        "small_label": "Peak demand of 10 kW or less",
        "small": [
            ("Customer charge", 2.34, "mo", "Sheet 1.2, June 1, 2026"),
            ("Metering charge", 4.36, "mo", "Sheet 1.2, June 1, 2026"),
            ("Distribution system charge", 0.031236, "kwh", "Sheet 1.2, June 1, 2026"),
            ("Transmission cost recovery (TCRF)", 0.013382, "kwh", "Sheet 6.1, Oct. 4, 2026"),
            ("Distribution cost recovery (DCRF)", 0.006208, "kwh", "Sheet 6.4, Oct. 4, 2026"),
            ("Interim surcharge (Rider IS, through Dec. 2026)", 0.002878, "kwh", "Sheet 6.7, Aug. 1, 2026"),
            ("Rate case expense (RCE)", 0.000084, "kwh", "Sheet 6.5, June 1, 2026"),
            ("Energy efficiency (EECRF)", 0.000055, "kwh", "Sheet 6.3, Mar. 1, 2026"),
            ("Nuclear decommissioning (NDC)", 0.0, "kwh", "Sheet 5.1, Dec. 15, 2025"),
        ],
        "large_label": "Peak demand above 10 kW",
        "large": [
            ("Customer charge", 24.00, "mo", "Sheet 1.3, June 1, 2026"),
            ("Metering charge", 20.99, "mo", "Sheet 1.3, June 1, 2026"),
            ("Distribution system charge*", 6.931363, "kw", "Sheet 1.3, June 1, 2026"),
            ("Transmission cost recovery (TCRF)**", 4.606104, "kw", "Sheet 6.1, Oct. 4, 2026"),
            ("Distribution cost recovery (DCRF)", 1.068522, "kw", "Sheet 6.4, Oct. 4, 2026"),
            ("Interim surcharge (Rider IS, through Dec. 2026)", 0.997891, "kw", "Sheet 6.7, Aug. 1, 2026"),
            ("Rate case expense (RCE)", 0.016827, "kw", "Sheet 6.5, June 1, 2026"),
            ("Energy efficiency (EECRF)", 0.000546, "kwh", "Sheet 6.3, Mar. 1, 2026"),
            ("Nuclear decommissioning (NDC)", 0.0, "kw", "Sheet 5.1, Dec. 15, 2025"),
        ],
        "notes": [
            "* $6.931363 per kW applies to sites at or under 20 kW and to larger sites with an annual load factor above 25%. Sites over 20 kW with a load factor of 25% or less pay $8.318122–$9.831092 per kW, depending on load factor.",
            "** Charged per kW of the month’s peak demand. Sites that have reached 700 kW pay $6.536625 per kW of 4CP demand instead — their average demand during the four ERCOT summer peaks.",
            "For sites above 10 kW, the distribution charge for most loads over 20 kW, and the DCRF, RCE and interim surcharge, are billed on the higher of this month’s peak or 80% of the highest peak in the prior 11 months (the 80% ratchet).",
            "Not shown: the Mobile Generation rider, billed once a year on December bills ($0.000606 per kWh at 10 kW or less; $0.156662 per kW above 10 kW).",
        ],
    },
    "centerpoint": {
        "name": "CenterPoint Energy",
        "unit": "kVA",
        "tariff_url": "https://www.centerpointenergy.com/en-us/our-services/rates-tariffs/houston-electric",
        "tariff": "CenterPoint Energy Houston Electric, Tariff for Retail Delivery Service",
        "sheets": "sheets 6.2, 6.3 and the riders they cite (effective April 28, 2025 – September 30, 2026)",
        "small_label": "Peak demand of 10 kVA or less",
        "small": [
            ("Customer charge", 2.01, "mo", "Sheet 6.2, Feb. 26, 2026"),
            ("Metering charge", 2.95, "mo", "Sheet 6.2, Feb. 26, 2026"),
            ("Distribution system charge", 0.017893, "kwh", "Sheet 6.2, Feb. 26, 2026"),
            ("Transmission cost recovery (TCRF)", 0.011506, "kwh", "Rider TCRF, Sept. 1, 2026"),
            ("Distribution cost recovery (DCRF)", 0.005490, "kwh", "Rider DCRF, Sept. 30, 2026"),
            ("Energy efficiency (EECRF)", 0.004970, "kwh", "Rider EECRF, Mar. 1, 2026"),
            ("System restoration (SRC II and III)", 0.000627 + 0.002842, "kwh", "Schedules SRC II, Sept. 1, 2026 and SRC III, Feb. 26, 2026"),
            ("Tax credits (ADFIT II and III)", -0.000023 - 0.000417, "kwh", "Riders ADFITC II, Sept. 1, 2026 and III, Feb. 26, 2026"),
            ("Emergency generation facilities (TEEEF)", 0.000378, "kwh", "Rider TEEEF, Aug. 15, 2026"),
            ("Rate case expense (RCE)", 0.000040, "kwh", "Rider RCE, Apr. 28, 2025"),
            ("Nuclear decommissioning (NDC)", 0.000006, "kwh", "Rider NDC, Apr. 28, 2025"),
        ],
        "large_label": "Peak demand above 10 kVA (under 700 kVA)",
        "large": [
            ("Customer charge", 4.14, "mo", "Sheet 6.3, Feb. 26, 2026"),
            ("Metering charge", 9.27, "mo", "Sheet 6.3, Feb. 26, 2026"),
            ("Distribution system charge", 4.893378, "kw", "Sheet 6.3, Feb. 26, 2026"),
            ("Transmission cost recovery (TCRF)*", 4.342591, "kw", "Rider TCRF, Sept. 1, 2026"),
            ("Distribution cost recovery (DCRF)", 1.008963, "kw", "Rider DCRF, Sept. 30, 2026"),
            ("System restoration (SRC II and III)", 0.110774 + 0.495587, "kw", "Schedules SRC II, Sept. 1, 2026 and SRC III, Feb. 26, 2026"),
            ("Tax credits (ADFIT II and III)", -0.003930 - 0.072680, "kw", "Riders ADFITC II, Sept. 1, 2026 and III, Feb. 26, 2026"),
            ("Emergency generation facilities (TEEEF)", 0.133331, "kw", "Rider TEEEF, Aug. 15, 2026"),
            ("Rate case expense (RCE)", 0.008707, "kw", "Rider RCE, Apr. 28, 2025"),
            ("Nuclear decommissioning (NDC)", 0.001460, "kw", "Rider NDC, Apr. 28, 2025"),
            ("Energy efficiency (EECRF)", 0.000930, "kwh", "Rider EECRF, Mar. 1, 2026"),
        ],
        "notes": [
            "CenterPoint bills demand in kVA. Demand charges use this month’s peak — CenterPoint’s schedule has no 80% ratchet.",
            "* Sites that have reached 700 kVA are billed on interval-meter rates instead: a $64.72 customer charge, $86.69 metering charge, and TCRF of $6.177655 per kVA of 4CP demand.",
        ],
    },
    "aep-central": {
        "name": "AEP Texas",
        "unit": "kW",
        "tariff_url": "https://www.aeptexas.com/company/about/rates/",
        "tariff": "AEP Texas, Tariff for Electric Delivery Service (Central Division)",
        "sheets": "rate schedules 6.1.1.1.2–6.1.1.1.3 and riders 6.1.1.3–6.1.1.4.10 (effective May 30, 2024 – September 29, 2026)",
        "small_label": "Peak demand of 10 kW or less",
        "small": [
            ("Customer charge", 1.45, "mo", "6.1.1.1.2, Oct. 1, 2024"),
            ("Metering charge", 4.21, "mo", "6.1.1.1.2, Oct. 1, 2024"),
            ("Distribution system charge", 0.026454, "kwh", "6.1.1.1.2, Oct. 1, 2024"),
            ("Transmission cost recovery (TCRF)", 0.009298, "kwh", "Rider TCRF, Sept. 29, 2026"),
            ("Distribution cost recovery (DCRF)", 0.005594, "kwh", "Rider DCRF, Sept. 29, 2026"),
            ("System restoration (SRC)", 0.001515, "kwh", "Rider SRC, Aug. 28, 2026"),
            ("Energy efficiency (EECRF)", 0.000810, "kwh", "Rider EECRF, Mar. 1, 2026"),
            ("Mobile emergency generation (TEEE)", 0.00063, "kwh", "Rider Mobile TEEE, Sept. 1, 2026"),
            ("Nuclear decommissioning (NDC)", 0.000174, "kwh", "Rider NDC, May 30, 2024"),
            ("Tax credit (ADFIT)", -0.000083, "kwh", "Rider ADFIT, Aug. 28, 2026"),
        ],
        "large_label": "Peak demand above 10 kW",
        "large": [
            ("Customer charge", 2.28, "mo", "6.1.1.1.3, Oct. 1, 2024"),
            ("Metering charge", 19.72, "mo", "6.1.1.1.3, Oct. 1, 2024"),
            ("Distribution system charge", 7.148, "kw", "6.1.1.1.3, Oct. 1, 2024"),
            ("Transmission cost recovery (TCRF)*", 4.139791, "kw", "Rider TCRF, Sept. 29, 2026"),
            ("Distribution cost recovery (DCRF)", 0.735577, "kw", "Rider DCRF, Sept. 29, 2026"),
            ("System restoration (SRC)**", 0.347697, "kw", "Rider SRC, Aug. 28, 2026"),
            ("Mobile emergency generation (TEEE)", 0.17253, "kw", "Rider Mobile TEEE, Sept. 1, 2026"),
            ("Nuclear decommissioning (NDC)**", 0.046998, "kw", "Rider NDC, May 30, 2024"),
            ("Tax credit (ADFIT)**", -0.016619, "kw", "Rider ADFIT, Aug. 28, 2026"),
            ("Energy efficiency (EECRF)", 0.000743, "kwh", "Rider EECRF, Mar. 1, 2026"),
        ],
        "notes": [
            "* Charged per kW of the month’s peak demand. Sites that have reached 700 kW pay $6.232736 per kW of 4CP demand instead.",
            "** Billed on the higher of this month’s peak or 80% of the highest peak in the prior 11 months (the 80% ratchet).",
            "The income tax refund, regulatory asset recovery, rate case expense and transition charge (TC-3) refund riders are all $0 for these classes. The TC-3 bonds have been paid off.",
        ],
    },
}

PAGES = {
    "electricity/texas/dallas.html": ("oncor", "Dallas"),
    "electricity/texas/fort-worth.html": ("oncor", "Fort Worth"),
    "electricity/texas/houston.html": ("centerpoint", "Houston"),
    "electricity/texas/corpus-christi.html": ("aep-central", "Corpus Christi"),
    "electricity/texas.html": ("summary", None),
}


def money(v, kind):
    if kind == "mo":
        return f"${v:,.2f} / month"
    if kind == "kwh":
        return f"{v * 100:.4f}¢ / kWh".replace("-", "−")
    s = f"{abs(v):.6f}".rstrip("0")
    s = s + "0" * max(0, 2 - len(s.split(".")[1]))  # tariff precision, at least cents
    return ("−$" if v < 0 else "$") + s


def totals(rows):
    mo = sum(v for _, v, k, _ in rows if k == "mo")
    kwh = sum(v for _, v, k, _ in rows if k == "kwh")
    kw = sum(v for _, v, k, _ in rows if k == "kw")
    return mo, kwh, kw


def table(rows, unit, caption, total_line):
    out = [f'<table class="tdu-table"><caption>{caption}</caption>',
           '<thead><tr><th scope="col">Charge</th><th scope="col">Rate</th><th scope="col">Tariff source</th></tr></thead><tbody>']
    for label, v, kind, src in rows:
        rate = money(v, kind) if kind != "kw" else money(v, kind) + f" / {unit}"
        out.append(f'<tr><td>{label}</td><td class="num">{rate}</td><td class="src">{src}</td></tr>')
    out.append(f'</tbody><tfoot><tr><th scope="row">Total</th><td class="num" colspan="2">{total_line}</td></tr></tfoot></table>')
    return "".join(out)


def city_block(key, city):
    d = DATA[key]
    n, u = d["name"], d["unit"]
    smo, skwh, _ = totals(d["small"])
    lmo, lkwh, lkw = totals(d["large"])
    ex_kwh = 2000
    ex = smo + ex_kwh * skwh
    small_total = f"${smo:,.2f} / month + {skwh * 100:.4f}¢ / kWh"
    large_total = f"${lmo:,.2f} / month + ${lkw:.6f} / {u} of demand + {lkwh * 100:.4f}¢ / kWh"
    notes = "".join(f"<li>{x}</li>" for x in d["notes"])
    return f"""<section class="section tdu" id="delivery-charges">
  <div class="wrap">
    <div class="shead reveal">
      <span class="eyebrow">{city} delivery charges</span>
      <h2>What {n} charges to deliver <span class="ed">your power.</span></h2>
    </div>
    <div class="prose reveal">
      <p>Every {city} business served by {n} pays the same regulated delivery charges, whichever supplier it picks. They are set by {n}’s tariff, approved by the Public Utility Commission of Texas, and they sit on your bill next to the supply price you negotiate. Comparing offers only works when you know which part of the bill is which.</p>
      <div class="tdu-key">
        <div><span class="k">Small business ({d['small_label'][0].lower() + d['small_label'][1:]})</span><b>${smo:,.2f}</b> a month + <b>{skwh * 100:.2f}¢</b> per kWh</div>
        <div><span class="k">Example: 2,000 kWh in a month</span><b>${ex:,.2f}</b> in delivery charges, before supply and taxes</div>
      </div>
      {table(d['small'], u, d['small_label'], small_total)}
      {table(d['large'], u, d['large_label'], large_total)}
      <ul class="tdu-notes">{notes}</ul>
      <p class="tdu-source">Source: <a href="{d['tariff_url']}" rel="noopener">{d['tariff']}</a>, {d['sheets']}. Checked {CHECKED}. Delivery charges only — your supplier’s energy price, taxes and any one-off utility fees are separate. Totals add the rows above; rates are rounded only for display.</p>
    </div>
  </div>
</section>"""


def summary_block():
    rows = []
    links = {"oncor": ("Dallas–Fort Worth", "/electricity/texas/dallas"),
             "centerpoint": ("Houston", "/electricity/texas/houston"),
             "aep-central": ("Corpus Christi", "/electricity/texas/corpus-christi")}
    for key, (area, href) in links.items():
        d = DATA[key]
        smo, skwh, _ = totals(d["small"])
        lmo, lkwh, lkw = totals(d["large"])
        rows.append(f'<tr><td><a href="{href}#delivery-charges">{d["name"]}</a><br><span class="src">{area}</span></td>'
                    f'<td class="num">${smo:,.2f} / mo<br>+ {skwh * 100:.2f}¢ / kWh</td>'
                    f'<td class="num">${lmo:,.2f} / mo<br>+ ${lkw:.2f} / {d["unit"]}<br>+ {lkwh * 100:.4f}¢ / kWh</td></tr>')
    return f"""<section class="section tdu" id="delivery-charges">
  <div class="wrap">
    <div class="shead reveal">
      <span class="eyebrow">Delivery charges by utility</span>
      <h2>The regulated part of the bill, <span class="ed">in numbers.</span></h2>
    </div>
    <div class="prose reveal">
      <p>Delivery charges are set by each utility’s tariff and are the same whichever supplier you choose. Here is what the three largest utilities serving our Texas city pages charge business accounts today. Each city page itemizes every charge with its tariff source.</p>
      <table class="tdu-table"><caption>Business delivery charges, before supply and taxes</caption>
      <thead><tr><th scope="col">Utility</th><th scope="col">Peak demand of 10 kW or less</th><th scope="col">Peak demand above 10 kW</th></tr></thead>
      <tbody>{''.join(rows)}</tbody></table>
      <p class="tdu-source">Sources: the Oncor, CenterPoint Energy Houston Electric and AEP Texas (Central Division) Tariffs for Retail Delivery Service. Checked {CHECKED}. Demand charges are per kW (CenterPoint: per kVA) of monthly peak demand before any ratchet, for sites under 700 kW. TNMP, AEP Texas North and Lubbock Power &amp; Light have their own tariffs, not shown here.</p>
    </div>
  </div>
</section>"""


def main():
    for path, (key, city) in PAGES.items():
        full = os.path.join(ROOT, path)
        s = open(full, encoding="utf-8").read()
        block = summary_block() if key == "summary" else city_block(key, city)
        marked = f"<!-- TDU:{key} -->\n{block}\n<!-- /TDU -->"
        new, n = re.subn(r"<!-- TDU:[a-z-]+ -->.*?<!-- /TDU -->", lambda m: marked, s, flags=re.S)
        if n != 1:
            raise SystemExit(f"{path}: expected one TDU marker block, found {n}")
        if new != s:
            open(full, "w", encoding="utf-8").write(new)
            print("updated", path)


if __name__ == "__main__":
    main()
