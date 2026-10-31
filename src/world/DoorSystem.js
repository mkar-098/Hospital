// src/world/DoorSystem.js
// Hinged 3D hospital doors, room plaques, observation windows, biohazard containment shutters, and collision

class DoorSystem {
  constructor(scene, soundEngine) {
    this.scene = scene;
    this.soundEngine = soundEngine;
    this.doors = []; // Array of door objects
    this.doorMap = new Map(); // id -> door
    this.shutterTex = TextureFactory.createShutterTexture();
  }

  clear() {
    for (const d of this.doors) {
      this.scene.remove(d.root);
    }
    this.doors = [];
    this.doorMap.clear();
  }

  /**
   * Creates a hinged door with frame, handle, observation window, plaque, and optional biohazard shutter
   */
  createDoor({
    id,
    label,
    subtitle = '',
    x,
    y = 0,
    z,
    axis = 'x', // 'x' means wall runs along X (door faces Z); 'z' means wall runs along Z (door faces X)
    width = 1.4,
    height = 2.45,
    isOpen = false,
    isLocked = false,
    lockReason = '',
    hasShutter = false,
    isReinforced = false,
    plaqueSide = 1 // +1 or -1 normal offset
  }) {
    const root = new THREE.Group();
    root.position.set(x, y, z);
    if (axis === 'z') {
      root.rotation.y = Math.PI / 2;
    }

    // Door Frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: isReinforced ? 0x0f172a : 0x1e293b,
      roughness: 0.5,
      metalness: 0.4
    });

    const postGeo = new THREE.BoxGeometry(0.12, height, 0.28);
    const leftPost = new THREE.Mesh(postGeo, frameMat);
    leftPost.position.set(-width / 2 - 0.05, height / 2, 0);
    const rightPost = new THREE.Mesh(postGeo, frameMat);
    rightPost.position.set(width / 2 + 0.05, height / 2, 0);
    const topLintel = new THREE.Mesh(new THREE.BoxGeometry(width + 0.24, 0.14, 0.28), frameMat);
    topLintel.position.set(0, height + 0.05, 0);
    root.add(leftPost, rightPost, topLintel);

    // Hinge Pivot at left edge of doorway
    const hingePivot = new THREE.Group();
    hingePivot.position.set(-width / 2, 0, 0);
    root.add(hingePivot);

    // Door Leaf
    const leafMat = new THREE.MeshStandardMaterial({
      color: isReinforced ? 0x334155 : 0x475569,
      roughness: 0.45,
      metalness: isReinforced ? 0.6 : 0.2
    });
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(width, height - 0.04, 0.08), leafMat);
    leaf.position.set(width / 2, height / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    hingePivot.add(leaf);

    // Glass Observation Window on Door Leaf
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.8
    });
    const winMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.55, 0.1), glassMat);
    winMesh.position.set(width * 0.62, height * 0.66, 0);
    hingePivot.add(winMesh);

    // Metallic Lever Handles (both sides)
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.18), handleMat);
    handleBar.position.set(width - 0.18, height * 0.44, 0);
    hingePivot.add(handleBar);

    // Exterior & Interior Room Number Plaque mounted above/beside door frame
    if (label) {
      const plaqueTex = TextureFactory.createPlaqueTexture(
        label,
        subtitle,
        isReinforced ? '#ef4444' : '#38bdf8'
      );
      const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex });
      const plaqueGeo = new THREE.PlaneGeometry(0.95, 0.36);

      const plaqueFront = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaqueFront.position.set(0, height + 0.32, 0.16 * plaqueSide);
      if (plaqueSide < 0) plaqueFront.rotation.y = Math.PI;
      root.add(plaqueFront);

      const plaqueBack = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaqueBack.position.set(0, height + 0.32, -0.16 * plaqueSide);
      if (plaqueSide > 0) plaqueBack.rotation.y = Math.PI;
      root.add(plaqueBack);
    }

    // Optional Retractable Biohazard Containment Shutter (for Patient Rooms 001-006)
    let shutterMesh = null;
    let statusLight = null;
    if (hasShutter) {
      const shutterMat = new THREE.MeshStandardMaterial({
        map: this.shutterTex,
        roughness: 0.4,
        metalness: 0.6
      });
      shutterMesh = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, height, 0.14), shutterMat);
      shutterMesh.position.set(0, height + height / 2, 0); // Retracted at top initially
      shutterMesh.visible = false;
      root.add(shutterMesh);

      const lightMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      statusLight = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), lightMat);
      statusLight.position.set(width / 2 + 0.18, height - 0.25, 0.16 * plaqueSide);
      root.add(statusLight);
    }

    const openAngle = -Math.PI * 0.48;
    hingePivot.rotation.y = isOpen ? openAngle : 0;

    this.scene.add(root);

    const doorObj = {
      id,
      label,
      subtitle,
      x,
      y,
      z,
      axis,
      width,
      height,
      isOpen,
      isLocked,
      lockReason,
      isContained: false,
      isReinforced,
      openAngle,
      currentAngle: isOpen ? openAngle : 0,
      targetAngle: isOpen ? openAngle : 0,
      root,
      hingePivot,
      shutterMesh,
      statusLight,
      shutterProgress: 0 // 0 = retracted, 1 = closed
    };

    this.doors.push(doorObj);
    this.doorMap.set(id, doorObj);
    return doorObj;
  }

  getDoor(id) {
    return this.doorMap.get(id);
  }

  toggleDoor(id, gameState, uiManager) {
    const door = this.doorMap.get(id);
    if (!door) return false;

    if (door.isContained) {
      if (uiManager) {
        uiManager.showToast(`${door.label} IS QUARANTINED — USE DOSSIER 'RELEASE' TO UNLOCK`, 'amber');
      }
      return false;
    }

    if (door.isLocked) {
      if (door.id === 'DOOR_RESTRICTED' && gameState?.hasRestrictedKeycard) {
        door.isLocked = false;
        gameState.restrictedAirlockUnlocked = true;
        if (uiManager) {
          uiManager.showToast('RESTRICTED WING BIOHAZARD AIRLOCK UNLOCKED', 'emerald');
        }
      } else {
        if (uiManager) {
          uiManager.showToast(door.lockReason || `${door.label} IS LOCKED`, 'red');
        }
        return false;
      }
    }

    door.isOpen = !door.isOpen;
    door.targetAngle = door.isOpen ? door.openAngle : 0;
    if (this.soundEngine) {
      this.soundEngine.playDoorSFX(door.isOpen);
    }
    return true;
  }

  setContainmentState(roomId, contained) {
    const door = this.doorMap.get(roomId);
    if (!door) return;
    door.isContained = contained;
    if (contained) {
      door.isOpen = false;
      door.targetAngle = 0;
      if (door.shutterMesh) door.shutterMesh.visible = true;
      if (door.statusLight) door.statusLight.material.color.setHex(0xef4444);
    } else {
      if (door.statusLight) door.statusLight.material.color.setHex(0x10b981);
    }
    if (this.soundEngine) {
      this.soundEngine.playShutterSFX();
    }
  }

  update(dt) {
    for (const door of this.doors) {
      // Smooth hinge rotation
      const diff = door.targetAngle - door.currentAngle;
      if (Math.abs(diff) > 0.005) {
        door.currentAngle += diff * Math.min(1, dt * 8);
        door.hingePivot.rotation.y = door.currentAngle;
      }

      // Smooth containment shutter slide
      if (door.shutterMesh) {
        const targetS = door.isContained ? 1 : 0;
        const sDiff = targetS - door.shutterProgress;
        if (Math.abs(sDiff) > 0.005) {
          door.shutterProgress += sDiff * Math.min(1, dt * 6);
          door.shutterMesh.position.y =
            door.height / 2 + (1 - door.shutterProgress) * door.height;
          door.shutterMesh.visible = door.shutterProgress > 0.02;
        }
      }
    }
  }

  /**
   * Checks if position (px, py, pz) with radius collides with any closed door
   */
  checkDoorCollision(px, py, pz, radius = 0.42) {
    for (const d of this.doors) {
      if (d.isOpen && !d.isContained) continue;
      if (Math.abs(py - d.y) > 2.2) continue;

      const halfW = d.width / 2 + radius;
      const halfThick = 0.25 + radius;

      if (d.axis === 'x') {
        if (Math.abs(px - d.x) < halfW && Math.abs(pz - d.z) < halfThick) {
          return d;
        }
      } else {
        if (Math.abs(pz - d.z) < halfW && Math.abs(px - d.x) < halfThick) {
          return d;
        }
      }
    }
    return null;
  }
}
