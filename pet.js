/* PawSafe pet profile - behaviour layer.
   Reads the pet data that build.py generated into pets.js, then fills pet.html.
   No frameworks, no build step. */

(function () {
  "use strict";

  var PETS = window.PAWSAFE_PETS || {};

  var els = {
    loading: document.getElementById("loading-state"),
    notFound: document.getElementById("not-found-state"),
    notFoundDetail: document.getElementById("not-found-detail"),
    profile: document.getElementById("profile"),
    photo: document.getElementById("pet-photo"),
    name: document.getElementById("pet-name"),
    id: document.getElementById("pet-id"),
    badge: document.getElementById("pet-badge"),
    location: document.getElementById("pet-location"),
    infoList: document.getElementById("info-list"),
    ownerMissing: document.getElementById("owner-missing"),
    callOwner: document.getElementById("call-owner"),
    copyContact: document.getElementById("copy-contact"),
    foundBtn: document.getElementById("found-btn"),
    foundCard: document.getElementById("found-card"),
    foundForm: document.getElementById("found-form"),
    foundResult: document.getElementById("found-result"),
    downloadQr: document.getElementById("download-qr"),
    vetList: document.getElementById("vet-list"),
    vetSampleBanner: document.getElementById("vet-sample-banner"),
    vetMissing: document.getElementById("vet-missing"),
    callVet: document.getElementById("call-vet"),
    copyVet: document.getElementById("copy-vet"),
    toast: document.getElementById("toast"),
    tabInfo: document.getElementById("tab-info"),
    tabVet: document.getElementById("tab-vet"),
    panelInfo: document.getElementById("panel-info"),
    panelVet: document.getElementById("panel-vet")
  };

  var currentPet = null;
  var lastReport = null; // demo only: kept in memory for this page view, never sent anywhere
  var toastTimer = null;

  /* ---------- small helpers ---------- */

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  // Never insert raw data into innerHTML; build text nodes instead.
  function setText(node, value) {
    node.textContent = value;
  }

  function show(node) { node.hidden = false; }
  function hide(node) { node.hidden = true; }

  function showToast(message) {
    setText(els.toast, message);
    show(els.toast);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { hide(els.toast); }, 3200);
  }

  // One label/value row; skips empty fields entirely.
  function addRow(list, label, value) {
    if (!text(value)) { return; }
    var dt = document.createElement("dt");
    setText(dt, label);
    var dd = document.createElement("dd");
    setText(dd, value);
    list.appendChild(dt);
    list.appendChild(dd);
  }

  /* ---------- rendering ---------- */

  function renderPhoto(pet) {
    if (text(pet.photo)) {
      var img = document.createElement("img");
      img.src = pet.photo;
      img.alt = "Photo of " + (text(pet.pet_name) || "this pet");
      img.onerror = function () {
        // Photo missing - fall back to the paw placeholder.
        els.photo.textContent = "\uD83D\uDC3E";
        els.photo.setAttribute("aria-label", "No photo available");
      };
      els.photo.appendChild(img);
    } else {
      els.photo.textContent = "\uD83D\uDC3E";
      els.photo.setAttribute("aria-label", "No photo available");
    }
  }

  function renderInfoTab(pet) {
    addRow(els.infoList, "Pet name", pet.pet_name);
    addRow(els.infoList, "Pet ID", pet.pet_id);
    addRow(els.infoList, "Species", pet.species);
    addRow(els.infoList, "Breed", pet.breed);
    addRow(els.infoList, "Age", pet.age);
    addRow(els.infoList, "Sex", pet.sex);
    addRow(els.infoList, "Color / distinguishing marks", pet.color);
    addRow(els.infoList, "Allergies", pet.allergies);
    addRow(els.infoList, "Special medical needs", pet.medical);
    addRow(els.infoList, "Vaccination status", pet.vaccination);
    addRow(els.infoList, "Microchip", pet.microchip);
    addRow(els.infoList, "Notes", pet.notes);
    addRow(els.infoList, "Owner's name", pet.owner_name);
    addRow(els.infoList, "Owner's contact number", pet.phone);
    addRow(els.infoList, "General location", pet.location);

    if (els.infoList.children.length === 0) {
      var p = document.createElement("p");
      p.className = "empty-row";
      setText(p, "No information has been added for this pet yet.");
      els.infoList.appendChild(p);
    }

    if (text(pet.phone)) {
      els.callOwner.href = "tel:" + text(pet.phone).replace(/[^\d+]/g, "");
      show(els.callOwner);
    } else {
      show(els.ownerMissing);
      hide(els.copyContact);
      hide(els.foundBtn);
    }
  }

  function renderVetTab(pet) {
    var vet = pet.vet || {};
    addRow(els.vetList, "Veterinarian", vet.name);
    addRow(els.vetList, "Clinic", vet.clinic);
    addRow(els.vetList, "Clinic contact number", vet.phone);
    addRow(els.vetList, "Clinic address", vet.address);
    addRow(els.vetList, "Last vaccination", vet.last_vaccination);
    addRow(els.vetList, "Next scheduled checkup", vet.next_checkup);
    addRow(els.vetList, "Known allergies", vet.allergies);
    addRow(els.vetList, "Medical history", vet.medical_history);
    addRow(els.vetList, "Current medications", vet.medications);
    addRow(els.vetList, "Previous treatments", vet.previous_treatments);
    addRow(els.vetList, "Additional veterinary notes", vet.notes);

    if (els.vetList.children.length === 0) {
      show(els.vetMissing);
      hide(els.copyVet);
    } else if (!text(vet.phone)) {
      show(els.vetMissing);
    }

    if (text(vet.phone)) {
      els.callVet.href = "tel:" + text(vet.phone).replace(/[^\d+]/g, "");
      show(els.callVet);
    }
  }

  function renderPet(pet) {
    currentPet = pet;
    document.title = pet.pet_name + " - PawSafe pet profile";

    if (pet.is_sample) {
      show(els.vetSampleBanner);
    }

    renderPhoto(pet);
    setText(els.name, text(pet.pet_name) || "Unknown pet");
    setText(els.id, text(pet.pet_id) || "No ID");

    if (text(pet.badge)) { setText(els.badge, pet.badge); show(els.badge); }
    if (text(pet.location)) { setText(els.location, "\uD83D\uDCCD " + pet.location); show(els.location); }

    renderInfoTab(pet);
    renderVetTab(pet);

    // Only offer the QR download when build.py generated one for this pet.
    if (text(pet.qr_png)) {
      els.downloadQr.href = pet.qr_png;
      show(els.downloadQr);
    }

    hide(els.loading);
    show(els.profile);
  }

  function showNotFound(petId) {
    setText(
      els.notFoundDetail,
      petId
        ? 'No profile is registered for "' + petId + '".'
        : "This link is missing a pet ID."
    );
    hide(els.loading);
    show(els.notFound);
  }

  /* ---------- tabs ---------- */

  function selectTab(which) {
    var infoActive = which === "info";
    els.tabInfo.setAttribute("aria-selected", String(infoActive));
    els.tabVet.setAttribute("aria-selected", String(!infoActive));
    els.tabInfo.tabIndex = infoActive ? 0 : -1;
    els.tabVet.tabIndex = infoActive ? -1 : 0;
    els.panelInfo.hidden = !infoActive;
    els.panelVet.hidden = infoActive;
  }

  function wireTabs() {
    els.tabInfo.addEventListener("click", function () { selectTab("info"); });
    els.tabVet.addEventListener("click", function () { selectTab("vet"); });

    // Left/right arrow keys move between tabs (WAI-ARIA tabs pattern).
    [els.tabInfo, els.tabVet].forEach(function (tab) {
      tab.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") { return; }
        event.preventDefault();
        var other = tab === els.tabInfo ? els.tabVet : els.tabInfo;
        selectTab(other === els.tabInfo ? "info" : "vet");
        other.focus();
      });
    });
  }

  /* ---------- clipboard ---------- */

  function fallbackCopy(textToCopy) {
    var area = document.createElement("textarea");
    area.value = textToCopy;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function copyText(textToCopy, successMessage) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy).then(
        function () { showToast(successMessage); },
        function () { copyWithMessage(textToCopy, successMessage); }
      );
    } else {
      copyWithMessage(textToCopy, successMessage);
    }
  }

  function copyWithMessage(textToCopy, successMessage) {
    if (fallbackCopy(textToCopy)) {
      showToast(successMessage);
    } else {
      showToast("Copy is not available here. Please select the text and copy it manually.");
      window.prompt("Select and copy this text:", textToCopy);
    }
  }

  function buildContactText(pet) {
    var lines = [
      "LOST PET " + text(pet.pet_name) + " (" + text(pet.pet_id) + ")",
      "Owner: " + text(pet.owner_name),
      "Phone: " + text(pet.phone),
      "Location: " + text(pet.location),
      "Breed: " + text(pet.breed),
      "Color: " + text(pet.color),
      "Microchip: " + text(pet.microchip),
      "Medical: " + text(pet.medical),
      "Notes: " + text(pet.notes)
    ];
    return lines.filter(function (line) {
      return !/:$/.test(line) && !/: $/.test(line);
    }).join("\n");
  }

  function buildVetText(pet) {
    var vet = pet.vet || {};
    var lines = [
      "VET DETAILS for " + text(pet.pet_name) + " (" + text(pet.pet_id) + ")",
      "Veterinarian: " + text(vet.name),
      "Clinic: " + text(vet.clinic),
      "Clinic phone: " + text(vet.phone),
      "Clinic address: " + text(vet.address),
      "Last vaccination: " + text(vet.last_vaccination),
      "Next checkup: " + text(vet.next_checkup),
      "Allergies: " + text(vet.allergies),
      "Medical history: " + text(vet.medical_history),
      "Medications: " + text(vet.medications),
      "Previous treatments: " + text(vet.previous_treatments),
      "Notes: " + text(vet.notes)
    ];
    return lines.filter(function (line) {
      return !/:$/.test(line) && !/: $/.test(line);
    }).join("\n");
  }

  /* ---------- "I Found This Pet" form ---------- */

  function setFieldError(input, errorId, message) {
    var errorEl = document.getElementById(errorId);
    if (message) {
      input.setAttribute("aria-invalid", "true");
      setText(errorEl, message);
      errorEl.hidden = false;
    } else {
      input.removeAttribute("aria-invalid");
      errorEl.hidden = true;
    }
  }

  function toggleFoundForm() {
    var opening = els.foundCard.hidden;
    els.foundCard.hidden = !opening;
    els.foundBtn.setAttribute("aria-expanded", String(opening));
    if (opening) {
      els.foundCard.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("finder-name").focus();
    }
  }

  function handleFoundSubmit(event) {
    event.preventDefault();

    var nameInput = document.getElementById("finder-name");
    var phoneInput = document.getElementById("finder-phone");
    var messageInput = document.getElementById("finder-message");

    var name = nameInput.value.trim();
    var phone = phoneInput.value.trim();
    var valid = true;

    if (!name) {
      setFieldError(nameInput, "finder-name-error", "Please enter your name.");
      valid = false;
    } else {
      setFieldError(nameInput, "finder-name-error", "");
    }

    if (!phone) {
      setFieldError(phoneInput, "finder-phone-error", "Please enter a contact number.");
      valid = false;
    } else if (!/^[+\d][\d\s()-]{5,}$/.test(phone)) {
      setFieldError(phoneInput, "finder-phone-error",
        "That does not look like a phone number. Example: +639171234567");
      valid = false;
    } else {
      setFieldError(phoneInput, "finder-phone-error", "");
    }

    // Honest demo behaviour: nothing leaves the browser - there is no backend yet.
    lastReport = {
      petId: currentPet ? currentPet.pet_id : null,
      finderName: name,
      finderPhone: phone,
      message: messageInput.value.trim(),
      at: new Date().toISOString()
    };

    els.foundResult.innerHTML = "";
    var box = document.createElement("div");

    if (!valid) {
      box.className = "result-box error";
      setText(box, "Please fix the highlighted fields and try again.");
      els.foundResult.appendChild(box);
      show(els.foundResult);
      return;
    }

    box.className = "result-box ok";
    setText(box,
      "Thank you, " + name + "! Please note: this demo form only keeps your report " +
      "in this browser tab and cannot notify the owner yet. To make sure they know, " +
      "call the owner now.");
    els.foundResult.appendChild(box);

    if (text(currentPet.phone)) {
      var callLink = document.createElement("a");
      callLink.className = "btn btn-primary";
      callLink.href = "tel:" + text(currentPet.phone).replace(/[^\d+]/g, "");
      callLink.style.marginTop = "10px";
      setText(callLink, "\u260E\uFE0F Call the owner");
      els.foundResult.appendChild(callLink);
    }

    els.foundForm.reset();
    show(els.foundResult);
  }

  /* ---------- start ---------- */

  /* Build one profile record from config.json (same shape build.py generates).
     This lets the owner update the site by uploading a new config.json - no
     rebuild needed. pets.js stays as the offline/file:// fallback. */
  function recordFromConfig(cfg) {
    var vet = cfg.vet || {};
    return {
      pet_id: cfg.pet_id,
      pet_name: cfg.pet_name,
      photo: cfg.photo || "pet.jpg",
      badge: cfg.badge,
      location: cfg.location,
      species: cfg.species,
      breed: cfg.breed,
      age: cfg.age,
      sex: cfg.sex,
      color: cfg.color,
      allergies: cfg.allergies,
      medical: cfg.medical,
      vaccination: cfg.vaccination,
      microchip: cfg.microchip,
      notes: cfg.notes,
      owner_name: cfg.owner_name,
      phone: cfg.phone,
      is_sample: cfg.is_sample !== false,
      qr_png: cfg.site_url ? "qr_pet.png" : null,
      qr_svg: cfg.site_url ? "qr_pet.svg" : null,
      vet: {
        name: vet.name,
        clinic: vet.clinic,
        phone: vet.phone,
        address: vet.address,
        last_vaccination: vet.last_vaccination,
        next_checkup: vet.next_checkup,
        allergies: vet.allergies || cfg.allergies,
        medical_history: vet.medical_history,
        medications: vet.medications,
        previous_treatments: vet.previous_treatments,
        notes: vet.notes
      }
    };
  }

  function petsFromConfig(cfg) {
    if (!cfg || !cfg.pet_id) { return null; }
    var record = recordFromConfig(cfg);
    var map = {};
    map[record.pet_id] = record;
    return map;
  }

  function loadPets() {
    return fetch("config.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) { throw new Error("HTTP " + response.status); }
        return response.json();
      })
      .then(function (cfg) {
        return petsFromConfig(cfg) || PETS;
      })
      .catch(function () {
        return PETS;
      });
  }

  function init() {
    wireTabs();

    loadPets().then(function (pets) {
      document.body.dataset.source = (pets === PETS) ? "pets-js" : "config-json";

      var petId = new URLSearchParams(window.location.search).get("pet");
      var pet = petId ? pets[petId] : null;

      // Support opening pet.html directly with no ?pet= when only one pet exists.
      if (!pet && !petId) {
        var ids = Object.keys(pets);
        if (ids.length === 1) { pet = pets[ids[0]]; }
      }

      if (!pet) {
        showNotFound(petId || "");
        return;
      }

      renderPet(pet);

      els.foundBtn.addEventListener("click", toggleFoundForm);
      els.foundForm.addEventListener("submit", handleFoundSubmit);

      els.copyContact.addEventListener("click", function () {
        copyText(buildContactText(currentPet), "Contact information copied.");
      });

      els.copyVet.addEventListener("click", function () {
        copyText(buildVetText(currentPet), "Vet details copied.");
      });
    });
  }

  init();
})();
