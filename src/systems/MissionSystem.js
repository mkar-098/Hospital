// src/systems/MissionSystem.js
// Manages Shift 1–5 + Endless objectives, real-time objective state machine, active guidance, and 3D screen-space waypoints

class MissionSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.objectives = [];
  }

  initShiftObjectives() {
    const gs = this.gameState;
    const totalPatients = gs.patients.length;
    const totalImpostors = gs.patients.filter((p) => p.isImpostor).length;
    const totalGenuine = totalPatients - totalImpostors;

    this.objectives = [];

    if (gs.isEndless) {
      const taskPool = [
        {
          id: 'DELIVER_MEDICATION',
          title: 'Deliver Medication from Pharmacy to Ward Patient',
          completed: false,
          targetPos: new THREE.Vector3(14.5, 1.15, -7.5),
          locationName: '9. Pharmacy -> Patient Ward',
          actionHint: 'Pick up medication at the Pharmacy counter [E], then examine a genuine patient'
        },
        {
          id: 'DELIVER_CHART',
          title: 'Retrieve Missing Medical File from Reception to Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(0.4, 1.15, 21.6),
          locationName: '1. Reception (North Wing)',
          actionHint: 'Pick up the Medical File at Reception [E] and deliver it to Nurses\' Station'
        },
        {
          id: 'RESTOCK_SUPPLIES',
          title: 'Restock Examination Room with Storage Supply Crate',
          completed: false,
          targetPos: new THREE.Vector3(9.4, 0.6, -13.2),
          locationName: '11. Storage Room -> 4. Examination Room',
          actionHint: 'Pick up Supply Crate in Storage Room [E] and place on Exam Room Prep Table'
        },
        {
          id: 'LOG_CCTV_EVIDENCE',
          title: 'Log Camera Anomaly Evidence on CCTV Console',
          completed: false,
          targetPos: new THREE.Vector3(-9.8, 1.2, -7.0),
          locationName: '8. CCTV Surveillance Room',
          actionHint: 'Open CCTV Console [E], view CAM 01, and click "Log Camera Evidence"'
        }
      ];
      const waveTaskA = taskPool[(gs.endlessHour - 1) % taskPool.length];
      const waveTaskB = taskPool[gs.endlessHour % taskPool.length];

      this.objectives = [
        {
          id: 'VERIFY_DATABASE',
          title: 'Download Patient Roster at Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(0, 1.2, 6.45),
          locationName: "7. Nurses' Station",
          actionHint: 'Interact [E] with the Master Patient Database Terminal'
        },
        waveTaskA,
        waveTaskB,
        {
          id: 'EXAMINE_ALL',
          title: `Examine & Resolve All Ward Patients (0/${totalPatients})`,
          completed: false,
          targetPos: new THREE.Vector3(-14, 1.2, 8.0),
          locationName: '3. Patient Ward (Rooms 001–006)',
          actionHint: 'Inspect patients [E], run INVESTIGATE scans, and APPROVE or CONTAIN'
        },
        {
          id: 'RESTORE_SYSTEMS',
          title: 'Keep Power & CCTV Operational',
          completed: true,
          targetPos: new THREE.Vector3(-9.8, 1.2, -8.5),
          locationName: 'CCTV / Basement',
          actionHint: 'Repair CCTV or restore Basement Breaker if tripped'
        },
        {
          id: 'SECURE_WARD',
          title: 'Lock Down Ward / Clock Out at Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(0, 1.2, 5.55),
          locationName: "7. Nurses' Station",
          actionHint: 'Activate the Ward Security Lockdown Panel [E] once all tasks & patients are resolved'
        }
      ];
      this.evaluateObjectives();
      return;
    }

    const s = gs.shift;

    if (s === 1) {
      this.objectives = [
        {
          id: 'VERIFY_DATABASE',
          title: 'Check Master Database at Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(0, 1.2, 7.0),
          locationName: "7. Nurses' Station (Central Hub)",
          actionHint: 'Approach the Master Database Terminal and press [E]'
        },
        {
          id: 'INVESTIGATE_PATIENTS',
          title: `Examine & Investigate Ward Patients (0/${totalPatients})`,
          completed: false,
          targetPos: new THREE.Vector3(-14, 1.2, 8.0),
          locationName: 'West Patient Ward (Rooms 001–003)',
          actionHint: 'Open room doors [E], examine patients, and click INVESTIGATE'
        },
        {
          id: 'RESOLVE_PATIENTS',
          title: `Contain ${totalImpostors} Impostor & Approve ${totalGenuine} Genuine (0/${totalPatients})`,
          completed: false,
          targetPos: new THREE.Vector3(-14, 1.2, 12.0),
          locationName: 'West Patient Ward (Rooms 001–003)',
          actionHint: 'Use CONTAIN on the impostor with discrepancy clues and APPROVE genuine patients'
        },
        {
          id: 'SECURE_WARD',
          title: 'Engage Ward Security Lock at Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(0, 1.2, 5.0),
          locationName: "7. Nurses' Station",
          actionHint: 'Press [E] on the Ward Security & Lockdown Panel to complete Shift 1'
        }
      ];
    } else if (s === 2) {
      this.objectives = [
        {
          id: 'VERIFY_DATABASE',
          title: 'Review Shift Roster at Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(0, 1.2, 7.0),
          locationName: "7. Nurses' Station",
          actionHint: 'Press [E] on the Master Patient Database Terminal'
        },
        {
          id: 'CHECK_CCTV',
          title: 'Inspect Camera Feeds in CCTV Surveillance Room',
          completed: false,
          targetPos: new THREE.Vector3(-9.8, 1.2, -7.0),
          locationName: '8. CCTV Surveillance Room (South Wing)',
          actionHint: 'Walk south to the CCTV Room and press [E] on the Surveillance Console'
        },
        {
          id: 'DELIVER_MEDICATION',
          title: 'Deliver Medication from Pharmacy to Ward Patient',
          completed: false,
          targetPos: new THREE.Vector3(14.5, 1.15, -7.5),
          locationName: '9. Pharmacy -> Patient Ward',
          actionHint: 'Pick up medication at the Pharmacy counter [E], then examine a genuine patient'
        },
        {
          id: 'RESOLVE_PATIENTS',
          title: `Contain ${totalImpostors} Impostors & Approve ${totalGenuine} Genuine (0/${totalPatients})`,
          completed: false,
          targetPos: new THREE.Vector3(-14, 1.2, 12.0),
          locationName: 'West Patient Ward (Rooms 001–004)',
          actionHint: 'Cross-check red herrings carefully; Contain 2 Impostors and Approve 2 Genuine'
        },
        {
          id: 'SECURE_WARD',
          title: 'Secure the Hospital Ward at Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(0, 1.2, 5.0),
          locationName: "7. Nurses' Station",
          actionHint: 'Activate the Ward Security Lockdown Panel [E]'
        }
      ];
    } else if (s === 3) {
      this.objectives = [
        {
          id: 'DELIVER_CHART',
          title: 'Retrieve Missing Medical File from Reception to Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(0.4, 1.15, 21.6),
          locationName: '1. Reception (North Wing)',
          actionHint: 'Pick up the Medical File at Reception [E] and deliver it to Nurses\' Station'
        },
        {
          id: 'REPAIR_CCTV',
          title: 'Recalibrate Malfunctioning Signal in CCTV Room',
          completed: false,
          targetPos: new THREE.Vector3(-9.8, 1.2, -8.5),
          locationName: '8. CCTV Surveillance Room',
          actionHint: 'Interact [E] with the Signal Recalibrator or click Recalibrate Signal on CCTV Console'
        },
        {
          id: 'RESTORE_BREAKER',
          title: 'Ensure Basement Main Electrical Breaker is Online',
          completed: true,
          targetPos: new THREE.Vector3(3.5, -2.5, -28.2),
          locationName: '13. Basement & Breaker Room (Lower Level)',
          actionHint: 'Take the South Stairwell down to the Basement and flip Breaker Switches #1–3 [E]'
        },
        {
          id: 'RESOLVE_PATIENTS',
          title: `Examine & Resolve All 5 Ward Patients (0/${totalPatients})`,
          completed: false,
          targetPos: new THREE.Vector3(-14, 1.2, 12.0),
          locationName: 'West Patient Ward (Rooms 001–005)',
          actionHint: 'Investigate all 5 rooms, Contain 2 Impostors, and Approve 3 Genuine patients'
        },
        {
          id: 'SECURE_WARD',
          title: 'Engage Ward Security Lock at Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(0, 1.2, 5.0),
          locationName: "7. Nurses' Station",
          actionHint: 'Activate the Ward Security Lockdown Panel [E]'
        }
      ];
    } else if (s === 4) {
      this.objectives = [
        {
          id: 'RESTOCK_SUPPLIES',
          title: 'Restock Examination Room with Storage Supply Crate',
          completed: false,
          targetPos: new THREE.Vector3(9.4, 0.6, -13.2),
          locationName: '11. Storage Room -> 4. Examination Room',
          actionHint: 'Pick up Supply Crate in Storage Room [E] and place on Exam Room Prep Table'
        },
        {
          id: 'LOG_CCTV_EVIDENCE',
          title: 'Log Camera Anomaly Evidence on CCTV Console',
          completed: false,
          targetPos: new THREE.Vector3(-9.8, 1.2, -7.0),
          locationName: '8. CCTV Surveillance Room',
          actionHint: 'Open CCTV Console [E], view CAM 01, and click "Log Camera Evidence"'
        },
        {
          id: 'RESOLVE_PATIENTS',
          title: `Identify Perfect Impostor & Resolve All 5 Patients (0/${totalPatients})`,
          completed: false,
          targetPos: new THREE.Vector3(-14, 1.2, 12.0),
          locationName: 'West Patient Ward (Rooms 001–005)',
          actionHint: 'Combine CCTV/Database clues + Vocal scan (2 clues) to contain the Perfect Impostor'
        },
        {
          id: 'SECURE_WARD',
          title: 'Complete Ward Containment Lockdown at Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(0, 1.2, 5.0),
          locationName: "7. Nurses' Station",
          actionHint: 'Activate the Ward Security Lockdown Panel [E]'
        }
      ];
    } else {
      // Shift 5: Outbreak
      this.objectives = [
        {
          id: 'RESTORE_BREAKER',
          title: 'Restore Basement Main Electrical Breaker',
          completed: false,
          targetPos: new THREE.Vector3(3.5, -2.5, -28.2),
          locationName: '13. Basement & Breaker Room (Lower Level)',
          actionHint: 'Descend South Stairwell to Basement and flip Breaker Switches #1–3 [E]'
        },
        {
          id: 'REPAIR_CCTV',
          title: 'Recalibrate CCTV Surveillance Signal in CCTV Room',
          completed: false,
          targetPos: new THREE.Vector3(-9.8, 1.2, -8.5),
          locationName: '8. CCTV Surveillance Room',
          actionHint: 'Interact [E] with the Signal Recalibrator or click Recalibrate Signal on CCTV Console'
        },
        {
          id: 'RESOLVE_PATIENTS',
          title: `Examine All 6 Patients & Contain 4 Impostors (0/${totalPatients})`,
          completed: false,
          targetPos: new THREE.Vector3(-14, 1.2, 12.0),
          locationName: 'West Patient Ward (Rooms 001–006)',
          actionHint: 'Investigate Rooms 001–006, Contain all 4 Impostors, and Approve 2 Genuine'
        },
        {
          id: 'COLLECT_KEYCARD',
          title: 'Collect Restricted Keycard from Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(1.9, 1.2, 6.0),
          locationName: "7. Nurses' Station",
          actionHint: 'Pick up the Restricted Wing Keycard from the Authorization Rack [E]'
        },
        {
          id: 'ACTIVATE_CORE',
          title: 'Seal Central Containment Core in Restricted Wing',
          completed: false,
          targetPos: new THREE.Vector3(-12.5, -2.8, -24.0),
          locationName: '14. Restricted Wing (Lower Level West)',
          actionHint: 'Unlock the Basement Biohazard Airlock [E] and activate the Containment Core'
        },
        {
          id: 'SECURE_WARD',
          title: 'Survive Outbreak & Lock Down Facility at Nurses\' Station',
          completed: false,
          targetPos: new THREE.Vector3(0, 1.2, 5.0),
          locationName: "7. Nurses' Station",
          actionHint: 'Return up the stairs and activate the Final Lockdown Panel [E]'
        }
      ];
    }

    this.evaluateObjectives();
  }

  evaluateObjectives() {
    const gs = this.gameState;
    const totalPatients = gs.patients.length;
    const investigatedCount = gs.patients.filter((p) => p.investigation.examinedOnce).length;
    const correctlyResolvedCount = gs.patients.filter(
      (p) => (p.isImpostor && p.status === 'CONTAINED') || (!p.isImpostor && p.status === 'APPROVED')
    ).length;

    // Find next unresolved patient room for dynamic waypoint
    const nextUnresolvedPatient = gs.patients.find(
      (p) => !((p.isImpostor && p.status === 'CONTAINED') || (!p.isImpostor && p.status === 'APPROVED'))
    );
    let nextPatientPos = new THREE.Vector3(-14, 1.2, 8.0);
    let nextPatientRoomLabel = 'West Patient Ward';
    if (nextUnresolvedPatient) {
      const r = PATIENT_ROOMS[nextUnresolvedPatient.index];
      if (r) {
        nextPatientPos = new THREE.Vector3(r.bedX, 1.1, r.bedZ);
        nextPatientRoomLabel = `Patient Ward — ${r.id} (${nextUnresolvedPatient.name})`;
      }
    }

    for (const obj of this.objectives) {
      switch (obj.id) {
        case 'VERIFY_DATABASE':
          obj.completed = gs.databaseVerified;
          break;

        case 'INVESTIGATE_PATIENTS':
          obj.title = `Examine & Investigate Ward Patients (${investigatedCount}/${totalPatients})`;
          obj.completed = investigatedCount >= totalPatients;
          obj.targetPos = nextPatientPos;
          obj.locationName = nextPatientRoomLabel;
          break;

        case 'EXAMINE_ALL':
        case 'RESOLVE_PATIENTS':
          obj.title = `Resolve All Ward Patients (${correctlyResolvedCount}/${totalPatients} Correct)`;
          obj.completed = correctlyResolvedCount >= totalPatients && gs.falseContainmentsActive === 0;
          obj.targetPos = nextPatientPos;
          obj.locationName = nextPatientRoomLabel;
          if (gs.falseContainmentsActive > 0) {
            obj.actionHint = 'WARNING: A genuine patient is falsely CONTAINED! Open their Dossier and click RELEASE + APPROVE.';
          } else {
            obj.actionHint = `Inspect ${nextUnresolvedPatient ? nextUnresolvedPatient.assignedRoom : 'ward'}, run INVESTIGATE scans, then APPROVE or CONTAIN.`;
          }
          break;

        case 'CHECK_CCTV':
          obj.completed = gs.cctvCheckedInRoom;
          break;

        case 'DELIVER_MEDICATION':
          obj.completed = gs.medicationAdministered;
          if (!gs.medicationPickedUp) {
            obj.targetPos = new THREE.Vector3(14.5, 1.15, -7.5);
            obj.locationName = '9. Pharmacy (East/South Wing)';
            obj.actionHint = 'Pick up prescribed medication from the Pharmacy counter [E]';
          } else {
            const genuinePatient = gs.patients.find((p) => !p.isImpostor) || gs.patients[0];
            const targetRoom =
              PATIENT_ROOMS[genuinePatient ? genuinePatient.index : 0] || PATIENT_ROOMS[0];
            obj.targetPos = new THREE.Vector3(targetRoom.bedX, 1.1, targetRoom.bedZ);
            obj.locationName = `Patient Ward — ${targetRoom.id}${
              genuinePatient ? ` (${genuinePatient.name})` : ''
            }`;
            obj.actionHint = `Examine genuine patient in ${targetRoom.id} [E] to administer their medication`;
          }
          break;

        case 'DELIVER_CHART':
          obj.completed = gs.chartDelivered;
          if (!gs.chartPickedUp) {
            obj.targetPos = new THREE.Vector3(0.4, 1.15, 21.6);
            obj.locationName = '1. Reception Desk (North Wing)';
            obj.actionHint = 'Pick up the misplaced Medical File at Reception [E]';
          } else {
            obj.targetPos = new THREE.Vector3(0, 1.2, 7.0);
            obj.locationName = "7. Nurses' Station";
            obj.actionHint = 'Deliver the Medical File to the Nurses\' Station Master Terminal [E]';
          }
          break;

        case 'REPAIR_CCTV':
          obj.completed = gs.cctvRecalibratedCount > 0;
          break;

        case 'RESTORE_BREAKER':
          obj.completed = !gs.isBlackout && gs.breakerRestored;
          break;

        case 'RESTORE_SYSTEMS':
          obj.completed = !gs.isBlackout;
          if (gs.isBlackout) {
            obj.targetPos = new THREE.Vector3(3.5, -2.5, -28.2);
            obj.locationName = '13. Basement Breaker Panel';
            obj.actionHint = 'Restore tripped electrical breaker switches in the Basement [E]';
          }
          break;

        case 'RESTOCK_SUPPLIES':
          obj.completed = gs.suppliesRestocked;
          if (!gs.suppliesPickedUp) {
            obj.targetPos = new THREE.Vector3(9.4, 0.6, -13.2);
            obj.locationName = '11. Storage Room (South Wing)';
            obj.actionHint = 'Pick up a Medical Supply Crate in the Storage Room [E]';
          } else {
            obj.targetPos = new THREE.Vector3(12.0, 1.0, 13.5);
            obj.locationName = '4. Examination Room (East Wing)';
            obj.actionHint = 'Place the Supply Crate on the Examination Prep Table [E]';
          }
          break;

        case 'LOG_CCTV_EVIDENCE':
          obj.completed = gs.cctvEvidenceLogged;
          break;

        case 'COLLECT_KEYCARD':
          obj.completed = gs.hasRestrictedKeycard;
          break;

        case 'ACTIVATE_CORE':
          obj.completed = gs.containmentCoreActivated;
          if (!gs.restrictedAirlockUnlocked) {
            obj.targetPos = new THREE.Vector3(-6, -2.8, -24);
            obj.locationName = '13. Basement -> 14. Restricted Wing Airlock';
            obj.actionHint = 'Use Restricted Keycard [E] on the Basement Biohazard Airlock Door';
          } else {
            obj.targetPos = new THREE.Vector3(-12.5, -2.8, -24);
            obj.locationName = '14. Restricted Wing';
            obj.actionHint = 'Press [E] on the Central Containment Core to seal the wing';
          }
          break;

        case 'SECURE_WARD':
          obj.completed = gs.wardSecured;
          break;

        default:
          break;
      }
    }
  }

  canSecureWard() {
    this.evaluateObjectives();
    const prereqs = this.objectives.filter((o) => o.id !== 'SECURE_WARD');
    return prereqs.every((o) => o.completed);
  }

  getActiveGuidance() {
    this.evaluateObjectives();

    // If a Chase or Chase Warning is active, immediately guide player to nearest Safe Zone!
    if (this.gameState.chaseActive || this.gameState.chaseWarningActive) {
      return {
        targetTitle: '⚠ EMERGENCY: REACH SAFE ZONE!',
        locationName: "Nurses' Station Shutter / CCTV Room / Storage Locker",
        actionHint: 'Sprint [Shift] to Nurses\' Station Lockdown Panel or CCTV Room and close door [E]!',
        worldPos: new THREE.Vector3(0, 1.2, 5.0),
        isEmergency: true
      };
    }

    // If blackout is active, prioritize Basement Breaker
    if (this.gameState.isBlackout) {
      return {
        targetTitle: '⚡ RESTORE HOSPITAL POWER',
        locationName: '13. Basement & Breaker Room (via South Stairwell)',
        actionHint: 'Use Flashlight [F], descend the South Stairwell, and flip the Main Breaker [E]',
        worldPos: new THREE.Vector3(3.5, -2.5, -28.2),
        isEmergency: true
      };
    }

    const activeObj = this.objectives.find((o) => !o.completed) || this.objectives[this.objectives.length - 1];
    if (!activeObj) {
      return {
        targetTitle: 'All Objectives Complete',
        locationName: "7. Nurses' Station",
        actionHint: 'Engage Ward Security Lockdown',
        worldPos: new THREE.Vector3(0, 1.2, 5.0),
        isEmergency: false
      };
    }

    return {
      targetTitle: activeObj.title,
      locationName: activeObj.locationName,
      actionHint: activeObj.actionHint,
      worldPos: activeObj.targetPos,
      isEmergency: false
    };
  }
}
