const t = window.translations[window.currentLang];

const ARTIFACTS_MAP = {
  "tent-marker":    { id: "tent",     name: t.tent,     info: t.info_tent,     era: t.era_tent,     region: t.region_tent,     src: "models/arabic_tent.glb",  icon: "⛺" },
  "dallah-marker":  { id: "dallah",   name: t.dallah,   info: t.info_dallah,   era: t.era_dallah,   region: t.region_dallah,   src: "models/saudi_dallah.glb", icon: "☕" },
  "sword-marker":   { id: "sword",    name: t.sword,    info: t.info_sword,    era: t.era_sword,    region: t.region_sword,    src: "models/arabic_sword.glb", icon: "⚔️" },
  "mubkhara-marker":{ id: "mubkhara", name: t.mubkhara, info: t.info_mubkhara, era: t.era_mubkhara, region: t.region_mubkhara, src: "models/mubkhara.glb",     icon: "🪔" }
};

// --- حفظ التقدم واستعادته من localStorage ---
const STORAGE_KEY = 'museum_ar_discovered';
const savedIds = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

let discoveredCount = 0;
const discoveredIds = new Set(savedIds);
discoveredCount = discoveredIds.size;

const welcomeScreen   = document.getElementById('welcome-screen');
const scanUi          = document.getElementById('scan-ui');
const model360View    = document.getElementById('model-360-view');
const doneScreen      = document.getElementById('done-screen');
const counterBadge    = document.getElementById('discovery-counter');
const arjsWrapper     = document.getElementById('arjs-scene-wrapper');

document.getElementById('btn-start').addEventListener('click', startTour);
document.getElementById('btn-back-scan').addEventListener('click', backToScan);
document.getElementById('btn-next').addEventListener('click', backToScan);
document.getElementById('btn-restart-tour').addEventListener('click', restartTour);

function updateCounterUI() {
  counterBadge.innerText = `${t.discovered} ${discoveredCount} / 4`;
  if (discoveredCount > 0) counterBadge.style.display = 'block';
}

// رسم علامات الاكتشاف على الماركرات في شاشة الترحيب
function refreshMarkerBadges() {
  const markerIds = ["tent", "dallah", "sword", "mubkhara"];
  markerIds.forEach(id => {
    const tile = document.querySelector(`.marker-tile[data-id="${id}"]`);
    if (!tile) return;
    const badge = tile.querySelector('.discovered-badge');
    if (discoveredIds.has(id)) {
      tile.classList.add('discovered');
      if (!badge) {
        const b = document.createElement('span');
        b.className = 'discovered-badge';
        b.setAttribute('aria-label', 'تم اكتشافه');
        b.innerText = '✓';
        tile.appendChild(b);
      }
    } else {
      tile.classList.remove('discovered');
      if (badge) badge.remove();
    }
  });
}

updateCounterUI();
refreshMarkerBadges();

