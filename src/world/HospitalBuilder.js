// src/world/HospitalBuilder.js
// Builds the 14 interconnected 3D hospital rooms, doors, signage, props, and collision map

class HospitalBuilder {
  constructor(scene, doorSystem, lightingSystem) {
    this.scene = scene;
    this.doorSystem = doorSystem;
    this.lightingSystem = lightingSystem;

    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    this.colliders = []; // { minX, maxX, minZ, maxZ, minY, maxY }
    this.interactables = []; // { id, type, label, pos: THREE.Vector3, mesh, data }
    this.patientBedAnchors = []; // Room bed positions for PatientAI
    this.breakerSwitchMeshes = [];
    this.nursesShutterMesh = null;

    this.tileTex = TextureFactory.createTileTexture();
    this.wallTex = TextureFactory.createWallTexture('#334155', '#1e293b', '#0ea5e9');
    this.wardWallTex = TextureFactory.createWallTexture('#2d3c52', '#172133', '#10b981');
    this.concreteTex = TextureFactory.createConcreteTexture();
    this.monitorTex = TextureFactory.createMonitorTexture();
  }

  build() {
    this.clear();

    this.buildFloorsAndCeilings();
    this.buildMainFloorArchitecture();
    this.buildStairwellAndLowerLevel();
    this.buildPatientWardRooms();
    this.buildRoomPropsAndTerminals();
    this.buildDirectionalSigns();
    this.buildCCTVCameraMounts();
    this.buildLightingFixtures();
  }

  clear() {
    while (this.worldGroup.children.length > 0) {
      this.worldGroup.remove(this.worldGroup.children[0]);
    }
    this.colliders = [];
    this.interactables = [];
    this.patientBedAnchors = [];
    this.breakerSwitchMeshes = [];
    this.doorSystem.clear();
    this.lightingSystem.clearFixtureLights();
  }

  addCollider(minX, maxX, minZ, maxZ, minY = -0.5, maxY = 3.6) {
    this.colliders.push({
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
      minY,
      maxY
    });
  }

  /**
   * Builds a solid wall box between (x1, z1) and (x2, z2) and registers its AABB collider
   */
  addWallSegment(x1, z1, x2, z2, y = 0, height = 3.4, thickness = 0.24, material = null) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    if (length < 0.05) return;

    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const isHorizontal = Math.abs(dx) >= Math.abs(dz);
    const w = isHorizontal ? length : thickness;
    const d = isHorizontal ? thickness : length;

