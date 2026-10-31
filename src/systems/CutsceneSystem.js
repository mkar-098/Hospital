// src/systems/CutsceneSystem.js
// Executes the 7-Step In-Engine 3D Cinematic Success Endings showing the Full 3D Doctor Model, CCTV Stinger, and Mission Report

class CutsceneSystem {
  constructor({
    scene,
    camera,
    gameState,
    doctorModel,
    lightingSystem,
    chaseSystem,
    inputManager,
    soundEngine,
    uiManager
  }) {
    this.scene = scene;
    this.camera = camera;
    this.gameState = gameState;
    this.doctorModel = doctorModel;
    this.lightingSystem = lightingSystem;
    this.chaseSystem = chaseSystem;
    this.inputManager = inputManager;
    this.soundEngine = soundEngine;
    this.uiManager = uiManager;

    this.active = false;
    this.timer = 0;
    this.duration = 5.5;
    this.stingerEntity = null;
    this.onCutsceneFinished = null;

    this.buildStingerSilhouette();
    this.bindEvents();
  }

  buildStingerSilhouette() {
    this.stingerEntity = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x020617 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.95, 0.3), mat);
    body.position.y = 0.98;
    const lEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    lEye.position.set(-0.08, 1.78, 0.16);
    const rEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    rEye.position.set(0.08, 1.78, 0.16);
    this.stingerEntity.add(body, lEye, rEye);
    this.stingerEntity.visible = false;
    this.scene.add(this.stingerEntity);
  }

  bindEvents() {
    const skipBtn = document.getElementById('btn-skip-cutscene');
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.active) {
          this.finishCutscene();
        }
      });
    }
  }

  startSuccessCutscene(onFinished) {
    this.inputManager.releasePointerLock();
    this.gameState.mode = 'CUTSCENE';
    this.active = true;
    this.timer = 0;
    this.onCutsceneFinished = onFinished;

    // Step 2: Halt all active chases and hazards
    this.chaseSystem.reset();
    this.gameState.isBlackout = false;

    // Step 3: Transition hospital lighting to warm, stabilized fluorescent illumination
    this.lightingSystem.setReliefLighting(true);

    // Step 4: Crossfade SoundEngine into RELIEF soundtrack
    if (this.soundEngine) {
      this.soundEngine.setAudioState('relief');
    }

    // Step 5: Show Full 3D Articulated Doctor Model and Cutscene HUD banner
    if (this.doctorModel) {
      this.doctorModel.setRenderContext('CUTSCENE');
    }

    const overlay = document.getElementById('cutscene-overlay');
    const captionEl = document.getElementById('cutscene-caption');
    const stingerFlash = document.getElementById('cutscene-stinger-flash');
    if (overlay) overlay.classList.remove('hidden');
    if (stingerFlash) stingerFlash.classList.add('hidden');

    const captions = {
      1: 'SHIFT 1 COMPLETE — Doctor signs off the Ward Roster at Nurses\' Station under steady warm lights...',
      2: 'SHIFT 2 COMPLETE — Pharmacy dispensary locked; walking toward Reception as calm returns...',
      3: 'SHIFT 3 COMPLETE — Basement breakers glow green; ascending the stairwell into the restored corridor...',
      4: 'SHIFT 4 COMPLETE — Reviewing sealed quarantine shutters on CAM 01 in the Surveillance Room...',
      5: 'SHIFT 5 COMPLETE — Restricted Wing Biohazard Blast Doors sealed; facility status: CONTAINMENT VERIFIED.'
    };
    if (captionEl) {
      captionEl.textContent = captions[this.gameState.shift] || captions[1];
    }
  }

  update(dt) {
    if (!this.active) return;

    this.timer += dt;
    const progress = Math.min(1, this.timer / this.duration);
    const s = this.gameState.shift;

    // Position the Full 3D Articulated Doctor Model and glide the 3D Cutscene Camera
    if (progress < 0.8) {
      this.stingerEntity.visible = false;
      const t = progress / 0.8;

      if (s === 1) {
        // Pan across Patient Ward to Nurses' Station
        this.doctorModel.fullRig.position.set(0, 0, 7.6);
        this.doctorModel.fullRig.rotation.y = Math.PI;
        this.camera.position.set(-4.5 + t * 6.5, 2.1, 10.5 - t * 1.5);
        this.camera.lookAt(0, 1.25, 6.8);
      } else if (s === 2) {
        // Doctor walks down North Hallway toward Reception
        const docZ = 10 + t * 8;
        this.doctorModel.fullRig.position.set(0, 0, docZ);
        this.doctorModel.fullRig.rotation.y = 0;
        this.camera.position.set(1.8, 1.85, docZ + 3.8);
        this.camera.lookAt(0, 1.3, docZ);
      } else if (s === 3) {
        // Ascending from Basement stairwell into main corridor
        const docZ = -14 + t * 10;
        const docY = docZ < -11 ? ((docZ + 11) / 8) * 4 : 0;
        this.doctorModel.fullRig.position.set(0, docY, docZ);
        this.doctorModel.fullRig.rotation.y = 0;
        this.camera.position.set(1.4, docY + 2.1, docZ + 3.6);
        this.camera.lookAt(0, docY + 1.2, docZ);
      } else if (s === 4) {
        // Reviewing CCTV Surveillance Console
        this.doctorModel.fullRig.position.set(-9.2, 0, -7.5);
        this.doctorModel.fullRig.rotation.y = -Math.PI / 2;
        this.camera.position.set(-6.5, 1.9, -9.5 + t * 4.0);
        this.camera.lookAt(-9.8, 1.2, -7.5);
      } else {
        // Shift 5 / Endless: Walking into Reception Lobby
        const docZ = 14 + t * 6;
        this.doctorModel.fullRig.position.set(0, 0, docZ);
        this.doctorModel.fullRig.rotation.y = 0;
        this.camera.position.set(-2.5 + t * 5.0, 2.2, 24.5);
        this.camera.lookAt(0, 1.3, docZ);
      }
    } else {
      // Subtle 1.1s Horror Post-Scene CCTV Stinger before fade to Mission Report
      this.stingerEntity.position.set(-18, 0, 6);
      this.stingerEntity.visible = true;
      this.camera.position.set(-11.5, 2.4, 6.2);
      this.camera.lookAt(-18, 1.2, 6);

      const stingerFlash = document.getElementById('cutscene-stinger-flash');
      if (stingerFlash) stingerFlash.classList.remove('hidden');
      const captionEl = document.getElementById('cutscene-caption');
      if (captionEl) {
        captionEl.textContent = '[CAM-01 RESIDUAL FEED: UNEXPLAINED SILHOUETTE DETECTED IN WARD CORRIDOR...]';
      }
    }

    if (this.timer >= this.duration) {
      this.finishCutscene();
    }
  }

  finishCutscene() {
    this.active = false;
    this.stingerEntity.visible = false;

    const overlay = document.getElementById('cutscene-overlay');
    const stingerFlash = document.getElementById('cutscene-stinger-flash');
    if (overlay) overlay.classList.add('hidden');
    if (stingerFlash) stingerFlash.classList.add('hidden');

    if (this.doctorModel) {
      this.doctorModel.setRenderContext('FPS');
    }
    this.lightingSystem.setReliefLighting(false);

    if (this.onCutsceneFinished) {
      const cb = this.onCutsceneFinished;
      this.onCutsceneFinished = null;
      cb();
    }
  }
}
