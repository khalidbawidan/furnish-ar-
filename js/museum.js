const t = window.translations[window.currentLang];

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const ARTIFACTS = [
  { id: "tent",     name: t.tent,     src: "models/arabic_tent.glb",  scale: "18 18 18",          thumb: "markers/tent-marker.png" },
  { id: "dallah",   name: t.dallah,   src: "models/saudi_dallah.glb", scale: "0.5 0.5 0.5",       thumb: "markers/dallah-marker.png" },
  { id: "sword",    name: t.sword,    src: "models/arabic_sword.glb", scale: "0.03 0.03 0.03",    thumb: "markers/sword-marker.png" },
  { id: "mubkhara", name: t.mubkhara, src: "models/mubkhara.glb",     scale: "0.005 0.005 0.005", thumb: "markers/mubkhara-marker.png" }
];

document.addEventListener("DOMContentLoaded", () => {
  if (isIOS) { initIOSMode(); return; }
  let selectedSrc   = ARTIFACTS[0].src;
  let selectedScale = ARTIFACTS[0].scale;
  let selectedId    = ARTIFACTS[0].id;
  let activeModel   = null;
  let isTourMode    = false;
  const placedModels = [];   // سجل كل النماذج المُوضعة

  const itemsRow        = document.getElementById('museum-items');
  const instructionBadge = document.getElementById('ar-instruction');
  const bottomPanel     = document.getElementById('bottom-panel');
  const btnCustomAr     = document.getElementById('btn-custom-ar');
  const btnPlaceModel   = document.getElementById('btn-place-model');
  const arLoading       = document.getElementById('ar-loading');
  const scene           = document.querySelector('a-scene');
  const cameraEl        = document.querySelector('a-camera');
  const topBar          = document.querySelector('.top-bar');

  const heightCtrl  = document.getElementById('height-ctrl');
  const heightRange = document.getElementById('height-range');
  const btnStartTour = document.getElementById('btn-start-tour');
  const btnEndTour   = document.getElementById('btn-end-tour');
  const thankYouScreen = document.getElementById('thank-you-screen');
  const btnUndoModel = document.getElementById('btn-undo-model');

  // بناء الكاروسيل مع الأيقونات
  ARTIFACTS.forEach((art, index) => {
    const btn = document.createElement('div');
    btn.className = 'ar-item-btn' + (index === 0 ? ' active' : '');
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', art.name);
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = `<img class="item-thumb" src="${art.thumb}" alt="${art.name}" /><span class="item-label">${art.name}</span>`;

    btn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.ar-item-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSrc   = art.src;
      selectedScale = art.scale;
      selectedId    = art.id;

      if (heightRange) heightRange.value = 0;
      if (scene.is('ar-mode')) instructionBadge.innerText = `${t.selected} ${art.name} ${t.drop}`;
    };
    itemsRow.appendChild(btn);
  });

  scene.addEventListener('enter-vr', () => {
    if (scene.is('ar-mode')) {
      btnCustomAr.style.display   = 'none';
      bottomPanel.style.display   = 'block';
      btnPlaceModel.style.display = 'block';

      if (heightCtrl)   heightCtrl.style.display   = 'flex';
      if (btnStartTour) btnStartTour.style.display  = 'block';
      if (btnUndoModel) btnUndoModel.style.display  = 'block';

      instructionBadge.style.display    = 'block';
      instructionBadge.innerText        = t.cam_down;
      instructionBadge.style.background = "rgba(0, 0, 0, 0.7)";
      instructionBadge.style.color      = "var(--sand)";
    }
  });

  if (btnStartTour) {
    btnStartTour.addEventListener('click', (e) => {
      e.stopPropagation();
      isTourMode = true;
      bottomPanel.style.display   = 'none';
      if (heightCtrl)   heightCtrl.style.display   = 'none';
      if (btnUndoModel) btnUndoModel.style.display  = 'none';
      btnPlaceModel.style.display = 'none';
      topBar.style.display        = 'none';
      btnStartTour.style.display  = 'none';
      btnEndTour.style.display    = 'block';
    });
  }

  if (btnEndTour) {
    btnEndTour.addEventListener('click', (e) => {
      e.stopPropagation();
      btnEndTour.style.display          = 'none';
      thankYouScreen.style.display      = 'flex';
      setTimeout(() => { window.location.href = 'index.html'; }, 3500);
    });
  }

  // زر Undo — حذف آخر نموذج مُوضع
  if (btnUndoModel) {
    btnUndoModel.addEventListener('click', (e) => {
      e.stopPropagation();
      if (placedModels.length === 0) {
        instructionBadge.style.display = 'block';
        instructionBadge.innerText     = t.no_models_placed;
        setTimeout(() => { instructionBadge.innerText = t.cam_down; }, 2000);
        return;
      }
      const last = placedModels.pop();
      if (last && last.parentNode) last.parentNode.removeChild(last);
      activeModel = placedModels[placedModels.length - 1] || null;

      instructionBadge.style.display = 'block';
      instructionBadge.innerText     = '🗑 ' + t.delete_last;
      setTimeout(() => { instructionBadge.innerText = t.instructions; }, 2000);
    });
  }

  if (heightRange) {
    heightRange.addEventListener('input', (e) => {
      if (activeModel) {
        const newY = parseFloat(e.target.value);
        activeModel.object3D.position.y = newY;
        instructionBadge.innerText = `${t.height} ${newY.toFixed(2)} m`;
      }
    });
  }

  btnPlaceModel.addEventListener('click', (e) => {
    e.stopPropagation();
    arLoading.style.display     = 'block';
    btnPlaceModel.style.display = 'none';
    if (heightRange) heightRange.value = 0;

    const camera3D  = cameraEl.object3D;
    const direction = new AFRAME.THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera3D.quaternion);
    direction.y = 0;
    direction.normalize();

    const spawnPos = new AFRAME.THREE.Vector3();
    spawnPos.copy(camera3D.position).add(direction.multiplyScalar(1.2));
    spawnPos.y = 0;

    const targetModel = document.createElement('a-entity');
    targetModel.setAttribute('gltf-model', selectedSrc);
    targetModel.setAttribute('position', `${spawnPos.x} ${spawnPos.y} ${spawnPos.z}`);
    targetModel.setAttribute('scale', '0 0 0');

    targetModel.addEventListener('model-loaded', () => {
      arLoading.style.display     = 'none';
      btnPlaceModel.style.display = 'block';
      targetModel.setAttribute('animation', { property: 'scale', to: selectedScale, dur: 600, easing: 'easeOutElastic' });
      instructionBadge.innerText        = t.instructions;
      instructionBadge.style.background = "rgba(212, 175, 55, 0.9)";
      instructionBadge.style.color      = "black";
    });

    scene.appendChild(targetModel);
    activeModel = targetModel;
    placedModels.push(targetModel);
  });

  let startX = 0, startY = 0;
  let initialRot = 0;
  let initialPinchDist = 0, initialAngle = 0;
  let initialScaleObj = {x:0, y:0, z:0};
  let initialPosObj   = {x:0, y:0, z:0};

  window.addEventListener('touchstart', (e) => {
    if (isTourMode || !activeModel || e.target.closest('button') || e.target.closest('.ar-item-btn') || e.target.closest('#height-ctrl') || e.target.closest('a')) return;
    if (e.touches.length === 1) {
      startX = e.touches[0].pageX; startY = e.touches[0].pageY;
      initialPosObj = activeModel.object3D.position.clone();
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      initialPinchDist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
      initialAngle     = Math.atan2(t2.pageY - t1.pageY, t2.pageX - t1.pageX);
      initialScaleObj  = activeModel.object3D.scale.clone();
      initialRot       = activeModel.object3D.rotation.y;
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (isTourMode || !activeModel || e.target.closest('button') || e.target.closest('.ar-item-btn') || e.target.closest('#height-ctrl') || e.target.closest('a')) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      const deltaX    = (e.touches[0].pageX - startX) * 0.004;
      const deltaY    = (e.touches[0].pageY - startY) * 0.004;
      const camHeading = cameraEl.object3D.rotation.y;
      const moveX = Math.cos(camHeading) * deltaX + Math.sin(camHeading) * deltaY;
      const moveZ = -Math.sin(camHeading) * deltaX + Math.cos(camHeading) * deltaY;
      activeModel.object3D.position.x = initialPosObj.x + moveX;
      activeModel.object3D.position.z = initialPosObj.z + moveZ;
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const dist   = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
      const angle  = Math.atan2(t2.pageY - t1.pageY, t2.pageX - t1.pageX);
      const scaleFactor = dist / initialPinchDist;
      activeModel.object3D.scale.set(initialScaleObj.x * scaleFactor, initialScaleObj.y * scaleFactor, initialScaleObj.z * scaleFactor);
      const angleDiff = angle - initialAngle;
      activeModel.object3D.rotation.y = initialRot - angleDiff;
    }
  }, { passive: false });
});

