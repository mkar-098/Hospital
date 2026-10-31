// src/ui/UIManager.js
// Manages all UI screens, modals, persistent HUD, 3D screen-space waypoint projection, Settings, Cosmetics, and Mission Reports

class UIManager {
  constructor({
    gameState,
    saveSystem,
    missionSystem,
    inputManager,
    soundEngine,
    doctorModel,
    callbacks
  }) {
    this.gameState = gameState;
    this.saveSystem = saveSystem;
    this.missionSystem = missionSystem;
    this.inputManager = inputManager;
    this.soundEngine = soundEngine;
    this.doctorModel = doctorModel;
    this.callbacks = callbacks; // { onOpenBriefing, onBeginShift, onRestartShift, onReturnMainMenu, onNextShiftOrWave, onApplyGraphics }

    this.toastTimeout = null;
    this.bindAllUIButtons();
    this.syncMainMenuState();
    this.syncSettingsControls();
  }

  bindAllUIButtons() {
    const bindClick = (id, handler) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.soundEngine) {
          this.soundEngine.init();
          this.soundEngine.playUIClick();
        }
        handler(e);
      });
    };

    // --- MAIN MENU BUTTONS ---
    bindClick('btn-start-game', () => {
      if (this.callbacks.onOpenBriefing) this.callbacks.onOpenBriefing(1, false, 1);
    });

    bindClick('btn-continue-game', () => {
      const targetShift = this.saveSystem.data.highestUnlockedShift || 1;
      if (this.callbacks.onOpenBriefing) this.callbacks.onOpenBriefing(targetShift, false, 1);
    });

    bindClick('btn-mission-select', () => {
      this.openMissionSelectModal();
    });

    bindClick('btn-close-mission-select', () => {
      this.closeMissionSelectModal();
    });

    bindClick('btn-open-settings', () => {
      this.openSettingsModal();
    });

    bindClick('btn-close-settings', () => {
      this.closeSettingsModal();
    });

    bindClick('btn-open-credits', () => {
      this.openCreditsModal();
    });

    bindClick('btn-close-credits', () => {
      this.closeCreditsModal();
    });

    // --- MISSION BRIEFING BUTTONS ---
    bindClick('btn-begin-shift', () => {
      if (this.callbacks.onBeginShift) this.callbacks.onBeginShift();
    });

    bindClick('btn-briefing-back', () => {
      const modal = document.getElementById('briefing-modal');
      if (modal) modal.classList.add('hidden');
      if (this.callbacks.onReturnMainMenu) this.callbacks.onReturnMainMenu();
    });

    // --- GAMEPLAY HUD BUTTONS ---
    bindClick('btn-flashlight', () => {
      if (this.callbacks.onToggleFlashlight) this.callbacks.onToggleFlashlight();
    });

    bindClick('btn-camera-toggle', () => {
      if (this.callbacks.onToggleCCTV) this.callbacks.onToggleCCTV(true);
    });

    bindClick('btn-inspect', () => {
      if (this.callbacks.onInteract) this.callbacks.onInteract();
    });

    bindClick('interaction-prompt', () => {
      if (this.callbacks.onInteract) this.callbacks.onInteract();
    });

    bindClick('btn-mobile-run', () => {
      this.inputManager.mobileSprintToggle = !this.inputManager.mobileSprintToggle;
      const runBtn = document.getElementById('btn-mobile-run');
      if (runBtn) {
        runBtn.classList.toggle('bg-amber-600', this.inputManager.mobileSprintToggle);
      }
    });

    bindClick('btn-pause-hud', () => {
      this.togglePauseMenu();
    });

    bindClick('btn-mute-hud', () => {
      if (!this.soundEngine) return;
      const muted = this.soundEngine.toggleMute();
      const icon = document.getElementById('icon-mute-hud');
      if (icon) {
        icon.className = muted
          ? 'fa-solid fa-volume-xmark text-red-400'
          : 'fa-solid fa-volume-high';
      }
      this.showToast(muted ? 'AUDIO MUTED' : 'AUDIO UNMUTED', muted ? 'amber' : 'cyan');
    });

    bindClick('btn-settings-hud', () => {
      this.openSettingsModal();
    });

    // --- PAUSE MENU BUTTONS ---
    bindClick('btn-pause-resume', () => {
      this.closePauseMenu();
    });

    bindClick('btn-pause-restart', () => {
      this.closePauseMenu();
      if (this.callbacks.onRestartShift) this.callbacks.onRestartShift();
    });

    bindClick('btn-pause-settings', () => {
      this.openSettingsModal();
    });

    bindClick('btn-pause-menu', () => {
      this.closePauseMenu();
      if (this.callbacks.onReturnMainMenu) this.callbacks.onReturnMainMenu();
    });

    // --- COSMETICS LOCKER MODAL ---
    bindClick('btn-close-cosmetics', () => {
      this.closeCosmeticsModal();
    });

    // --- MISSION SUCCESS REPORT BUTTONS ---
    bindClick('btn-report-continue', () => {
      const modal = document.getElementById('mission-report-modal');
      if (modal) modal.classList.add('hidden');
      if (this.callbacks.onNextShiftOrWave) this.callbacks.onNextShiftOrWave();
    });

    bindClick('btn-report-menu', () => {
      const modal = document.getElementById('mission-report-modal');
      if (modal) modal.classList.add('hidden');
      if (this.callbacks.onReturnMainMenu) this.callbacks.onReturnMainMenu();
    });

    // --- MISSION FAILURE / GAME OVER BUTTONS ---
    bindClick('btn-restart-shift', () => {
      const modal = document.getElementById('game-over-screen');
      if (modal) modal.classList.add('hidden');
      if (this.callbacks.onRestartShift) this.callbacks.onRestartShift();
    });

    bindClick('btn-gameover-menu', () => {
      const modal = document.getElementById('game-over-screen');
      if (modal) modal.classList.add('hidden');
      if (this.callbacks.onReturnMainMenu) this.callbacks.onReturnMainMenu();
    });

    // --- SETTINGS CONTROLS ---
    const bindSlider = (id, key, labelId, isPercent = true) => {
      const slider = document.getElementById(id);
      if (!slider) return;
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.saveSystem.updateSettings({ [key]: val });
        const lbl = document.getElementById(labelId);
        if (lbl) {
          lbl.textContent = isPercent ? `${Math.round(val * 100)}%` : `${val.toFixed(1)}x`;
        }
        if (this.soundEngine) this.soundEngine.applySettingsVolumes();
      });
    };

    bindSlider('slider-music-vol', 'musicVol', 'val-music-vol', true);
    bindSlider('slider-ambient-vol', 'ambientVol', 'val-ambient-vol', true);
    bindSlider('slider-sfx-vol', 'sfxVol', 'val-sfx-vol', true);
    bindSlider('slider-mouse-sens', 'mouseSensitivity', 'val-mouse-sens', false);

    bindClick('btn-graphics-quality', () => {
      const curr = this.saveSystem.data.settings.graphicsQuality || 'HIGH';
      const next = curr === 'HIGH' ? 'LOW' : 'HIGH';
      this.saveSystem.updateSettings({ graphicsQuality: next });
      this.syncSettingsControls();
      if (this.callbacks.onApplyGraphics) this.callbacks.onApplyGraphics(next);
    });
  }

  syncMainMenuState() {
    const contBtn = document.getElementById('btn-continue-game');
    const contSub = document.getElementById('continue-shift-label');
    const hasSave =
      this.saveSystem.data.hasSaveData || this.saveSystem.data.highestUnlockedShift > 1;
    if (contBtn) {
      contBtn.classList.toggle('opacity-60', !hasSave);
    }
    if (contSub) {
      contSub.textContent = `SHIFT ${this.saveSystem.data.highestUnlockedShift || 1}`;
    }
  }

  syncSettingsControls() {
    const s = this.saveSystem.data.settings;
    const setVal = (id, val, lblId, text) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
      const lbl = document.getElementById(lblId);
      if (lbl) lbl.textContent = text;
    };

    setVal('slider-music-vol', s.musicVol ?? 0.7, 'val-music-vol', `${Math.round((s.musicVol ?? 0.7) * 100)}%`);
    setVal('slider-ambient-vol', s.ambientVol ?? 0.75, 'val-ambient-vol', `${Math.round((s.ambientVol ?? 0.75) * 100)}%`);
    setVal('slider-sfx-vol', s.sfxVol ?? 0.85, 'val-sfx-vol', `${Math.round((s.sfxVol ?? 0.85) * 100)}%`);
    setVal('slider-mouse-sens', s.mouseSensitivity ?? 1.0, 'val-mouse-sens', `${(s.mouseSensitivity ?? 1.0).toFixed(1)}x`);

    const gBtn = document.getElementById('btn-graphics-quality');
    if (gBtn) {
      gBtn.textContent = `${s.graphicsQuality || 'HIGH'} (SHADOWS & FOG)`;
    }
  }

  closeAllGameplayModals() {
    const ids = [
      'patient-modal',
      'cctv-modal',
      'pause-modal',
      'cosmetics-modal',
      'settings-modal',
      'mission-select-modal',
      'credits-modal',
      'briefing-modal',
      'mission-report-modal',
      'game-over-screen',
      'cutscene-overlay'
    ];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    }
  }

  showMainMenu() {
    this.inputManager.releasePointerLock();
    this.closeAllGameplayModals();
    this.gameState.mode = 'MENU';
    this.syncMainMenuState();
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.remove('hidden');
  }

  hideMainMenu() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');
  }

  openMissionSelectModal() {
    this.renderMissionSelectCards();
    this.renderCosmeticsAndAchievements('mission-cosmetics-container', 'mission-achievements-container');
    const modal = document.getElementById('mission-select-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeMissionSelectModal() {
    const modal = document.getElementById('mission-select-modal');
    if (modal) modal.classList.add('hidden');
  }

  renderMissionSelectCards() {
    const container = document.getElementById('mission-cards-grid');
    if (!container) return;

    const highest = this.saveSystem.data.highestUnlockedShift || 1;
    const records = this.saveSystem.data.shiftRecords || {};
    let html = '';

    for (const cfg of SHIFTS_CONFIG) {
      const unlocked = cfg.shift <= highest;
      const rec = records[cfg.shift];
      html += `
        <div class="p-4 rounded-xl border ${
          unlocked ? 'bg-slate-900/90 border-slate-700' : 'bg-slate-950/60 border-slate-800/60 opacity-60'
        } flex flex-col justify-between gap-3 text-left">
          <div>
            <div class="flex justify-between items-center">
              <span class="text-xs font-mono font-bold text-cyan-400">${cfg.title}</span>
              ${
                rec
                  ? `<span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">GRADE ${rec.grade} (${rec.accuracy}%)</span>`
                  : unlocked
                  ? `<span class="text-[11px] font-mono text-amber-300">UNLOCKED</span>`
                  : `<span class="text-[11px] font-mono text-slate-500"><i class="fa-solid fa-lock mr-1"></i>LOCKED</span>`
              }
            </div>
            <div class="text-xs text-slate-300 font-semibold mt-1">${cfg.subtitle}</div>
            <p class="text-[11px] text-slate-400 mt-1 line-clamp-2">${cfg.briefingSummary}</p>
          </div>
          <div class="flex justify-between items-center pt-2 border-t border-slate-800 text-xs font-mono">
            <span class="text-slate-400">${cfg.patientCount} Patients (${cfg.impostorCount} Impostors)</span>
            <button data-select-shift="${cfg.shift}" class="select-shift-launch-btn px-3 py-1.5 rounded-lg font-bold ${
        unlocked
          ? 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer'
          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
      }" ${unlocked ? '' : 'disabled'}>
              ${unlocked ? 'Launch Shift' : 'Locked'}
            </button>
          </div>
        </div>
      `;
    }

    // Endless Shift Card
    const endlessUnlocked = this.saveSystem.data.endlessUnlocked;
    const bestHour = this.saveSystem.data.bestEndlessHour || 0;
    html += `
      <div class="p-4 rounded-xl border ${
        endlessUnlocked ? 'bg-red-950/30 border-red-500/50' : 'bg-slate-950/60 border-slate-800/60 opacity-65'
      } flex flex-col justify-between gap-3 text-left">
        <div>
          <div class="flex justify-between items-center">
            <span class="text-xs font-mono font-bold text-red-400">ENDLESS SHIFT — WAVE SURVIVAL</span>
            <span class="text-[11px] font-mono text-amber-300">BEST: HOUR ${bestHour}</span>
          </div>
          <div class="text-xs text-slate-300 font-semibold mt-1">Progressive Night Waves & High-Grade Entities</div>
          <p class="text-[11px] text-slate-400 mt-1">Survive escalating hourly admissions across all 14 hospital sectors. Unlocked upon completing Shift 5.</p>
        </div>
        <div class="flex justify-between items-center pt-2 border-t border-slate-800 text-xs font-mono">
          <span class="text-slate-400">Wave Mode</span>
          <button id="btn-launch-endless" class="px-3 py-1.5 rounded-lg font-bold ${
            endlessUnlocked
              ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }" ${endlessUnlocked ? '' : 'disabled'}>
            ${endlessUnlocked ? 'Start Endless' : 'Complete Shift 5'}
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    container.querySelectorAll('.select-shift-launch-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sNum = parseInt(btn.getAttribute('data-select-shift') || '1', 10);
        this.closeMissionSelectModal();
        if (this.callbacks.onOpenBriefing) this.callbacks.onOpenBriefing(sNum, false, 1);
      });
    });

    const endlessBtn = document.getElementById('btn-launch-endless');
    if (endlessBtn && endlessUnlocked) {
      endlessBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeMissionSelectModal();
        if (this.callbacks.onOpenBriefing) this.callbacks.onOpenBriefing(5, true, 1);
      });
    }
  }

  renderCosmeticsAndAchievements(cosmeticsContainerId, achievementsContainerId) {
    const cosEl = document.getElementById(cosmeticsContainerId);
    if (cosEl) {
      const unlocked = this.saveSystem.data.unlockedCosmetics || [];
      const equipped = this.saveSystem.data.equippedCosmetics || {};
      let cHtml = '';

      for (const [cat, items] of Object.entries(COSMETICS_CATALOG)) {
        cHtml += `<div class="space-y-1.5"><div class="text-[11px] font-mono uppercase text-cyan-400 font-bold">${cat}</div><div class="grid grid-cols-1 sm:grid-cols-3 gap-2">`;
        for (const item of items) {
          const isUnl = unlocked.includes(item.id);
          const isEq = equipped[cat] === item.id;
          cHtml += `
            <button data-cos-cat="${cat}" data-cos-id="${item.id}" class="cosmetic-equip-btn p-2 rounded-lg border text-left text-xs font-mono transition ${
            isEq
              ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
              : isUnl
              ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
              : 'bg-slate-950 border-slate-800 text-slate-500 opacity-60'
          }" ${isUnl ? '' : 'disabled'}>
              <div class="font-bold">${item.name}</div>
              <div class="text-[10px] ${isEq ? 'text-emerald-400' : 'text-slate-400'}">${
            isEq ? '✓ EQUIPPED' : isUnl ? 'Click to Equip' : item.unlockText
          }</div>
            </button>
          `;
        }
        cHtml += `</div></div>`;
      }
      cosEl.innerHTML = cHtml;

      cosEl.querySelectorAll('.cosmetic-equip-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cat = btn.getAttribute('data-cos-cat');
          const id = btn.getAttribute('data-cos-id');
          if (this.saveSystem.equipCosmetic(cat, id)) {
            if (this.doctorModel) this.doctorModel.applyCosmetics();
            if (this.soundEngine) this.soundEngine.playUIClick();
            this.renderCosmeticsAndAchievements(cosmeticsContainerId, achievementsContainerId);
          }
        });
      });
    }

    const achEl = document.getElementById(achievementsContainerId);
    if (achEl) {
      const unlockedAch = this.saveSystem.data.unlockedAchievements || [];
      achEl.innerHTML = ACHIEVEMENTS_LIST.map((a) => {
        const has = unlockedAch.includes(a.id);
        return `
          <div class="p-2.5 rounded-lg border ${
            has ? 'bg-amber-950/30 border-amber-500/50 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-500'
          } flex items-center gap-2.5 text-left text-xs">
            <i class="fa-solid ${a.icon} text-base ${has ? 'text-amber-400' : 'text-slate-600'}"></i>
            <div>
              <div class="font-bold font-mono">${a.title} ${has ? '✓' : ''}</div>
              <div class="text-[11px] opacity-80">${a.desc}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  openCosmeticsModal() {
    this.inputManager.releasePointerLock();
    this.gameState.mode = 'PAUSED';
    this.renderCosmeticsAndAchievements('locker-cosmetics-container', 'locker-achievements-container');
    const modal = document.getElementById('cosmetics-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeCosmeticsModal() {
    const modal = document.getElementById('cosmetics-modal');
    if (modal) modal.classList.add('hidden');
    if (this.gameState.mode === 'PAUSED') {
      this.gameState.mode = 'PLAYING';
    }
  }

  openSettingsModal() {
    this.inputManager.releasePointerLock();
    if (this.gameState.mode === 'PLAYING') {
      this.settingsPausedGameplay = true;
      this.gameState.mode = 'PAUSED';
    }
    this.syncSettingsControls();
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
    if (this.settingsPausedGameplay) {
      this.settingsPausedGameplay = false;
      const pauseModal = document.getElementById('pause-modal');
      const cosModal = document.getElementById('cosmetics-modal');
      const pauseOpen = pauseModal && !pauseModal.classList.contains('hidden');
      const cosOpen = cosModal && !cosModal.classList.contains('hidden');
      if (this.gameState.mode === 'PAUSED' && !pauseOpen && !cosOpen) {
        this.gameState.mode = 'PLAYING';
      }
    }
  }

  openCreditsModal() {
    const modal = document.getElementById('credits-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeCreditsModal() {
    const modal = document.getElementById('credits-modal');
    if (modal) modal.classList.add('hidden');
  }

  openBriefingModal(shiftNum, isEndless = false, endlessHour = 1) {
    this.inputManager.releasePointerLock();
    this.closeAllGameplayModals();
    this.hideMainMenu();
    this.gameState.mode = 'BRIEFING';

    const cfg = SHIFTS_CONFIG[Math.max(0, Math.min(SHIFTS_CONFIG.length - 1, shiftNum - 1))];
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    if (isEndless) {
      setText('briefing-shift-title', `ENDLESS SHIFT — HOUR ${endlessHour}`);
      setText('briefing-subtitle', 'Continuous Biohazard Triage & Containment');
      setText('briefing-summary', 'Survive the next wave of night admissions. Identify and contain all impostors, approve genuine patients, maintain facility power, and report to the Nurses\' Station Lockdown Terminal.');
      setText('briefing-patients', `${Math.min(6, 4 + Math.floor(endlessHour / 2))} Ward Patients`);
      setText('briefing-threat', 'EXTREME');
      setText('briefing-time', '09:00');
    } else {
      setText('briefing-shift-title', cfg.title);
      setText('briefing-subtitle', cfg.subtitle);
      setText('briefing-summary', cfg.briefingSummary);
      setText('briefing-patients', `${cfg.patientCount} Patients (${cfg.impostorCount} Impostor${cfg.impostorCount > 1 ? 's' : ''})`);
      setText('briefing-threat', cfg.threatLevel);
      const mins = Math.floor(cfg.timeLimit / 60).toString().padStart(2, '0');
      const secs = (cfg.timeLimit % 60).toString().padStart(2, '0');
      setText('briefing-time', `${mins}:${secs}`);
    }

    const listEl = document.getElementById('briefing-instructions-list');
    if (listEl) {
      const endlessTaskDescriptions = [
        'Deliver prescribed medication from the Pharmacy to a genuine patient in the Ward.',
        'Retrieve the misplaced Medical File from Reception and deliver it to the Nurses\' Station.',
        'Pick up a Medical Supply Crate in the Storage Room and restock the Examination Room.',
        'Open the CCTV Console in the Surveillance Room and click "Log Camera Evidence".'
      ];
      const waveInstA = endlessTaskDescriptions[(endlessHour - 1) % endlessTaskDescriptions.length];
      const waveInstB = endlessTaskDescriptions[endlessHour % endlessTaskDescriptions.length];
      const instructions = isEndless
        ? [
            'Download the hourly patient roster at the Nurses\' Station Master Terminal.',
            waveInstA,
            waveInstB,
            `Examine and resolve all ${Math.min(6, 4 + Math.floor(endlessHour / 2))} Ward Patients (CONTAIN impostors with evidence, APPROVE genuine patients).`,
            'Keep facility power online and report to the Nurses\' Station Lockdown Terminal to Clock Out or begin the next Hour (+1 Life).'
          ]
        : cfg.keyInstructions;

      listEl.innerHTML = instructions
        .map((inst, i) => `<li class="flex items-start gap-2"><span class="text-cyan-400 font-bold">${i + 1}.</span><span>${inst}</span></li>`)
        .join('');
    }

    const modal = document.getElementById('briefing-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeBriefingModal() {
    const modal = document.getElementById('briefing-modal');
    if (modal) modal.classList.add('hidden');
  }

  togglePauseMenu() {
    if (this.gameState.mode === 'PLAYING') {
      this.inputManager.releasePointerLock();
      this.gameState.mode = 'PAUSED';
      const modal = document.getElementById('pause-modal');
      if (modal) modal.classList.remove('hidden');
    } else if (this.gameState.mode === 'PAUSED') {
      this.closePauseMenu();
    }
  }

  closePauseMenu() {
    const modal = document.getElementById('pause-modal');
    if (modal) modal.classList.add('hidden');
    if (this.gameState.mode === 'PAUSED') {
      this.gameState.mode = 'PLAYING';
    }
  }

  showToast(text, color = 'red') {
    const toast = document.getElementById('toast-message');
    if (!toast) return;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);

    const styles = {
      red: 'bg-red-950/95 border-red-500 text-red-100',
      emerald: 'bg-emerald-950/95 border-emerald-500 text-emerald-100',
      amber: 'bg-amber-950/95 border-amber-500 text-amber-100',
      cyan: 'bg-cyan-950/95 border-cyan-500 text-cyan-100',
      slate: 'bg-slate-900/95 border-slate-500 text-slate-100'
    };

    toast.textContent = text;
    toast.className = `self-center ${
      styles[color] || styles.red
    } border px-5 py-2.5 rounded-xl shadow-2xl backdrop-blur text-center font-mono text-xs sm:text-sm font-bold tracking-wider opacity-100 transition-all duration-200 transform translate-y-0 max-w-xl pointer-events-none`;

    this.toastTimeout = setTimeout(() => {
      toast.classList.add('opacity-0', '-translate-y-3');
    }, 3400);
  }

  triggerDamageFlash() {
    const vig = document.getElementById('damage-vignette');
    if (!vig) return;
    vig.classList.remove('opacity-0');
    vig.classList.add('opacity-90');
    setTimeout(() => {
      vig.classList.remove('opacity-90');
      vig.classList.add('opacity-0');
    }, 900);
  }

  updateHUD() {
    const gs = this.gameState;

    // 1. Shift Title & Lives
    const shiftTitleEl = document.getElementById('shift-title');
    if (shiftTitleEl) {
      if (gs.isEndless) {
        shiftTitleEl.textContent = `ENDLESS SHIFT — HOUR ${gs.endlessHour}`;
      } else {
        const cfg = SHIFTS_CONFIG[gs.shift - 1] || SHIFTS_CONFIG[0];
        shiftTitleEl.textContent = cfg.title;
      }
    }

    const livesContainer = document.getElementById('lives-container');
    if (livesContainer) {
      const hearts = livesContainer.querySelectorAll('i.fa-heart');
      hearts.forEach((h, idx) => {
        h.className =
          idx < gs.lives
            ? 'fa-solid fa-heart text-red-500 text-sm drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
            : 'fa-solid fa-heart text-slate-700 text-sm';
      });
    }

    // 2. Danger Level Indicator
    const dangerBadge = document.getElementById('danger-level-badge');
    if (dangerBadge) {
      const info = gs.getDangerInfo();
      dangerBadge.textContent = info.short;
      const colorMap = {
        emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
        amber: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
        orange: 'bg-orange-950/80 text-orange-300 border-orange-500/50',
        red: 'bg-red-950/90 text-red-300 border-red-500 animate-pulse'
      };
      dangerBadge.className = `text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
        colorMap[info.color] || colorMap.emerald
      }`;
    }

    // 3. Timer
    const timerSpan = document.querySelector('#timer-display span');
    if (timerSpan) {
      const mins = Math.floor(gs.timeLeft / 60)
        .toString()
        .padStart(2, '0');
      const secs = Math.floor(gs.timeLeft % 60)
        .toString()
        .padStart(2, '0');
      timerSpan.textContent = `${mins}:${secs}`;
      timerSpan.classList.toggle('text-red-400', gs.timeLeft <= 90);
    }

    // 4. Persistent Left Objective Panel
    const objs = this.missionSystem.objectives;
    const doneCount = objs.filter((o) => o.completed).length;
    const totalCount = objs.length || 1;

    const progText = document.getElementById('mission-progress-text');
    if (progText) progText.textContent = `${doneCount}/${totalCount}`;

    const progBar = document.getElementById('mission-progress-bar');
    if (progBar) {
      progBar.style.width = `${Math.round((doneCount / totalCount) * 100)}%`;
    }

    const objListEl = document.getElementById('objective-checklist');
    if (objListEl) {
      objListEl.innerHTML = objs
        .map(
          (o) => `
          <li class="flex items-start gap-2 text-xs font-mono ${
            o.completed ? 'text-emerald-400 line-through opacity-80' : 'text-slate-200'
          }">
            <span class="font-bold">${o.completed ? '[✓]' : '[ ]'}</span>
            <span>${o.title}</span>
          </li>
        `
        )
        .join('');
    }

    const guidance = this.missionSystem.getActiveGuidance();
    const setText = (id, t) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t;
    };
    setText('current-objective', guidance.targetTitle);
    setText('guidance-target-title', guidance.targetTitle);
    setText('guidance-location', guidance.locationName);
    setText('guidance-action', guidance.actionHint);

    // 5. Carried Inventory & Flashlight Button state
    const invLabel = document.getElementById('inventory-slot-label');
    if (invLabel) {
      invLabel.textContent = gs.carriedItem
        ? `CARRYING: ${gs.carriedItem.name}`
        : `LOC: ${gs.player.currentLocationName}`;
    }

    const flIcon = document.getElementById('flashlight-icon');
    if (flIcon) {
      flIcon.className = gs.flashlightOn
        ? 'fa-solid fa-lightbulb text-amber-400 text-base'
        : 'fa-regular fa-lightbulb text-slate-500 text-base';
    }

    // 6. Mini-Map Sector Highlight
    const sectorMap = {
      WARD: 'map-sec-ward',
      CCTV: 'map-sec-cctv',
      PHARM: 'map-sec-pharm',
      ER: 'map-sec-er',
      HALL: 'map-sec-hall',
      REST: 'map-sec-rest'
    };
    for (const [secKey, domId] of Object.entries(sectorMap)) {
      const el = document.getElementById(domId);
      if (!el) continue;
      const isHere = gs.player.currentSector === secKey;
      el.className = isHere
        ? 'p-1 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-400 font-bold'
        : 'p-1 rounded bg-slate-900 text-slate-400 border border-slate-800';
    }
  }

  /**
   * Projects the current objective's 3D world position onto the 2D viewport for the directional waypoint marker
   */
  update3DWaypoint(camera, interactionTarget) {
    const promptEl = document.getElementById('interaction-prompt');
    const promptText = document.getElementById('prompt-text');
    if (promptEl && promptText) {
      if (interactionTarget && this.gameState.mode === 'PLAYING') {
        promptEl.style.opacity = '1';
        promptText.textContent = interactionTarget.label;
      } else {
        promptEl.style.opacity = '0';
      }
    }

    const wpEl = document.getElementById('waypoint-marker');
    const wpLabel = document.getElementById('waypoint-label');
    if (!wpEl || !wpLabel || !camera) return;

    if (this.gameState.mode !== 'PLAYING') {
      wpEl.classList.add('hidden');
      return;
    }

    const guidance = this.missionSystem.getActiveGuidance();
    if (!guidance || !guidance.worldPos) {
      wpEl.classList.add('hidden');
      return;
    }

    wpEl.classList.remove('hidden');

    const px = this.gameState.player.x;
    const py = this.gameState.player.y;
    const pz = this.gameState.player.z;
    const target = guidance.worldPos;
    const dist = Math.round(Math.hypot(target.x - px, target.y - py, target.z - pz));

    const projected = target.clone().project(camera);
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;

    let screenX = projected.x * halfW + halfW;
    let screenY = -projected.y * halfH + halfH;

    // If target is behind camera, clamp to screen border so player knows which way to turn
    if (projected.z > 1) {
      screenX = window.innerWidth - screenX;
      screenY = window.innerHeight - 90;
    }

    const padX = 90;
    const padY = 85;
    screenX = Math.max(padX, Math.min(window.innerWidth - padX, screenX));
    screenY = Math.max(padY, Math.min(window.innerHeight - padY, screenY));

    wpEl.style.left = `${screenX}px`;
    wpEl.style.top = `${screenY}px`;
    wpLabel.textContent = `◆ ${guidance.locationName.split('(')[0].trim()} — ${dist}m`;
  }

  openMissionSuccessReport(rewards = []) {
    this.inputManager.releasePointerLock();
    this.closeAllGameplayModals();
    this.gameState.mode = 'REPORT';

    const gs = this.gameState;
    const objs = this.missionSystem.objectives;
    const doneTasks = objs.filter((o) => o.completed).length;
    const examinedCount = gs.patients.filter((p) => p.investigation.examinedOnce).length;
    const totalImpostors = gs.patients.filter((p) => p.isImpostor).length;
    const accuracy = gs.getAccuracy();
    const grade = gs.getGrade();

    const mins = Math.floor(gs.elapsedTime / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(gs.elapsedTime % 60)
      .toString()
      .padStart(2, '0');

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    const cfg = SHIFTS_CONFIG[gs.shift - 1] || SHIFTS_CONFIG[0];
    setText(
      'report-mission-name',
      gs.isEndless ? `ENDLESS SHIFT — HOUR ${gs.endlessHour} CLEARED` : cfg.title
    );
    setText('report-tasks-done', `${doneTasks} / ${objs.length}`);
    setText('report-patients-examined', `${examinedCount} / ${gs.patients.length}`);
    setText('report-impostors-contained', `${gs.impostorsContained} / ${totalImpostors}`);
    setText('report-accuracy', `${accuracy}%`);
    setText('report-lives', `${gs.lives} / 3`);
    setText('report-time', `${mins}:${secs}`);
    setText('report-grade', grade);

    const rewardsEl = document.getElementById('report-rewards-list');
    if (rewardsEl) {
      rewardsEl.textContent =
        rewards.length > 0 ? rewards.join(' • ') : 'Shift Record Saved to LocalStorage';
    }

    const menuBtn = document.getElementById('btn-report-menu');
    if (menuBtn) {
      menuBtn.textContent = gs.isEndless ? 'CLOCK OUT & SECURE SHIFT' : 'Main Menu';
    }

    const contBtn = document.getElementById('btn-report-continue');
    if (contBtn) {
      if (gs.isEndless) {
        contBtn.textContent = `BEGIN NEXT HOUR (HOUR ${gs.endlessHour + 1}) [+1 LIFE]`;
      } else if (gs.shift < 5) {
        contBtn.textContent = `CONTINUE TO SHIFT ${gs.shift + 1}`;
      } else {
        contBtn.textContent = 'ENTER ENDLESS SHIFT MODE';
      }
    }

    const modal = document.getElementById('mission-report-modal');
    if (modal) modal.classList.remove('hidden');
  }

  openMissionFailureModal(reasonText = 'ELIMINATED BY HOSTILE ENTITY') {
    this.inputManager.releasePointerLock();
    this.closeAllGameplayModals();
    this.gameState.mode = 'GAMEOVER';

    const gs = this.gameState;
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setText('go-subtitle', reasonText);
    setText('go-shift-num', gs.isEndless ? `Endless Hour ${gs.endlessHour}` : `Shift ${gs.shift}`);
    setText('go-impostors-count', `${gs.impostorsContained}`);
    setText('go-errors-count', `${gs.errorsMade}`);

    const remObjs = this.missionSystem.objectives
      .filter((o) => !o.completed)
      .map((o) => o.title)
      .join(', ');
    setText('go-incomplete-objs', remObjs || 'None');

    const modal = document.getElementById('game-over-screen');
    if (modal) modal.classList.remove('hidden');
  }
}
