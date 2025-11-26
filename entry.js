// ========= CONFIG =========
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyBGdFc2n1Ogu-AQADw_03uSoNk-OSQltl5Z-zEgjRDCdwwLIioVerSmGgDlqZWO4qM/exec";

// ========= DOM ELEMENTS =========
const form = document.getElementById("bcfl-form");
const steps = Array.from(document.querySelectorAll(".step"));
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const statusEl = document.getElementById("status");
const stepLabel = document.getElementById("step-label");
const tokenInput = document.getElementById("token");

const emailInput = document.getElementById("email");
const igInput = document.getElementById("instagramHandle");
const leaderboardInput = document.getElementById("leaderboardName");

const femaleBestInput = document.getElementById("femaleBest");
const maleBestInput = document.getElementById("maleBest");
const femaleBestList = document.getElementById("femaleBestList");
const maleBestList = document.getElementById("maleBestList");

// Confidence dropdowns
const confSelects = Array.from(document.querySelectorAll(".conf-select"));

// Class ID arrays
const femaleClasses = ["47w", "52w", "57w", "63w", "69w", "76w", "84w", "84pw"];
const maleClasses = [
  "59m",
  "66m",
  "74m",
  "83m",
  "93m",
  "105m",
  "120m",
  "120pm",
];

// ========= STATE =========
let currentStep = 0;

// ========= UTILITIES =========

function scrollToFormTop() {
  const formContainer = document.getElementById("form-container");
  if (formContainer) {
    const rect = formContainer.getBoundingClientRect();
    const targetY = rect.top + window.pageYOffset - 16;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function showStep(index) {
  steps.forEach((step, i) => {
    step.style.display = i === index ? "block" : "none";
  });

  currentStep = index;
  backBtn.style.visibility = index === 0 ? "hidden" : "visible";

  nextBtn.textContent = index === steps.length - 1 ? "Submit" : "Next";

  const labels = [
    "STEP 1 OF 4 — Contact",
    "STEP 2 OF 4 — Women’s Predictions",
    "STEP 3 OF 4 — Men’s Predictions",
    "STEP 4 OF 4 — Best Lifters",
  ];

  stepLabel.textContent = labels[index] || "";
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className =
    "text-sm mt-1 " + (isError ? "text-red-400" : "text-green-400");
}

function clearErrors() {
  document.querySelectorAll('[id$="Error"]').forEach((e) => (e.textContent = ""));
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

// ========= CONFIDENCE RATING LOGIC =========

function initConfidenceOptions() {
  confSelects.forEach((sel) => {
    sel.innerHTML = "";
    const pl = document.createElement("option");
    pl.value = "";
    pl.textContent = "Select rating…";
    sel.appendChild(pl);

    for (let i = 1; i <= 16; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      sel.appendChild(opt);
    }
  });
}

function refreshConfidenceDisables() {
  const used = new Set(
    confSelects.map((sel) => sel.value).filter((v) => v !== "")
  );

  confSelects.forEach((sel) => {
    const cur = sel.value;
    Array.from(sel.options).forEach((opt) => {
      if (!opt.value) return;
      opt.disabled = used.has(opt.value) && opt.value !== cur;
    });
  });
}

confSelects.forEach((sel) =>
  sel.addEventListener("change", refreshConfidenceDisables)
);

// ========= BEST LIFTER LISTS =========

function buildBestLifterLists() {
  const femaleOptions = new Set();
  const maleOptions = new Set();

  femaleClasses.forEach((cls) => {
    const sel = document.getElementById("w" + cls);
    if (sel) {
      Array.from(sel.options).forEach((o) => {
        if (o.value) femaleOptions.add(o.textContent);
      });
    }
  });

  maleClasses.forEach((cls) => {
    const sel = document.getElementById("w" + cls);
    if (sel) {
      Array.from(sel.options).forEach((o) => {
        if (o.value) maleOptions.add(o.textContent);
      });
    }
  });

  femaleBestList.innerHTML = "";
  femaleOptions.forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    femaleBestList.appendChild(o);
  });

  maleBestList.innerHTML = "";
  maleOptions.forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    maleBestList.appendChild(o);
  });
}

