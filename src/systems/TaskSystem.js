// src/systems/TaskSystem.js
// Handles 3D raycast/proximity interaction prompts and executes all playable hospital duties

class TaskSystem {
  constructor({
    gameState,
    hospitalBuilder,
    doorSystem,
    missionSystem,
    dossierSystem,
    cctvSystem,
    chaseSystem,
    doctorModel,
    soundEngine,
    uiManager,
    onShiftCompleted
  }) {
    this.gameState = gameState;
    this.hospitalBuilder = hospitalBuilder;
    this.doorSystem = doorSystem;
    this.missionSystem = missionSystem;
    this.dossierSystem = dossierSystem;
    this.cctvSystem = cctvSystem;
    this.chaseSystem = chaseSystem;
    this.doctorModel = doctorModel;
    this.soundEngine = soundEngine;
    this.uiManager = uiManager;
    this.onShiftCompleted = onShiftCompleted;

    this.currentTarget = null;
  }

  /**
   * Finds the best interactive target within 2.85m of the player, weighted by camera look direction
   */
  findBestTarget(camera) {
    if (this.gameState.isHidingInLocker) {
      return {
        kind: 'LOCKER_EXIT',
        label: 'Exit Utility Hiding Locker'
      };
    }

    const px = this.gameState.player.x;
    const py = this.gameState.player.y;
    const pz = this.gameState.player.z;
    const eyePos = new THREE.Vector3(px, py + 1.6, pz);

    const forward = new THREE.Vector3(0, 0, -1);
    if (camera) {
      forward.applyQuaternion(camera.quaternion);
    }

    let bestCandidate = null;
    let bestScore = Infinity;
    const maxRange = 2.95;

    const evaluateCandidate = (worldPos, candidate) => {
      const dy = Math.abs(worldPos.y - (py + 1.0));
      if (dy > 2.4) return;
      const dist = Math.hypot(worldPos.x - px, worldPos.z - pz);
      if (dist > maxRange) return;

      const toTarget = new THREE.Vector3().subVectors(worldPos, eyePos).normalize();
      const dot = forward.dot(toTarget);
      // Allow close proximity interaction or forward cone
      if (dot < -0.15 && dist > 1.35) return;

      const score = dist - dot * 1.1;
      if (score < bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    };

    // 1. Check Patient Beds in Active Shift Rooms
    for (let i = 0; i < this.gameState.patients.length; i++) {
      const p = this.gameState.patients[i];
      const room = PATIENT_ROOMS[i];
      if (!room) continue;
      const door = this.doorSystem.getDoor(room.id);
      // Only examine patient if room door is open or player is inside the room
      const playerInRoom =
        Math.abs(px - room.x) < 3.0 &&
        ((room.side === 'north' && pz > 8.0) || (room.side === 'south' && pz < 4.0));
      if (door && !door.isOpen && !playerInRoom && !door.isContained) continue;

      const bedPos = new THREE.Vector3(room.bedX, 1.0, room.bedZ);
      evaluateCandidate(bedPos, {
        kind: 'PATIENT',
        patientIndex: i,
        label: `Examine Patient #${p.patientNumber} (${p.name}) — ${room.id}`
      });
    }

    // 2. Check Hinged Hospital Doors
    for (const door of this.doorSystem.doors) {
      const doorPos = new THREE.Vector3(door.x, door.y + 1.2, door.z);
      const stateVerb = door.isContained
        ? 'Inspect Quarantined Door'
        : door.isOpen
        ? 'Close Door'
        : 'Open Door';
      evaluateCandidate(doorPos, {
        kind: 'DOOR',
        doorId: door.id,
        label: `${stateVerb} — ${door.label}`
      });
    }

    // 3. Check Interactive Hospital Task Props & Terminals
    for (const item of this.hospitalBuilder.interactables) {
      evaluateCandidate(item.pos, {
        kind: 'INTERACTABLE',
        item,
        label: item.label
      });
    }

    this.currentTarget = bestCandidate;
    return bestCandidate;
  }

  triggerInteraction(camera) {
    const target = this.findBestTarget(camera) || this.currentTarget;
    if (!target) return false;

    if (this.doctorModel) {
      this.doctorModel.triggerInteractReach();
    }

    if (target.kind === 'LOCKER_EXIT') {
      this.gameState.isHidingInLocker = false;
      this.uiManager.showToast('EXITED UTILITY LOCKER', 'cyan');
      this.uiManager.updateHUD();
      return true;
    }

    if (target.kind === 'DOOR') {
      const door = this.doorSystem.getDoor(target.doorId);
      if (door && door.isContained) {
        // Find corresponding patient and open Dossier so player can click RELEASE if needed
        const pIdx = PATIENT_ROOMS.findIndex((r) => r.id === door.id);
        if (pIdx >= 0 && pIdx < this.gameState.patients.length) {
          this.dossierSystem.openDossier(pIdx);
          return true;
        }
      }
      this.doorSystem.toggleDoor(target.doorId, this.gameState, this.uiManager);
      this.missionSystem.evaluateObjectives();
      this.uiManager.updateHUD();
      return true;
    }

    if (target.kind === 'PATIENT') {
      const p = this.gameState.patients[target.patientIndex];
      // Check if player is carrying prescribed medication for a genuine patient
      if (this.gameState.medicationPickedUp && !this.gameState.medicationAdministered && !p.isImpostor) {
        this.gameState.medicationAdministered = true;
        if (this.gameState.carriedItem?.id === 'MEDS') {
          this.gameState.carriedItem = null;
        }
        if (this.soundEngine) this.soundEngine.playTaskCompleteSFX();
        this.uiManager.showToast(`MEDICATION ADMINISTERED TO ${p.name.toUpperCase()}`, 'emerald');
      }
      this.dossierSystem.openDossier(target.patientIndex);
      return true;
    }

    if (target.kind === 'INTERACTABLE') {
      return this.handleTaskObject(target.item);
    }

    return false;
  }

  handleTaskObject(item) {
    const gs = this.gameState;

    switch (item.type) {
      case 'TASK_VERIFY_DATABASE': {
        gs.databaseVerified = true;
        if (gs.chartPickedUp && !gs.chartDelivered) {
          gs.chartDelivered = true;
          if (gs.carriedItem?.id === 'CHART') gs.carriedItem = null;
          if (item.mesh) item.mesh.visible = true;
          this.uiManager.showToast('MISSING MEDICAL FILE DELIVERED & DATABASE VERIFIED!', 'emerald');
        } else {
          this.uiManager.showToast(
            'MASTER PATIENT DATABASE SYNCHRONIZED TO MEDICAL TABLET',
            'cyan'
          );
        }
        if (this.soundEngine) this.soundEngine.playTaskCompleteSFX();
        break;
      }

      case 'TASK_PICKUP_CHART': {
        if (gs.chartPickedUp) {
          this.uiManager.showToast('MEDICAL FILE ALREADY RETRIEVED', 'slate');
          break;
        }
        gs.chartPickedUp = true;
        gs.carriedItem = { id: 'CHART', name: 'Patient Medical File', color: 0xf59e0b };
        if (item.mesh) item.mesh.visible = false;
        if (this.soundEngine) this.soundEngine.playTaskCompleteSFX();
        this.uiManager.showToast('PICKED UP MISPLACED MEDICAL FILE — DELIVER TO NURSES\' STATION', 'amber');
        break;
      }

      case 'TASK_PICKUP_MEDS': {
        if (gs.medicationPickedUp) {
          this.uiManager.showToast('PRESCRIBED MEDICATION ALREADY COLLECTED', 'slate');
          break;
        }
        gs.medicationPickedUp = true;
        gs.carriedItem = { id: 'MEDS', name: 'Prescribed Ward Medication', color: 0x10b981 };
        if (item.mesh) item.mesh.visible = false;
        if (this.soundEngine) this.soundEngine.playTaskCompleteSFX();
        this.uiManager.showToast('PICKED UP PHARMACY MEDICATION — DELIVER TO PATIENT WARD', 'emerald');
        break;
      }

      case 'TASK_PICKUP_SUPPLIES': {
        if (gs.suppliesPickedUp) {
          this.uiManager.showToast('SUPPLY CRATE ALREADY COLLECTED', 'slate');
          break;
        }
        gs.suppliesPickedUp = true;
        gs.carriedItem = { id: 'CRATE', name: 'Medical Supply Crate', color: 0xd97706 };
        if (item.mesh) item.mesh.visible = false;
        if (this.soundEngine) this.soundEngine.playTaskCompleteSFX();
        this.uiManager.showToast('PICKED UP MEDICAL SUPPLY CRATE — DELIVER TO EXAMINATION ROOM', 'amber');
        break;
      }

      case 'TASK_RESTOCK_EXAM': {
        if (!gs.suppliesPickedUp) {
          this.uiManager.showToast('COLLECT A MEDICAL SUPPLY CRATE FROM THE STORAGE ROOM FIRST!', 'amber');
          break;
        }
        gs.suppliesRestocked = true;
        if (gs.carriedItem?.id === 'CRATE') gs.carriedItem = null;
        if (this.soundEngine) this.soundEngine.playTaskCompleteSFX();
        this.uiManager.showToast('EXAMINATION ROOM RESTOCKED WITH STERILE SUPPLIES', 'emerald');
        break;
      }

      case 'INTERACT_CCTV_CONSOLE': {
        gs.cctvCheckedInRoom = true;
        this.cctvSystem.openCCTVModal(false); // Full console mode
        break;
      }

      case 'TASK_REPAIR_CCTV': {
        gs.cctvCheckedInRoom = true;
        this.cctvSystem.recalibrateSignal(true);
        break;
      }

      case 'TASK_RESTORE_BREAKER': {
        gs.breakerSwitches = [true, true, true];
        gs.isBlackout = false;
        gs.breakerRestored = true;
        this.hospitalBuilder.updateBreakerVisuals(gs.breakerSwitches);
        gs.saveSystem?.unlockAchievement('POWER_ENGINEER');
        if (this.soundEngine) this.soundEngine.playPowerRestoreSFX();
        this.uiManager.showToast('MAIN ELECTRICAL BREAKER #1–#3 RESTORED — FACILITY POWER ONLINE!', 'emerald');
        break;
      }

      case 'TASK_COLLECT_KEYCARD': {
        if (gs.hasRestrictedKeycard) {
          this.uiManager.showToast('RESTRICTED KEYCARD ALREADY IN INVENTORY', 'cyan');
          break;
        }
        gs.hasRestrictedKeycard = true;
        gs.carriedItem = { id: 'KEYCARD', name: 'Restricted Biohazard Keycard', color: 0xef4444 };
        if (item.mesh) item.mesh.visible = false;
        if (this.soundEngine) this.soundEngine.playTaskCompleteSFX();
        this.uiManager.showToast('COLLECTED RESTRICTED WING BIOHAZARD KEYCARD', 'emerald');
        break;
      }

      case 'TASK_ACTIVATE_CORE': {
        if (gs.containmentCoreActivated) {
          this.uiManager.showToast('CONTAINMENT CORE ALREADY SEALED — RETURN TO NURSES\' STATION!', 'emerald');
          break;
        }
        gs.containmentCoreActivated = true;
        if (this.soundEngine) this.soundEngine.playTaskCompleteSFX();
        this.uiManager.showToast(
          'CENTRAL CONTAINMENT CORE ACTIVATED! SURVIVE OUTBREAK & LOCK DOWN AT NURSES\' STATION!',
          'emerald'
        );
        // Trigger Shift 5 final escape chase telegraph
        this.chaseSystem.startChaseWarning(new THREE.Vector3(-18, -4, -24));
        break;
      }

      case 'INTERACT_HIDE_LOCKER': {
        gs.isHidingInLocker = !gs.isHidingInLocker;
        if (gs.isHidingInLocker) {
          this.uiManager.showToast('HIDING INSIDE UTILITY LOCKER — PRESS [E] TO EXIT', 'cyan');
        }
        break;
      }

      case 'INTERACT_COSMETIC_LOCKER': {
        this.uiManager.openCosmeticsModal();
        break;
      }

      case 'TASK_SECURE_WARD': {
        // If a chase is active or warning is active, toggle Safe Zone Security Shutter immediately
        if (gs.chaseActive || gs.chaseWarningActive) {
          gs.nursesShutterClosed = true;
          this.hospitalBuilder.setNursesShutter(true);
          this.chaseSystem.endChaseSuccess('NURSES\' STATION SAFE ZONE SHUTTER ENGAGED — ENTITY RETREATED!');
          setTimeout(() => {
            this.gameState.nursesShutterClosed = false;
            this.hospitalBuilder.setNursesShutter(false);
          }, 3000);
          if (!this.missionSystem.canSecureWard()) {
            break;
          }
        }

        if (this.missionSystem.canSecureWard()) {
          gs.wardSecured = true;
          this.missionSystem.evaluateObjectives();
          this.uiManager.updateHUD();
          if (this.onShiftCompleted) {
            this.onShiftCompleted();
          }
        } else {
          const guidance = this.missionSystem.getActiveGuidance();
          this.uiManager.showToast(
            `CANNOT LOCK DOWN YET — INCOMPLETE OBJECTIVE: ${guidance.targetTitle.toUpperCase()}`,
            'amber'
          );
        }
        break;
      }

      default:
        break;
    }

    this.missionSystem.evaluateObjectives();
    this.uiManager.updateHUD();
    return true;
  }
}
