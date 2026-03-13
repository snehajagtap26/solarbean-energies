/**
 * Solarbean Energies - Shared app logic
 * Splash, tabs, form submit, auth, calculator
 */

function initSplash() {
  var splash = document.getElementById('splash');
  if (!splash) return;

  var btn = document.getElementById('splash-cta');

  function dismissSplash(scrollToMain) {
    if (!splash) return;
    splash.classList.add('splash-hidden');
    setTimeout(function () {
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    }, 550);
    if (scrollToMain) {
      var section = document.getElementById('consultation');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  if (btn) {
    btn.addEventListener('click', function () {
      dismissSplash(true);
    });
  }

  // Auto-dismiss after a few seconds for returning visitors
  setTimeout(function () {
    if (document.getElementById('splash')) {
      dismissSplash(false);
    }
  }, 7000);
}

function updateConsultationImage(target) {
  var img = document.getElementById('consultation-image');
  if (!img) return;
  var attr = 'data-src-' + target;
  var src = img.getAttribute(attr);
  if (src && img.src !== src) {
    img.src = src;
  }
}

function openConsultationTab(target) {
  var tabs = document.querySelectorAll('.form-tab');
  var panels = document.querySelectorAll('.form-panel');
  if (!tabs.length || !panels.length) return;

  tabs.forEach(function(t) {
    var tabTarget = t.getAttribute('data-tab');
    var isActive = tabTarget === target;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  panels.forEach(function(p) {
    var panelTarget = p.getAttribute('data-panel');
    p.classList.toggle('active', panelTarget === target);
  });

  updateConsultationImage(target);
}

function initConsultationTabs() {
  var tabs = document.querySelectorAll('.form-tab');
  if (!tabs.length) return;

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var target = tab.getAttribute('data-tab');
      openConsultationTab(target);
    });
  });

  var active = document.querySelector('.form-tab.active') || tabs[0];
  if (active) {
    openConsultationTab(active.getAttribute('data-tab'));
  }

  // expose helper for other handlers
  window.openConsultationTab = openConsultationTab;
}

function initConsultationForms() {
  function normalizeNumber(value) {
    if (value == null || value === '') return null;
    var normalized = String(value).trim();
    // allow plain numeric values or ranges like lt1500, gt3000
    var digitOnly = normalized.replace(/[^0-9.\-]/g, '');
    var num = Number(digitOnly);
    return Number.isFinite(num) ? num : null;
  }

  const forms = document.querySelectorAll('#form-residential, #form-housing, #form-commercial');
  forms.forEach(function(form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      var type = form.getAttribute('data-panel');
      var data = new FormData(form);
      var payload = {};
      data.forEach(function(v, k) { payload[k] = v.trim ? v.trim() : v; });

      try {
        console.log('Submitting consultation form', type, payload);

        let tableName = '';
        if (type === 'residential') {
          tableName = 'residential_consultations';
          payload = {
            full_name: payload.fullName,
            whatsapp: payload.whatsapp,
            pincode: payload.pincode,
            monthly_bill: normalizeNumber(payload['res-bill'] || payload.monthly_bill),
          };
        } else if (type === 'housing') {
          tableName = 'housing_consultations';
          payload = {
            full_name: payload.fullName,
            housing_name: payload.housingName,
            pincode: payload.pincode,
            whatsapp: payload.whatsapp,
            monthly_bill: normalizeNumber(payload.monthlyBill || payload['hou-bill']),
            designation: payload['hou-designation'],
            agm_status: payload.agmStatus,
          };
        } else if (type === 'commercial') {
          tableName = 'commercial_consultations';
          payload = {
            full_name: payload.fullName,
            company_name: payload.companyName,
            city: payload.city,
            pincode: payload.pincode,
            whatsapp: payload.whatsapp,
            avg_bill: normalizeNumber(payload.avgBill),
          };
        }

        if (!tableName) {
          throw new Error('Unknown consultation type: ' + type);
        }

        const loggedIn = await isLoggedIn();
        if (!loggedIn) {
          alert('Please log in or register before submitting a consultation request.');
          window.location.href = 'login.html';
          return;
        }

        const currentUser = await getLoggedInUser();
        if (!currentUser || !currentUser.id) {
          throw new Error('Could not resolve signed-in user.');
        }

        payload.user_id = currentUser.id;
        payload.created_at = new Date().toISOString();

        console.log('Inserting into', tableName, payload);
        const { error } = await supabaseClient.from(tableName).insert(payload);
        if (error) {
          console.error('Insert error', error);
          throw error;
        }

        alert('Consultation request submitted successfully!');
        form.reset();
        window.location.href = 'thankyou.html?type=' + encodeURIComponent(type);
      } catch (err) {
        console.error('Supabase insert error', err);
        alert('Unable to submit. ' + (err.message || 'Please try again.'));
      }
    });
  });
}

