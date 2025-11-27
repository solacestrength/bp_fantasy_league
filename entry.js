// ========= CONFIG =========
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyBGdFc2n1Ogu-AQADw_03uSoNk-OSQltl5Z-zEgjRDCdwwLIioVerSmGgDlqZWO4qM/exec';

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

// Class IDs
const femaleClasses = ['47w','52w','57w','63w','69w','76w','84w','84pw'];
const maleClasses   = ['59m','66m','74m','83m','93m','105m','120m','120pm'];

// ========= STATE =========
let currentStep = 0;

// ========= SCROLL HELPERS =========
function scrollToFormTop() {
  const formContainer = document.getElementById('form-container');
  if (formContainer) {
    const rect = formContainer.getBoundingClientRect();
    const y = rect.top + window.pageYOffset - 16;
    window.scrollTo({ top: y, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function scrollToFirstError() {
  const errorFields = [...document.querySelectorAll('[id$="Error"]')]
    .filter(el => el.textContent.trim() !== '');

  if (errorFields.length > 0) {
    const el = errorFields[0];
    const y = el.getBoundingClientRect().top + window.pageYOffset - 120;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}

// ========= UTILS =========
function showStep(index) {
  steps.forEach((step, i) => {
    step.style.display = i === index ? 'block' : 'none';
  });

  currentStep = index;
  backBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
  nextBtn.textContent = index === steps.length - 1 ? 'Submit' : 'Next';

  const labels = [
    'Step 1 of 4 – Contact',
    'Step 2 of 4 – Women’s Predictions',
    'Step 3 of 4 – Men’s Predictions',
    'Step 4 of 4 – Best Lifters'
  ];
  stepLabel.textContent = labels[index] || '';
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = 'text-sm mt-1 ' + (isError ? 'text-red-400' : 'text-green-400');
}

function clearErrors() {
  document.querySelectorAll('[id$="Error"]').forEach(el => { el.textContent = ''; });
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

// ========= CONFIDENCE RATING LOGIC =========

function initConfidenceOptions() {
  confSelects.forEach(sel => {
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

    // NEW CLEAR ALL OPTION
    const clearOpt = document.createElement('option');
    clearOpt.value = 'CLEAR_ALL';
    clearOpt.textContent = '⚠️ Clear ALL confidence ratings';
    clearOpt.classList.add('text-red-400', 'font-semibold');
    sel.appendChild(clearOpt);
  });
}

function refreshConfidenceDisables() {
  const used = new Set(
    confSelects.map(sel => sel.value).filter(v => v !== '' && v !== 'CLEAR_ALL')
  );

  confSelects.forEach(sel => {
    const current = sel.value;
    Array.from(sel.options).forEach(opt => {
      if (!opt.value || opt.value === 'CLEAR_ALL') return;
      opt.disabled = used.has(opt.value) && opt.value !== current;
    });
  });
}

// ========= CLEAR CONFIDENCE RATINGS =========

confSelects.forEach(sel => {
  sel.addEventListener('change', () => {
    if (sel.value !== 'CLEAR_ALL') return;

    const ok = confirm(
      'Are you sure you want to clear ALL 16 confidence ratings?\n\nThis will reset every rating for both men’s and women’s classes.'
    );

    if (!ok) {
      sel.value = '';
      return;
    }

    // Clear ALL 16 confidence dropdowns
    confSelects.forEach(s => { s.value = ''; });

    refreshConfidenceDisables();

    showStatus('All confidence ratings have been cleared.', false);
    scrollToFormTop();
  });
});

// ========= BEST LIFTER LISTS =========

function buildBestLifterLists() {
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
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStep(stepIndex) {
  clearErrors();
  let valid = true;

  // STEP 0 — CONTACT
  if (stepIndex === 0) {
    const emailVal = emailInput.value.trim();
    if (!emailVal) {
      setError('emailError', 'Email is required.');
      valid = false;
    } else if (!emailRegex.test(emailVal)) {
      setError('emailError', 'Please enter a valid email address.');
      valid = false;
    }
    if (!leaderboardInput.value.trim()) {
      setError('leaderboardError', 'Leaderboard name is required.');
      valid = false;
    }
  }

  // STEP 1 — WOMEN'S
  if (stepIndex === 1) {
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

  // STEP 2 — MEN'S
  if (stepIndex === 2) {
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

    // UNIQUE RATING CHECK (16 ratings exactly once)
    const allValues = confSelects
      .map(sel => sel.value)
      .filter(v => v !== '' && v !== 'CLEAR_ALL');

    const unique = new Set(allValues);

    if (allValues.length !== 16 || unique.size !== 16) {
      showStatus(
        'Each confidence rating 1–16 must be used exactly once across ALL men’s and women’s classes.',
        true
      );
      valid = false;
    }
  }

  // STEP 3 — BEST LIFTERS
  if (stepIndex === 3) {
    const femaleInput = femaleBestInput.value.trim().toLowerCase();
    const maleInput   = maleBestInput.value.trim().toLowerCase();

    const femaleOpts = [...document.querySelectorAll('#femaleBestList option')]
      .map(o => o.value.trim().toLowerCase());
    const maleOpts = [...document.querySelectorAll('#maleBestList option')]
      .map(o => o.value.trim().toLowerCase());

    let localValid = true;

    if (!femaleOpts.includes(femaleInput)) {
      setError('femaleBestError', 'Please select a lifter from the list.');
      localValid = false;
    }
    if (!maleOpts.includes(maleInput)) {
      setError('maleBestError', 'Please select a lifter from the list.');
      localValid = false;
    }

    if (!localValid) return false;
  }

  return valid;
}

// ========= DUPLICATE EMAIL HELPERS =========

async function checkEmailExists(email) {
  const res = await fetch(
    SCRIPT_URL + '?action=checkEmail&email=' + encodeURIComponent(email),
    { method: 'GET' }
  );
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.message || 'Could not check email.');
  }
  return !!json.exists;
}

async function sendEditLink(email) {
  const res = await fetch(
    SCRIPT_URL + '?action=sendLink&email=' + encodeURIComponent(email),
    { method: 'GET' }
  );
  const json = await res.json();

  if (!json.ok) {
    showStatus(json.message || 'Could not send your private link. Please try again later.', true);
    return false;
  }

  return true;
}

// ========= PREFILL LOGIC =========

async function prefillIfToken() {
  const params = new URLSearchParams(window.location.search);
  const existingToken = params.get('token');

  if (!existingToken) return;

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

    // Prefill contact
    if (d.email)           emailInput.value = d.email;
    if (d.instagramHandle) igInput.value = d.instagramHandle;
    if (d.leaderboardName) leaderboardInput.value = d.leaderboardName;

    // Lock email
    emailInput.readOnly = true;
    emailInput.classList.add('bg-gray-700', 'cursor-not-allowed');

    // Prefill women
    femaleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const tInput = document.getElementById('t' + cls);
      const cSel  = document.getElementById('c' + cls);

      if (d['w' + cls] && wSel)   wSel.value = d['w' + cls];
      if (d['t' + cls] && tInput) tInput.value = d['t' + cls];
      if (d['c' + cls] && cSel)   cSel.value = String(d['c' + cls]);
    });

    // Prefill men
    maleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const tInput = document.getElementById('t' + cls);
      const cSel  = document.getElementById('c' + cls);

      if (d['w' + cls] && wSel)   wSel.value = d['w' + cls];
      if (d['t' + cls] && tInput) tInput.value = d['t' + cls];
      if (d['c' + cls] && cSel)   cSel.value = String(d['c' + cls]);
    });

    // Prefill best lifters
    if (d.femaleBest) femaleBestInput.value = d.femaleBest;
    if (d.maleBest)   maleBestInput.value   = d.maleBest;

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

  emailInput.value = emailInput.value.trim().toLowerCase();

  // Validate *all* steps before submission
  for (let s = 0; s < steps.length; s++) {
    if (!validateStep(s)) {
      showStep(s);
      scrollToFormTop();
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

    showStatus(json.message || 'Entry saved. Check your email for confirmation and edit link.', false);

    // Display edit link on page
    if (json.ok && json.token) {
      const editLink = `https://solacestrength.github.io/britishclassicfl/entry.html?token=${encodeURIComponent(json.token)}`;
      const box = document.getElementById('edit-link-box');

      if (box) {
        box.innerHTML = `
          <div class="p-4 mt-4 rounded-lg bg-gray-800 border border-gray-700 text-center text-sm text-gray-200">
            <p class="font-semibold mb-2">Your private edit link:</p>
            <a href="${editLink}" class="text-blue-400 break-all" target="_blank">${editLink}</a>
            <p class="text-gray-400 mt-2">(This has also been emailed to you.)</p>
          </div>
        `;
      }
    }

  } catch (err) {
    showStatus('Network or server error. Please try again.', true);
  }

  nextBtn.disabled = false;
  backBtn.disabled = false;
}

// ========= NAVIGATION =========

backBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    showStep(currentStep - 1);
    scrollToFormTop();
  }
});

