// src/core/GameState.js

class GameState {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.resetForShift(1, false);
    this.mode = 'MENU'; // 'MENU' | 'BRIEFING' | 'PLAYING' | 'PAUSED' | 'DOSSIER' | 'CCTV' | 'CUTSCENE' | 'REPORT' | 'GAMEOVER'
  }

  resetForShift(shiftNum = 1, isEndless = false, endlessHour = 1) {
    this.shift = shiftNum;
    this.isEndless = isEndless;
    this.endlessHour = endlessHour;
    this.lives = 3;
    this.maxLives = 3;
    this.dangerValue = 5; // 0..100
    this.dangerLevel = 1; // 1..4
    this.timeLeft = 480;
    this.totalShiftTime = 480;
    this.elapsedTime = 0;

    this.flashlightOn = true;
    this.isBlackout = false;
    this.isHidingInLocker = false;
    this.nursesShutterClosed = false;

    // Player spatial coordinates
    this.player = {
      x: 0,
      y: 0,
      z: 7.65,
      yaw: Math.PI, // Facing south toward central hub / corridors
      pitch: 0,
      isRunning: false,
      isMoving: false,
      currentLocationId: 'NURSES_STATION',
      currentLocationName: "7. Nurses' Station",
      currentSector: 'HALL'
    };

    // Inventory & Task state
    this.carriedItem = null; // { id, name, icon }
    this.databaseVerified = false;
    this.cctvCheckedInRoom = false;
    this.cctvRecalibratedCount = 0;
    this.cctvEvidenceLogged = false;
    this.chartPickedUp = false;
    this.chartDelivered = false;
    this.suppliesPickedUp = false;
    this.suppliesRestocked = false;
    this.medicationPickedUp = false;
    this.medicationAdministered = false;
    this.breakerSwitches = [true, true, true];
    this.breakerRestored = true;
    this.hasRestrictedKeycard = false;
    this.restrictedAirlockUnlocked = false;
    this.containmentCoreActivated = false;
    this.survivedCorridorIncident = false;
    this.wardSecured = false;

    // Patient & Investigation metrics
    this.patients = [];
    this.activePatientIndex = null;
    this.impostorsContained = 0;
    this.genuineApproved = 0;
    this.errorsMade = 0;
    this.falseContainmentsActive = 0;

    // CCTV state
    this.cctvActiveCam = 0;
    this.cctvRemoteMode = false;

    // Chase state
    this.chaseActive = false;
    this.chaseWarningActive = false;
  }

  getDangerInfo() {
    if (this.dangerValue >= 75) return DANGER_LEVELS[4];
    if (this.dangerValue >= 50) return DANGER_LEVELS[3];
    if (this.dangerValue >= 25) return DANGER_LEVELS[2];
    return DANGER_LEVELS[1];
  }

  addDanger(delta) {
    this.dangerValue = Math.max(0, Math.min(100, this.dangerValue + delta));
    const info = this.getDangerInfo();
    this.dangerLevel = info.level;
    return this.dangerLevel;
  }

  setDanger(val) {
    this.dangerValue = Math.max(0, Math.min(100, val));
    this.dangerLevel = this.getDangerInfo().level;
    return this.dangerLevel;
  }

  updatePlayerLocation() {
    const px = this.player.x;
    const py = this.player.y;
    const pz = this.player.z;

    // Check individual patient rooms first
    for (const r of PATIENT_ROOMS) {
      if (py > -1.5 && px >= r.x - 3 && px <= r.x + 3) {
        if (r.side === 'north' && pz >= 8 && pz <= 15.2) {
          this.player.currentLocationId = r.id;
          this.player.currentLocationName = `Patient Ward — ${r.id}`;
          this.player.currentSector = 'WARD';
          return;
        }
        if (r.side === 'south' && pz >= -3.2 && pz <= 4) {
          this.player.currentLocationId = r.id;
          this.player.currentLocationName = `Patient Ward — ${r.id}`;
          this.player.currentSector = 'WARD';
          return;
        }
      }
    }

    // Check lower level vs main floor locations
    for (const loc of Object.values(HOSPITAL_LOCATIONS)) {
      if (loc.id === 'HALLWAYS') continue;
      const b = loc.bounds;
      const yMatch = b.y < -2 ? py <= -1.8 : py > -1.8;
      if (yMatch && px >= b.minX && px <= b.maxX && pz >= b.minZ && pz <= b.maxZ) {
        this.player.currentLocationId = loc.id;
        this.player.currentLocationName = loc.name;
        this.player.currentSector = loc.sector;
        return;
      }
    }

    this.player.currentLocationId = 'HALLWAYS';
    this.player.currentLocationName = py < -1.5 ? 'Basement Stairwell' : '12. Hospital Hallways';
    this.player.currentSector = py < -1.5 ? 'REST' : 'HALL';
  }

  getAccuracy() {
    const totalDecisions = this.patients.length + this.errorsMade;
    if (totalDecisions <= 0) return 100;
    const raw = Math.round((this.patients.length / (this.patients.length + this.errorsMade * 1.25)) * 100);
    if (this.errorsMade === 0 && this.falseContainmentsActive === 0) return 100;
    return Math.max(0, Math.min(99, raw));
  }

  getGrade() {
    const acc = this.getAccuracy();
    if (acc === 100 && this.lives === 3) return 'S';
    if (acc >= 85 && this.lives >= 2) return 'A';
    if (acc >= 70) return 'B';
    return 'C';
  }
}
