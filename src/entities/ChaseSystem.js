// src/entities/ChaseSystem.js
// Manages 4-Stage Hospital Danger Escalation, 3.5s Warning Telegraph, Hostile Entity Pursuit, Door Slowdown, Safe Zones & 3 Lives

class ChaseSystem {
  constructor(scene, gameState, doorSystem, hospitalBuilder, soundEngine, uiManager) {
    this.scene = scene;
    this.gameState = gameState;
    this.doorSystem = doorSystem;
    this.hospitalBuilder = hospitalBuilder;
    this.soundEngine = soundEngine;
    this.uiManager = uiManager;

    this.entityRig = null;
    this.entityPos = new THREE.Vector3(0, 0, -12);
    this.entitySpeed = 5.6;
    this.warningTimer = 0;
    this.chaseTimer = 0;
    this.doorBashTimer = 0;
    this.ambientDangerTimer = 0;
    this.walkCycle = 0;
    this.onPlayerEliminated = null;

    this.buildHostileEntityMesh();
  }

  buildHostileEntityMesh() {
    this.entityRig = new THREE.Group();

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x3b0764,
      emissiveIntensity: 0.25
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // Elongated uncanny silhouette (2.25m tall)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.05, 0.3), darkMat);
    torso.position.y = 1.35;
    this.entityRig.add(torso);

    const head = new THREE.Group();
    head.position.set(0, 2.08, 0.06);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), darkMat);
    skull.scale.set(0.9, 1.35, 0.95);
    const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeMat);
    lEye.position.set(-0.07, 0.04, 0.19);
    const rEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeMat);
    rEye.position.set(0.07, 0.04, 0.19);
    head.add(skull, lEye, rEye);
    this.entityRig.add(head);

    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), darkMat);
    this.leftArm.position.set(0.36, 1.35, 0.15);
    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), darkMat);
    this.rightArm.position.set(-0.36, 1.35, 0.15);

    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.15), darkMat);
    this.leftLeg.position.set(0.15, 0.45, 0);
    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.15), darkMat);
    this.rightLeg.position.set(-0.15, 0.45, 0);

    const auraLight = new THREE.PointLight(0xef4444, 1.4, 7);
    auraLight.position.set(0, 1.8, 0.2);

    this.entityRig.add(this.leftArm, this.rightArm, this.leftLeg, this.rightLeg, auraLight);
    this.entityRig.visible = false;
    this.scene.add(this.entityRig);
  }

  reset() {
    this.gameState.chaseActive = false;
    this.gameState.chaseWarningActive = false;
    this.warningTimer = 0;
    this.chaseTimer = 0;
    this.doorBashTimer = 0;
    if (this.entityRig) this.entityRig.visible = false;
  }

  /**
   * Escalates danger and optionally triggers a telegraphed Level 4 Chase Warning
   */
  escalateDanger(amount, reasonText = '', forceChase = false) {
    const prevLevel = this.gameState.dangerLevel;
    const newLevel = this.gameState.addDanger(amount);

    if (reasonText && this.uiManager) {
      this.uiManager.showToast(reasonText, newLevel >= 3 ? 'red' : 'amber');
    }

    if (newLevel >= 3 && prevLevel < 3 && !this.gameState.isBlackout && this.gameState.shift >= 3) {
      this.triggerBlackout();
    }

    if ((newLevel >= 4 || forceChase) && !this.gameState.chaseActive && !this.gameState.chaseWarningActive) {
      this.startChaseWarning();
    } else {
      this.syncAudioWithDanger();
    }
  }

  triggerBlackout() {
    if (this.gameState.isBlackout) return;
    this.gameState.isBlackout = true;
    this.gameState.breakerRestored = false;
    this.gameState.breakerSwitches = [false, false, false];
    if (this.hospitalBuilder) {
      this.hospitalBuilder.updateBreakerVisuals(this.gameState.breakerSwitches);
    }
    if (this.soundEngine) {
      this.soundEngine.playPowerDownSFX();
    }
    if (this.uiManager) {
      this.uiManager.showToast(
        '⚡ POWER GRID TRIPPED — RESTORE MAIN BREAKER IN BASEMENT!',
        'red'
      );
    }
  }

  startChaseWarning(customSpawnPos = null) {
    if (this.gameState.mode === 'CUTSCENE' || this.gameState.mode === 'GAMEOVER') return;
    this.gameState.setDanger(85);
    this.gameState.chaseWarningActive = true;
    this.gameState.chaseActive = false;
    this.warningTimer = 3.5; // 3.5-second fair warning telegraph
    this.customSpawnPos = customSpawnPos;

    if (this.soundEngine) {
      this.soundEngine.setAudioState('chase');
      this.soundEngine.playAlarmStinger();
    }
    if (this.uiManager) {
      this.uiManager.showToast(
        '⚠ ENTITY BREACH IN 3.5s — RUN TO SAFE ZONE (NURSES\' STATION / CCTV / LOCKER)!',
        'red'
      );
      this.uiManager.updateHUD();
    }
  }

  spawnPursuingEntity() {
    this.gameState.chaseWarningActive = false;
    this.gameState.chaseActive = true;
    this.chaseTimer = 20.0; // 20-second pursuit duration
    this.doorBashTimer = 0;

    const px = this.gameState.player.x;
    const py = this.gameState.player.y;
    const pz = this.gameState.player.z;

    if (this.customSpawnPos) {
      this.entityPos.copy(this.customSpawnPos);
    } else if (py < -2.0) {
      // Player is in Lower Level -> spawn at far end of Restricted Wing / Basement (>= 12m away)
      const sx = px < -6 ? 4.0 : -14.0;
      this.entityPos.set(sx, -4.0, -24.0);
    } else {
      // Main Floor corridor spawn points at least 13m away from player
      const candidates = [
        new THREE.Vector3(-22, 0, 6),
        new THREE.Vector3(18, 0, 6),
        new THREE.Vector3(0, 0, 20),
        new THREE.Vector3(0, 0, -10)
      ];
      let best = candidates[0];
      let bestDist = 0;
      for (const c of candidates) {
        const d = Math.hypot(c.x - px, c.z - pz);
        if (d > bestDist) {
          bestDist = d;
          best = c;
        }
      }
      this.entityPos.copy(best);
    }

    this.entityRig.position.copy(this.entityPos);
    this.entityRig.visible = true;
  }

  isPlayerInSafeZone() {
    if (this.gameState.isHidingInLocker) return true;

    const px = this.gameState.player.x;
    const py = this.gameState.player.y;
    const pz = this.gameState.player.z;

    // 1. Nurses' Station with Security Shutter engaged
    if (
      this.gameState.nursesShutterClosed &&
      py > -1 &&
      px >= -3.5 &&
      px <= 3.5 &&
      pz >= 3.5 &&
      pz <= 8.5
    ) {
      return true;
    }

    // 2. Inside CCTV Surveillance Room with Reinforced Door closed
    const cctvDoor = this.doorSystem.getDoor('DOOR_CCTV');
    if (
      py > -1 &&
      px >= -12 &&
      px <= -4.2 &&
      pz >= -11 &&
      pz <= -4 &&
      cctvDoor &&
      !cctvDoor.isOpen
    ) {
      return true;
    }

    return false;
  }

  endChaseSuccess(escapedMessage = 'SAFE ZONE REACHED — HOSTILE ENTITY RETREATED') {
    this.gameState.chaseActive = false;
    this.gameState.chaseWarningActive = false;
    this.entityRig.visible = false;
    this.gameState.setDanger(30); // Reset to Level 2 (30)
    this.gameState.survivedCorridorIncident = true;
    this.gameState.saveSystem?.unlockAchievement('NIGHT_SURVIVOR');

    this.syncAudioWithDanger();
    if (this.soundEngine) {
      this.soundEngine.playReliefChime();
    }
    if (this.uiManager) {
      this.uiManager.showToast(escapedMessage, 'emerald');
      this.uiManager.updateHUD();
    }
  }

  handlePlayerCaught() {
    this.gameState.chaseActive = false;
    this.gameState.chaseWarningActive = false;
    this.entityRig.visible = false;

    this.gameState.lives = Math.max(0, this.gameState.lives - 1);

    if (this.gameState.lives > 0) {
      const isFinalLife = this.gameState.lives === 1;
      if (this.soundEngine) {
        this.soundEngine.playLifeLostStinger(isFinalLife);
      }
      // Respawn player safely at Nurses' Station
      this.gameState.player.x = 0;
      this.gameState.player.y = 0;
      this.gameState.player.z = 7.65;
      this.gameState.player.yaw = Math.PI;
      this.gameState.setDanger(30);
      this.syncAudioWithDanger();

      if (this.uiManager) {
        this.uiManager.triggerDamageFlash();
        this.uiManager.showToast(
          `LIFE LOST — EMERGENCY RESUSCITATION AT NURSES' STATION (${this.gameState.lives}/3 LIVES REMAINING)`,
          'red'
        );
        this.uiManager.updateHUD();
      }
    } else {
      if (this.soundEngine) {
        this.soundEngine.playPlayerDeathSound();
      }
      if (this.onPlayerEliminated) {
        this.onPlayerEliminated('ELIMINATED BY HOSTILE ENTITY');
      }
    }
  }

  syncAudioWithDanger() {
    if (!this.soundEngine) return;
    if (this.gameState.chaseActive || this.gameState.chaseWarningActive) {
      this.soundEngine.setAudioState('chase');
    } else if (this.gameState.dangerLevel >= 2) {
      this.soundEngine.setAudioState('uncanny');
    } else {
      this.soundEngine.setAudioState('calm');
    }
  }

  getSteeringTarget(px, py, pz) {
    const ex = this.entityPos.x;
    const ey = this.entityPos.y;
    const ez = this.entityPos.z;

    // Multi-floor navigation via South Stairwell (X: -2.2..2.2, Z: -11..-19)
    if (ey < -1.5 && py > -1.0) {
      if (ex < -6.2) {
        return { x: -5.2, z: -24.0 }; // Exit Restricted Wing Airlock first
      }
      if (Math.abs(ex) > 1.8 && ez < -18.5) {
        return { x: 0.0, z: -19.2 }; // Align with bottom of South Stairwell
      }
      return { x: 0.0, z: -10.2 }; // Climb South Stairwell to Main Floor
    }

    if (ey >= -1.5 && py < -2.0) {
      if (ez > -11.0 || Math.abs(ex) > 1.8) {
        return { x: 0.0, z: -11.2 }; // Align with top of South Stairwell
      }
      return { x: 0.0, z: -19.2 }; // Descend South Stairwell to Basement
    }

    // Same-floor corridor routing when separated by wing walls
    if (ey >= -1.5 && py >= -1.5) {
      if (ex < -10.2 && px > -9.5 && Math.abs(ez - 8.0) > 1.2 && Math.abs(ez - 4.0) > 1.2) {
        // Exit patient room doorway into West Ward corridor
        const doorZ = ez >= 6.0 ? 8.0 : 4.0;
        return { x: -8.0, z: doorZ };
      }
      if (ex < -3.5 && px > -2.5 && Math.abs(ez - 6.0) > 1.6) {
        return { x: -3.0, z: 6.0 };
      }
      if (ez < -2.5 && pz > 2.5 && Math.abs(ex) > 2.2) {
        return { x: 0.0, z: -2.0 };
      }
    }

    return { x: px, z: pz };
  }

  update(dt) {
    if (this.gameState.mode !== 'PLAYING' && this.gameState.mode !== 'DOSSIER' && this.gameState.mode !== 'CCTV') {
      return;
    }

    // Subtle ambient danger creep on higher shifts
    this.ambientDangerTimer += dt;
    if (this.ambientDangerTimer >= 8.0) {
      this.ambientDangerTimer = 0;
      if (!this.gameState.chaseActive && !this.gameState.chaseWarningActive && this.gameState.shift >= 2) {
        const creep = this.gameState.shift >= 4 ? 2 : 1;
        this.gameState.addDanger(creep);
        this.syncAudioWithDanger();
      }
    }

    // Handle 3.5s Chase Telegraph Countdown
    if (this.gameState.chaseWarningActive) {
      this.warningTimer -= dt;
      if (this.warningTimer <= 0) {
        this.spawnPursuingEntity();
      }
      return;
    }

    if (!this.gameState.chaseActive) return;

    // Check if player reached a designated Safe Zone
    if (this.isPlayerInSafeZone()) {
      this.endChaseSuccess('SAFE ZONE SECURED — ENTITY LOST YOUR TRAIL!');
      return;
    }

    // Pursuit countdown timer
    this.chaseTimer -= dt;
    if (this.chaseTimer <= 0) {
      this.endChaseSuccess('PURSUIT EVADED — ENTITY RETREATED INTO THE SHADOWS!');
      return;
    }

    // Animate & move Hostile Entity toward player
    this.walkCycle += dt * 12;
    this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.65;
    this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.65;
    this.leftArm.rotation.x = -0.7 + Math.cos(this.walkCycle) * 0.35;
    this.rightArm.rotation.x = -0.7 - Math.cos(this.walkCycle) * 0.35;

    const px = this.gameState.player.x;
    const py = this.gameState.player.y;
    const pz = this.gameState.player.z;

    const dxPlayer = px - this.entityPos.x;
    const dzPlayer = pz - this.entityPos.z;
    const dist3D = Math.hypot(dxPlayer, py - this.entityPos.y, dzPlayer);

    // Check catch distance (< 1.2m)
    if (dist3D < 1.2) {
      this.handlePlayerCaught();
      return;
    }

    const target = this.getSteeringTarget(px, py, pz);
    const dx = target.x - this.entityPos.x;
    const dz = target.z - this.entityPos.z;
    const dist2D = Math.hypot(dx, dz);

    if (dist2D > 0.05) {
      const dirX = dx / dist2D;
      const dirZ = dz / dist2D;
      const step = this.entitySpeed * dt;
      const nextX = this.entityPos.x + dirX * step;
      const nextZ = this.entityPos.z + dirZ * step;

      // Check if a closed door blocks the entity
      const blockingDoor = this.doorSystem.checkDoorCollision(nextX, this.entityPos.y, nextZ, 0.38);
      if (blockingDoor) {
        if (blockingDoor.isReinforced || blockingDoor.isContained) {
          // Cannot breach reinforced safe zone door
          this.endChaseSuccess('REINFORCED SECURITY DOOR HELD — ENTITY RETREATED!');
          return;
        }
        // Pause for 2.0 seconds to bash open standard closed hospital door
        this.doorBashTimer += dt;
        if (this.doorBashTimer >= 2.0) {
          this.doorBashTimer = 0;
          blockingDoor.isOpen = true;
          blockingDoor.targetAngle = blockingDoor.openAngle;
          if (this.soundEngine) this.soundEngine.playDoorSFX(true);
        }
      } else {
        const resolved = this.hospitalBuilder.resolveMovement(
          this.entityPos.x,
          this.entityPos.y,
          this.entityPos.z,
          nextX,
          nextZ,
          0.32
        );
        this.entityPos.x = resolved.x;
        this.entityPos.y = resolved.y;
        this.entityPos.z = resolved.z;
      }

      this.entityRig.position.copy(this.entityPos);
      this.entityRig.rotation.y = Math.atan2(dirX, dirZ);
    }
  }
}
