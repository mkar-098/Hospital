// src/systems/DossierSystem.js
// Manages the Medical Dossier Modal, 4-Step Diagnostic Scans, Evidence Gating, and Approve/Investigate/Contain/Release actions

class DossierSystem {
  constructor({
    gameState,
    doorSystem,
    missionSystem,
    chaseSystem,
    inputManager,
    soundEngine,
    uiManager
  }) {
    this.gameState = gameState;
    this.doorSystem = doorSystem;
    this.missionSystem = missionSystem;
    this.chaseSystem = chaseSystem;
    this.inputManager = inputManager;
    this.soundEngine = soundEngine;
    this.uiManager = uiManager;

    this.bindEvents();
  }

  bindEvents() {
    const closeBtn = document.getElementById('btn-close-patient');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeDossier();
      });
    }

    const btnInvestigate = document.getElementById('btn-action-investigate');
    if (btnInvestigate) {
      btnInvestigate.addEventListener('click', (e) => {
        e.stopPropagation();
        this.runFullInvestigation();
      });
    }

    // Individual 4-step scan buttons inside Diagnostic Bar
    const stepBtns = document.querySelectorAll('.dossier-scan-step-btn');
    stepBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const step = btn.getAttribute('data-scan-step');
        this.runScanStep(step);
      });
    });

    const btnApprove = document.getElementById('btn-action-approve');
    if (btnApprove) {
      btnApprove.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleApprove();
      });
    }

    const btnContain = document.getElementById('btn-action-contain');
    if (btnContain) {
      btnContain.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleContain();
      });
    }

    const btnRelease = document.getElementById('btn-action-release');
    if (btnRelease) {
      btnRelease.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleRelease();
      });
    }
  }

  openDossier(patientIndex) {
    const p = this.gameState.patients[patientIndex];
    if (!p) return;

    this.inputManager.releasePointerLock();
    this.gameState.activePatientIndex = patientIndex;
    this.gameState.mode = 'DOSSIER';

    const fb = document.getElementById('dossier-feedback-banner');
    if (fb) {
      fb.classList.add('hidden');
      fb.textContent = '';
    }

    if (this.soundEngine) this.soundEngine.playUIClick();

    this.renderDossier(p);
    const modal = document.getElementById('patient-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeDossier() {
    const modal = document.getElementById('patient-modal');
    if (modal) modal.classList.add('hidden');
    if (this.gameState.mode === 'DOSSIER') {
      this.gameState.mode = 'PLAYING';
    }
    this.missionSystem.evaluateObjectives();
    this.uiManager.updateHUD();
  }

  setDossierFeedback(msg, tone = 'cyan') {
    const el = document.getElementById('dossier-feedback-banner');
    if (!el) return;
    const toneClasses = {
      cyan: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-200',
      emerald: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200',
      amber: 'bg-amber-950/80 border-amber-500/60 text-amber-200',
      red: 'bg-red-950/80 border-red-500/60 text-red-200'
    };
    el.className = `text-xs font-mono px-3 py-2 rounded-lg border ${toneClasses[tone] || toneClasses.cyan}`;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  renderDossier(p) {
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setText('patient-modal-name', `PATIENT #${p.patientNumber} — ${p.name}`);
    setText('doc-id', p.officialId);
    setText('doc-wristband', p.investigation.scansCompleted.records ? p.liveWristbandId : '[Scan Records]');
    setText('doc-room', p.assignedRoom);
    setText('doc-diagnosis', p.diagnosis);
    setText('doc-norm-temp', `${p.normalTemp} °C (${p.expectedTempRange})`);
    setText('doc-history', p.medicalHistory);
    setText(
      'doc-db-status',
      this.gameState.databaseVerified ? 'VERIFIED (NURSES\' STATION)' : 'UNVERIFIED (CHECK TERMINAL)'
    );

    // Status badge
    const badge = document.getElementById('patient-status-badge');
    if (badge) {
      badge.textContent = p.status;
      badge.className =
        p.status === 'APPROVED'
          ? 'text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-900/70 text-emerald-300 border border-emerald-500/50'
          : p.status === 'CONTAINED'
          ? 'text-xs font-mono font-bold px-2.5 py-1 rounded bg-red-900/70 text-red-300 border border-red-500/50'
          : p.investigation.examinedOnce
          ? 'text-xs font-mono font-bold px-2.5 py-1 rounded bg-cyan-900/70 text-cyan-300 border border-cyan-500/50'
          : 'text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-600';
    }

    // Live Examination fields (revealed as scans complete)
    const sc = p.investigation.scansCompleted;
    setText('exam-temp', sc.vitals ? p.liveExam.currentTemp : '[ ? Click Investigate / Vitals ]');
    setText('exam-face', sc.morphology ? p.liveExam.facialSymmetry : '[ ? Click Investigate / Morphology ]');
    setText('exam-motor', sc.morphology ? p.liveExam.motorFunction : '[ ? Click Investigate / Morphology ]');
    setText('exam-vocal', sc.vocal ? p.liveExam.vocalPattern : '[ ? Click Investigate / Question ]');
    setText(
      'exam-behavior',
      p.investigation.examinedOnce || sc.morphology
        ? p.liveExam.behaviorNote
        : '[ ? Click Investigate ]'
    );

    // Quote box
    const quoteText = sc.vocal ? p.liveExam.questionResponse : p.liveExam.initialQuote;
    setText('patient-quote', quoteText);

    // Evidence counter & clues list
    const req = p.investigation.requiredCluesToContain;
    const found = p.investigation.cluesFound.length;
    setText(
      'dossier-evidence-counter',
      `Discrepancy Clues Logged: ${found} / ${req} Required for Impostor Containment`
    );

    const cluesListEl = document.getElementById('dossier-clues-list');
    if (cluesListEl) {
      if (p.investigation.cluesFound.length === 0) {
        cluesListEl.innerHTML = sc.vitals && sc.morphology && sc.vocal && sc.records
          ? '<li class="text-emerald-400">✓ All 4 diagnostic scans normal — Consistent with Genuine Human Record.</li>'
          : '<li class="text-slate-400">Run INVESTIGATE diagnostic scans to detect biological or record discrepancies.</li>';
      } else {
        cluesListEl.innerHTML = p.investigation.cluesFound
          .map((c) => `<li class="text-red-400 font-semibold">⚠ ${c}</li>`)
          .join('');
      }
    }

    // Highlight completed scan step buttons
    const stepBtns = document.querySelectorAll('.dossier-scan-step-btn');
    stepBtns.forEach((btn) => {
      const step = btn.getAttribute('data-scan-step');
      const done = sc[step];
      btn.classList.toggle('border-cyan-400', done);
      btn.classList.toggle('bg-cyan-950/70', done);
      btn.classList.toggle('text-cyan-200', done);
    });

    // Enable/disable RELEASE button visual state
    const btnRelease = document.getElementById('btn-action-release');
    if (btnRelease) {
      btnRelease.disabled = p.status !== 'CONTAINED';
      btnRelease.classList.toggle('opacity-50', p.status !== 'CONTAINED');
    }
  }

  runScanStep(step) {
    const idx = this.gameState.activePatientIndex;
    const p = this.gameState.patients[idx];
    if (!p) return;

    const wasExamined = p.investigation.examinedOnce;
    p.investigation.examinedOnce = true;
    p.investigation.scansCompleted[step] = true;

    const clue = p.anomalyCluesByStep[step];
    if (clue && !p.investigation.cluesFound.includes(clue)) {
      p.investigation.cluesFound.push(clue);
    }

    if (this.soundEngine) this.soundEngine.playScanBeep();

    if (!wasExamined) {
      this.checkScriptedExamEvents();
    }
    this.renderDossier(p);
    this.missionSystem.evaluateObjectives();
    this.uiManager.updateHUD();

    const stepNames = {
      vitals: 'STEP 1 (VITALS & TEMP SCAN)',
      morphology: 'STEP 2 (FACIAL & MOTOR SCAN)',
      vocal: 'STEP 3 (COGNITIVE QUESTIONING)',
      records: 'STEP 4 (DATABASE & CCTV CROSS-CHECK)'
    };
    this.setDossierFeedback(
      `${stepNames[step] || 'SCAN'} COMPLETE — ${
        clue ? 'ANOMALOUS DISCREPANCY LOGGED!' : 'No discrepancy in this scan.'
      }`,
      clue ? 'red' : 'emerald'
    );
  }

  runFullInvestigation() {
    const idx = this.gameState.activePatientIndex;
    const p = this.gameState.patients[idx];
    if (!p) return;

    const wasExamined = p.investigation.examinedOnce;
    p.investigation.examinedOnce = true;

    const steps = ['vitals', 'morphology', 'vocal', 'records'];
    for (const st of steps) {
      p.investigation.scansCompleted[st] = true;
      const clue = p.anomalyCluesByStep[st];
      if (clue && !p.investigation.cluesFound.includes(clue)) {
        p.investigation.cluesFound.push(clue);
      }
    }

    if (this.soundEngine) this.soundEngine.playScanBeep();

    if (!wasExamined) {
      this.checkScriptedExamEvents();
    }

    this.renderDossier(p);
    this.missionSystem.evaluateObjectives();
    this.uiManager.updateHUD();

    if (p.investigation.cluesFound.length > 0) {
      this.setDossierFeedback(
        `INVESTIGATION COMPLETE: ${p.investigation.cluesFound.length} discrepancy clue(s) documented! Authorize CONTAIN.`,
        'red'
      );
    } else {
      this.setDossierFeedback(
        'INVESTIGATION COMPLETE: All 4 clinical scans match Official Medical Records. Safe to APPROVE.',
        'emerald'
      );
    }
  }

  checkScriptedExamEvents() {
    const gs = this.gameState;
    const shiftCfg = SHIFTS_CONFIG[gs.shift - 1];
    if (!shiftCfg) return;

    const examinedCount = gs.patients.filter((pt) => pt.investigation.examinedOnce).length;
    if (
      shiftCfg.scriptedBlackoutAtExamCount &&
      examinedCount === shiftCfg.scriptedBlackoutAtExamCount &&
      !gs.isBlackout
    ) {
      this.chaseSystem.triggerBlackout();
    }
  }

  handleApprove() {
    const idx = this.gameState.activePatientIndex;
    const p = this.gameState.patients[idx];
    if (!p) return;

    if (p.status === 'CONTAINED') {
      this.setDossierFeedback(
        'PATIENT IS CURRENTLY QUARANTINED: Click RELEASE first before approving.',
        'amber'
      );
      return;
    }

    if (!p.investigation.examinedOnce) {
      this.setDossierFeedback(
        'PROTOCOL REQUIRED: Click INVESTIGATE to examine the patient before approving treatment.',
        'amber'
      );
      return;
    }

    if (!p.isImpostor) {
      // Correct Approval of Genuine Patient
      p.status = 'APPROVED';
      this.gameState.genuineApproved = this.gameState.patients.filter(
        (pt) => !pt.isImpostor && pt.status === 'APPROVED'
      ).length;
      if (this.soundEngine) this.soundEngine.playTaskCompleteSFX();
      this.uiManager.showToast(`PATIENT #${p.patientNumber} (${p.name}) VERIFIED & APPROVED`, 'emerald');
      this.closeDossier();
    } else {
      // Mistake: Approved an Impostor! Never deduct life in menu -> escalate danger & trigger chase warning!
      this.gameState.errorsMade++;
      const breachClue = 'BIO-SIGNATURE BREACH: Anomalous hostility detected after false approval!';
      if (!p.investigation.cluesFound.includes(breachClue)) {
        p.investigation.cluesFound.push(breachClue);
      }
      this.closeDossier();
      this.chaseSystem.escalateDanger(
        this.gameState.shift >= 4 ? 50 : 35,
        `⚠ WARNING: APPROVED AN IMPOSTOR IN ${p.assignedRoom}! BIO-SIGNATURE BREACH!`,
        true
      );
    }
  }

  handleContain() {
    const idx = this.gameState.activePatientIndex;
    const p = this.gameState.patients[idx];
    if (!p) return;

    if (p.status === 'CONTAINED') {
      this.setDossierFeedback('Patient room is already under Biohazard Containment.', 'amber');
      return;
    }

    // Enforce investigation precondition ("Do not allow containment to succeed automatically without the necessary investigation")
    const sc = p.investigation.scansCompleted;
    const allScansDone = sc.vitals && sc.morphology && sc.vocal && sc.records;
    if (!p.investigation.examinedOnce || (!allScansDone && p.investigation.cluesFound.length === 0)) {
      this.setDossierFeedback(
        "INSUFFICIENT EVIDENCE: Perform 'INVESTIGATE' scans to document discrepancy before authorizing containment.",
        'red'
      );
      return;
    }

    if (p.isImpostor && p.investigation.cluesFound.length < p.investigation.requiredCluesToContain) {
      this.setDossierFeedback(
        `INSUFFICIENT EVIDENCE (${p.investigation.cluesFound.length}/${p.investigation.requiredCluesToContain} Clues): Complete all 4 INVESTIGATE scans or log CCTV CAM 01 evidence first!`,
        'red'
      );
      return;
    }

    // Engage room Biohazard Containment Shutter
    p.status = 'CONTAINED';
    this.doorSystem.setContainmentState(p.assignedRoom, true);

    if (p.isImpostor) {
      this.gameState.impostorsContained = this.gameState.patients.filter(
        (pt) => pt.isImpostor && pt.status === 'CONTAINED'
      ).length;

      if (p.impostorType === IMPOSTOR_TYPES.PERFECT) {
        this.gameState.saveSystem?.unlockAchievement('PERFECT_HUNTER');
      }

      if (this.soundEngine) this.soundEngine.playTaskCompleteSFX();
      this.uiManager.showToast(
        `BIOHAZARD SHUTTER LOCKED — ${p.impostorLabel.toUpperCase()} CONTAINED IN ${p.assignedRoom}`,
        'emerald'
      );
      this.closeDossier();

      // Check Shift 4 scripted Corridor Incident chase after containing 2nd impostor
      const shiftCfg = SHIFTS_CONFIG[this.gameState.shift - 1];
      if (
        shiftCfg?.scriptedChaseAtContainCount &&
        this.gameState.impostorsContained === shiftCfg.scriptedChaseAtContainCount &&
        !this.gameState.survivedCorridorIncident
      ) {
        this.chaseSystem.startChaseWarning();
      }
    } else {
      // Mistake: False Containment of a Genuine Patient! Does not deduct a life -> increases danger & requires RELEASE
      this.gameState.errorsMade++;
      this.gameState.falseContainmentsActive = this.gameState.patients.filter(
        (pt) => !pt.isImpostor && pt.status === 'CONTAINED'
      ).length;
      this.renderDossier(p);
      this.setDossierFeedback(
        'QUARANTINE ALERT: Contained patient shows normal human vitals! Click RELEASE and APPROVE to resolve.',
        'amber'
      );
      this.chaseSystem.escalateDanger(
        20,
        `QUARANTINE ERROR: ${p.name} in ${p.assignedRoom} is a Genuine Patient! Use RELEASE to unseal.`,
        false
      );
    }
  }

  handleRelease() {
    const idx = this.gameState.activePatientIndex;
    const p = this.gameState.patients[idx];
    if (!p || p.status !== 'CONTAINED') return;

    p.status = 'PENDING';
    this.doorSystem.setContainmentState(p.assignedRoom, false);

    if (!p.isImpostor) {
      this.gameState.falseContainmentsActive = this.gameState.patients.filter(
        (pt) => !pt.isImpostor && pt.status === 'CONTAINED'
      ).length;
      this.renderDossier(p);
      this.setDossierFeedback(
        `BIOHAZARD SHUTTER RELEASED FOR ${p.assignedRoom}. Click APPROVE to complete genuine patient treatment.`,
        'emerald'
      );
      this.uiManager.showToast(`${p.assignedRoom} QUARANTINE RELEASED — READY FOR APPROVAL`, 'cyan');
    } else {
      // Foolishly released a contained Impostor -> triggers immediate Level 4 Chase Warning!
      this.gameState.impostorsContained = this.gameState.patients.filter(
        (pt) => pt.isImpostor && pt.status === 'CONTAINED'
      ).length;
      this.closeDossier();
      this.chaseSystem.escalateDanger(
        40,
        `⚠ CONTAINMENT BREACH! YOU RELEASED AN IMPOSTOR FROM ${p.assignedRoom}!`,
        true
      );
    }

    this.missionSystem.evaluateObjectives();
    this.uiManager.updateHUD();
  }
}
