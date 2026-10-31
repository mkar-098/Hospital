// src/systems/CCTVSystem.js
// Manages 4 real Three.js security cameras, live rendering to #cctv-canvas, 6 anomaly types, evidence logging, and signal recalibration

const CCTV_ANOMALY_TYPES = [
  'NONE',
  'STATIC_LOSS',
  'LOOP_DESYNC',
  'MISSING_FIGURE',
  'GHOST_SILHOUETTE',
  'DISTORTED_IMAGE',
  'CAM_HIJACK'
];

class CCTVSystem {
  constructor({
    scene,
    renderer,
    gameState,
    doctorModel,
    missionSystem,
    inputManager,
    soundEngine,
    uiManager
  }) {
    this.scene = scene;
    this.renderer = renderer;
    this.gameState = gameState;
    this.doctorModel = doctorModel;
    this.missionSystem = missionSystem;
    this.inputManager = inputManager;
    this.soundEngine = soundEngine;
    this.uiManager = uiManager;

    this.cameras = [];
    this.channelStates = []; // { anomaly, isCorrupted, recalibrated }
    this.panTimer = 0;

    this.initCameras();
    this.bindEvents();
  }

  initCameras() {
    this.cameras = [];
    this.channelStates = [];

    for (const cfg of CCTV_CAMERAS) {
      const cam = new THREE.PerspectiveCamera(cfg.fov, 16 / 9, 0.1, 80);
      cam.position.set(cfg.pos.x, cfg.pos.y, cfg.pos.z);
      cam.lookAt(cfg.lookAt.x, cfg.lookAt.y, cfg.lookAt.z);
      this.cameras.push({
        camera: cam,
        cfg,
        baseLookAt: new THREE.Vector3(cfg.lookAt.x, cfg.lookAt.y, cfg.lookAt.z)
      });

      this.channelStates.push({
        anomaly: 'NONE',
        anomalyDesc: 'NONE — SIGNAL NOMINAL',
        isCorrupted: false
      });
    }
  }

  configureForShift() {
    const s = this.gameState.shift;
    // Reset all channels
    for (let i = 0; i < this.channelStates.length; i++) {
      this.channelStates[i] = {
        anomaly: 'NONE',
        anomalyDesc: 'NONE — SIGNAL NOMINAL',
        isCorrupted: false
      };
    }

    // Check impostors in ward to assign deterministic CAM 01 anomaly
    const wardImpostors = this.gameState.patients.filter((p) => p.isImpostor);
    if (wardImpostors.length > 0) {
      const hasGlitch = wardImpostors.some((p) => p.impostorType === IMPOSTOR_TYPES.GLITCHED);
      const hasStalker = wardImpostors.some((p) => p.impostorType === IMPOSTOR_TYPES.STALKER);
      const hasPerfect = wardImpostors.some((p) => p.impostorType === IMPOSTOR_TYPES.PERFECT);

      if (hasGlitch) {
        this.channelStates[0] = {
          anomaly: 'DISTORTED_IMAGE',
          anomalyDesc: 'CHROMATIC TEAR & MISSING FIGURE IN WARD',
          isCorrupted: s >= 3
        };
      } else if (hasStalker) {
        this.channelStates[0] = {
          anomaly: 'GHOST_SILHOUETTE',
          anomalyDesc: 'UNIDENTIFIED SUBJECT STANDING AT WARD DOOR',
          isCorrupted: false
        };
      } else if (hasPerfect) {
        this.channelStates[0] = {
          anomaly: 'LOOP_DESYNC',
          anomalyDesc: 'PLAYBACK DESYNC — UNNATURAL SHADOW POSTURE DETECTED',
          isCorrupted: false
        };
      } else {
        this.channelStates[0] = {
          anomaly: 'MISSING_FIGURE',
          anomalyDesc: 'ANOMALOUS MOVEMENT SIGNATURE IN WARD CORRIDOR',
          isCorrupted: false
        };
      }
    }

    if (s >= 2) {
      this.channelStates[2] = {
        anomaly: 'STATIC_LOSS',
        anomalyDesc: 'HEAVY STATIC INTERFERENCE — RECALIBRATION ADVISED',
        isCorrupted: true
      };
    }
    if (s >= 3) {
      this.channelStates[1] = {
        anomaly: 'CAM_HIJACK',
        anomalyDesc: 'SIGNAL HIJACKED — ROUTING TO BASEMENT FEED',
        isCorrupted: true
      };
    }
  }