// ─── وضع iOS: AR Quick Look بدل WebXR ───────────────────────────────────────
function initIOSMode() {
  // أخفِ عناصر WebXR
  document.querySelector('a-scene').style.display          = 'none';
  document.getElementById('btn-custom-ar').style.display   = 'none';
  document.getElementById('btn-start-tour').style.display  = 'none';
  document.getElementById('btn-end-tour').style.display    = 'none';
  document.getElementById('height-ctrl').style.display     = 'none';
  document.getElementById('btn-place-model').style.display = 'none';
  document.getElementById('btn-undo-model').style.display  = 'none';
  document.getElementById('bottom-panel').style.display    = 'none';

  // أظهر واجهة iOS
  const overlay = document.getElementById('ui-overlay');
  overlay.style.justifyContent = 'flex-start';

  const iosContainer = document.createElement('div');
  iosContainer.className = 'ios-museum';
  iosContainer.innerHTML = `
    <h2 class="ios-museum-title">${t.page_title_museum}</h2>
    <p class="ios-museum-sub" style="color:var(--muted);font-size:0.9rem;margin:0 0 1.2rem;line-height:1.7;">
      ${currentLangLabel() === 'ar'
        ? 'اضغط على أي قطعة لعرضها بالواقع المعزز مباشرة على بيئتك الحقيقية عبر AR Quick Look'
        : 'Tap any artifact to view it in AR directly in your real environment via AR Quick Look'}
    </p>
    <div class="ios-artifacts-grid" id="ios-grid"></div>
  `;
  overlay.appendChild(iosContainer);

  const grid = document.getElementById('ios-grid');
  ARTIFACTS.forEach(art => {
    const card = document.createElement('div');
    card.className = 'ios-artifact-card';
    card.innerHTML = `
      <img src="${art.thumb}" alt="${art.name}" class="ios-artifact-thumb" />
      <p class="ios-artifact-name">${art.name}</p>
      <a class="ios-ar-btn" rel="ar" href="${art.src}">
        <img src="https://developer.apple.com/augmented-reality/quick-look/images/arkit-badge.png"
             alt="View in AR" style="height:44px;" />
      </a>
    `;
    grid.appendChild(card);
  });
}

function currentLangLabel() {
  return window.currentLang || 'ar';
}
