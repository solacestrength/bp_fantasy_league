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
// We now use PAGES:
//   Page 0 -> Step 1 (Contact)
//   Page 1 -> Steps 2 & 3 (Women + Men predictions)
//   Page 2 -> Step 4 (Best lifters)
let currentPage = 0;
const TOTAL_PAGES = 3;

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

function scrollToFirstErrorOnCurrentPage() {
  // Only look inside currently visible steps
  const visibleSteps = steps.filter(step => step.style.display !== 'none');
  let firstErrorEl = null;

  for (const step of visibleSteps) {
    const errs = step.querySelectorAll('[id$="Error"]');
    for (const el of errs) {
      if (el.textContent && el.textContent.trim() !== '') {
        firstErrorEl = el;
        break;
      }
    }
    if (firstErrorEl) break;
  }

  if (firstErrorEl) {
    const rect = firstErrorEl.getBoundingClientRect();
    const targetY = rect.top + window.pageYOffset - 100;
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

// Page-level show/hide logic
function showPage(pageIndex) {
  currentPage = pageIndex;

  // Page 0 -> show step[0] only
  // Page 1 -> show step[1] + step[2]
  // Page 2 -> show step[3] only
  steps.forEach((step, idx) => {
    let show = false;
    if (pageIndex === 0) {
      show = (idx === 0);
    } else if (pageIndex === 1) {
      show = (idx === 1 || idx === 2);
    } else if (pageIndex === 2) {
      show = (idx === 3);
    }
    step.style.display = show ? 'block' : 'none';
  });

  // Update step label at the top of the page
  if (stepLabel) {
    if (pageIndex === 0) {
      stepLabel.textContent = 'Step 1 of 4 – Contact';
    } else if (pageIndex === 1) {
      stepLabel.textContent = 'Steps 2 & 3 of 4 – Predictions';
    } else if (pageIndex === 2) {
      stepLabel.textContent = 'Step 4 of 4 – Best Lifters';
    } else {
      stepLabel.textContent = '';
    }
  }

  // Back button visibility
  if (backBtn) {
    backBtn.style.visibility = pageIndex === 0 ? 'hidden' : 'visible';
  }

  // Next button label
  if (nextBtn) {
    nextBtn.textContent = (pageIndex === TOTAL_PAGES - 1) ? 'Submit' : 'Next';
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

    // Special "clear all" option AFTER 16
    const clearOpt = document.createElement('option');
    clearOpt.value = '__clear_all__';
    clearOpt.textContent = 'Clear all ratings';
    sel.appendChild(clearOpt);

    // Track previous value
    sel.dataset.prevValue = sel.value || '';
  });

  // Attach event listeners AFTER we build all options
  confSelects.forEach(sel => {
    // Update prevValue when focused
    sel.addEventListener('focus', () => {
      sel.dataset.prevValue = sel.value || '';
    });

    sel.addEventListener('change', () => {
      const newVal = sel.value;
      const prevVal = sel.dataset.prevValue || '';

      if (newVal === '__clear_all__') {
        const confirmClear = window.confirm(
          'Are you sure you want to clear ALL confidence ratings (1–16) across all classes?'
        );
        if (confirmClear) {
          // Clear all ratings
          confSelects.forEach(s2 => {
            s2.value = '';
            s2.dataset.prevValue = '';
          });
          refreshConfidenceDisables();
          showStatus('All confidence ratings have been cleared.', false);
        } else {
          // Revert to previous value
          sel.value = prevVal;
        }
      } else {
        // Normal selection
        sel.dataset.prevValue = newVal;
        refreshConfidenceDisables();
      }
    });
  });
}

function refreshConfidenceDisables() {
  const used = new Set(
    confSelects
      .map(sel => sel.value)
      .filter(v => v !== '' && v !== '__clear_all__')
  );

  confSelects.forEach(sel => {
    const current = sel.value;
    Array.from(sel.options).forEach(opt => {
      if (!opt.value || opt.value === '__clear_all__') return; // skip placeholder + clear-all
      opt.disabled = used.has(opt.value) && opt.value !== current;
    });
  });
}

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

// Step 1 (Contact) validation
function validateContactStep() {
  clearErrors();
  let valid = true;

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

  return valid;
}

// Page 2 (Women + Men predictions) validation
function validatePredictionsPage() {
  clearErrors();
  let valid = true;

  // Women – winners & confidence required + total pattern
  femaleClasses.forEach(cls => {
    const wSel = document.getElementById('w' + cls);
    const cSel = document.getElementById('c' + cls);
    const tInput = document.getElementById('t' + cls);

    if (wSel && !wSel.value) {
      setError('w' + cls + 'Error', 'Please pick a winner.');
      valid = false;
    }
    if (cSel && !cSel.value) {
      setError('c' + cls + 'Error', 'Please choose a confidence rating.');
      valid = false;
    }

    if (tInput) {
      const v = tInput.value.trim();
      if (v !== '' && !totalRegex.test(v)) {
        setError('t' + cls + 'Error', 'Use 0–2000 in steps of 0.5 (e.g. 865 or 865.5).');
        valid = false;
      }
    }
  });

  // Men – winners & confidence required + total pattern
  maleClasses.forEach(cls => {
    const wSel = document.getElementById('w' + cls);
    const cSel = document.getElementById('c' + cls);
    const tInput = document.getElementById('t' + cls);

    if (wSel && !wSel.value) {
      setError('w' + cls + 'Error', 'Please pick a winner.');
      valid = false;
    }
    if (cSel && !cSel.value) {
      setError('c' + cls + 'Error', 'Please choose a confidence rating.');
      valid = false;
    }

    if (tInput) {
      const v = tInput.value.trim();
      if (v !== '' && !totalRegex.test(v)) {
        setError('t' + cls + 'Error', 'Use 0–2000 in steps of 0.5 (e.g. 865 or 865.5).');
        valid = false;
      }
    }
  });

  // Ensure confidence ratings are unique across ALL 16 classes
  const allValues = confSelects
    .map(sel => sel.value)
    .filter(v => v !== '' && v !== '__clear_all__');
  const unique = new Set(allValues);

  if (allValues.length !== 16 || unique.size !== 16) {
    showStatus('Each confidence rating 1–16 must be used exactly once across all weight classes.', true);
    valid = false;
  }

  return valid;
}

// Step 4 (Best lifters) validation
function validateBestLiftersStep() {
  clearErrors();
  let valid = true;

  const femaleInput = document.getElementById("femaleBest");
  const maleInput   = document.getElementById("maleBest");

  const femaleOptions = [...document.querySelectorAll("#femaleBestList option")]
    .map(o => o.value.trim().toLowerCase());

  const maleOptions = [...document.querySelectorAll("#maleBestList option")]
    .map(o => o.value.trim().toLowerCase());

  const femaleVal = femaleInput.value.trim().toLowerCase();
  const maleVal   = maleInput.value.trim().toLowerCase();

  // Female validation
  if (!femaleOptions.includes(femaleVal)) {
    document.getElementById("femaleBestError").textContent =
      "Please select a lifter from the list.";
    valid = false;
  }

  // Male validation
  if (!maleOptions.includes(maleVal)) {
    document.getElementById("maleBestError").textContent =
      "Please select a lifter from the list.";
    valid = false;
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

    // After setting confidence values, refresh disables + prevValue
    confSelects.forEach(sel => {
      sel.dataset.prevValue = sel.value || '';
    });
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

  // 1) Contact
  if (!validateContactStep()) {
    showPage(0);
    scrollToFirstErrorOnCurrentPage();
    return;
  }

  // 2) Predictions page (women + men)
  if (!validatePredictionsPage()) {
    showPage(1);
    scrollToFirstErrorOnCurrentPage();
    return;
  }

  // 3) Best lifters
  if (!validateBestLiftersStep()) {
    showPage(2);
    scrollToFirstErrorOnCurrentPage();
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

// ========= NAVIGATION (PAGE-BASED) =========

if (backBtn) {
  backBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      showPage(currentPage - 1);
      scrollToFormTop();
    }
  });
}

if (nextBtn) {
  nextBtn.addEventListener('click', async () => {
    // PAGE 0 -> validate contact + duplicate email check
    if (currentPage === 0) {
      if (!validateContactStep()) {
        scrollToFirstErrorOnCurrentPage();
        return;
      }

      const emailVal = emailInput.value.trim().toLowerCase();
      const tokenVal = tokenInput.value.trim();

      // Only check duplicates for brand-new entries
      if (emailVal && !tokenVal) {
        try {
          showStatus('Checking email…', false);
          nextBtn.disabled = true;
          backBtn.disabled = true;

          const exists = await checkEmailExists(emailVal);

          if (exists) {
            // Popup: send link or cancel (using confirm for now)
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
            // 🔒 Do NOT advance to Page 2 in either case
            return;
          }

          // No existing entry -> proceed
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

      // Safe to move to Page 2 (Predictions)
      showPage(1);
      scrollToFormTop();
      return;
    }

    // PAGE 1 -> validate predictions across BOTH Women + Men
    if (currentPage === 1) {
      if (!validatePredictionsPage()) {
        scrollToFirstErrorOnCurrentPage();
        return;
      }
      showPage(2);
      scrollToFormTop();
      return;
    }

    // PAGE 2 -> final submit (Best lifters validated inside)
    if (currentPage === 2) {
      if (!validateBestLiftersStep()) {
        scrollToFirstErrorOnCurrentPage();
        return;
      }
      submitForm();
    }
  });
}

// ========= INIT =========

document.addEventListener('DOMContentLoaded', async () => {
  initConfidenceOptions();
  buildBestLifterLists();
  showPage(0);
  await prefillIfToken();
});
