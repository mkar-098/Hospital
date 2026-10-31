// src/world/LightingSystem.js
// Manages atmospheric hospital lighting, ceiling fixtures, flickering, emergency blackout beacons, and camera-aligned flashlight

class LightingSystem {
  constructor(scene, gameState, soundEngine) {
    this.scene = scene;
    this.gameState = gameState;
    this.soundEngine = soundEngine;

    this.ambientLight = null;
    this.flashlight = null;
    this.flashlightTarget = null;
    this.ceilingLights = []; // { light, bulbMesh, baseIntensity, baseColor, x, y, z, isEmergency }
    this.reliefMode = false;
    this.flickerTimer = 0;

    this.initCoreLights();
  }

  initCoreLights() {
    this.ambientLight = new THREE.AmbientLight(0x1e293b, 0.55);
    this.scene.add(this.ambientLight);

    // Camera-aligned Flashlight
    this.flashlight = new THREE.SpotLight(0xfffbeb, 2.5, 28, Math.PI / 5.2, 0.45, 1.2);
    this.flashlight.castShadow = false;
    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
  }

  clearFixtureLights() {
    for (const cl of this.ceilingLights) {
      this.scene.remove(cl.group);
    }
    this.ceilingLights = [];
  }

  addCeilingFixture(x, y, z, color = 0xe0f2fe, intensity = 0.85, distance = 13, isEmergency = false) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const housingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const housing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.35), housingMat);
    group.add(housing);

    const bulbMat = new THREE.MeshBasicMaterial({ color });
    const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.26), bulbMat);
    bulb.rotation.x = Math.PI / 2;
    bulb.position.y = -0.045;
    group.add(bulb);

    const light = new THREE.PointLight(color, intensity, distance, 1.5);
    light.position.set(0, -0.25, 0);
    group.add(light);

    this.scene.add(group);
    this.ceilingLights.push({
      group,
      light,
      bulb,
      baseColor: color,
      baseIntensity: intensity,
      x,
      y,
      z,
      isEmergency
    });
  }

  toggleFlashlight() {
    this.gameState.flashlightOn = !this.gameState.flashlightOn;
    this.flashlight.intensity = this.gameState.flashlightOn ? 2.5 : 0;
    if (this.soundEngine) {
      this.soundEngine.playFlashlightClick();
    }
    return this.gameState.flashlightOn;
  }

  setReliefLighting(enabled) {
    this.reliefMode = enabled;
    if (enabled) {
      this.ambientLight.color.setHex(0x334155);
      this.ambientLight.intensity = 0.9;
      for (const cl of this.ceilingLights) {
        cl.light.color.setHex(0xfef3c7);
        cl.light.intensity = cl.baseIntensity * 1.25;
        cl.bulb.material.color.setHex(0xfef3c7);
      }
    } else {
      this.ambientLight.color.setHex(0x1e293b);
      this.ambientLight.intensity = 0.55;
      for (const cl of this.ceilingLights) {
        cl.light.color.setHex(cl.baseColor);
        cl.light.intensity = cl.baseIntensity;
        cl.bulb.material.color.setHex(cl.baseColor);
      }
    }
  }

  update(dt, camera, glitchedPositions = []) {
    // Keep flashlight aligned to camera position and forward vector
    if (camera) {
      this.flashlight.position.copy(camera.position);
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      this.flashlightTarget.position.copy(camera.position).add(forward.multiplyScalar(10));
    }
    this.flashlight.intensity = this.gameState.flashlightOn ? 2.5 : 0;

    if (this.reliefMode) return;

    this.flickerTimer += dt;
    const isBlackout = this.gameState.isBlackout;
    const isChase = this.gameState.chaseActive || this.gameState.chaseWarningActive;
    const dangerLvl = this.gameState.dangerLevel;

    // Ambient adjustment during blackout or chase
    if (isBlackout) {
      this.ambientLight.color.setHex(0x1a0808);
      this.ambientLight.intensity = 0.25;
    } else if (isChase) {
      const pulse = 0.35 + 0.2 * Math.sin(this.flickerTimer * 8);
      this.ambientLight.color.setHex(0x2a0a10);
      this.ambientLight.intensity = pulse;
    } else {
      this.ambientLight.color.setHex(0x1e293b);
      this.ambientLight.intensity = 0.55;
    }

    for (let i = 0; i < this.ceilingLights.length; i++) {
      const cl = this.ceilingLights[i];

      if (isChase) {
        const strobe = Math.sin(this.flickerTimer * 9 + i) > 0 ? 0.9 : 0.15;
        cl.light.color.setHex(0xef4444);
        cl.bulb.material.color.setHex(0xef4444);
        cl.light.intensity = cl.baseIntensity * strobe;
        continue;
      }

      if (isBlackout && !cl.isEmergency) {
        // Emergency red dim glow on every 3rd fixture, rest off
        if (i % 3 === 0) {
          cl.light.color.setHex(0xdc2626);
          cl.bulb.material.color.setHex(0x991b1b);
          cl.light.intensity = 0.35;
        } else {
          cl.light.intensity = 0.0;
          cl.bulb.material.color.setHex(0x0f172a);
        }
        continue;
      }

      // Check proximity to any Glitched Impostor
      let nearGlitch = false;
      for (const gp of glitchedPositions) {
        const dx = cl.x - gp.x;
        const dz = cl.z - gp.z;
        if (dx * dx + dz * dz < 49) {
          nearGlitch = true;
          break;
        }
      }

      cl.light.color.setHex(cl.baseColor);
      if (nearGlitch) {
        const f = Math.sin(this.flickerTimer * 28 + i * 3.1) > -0.2 ? 1.0 : 0.1;
        cl.light.intensity = cl.baseIntensity * f;
        cl.bulb.material.color.setHex(f > 0.5 ? cl.baseColor : 0x1e293b);
      } else if (dangerLvl >= 2 && (i + Math.floor(this.flickerTimer * 2)) % 11 === 0) {
        const f = Math.sin(this.flickerTimer * 19) > 0 ? 0.9 : 0.3;
        cl.light.intensity = cl.baseIntensity * f;
        cl.bulb.material.color.setHex(cl.baseColor);
      } else {
        cl.light.intensity = cl.baseIntensity;
        cl.bulb.material.color.setHex(cl.baseColor);
      }
    }
  }
}
