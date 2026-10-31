// src/entities/PatientAI.js
// Builds and animates articulated 3D patient models in Rooms 001–006 with impostor-specific 3D behaviors

class PatientAI {
  constructor(scene, gameState) {
    this.scene = scene;
    this.gameState = gameState;
    this.patientEntities = []; // { patient, room, root, torso, head, faceGroup, leftArm, rightArm, basePos }
    this.animClock = 0;
  }

  clear() {
    for (const ent of this.patientEntities) {
      this.scene.remove(ent.root);
    }
    this.patientEntities = [];
  }

  spawnPatients(patients) {
    this.clear();

    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      const room = PATIENT_ROOMS[i];
      if (!room) continue;

      const root = new THREE.Group();
      const basePos = new THREE.Vector3(room.bedX, 0.68, room.bedZ);
      root.position.copy(basePos);
      root.rotation.y = room.side === 'north' ? Math.PI : 0;

      const gownMat = new THREE.MeshStandardMaterial({
        color: p.appearance.gownColor,
        roughness: 0.7
      });
      const skinMat = new THREE.MeshStandardMaterial({
        color: p.impostorType === IMPOSTOR_TYPES.SILENT_ONE ? 0xcbd5e1 : p.appearance.skinColor,
        roughness: 0.6
      });
      const hairMat = new THREE.MeshStandardMaterial({
        color: p.appearance.hairColor,
        roughness: 0.8
      });

      // Seated / Semi-reclined Torso on Hospital Bed
      const torso = new THREE.Group();
      const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.26), gownMat);
      torsoMesh.position.y = 0.28;
      torso.add(torsoMesh);
      root.add(torso);

      // Head & Face
      const head = new THREE.Group();
      head.position.set(0, 0.68, 0);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), skinMat);
      const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.188, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        hairMat
      );
      head.add(skull, hair);

      // Facial Features Group (missing/warped for FACELESS)
      const faceGroup = new THREE.Group();
      if (p.impostorType !== IMPOSTOR_TYPES.FACELESS) {
        const eyeMat = new THREE.MeshBasicMaterial({
          color: p.impostorType === IMPOSTOR_TYPES.STALKER ? 0xfbbf24 : 0x0f172a
        });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat);
        leftEye.position.set(-0.06, 0.03, 0.16);
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat);
        rightEye.position.set(0.06, 0.03, 0.16);
        const mouth = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.018, 0.02),
          new THREE.MeshBasicMaterial({ color: 0x450a0a })
        );
        mouth.position.set(0, -0.06, 0.165);
        faceGroup.add(leftEye, rightEye, mouth);
      } else {
        // Warped smooth indentation for Faceless
        const indent = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.14, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 })
        );
        indent.position.set(0, 0, 0.165);
        faceGroup.add(indent);
      }
      head.add(faceGroup);
      torso.add(head);

      // Arms & Wristband
      const leftArm = new THREE.Group();
      leftArm.position.set(0.28, 0.45, 0);
      const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), skinMat);
      lArmMesh.position.y = -0.18;
      // Medical ID Wristband
      const wristband = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.068, 0.05, 10),
        new THREE.MeshBasicMaterial({
          color: p.impostorType === IMPOSTOR_TYPES.WRONG_PATIENT ? 0xf59e0b : 0x38bdf8
        })
      );
      wristband.position.y = -0.34;
      leftArm.add(lArmMesh, wristband);
      torso.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(-0.28, 0.45, 0);
      const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), skinMat);
      rArmMesh.position.y = -0.18;
      rightArm.add(rArmMesh);
      torso.add(rightArm);

      // Legs stretched along mattress
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.85), gownMat);
      legs.position.set(0, 0.06, 0.48);
      root.add(legs);

      this.scene.add(root);

      this.patientEntities.push({
        patient: p,
        room,
        root,
        torso,
        head,
        faceGroup,
        leftArm,
        rightArm,
        basePos,
        doorStandPos: new THREE.Vector3(room.doorX, 0.68, room.doorZ + (room.side === 'north' ? 1.1 : -1.1))
      });
    }
  }

  getGlitchedWorldPositions() {
    const res = [];
    for (const ent of this.patientEntities) {
      if (
        ent.patient.isImpostor &&
        ent.patient.impostorType === IMPOSTOR_TYPES.GLITCHED &&
        ent.patient.status !== 'CONTAINED'
      ) {
        res.push(ent.root.position);
      }
    }
    return res;
  }

  update(dt, camera) {
    this.animClock += dt;
    const playerPos = new THREE.Vector3(
      this.gameState.player.x,
      this.gameState.player.y + 1.65,
      this.gameState.player.z
    );
    const camDir = new THREE.Vector3(0, 0, -1);
    if (camera) camDir.applyQuaternion(camera.quaternion);

    for (let i = 0; i < this.patientEntities.length; i++) {
      const ent = this.patientEntities[i];
      const p = ent.patient;
      const t = this.animClock + i * 1.3;

      // Default position on bed
      ent.root.position.copy(ent.basePos);

      if (p.status === 'CONTAINED') {
        // Contained inside room
        ent.head.rotation.set(0, 0, 0);
        continue;
      }

      const toPatient = new THREE.Vector3().subVectors(ent.basePos, playerPos);
      const dist = toPatient.length();
      const isPlayerLooking = toPatient.normalize().dot(camDir) > 0.55 && dist < 12;

      if (!p.isImpostor) {
        // Genuine patient breathing & subtle movement
        ent.torso.scale.y = 1 + Math.sin(t * 2.2) * 0.025;
        ent.head.rotation.y = Math.sin(t * 0.8) * 0.15;
        if (p.diagnosis.includes('Concussion')) {
          ent.leftArm.rotation.z = Math.sin(t * 14) * 0.06;
        }
        continue;
      }

      // Impostor-specific 3D animations
      switch (p.impostorType) {
        case IMPOSTOR_TYPES.FACELESS:
          ent.torso.scale.y = 1 + Math.sin(t * 1.8) * 0.02;
          // Turns head away until player is close
          ent.head.rotation.y = dist < 3.6 ? 0 : 1.25;
          break;

        case IMPOSTOR_TYPES.REPEATER: {
          // Mechanical 3.5s loop
          const cycle = (this.animClock % 3.5) / 3.5;
          ent.head.rotation.z = cycle > 0.75 ? 0.45 : 0;
          ent.rightArm.rotation.x = cycle > 0.75 ? -0.8 : 0;
          break;
        }

        case IMPOSTOR_TYPES.SILENT_ONE:
          // Motionless, zero chest movement, stares directly at player
          ent.torso.scale.y = 1.0;
          ent.head.lookAt(playerPos.x, ent.basePos.y + 0.68, playerPos.z);
          break;

        case IMPOSTOR_TYPES.STALKER:
          // Stands near doorway when unobserved or when player is viewing CCTV!
          if (!isPlayerLooking || this.gameState.mode === 'CCTV') {
            ent.root.position.copy(ent.doorStandPos);
          } else {
            ent.root.position.copy(ent.basePos);
          }
          break;

        case IMPOSTOR_TYPES.GLITCHED:
          // Vertex/position jitter
          if (Math.sin(t * 19) > 0.65) {
            ent.root.position.x += (Math.random() - 0.5) * 0.18;
            ent.head.rotation.z = (Math.random() - 0.5) * 0.5;
          } else {
            ent.head.rotation.z = 0;
          }
          break;

        case IMPOSTOR_TYPES.PERFECT:
          // Normal when observed in person; anomalous posture when rendered on CCTV
          if (this.gameState.mode === 'CCTV') {
            ent.head.rotation.z = 0.65;
            ent.rightArm.rotation.x = -1.1;
          } else {
            ent.torso.scale.y = 1 + Math.sin(t * 2.1) * 0.02;
            ent.head.rotation.z = 0;
            ent.rightArm.rotation.x = 0;
          }
          break;

        default:
          ent.torso.scale.y = 1 + Math.sin(t * 2.0) * 0.02;
          break;
      }
    }
  }
}
