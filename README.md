# PawSafe - Lost-Pet Collar Tag

A tiny static site for a pet QR collar tag. No frameworks, no build tools.
Scan the tag, see the pet's profile, call the owner.

## Pages

| Page | Purpose |
| --- | --- |
| `index.html` | Quick "I'm lost" page: one big call button + WhatsApp + Viber |
| `pet.html` | Full pet profile with **Pet Information** and **Vet Details** tabs |

## How to use

1. Install the dependency:

   ```
   pip install -r requirements.txt
   ```

2. Edit `config.json` with your pet's details. Never put a home address in there -
   only a general location like "Quezon City, Philippines".

3. Build everything:

   ```
   python build.py
   ```

   This regenerates `index.html`, `pets.js` (the profile data), and the QR images.
   `pet.html`, `pet.css` and `pet.js` are hand-written - edit those directly if you
   want to change the profile page's design or behaviour.

4. Preview locally:

   ```
   python -m http.server 8000
   ```

   then open http://127.0.0.1:8000/index.html and
   http://127.0.0.1:8000/pet.html?pet=PET-00124

5. Push the folder to GitHub and enable Pages (Settings > Pages > Deploy from branch >
   main). The site goes live at `https://<username>.github.io/PawSafe/` - keep that
   value in `site_url` in `config.json`, then run `python build.py` again so the QR
   codes point at the real URLs.

6. Print `qr_pet.png` (or the SVG) at **2.5 cm or larger**, keeping the white border
   intact. Laminate it or use a weatherproof sticker before attaching it to the collar.

7. Test: scan `qr_offline.png` with your phone in **airplane mode** - it must open the
   saved contact with no internet. Then scan `qr_pet.png` online to confirm the profile
   page opens.

## Editing the pet information

There are two ways to change the details. Both edit the same `config.json`.

**A. Owner editor page (no coding).** Open `edit.html` in a browser (serve the folder
with `python -m http.server 8000` and visit `http://127.0.0.1:8000/edit.html`, or open
it on the live site). It shows every field in a form. As you type, a draft is saved in
that browser only (localStorage) so you can close and come back. Three ways to save:

1. **Save to GitHub (no downloads).** Connect the editor once with a *fine-grained
   personal access token* scoped to this repo with **Contents: Read and write**
   (the editor shows the exact steps). Click **Save to GitHub** and the new
   `config.json` is committed straight from your browser - the profile page updates
   in about a minute. Only tick "Remember" on a personal, private computer: anyone
   holding the token can change the repo, and you can revoke it anytime under
   GitHub > Settings > Developer settings > Personal access tokens.
2. **Download + upload.** Click **Download config.json**, then upload it on GitHub
   (*Add file > Upload files > Commit*). No token needed.
3. **Edit the file directly** (below).

The profile page reads `config.json` directly, so profile-text edits go live from a
commit alone - no rebuild required.

**B. Edit the file directly.** Open `config.json` in any text editor, change the values,
save, and commit (or run `python build.py` to also refresh the QR images).

Notes: the editor is a private tool and is not linked from the public profile - visitors
cannot change anything through `pet.html`, which is read-only. Drafts never leave your
browser. The quick page (`index.html`) and the QR PNGs are generated at build time, so
run `python build.py` and push when you change `site_url`, the pet photo, or anything
that should appear on the printed tag.

## QR codes

| File | Points to | Works offline? |
| --- | --- | --- |
| `qr_offline.png` / `.svg` | A vCard saved on the phone (name, phone, notes) | Yes |
| `qr_web.png` / `.svg` | `site_url` - the quick contact page | No |
| `qr_pet.png` / `.svg` | `site_url` + `pet.html?pet=<PET-ID>` - the full profile | No |
| `qr_edit.png` / `.svg` | `site_url` + `edit.html` - the **owner editor** | No |

`qr_edit.png` is for the owner only - it opens the editor page where details can be
changed. Never attach it to a collar; put `qr_pet.png` there instead. The editor itself
cannot change anything without your GitHub token.

Each pet gets its own profile URL from its unique `pet_id` in `config.json`:

```
https://fmasijr.github.io/PawSafe/pet.html?pet=PET-00124
```

So each pet's collar tag QR must encode that pet's own URL - `build.py` does this
automatically for the pet in `config.json`. If you later host several pets, give each
one a unique `pet_id` and generate a QR per pet (on a server with page routing you
could use prettier URLs like `/pet/PET-00124`; on GitHub Pages the query-string form
above is what works without a backend).

## Privacy

- Only public-safe information is shown: general location, never a full home address.
- Veterinary records are read-only on the public profile.
- All profile data currently comes from `config.json` and is clearly labelled as
  unverified sample data.

## Features that need a backend before production

- **"I Found This Pet" form delivery** - right now the form only validates and shows a
  confirmation; nothing is sent or stored. A backend (or a form/email/SMS service) is
  needed to actually notify the owner.
- **Multiple pets / owner dashboard** - `pets.js` is a generated static file; a
  database is needed to manage many pets without editing files.
- **Real notifications** (email, SMS, push) when someone reports a found pet.
- **Photo uploads** for owners.

## Files

| File | Purpose |
| --- | --- |
| `config.json` | All pet details in one place |
| `build.py` | Generates `index.html`, `pets.js` and the QR images |
| `pet.html` / `pet.css` / `pet.js` | Pet profile website (hand-written) |
| `pets.js` | Generated profile data - edit `config.json` instead |
| `index.html` | Generated quick contact page |
| `qr_offline.*` | vCard QR, works offline |
| `qr_web.*` | QR to the quick contact page |
| `qr_pet.*` | QR to the pet profile page |