// ========= VALIDATION =========

const totalRegex =
  /^(?:[0-9]|[1-9][0-9]{1,2}|1[0-9]{3}|2000)(?:\.0|\.5)?$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStep(stepIndex) {
  clearErrors();
  let valid = true;

  if (stepIndex === 0) {
    const emailVal = emailInput.value.trim();

    if (!emailVal) {
      setError("emailError", "Email is required.");
      valid = false;
    } else if (!emailRegex.test(emailVal)) {
      setError("emailError", "Please enter a valid email address.");
      valid = false;
    }

    if (!leaderboardInput.value.trim()) {
      setError("leaderboardError", "Leaderboard name is required.");
      valid = false;
    }
  }

  if (stepIndex === 1) {
    femaleClasses.forEach((cls) => {
      const w = document.getElementById("w" + cls);
      const c = document.getElementById("c" + cls);
      const t = document.getElementById("t" + cls);

      if (!w.value) {
        setError("w" + cls + "Error", "Please pick a winner.");
        valid = false;
      }
      if (!c.value) {
        setError("c" + cls + "Error", "Choose a confidence rating.");
        valid = false;
      }

      const v = t.value.trim();
      if (v !== "" && !totalRegex.test(v)) {
        setError("t" + cls + "Error", "Use 0–2000 in steps of 0.5.");
        valid = false;
      }
    });
  }

  if (stepIndex === 2) {
    maleClasses.forEach((cls) => {
      const w = document.getElementById("w" + cls);
      const c = document.getElementById("c" + cls);
      const t = document.getElementById("t" + cls);

      if (!w.value) {
        setError("w" + cls + "Error", "Please pick a winner.");
        valid = false;
      }
      if (!c.value) {
        setError("c" + cls + "Error", "Choose a confidence rating.");
        valid = false;
      }

      const v = t.value.trim();
      if (v !== "" && !totalRegex.test(v)) {
        setError("t" + cls + "Error", "Use 0–2000 in steps of 0.5.");
        valid = false;
      }
    });

    const allValues = confSelects
      .map((s) => s.value)
      .filter((v) => v !== "");

    if (allValues.length !== 16 || new Set(allValues).size !== 16) {
      showStatus(
        "Each confidence rating 1–16 must be used exactly once.",
        true
      );
      valid = false;
    }
  }

  if (stepIndex === 3) {
    const femaleVal = femaleBestInput.value.trim().toLowerCase();
    const maleVal = maleBestInput.value.trim().toLowerCase();

    const femaleOptions = [...femaleBestList.options].map((o) =>
      o.value.trim().toLowerCase()
    );
    const maleOptions = [...maleBestList.options].map((o) =>
      o.value.trim().toLowerCase()
    );

    let ok = true;

    if (!femaleOptions.includes(femaleVal)) {
      document.getElementById("femaleBestError").textContent =
        "Please select a lifter from the list.";
      ok = false;
    }

    if (!maleOptions.includes(maleVal)) {
      document.getElementById("maleBestError").textContent =
        "Please select a lifter from the list.";
      ok = false;
    }

    if (!ok) return false;
  }

  return valid;
}

// ========= PREFILL =========

async function prefillIfToken() {
  const params = new URLSearchParams(window.location.search);
  const existingToken = params.get("token");

  if (!existingToken) return;

  tokenInput.value = existingToken;

  try {
    const res = await fetch(
      SCRIPT_URL + "?action=prefill&token=" + encodeURIComponent(existingToken)
    );
    const json = await res.json();
    if (!json.ok) return;

    const d = json.data;

    emailInput.value = d.email;
    igInput.value = d.instagramHandle;
    leaderboardInput.value = d.leaderboardName;

    emailInput.readOnly = true;
    emailInput.classList.add("bg-gray-700", "cursor-not-allowed");

    femaleClasses.forEach((cls) => {
      document.getElementById("w" + cls).value = d["w" + cls];
      document.getElementById("c" + cls).value = String(d["c" + cls] || "");
      document.getElementById("t" + cls).value = d["t" + cls];
    });

    maleClasses.forEach((cls) => {
      document.getElementById("w" + cls).value = d["w" + cls];
      document.getElementById("c" + cls).value = String(d["c" + cls] || "");
      document.getElementById("t" + cls).value = d["t" + cls];
    });

    femaleBestInput.value = d.femaleBest;
    maleBestInput.value = d.maleBest;

    refreshConfidenceDisables();

    showStatus("Your previous entry has been loaded.", false);
  } catch (err) {
    showStatus("Error loading your previous entry.", true);
  }
}