nextBtn.addEventListener('click', async () => {
  if (currentStep < steps.length - 1) {

    // validate current page
    if (!validateStep(currentStep)) {
      // NEW: Scroll to first error
      const firstErr = document.querySelector('[id$="Error"]:not(:empty)');
      if (firstErr) {
        firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // STEP 0 — duplicate email check
    if (currentStep === 0) {
      const emailVal = emailInput.value.trim().toLowerCase();
      const tokenVal = tokenInput.value.trim();

      if (emailVal && !tokenVal) {
        try {
          showStatus('Checking email…', false);
          nextBtn.disabled = true;
          backBtn.disabled = true;

          const exists = await checkEmailExists(emailVal);

          if (exists) {
            const wantLink = confirm(
              'An entry with this email already exists.\n\n' +
              'Press OK to send your private edit link.\n' +
              'Press Cancel to enter a different email.'
            );

            if (wantLink) {
              await sendEditLink(emailVal);
              showStatus('Your private edit link has been emailed to you.', false);
            } else {
              showStatus('Please enter a different email.', true);
            }

            nextBtn.disabled = false;
            backBtn.disabled = false;
            return;
          }

          showStatus('', false);
          nextBtn.disabled = false;
          backBtn.disabled = false;

        } catch {
          showStatus('Could not check email right now. Try again.', true);
          nextBtn.disabled = false;
          backBtn.disabled = false;
          return;
        }
      }
    }

    // advance
    showStep(currentStep + 1);
    scrollToFormTop();

  } else {
    submitForm();
  }
});

// ========= INIT =========

document.addEventListener('DOMContentLoaded', async () => {
  initConfidenceOptions();      // includes CLEAR ALL option
  buildBestLifterLists();       // datalists for best lifter inputs
  showStep(0);                  // show Step 1 on load
  await prefillIfToken();       // load saved entry if ?token= present
});