// --- Toast قصير لإعلام الحفظ ---
function showSavedToast() {
  let toast = document.getElementById('saved-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'saved-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.innerText = t.collection_saved;
  toast.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

// --- Confetti احتفالي ---
function launchConfetti() {
  const container = document.createElement('div');
  container.id = 'confetti-container';
  container.setAttribute('aria-hidden', 'true');
  document.body.appendChild(container);

  const colors = ['#d1b15a', '#f5e08b', '#e8dcc4', '#8a7342', '#ffffff', '#c0a040', '#f0c060'];
  for (let i = 0; i < 90; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size  = Math.random() * 10 + 6;
    const isCircle = Math.random() > 0.5;
    piece.style.cssText = `
      width:${size}px;
      height:${isCircle ? size : size * 0.4}px;
      background:${color};
      left:${Math.random() * 100}%;
      animation-duration:${1.4 + Math.random() * 2}s;
      animation-delay:${Math.random() * 0.9}s;
      border-radius:${isCircle ? '50%' : '2px'};
      transform:rotate(${Math.random() * 360}deg);
    `;
    container.appendChild(piece);
  }

  setTimeout(() => { if (container.parentNode) container.remove(); }, 4500);
}

function startTour() {
  welcomeScreen.style.display = 'none';
  scanUi.style.display = 'flex';

  const langBtn = document.querySelector('.welcome-lang-btn');
  if (langBtn) langBtn.style.display = 'none';

  counterBadge.style.display = 'block';

  // لو كان اكتشف الكل من جلسة سابقة — اذهب لشاشة النهاية مباشرة
  if (discoveredIds.size >= 4) {
    scanUi.style.display = 'none';
    doneScreen.style.display = 'flex';
    counterBadge.style.display = 'none';
    return;
  }

  initAR();
}

function initAR() {
  arjsWrapper.innerHTML = `
    <a-scene embedded arjs="sourceType: webcam; debugUIEnabled: false;" renderer="logarithmicDepthBuffer: true;" vr-mode-ui="enabled: false">
      <a-marker type="pattern" url="markers/5tent-marker.patt" id="tent-marker"></a-marker>
      <a-marker type="pattern" url="markers/5dallah-marker.patt" id="dallah-marker"></a-marker>
      <a-marker type="pattern" url="markers/5sword-marker.patt" id="sword-marker"></a-marker>
      <a-marker type="pattern" url="markers/5mubkhara-marker.patt" id="mubkhara-marker"></a-marker>
      <a-entity camera></a-entity>
    </a-scene>
  `;

  setTimeout(() => {
    Object.keys(ARTIFACTS_MAP).forEach(markerId => {
      const markerEl = document.getElementById(markerId);
      if (markerEl) {
        markerEl.addEventListener('markerFound', () => onMarkerFound(markerId));
      }
    });
  }, 1000);
}

function onMarkerFound(markerId) {
  const artifact = ARTIFACTS_MAP[markerId];
  if (!discoveredIds.has(artifact.id)) {
    discoveredIds.add(artifact.id);
    discoveredCount++;
    updateCounterUI();

    // حفظ في localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...discoveredIds]));
    showSavedToast();
    refreshMarkerBadges();
  }
  show360View(artifact);
}

function show360View(artifact) {
  scanUi.style.display = 'none';
  arjsWrapper.style.display = 'none';
  model360View.style.display = 'flex';

  document.getElementById('viewer-title').innerText = artifact.name;

  // بطاقة المعلومات الموسعة
  const infoEl = document.getElementById('viewer-info');
  infoEl.innerHTML = `
    <p class="artifact-desc">${artifact.info}</p>
    <div class="artifact-meta">
      <span class="meta-chip" aria-label="${t.label_era}">
        <strong>${t.label_era}:</strong> ${artifact.era}
      </span>
      <span class="meta-chip" aria-label="${t.label_region}">
        <strong>${t.label_region}:</strong> ${artifact.region}
      </span>
    </div>
  `;

  const mvElement = document.getElementById('mv-element');
  const mvLoading = document.getElementById('mv-loading');

  mvElement.style.visibility = 'hidden';
  mvLoading.style.display = 'flex';
  mvElement.src = artifact.src;
  mvElement.alt = artifact.name;

  mvElement.addEventListener('load', () => {
    mvLoading.style.display = 'none';
    mvElement.style.visibility = 'visible';
  }, { once: true });
}

function backToScan() {
  if (discoveredCount >= 4) {
    model360View.style.display = 'none';
    doneScreen.style.display = 'flex';
    counterBadge.style.display = 'none';
    launchConfetti();
  } else {
    model360View.style.display = 'none';
    scanUi.style.display = 'flex';
    arjsWrapper.style.display = 'block';
  }
}

function restartTour() {
  discoveredCount = 0;
  discoveredIds.clear();
  localStorage.removeItem(STORAGE_KEY);
  updateCounterUI();
  refreshMarkerBadges();
  doneScreen.style.display = 'none';
  scanUi.style.display = 'flex';
  arjsWrapper.style.display = 'block';
  counterBadge.style.display = 'block';
}
