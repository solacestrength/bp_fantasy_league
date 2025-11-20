
// ========= CONFIG =========
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxb-8_mIv4QBkDiTNan-vzsx0FQ7xEgx4jKR_5SaokNJomG9YhU0kqFpCeQNoyuImPG/exec'; // <-- paste your deployed Apps Script Web App URL

// ========= DOM ELEMENTS =========
const form = document.getElementById('bcfl-form');
const steps = Array.from(document.querySelectorAll('.step'));
const backBtn = document.getElementById('backBtn');
const nextBtn = document.getElementById('nextBtn');
const statusEl = document.getElementById('status');
const stepLabel = document.getElementById('step-label');
const tokenInput = document.getElementById('token');

const emailInput = document.getElementById('email');
const igInput = document.getElementById('instagramHandle');
const leaderboardInput = document.getElementById('leaderboardName');

const femaleBestInput = document.getElementById('femaleBest');
const maleBestInput = document.getElementById('maleBest');
const femaleBestList = document.getElementById('femaleBestList');
const maleBestList = document.getElementById('maleBestList');

// All confidence selects
const confSelects = Array.from(document.querySelectorAll('.conf-select'));

// Class IDs (for looping)
const femaleClasses = ['47w','52w','57w','63w','69w','76w','84w','84pw'];
const maleClasses   = ['59m','66m','74m','83m','93m','105m','120m','120pm'];

// ========= STATE =========
let currentStep = 0;

// ========= UTILS =========
function showStep(index) {
  steps.forEach((step, i) => {
    step.style.display = i === index ? 'block' : 'none';
  });

  currentStep = index;
  backBtn.style.visibility = index === 0 ? 'hidden' : 'visible';

  if (index === steps.length - 1) {
    nextBtn.textContent = 'Submit';
  } else {
    nextBtn.textContent = 'Next';
  }

  const labels = [
    'Step 1 of 4 – Contact',
    'Step 2 of 4 – Women’s Classes',
    'Step 3 of 4 – Men’s Classes',
    'Step 4 of 4 – Best Lifters'
  ];
  stepLabel.textContent = labels[index] || '';
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = 'text-sm mt-1 ' + (isError ? 'text-red-400' : 'text-green-400');
}

function clearErrors() {
  document.querySelectorAll('[id$="Error"]').forEach(el => {
    el.textContent = '';
  });
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

// ========= CONFIDENCE RATING LOGIC =========

function initConfidenceOptions() {
  confSelects.forEach(sel => {
    // Clear any existing
    sel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select rating…';
    sel.appendChild(placeholder);

    for (let i = 1; i <= 16; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = String(i);
      sel.appendChild(opt);
    }
  });
}

function refreshConfidenceDisables() {
  const used = new Set(
    confSelects
      .map(sel => sel.value)
      .filter(v => v !== '')
  );

  confSelects.forEach(sel => {
    const current = sel.value;
    Array.from(sel.options).forEach(opt => {
      if (!opt.value) return; // skip placeholder
      opt.disabled = used.has(opt.value) && opt.value !== current;
    });
  });
}

confSelects.forEach(sel => {
  sel.addEventListener('change', () => {
    refreshConfidenceDisables();
  });
});

// ========= BEST LIFTER LISTS =========

function buildBestLifterLists() {
  // Collect options from all female and male class winner dropdowns
  const femaleOptions = new Set();
  const maleOptions = new Set();

  femaleClasses.forEach(cls => {
    const sel = document.getElementById('w' + cls);
    if (sel) {
      Array.from(sel.options).forEach(opt => {
        if (opt.value) femaleOptions.add(opt.textContent);
      });
    }
  });

  maleClasses.forEach(cls => {
    const sel = document.getElementById('w' + cls);
    if (sel) {
      Array.from(sel.options).forEach(opt => {
        if (opt.value) maleOptions.add(opt.textContent);
      });
    }
  });

  femaleBestList.innerHTML = '';
  femaleOptions.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    femaleBestList.appendChild(option);
  });

  maleBestList.innerHTML = '';
  maleOptions.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    maleBestList.appendChild(option);
  });
}

// ========= VALIDATION =========

const totalRegex = /^(?:[0-9]|[1-9][0-9]{1,2}|1[0-9]{3}|2000)(?:\.0|\.5)?$/;

