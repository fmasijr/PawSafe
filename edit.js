/* PawSafe owner editor.
   Loads config.json into a friendly form. Drafts stay in this browser
   (localStorage); the "Download config.json" button produces the file the
   owner uploads back to the repository. No backend, nothing is uploaded. */

(function () {
  "use strict";

  var CONFIG_URL = "config.json";
  var DRAFT_KEY = "pawsafe-config-draft-v1";

  /* Field schema: what the form shows, in order. "wide" spans both columns. */
  var SECTIONS = [
    {
      title: "Pet identity", icon: "\uD83D\uDC3E",
      fields: [
        { key: "pet_id", label: "Pet ID", hint: "Letters, numbers, dashes. Each pet needs its own ID." },
        { key: "pet_name", label: "Pet name" },
        { key: "badge", label: "Status badge", hint: "Shown next to the name, e.g. Friendly Pet." },
        { key: "location", label: "General location", hint: "Never a full home address, e.g. Quezon City, Philippines.", wide: true },
        { key: "photo", label: "Photo file name", hint: "Leave empty to use pet.jpg (or the paw placeholder).", wide: true }
      ]
    },
    {
      title: "About the pet", icon: "\uD83D\uDC36",
      fields: [
        { key: "species", label: "Species" },
        { key: "breed", label: "Breed" },
        { key: "age", label: "Age" },
        { key: "sex", label: "Sex" },
        { key: "color", label: "Color / distinguishing marks", wide: true }
      ]
    },
    {
      title: "Health", icon: "\uD83D\uDC9A",
      fields: [
        { key: "allergies", label: "Allergies", wide: true },
        { key: "medical", label: "Special medical needs", wide: true },
        { key: "vaccination", label: "Vaccination status", wide: true },
        { key: "microchip", label: "Microchip number" },
        { key: "notes", label: "Notes", hint: "Personality notes finders should know.", wide: true }
      ]
    },
    {
      title: "Owner contact", icon: "\u260E\uFE0F",
      fields: [
        { key: "owner_name", label: "Owner's name" },
        { key: "phone", label: "Owner's phone", hint: "Must start with +, e.g. +639171234567.", type: "tel" }
      ]
    },
    {
      title: "Veterinary details", icon: "\uD83E\uDDA0",
      fields: [
        { key: "vet.name", label: "Veterinarian" },
        { key: "vet.clinic", label: "Clinic name" },
        { key: "vet.phone", label: "Clinic phone", hint: "Must start with +, e.g. +639179998888.", type: "tel" },
        { key: "vet.address", label: "Clinic address", wide: true },
        { key: "vet.last_vaccination", label: "Last vaccination" },
        { key: "vet.next_checkup", label: "Next checkup" },
        { key: "vet.medical_history", label: "Medical history", wide: true },
        { key: "vet.medications", label: "Current medications", wide: true },
        { key: "vet.previous_treatments", label: "Previous treatments", wide: true },
        { key: "vet.notes", label: "Additional vet notes", wide: true }
      ]
    },
    {
      title: "Website", icon: "\uD83C\uDF10",
      fields: [
        { key: "site_url", label: "Site URL", hint: "Your GitHub Pages address, e.g. https://you.github.io/PawSafe/", type: "url", wide: true }
      ]
    }
  ];

  var els = {
    sections: document.getElementById("sections"),
    loadError: document.getElementById("load-error"),
    draftBanner: document.getElementById("draft-banner"),
    restoreDraft: document.getElementById("restore-draft"),
    discardDraft: document.getElementById("discard-draft"),
    downloadBtn: document.getElementById("download-btn"),
    copyBtn: document.getElementById("copy-btn"),
    resetBtn: document.getElementById("reset-btn"),
    saveError: document.getElementById("save-error"),
    saveOk: document.getElementById("save-ok"),
    jsonPreview: document.getElementById("json-preview")
  };

  var liveConfig = null; // as loaded from config.json
  var draftTimer = null;

  /* ---------- tiny helpers ---------- */

  function text(v) { return String(v == null ? "" : v); }

  function getPath(obj, key) {
    return key.split(".").reduce(function (o, k) { return o ? o[k] : ""; }, obj);
  }

  function setPath(obj, key, value) {
    var parts = key.split(".");
    var last = parts.pop();
    var target = parts.reduce(function (o, k) {
      if (typeof o[k] !== "object" || o[k] === null) { o[k] = {}; }
      return o[k];
    }, obj);
    target[last] = value;
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function show(node) { node.hidden = false; }
  function hide(node) { node.hidden = true; }

  /* ---------- form ---------- */

  function buildForm(config) {
    els.sections.innerHTML = "";

    SECTIONS.forEach(function (section) {
      var card = document.createElement("div");
      card.className = "card";

      var h2 = document.createElement("h2");
      h2.className = "section-title";
      var icon = document.createElement("span");
      icon.className = "section-icon";
      icon.textContent = section.icon;
      h2.appendChild(icon);
      h2.appendChild(document.createTextNode(" " + section.title));
      card.appendChild(h2);

      var grid = document.createElement("div");
      grid.className = "section-fields";

      section.fields.forEach(function (field) {
        var wrap = document.createElement("div");
        wrap.className = "field" + (field.wide ? " wide" : "");

        var id = "f-" + field.key.replace(/\./g, "-");
        var label = document.createElement("label");
        label.setAttribute("for", id);
        label.textContent = field.label;
        wrap.appendChild(label);

        var input = document.createElement("input");
        input.type = field.type || "text";
        input.id = id;
        input.value = text(getPath(config, field.key));
        input.dataset.key = field.key;
        input.addEventListener("input", onFieldInput);
        wrap.appendChild(input);

        if (field.hint) {
          var hint = document.createElement("p");
          hint.className = "muted";
          hint.style.fontSize = "13px";
          hint.style.margin = "4px 0 0";
          hint.textContent = field.hint;
          wrap.appendChild(hint);
        }

        var error = document.createElement("p");
        error.className = "field-error";
        error.id = id + "-error";
        error.hidden = true;
        wrap.appendChild(error);

        grid.appendChild(wrap);
      });

      card.appendChild(grid);
      els.sections.appendChild(card);
    });
  }

  function onFieldInput(event) {
    setPath(liveConfig, event.target.dataset.key, event.target.value.trim());
    setFieldError(event.target, "");
    updatePreview();
    scheduleDraftSave();
  }

  function setFieldError(input, message) {
    var errorEl = document.getElementById(input.id + "-error");
    if (!errorEl) { return; }
    if (message) {
      input.setAttribute("aria-invalid", "true");
      errorEl.textContent = message;
      errorEl.hidden = false;
    } else {
      input.removeAttribute("aria-invalid");
      errorEl.hidden = true;
    }
  }

  function updatePreview() {
    els.jsonPreview.textContent = JSON.stringify(liveConfig, null, 2);
  }

  /* ---------- drafts (browser storage only) ---------- */

  function scheduleDraftSave() {
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(function () {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(liveConfig));
      } catch (err) { /* storage full or blocked - not critical */ }
    }, 400);
  }

  function readDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function clearDraft() {
    window.clearTimeout(draftTimer);
    try { localStorage.removeItem(DRAFT_KEY); } catch (err) { /* ignore */ }
  }

  /* ---------- validation ---------- */

  function validate() {
    var problems = [];

    function check(key, pattern, message) {
      var input = document.getElementById("f-" + key.replace(/\./g, "-"));
      var value = text(getPath(liveConfig, key)).trim();
      if (value && !pattern.test(value)) {
        setFieldError(input, message);
        problems.push(message);
      } else if (input) {
        setFieldError(input, "");
      }
    }

    check("pet_id", /^[A-Za-z0-9-]+$/,
      "Pet ID may only contain letters, numbers and dashes (e.g. PET-00124).");
    check("phone", /^\+\d+$/,
      "Phone must start with + followed by digits only (e.g. +639171234567).");
    check("vet.phone", /^\+\d+$/,
      "Clinic phone must start with + followed by digits only.");
    check("site_url", /^https?:\/\/\S+$/,
      "Site URL must start with http:// or https://.");

    return problems;
  }

  /* ---------- output ---------- */

  function configJson() {
    return JSON.stringify(liveConfig, null, 2) + "\n";
  }

  function savedNotice() {
    els.saveOk.textContent =
      "config.json downloaded. Upload it to your GitHub repo (Add file > Upload files) " +
      "or replace it locally and run python build.py. The profile page updates about a " +
      "minute after the commit.";
    show(els.saveOk);
    hide(els.saveError);
  }

  function downloadConfig() {
    var problems = validate();
    if (problems.length) {
      els.saveError.textContent = "Please fix the highlighted fields first.";
      show(els.saveError);
      hide(els.saveOk);
      return;
    }
    var blob = new Blob([configJson()], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    savedNotice();
  }

  function copyConfig() {
    var problems = validate();
    if (problems.length) {
      els.saveError.textContent = "Please fix the highlighted fields first.";
      show(els.saveError);
      hide(els.saveOk);
      return;
    }
    var json = configJson();
    function done() {
      els.saveOk.textContent = "Copied! Paste it over config.json in your repository.";
      show(els.saveOk);
      hide(els.saveError);
    }
    function fallback() {
      window.prompt("Select and copy the JSON below:", json);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(json).then(done, fallback);
    } else {
      fallback();
    }
  }

  function resetToLive() {
    if (!window.confirm("Discard your edits and reload the live config.json?")) { return; }
    clearDraft();
    hide(els.draftBanner);
    start(true);
  }

  /* ---------- boot ---------- */

  function applyConfig(config) {
    liveConfig = config;
    buildForm(liveConfig);
    updatePreview();
    hide(els.saveError);
    hide(els.saveOk);
  }

  function start(skipDraftOffer) {
    fetch(CONFIG_URL, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) { throw new Error("HTTP " + response.status); }
        return response.json();
      })
      .then(function (config) {
        applyConfig(config);
        if (!skipDraftOffer && readDraft()) { show(els.draftBanner); }
      })
      .catch(function () {
        els.loadError.textContent =
          "Could not read config.json. If you opened this page as a file (file://), " +
          "run 'python -m http.server 8000' in the project folder and open " +
          "http://127.0.0.1:8000/edit.html instead.";
        show(els.loadError);
      });
  }

  els.downloadBtn.addEventListener("click", downloadConfig);
  els.copyBtn.addEventListener("click", copyConfig);
  els.resetBtn.addEventListener("click", resetToLive);

  els.restoreDraft.addEventListener("click", function () {
    var draft = readDraft();
    if (draft) { applyConfig(draft); }
    hide(els.draftBanner);
  });

  els.discardDraft.addEventListener("click", function () {
    clearDraft();
    hide(els.draftBanner);
  });

  start(false);
})();