/**
 * Navigation interactions: dropdowns, solution cards, floating CTA
 */
function initNavInteractions() {
  function scrollToConsultation(targetTab) {
    if (typeof openConsultationTab === 'function' && targetTab) {
      openConsultationTab(targetTab);
    }
    var section = document.getElementById('consultation');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Any element with data-open-tab scrolls to consultation & selects tab
  var tabLinks = document.querySelectorAll('[data-open-tab]');
  tabLinks.forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      var target = el.getAttribute('data-open-tab');
      scrollToConsultation(target);
    });
  });

  var floating = document.getElementById('floating-cta');
  if (floating) {
    floating.addEventListener('click', function(e) {
      e.preventDefault();
      scrollToConsultation('residential');
    });
  }

  // Dropdown toggle support (click/touch + hover for slow cursor interactions)
  var dropdownToggles = document.querySelectorAll('.nav-dropdown-toggle');
  dropdownToggles.forEach(function(btn) {
    var parent = btn.closest('.nav-item-dropdown');

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!parent) return;
      var isOpen = parent.classList.contains('nav-open');
      document.querySelectorAll('.nav-item-dropdown.nav-open').forEach(function(open) {
        open.classList.remove('nav-open');
      });
      if (!isOpen) {
        parent.classList.add('nav-open');
      }
    });

    // Keep dropdown open by click until user clicks outside.
    // (Avoid hover-based close flicker on touch and fast pointer interaction.)
    // We leave the control with click handlers only.
    // No mouseenter/mouseleave needed for consistent behavior.

  });

  document.addEventListener('click', function(e) {
    var inside = e.target.closest('.nav-item-dropdown');
    if (!inside) {
      document.querySelectorAll('.nav-item-dropdown.nav-open').forEach(function(open) {
        open.classList.remove('nav-open');
      });
    }
  });
}

/**
 * Auth helpers - use sessionStorage for demo (no real backend)
 */
async function isLoggedIn() {
  const session = await getSession();
  return !!session;
}

async function getLoggedInUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error('getUser error', error);
    return null;
  }
  return data.user;
}

async function logout() {
  await logoutSupabase();
  window.location.href = 'index.html';
}

async function updateHeaderAuthState() {
  const actions = document.querySelector('.header-actions');
  if (!actions) return;

  const session = await getSession();
  if (session) {
    const user = await getLoggedInUser();
    actions.innerHTML = '';
    const welcome = document.createElement('span');
    welcome.textContent = 'Hello, ' + (user?.email?.split('@')[0] || 'User');
    welcome.style.marginRight = '0.8rem';
    welcome.style.fontWeight = '600';
    welcome.style.color = '#0f172a';

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn logout-btn';
    logoutBtn.type = 'button';
    logoutBtn.innerHTML = '\u23FB Logout';
    logoutBtn.addEventListener('click', function() {
      logout();
    });

    actions.appendChild(welcome);
    actions.appendChild(logoutBtn);
  } else {
    actions.innerHTML = '';
    const loginLink = document.createElement('a');
    loginLink.className = 'btn btn-outline';
    loginLink.href = 'login.html';
    loginLink.textContent = 'Login';

    const registerLink = document.createElement('a');
    registerLink.className = 'btn btn-primary';
    registerLink.href = 'register.html';
    registerLink.textContent = 'Sign up';

    actions.appendChild(loginLink);
    actions.appendChild(registerLink);
  }
}

