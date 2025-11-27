// ========= CONFIG =========
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyBGdFc2n1Ogu-AQADw_03uSoNk-OSQltl5Z-zEgjRDCdwwLIioVerSmGgDlqZWO4qM/exec'; // <-- your deployed Apps Script Web App URL

// ========= DOM ELEMENTS =========
const form = document.getElementById('bcfl-form');
const steps = Array.from(document.querySelectorAll('.step'));
const backBtn = document.getElementById('backBtn');
const nextBtn = document.getElementById('nextBtn');
const statusEl = document.getElementById('status');
const stepLabel = document.getElementById('step-label');
const tokenInput = document.getElementElementById ? document.getElementById('token') : document.querySelector('#token'); // safety

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
// Pages:
// 0 -> step[0] (Contact)
// 1 -> step[1] + step[2] (Women + Men predictions)
// 2 -> step[3] (Best Lifters)
const pages = [
  [0],
  [1, 2],
  [3]
];

let currentPage = 0;
let pendingDuplicateEmail = '';

// ========= SCROLL HELPERS =========
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

function scrollToFirstErrorWithinPage(pageIndex) {
  const indices = pages[pageIndex] || [];
  let firstErrorEl = null;

  for (const stepIdx of indices) {
    const stepEl = steps[stepIdx];
    if (!stepEl) continue;

    const errorEls = Array.from(stepEl.querySelectorAll('[id$="Error"]'));
    for (const err of errorEls) {
      if (err.textContent && err.textContent.trim() !== '') {
        firstErrorEl = err;
        break;
      }
    }
    if (firstErrorEl) break;
  }

  if (firstErrorEl) {
    const rect = firstErrorEl.getBoundingClientRect();
    const targetY = rect.top + window.pageYOffset - 80;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  } else {
    scrollToFormTop();
  }
}

// ========= UTILS =========
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

// Show a full "page" (one or more steps)
function showPage(pageIndex) {
  steps.forEach((stepEl, idx) => {
    const shouldShow = (pages[pageIndex] || []).includes(idx);
    stepEl.style.display = shouldShow ? 'block' : 'none';
  });

  currentPage = pageIndex;

  // Back button visibility
  backBtn.style.visibility = pageIndex === 0 ? 'hidden' : 'visible';

  // Next button text
  if (pageIndex === pages.length - 1) {
    nextBtn.textContent = 'Submit';
  } else {
    nextBtn.textContent = 'Next';
  }

  // Step label text
  if (pageIndex === 0) {
    stepLabel.textContent = 'Step 1 of 4 – Contact';
  } else if (pageIndex === 1) {
    stepLabel.textContent = 'Steps 2 and 3 of 4 – Women’s & Men’s Predictions';
  } else if (pageIndex === 2) {
    stepLabel.textContent = 'Step 4 of 4 – Best Lifters';
  } else {
    stepLabel.textContent = '';
  }
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
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStep(stepIndex, opts = {}) {
  const skipClear = opts.skipClear === true;

  if (!skipClear) {
    clearErrors();
  }

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
    const femaleInput = document.getElementById('femaleBest');
    const maleInput   = document.getElementById('maleBest');

    const femaleOptions = [...document.querySelectorAll('#femaleBestList option')]
      .map(o => o.value.trim().toLowerCase());

    const maleOptions = [...document.querySelectorAll('#maleBestList option')]
      .map(o => o.value.trim().toLowerCase());

    const femaleVal = femaleInput.value.trim().toLowerCase();
    const maleVal   = maleInput.value.trim().toLowerCase();

    let validStep = true;

    // Female validation
    if (!femaleOptions.includes(femaleVal)) {
      document.getElementById('femaleBestError').textContent =
        'Please select a lifter from the list.';
      validStep = false;
    }

    // Male validation
    if (!maleOptions.includes(maleVal)) {
      document.getElementById('maleBestError').textContent =
        'Please select a lifter from the list.';
      validStep = false;
    }

    if (!validStep) {
      valid = false;
    }
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

// POST: action=resendLink&email=...
async function resendEditLink(email) {
  const formData = new FormData();
  formData.append('action', 'resendLink');
  formData.append('email', email);

  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.message || 'Could not send your private link.');
  }
  return true;
}

function openEmailExistsModal(emailVal) {
  pendingDuplicateEmail = emailVal;

  const modal = document.getElementById('emailExistsModal');
  const resendBtn = document.getElementById('resendLinkBtn');
  const cancelBtn = document.getElementById('cancelEmailExistsBtn');

  if (!modal || !resendBtn || !cancelBtn) {
    // Fallback: just show a status message.
    showStatus('This email already has an entry. Please use your private edit link.', true);
    return;
  }

  modal.classList.remove('hidden');

  // Ensure we don't stack listeners endlessly – overwrite handlers.
  resendBtn.onclick = async () => {
    try {
      showStatus('Sending your private edit link…', false);
      await resendEditLink(pendingDuplicateEmail);
      showStatus('Your private edit link has been emailed to you. Please use that link to update your entry.', false);
    } catch (err) {
      showStatus(err.message || 'Could not send your private link. Please try again later.', true);
    } finally {
      modal.classList.add('hidden');
    }
  };

  cancelBtn.onclick = () => {
    modal.classList.add('hidden');
    showStatus('Please enter a different email address to create a new entry.', true);
  };
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

  // Validate final step (Best Lifters). Previous pages are validated on navigation.
  const isValidLast = validateStep(3);
  if (!isValidLast) {
    scrollToFirstErrorWithinPage(2);
    return;
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
  if (currentPage > 0) {
    showPage(currentPage - 1);
    scrollToFormTop();
  }
});

nextBtn.addEventListener('click', async () => {
  // Not on last page yet
  if (currentPage < pages.length - 1) {
    // PAGE 0: Contact
    if (currentPage === 0) {
      const isValid = validateStep(0);
      if (!isValid) {
        scrollToFirstErrorWithinPage(0);
        return;
      }

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
            // Use popup modal for resend / cancel
            openEmailExistsModal(emailVal);

            nextBtn.disabled = false;
            backBtn.disabled = false;
            // Do NOT advance to next page
            return;
          }

          // No existing entry
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

      // Safe to move to Predictions page
      showPage(1);
      scrollToFormTop();
      return;
    }

    // PAGE 1: Women + Men predictions
    if (currentPage === 1) {
      clearErrors();
      let ok = true;

      // Validate Women (stepIndex 1) and Men (stepIndex 2) together
      if (!validateStep(1, { skipClear: true })) ok = false;
      if (!validateStep(2, { skipClear: true })) ok = false;

      if (!ok) {
        scrollToFirstErrorWithinPage(1);
        return;
      }

      // All good, go to Best Lifters
      showPage(2);
      scrollToFormTop();
      return;
    }
  } else {
    // Last page -> submit
    submitForm();
  }
});

// ========= INIT =========

document.addEventListener('DOMContentLoaded', async () => {
  initConfidenceOptions();
  buildBestLifterLists();
  showPage(0);
  await prefillIfToken();
  refreshConfidenceDisables();
});
