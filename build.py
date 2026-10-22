#!/usr/bin/env python3
"""Build the lost-pet collar tag page and QR codes from config.json.

Usage:
    pip install -r requirements.txt
    python build.py

Outputs (in this folder):
    index.html       mobile-friendly "found my pet" page
    qr_offline.png   vCard QR, works with no internet
    qr_web.png       QR for the online page
    qr_offline.svg   vector version for engravers
    qr_web.svg       vector version for engravers
"""

import html
import json
import re
import sys
from pathlib import Path

import qrcode
from qrcode.image.svg import SvgImage

BASE_DIR = Path(__file__).resolve().parent
CONFIG_FILE = BASE_DIR / "config.json"

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{PET_NAME}} - if found, please contact my owner</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f5f6f8;
    --card: #ffffff;
    --text: #1c1e21;
    --muted: #5b6167;
    --accent: #1a7f4b;
    --accent-text: #ffffff;
    --border: #e2e5e9;
    --whatsapp: #25d366;
    --viber: #7360f2;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #14161a;
      --card: #1e2126;
      --text: #f1f3f5;
      --muted: #a9b0b8;
      --accent: #2ea86a;
      --accent-text: #ffffff;
      --border: #30343b;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 16px;
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
  }
  main {
    max-width: 480px;
    margin: 0 auto;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .photo {
    width: 140px;
    height: 140px;
    margin: 0 auto 12px;
    border-radius: 50%;
    overflow: hidden;
    background: var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 64px;
    line-height: 1;
  }
  .photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  h1 {
    margin: 0 0 4px;
    font-size: 32px;
    text-align: center;
  }
  .tagline {
    margin: 0 0 16px;
    text-align: center;
    color: var(--muted);
    font-size: 18px;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  a.button {
    display: block;
    padding: 14px 16px;
    border-radius: 12px;
    text-align: center;
    text-decoration: none;
    font-size: 18px;
    font-weight: 600;
    color: var(--accent-text);
  }
  a.call { background: var(--accent); }
  a.whatsapp { background: var(--whatsapp); color: #07321a; }
  a.viber { background: var(--viber); }
  h2 {
    margin: 0 0 10px;
    font-size: 20px;
  }
  dl {
    margin: 0;
  }
  dt {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    margin-top: 10px;
  }
  dt:first-child { margin-top: 0; }
  dd {
    margin: 2px 0 0;
    font-size: 17px;
    word-break: break-word;
  }
  footer {
    text-align: center;
    color: var(--muted);
    font-size: 14px;
    padding: 0 0 16px;
  }
</style>
</head>
<body>
<main>
  <div class="card">
    {{PHOTO}}
    <h1>{{PET_NAME}}</h1>
    <p class="tagline">I'm lost, please call my owner!</p>
    <div class="actions">
      <a class="button call" href="tel:{{PHONE}}">Call {{OWNER_NAME}}</a>
      <a class="button whatsapp" href="https://wa.me/{{PHONE_DIGITS}}">WhatsApp</a>
      <a class="button viber" href="viber://chat?number={{PHONE_VIBER}}">Viber</a>
    </div>
  </div>
{{GOOD_TO_KNOW}}  <footer>Scan the tag's offline QR for full details. No internet needed.</footer>
</main>
</body>
</html>
"""


def fail(message):
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def load_config():
    if not CONFIG_FILE.exists():
        fail(f"{CONFIG_FILE.name} not found next to build.py")
    try:
        config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"{CONFIG_FILE.name} is not valid JSON: {exc}")

    phone = str(config.get("phone", "")).strip()
    if not re.fullmatch(r"\+\d+", phone):
        fail(
            "phone must start with '+' followed by digits only, "
            f"for example +639171234567 (got: {phone!r})"
        )
    config["phone"] = phone
    config["phone_digits"] = phone.lstrip("+")
    config["phone_viber"] = "%2B" + config["phone_digits"]
    return config


def esc(value):
    """HTML-escape a config value; empty stays empty."""
    return html.escape(str(value or "").strip(), quote=True)


def photo_markup():
    photo = BASE_DIR / "pet.jpg"
    if photo.exists():
        return '<div class="photo"><img src="pet.jpg" alt="Photo of {{PET_NAME}}"></div>'
    return '<div class="photo" role="img" aria-label="Pet photo placeholder">\U0001F43E</div>'


def good_to_know_block(cfg):
    rows = [
        ("Owner name", cfg.get("owner_name")),
        ("Medical", cfg.get("medical")),
        ("Microchip", cfg.get("microchip")),
        ("Notes", cfg.get("notes")),
    ]
    items = [esc(value) for _, value in rows if str(value or "").strip()]
    if not items:
        return ""
    body = "\n".join(f"    <dd>{item}</dd>" for item in items)
    return (
        '  <div class="card">\n'
        "    <h2>Good to know</h2>\n"
        "    <dl>\n"
        f"{body}\n"
        "    </dl>\n"
        "  </div>\n"
    )


def build_html(cfg):
    page = (
        PAGE_TEMPLATE.replace("{{PHOTO}}", photo_markup())
        .replace("{{PET_NAME}}", esc(cfg.get("pet_name")))
        .replace("{{OWNER_NAME}}", esc(cfg.get("owner_name")))
        .replace("{{PHONE}}", cfg["phone_digits"])
        .replace("{{PHONE_DIGITS}}", cfg["phone_digits"])
        .replace("{{PHONE_VIBER}}", cfg["phone_viber"])
        .replace("{{GOOD_TO_KNOW}}", good_to_know_block(cfg))
    )
    out = BASE_DIR / "index.html"
    out.write_text(page, encoding="utf-8")
    return out


def vcard(cfg):
    notes = "; ".join(
        str(cfg.get(key, "")).strip()
        for key in ("medical", "microchip", "notes")
        if str(cfg.get(key, "")).strip()
    )
    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f'FN:"LOST PET - {str(cfg.get("pet_name", "")).strip()}"',
        f'ORG:"Owner: {str(cfg.get("owner_name", "")).strip()}"',
        f"TEL;TYPE=CELL:{cfg['phone']}",
    ]
    if notes:
        lines.append(f"NOTE:{notes}")
    lines.append("END:VCARD")
    return "\n".join(lines)


def make_qr(data, png_path, svg_path):
    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=20,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    qr.make_image(fill_color="black", back_color="white").save(png_path)

    svg = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=20,
        border=4,
        image_factory=SvgImage,
    )
    svg.add_data(data)
    svg.make(fit=True)
    svg.make_image(fill_color="black", back_color="white").save(svg_path)


def main():
    cfg = load_config()

    index = build_html(cfg)

    card = vcard(cfg)
    if len(card) > 900:
        print(
            f"WARNING: vCard is {len(card)} characters (over 900). "
            "Shorten the medical/microchip/notes fields so the QR stays readable."
        )

    offline_png = BASE_DIR / "qr_offline.png"
    offline_svg = BASE_DIR / "qr_offline.svg"
    web_png = BASE_DIR / "qr_web.png"
    web_svg = BASE_DIR / "qr_web.svg"

    make_qr(card, offline_png, offline_svg)
    make_qr(str(cfg.get("site_url", "")).strip(), web_png, web_svg)

    print("Files created:")
    for path in (index, offline_png, offline_svg, web_png, web_svg):
        print(f"  {path.name}  ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