/**
 * Redirect to login if not authenticated (use on dashboard page)
 */
async function requireAuth() {
  if (!(await isLoggedIn())) {
    window.location.href = 'index.html?loginRequired=1';
    return false;
  }
  return true;
}

/**
 * Redirect to homepage if already logged in (use on login/register pages)
 */
async function redirectIfLoggedIn() {
  if (await isLoggedIn()) {
    window.location.href = 'index.html';
    return true;
  }
  return false;
}

/**
 * Solar savings calculator
 * Inspired by public explanations in SolarSquare's calculator blog,
 * using simplified assumptions for system size, savings and ROI.
 */
function initSolarCalculator() {
  var form = document.getElementById('solar-calculator-form');
  if (!form) return;

  var pincodeInput = document.getElementById('calc-pincode');
  var billInput = document.getElementById('calc-bill');

  var sizeEl = document.getElementById('calc-system-size');
  var roofEl = document.getElementById('calc-roof-area');
  var monthlySaveEl = document.getElementById('calc-monthly-savings');
  var yearlySaveEl = document.getElementById('calc-yearly-savings');
  var plantCostEl = document.getElementById('calc-plant-cost');
  var subsidyEl = document.getElementById('calc-subsidy');
  var netCostEl = document.getElementById('calc-net-cost');
  var lifetimeSaveEl = document.getElementById('calc-lifetime-savings');
  var roiEl = document.getElementById('calc-roi');

  function formatINR(v) {
    return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    var bill = parseFloat((billInput.value || '').replace(/,/g, ''));
    if (!bill || bill < 500) bill = 500;
    if (bill > 100000) bill = 100000;

    // Basic assumptions for Indian rooftop solar
    var tariff = 8; // ₹/kWh
    var unitsPerKwMonth = 120; // ~4 units/day * 30

    var targetUnits = bill / tariff;
    var systemSize = Math.ceil((targetUnits / unitsPerKwMonth) * 10) / 10; // 0.1 kW steps
    if (systemSize < 1) systemSize = 1;
    if (systemSize > 15) systemSize = 15;

    var roofAreaPerKw = 80; // sq ft per kW
    var roofArea = Math.round(systemSize * roofAreaPerKw);

    var plantCostPerKw = 70000; // indicative cost before subsidy
    var plantCost = Math.round(systemSize * plantCostPerKw);

    // Simple residential subsidy approximation (for illustration only)
    var subsidy = 0;
    if (systemSize <= 1) {
      subsidy = 30000 * systemSize;
    } else if (systemSize <= 2) {
      subsidy = 30000 + (systemSize - 1) * 30000;
    } else if (systemSize <= 3) {
      subsidy = 60000 + (systemSize - 2) * 18000;
    } else {
      subsidy = 78000;
    }
    subsidy = Math.round(subsidy);
    if (subsidy > plantCost) subsidy = plantCost;

    var netCost = plantCost - subsidy;

    var monthlySavings = Math.min(bill, systemSize * unitsPerKwMonth * tariff);
    var yearlySavings = monthlySavings * 12;

    var years = 25;
    var lifetimeSavings = yearlySavings * years; // simplified, ignoring degradation / inflation

    var roi = netCost > 0 ? (lifetimeSavings / netCost / years) * 100 : 0;

    sizeEl.textContent = systemSize.toFixed(1) + ' kW';
    roofEl.textContent = roofArea + ' sq ft';
    monthlySaveEl.textContent = formatINR(Math.round(monthlySavings));
    yearlySaveEl.textContent = formatINR(Math.round(yearlySavings));
    plantCostEl.textContent = formatINR(plantCost);
    subsidyEl.textContent = '- ' + formatINR(subsidy);
    netCostEl.textContent = formatINR(netCost);
    lifetimeSaveEl.textContent = formatINR(Math.round(lifetimeSavings));
    roiEl.textContent = roi.toFixed(1) + '% p.a.';

    var resultsCard = document.querySelector('.calculator-results-card');
    if (resultsCard) {
      resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}