  bindEvents() {
    const camBtns = document.querySelectorAll('.cam-btn');
    camBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-cam') || '0', 10);
        this.selectCamera(idx);
      });
    });

    const recalBtn = document.getElementById('btn-recalibrate-cam');
    if (recalBtn) {
      recalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.recalibrateSignal(false);
      });
    }

    const logBtn = document.getElementById('btn-log-cctv-evidence');
    if (logBtn) {
      logBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.logCameraEvidence();
      });
    }

    const closeBtn = document.getElementById('btn-close-cctv');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeCCTVModal();
      });
    }
  }

  openCCTVModal(isRemoteTablet = true) {
    this.inputManager.releasePointerLock();
    this.gameState.mode = 'CCTV';
    this.gameState.cctvRemoteMode = isRemoteTablet;
    if (!isRemoteTablet) {
      this.gameState.cctvCheckedInRoom = true;
    }

    const modal = document.getElementById('cctv-modal');
    if (modal) modal.classList.remove('hidden');

    const modeBadge = document.getElementById('cctv-access-mode-badge');
    if (modeBadge) {
      modeBadge.textContent = isRemoteTablet
        ? 'REMOTE TABLET PREVIEW (WALK TO CCTV ROOM FOR HARDWARE RECALIBRATION)'
        : 'MASTER CCTV SURVEILLANCE CONSOLE (FULL HARDWARE ACCESS)';
      modeBadge.className = isRemoteTablet
        ? 'text-xs font-mono px-2.5 py-1 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40'
        : 'text-xs font-mono px-2.5 py-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40';
    }

    if (this.soundEngine) this.soundEngine.playUIClick();
    this.selectCamera(this.gameState.cctvActiveCam);
    this.missionSystem.evaluateObjectives();
    this.uiManager.updateHUD();
  }

  closeCCTVModal() {
    const modal = document.getElementById('cctv-modal');
    if (modal) modal.classList.add('hidden');
    if (this.gameState.mode === 'CCTV') {
      this.gameState.mode = 'PLAYING';
    }
    this.missionSystem.evaluateObjectives();
    this.uiManager.updateHUD();
  }

  toggleCCTVModal(isRemoteTablet = true) {
    if (this.gameState.mode === 'CCTV') {
      this.closeCCTVModal();
    } else if (this.gameState.mode === 'PLAYING') {
      this.openCCTVModal(isRemoteTablet);
    }
  }

  selectCamera(index) {
    this.gameState.cctvActiveCam = Math.max(0, Math.min(this.cameras.length - 1, index));
    if (this.soundEngine) this.soundEngine.playUIClick();

    const camBtns = document.querySelectorAll('.cam-btn');
    camBtns.forEach((btn) => {
      const bIdx = parseInt(btn.getAttribute('data-cam') || '0', 10);
      const isAct = bIdx === this.gameState.cctvActiveCam;
      btn.classList.toggle('active', isAct);
      btn.classList.toggle('border-cyan-500/60', isAct);
      btn.classList.toggle('bg-cyan-950/50', isAct);
      btn.classList.toggle('text-cyan-200', isAct);
      btn.classList.toggle('border-slate-800', !isAct);
      btn.classList.toggle('bg-slate-950/50', !isAct);
    });

    this.updateOverlayText();
  }

  updateOverlayText() {
    const idx = this.gameState.cctvActiveCam;
    const camObj = this.cameras[idx];
    const st = this.channelStates[idx];

    const labelEl = document.getElementById('cctv-cam-label');
    const statusEl = document.getElementById('cctv-status');
    const alertEl = document.getElementById('cctv-anomaly-alert');
    const staticEl = document.getElementById('cctv-static');

    if (labelEl) {
      labelEl.textContent =
        st.anomaly === 'CAM_HIJACK'
          ? `${camObj.cfg.name} [SIGNAL HIJACKED -> CAM 04]`
          : `${camObj.cfg.name} (${camObj.cfg.sector})`;
    }
    if (statusEl) {
      statusEl.textContent = st.isCorrupted
        ? 'STATUS: SIGNAL CORRUPTED — RECALIBRATION REQUIRED'
        : 'STATUS: ONLINE — SIGNAL STABLE';
      statusEl.className = st.isCorrupted
        ? 'text-xs font-mono text-red-400 font-bold'
        : 'text-xs font-mono text-emerald-400';
    }
    if (alertEl) {
      alertEl.textContent = `ANOMALY DETECTED: ${st.anomalyDesc}`;
      alertEl.className =
        st.anomaly !== 'NONE'
          ? 'text-xs font-mono text-amber-300 font-bold'
          : 'text-xs font-mono text-slate-400';
    }
    if (staticEl) {
      staticEl.classList.toggle('hidden', st.anomaly !== 'STATIC_LOSS' && !st.isCorrupted);
    }
  }

  logCameraEvidence() {
    this.gameState.cctvEvidenceLogged = true;
    if (
      !this.gameState.cctvRemoteMode ||
      this.gameState.player.currentLocationId === 'CCTV_ROOM'
    ) {
      this.gameState.cctvCheckedInRoom = true;
    }

    let loggedCount = 0;
    for (const p of this.gameState.patients) {
      if (p.isImpostor) {
        const clue =
          p.anomalyCluesByStep.cctv ||
          p.anomalyCluesByStep.records ||
          `CCTV CAM 01 EVIDENCE: Anomalous movement/posture logged in ${p.assignedRoom}.`;
        if (!p.investigation.cluesFound.includes(clue)) {
          p.investigation.cluesFound.push(clue);
        }
        p.investigation.scansCompleted.records = true;
        loggedCount++;
      }
    }

    if (this.soundEngine) this.soundEngine.playScanBeep();
    this.missionSystem.evaluateObjectives();
    this.uiManager.updateHUD();

    const alertEl = document.getElementById('cctv-anomaly-alert');
    if (alertEl) {
      alertEl.textContent = `EVIDENCE LOGGED TO MEDICAL DOSSIERS (${loggedCount} ANOMALOUS SIGNATURES RECORDED)`;
      alertEl.className = 'text-xs font-mono text-emerald-400 font-bold';
    }
    this.uiManager.showToast(
      'CCTV ANOMALY EVIDENCE LOGGED TO PATIENT DOSSIERS!',
      'emerald'
    );
  }

  recalibrateSignal(fromHardwareBox = false) {
    // Allow recalibration in CCTV Room or when clicking Recalibrate Signal
    const inCCTVRoom =
      fromHardwareBox ||
      !this.gameState.cctvRemoteMode ||
      this.gameState.player.currentLocationId === 'CCTV_ROOM';

    if (!inCCTVRoom && this.gameState.shift >= 2) {
      this.uiManager.showToast(
        'REMOTE RECALIBRATION BLOCKED — WALK TO THE CCTV SURVEILLANCE ROOM CONSOLE!',
        'amber'
      );
      return;
    }

    for (let i = 0; i < this.channelStates.length; i++) {
      this.channelStates[i].isCorrupted = false;
      if (this.channelStates[i].anomaly === 'STATIC_LOSS' || this.channelStates[i].anomaly === 'CAM_HIJACK') {
        this.channelStates[i].anomaly = 'NONE';
        this.channelStates[i].anomalyDesc = 'SIGNAL RECALIBRATED & STABILIZED';
      }
    }

    this.gameState.cctvRecalibratedCount++;
    if (inCCTVRoom) {
      this.gameState.cctvCheckedInRoom = true;
    }
    if (this.soundEngine) this.soundEngine.playTaskCompleteSFX();

    this.updateOverlayText();
    this.missionSystem.evaluateObjectives();
    this.uiManager.updateHUD();
    this.uiManager.showToast('CCTV SURVEILLANCE CHANNELS RECALIBRATED & STABILIZED', 'emerald');
  }

  renderActiveFeed(dt) {
    if (this.gameState.mode !== 'CCTV') return;

    const cctvCanvas = document.getElementById('cctv-canvas');
    if (!cctvCanvas || !this.renderer) return;

    this.panTimer += dt;
    const idx = this.gameState.cctvActiveCam;
    const st = this.channelStates[idx];

    // If CAM_HIJACK is active on this channel, render CAM 04 (Basement) instead!
    const renderIdx = st.anomaly === 'CAM_HIJACK' ? 3 : idx;
    const camEntry = this.cameras[renderIdx];
    const cam = camEntry.camera;

    // Subtle ±15° security camera pan
    const panOffset = Math.sin(this.panTimer * 0.45) * 2.2;
    cam.lookAt(
      camEntry.baseLookAt.x + panOffset * 0.4,
      camEntry.baseLookAt.y,
      camEntry.baseLookAt.z + panOffset * 0.4
    );

    // Show full 3D Doctor model in CCTV camera feeds
    if (this.doctorModel) {
      this.doctorModel.setRenderContext('CCTV');
    }

    this.renderer.render(this.scene, cam);

    if (this.doctorModel) {
      this.doctorModel.setRenderContext('FPS');
    }

    // Copy WebGL frame onto #cctv-canvas with night-vision CRT post-processing & anomaly effects
    if (cctvCanvas.width !== 640 || cctvCanvas.height !== 360) {
      cctvCanvas.width = 640;
      cctvCanvas.height = 360;
    }
    const ctx = cctvCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(this.renderer.domElement, 0, 0, 640, 360);

    // Green/cyan night-vision security tint
    ctx.fillStyle = 'rgba(6, 78, 59, 0.18)';
    ctx.fillRect(0, 0, 640, 360);

    // Horizontal scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    for (let y = 0; y < 360; y += 4) {
      ctx.fillRect(0, y, 640, 2);
    }

    // Anomaly visual overlays
    if (st.anomaly === 'GHOST_SILHOUETTE') {
      // Draw uncanny dark silhouette in corridor feed
      ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
      ctx.beginPath();
      ctx.arc(320, 150, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(300, 168, 40, 110);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(313, 146, 4, 4);
      ctx.fillRect(323, 146, 4, 4);
    } else if (st.anomaly === 'DISTORTED_IMAGE') {
      // Chromatic tear bars
      ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
      const tearY = Math.floor((this.panTimer * 90) % 320);
      ctx.fillRect(0, tearY, 640, 24);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.fillRect(0, (tearY + 140) % 340, 640, 16);
    } else if (st.anomaly === 'STATIC_LOSS' || st.isCorrupted) {
      for (let s = 0; s < 140; s++) {
        ctx.fillStyle = s % 2 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.45)';
        ctx.fillRect(
          (Math.random() * 640) | 0,
          (Math.random() * 360) | 0,
          (20 + Math.random() * 80) | 0,
          3
        );
      }
    }

    // Update live timestamp
    const timeEl = document.getElementById('cctv-time');
    if (timeEl) {
      if (st.anomaly === 'LOOP_DESYNC') {
        timeEl.textContent = '02:14:59 [LOOP DESYNC]';
      } else {
        const sec = Math.floor(this.panTimer) % 60;
        timeEl.textContent = `02:${(15 + Math.floor(this.panTimer / 60))
          .toString()
          .padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      }
    }
  }
}
