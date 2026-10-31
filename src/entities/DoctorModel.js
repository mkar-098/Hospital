// src/entities/DoctorModel.js
// First-Person Viewmodel (Arms, Gloves, Coat Sleeves, Flashlight, Medical Tablet) + Full 3D Articulated Doctor Model

class DoctorModel {
  constructor(scene, camera, gameState) {
    this.scene = scene;
    this.camera = camera;
    this.gameState = gameState;

    // Shared reactive materials for cosmetics
    this.coatMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
    this.trimMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 });
    this.gloveMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 });
    this.flashBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    this.flashRingMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    this.flashLensMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    this.tabletBodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4 });
    this.tabletScreenMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });

    this.fpGroup = new THREE.Group();
    this.fullRig = new THREE.Group();

    this.walkPhase = 0;
    this.reachTimer = 0;
    this.tabletRaise = 0;

    this.buildFirstPersonViewmodel();
    this.buildFull3DDoctorRig();
    this.applyCosmetics();
  }

  buildFirstPersonViewmodel() {
    // Attach fpGroup to main camera
    this.camera.add(this.fpGroup);

    // --- RIGHT ARM & HAND HOLDING FLASHLIGHT ---
    this.fpRightArm = new THREE.Group();
    this.fpRightArm.position.set(0.32, -0.28, -0.48);

    const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.38), this.coatMat);
    rSleeve.position.set(0.04, -0.04, 0.16);
    rSleeve.rotation.x = 0.15;
    rSleeve.rotation.y = -0.15;

    const rCuff = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.115, 0.04), this.trimMat);
    rCuff.position.set(0.01, -0.01, -0.02);

    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), this.gloveMat);
    rHand.position.set(0, 0, -0.06);

    // Flashlight Mesh
    const torchGroup = new THREE.Group();
    torchGroup.position.set(-0.01, 0.02, -0.14);
    torchGroup.rotation.x = Math.PI / 2;

    const torchBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.24, 14), this.flashBodyMat);
    const torchHead = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.034, 0.06, 14), this.flashRingMat);
    torchHead.position.y = -0.12;
    const torchLens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 14), this.flashLensMat);
    torchLens.rotation.x = Math.PI / 2;
    torchLens.position.y = -0.151;

    torchGroup.add(torchBarrel, torchHead, torchLens);
    this.fpRightArm.add(rSleeve, rCuff, rHand, torchGroup);
    this.fpGroup.add(this.fpRightArm);

    // --- LEFT ARM & HAND HOLDING MEDICAL TABLET / CARRIED ITEM ---
    this.fpLeftArm = new THREE.Group();
    this.fpLeftArm.position.set(-0.34, -0.32, -0.46);

    const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.36), this.coatMat);
    lSleeve.position.set(-0.04, -0.04, 0.16);
    lSleeve.rotation.x = 0.15;
    lSleeve.rotation.y = 0.18;

    const lCuff = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.115, 0.04), this.trimMat);
    lCuff.position.set(-0.01, -0.01, -0.01);

    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 12), this.gloveMat);
    lHand.position.set(0, 0, -0.05);

    // Medical Tablet / Clipboard in left hand
    this.fpTablet = new THREE.Group();
    this.fpTablet.position.set(0.06, 0.04, -0.1);
    this.fpTablet.rotation.set(-0.45, 0.35, -0.1);

    const tabFrame = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.25, 0.018), this.tabletBodyMat);
    const tabScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.21), this.tabletScreenMat);
    tabScreen.position.z = 0.011;
    this.fpTablet.add(tabFrame, tabScreen);

    // Carried Task Item Indicator Mesh (shown when carrying chart, crate, meds, keycard)
    this.fpCarriedMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b })
    );
    this.fpCarriedMesh.position.set(0.08, 0.1, -0.12);
    this.fpCarriedMesh.visible = false;

    this.fpLeftArm.add(lSleeve, lCuff, lHand, this.fpTablet, this.fpCarriedMesh);
    this.fpGroup.add(this.fpLeftArm);
  }

  buildFull3DDoctorRig() {
    // Hierarchical articulated 3D Doctor Model visible on CCTV feeds and in 3D Cutscenes
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });

    // Torso (Medical Coat + Collar + ID Badge + Stethoscope)
    this.torso = new THREE.Group();
    this.torso.position.y = 1.05;
    const coatTorso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, 0.28), this.coatMat);
    const coatTrim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.69, 0.29), this.trimMat);
    const idBadge = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.12, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    idBadge.position.set(-0.14, 0.16, 0.15);
    this.torso.add(coatTorso, coatTrim, idBadge);
    this.fullRig.add(this.torso);

    // Head (with Surgical Mask, Eyes, Hair)
    this.head = new THREE.Group();
    this.head.position.set(0, 0.5, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), skinMat);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.198, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.position.y = 0.02;
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.16), this.trimMat);
    mask.position.set(0, -0.05, 0.11);
    this.head.add(skull, hair, mask);
    this.torso.add(this.head);

    // Articulated Arms
    this.rightArmRig = new THREE.Group();
    this.rightArmRig.position.set(-0.31, 0.26, 0);
    const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.54, 0.13), this.coatMat);
    rArmMesh.position.y = -0.22;
    const rGloveMesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), this.gloveMat);
    rGloveMesh.position.y = -0.5;
    const rTorchMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 10), this.flashBodyMat);
    rTorchMesh.rotation.x = Math.PI / 2;
    rTorchMesh.position.set(0, -0.5, 0.1);
    this.rightArmRig.add(rArmMesh, rGloveMesh, rTorchMesh);
    this.torso.add(this.rightArmRig);

    this.leftArmRig = new THREE.Group();
    this.leftArmRig.position.set(0.31, 0.26, 0);
    const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.54, 0.13), this.coatMat);
    lArmMesh.position.y = -0.22;
    const lGloveMesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), this.gloveMat);
    lGloveMesh.position.y = -0.5;
    const lClipboard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.02), this.tabletBodyMat);
    lClipboard.position.set(0, -0.48, 0.08);
    this.leftArmRig.add(lArmMesh, lGloveMesh, lClipboard);
    this.torso.add(this.leftArmRig);

    // Articulated Legs
    this.rightLegRig = new THREE.Group();
    this.rightLegRig.position.set(-0.13, 0.72, 0);
    const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), pantsMat);
    rLegMesh.position.y = -0.35;
    this.rightLegRig.add(rLegMesh);
    this.fullRig.add(this.rightLegRig);

    this.leftLegRig = new THREE.Group();
    this.leftLegRig.position.set(0.13, 0.72, 0);
    const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), pantsMat);
    lLegMesh.position.y = -0.35;
    this.leftLegRig.add(lLegMesh);
    this.fullRig.add(this.leftLegRig);

    this.fullRig.visible = false; // Hidden during main FPS pass; shown in CCTV & Cutscenes
    this.scene.add(this.fullRig);
  }

  applyCosmetics() {
    const eq = this.gameState.saveSystem?.data?.equippedCosmetics || {};

    const uniform =
      COSMETICS_CATALOG.uniform.find((u) => u.id === eq.uniform) || COSMETICS_CATALOG.uniform[0];
    const gloves =
      COSMETICS_CATALOG.gloves.find((g) => g.id === eq.gloves) || COSMETICS_CATALOG.gloves[0];
    const flashlight =
      COSMETICS_CATALOG.flashlight.find((f) => f.id === eq.flashlight) || COSMETICS_CATALOG.flashlight[0];
    const tablet =
      COSMETICS_CATALOG.tablet.find((t) => t.id === eq.tablet) || COSMETICS_CATALOG.tablet[0];

    this.coatMat.color.setHex(uniform.sleeveColor);
    this.trimMat.color.setHex(uniform.trimColor);
    this.gloveMat.color.setHex(gloves.color);
    this.flashBodyMat.color.setHex(flashlight.bodyColor);
    this.flashRingMat.color.setHex(flashlight.ringColor);
    this.tabletBodyMat.color.setHex(tablet.bodyColor);
    this.tabletScreenMat.color.setHex(tablet.screenTint);
  }

  triggerInteractReach() {
    this.reachTimer = 0.35;
  }

  setRenderContext(mode) {
    // mode: 'FPS' | 'CCTV' | 'CUTSCENE'
    if (mode === 'FPS') {
      this.fpGroup.visible = !this.gameState.isHidingInLocker;
      this.fullRig.visible = false;
    } else if (mode === 'CCTV') {
      this.fpGroup.visible = false;
      this.fullRig.visible = !this.gameState.isHidingInLocker;
    } else if (mode === 'CUTSCENE') {
      this.fpGroup.visible = false;
      this.fullRig.visible = true;
    }
  }

  update(dt) {
    const p = this.gameState.player;
    const freq = p.isRunning ? 11.5 : p.isMoving ? 7.2 : 1.6;
    const amp = p.isRunning ? 0.032 : p.isMoving ? 0.016 : 0.004;
    this.walkPhase += dt * freq;

    const bobX = Math.cos(this.walkPhase * 0.5) * amp;
    const bobY = Math.sin(this.walkPhase) * amp;

    if (this.reachTimer > 0) {
      this.reachTimer = Math.max(0, this.reachTimer - dt);
    }
    const reachOffset = Math.sin((this.reachTimer / 0.35) * Math.PI) * 0.14;

    // Update First-Person Viewmodel
    this.fpRightArm.position.set(0.32 + bobX, -0.28 + bobY, -0.48 - reachOffset);
    this.fpLeftArm.position.set(-0.34 - bobX, -0.32 + bobY * 0.8, -0.46 - reachOffset * 0.5);

    this.flashLensMat.color.setHex(this.gameState.flashlightOn ? 0xfffbeb : 0x1e293b);

    // Update carried item indicator in left hand
    if (this.gameState.carriedItem) {
      this.fpCarriedMesh.visible = true;
      this.fpCarriedMesh.material.color.setHex(this.gameState.carriedItem.color || 0xf59e0b);
    } else {
      this.fpCarriedMesh.visible = false;
    }

    // Update Full 3D Articulated Doctor Rig for CCTV & Cutscenes
    if (this.gameState.mode !== 'CUTSCENE') {
      this.fullRig.position.set(p.x, p.y, p.z);
      this.fullRig.rotation.y = p.yaw + Math.PI;
    }

    const limbSwing = p.isMoving ? Math.sin(this.walkPhase) * (p.isRunning ? 0.55 : 0.35) : 0;
    this.rightLegRig.rotation.x = limbSwing;
    this.leftLegRig.rotation.x = -limbSwing;
    this.rightArmRig.rotation.x = -0.35 + limbSwing * 0.3;
    this.leftArmRig.rotation.x = -0.25 - limbSwing * 0.3;
  }
}
