const t = window.translations[window.currentLang];

const ARTIFACTS_MAP = {
  "tent-marker": { id: "tent", name: t.tent, info: t.info_tent, src: "models/arabic_tent.glb" },
  "dallah-marker": { id: "dallah", name: t.dallah, info: t.info_dallah, src: "models/saudi_dallah.glb" },
  "sword-marker": { id: "sword", name: t.sword, info: t.info_sword, src: "models/arabic_sword.glb" },
  "mubkhara-marker": { id: "mubkhara", name: t.mubkhara, info: t.info_mubkhara, src: "models/mubkhara.glb" }
};

let discoveredCount = 0;
const discoveredIds = new Set();

// AR.js fires markerFound repeatedly while the marker stays visible; guard against duplicate UI.
let isShowingArtifact = false;
let initARTimer = null;
let mvLoadHandler = null;

const welcomeScreen = document.getElementById('welcome-screen');
const scanUi = document.getElementById('scan-ui');
const model360View = document.getElementById('model-360-view');
const doneScreen = document.getElementById('done-screen');
const counterBadge = document.getElementById('discovery-counter');
const arjsWrapper = document.getElementById('arjs-scene-wrapper');

document.getElementById('btn-start').addEventListener('click', startTour);
document.getElementById('btn-back-scan').addEventListener('click', backToScan);
document.getElementById('btn-next').addEventListener('click', backToScan);
document.getElementById('btn-restart-tour').addEventListener('click', restartTour);

function updateCounterUI() {
  counterBadge.innerText = `${t.discovered} ${discoveredCount} / 4`;
  if (discoveredCount > 0) counterBadge.style.display = 'block';
}
updateCounterUI();

function startTour() {
  welcomeScreen.style.display = 'none';
  scanUi.style.display = 'flex';
  
  // إخفاء زر اللغة عند بدء الجولة
  const langBtn = document.querySelector('.welcome-lang-btn');
  if (langBtn) langBtn.style.display = 'none';
  
  counterBadge.style.display = 'block';
  initAR();
}

function initAR() {
  if (initARTimer) {
    clearTimeout(initARTimer);
    initARTimer = null;
  }
  isShowingArtifact = false;

  arjsWrapper.innerHTML = `
    <a-scene embedded arjs="sourceType: webcam; debugUIEnabled: false;" renderer="logarithmicDepthBuffer: true;" vr-mode-ui="enabled: false">
      <a-marker type="pattern" url="markers/tent-marker.patt" id="tent-marker"></a-marker>
      <a-marker type="pattern" url="markers/dallah-marker.patt" id="dallah-marker"></a-marker>
      <a-marker type="pattern" url="markers/sword-marker.patt" id="sword-marker"></a-marker>
      <a-marker type="pattern" url="markers/mubkhara-marker.patt" id="mubkhara-marker"></a-marker>
      <a-entity camera></a-entity>
    </a-scene>
  `;

  initARTimer = setTimeout(() => {
    initARTimer = null;
    Object.keys(ARTIFACTS_MAP).forEach(markerId => {
      const markerEl = document.getElementById(markerId);
      if (markerEl) {
        markerEl.addEventListener('markerFound', () => onMarkerFound(markerId));
      }
    });
  }, 1000);
}

function onMarkerFound(markerId) {
  if (isShowingArtifact) return;
  const artifact = ARTIFACTS_MAP[markerId];
  if (!artifact) return;
  isShowingArtifact = true;
  if (!discoveredIds.has(artifact.id)) {
    discoveredIds.add(artifact.id);
    discoveredCount++;
    updateCounterUI();
  }
  show360View(artifact);
}

function show360View(artifact) {
  scanUi.style.display = 'none';
  arjsWrapper.style.display = 'none';
  model360View.style.display = 'flex';

  document.getElementById('viewer-title').innerText = artifact.name;
  document.getElementById('viewer-info').innerText = artifact.info;

  const mvElement = document.getElementById('mv-element');
  const mvLoading = document.getElementById('mv-loading');

  if (mvLoadHandler) {
    mvElement.removeEventListener('load', mvLoadHandler);
    mvLoadHandler = null;
  }

  mvLoadHandler = () => {
    mvLoading.style.display = 'none';
    mvElement.style.visibility = 'visible';
    mvElement.removeEventListener('load', mvLoadHandler);
    mvLoadHandler = null;
  };

  mvElement.addEventListener('load', mvLoadHandler);
  mvElement.src = artifact.src;
  queueMicrotask(() => {
    if (mvLoadHandler && mvElement.loaded) {
      mvLoadHandler();
    }
  });
}

function backToScan() {
  isShowingArtifact = false;
  if (discoveredCount >= 4) {
    model360View.style.display = 'none';
    doneScreen.style.display = 'flex';
    counterBadge.style.display = 'none';
  } else {
    model360View.style.display = 'none';
    scanUi.style.display = 'flex';
    arjsWrapper.style.display = 'block';
  }
}

function restartTour() {
  isShowingArtifact = false;
  discoveredCount = 0;
  discoveredIds.clear();
  updateCounterUI();
  doneScreen.style.display = 'none';
  scanUi.style.display = 'flex';
  arjsWrapper.style.display = 'block';
  counterBadge.style.display = 'block';
  initAR();
}