// ========= DUPLICATE EMAIL CHECK (BLUR) WITH SEND-LINK OPTION =========

emailInput.addEventListener("blur", async () => {
  const emailVal = emailInput.value.trim().toLowerCase();
  if (!emailVal) return;

  if (!emailRegex.test(emailVal)) return; // Only check valid emails

  try {
    const res = await fetch(
      `${SCRIPT_URL}?action=checkEmail&email=${encodeURIComponent(emailVal)}`
    );
    const json = await res.json();

    if (json.exists) {
      // === Show options ===
      const wantsLink = confirm(
        "This email already has an existing entry.\n\n" +
        "Would you like us to send your private edit link?"
      );

      if (wantsLink) {
        // Request backend to send private edit link
        try {
          const res2 = await fetch(
            `${SCRIPT_URL}?action=sendLink&email=${encodeURIComponent(emailVal)}`
          );
          const j2 = await res2.json();
          if (j2.ok) {
            alert("Your edit link has been sent to your email inbox.");
          } else {
            alert("Could not send edit link. Please try again later.");
          }
        } catch (err) {
          alert("Network error. Could not send your edit link.");
        }
      }

      // Clear email regardless (force them to use the link)
      emailInput.value = "";
      return;
    }
  } catch (err) {
    console.warn("Email-check error", err);
  }
});

// ========= SUBMIT =========

async function submitForm() {
  clearErrors();
  showStatus("");

  emailInput.value = emailInput.value.trim().toLowerCase();

  // Validate ALL steps before submission
  for (let s = 0; s < steps.length; s++) {
    if (!validateStep(s)) {
      showStep(s);
      return;
    }
  }

  showStatus("Submitting your entry…", false);
  nextBtn.disabled = true;
  backBtn.disabled = true;

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: new FormData(form),
    });

    const json = await res.json();

    if (!json.ok) {
      showStatus(json.message, true);
      nextBtn.disabled = false;
      backBtn.disabled = false;
      return;
    }

    showStatus(json.message, false);

    if (json.token) {
      const editLink =
        "https://solacestrength.github.io/britishclassicfl/entry.html?token=" +
        encodeURIComponent(json.token);

      const box = document.getElementById("edit-link-box");
      if (box) {
        box.innerHTML = `
          <div class="p-4 mt-4 rounded-lg bg-gray-800 border border-gray-700 text-center text-sm text-gray-200">
            <p class="font-semibold mb-2">Your private edit link:</p>
            <a href="${editLink}" target="_blank" class="text-blue-400 break-all">${editLink}</a>
            <p class="text-gray-400 mt-2">(This has also been emailed to you.)</p>
          </div>
        `;
      }
    }
  } catch (err) {
    showStatus("Network/server error — please try again.", true);
  }

  nextBtn.disabled = false;
  backBtn.disabled = false;
}

// ========= NAVIGATION =========
backBtn.addEventListener("click", () => {
  if (currentStep > 0) {
    showStep(currentStep - 1);
    scrollToFormTop();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentStep < steps.length - 1) {
    if (!validateStep(currentStep)) return;
    showStep(currentStep + 1);
    scrollToFormTop();
  } else {
    submitForm();
  }
});

// ========= INIT =========
document.addEventListener("DOMContentLoaded", async () => {
  initConfidenceOptions();
  buildBestLifterLists();
  showStep(0);
  await prefillIfToken();
});