    const mat =
      material ||
      new THREE.MeshStandardMaterial({
        map: y < -1 ? this.concreteTex : this.wallTex,
        roughness: 0.75
      });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mat);
    mesh.position.set(cx, y + height / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.worldGroup.add(mesh);

    this.addCollider(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, y, y + height);
  }

  /**
   * Builds a wall along X or Z with a centered doorway gap of `doorWidth` at `doorPos`
   */
  addWallWithDoorway(x1, z1, x2, z2, doorPos, doorWidth = 1.4, y = 0, height = 3.4, thickness = 0.24, mat = null) {
    const isHorizontal = Math.abs(x2 - x1) >= Math.abs(z2 - z1);
    const halfD = doorWidth / 2;

    if (isHorizontal) {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const z = z1;
      if (doorPos - halfD > minX) {
        this.addWallSegment(minX, z, doorPos - halfD, z, y, height, thickness, mat);
      }
      if (maxX > doorPos + halfD) {
        this.addWallSegment(doorPos + halfD, z, maxX, z, y, height, thickness, mat);
      }
      // Header lintel above doorway (no low collider so player walks under)
      const lintelH = Math.max(0.2, height - 2.5);
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth, lintelH, thickness),
        mat || new THREE.MeshStandardMaterial({ map: y < -1 ? this.concreteTex : this.wallTex, roughness: 0.75 })
      );
      lintel.position.set(doorPos, y + height - lintelH / 2, z);
      this.worldGroup.add(lintel);
    } else {
      const minZ = Math.min(z1, z2);
      const maxZ = Math.max(z1, z2);
      const x = x1;
      if (doorPos - halfD > minZ) {
        this.addWallSegment(x, minZ, x, doorPos - halfD, y, height, thickness, mat);
      }
      if (maxZ > doorPos + halfD) {
        this.addWallSegment(x, doorPos + halfD, x, maxZ, y, height, thickness, mat);
      }
      const lintelH = Math.max(0.2, height - 2.5);
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, lintelH, doorWidth),
        mat || new THREE.MeshStandardMaterial({ map: y < -1 ? this.concreteTex : this.wallTex, roughness: 0.75 })
      );
      lintel.position.set(x, y + height - lintelH / 2, doorPos);
      this.worldGroup.add(lintel);
    }
  }

  buildFloorsAndCeilings() {
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.tileTex,
      roughness: 0.65,
      metalness: 0.1
    });
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9
    });

    // Main Floor Slab (leaves opening at stairwell X: -2.2..2.2, Z: -19..-11)
    // North & Central Main Slab (Z: -11 to 27, X: -30 to 27)
    const mainNorthSlab = new THREE.Mesh(new THREE.PlaneGeometry(58, 38), floorMat);
    mainNorthSlab.rotation.x = -Math.PI / 2;
    mainNorthSlab.position.set(-1.5, 0, 8);
    mainNorthSlab.receiveShadow = true;
    this.worldGroup.add(mainNorthSlab);

    // South West Slab (Staff Room & left walkway X: -15 to -2.2, Z: -19 to -11)
    const swSlab = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 8), floorMat);
    swSlab.rotation.x = -Math.PI / 2;
    swSlab.position.set(-8.6, 0, -15);
    this.worldGroup.add(swSlab);

    // South East Slab (Storage Room & right walkway X: 2.2 to 15, Z: -19 to -11)
    const seSlab = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 8), floorMat);
    seSlab.rotation.x = -Math.PI / 2;
    seSlab.position.set(8.6, 0, -15);
    this.worldGroup.add(seSlab);

    // Main Floor Ceiling (Y = 3.4)
    const mainCeiling = new THREE.Mesh(new THREE.PlaneGeometry(60, 48), ceilMat);
    mainCeiling.rotation.x = Math.PI / 2;
    mainCeiling.position.set(-1.5, 3.4, 4);
    this.worldGroup.add(mainCeiling);

    // Lower Level Floor (Y = -4.0, X: -22 to 10, Z: -30 to -18)
    const lowerFloorMat = new THREE.MeshStandardMaterial({
      map: this.concreteTex,
      roughness: 0.85
    });
    const lowerFloor = new THREE.Mesh(new THREE.PlaneGeometry(32, 13), lowerFloorMat);
    lowerFloor.rotation.x = -Math.PI / 2;
    lowerFloor.position.set(-6, -4.0, -24);
    this.worldGroup.add(lowerFloor);

    // Lower Level Ceiling (Y = -0.6)
    const lowerCeiling = new THREE.Mesh(new THREE.PlaneGeometry(32, 12), ceilMat);
    lowerCeiling.rotation.x = Math.PI / 2;
    lowerCeiling.position.set(-6, -0.6, -24.5);
    this.worldGroup.add(lowerCeiling);
  }

  buildMainFloorArchitecture() {
    // --- 1. RECEPTION (X: -5..8, Z: 16..26) & 2. WAITING ROOM (X: -15..-5, Z: 16..26) ---
    this.addWallSegment(-15, 26, 8, 26); // North outer wall
    this.addWallSegment(-15, 16, -15, 26); // Waiting room west wall
    this.addWallSegment(8, 16, 8, 26); // Reception east wall
    // Divider between Reception and Waiting Room with open doorway at Z = 21
    this.addWallWithDoorway(-5, 16, -5, 26, 21, 1.8);
    // South wall of Waiting Room & Reception with North Hallway opening at X = 0 (-3..3)
    this.addWallSegment(-15, 16, -3, 16);
    this.addWallSegment(3, 16, 8, 16);

    // --- 12a. NORTH HALLWAY (X: -3..3, Z: 8..16) ---
    this.addWallSegment(-3, 8, -3, 16);
    this.addWallSegment(3, 8, 3, 16);

    // --- 7. CENTRAL NURSES' STATION HUB (X: -11..10, Z: 2..10) ---
    // North boundary walls flanking North Hallway
    this.addWallSegment(-11, 8, -3, 8);
    this.addWallSegment(3, 8, 10, 8);
    // South boundary walls flanking South Service Corridor (X: -4..4) and East Connector (X: 8..11)
    this.addWallSegment(-11, 4, -4, 4);
    this.addWallSegment(4, 4, 8, 4);

    // --- 4. EXAMINATION ROOM (X: 10..18, Z: 8..15) & 5. TREATMENT ROOM (X: 18..26, Z: 8..15) ---
    this.addWallSegment(10, 15, 26, 15); // North wall
    this.addWallSegment(10, 8, 10, 15); // West wall
    this.addWallSegment(18, 8, 18, 15); // Divider between Exam & Treatment
    this.addWallSegment(26, 4, 26, 15); // East end wall of East Wing

    // Doorways into Exam Room (X=14, Z=8) and Treatment Room (X=22, Z=8)
    this.addWallWithDoorway(10, 8, 18, 8, 14, 1.4);
    this.addWallWithDoorway(18, 8, 26, 8, 22, 1.4);

    this.doorSystem.createDoor({
      id: 'DOOR_EXAM',
      label: 'EXAM ROOM A',
      subtitle: 'DIAGNOSTICS',
      x: 14,
      z: 8,
      axis: 'x',
      isOpen: true,
      plaqueSide: -1
    });
    this.doorSystem.createDoor({
      id: 'DOOR_TREATMENT',
      label: 'TREATMENT B',
      subtitle: 'PROCEDURES',
      x: 22,
      z: 8,
      axis: 'x',
      isOpen: false,
      plaqueSide: -1
    });

    // --- 6. EMERGENCY ROOM / ER (X: 14..26, Z: -4..4) ---
    this.addWallSegment(14, -4, 26, -4); // South wall
    this.addWallSegment(26, -4, 26, 4); // East wall
    this.addWallSegment(14, -4, 14, 4); // West wall
    this.addWallWithDoorway(14, 4, 26, 4, 20, 1.6); // North wall with ER doorway at X=20, Z=4
    // East Corridor gap between X=11..14 at Z=4
    this.addWallSegment(11, 4, 14, 4);

    this.doorSystem.createDoor({
      id: 'DOOR_ER',
      label: 'EMERGENCY ROOM',
      subtitle: 'TRAUMA BAY',
      x: 20,
      z: 4,
      axis: 'x',
      width: 1.6,
      isOpen: true,
      plaqueSide: 1
    });

    // --- 9. PHARMACY (X: 11..20, Z: -11..-4) & EAST CONNECTOR HALL (X: 8..11, Z: -11..4) ---
    this.addWallSegment(8, -11, 8, 4); // West wall of East Connector
    this.addWallSegment(8, -11, 20, -11); // South wall of Pharmacy & connector
    this.addWallSegment(20, -11, 20, -4); // East wall of Pharmacy
    this.addWallWithDoorway(11, -11, 11, 4, -7.5, 1.4); // Pharmacy entrance at X=11, Z=-7.5

    this.doorSystem.createDoor({
      id: 'DOOR_PHARMACY',
      label: 'PHARMACY',
      subtitle: 'DISPENSARY',
      x: 11,
      z: -7.5,
      axis: 'z',
      isOpen: false,
      plaqueSide: -1
    });

    // --- SOUTH SERVICE WING: 8. CCTV ROOM, 10. STAFF ROOM, 11. STORAGE ROOM ---
    // Corridor walls along X = -4 and X = 4 from Z = 4 down to Z = -19
    // West side: CCTV Room (X: -12..-4, Z: -11..-4) and Staff Room (X: -12..-4, Z: -19..-11)
    this.addWallSegment(-12, -19, -12, -4); // Outer west wall
    this.addWallSegment(-12, -4, -4, -4); // North wall of CCTV
    this.addWallSegment(-12, -11, -4, -11); // Divider between CCTV & Staff Room
    this.addWallSegment(-12, -19, -4, -19); // South wall of Staff Room
    this.addWallWithDoorway(-4, -11, -4, 4, -7.5, 1.4); // CCTV Doorway at X=-4, Z=-7.5
    this.addWallWithDoorway(-4, -19, -4, -11, -15, 1.4); // Staff Room Doorway at X=-4, Z=-15

    this.doorSystem.createDoor({
      id: 'DOOR_CCTV',
      label: 'CCTV SECURITY',
      subtitle: 'SAFE ZONE',
      x: -4,
      z: -7.5,
      axis: 'z',
      isOpen: false,
      isReinforced: true,
      plaqueSide: 1
    });

    this.doorSystem.createDoor({
      id: 'DOOR_STAFF',
      label: 'STAFF ROOM',
      subtitle: 'LOCKERS & BREAK',
      x: -4,
      z: -15,
      axis: 'z',
      isOpen: false,
      plaqueSide: 1
    });

    // East side of South Service Corridor:
    // From Z = -4 to Z = 4, wall between South Corridor (X=4) and East Connector
    this.addWallSegment(4, -11, 4, 4);
    // Storage Room (X: 4..12, Z: -19..-11)
    this.addWallSegment(4, -11, 12, -11); // North wall of Storage
    this.addWallSegment(12, -19, 12, -11); // East wall of Storage
    this.addWallSegment(4, -19, 12, -19); // South wall of Storage
    this.addWallWithDoorway(4, -19, 4, -11, -15, 1.4); // Storage Room Doorway at X=4, Z=-15

    this.doorSystem.createDoor({
      id: 'DOOR_STORAGE',
      label: 'STORAGE ROOM',
      subtitle: 'MEDICAL SUPPLIES',
      x: 4,
      z: -15,
      axis: 'z',
      isOpen: false,
      plaqueSide: -1
    });

    // South end guardrails around Stairwell at Z = -19 (for the main floor side walkways X: -4..-2.2 and 2.2..4)
    this.addWallSegment(-4, -19, -2.2, -19);
    this.addWallSegment(2.2, -19, 4, -19);
    // Stairwell side parapet rails (X = -2.25 and X = 2.25 from Z = -11.5 to -19) so player enters stairs from Z = -11
    this.addWallSegment(-2.25, -19, -2.25, -11.2, 0, 1.2, 0.14);
    this.addWallSegment(2.25, -19, 2.25, -11.2, 0, 1.2, 0.14);
  }

  buildStairwellAndLowerLevel() {
    // Build visual steps from Z = -11 (Y = 0) down to Z = -19 (Y = -4.0)
    const stepCount = 16;
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    for (let i = 0; i < stepCount; i++) {
      const t = (i + 0.5) / stepCount;
      const sz = -11 - t * 8.0;
      const sy = -t * 4.0;
      const step = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.28, 0.55), stepMat);
      step.position.set(0, sy - 0.12, sz);
      this.worldGroup.add(step);
    }

    // Stairwell enclosure walls extending down to Y = -4
    this.addWallSegment(-2.35, -19, -2.35, -11, -4, 4.0, 0.2, null);
    this.addWallSegment(2.35, -19, 2.35, -11, -4, 4.0, 0.2, null);

    // --- 13. BASEMENT & BREAKER ROOM (X: -6..8, Z: -29..-19, Y: -4) ---
    this.addWallSegment(-6, -19, -2.3, -19, -4, 3.6);
    this.addWallSegment(2.3, -19, 8, -19, -4, 3.6);
    this.addWallSegment(8, -29, 8, -19, -4, 3.6);
    this.addWallSegment(-6, -29, 8, -29, -4, 3.6);

    // Wall between Basement (X: -6..8) and 14. Restricted Wing (X: -20..-6) at X = -6 with Biohazard Airlock Doorway at Z = -24
    this.addWallWithDoorway(-6, -29, -6, -19, -24, 1.6, -4, 3.6);

    this.doorSystem.createDoor({
      id: 'DOOR_RESTRICTED',
      label: 'RESTRICTED WING',
      subtitle: 'BIOHAZARD LEVEL 4',
      x: -6,
      y: -4,
      z: -24,
      axis: 'z',
      width: 1.6,
      isOpen: false,
      isLocked: true,
      lockReason: 'LOCKED: REQUIRES RESTRICTED WING KEYCARD FROM NURSES\' STATION',
      isReinforced: true,
      plaqueSide: 1
    });

    // --- 14. RESTRICTED WING & QUARANTINE CORE (X: -20..-6, Z: -29..-19, Y: -4) ---
    this.addWallSegment(-20, -19, -6, -19, -4, 3.6);
    this.addWallSegment(-20, -29, -6, -29, -4, 3.6);
    this.addWallSegment(-20, -29, -20, -19, -4, 3.6);
  }

  buildPatientWardRooms() {
    const wardMat = new THREE.MeshStandardMaterial({
      map: this.wardWallTex,
      roughness: 0.7
    });

    // West Ward Corridor end wall at X = -29 (Z: -3..15)
    this.addWallSegment(-29, -3, -29, 15, 0, 3.4, 0.24, wardMat);
    // Outer North wall of Rooms 001–003 (X: -29..-11, Z: 15)
    this.addWallSegment(-29, 15, -11, 15, 0, 3.4, 0.24, wardMat);
    // Outer South wall of Rooms 004–006 (X: -29..-11, Z: -3)
    this.addWallSegment(-29, -3, -11, -3, 0, 3.4, 0.24, wardMat);

    // Room divider walls for North Rooms (Z: 8..15) and South Rooms (Z: -3..4)
    const dividersX = [-11, -17, -23];
    for (const dx of dividersX) {
      this.addWallSegment(dx, 8, dx, 15, 0, 3.4, 0.22, wardMat);
      this.addWallSegment(dx, -3, dx, 4, 0, 3.4, 0.22, wardMat);
    }

    // Corridor walls with doorways & Hinged Hospital Doors for ROOM 001 - ROOM 006
    for (let i = 0; i < PATIENT_ROOMS.length; i++) {
      const r = PATIENT_ROOMS[i];
      const minX = r.x - 3;
      const maxX = r.x + 3;
      this.addWallWithDoorway(minX, r.doorZ, maxX, r.doorZ, r.doorX, 1.4, 0, 3.4, 0.24, wardMat);

      this.doorSystem.createDoor({
        id: r.id,
        label: r.id,
        subtitle: `PATIENT WARD #${r.number}`,
        x: r.doorX,
        z: r.doorZ,
        axis: 'x',
        width: 1.4,
        isOpen: false,
        hasShutter: true,
        plaqueSide: r.side === 'north' ? -1 : 1
      });

      this.buildSinglePatientRoomInterior(r, i);
    }
  }

  buildSinglePatientRoomInterior(room, index) {
    const dir = room.side === 'north' ? 1 : -1;
    const bedX = room.bedX;
    const bedZ = room.bedZ;

    // Hospital Bed Group
    const bedGroup = new THREE.Group();
    bedGroup.position.set(bedX, 0, bedZ);
    if (room.side === 'south') {
      bedGroup.rotation.y = Math.PI;
    }

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4 });
    const mattressMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.75 });

    // Bed Frame & Headboard
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.42, 2.2), frameMat);
    base.position.y = 0.25;
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.05, 0.12), frameMat);
    headboard.position.set(0, 0.55, 1.05);
    const footboard = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.72, 0.1), frameMat);
    footboard.position.set(0, 0.4, -1.05);

    // Mattress, Pillow, Blanket
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.22, 2.0), mattressMat);
    mattress.position.y = 0.54;
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.42), mattressMat);
    pillow.position.set(0, 0.7, 0.72);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.27, 0.24, 1.25), blanketMat);
    blanket.position.set(0, 0.55, -0.32);

    // Chart clipped to footboard
    const chart = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.42, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xfef08a })
    );
    chart.position.set(0, 0.52, -1.12);

    // Overbed Table
    const overbedTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.04, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.5 })
    );
    overbedTop.position.set(0.35, 0.86, -0.45);

    bedGroup.add(base, headboard, footboard, mattress, pillow, blanket, chart, overbedTop);
    this.worldGroup.add(bedGroup);
    this.addCollider(bedX - 0.7, bedX + 0.7, bedZ - 1.1, bedZ + 1.1, 0, 1.2);

    // IV Stand beside bed
    const ivGroup = new THREE.Group();
    ivGroup.position.set(bedX + 1.1, 0, bedZ + 0.6 * dir);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.85, 8),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8 })
    );
    pole.position.y = 0.925;
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.28, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
    );
    bag.position.set(0.08, 1.65, 0);
    ivGroup.add(pole, bag);
    this.worldGroup.add(ivGroup);

    // Bedside Vital Signs ECG Monitor on Cabinet
    const cabX = bedX - 1.25;
    const cabZ = bedZ + 0.5 * dir;
    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.9, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    cabinet.position.set(cabX, 0.45, cabZ);
    this.worldGroup.add(cabinet);

    const monBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.38, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    monBox.position.set(cabX, 1.1, cabZ);
    this.worldGroup.add(monBox);

    const monScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.3),
      new THREE.MeshBasicMaterial({ map: this.monitorTex })
    );
    monScreen.position.set(cabX, 1.1, cabZ - 0.13 * dir);
    if (dir < 0) monScreen.rotation.y = 0;
    else monScreen.rotation.y = Math.PI;
    this.worldGroup.add(monScreen);

    // Wall Clock inside Patient Room
    const clockMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc })
    );
    clockMesh.rotation.x = Math.PI / 2;
    clockMesh.position.set(bedX + 1.5, 2.55, room.side === 'north' ? 14.84 : -2.84);
    this.worldGroup.add(clockMesh);

    this.patientBedAnchors.push({
      roomIndex: index,
      roomId: room.id,
      bedX,
      bedZ,
      dir,
      facing: room.side === 'north' ? Math.PI : 0
    });
  }

  buildRoomPropsAndTerminals() {
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.2 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3 });

    // --- 7. NURSES' STATION CENTRAL HUB (0, 0, 6) ---
    // Sized with generous North/South/East/West walkways so player at (0, 0, 7.5+) never collides at spawn
    const nsCounter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.08, 1.4), deskMat);
    nsCounter.position.set(0, 0.54, 6);
    this.worldGroup.add(nsCounter);
    this.addCollider(-1.62, 1.62, 5.28, 6.72, 0, 1.5);

    const nsTrim = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 1.5), accentMat);
    nsTrim.position.set(0, 1.1, 6);
    this.worldGroup.add(nsTrim);

    // Master Patient Database Terminal at Nurses' Station (North side of counter)
    const dbTerminal = this.createComputerTerminal(0, 1.12, 6.5, 0, 'MASTER DATABASE', '#38bdf8');
    this.worldGroup.add(dbTerminal);
    this.interactables.push({
      id: 'TERMINAL_DATABASE',
      type: 'TASK_VERIFY_DATABASE',
      label: 'Access Master Patient Database (Nurses\' Station)',
      pos: new THREE.Vector3(0, 1.2, 6.7),
      mesh: dbTerminal
    });

    // Ward Security & Lockdown Panel at Nurses' Station (South side of counter)
    const lockPanel = this.createComputerTerminal(0, 1.12, 5.5, Math.PI, 'WARD LOCKDOWN', '#10b981');
    this.worldGroup.add(lockPanel);
    this.interactables.push({
      id: 'TERMINAL_LOCKDOWN',
      type: 'TASK_SECURE_WARD',
      label: 'Operate Ward Security & Safe Zone Lockdown Panel',
      pos: new THREE.Vector3(0, 1.2, 5.3),
      mesh: lockPanel
    });

    // Keycard & Authorization Rack at Nurses' Station (East side of counter)
    const keycardRack = new THREE.Group();
    keycardRack.position.set(1.55, 1.25, 6.0);
    const rackBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.35, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    const cardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.22, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    cardMesh.position.set(0.08, 0.05, 0);
    keycardRack.add(rackBase, cardMesh);
    this.worldGroup.add(keycardRack);
    this.interactables.push({
      id: 'RACK_KEYCARD',
      type: 'TASK_COLLECT_KEYCARD',
      label: 'Collect Restricted Wing Biohazard Keycard',
      pos: new THREE.Vector3(1.65, 1.2, 6.0),
      mesh: keycardRack
    });

    // Safe Zone Security Shutter Canopy above Nurses' Station
    const shutterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0.8
    });
    this.nursesShutterMesh = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.3, 1.8), shutterMat);
    this.nursesShutterMesh.position.set(0, 2.25, 6);
    this.nursesShutterMesh.visible = false;
    this.worldGroup.add(this.nursesShutterMesh);

    // --- 1. RECEPTION DESK (0, 0, 22), DIRECTORY BOARD, LOCKED ENTRANCE DOORS & MISSING CHART ---
    const recDesk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.05, 1.2), deskMat);
    recDesk.position.set(1.5, 0.525, 22);
    this.worldGroup.add(recDesk);
    this.addCollider(-0.6, 3.6, 21.3, 22.7, 0, 1.3);

    // Dual Reception Monitors & Directory Board
    const recMon1 = this.createComputerTerminal(0.9, 1.06, 22.1, Math.PI, 'ADMISSIONS', '#38bdf8');
    const recMon2 = this.createComputerTerminal(2.3, 1.06, 22.1, Math.PI, 'DIRECTORY', '#10b981');
    this.worldGroup.add(recMon1, recMon2);

    const dirBoardTex = TextureFactory.createPlaqueTexture('ST. JUDE HOSPITAL', 'NIGHT SHIFT LOCKDOWN', '#38bdf8');
    const dirBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.9),
      new THREE.MeshBasicMaterial({ map: dirBoardTex })
    );
    dirBoard.position.set(4.8, 2.1, 25.84);
    dirBoard.rotation.y = Math.PI;
    this.worldGroup.add(dirBoard);

    // Double Glass Entrance Doors at North Wall (locked from outside during night shift)
    const entranceGlass = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 2.5, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28, metalness: 0.8 })
    );
    entranceGlass.position.set(0, 1.25, 25.85);
    this.worldGroup.add(entranceGlass);

    const chartTray = new THREE.Group();
    chartTray.position.set(0.4, 1.12, 21.8);
    const folder = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.08, 0.58),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b })
    );
    chartTray.add(folder);
    this.worldGroup.add(chartTray);
    this.interactables.push({
      id: 'ITEM_MEDICAL_CHART',
      type: 'TASK_PICKUP_CHART',
      label: 'Pick Up Misplaced Patient Medical File (Reception)',
      pos: new THREE.Vector3(0.4, 1.15, 21.6),
      mesh: chartTray
    });

    // --- 2. WAITING ROOM CHAIRS, COFFEE TABLE, TV & WATER DISPENSER (-10, 0, 22) ---
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 });
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.65), chairMat);
        seat.position.set(-12.5 + col * 1.3, 0.25, 19.5 + row * 3.2);
        this.worldGroup.add(seat);
      }
    }
    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.42, 0.75), deskMat);
    coffeeTable.position.set(-10.5, 0.21, 21.1);
    const waterCooler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.24, 1.25, 10),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
    );
    waterCooler.position.set(-14.2, 0.625, 24.8);
    const wallTv = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.9, 0.1),
      new THREE.MeshBasicMaterial({ map: this.monitorTex })
    );
    wallTv.position.set(-10.5, 2.2, 25.82);
    wallTv.rotation.y = Math.PI;
    this.worldGroup.add(coffeeTable, waterCooler, wallTv);

    // --- 4. EXAMINATION ROOM (14, 0, 12) & SUPPLY PREP TABLE ---
    const examTable = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.8, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x0f766e })
    );
    examTable.position.set(15.5, 0.4, 12.5);
    this.worldGroup.add(examTable);
    this.addCollider(14.9, 16.1, 11.4, 13.6, 0, 1.1);

    // Doctor Stool, Sink & Eye Chart in Exam Room
    const docStool = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.52, 10),
      new THREE.MeshStandardMaterial({ color: 0x475569 })
    );
    docStool.position.set(14.1, 0.26, 12.5);
    const eyeChartTex = TextureFactory.createPlaqueTexture('E  F P', 'T O Z  L P E D', '#f8fafc');
    const eyeChart = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.8),
      new THREE.MeshBasicMaterial({ map: eyeChartTex })
    );
    eyeChart.position.set(15.5, 2.0, 14.84);
    eyeChart.rotation.y = Math.PI;
    this.worldGroup.add(docStool, eyeChart);

    const prepTable = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.8), deskMat);
    prepTable.position.set(12.0, 0.45, 13.8);
    this.worldGroup.add(prepTable);
    this.interactables.push({
      id: 'TARGET_EXAM_PREP',
      type: 'TASK_RESTOCK_EXAM',
      label: 'Place Medical Supply Crate on Examination Prep Table',
      pos: new THREE.Vector3(12.0, 1.0, 13.5),
      mesh: prepTable
    });

    // --- 5. TREATMENT ROOM (22, 0, 12) ---
    const surgBed = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.85, 2.1),
      new THREE.MeshStandardMaterial({ color: 0x0369a1 })
    );
    surgBed.position.set(22, 0.42, 12.2);
    this.worldGroup.add(surgBed);
    this.addCollider(21.3, 22.7, 11.1, 13.3, 0, 1.1);

    // Surgical Overhead Lamp, Defibrillator Cart & Biohazard Waste Bin
    const surgLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.35, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0xbae6fd, emissiveIntensity: 0.4 })
    );
    surgLamp.position.set(22, 2.7, 12.2);
    const bioBin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.2, 0.65, 10),
      new THREE.MeshStandardMaterial({ color: 0xdc2626 })
    );
    bioBin.position.set(24.8, 0.325, 14.1);
    this.worldGroup.add(surgLamp, bioBin);

    // --- 6. EMERGENCY ROOM (20, 0, 0) ---
    for (let b = 0; b < 2; b++) {
      const traumaBed = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.75, 2.1),
        new THREE.MeshStandardMaterial({ color: 0x991b1b })
      );
      traumaBed.position.set(17.5 + b * 4.5, 0.38, -1.2);
      this.worldGroup.add(traumaBed);
      this.addCollider(16.8 + b * 4.5, 18.2 + b * 4.5, -2.3, -0.1, 0, 1.1);
    }
    // Privacy Curtain Divider & Crash Cart in ER
    const erCurtain = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 2.1, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.75 })
    );
    erCurtain.position.set(19.75, 1.2, -1.2);
    const crashCart = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.95, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xef4444 })
    );
    crashCart.position.set(15.2, 0.475, -2.8);
    this.worldGroup.add(erCurtain, crashCart);

    // --- 8. CCTV SURVEILLANCE ROOM (-8, 0, -8) ---
    const cctvDesk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.95, 3.4), deskMat);
    cctvDesk.position.set(-10.4, 0.475, -7.5);
    this.worldGroup.add(cctvDesk);
    this.addCollider(-11.2, -9.6, -9.3, -5.7, 0, 1.3);

    // 4 Physical Security Monitor Screens & Server Rack with LEDs
    for (let m = 0; m < 4; m++) {
      const pMon = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.38, 0.56),
        new THREE.MeshBasicMaterial({ map: this.monitorTex })
      );
      pMon.position.set(-10.65, 1.55, -8.7 + m * 0.78);
      this.worldGroup.add(pMon);
    }
    const serverRack = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 2.2, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.7 })
    );
    serverRack.position.set(-10.8, 1.1, -4.8);
    this.worldGroup.add(serverRack);

    const cctvConsole = this.createComputerTerminal(-10.1, 1.0, -7.0, Math.PI / 2, 'CCTV CONSOLE', '#ef4444');
    this.worldGroup.add(cctvConsole);
    this.interactables.push({
      id: 'CONSOLE_CCTV_MAIN',
      type: 'INTERACT_CCTV_CONSOLE',
      label: 'Open Master CCTV Surveillance Console & Evidence Logger',
      pos: new THREE.Vector3(-9.8, 1.2, -7.0),
      mesh: cctvConsole
    });

    const recalBox = this.createComputerTerminal(-10.1, 1.0, -8.5, Math.PI / 2, 'SIGNAL RECALIBRATOR', '#f59e0b');
    this.worldGroup.add(recalBox);
    this.interactables.push({
      id: 'BOX_CCTV_RECALIBRATE',
      type: 'TASK_REPAIR_CCTV',
      label: 'Recalibrate Corrupted CCTV Signal Hardware',
      pos: new THREE.Vector3(-9.8, 1.2, -8.5),
      mesh: recalBox
    });

    // --- 9. PHARMACY (14, 0, -8) ---
    const pharmCounter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.05, 3.6), deskMat);
    pharmCounter.position.set(15.2, 0.525, -7.5);
    this.worldGroup.add(pharmCounter);
    this.addCollider(14.5, 15.9, -9.4, -5.6, 0, 1.3);

    // Medicine Shelves & Cold Storage Fridge in Pharmacy
    const medShelf = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 2.1, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    medShelf.position.set(18.8, 1.05, -7.5);
    this.worldGroup.add(medShelf);

    const medTray = new THREE.Group();
    medTray.position.set(14.7, 1.12, -7.5);
    const bottle1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.28, 10),
      new THREE.MeshStandardMaterial({ color: 0x10b981 })
    );
    const bottle2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.28, 10),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
    );
    bottle2.position.x = 0.22;
    medTray.add(bottle1, bottle2);
    this.worldGroup.add(medTray);
    this.interactables.push({
      id: 'ITEM_PHARMACY_MEDS',
      type: 'TASK_PICKUP_MEDS',
      label: 'Pick Up Prescribed Patient Medication (Pharmacy)',
      pos: new THREE.Vector3(14.5, 1.15, -7.5),
      mesh: medTray
    });

    // --- 10. STAFF ROOM (-8, 0, -15) & COSMETICS LOCKER ---
    const lockerGroup = new THREE.Group();
    lockerGroup.position.set(-10.8, 0, -14.5);
    const lockerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 2.2, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.4, roughness: 0.4 })
    );
    lockerMesh.position.y = 1.1;
    lockerGroup.add(lockerMesh);
    this.worldGroup.add(lockerGroup);
    this.addCollider(-11.3, -10.3, -15.4, -13.6, 0, 2.2);
    this.interactables.push({
      id: 'LOCKER_COSMETICS',
      type: 'INTERACT_COSMETIC_LOCKER',
      label: 'Open Doctor Equipment & Cosmetics Locker',
      pos: new THREE.Vector3(-10.1, 1.2, -14.5),
      mesh: lockerGroup
    });

    // Break Table & Corkboard in Staff Room
    const breakTable = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.78, 1.4), deskMat);
    breakTable.position.set(-7.5, 0.39, -16.8);
    this.worldGroup.add(breakTable);

    // --- 11. STORAGE ROOM (8, 0, -15) — SUPPLY CRATE & HIDING LOCKERS ---
    const crateGroup = new THREE.Group();
    crateGroup.position.set(9.8, 0.35, -13.2);
    const crateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.65, 0.75),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 })
    );
    const crossSticker = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.2, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    crateGroup.add(crateMesh, crossSticker);
    this.worldGroup.add(crateGroup);
    this.interactables.push({
      id: 'ITEM_SUPPLY_CRATE',
      type: 'TASK_PICKUP_SUPPLIES',
      label: 'Pick Up Medical Supply Crate (Storage Room)',
      pos: new THREE.Vector3(9.4, 0.6, -13.2),
      mesh: crateGroup
    });

    // Storage Room Utility Shelving & Two Tall Utility Hiding Lockers (Safe Zone)
    const storageShelf = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.1, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 })
    );
    storageShelf.position.set(7.8, 1.05, -18.2);
    const hideLocker = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 2.25, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.35 })
    );
    hideLocker.position.set(10.5, 1.125, -16.8);
    this.worldGroup.add(storageShelf, hideLocker);
    this.interactables.push({
      id: 'LOCKER_HIDE_SAFE',
      type: 'INTERACT_HIDE_LOCKER',
      label: 'Enter Utility Locker [Safe Zone Hiding]',
      pos: new THREE.Vector3(9.7, 1.2, -16.8),
      mesh: hideLocker
    });

    // --- 13. BASEMENT MAIN ELECTRICAL BREAKER PANEL (3.5, -4, -28.4) & GENERATOR ---
    const backupGen = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.5, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.6, roughness: 0.5 })
    );
    backupGen.position.set(6.2, -3.25, -24.0);
    this.worldGroup.add(backupGen);
    this.addCollider(5.0, 7.4, -24.7, -23.3, -4, -2.2);

    const breakerGroup = new THREE.Group();
    breakerGroup.position.set(3.5, -2.5, -28.6);
    const panelBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 })
    );
    breakerGroup.add(panelBox);

    this.breakerSwitchMeshes = [];
    for (let s = 0; s < 3; s++) {
      const sw = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.36, 0.22),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      );
      sw.position.set(-0.45 + s * 0.45, -0.1, 0.18);
      breakerGroup.add(sw);
      this.breakerSwitchMeshes.push(sw);
    }

    const panelSignTex = TextureFactory.createPlaqueTexture('MAIN BREAKER', 'SWITCHES #1-3', '#eab308');
    const panelSign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.42),
      new THREE.MeshBasicMaterial({ map: panelSignTex })
    );
    panelSign.position.set(0, 0.45, 0.17);
    breakerGroup.add(panelSign);

    this.worldGroup.add(breakerGroup);
    this.interactables.push({
      id: 'PANEL_MAIN_BREAKER',
      type: 'TASK_RESTORE_BREAKER',
      label: 'Flip Main Electrical Breaker Switches (#1, #2, #3)',
      pos: new THREE.Vector3(3.5, -2.5, -28.2),
      mesh: breakerGroup
    });

    // --- 14. RESTRICTED WING CENTRAL CONTAINMENT CORE (-14, -4, -24) & SPECIMEN TANKS ---
    const coreGroup = new THREE.Group();
    coreGroup.position.set(-14, -4, -24);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 1.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 })
    );
    pedestal.position.y = 0.55;
    const glassColumn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 2.3, 16),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.55,
        emissive: 0x0891b2,
        emissiveIntensity: 0.5
      })
    );
    glassColumn.position.y = 2.0;
    coreGroup.add(pedestal, glassColumn);
    this.worldGroup.add(coreGroup);
    this.addCollider(-15.1, -12.9, -25.1, -22.9, -4, -1);

    // Biohazard Specimen Tanks in Restricted Wing
    for (const tz of [-20.5, -27.5]) {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 2.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.45 })
      );
      tank.position.set(-17.5, -2.9, tz);
      this.worldGroup.add(tank);
    }

    this.interactables.push({
      id: 'CORE_RESTRICTED_WING',
      type: 'TASK_ACTIVATE_CORE',
      label: 'Activate Central Biohazard Containment Core',
      pos: new THREE.Vector3(-12.5, -2.8, -24),
      mesh: coreGroup
    });
  }

  createComputerTerminal(x, y, z, rotY, labelText, colorHex) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.45, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    stand.position.y = 0.22;

    const screenTex = TextureFactory.createPlaqueTexture(labelText, 'PRESS [E]', colorHex);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.36),
      new THREE.MeshBasicMaterial({ map: screenTex })
    );
    screen.position.set(0, 0.24, 0.18);

    group.add(stand, screen);
    return group;
  }

  buildDirectionalSigns() {
    const signs = [
      { x: -5.5, y: 2.85, z: 6, rotY: Math.PI / 2, title: '<- PATIENT WARD', sub: 'ROOMS 001 - 006', color: '#10b981' },
      { x: 5.5, y: 2.85, z: 6, rotY: -Math.PI / 2, title: 'CLINICAL & ER ->', sub: 'EXAM / PHARMACY', color: '#38bdf8' },
      { x: 0, y: 2.85, z: 9.8, rotY: Math.PI, title: '^ RECEPTION', sub: 'WAITING ROOM', color: '#38bdf8' },
      { x: 0, y: 2.85, z: 2.2, rotY: 0, title: 'v CCTV & BASEMENT', sub: 'STAFF / STORAGE / STAIRS', color: '#f59e0b' },
      { x: 0, y: -1.1, z: -19.2, rotY: 0, title: 'BASEMENT BREAKER', sub: '<- RESTRICTED WING', color: '#ef4444' }
    ];

    for (const s of signs) {
      const tex = TextureFactory.createPlaqueTexture(s.title, s.sub, s.color);
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.52), mat);
      mesh.position.set(s.x, s.y, s.z);
      mesh.rotation.y = s.rotY;
      this.worldGroup.add(mesh);
    }
  }

  buildCCTVCameraMounts() {
    const camMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7 });
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    for (const cam of CCTV_CAMERAS) {
      const g = new THREE.Group();
      g.position.set(cam.pos.x, cam.pos.y, cam.pos.z);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.36), camMat);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), ledMat);
      led.position.set(0.08, 0.05, 0.19);
      g.add(body, led);
      g.lookAt(cam.lookAt.x, cam.lookAt.y, cam.lookAt.z);
      this.worldGroup.add(g);
    }
  }

  buildLightingFixtures() {
    // Main floor fixtures
    const mainCoords = [
      [0, 3.32, 21, 0xe0f2fe, 0.9], // Reception
      [-10, 3.32, 21, 0xe0f2fe, 0.75], // Waiting Room
      [0, 3.32, 13, 0xe0f2fe, 0.7], // North Hall
      [0, 3.32, 6, 0xbae6fd, 1.05], // Nurses Station
      [-12, 3.32, 6, 0xe0f2fe, 0.85], // Ward Corridor East
      [-20, 3.32, 6, 0xe0f2fe, 0.85], // Ward Corridor Mid
      [-26, 3.32, 6, 0xe0f2fe, 0.8], // Ward Corridor West
      [-14, 3.32, 12, 0xe0f2fe, 0.65], // Room 001
      [-20, 3.32, 12, 0xe0f2fe, 0.65], // Room 002
      [-26, 3.32, 12, 0xe0f2fe, 0.65], // Room 003
      [-14, 3.32, 0, 0xe0f2fe, 0.65], // Room 004
      [-20, 3.32, 0, 0xe0f2fe, 0.65], // Room 005
      [-26, 3.32, 0, 0xe0f2fe, 0.65], // Room 006
      [14, 3.32, 6, 0xe0f2fe, 0.8], // East Corridor
      [14, 3.32, 12, 0xe0f2fe, 0.75], // Exam Room
      [22, 3.32, 12, 0xe0f2fe, 0.75], // Treatment Room
      [20, 3.32, 0, 0xfecaca, 0.8], // ER
      [14, 3.32, -8, 0xd1fae5, 0.75], // Pharmacy
      [0, 3.32, -6, 0xe0f2fe, 0.75], // South Corridor
      [-8, 3.32, -8, 0xfecaca, 0.8], // CCTV Room
      [-8, 3.32, -15, 0xe0f2fe, 0.7], // Staff Room
      [8, 3.32, -15, 0xe0f2fe, 0.7] // Storage Room
    ];

    for (const [x, y, z, col, intensity] of mainCoords) {
      this.lightingSystem.addCeilingFixture(x, y, z, col, intensity, 13, false);
    }

    // Lower Level Fixtures (Basement & Restricted Wing)
    this.lightingSystem.addCeilingFixture(0, -0.7, -23, 0xfde68a, 0.8, 14, true);
    this.lightingSystem.addCeilingFixture(-13, -0.7, -24, 0x67e8f9, 0.85, 14, true);
  }

  updateBreakerVisuals(switches) {
    for (let i = 0; i < this.breakerSwitchMeshes.length; i++) {
      const isOn = switches[i];
      this.breakerSwitchMeshes[i].material.color.setHex(isOn ? 0x10b981 : 0xef4444);
      this.breakerSwitchMeshes[i].position.y = isOn ? 0.05 : -0.15;
    }
  }

  setNursesShutter(closed) {
    if (this.nursesShutterMesh) {
      this.nursesShutterMesh.visible = closed;
    }
  }

  /**
   * Computes ground Y coordinate at (x, z), seamlessly handling the South Stairwell slope
   */
  getGroundHeight(x, z, currentY = 0) {
    // In stairwell channel X: [-2.3, 2.3], Z: [-19.2, -11.0]
    if (x >= -2.3 && x <= 2.3 && z <= -11.0 && z >= -19.2) {
      const t = Math.max(0, Math.min(1, (-11.0 - z) / 8.0));
      return -t * 4.0;
    }
    if (z < -19.0 || currentY < -2.2) {
      if (z <= -18.5) return -4.0;
    }
    return 0.0;
  }

  /**
   * Resolves player or entity collision against walls, furniture, and closed doors with smooth axis sliding
   */
  resolveMovement(oldX, oldY, oldZ, targetX, targetZ, radius = 0.38) {
    let resX = targetX;
    let resZ = targetZ;

    // Try moving along X first
    if (this.isColliding(resX, oldY, oldZ, radius)) {
      resX = oldX;
    }
    // Try moving along Z next
    if (this.isColliding(resX, oldY, resZ, radius)) {
      resZ = oldZ;
    }

    const resY = this.getGroundHeight(resX, resZ, oldY);
    return { x: resX, y: resY, z: resZ };
  }

  isColliding(px, py, pz, radius = 0.38, ignoreDoors = false) {
    // Outer world bounds safety
    if (px < -29.2 || px > 26.2 || pz < -29.2 || pz > 26.2) return true;

    // Check door collisions
    if (!ignoreDoors && this.doorSystem.checkDoorCollision(px, py, pz, radius)) {
      return true;
    }

    // Check static wall and furniture AABBs
    for (const c of this.colliders) {
      if (py + 1.5 < c.minY || py > c.maxY - 0.2) continue;
      if (
        px + radius > c.minX &&
        px - radius < c.maxX &&
        pz + radius > c.minZ &&
        pz - radius < c.maxZ
      ) {
        return true;
      }
    }
    return false;
  }
}
