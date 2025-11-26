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

const confSelects = Array.from(document.querySelectorAll('.conf-select'));

const femaleClasses = ['47w','52w','57w','63w','69w','76w','84w','84pw'];
const maleClasses   = ['59m','66m','74m','83m','93m','105m','120m','120pm'];

let currentStep = 0;


// ========= EMAIL EXISTS POPUP ELEMENTS =========
const emailExistsModal = document.getElementById('emailExistsModal');
const resendLinkBtn = document.getElementById('resendLinkBtn');
const cancelEmailExistsBtn = document.getElementById('cancelEmailExistsBtn');

let emailCheckAbortController = null;
let lastCheckedEmail = '';
let emailExistsData = null;


// ========= UTILITIES =========
function scrollToFormTop() {
  const formContainer = document.getElementById('form-container');
  const rect = formContainer.getBoundingClientRect();
  const targetY = rect.top + window.pageYOffset - 16;
  window.scrollTo({ top: targetY, behavior: 'smooth' });
}

function showStep(index) {
  steps.forEach((step, i) => step.style.display = i === index ? 'block' : 'none');
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
  statusEl.className =
    'text-sm mt-1 ' + (isError ? 'text-red-400' : 'text-green-400');
}

function clearErrors() {
  document.querySelectorAll('[id$="Error"]').forEach(el => el.textContent = '');
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}


// ========= CONFIDENCE RATING LOGIC =========
function initConfidenceOptions() {
  confSelects.forEach(sel => {
    sel.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = 'Select rating…';
    sel.appendChild(ph);

    for (let i = 1; i <= 16; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = String(i);
      sel.appendChild(opt);
    }
  });
}

function refreshConfidenceDisables() {
  const used = new Set(confSelects.map(sel => sel.value).filter(Boolean));
  confSelects.forEach(sel => {
    const current = sel.value;
    Array.from(sel.options).forEach(opt => {
      if (!opt.value) return;
      opt.disabled = used.has(opt.value) && opt.value !== current;
    });
  });
}

confSelects.forEach(sel =>
  sel.addEventListener('change', refreshConfidenceDisables)
);


// ========= BUILD BEST LIFTER SEARCH LISTS =========
function buildBestLifterLists() {
  const femaleOptions = new Set();
  const maleOptions = new Set();

  femaleClasses.forEach(cls => {
    const sel = document.getElementById('w' + cls);
    Array.from(sel.options).forEach(opt => {
      if (opt.value) femaleOptions.add(opt.textContent);
    });
  });

  maleClasses.forEach(cls => {
    const sel = document.getElementById('w' + cls);
    Array.from(sel.options).forEach(opt => {
      if (opt.value) maleOptions.add(opt.textContent);
    });
  });

  femaleBestList.innerHTML = '';
  maleBestList.innerHTML = '';

  femaleOptions.forEach(name => {
    const o = document.createElement('option');
    o.value = name;
    femaleBestList.appendChild(o);
  });

  maleOptions.forEach(name => {
    const o = document.createElement('option');
    o.value = name;
    maleBestList.appendChild(o);
  });
}


// ========= VALIDATION =========
const totalRegex = /^(?:[0-9]|[1-9][0-9]{1,2}|1[0-9]{3}|2000)(?:\.0|\.5)?$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStep(stepIndex) {
  clearErrors();
  let valid = true;

  if (stepIndex === 0) {
    const emailVal = emailInput.value.trim().toLowerCase();
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
    femaleClasses.forEach(cls => {
      const w = document.getElementById('w' + cls).value;
      const c = document.getElementById('c' + cls).value;
      const t = document.getElementById('t' + cls).value.trim();

      if (!w) { setError('w' + cls + 'Error', 'Please pick a winner.'); valid = false; }
      if (!c) { setError('c' + cls + 'Error', 'Please choose a rating.'); valid = false; }
      if (t && !totalRegex.test(t)) {
        setError('t' + cls + 'Error', '0–2000 in steps of 0.5');
        valid = false;
      }
    });
  }

  if (stepIndex === 2) {
    maleClasses.forEach(cls => {
      const w = document.getElementById('w' + cls).value;
      const c = document.getElementById('c' + cls).value;
      const t = document.getElementById('t' + cls).value.trim();

      if (!w) { setError('w' + cls + 'Error', 'Please pick a winner.'); valid = false; }
      if (!c) { setError('c' + cls + 'Error', 'Please choose a rating.'); valid = false; }
      if (t && !totalRegex.test(t)) {
        setError('t' + cls + 'Error', '0–2000 in steps of 0.5');
        valid = false;
      }
    });

    const allValues = confSelects.map(sel => sel.value).filter(Boolean);
    if (allValues.length !== 16 || new Set(allValues).size !== 16) {
      showStatus('Each confidence rating must be used once.', true);
      valid = false;
    }
  }

  if (stepIndex === 3) {
    const femaleVal = femaleBestInput.value.trim().toLowerCase();
    const maleVal = maleBestInput.value.trim().toLowerCase();

    const femaleOptions = [...document.querySelectorAll('#femaleBestList option')]
      .map(o => o.value.trim().toLowerCase());

    const maleOptions = [...document.querySelectorAll('#maleBestList option')]
      .map(o => o.value.trim().toLowerCase());

    if (!femaleOptions.includes(femaleVal)) {
      setError('femaleBestError', 'Please select from the list.');
      return false;
    }

    if (!maleOptions.includes(maleVal)) {
      setError('maleBestError', 'Please select from the list.');
      return false;
    }
  }

  return valid;
}


