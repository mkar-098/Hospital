// src/main.js
// Application bootstrap, system wiring, shift lifecycle management, and requestAnimationFrame loop

class HospitalGameApp {
  constructor() {
    this.saveSystem = new SaveSystem();
    this.gameState = new GameState(this.saveSystem);
    this.soundEngine = new SoundEngine(this.saveSystem);
    this.missionSystem = new MissionSystem(this.gameState);

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.pendingBriefing = { shift: 1, isEndless: false, endlessHour: 1 };
    this.lastFrameTime = performance.now();
    this.headBobTimer = 0;

    this.initThreeScene();
    this.initSystems();
    this.prepareMenuPreviewWorld();

    window.addEventListener('resize', () => this.onWindowResize());
    requestAnimationFrame((t) => this.loop(t));
  }

  initThreeScene() {
    const container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070a);
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.042);

    const fov = this.saveSystem.data.settings.fov || 70;
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      0.08,
      120
    );
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const isHigh = (this.saveSystem.data.settings.graphicsQuality || 'HIGH') === 'HIGH';
    this.renderer.shadowMap.enabled = isHigh;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);
  }

  initSystems() {
    this.doorSystem = new DoorSystem(this.scene, this.soundEngine);
    this.lightingSystem = new LightingSystem(this.scene, this.gameState, this.soundEngine);
    this.hospitalBuilder = new HospitalBuilder(this.scene, this.doorSystem, this.lightingSystem);
    this.doctorModel = new DoctorModel(this.scene, this.camera, this.gameState);
    this.patientAI = new PatientAI(this.scene, this.gameState);

    this.inputManager = new InputManager(this.gameState, {
      onInteract: () => {
        if (this.taskSystem) this.taskSystem.triggerInteraction(this.camera);
      },
      onToggleFlashlight: () => {
        this.lightingSystem.toggleFlashlight();
        if (this.uiManager) this.uiManager.updateHUD();
      },
      onToggleCCTV: (remote) => {
        if (this.cctvSystem) this.cctvSystem.toggleCCTVModal(remote);
      },
      onEscape: () => this.handleEscapeKey()
    });

    this.uiManager = new UIManager({
      gameState: this.gameState,
      saveSystem: this.saveSystem,
      missionSystem: this.missionSystem,
      inputManager: this.inputManager,
      soundEngine: this.soundEngine,
      doctorModel: this.doctorModel,
      callbacks: {
        onOpenBriefing: (shiftNum, isEndless, endlessHour) => {
          this.pendingBriefing = { shift: shiftNum, isEndless, endlessHour };
          this.uiManager.openBriefingModal(shiftNum, isEndless, endlessHour);
        },
        onBeginShift: () => {
          this.uiManager.closeBriefingModal();
          this.startShift(
            this.pendingBriefing.shift,
            this.pendingBriefing.isEndless,
            this.pendingBriefing.endlessHour
          );
        },
        onRestartShift: () => {
          this.pendingBriefing = {
            shift: this.gameState.shift,
            isEndless: this.gameState.isEndless,
            endlessHour: this.gameState.endlessHour
          };
          this.uiManager.openBriefingModal(
            this.gameState.shift,
            this.gameState.isEndless,
            this.gameState.endlessHour
          );
        },
        onReturnMainMenu: () => {
          this.chaseSystem.reset();
          this.lightingSystem.setReliefLighting(false);
          this.soundEngine.setAudioState('calm');
          this.uiManager.showMainMenu();
        },
        onNextShiftOrWave: () => {
          if (this.gameState.isEndless) {
            const nextHour = this.gameState.endlessHour + 1;
            this.pendingBriefing = { shift: 5, isEndless: true, endlessHour: nextHour };
            this.uiManager.openBriefingModal(5, true, nextHour);
          } else if (this.gameState.shift < 5) {
            const nextShift = this.gameState.shift + 1;
            this.pendingBriefing = { shift: nextShift, isEndless: false, endlessHour: 1 };
            this.uiManager.openBriefingModal(nextShift, false, 1);
          } else {
            this.pendingBriefing = { shift: 5, isEndless: true, endlessHour: 1 };
            this.uiManager.openBriefingModal(5, true, 1);
          }
        },
        onToggleFlashlight: () => {
          this.lightingSystem.toggleFlashlight();
          this.uiManager.updateHUD();
        },
        onToggleCCTV: (remote) => {
          this.cctvSystem.toggleCCTVModal(remote);
        },
        onInteract: () => {
          this.taskSystem.triggerInteraction(this.camera);
        },
        onApplyGraphics: (quality) => {
          const high = quality === 'HIGH';
          this.renderer.shadowMap.enabled = high;
          this.scene.fog.density = high ? 0.042 : 0.025;
        }
      }
    });

    this.chaseSystem = new ChaseSystem(
      this.scene,
      this.gameState,
      this.doorSystem,
      this.hospitalBuilder,
      this.soundEngine,
      this.uiManager
    );
    this.chaseSystem.onPlayerEliminated = (reason) => {
      this.handleMissionFailure(reason);
    };

    this.dossierSystem = new DossierSystem({
      gameState: this.gameState,
      doorSystem: this.doorSystem,
      missionSystem: this.missionSystem,
      chaseSystem: this.chaseSystem,
      inputManager: this.inputManager,
      soundEngine: this.soundEngine,
      uiManager: this.uiManager
    });

    this.cctvSystem = new CCTVSystem({
      scene: this.scene,
      renderer: this.renderer,
      gameState: this.gameState,
      doctorModel: this.doctorModel,
      missionSystem: this.missionSystem,
      inputManager: this.inputManager,
      soundEngine: this.soundEngine,
      uiManager: this.uiManager
    });

    this.cutsceneSystem = new CutsceneSystem({
      scene: this.scene,
      camera: this.camera,
      gameState: this.gameState,
      doctorModel: this.doctorModel,
      lightingSystem: this.lightingSystem,
      chaseSystem: this.chaseSystem,
      inputManager: this.inputManager,
      soundEngine: this.soundEngine,
      uiManager: this.uiManager
    });

    this.taskSystem = new TaskSystem({
      gameState: this.gameState,
      hospitalBuilder: this.hospitalBuilder,
      doorSystem: this.doorSystem,
      missionSystem: this.missionSystem,
      dossierSystem: this.dossierSystem,
      cctvSystem: this.cctvSystem,
      chaseSystem: this.chaseSystem,
      doctorModel: this.doctorModel,
      soundEngine: this.soundEngine,
      uiManager: this.uiManager,
      onShiftCompleted: () => this.handleShiftSuccess()
    });
  }

  prepareMenuPreviewWorld() {
    this.hospitalBuilder.build();
    this.gameState.patients = PatientGenerator.generateRoster(1, false, 1);
    this.patientAI.spawnPatients(this.gameState.patients);
    this.missionSystem.initShiftObjectives();
    this.uiManager.updateHUD();
  }

  startShift(shiftNum = 1, isEndless = false, endlessHour = 1) {
    this.soundEngine.init();
    this.soundEngine.setAudioState('calm');

    const prevEndlessLives =
      isEndless && endlessHour > 1 && this.gameState.isEndless
        ? Math.min(3, Math.max(1, this.gameState.lives) + 1)
        : 3;

    this.gameState.resetForShift(shiftNum, isEndless, endlessHour);
    if (isEndless && endlessHour > 1) {
      this.gameState.lives = prevEndlessLives;
    }

    const cfg = SHIFTS_CONFIG[Math.max(0, Math.min(SHIFTS_CONFIG.length - 1, shiftNum - 1))];
    this.gameState.timeLeft = isEndless ? 540 : cfg.timeLimit;
    this.gameState.totalShiftTime = this.gameState.timeLeft;

    if (!isEndless) {
      this.saveSystem.markGameStarted(shiftNum);
    }

    this.hospitalBuilder.build();
    this.gameState.patients = PatientGenerator.generateRoster(shiftNum, isEndless, endlessHour);
    this.patientAI.spawnPatients(this.gameState.patients);

    if (cfg.startBlackout) {
      this.gameState.isBlackout = true;
      this.gameState.breakerRestored = false;
      this.gameState.breakerSwitches = [false, false, false];
      this.hospitalBuilder.updateBreakerVisuals(this.gameState.breakerSwitches);
    }

    this.cctvSystem.configureForShift();
    this.missionSystem.initShiftObjectives();
    this.chaseSystem.reset();
    this.doctorModel.applyCosmetics();
    this.doctorModel.setRenderContext('FPS');
    this.lightingSystem.setReliefLighting(false);

    this.gameState.mode = 'PLAYING';
    this.uiManager.hideMainMenu();
    this.uiManager.updateHUD();
    this.uiManager.showToast(
      isEndless
        ? `ENDLESS SHIFT HOUR ${endlessHour} STARTED — CHECK NURSES' STATION`
        : `${cfg.title} STARTED — CHECK OBJECTIVES ON LEFT`,
      'cyan'
    );
  }

  handleShiftSuccess() {
    this.uiManager.showToast('ALL OBJECTIVES COMPLETED — SECURING FACILITY', 'emerald');

    const stats = {
      accuracy: this.gameState.getAccuracy(),
      grade: this.gameState.getGrade(),
      timeUsed: Math.round(this.gameState.elapsedTime)
    };

    let rewards = [];
    if (this.gameState.isEndless) {
      this.saveSystem.recordEndlessHour(this.gameState.endlessHour);
      rewards = [`Endless Hour ${this.gameState.endlessHour} Cleared`, '+1 Life Restored for Next Wave'];
    } else {
      rewards = this.saveSystem.recordShiftCompletion(this.gameState.shift, stats);
    }

    this.cutsceneSystem.startSuccessCutscene(() => {
      this.uiManager.openMissionSuccessReport(rewards);
    });
  }

  handleMissionFailure(reason) {
    this.chaseSystem.reset();
    this.uiManager.openMissionFailureModal(reason);
  }

  handleEscapeKey() {
    const isVisible = (id) => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden');
    };

    if (isVisible('settings-modal')) {
      this.uiManager.closeSettingsModal();
      return;
    }
    if (isVisible('cosmetics-modal')) {
      this.uiManager.closeCosmeticsModal();
      return;
    }
    if (isVisible('mission-select-modal')) {
      this.uiManager.closeMissionSelectModal();
      return;
    }
    if (isVisible('credits-modal')) {
      this.uiManager.closeCreditsModal();
      return;
    }
    if (isVisible('briefing-modal')) {
      this.uiManager.closeBriefingModal();
      this.uiManager.showMainMenu();
      return;
    }

    const mode = this.gameState.mode;
    if (mode === 'DOSSIER') {
      this.dossierSystem.closeDossier();
    } else if (mode === 'CCTV') {
      this.cctvSystem.closeCCTVModal();
    } else if (mode === 'PLAYING' || mode === 'PAUSED') {
      this.uiManager.togglePauseMenu();
    }
  }

  updatePlayerFirstPerson(dt) {
    const p = this.gameState.player;
    const move = this.inputManager.getMovementInput();

    if (move.isMoving) {
      const forwardX = -Math.sin(p.yaw);
      const forwardZ = -Math.cos(p.yaw);
      const rightX = Math.cos(p.yaw);
      const rightZ = -Math.sin(p.yaw);

      const vx = (forwardX * move.forward + rightX * move.right) * move.speed;
      const vz = (forwardZ * move.forward + rightZ * move.right) * move.speed;

      const resolved = this.hospitalBuilder.resolveMovement(
        p.x,
        p.y,
        p.z,
        p.x + vx * dt,
        p.z + vz * dt,
        0.38
      );
      p.x = resolved.x;
      p.y = resolved.y;
      p.z = resolved.z;

      this.headBobTimer += dt * (move.isRunning ? 12 : 7.5);
    } else {
      this.headBobTimer = 0;
    }

    this.soundEngine.updateFootsteps(dt, move.isMoving, move.isRunning);
    this.gameState.updatePlayerLocation();

    // Update First-Person Camera position & rotation (Eye Height = 1.65m)
    const bobOffset = move.isMoving ? Math.sin(this.headBobTimer) * (move.isRunning ? 0.045 : 0.022) : 0;
    this.camera.position.set(p.x, p.y + 1.65 + bobOffset, p.z);
    this.camera.rotation.y = p.yaw;
    this.camera.rotation.x = p.pitch;
    this.camera.rotation.z = 0;
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min(0.1, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    const mode = this.gameState.mode;

    if (mode === 'MENU' || mode === 'BRIEFING') {
      // Atmospheric slow pan around Nurses' Station in background
      const angle = now * 0.00025;
      this.camera.position.set(Math.sin(angle) * 3.5, 1.85, 6 + Math.cos(angle) * 2.5);
      this.camera.lookAt(0, 1.2, 6);
      this.doctorModel.update(dt);
      this.doctorModel.setRenderContext('CCTV');
      this.lightingSystem.update(dt, this.camera, []);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (mode === 'CUTSCENE') {
      this.doorSystem.update(dt);
      this.doctorModel.update(dt);
      this.cutsceneSystem.update(dt);
      this.lightingSystem.update(dt, this.camera, []);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (mode === 'PLAYING' || mode === 'DOSSIER' || mode === 'CCTV') {
      // Advance shift countdown timer
      this.gameState.elapsedTime += dt;
      this.gameState.timeLeft = Math.max(0, this.gameState.timeLeft - dt);
      if (this.gameState.timeLeft <= 0) {
        this.handleMissionFailure('SHIFT TIME EXPIRED — CONTAINMENT BREACH');
        return;
      }

      if (mode === 'PLAYING') {
        this.updatePlayerFirstPerson(dt);
      }

      this.doorSystem.update(dt);
      this.doctorModel.update(dt);
      this.patientAI.update(dt, this.camera);
      this.chaseSystem.update(dt);

      const glitchedPositions = this.patientAI.getGlitchedWorldPositions();
      this.lightingSystem.update(dt, this.camera, glitchedPositions);

      const target = this.taskSystem.findBestTarget(this.camera);
      const reticle = document.getElementById('center-reticle');
      if (reticle) {
        reticle.classList.toggle('reticle-active', !!target);
      }

      this.uiManager.updateHUD();
      this.uiManager.update3DWaypoint(this.camera, target);
    }

    if (mode === 'CCTV') {
      this.cctvSystem.renderActiveFeed(dt);
    }

    this.doctorModel.setRenderContext(mode === 'CUTSCENE' ? 'CUTSCENE' : 'FPS');
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__HOSPITAL_GAME__ = new HospitalGameApp();
});