function validateStep(stepIndex) {
  clearErrors();
  let valid = true;

  if (stepIndex === 0) {
    if (!emailInput.value.trim()) {
      setError('emailError', 'Email is required.');
      valid = false;
    }
    if (!leaderboardInput.value.trim()) {
      setError('leaderboardError', 'Leaderboard name is required.');
      valid = false;
    }
  }

  if (stepIndex === 1) {
    // Women – winners & confidence required
    femaleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const cSel = document.getElementById('c' + cls);
      const tInput = document.getElementById('t' + cls);

      if (!wSel.value) {
        setError('w' + cls + 'Error', 'Please pick a winner.');
        valid = false;
      }
      if (!cSel.value) {
        setError('c' + cls + 'Error', 'Please choose a confidence rating.');
        valid = false;
      }

      const v = tInput.value.trim();
      if (v !== '' && !totalRegex.test(v)) {
        setError('t' + cls + 'Error', 'Use 0–2000 in steps of 0.5 (e.g. 865 or 865.5).');
        valid = false;
      }
    });
  }

  if (stepIndex === 2) {
    // Men – winners & confidence required
    maleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const cSel = document.getElementById('c' + cls);
      const tInput = document.getElementById('t' + cls);

      if (!wSel.value) {
        setError('w' + cls + 'Error', 'Please pick a winner.');
        valid = false;
      }
      if (!cSel.value) {
        setError('c' + cls + 'Error', 'Please choose a confidence rating.');
        valid = false;
      }

      const v = tInput.value.trim();
      if (v !== '' && !totalRegex.test(v)) {
        setError('t' + cls + 'Error', 'Use 0–2000 in steps of 0.5 (e.g. 865 or 865.5).');
        valid = false;
      }
    });

    // Ensure confidence ratings are unique across ALL 16 classes
    const allValues = confSelects.map(sel => sel.value).filter(v => v !== '');
    const unique = new Set(allValues);
    if (allValues.length !== 16 || unique.size !== 16) {
      showStatus('Each confidence rating 1–16 must be used exactly once across all weight classes.', true);
      valid = false;
    }
  }

  if (stepIndex === 3) {
    if (!femaleBestInput.value.trim()) {
      setError('femaleBestError', 'Please choose a female best lifter.');
      valid = false;
    }
    if (!maleBestInput.value.trim()) {
      setError('maleBestError', 'Please choose a male best lifter.');
      valid = false;
    }
  }

  return valid;
}

// ========= PREFILL LOGIC =========

async function prefillIfToken() {
  const params = new URLSearchParams(window.location.search);
  const existingToken = params.get('token');

  if (!existingToken) return;

  // Put token into hidden input so submit will update same row
  tokenInput.value = existingToken;

  try {
    showStatus('Loading your saved entry…', false);
    const res = await fetch(
      SCRIPT_URL + '?action=prefill&token=' + encodeURIComponent(existingToken),
      { method: 'GET' }
    );
    const json = await res.json();
    if (!json.ok) {
      showStatus(json.message || 'Could not load previous entry.', true);
      return;
    }
    const d = json.data || {};

    // Contact
    if (d.email)           emailInput.value = d.email;
    if (d.instagramHandle) igInput.value = d.instagramHandle;
    if (d.leaderboardName) leaderboardInput.value = d.leaderboardName;

    // Winners – Women
    femaleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const tInput = document.getElementById('t' + cls);
      const cSel  = document.getElementById('c' + cls);

      const wKey = 'w' + cls;
      const tKey = 't' + cls;
      const cKey = 'c' + cls;

      if (d[wKey] && wSel) wSel.value = d[wKey];
      if (d[tKey] && tInput) tInput.value = d[tKey];
      if (d[cKey] && cSel) cSel.value = String(d[cKey]);
    });

    // Winners – Men
    maleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const tInput = document.getElementById('t' + cls);
      const cSel  = document.getElementById('c' + cls);

      const wKey = 'w' + cls;
      const tKey = 't' + cls;
      const cKey = 'c' + cls;

      if (d[wKey] && wSel) wSel.value = d[wKey];
      if (d[tKey] && tInput) tInput.value = d[tKey];
      if (d[cKey] && cSel) cSel.value = String(d[cKey]);
    });

    // Best lifters
    if (d.femaleBest) femaleBestInput.value = d.femaleBest;
    if (d.maleBest)   maleBestInput.value   = d.maleBest;

    // After setting confidence values, refresh disables
    refreshConfidenceDisables();

    showStatus('Your previous entry has been loaded. You can edit and resubmit.', false);
  } catch (err) {
    showStatus('Error loading previous entry. You can still submit a new one.', true);
  }
}

// ========= SUBMIT =========

async function submitForm() {
  clearErrors();
  showStatus('');

  // Final step validation (step 3) plus earlier sections
  // We validate all steps in sequence to catch errors even if user jumps.
  for (let s = 0; s < steps.length; s++) {
    if (!validateStep(s)) {
      showStep(s);
      return;
    }
  }

  showStatus('Submitting your entry…', false);
  nextBtn.disabled = true;
  backBtn.disabled = true;

  try {
    const formData = new FormData(form);
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData
    });
    const json = await res.json();

    if (!json.ok) {
      showStatus(json.message || 'There was an error saving your entry.', true);
      nextBtn.disabled = false;
      backBtn.disabled = false;
      return;
    }

    showStatus(json.message || 'Entry saved. Check your email for confirmation and your edit link.', false);
  } catch (err) {
    showStatus('Network or server error. Please try again.', true);
    nextBtn.disabled = false;
    backBtn.disabled = false;
  }
}

// ========= NAVIGATION HANDLERS =========

backBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    showStep(currentStep - 1);
  }
});

nextBtn.addEventListener('click', () => {
  if (currentStep < steps.length - 1) {
    // Validate current step before moving on
    if (!validateStep(currentStep)) return;
    showStep(currentStep + 1);
  } else {
    // On the last step, submit
    submitForm();
  }
});

// ========= INIT =========

document.addEventListener('DOMContentLoaded', async () => {
  initConfidenceOptions();
  buildBestLifterLists();
  showStep(0);
  await prefillIfToken();
});