// ========= PREFILL LOGIC =========
async function prefillIfToken() {
  const params = new URLSearchParams(window.location.search);
  const t = params.get('token');
  if (!t) return;

  tokenInput.value = t;

  try {
    showStatus('Loading your saved entry…');
    const res = await fetch(`${SCRIPT_URL}?action=prefill&token=${encodeURIComponent(t)}`);
    const json = await res.json();

    if (!json.ok) {
      showStatus(json.message || 'Could not load saved entry.', true);
      return;
    }

    const d = json.data;

    emailInput.value = d.email;
    igInput.value = d.instagramHandle;
    leaderboardInput.value = d.leaderboardName;

    emailInput.readOnly = true;
    emailInput.classList.add('bg-gray-700', 'cursor-not-allowed');

    femaleClasses.forEach(cls => {
      document.getElementById('w' + cls).value = d['w' + cls] || '';
      document.getElementById('t' + cls).value = d['t' + cls] || '';
      document.getElementById('c' + cls).value = d['c' + cls] || '';
    });

    maleClasses.forEach(cls => {
      document.getElementById('w' + cls).value = d['w' + cls] || '';
      document.getElementById('t' + cls).value = d['t' + cls] || '';
      document.getElementById('c' + cls).value = d['c' + cls] || '';
    });

    femaleBestInput.value = d.femaleBest || '';
    maleBestInput.value = d.maleBest || '';

    refreshConfidenceDisables();
    showStatus('Your entry has been loaded.');
  } catch (err) {
    showStatus('Error loading saved entry.', true);
  }
}


// ========= REAL-TIME EMAIL CHECK (NEW FEATURE) =========
emailInput.addEventListener('input', () => {
  const email = emailInput.value.trim().toLowerCase();
  if (!email || !emailRegex.test(email)) return;

  if (email === lastCheckedEmail) return;
  lastCheckedEmail = email;

  if (emailCheckAbortController) {
    emailCheckAbortController.abort();
  }
  emailCheckAbortController = new AbortController();

  fetch(`${SCRIPT_URL}?action=checkEmail&email=${encodeURIComponent(email)}`, {
    signal: emailCheckAbortController.signal
  })
    .then(res => res.json())
    .then(json => {
      if (json.exists) {
        emailExistsData = json;

        emailExistsModal.classList.remove('hidden');
      }
    })
    .catch(() => {});
});


// ========= POPUP BUTTON HANDLERS =========
cancelEmailExistsBtn.addEventListener('click', () => {
  emailExistsModal.classList.add('hidden');
});

resendLinkBtn.addEventListener('click', async () => {
  if (!emailExistsData || !emailExistsData.email) return;

  resendLinkBtn.disabled = true;
  resendLinkBtn.textContent = 'Sending…';

  try {
    const fd = new FormData();
    fd.append('email', emailExistsData.email);
    fd.append('action', 'resendLink');

    await fetch(SCRIPT_URL, { method: 'POST', body: fd });

    resendLinkBtn.textContent = 'Link sent!';
  } catch (err) {
    resendLinkBtn.textContent = 'Error — try again';
  }

  setTimeout(() => {
    emailExistsModal.classList.add('hidden');
    resendLinkBtn.disabled = false;
    resendLinkBtn.textContent = 'Send My Link';
  }, 1500);
});


// ========= SUBMIT =========
async function submitForm() {
  clearErrors();
  showStatus('');

  emailInput.value = emailInput.value.trim().toLowerCase();

  for (let s = 0; s < steps.length; s++) {
    if (!validateStep(s)) {
      showStep(s);
      return;
    }
  }

  showStatus('Submitting your entry…');
  nextBtn.disabled = true;
  backBtn.disabled = true;

  try {
    const fd = new FormData(form);
    const res = await fetch(SCRIPT_URL, { method: 'POST', body: fd });
    const json = await res.json();

    if (!json.ok) {
      showStatus(json.message || 'Error saving your entry.', true);
      nextBtn.disabled = false;
      backBtn.disabled = false;
      return;
    }

    showStatus('Entry saved! Check your email.', false);

    if (json.token) {
      const link = `https://solacestrength.github.io/britishclassicfl/entry.html?token=${encodeURIComponent(json.token)}`;
      const linkBox = document.getElementById('edit-link-box');

      if (linkBox) {
        linkBox.innerHTML = `
          <div class="p-4 mt-4 rounded-lg bg-gray-800 border border-gray-700 text-center text-sm text-gray-200">
            <p class="font-semibold mb-2">Your private edit link:</p>
            <a href="${link}" class="text-blue-400 break-all" target="_blank">${link}</a>
            <p class="text-gray-400 mt-2">(This has also been emailed to you.)</p>
          </div>
        `;
      }
    }
  } catch (err) {
    showStatus('Network or server error.', true);
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

nextBtn.addEventListener('click', () => {
  if (currentStep < steps.length - 1) {
    if (!validateStep(currentStep)) return;
    showStep(currentStep + 1);
    scrollToFormTop();
  } else {
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
