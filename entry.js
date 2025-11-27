// ========= CONFIG =========
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyBGdFc2n1Ogu-AQADw_03uSoNk-OSQltl5Z-zEgjRDCdwwLIioVerSmGgDlqZWO4qM/exec'; // <-- your deployed Apps Script Web App URL

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

// ========= SCROLL HELPER =========
function scrollToFormTop() {
  const formContainer = document.getElementById('form-container');
  if (formContainer) {
    const rect = formContainer.getBoundingClientRect();
    const targetY = rect.top + window.pageYOffset - 16; // small margin
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

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
    sel.innerHTML = '';

    // Placeholder
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select rating…';
    sel.appendChild(placeholder);

    // Ratings 1–16
    for (let i = 1; i <= 16; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = String(i);
      sel.appendChild(opt);
    }

    // CLEAR ALL OPTION — new
    const clearOpt = document.createElement('option');
    clearOpt.value = 'CLEAR_ALL';
    clearOpt.textContent = '⚠️ Clear ALL confidence ratings';
    clearOpt.classList.add('text-red-400', 'font-semibold');
    sel.appendChild(clearOpt);
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

// ========= CLEAR CONFIDENCE RATINGS =========

confSelects.forEach(sel => {
  sel.addEventListener('change', () => {

    if (sel.value !== 'CLEAR_ALL') return;

    const isFemale = sel.id.includes('w'); // w47w, w52w, etc.

    const ok = confirm(
      `Are you sure you want to clear ALL confidence ratings for all ${
        isFemale ? 'women’s' : 'men’s'
      } classes?`
    );

    if (!ok) {
      sel.value = '';
      return;
    }

    const targetClassList = isFemale ? femaleClasses : maleClasses;

    // Clear all for that gender
    targetClassList.forEach(cls => {
      const cSel = document.getElementById('c' + cls);
      if (cSel) cSel.value = '';
    });

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
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStep(stepIndex) {
  clearErrors();
  let valid = true;

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
    const femaleInput = document.getElementById("femaleBest");
    const maleInput   = document.getElementById("maleBest");

    const femaleOptions = [...document.querySelectorAll("#femaleBestList option")]
      .map(o => o.value.trim().toLowerCase());

    const maleOptions = [...document.querySelectorAll("#maleBestList option")]
      .map(o => o.value.trim().toLowerCase());

    const femaleVal = femaleInput.value.trim().toLowerCase();
    const maleVal   = maleInput.value.trim().toLowerCase();

    let validStep = true;

    // Female validation
    if (!femaleOptions.includes(femaleVal)) {
      document.getElementById("femaleBestError").textContent =
        "Please select a lifter from the list.";
      validStep = false;
    }

    // Male validation
    if (!maleOptions.includes(maleVal)) {
      document.getElementById("maleBestError").textContent =
        "Please select a lifter from the list.";
      validStep = false;
    }

    if (!validStep) return false;
  }
  
  return valid;
}

// ========= DUPLICATE EMAIL HELPERS =========

// Assumes backend supports ?action=checkEmail&email=...
async function checkEmailExists(email) {
  const res = await fetch(
    SCRIPT_URL + '?action=checkEmail&email=' + encodeURIComponent(email),
    { method: 'GET' }
  );
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.message || 'Could not check email.');
  }
  // Expecting { ok:true, exists:true/false }
  return !!json.exists;
}

// Assumes backend supports ?action=sendLink&email=...
async function sendEditLink(email) {
  const res = await fetch(
    SCRIPT_URL + '?action=sendLink&email=' + encodeURIComponent(email),
    { method: 'GET' }
  );
  const json = await res.json();

  if (!json.ok) {
    // Show message but don't blow up JS
    showStatus(json.message || 'Could not send your private link. Please try again later.', true);
    return false;
  }

  // Optionally show a success message here, but main one is set in caller
  return true;
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

    // 🔒 When editing via token, lock the email field
    emailInput.readOnly = true;
    emailInput.classList.add('bg-gray-700', 'cursor-not-allowed');

    // Winners – Women
    femaleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const tInput = document.getElementById('t' + cls);
      const cSel  = document.getElementById('c' + cls);

      const wKey = 'w' + cls;
      const tKey = 't' + cls;
      const cKey = 'c' + cls;

      if (d[wKey] && wSel)   wSel.value = d[wKey];
      if (d[tKey] && tInput) tInput.value = d[tKey];
      if (d[cKey] && cSel)   cSel.value = String(d[cKey]);
    });

    // Winners – Men
    maleClasses.forEach(cls => {
      const wSel = document.getElementById('w' + cls);
      const tInput = document.getElementById('t' + cls);
      const cSel  = document.getElementById('c' + cls);

      const wKey = 'w' + cls;
      const tKey = 't' + cls;
      const cKey = 'c' + cls;

      if (d[wKey] && wSel)   wSel.value = d[wKey];
      if (d[tKey] && tInput) tInput.value = d[tKey];
      if (d[cKey] && cSel)   cSel.value = String(d[cKey]);
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

  // Normalise email
  emailInput.value = emailInput.value.trim().toLowerCase();

  // Validate ALL steps before submitting
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

    // Success message
    showStatus(json.message || 'Entry saved. Check your email for confirmation and your edit link.', false);

    // === SHOW EDIT LINK ON PAGE ===
    if (json.ok && json.token) {
      const editLink = `https://solacestrength.github.io/britishclassicfl/entry.html?token=${encodeURIComponent(json.token)}`;
      const linkBox = document.getElementById('edit-link-box');

      if (linkBox) {
        linkBox.innerHTML = `
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

// ========= NAVIGATION HANDLERS =========

backBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    showStep(currentStep - 1);
    scrollToFormTop();
  }
});

nextBtn.addEventListener('click', async () => {
  // Not on last step yet
  if (currentStep < steps.length - 1) {
    // Local validation for current step
    if (!validateStep(currentStep)) return;

    // Special handling on Step 0 for duplicate emails
    if (currentStep === 0) {
      const emailVal = emailInput.value.trim().toLowerCase();
      const tokenVal = tokenInput.value.trim();

      // Only check for duplicates if this is NOT an edit via token
      if (emailVal && !tokenVal) {
        try {
          showStatus('Checking email…', false);
          nextBtn.disabled = true;
          backBtn.disabled = true;

          const exists = await checkEmailExists(emailVal);

          if (exists) {
            // Popup: send link or cancel
            const wantLink = window.confirm(
              'An entry with this email address already exists.\n\n' +
              'Press OK to send your private edit link to this email so you can edit your existing entry.\n' +
              'Press Cancel to change the email address.'
            );

            if (wantLink) {
              const sentOk = await sendEditLink(emailVal);
              if (sentOk) {
                showStatus('Your private edit link has been emailed to you. Please use that link to update your entry.', false);
              }
            } else {
              showStatus('Please enter a different email address to create a new entry.', true);
            }

            nextBtn.disabled = false;
            backBtn.disabled = false;
            // 🔒 Do NOT advance to Step 2 in either case
            return;
          }

          // If no existing entry, clear any "checking" status
          showStatus('', false);
          nextBtn.disabled = false;
          backBtn.disabled = false;

        } catch (err) {
          showStatus('Could not check this email right now. Please try again.', true);
          nextBtn.disabled = false;
          backBtn.disabled = false;
          return;
        }
      }
    }

    // If we reach here, it's safe to advance
    showStep(currentStep + 1);
    scrollToFormTop();
  } else {
    // Last step -> submit
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
