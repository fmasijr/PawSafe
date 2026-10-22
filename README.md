# PawSafe - Lost-Pet Collar Tag

A tiny static page plus two QR codes for your pet's collar tag. No frameworks, no build tools.

## How to use

1. Install the dependency:

   ```
   pip install -r requirements.txt
   ```

2. Edit `config.json` with your pet's details. Never put a home address in there - the
   tag should only route finders to a phone call.

3. Build everything:

   ```
   python build.py
   ```

4. Preview `index.html` in a browser (resize to a phone width, and try your OS dark mode).

5. Push the folder to GitHub and enable Pages (Settings > Pages > Deploy from branch > main).
   Update `site_url` in `config.json` to your real Pages URL, then run `python build.py` again
   so `qr_web.png` points at the live page.

6. Print `qr_offline.png` (or the SVG) at **2.5 cm or larger**, keeping the white border
   intact. Laminate it or use a weatherproof sticker before attaching it to the collar.

7. Test: scan `qr_offline.png` with your phone in **airplane mode**. It must open the saved
   contact details with no internet. Then scan `qr_web.png` online to confirm the page link.

## Files

| File | Purpose |
| --- | --- |
| `config.json` | All details in one place |
| `build.py` | Generates everything below |
| `index.html` | Mobile page with call / WhatsApp / Viber buttons |
| `qr_offline.png` / `.svg` | vCard QR, works offline |
| `qr_web.png` / `.svg` | QR to the online page |
