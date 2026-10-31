// src/core/InputManager.js
// Hybrid FPS PointerLock + Drag-Look, Simultaneous WASD+Shift & Mobile Touch Controls

class InputManager {
  constructor(gameState, callbacks) {
    this.gameState = gameState;
    this.callbacks = callbacks; // { onInteract, onToggleFlashlight, onToggleCCTV, onEscape }

    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      arrowup: false,
      arrowdown: false,
      arrowleft: false,
      arrowright: false,
      shift: false
    };

    this.isDraggingLook = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    // Mobile virtual joystick state
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.joystickVec = { x: 0, y: 0 };

    // Mobile right-side touch look state
    this.lookTouchId = null;
    this.lastTouchLookX = 0;
    this.lastTouchLookY = 0;
    this.mobileSprintToggle = false;

    this.walkSpeed = 4.2;
    this.runSpeed = 7.0;

    this.initListeners();
  }

  initListeners() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => this.clearAllKeys());

    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.addEventListener('mousedown', (e) => {
        if (this.gameState.mode !== 'PLAYING') return;
        this.isDraggingLook = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        if (document.pointerLockElement !== canvasContainer && canvasContainer.requestPointerLock) {
          try {
            const p = canvasContainer.requestPointerLock();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch (_) {}
        }
      });
    }

    window.addEventListener('mouseup', () => {
      this.isDraggingLook = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.gameState.mode !== 'PLAYING') return;
      const sens = (this.gameState.saveSystem?.data?.settings?.mouseSensitivity || 1.0) * 0.0024;
      const canvasEl = document.getElementById('canvas-container');

      if (document.pointerLockElement === canvasEl) {
        this.applyLookDelta(e.movementX * sens, e.movementY * sens);
      } else if (this.isDraggingLook) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.applyLookDelta(dx * sens * 1.35, dy * sens * 1.35);
      }
    });

    this.setupTouchControls();
  }

  setupTouchControls() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');
    const lookZone = document.getElementById('canvas-container');

    if (joystickZone && joystickKnob) {
      joystickZone.addEventListener(
        'touchstart',
        (e) => {
          e.stopPropagation();
          if (this.gameState.mode !== 'PLAYING') return;
          const touch = e.changedTouches[0];
          this.joystickActive = true;
          this.joystickTouchId = touch.identifier;
          this.updateJoystickFromTouch(touch, joystickZone, joystickKnob);
        },
        { passive: false }
      );

      joystickZone.addEventListener(
        'touchmove',
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (!this.joystickActive) return;
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.joystickTouchId) {
              this.updateJoystickFromTouch(e.changedTouches[i], joystickZone, joystickKnob);
              break;
            }
          }
        },
        { passive: false }
      );

      const endJoystick = (e) => {
        e.stopPropagation();
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joystickTouchId) {
            this.joystickActive = false;
            this.joystickTouchId = null;
            this.joystickVec.x = 0;
            this.joystickVec.y = 0;
            joystickKnob.style.transform = 'translate(0px, 0px)';
            break;
          }
        }
      };

      joystickZone.addEventListener('touchend', endJoystick);
      joystickZone.addEventListener('touchcancel', endJoystick);
    }

    if (lookZone) {
      lookZone.addEventListener(
        'touchstart',
        (e) => {
          if (this.gameState.mode !== 'PLAYING') return;
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier !== this.joystickTouchId && this.lookTouchId === null) {
              this.lookTouchId = t.identifier;
              this.lastTouchLookX = t.clientX;
              this.lastTouchLookY = t.clientY;
              break;
            }
          }
        },
        { passive: true }
      );

      lookZone.addEventListener(
        'touchmove',
        (e) => {
          if (this.gameState.mode !== 'PLAYING' || this.lookTouchId === null) return;
          const sens = (this.gameState.saveSystem?.data?.settings?.mouseSensitivity || 1.0) * 0.0045;
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === this.lookTouchId) {
              const dx = t.clientX - this.lastTouchLookX;
              const dy = t.clientY - this.lastTouchLookY;
              this.lastTouchLookX = t.clientX;
              this.lastTouchLookY = t.clientY;
              this.applyLookDelta(dx * sens, dy * sens);
              break;
            }
          }
        },
        { passive: true }
      );

      const endLook = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.lookTouchId) {
            this.lookTouchId = null;
            break;
          }
        }
      };
      lookZone.addEventListener('touchend', endLook, { passive: true });
      lookZone.addEventListener('touchcancel', endLook, { passive: true });
    }
  }

  updateJoystickFromTouch(touch, zone, knob) {
    const rect = zone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = 42;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const dist = Math.min(Math.hypot(dx, dy), maxRadius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * dist;
    const ky = Math.sin(angle) * dist;
    knob.style.transform = `translate(${kx}px, ${ky}px)`;
    this.joystickVec.x = kx / maxRadius;
    this.joystickVec.y = ky / maxRadius;
  }

  applyLookDelta(deltaYaw, deltaPitch) {
    this.gameState.player.yaw -= deltaYaw;
    const maxPitch = (75 * Math.PI) / 180;
    this.gameState.player.pitch = Math.max(
      -maxPitch,
      Math.min(maxPitch, this.gameState.player.pitch - deltaPitch)
    );
  }

  releasePointerLock() {
    this.isDraggingLook = false;
    if (document.pointerLockElement && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
  }

  clearAllKeys() {
    for (const k of Object.keys(this.keys)) {
      this.keys[k] = false;
    }
    this.isDraggingLook = false;
  }

  onKeyDown(e) {
    const key = e.key.toLowerCase();

    if (e.key === 'Escape') {
      e.preventDefault();
      this.releasePointerLock();
      if (this.callbacks.onEscape) this.callbacks.onEscape();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      this.releasePointerLock();
      if (this.gameState.mode === 'PLAYING' || this.gameState.mode === 'CCTV') {
        if (this.callbacks.onToggleCCTV) this.callbacks.onToggleCCTV(true);
      }
      return;
    }

    if (e.key === 'Alt') {
      this.releasePointerLock();
      return;
    }

    if (this.gameState.mode === 'CCTV' && key === 'c') {
      e.preventDefault();
      if (this.callbacks.onToggleCCTV) this.callbacks.onToggleCCTV(true);
      return;
    }

    if (this.gameState.mode !== 'PLAYING') return;

    if (key in this.keys) {
      this.keys[key] = true;
    }
    if (e.shiftKey) {
      this.keys.shift = true;
    }

    if (key === 'e' && !e.repeat) {
      if (this.callbacks.onInteract) this.callbacks.onInteract();
    } else if (key === 'f' && !e.repeat) {
      if (this.callbacks.onToggleFlashlight) this.callbacks.onToggleFlashlight();
    } else if (key === 'c' && !e.repeat) {
      this.releasePointerLock();
      if (this.callbacks.onToggleCCTV) this.callbacks.onToggleCCTV(true);
    }
  }

  onKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key in this.keys) {
      this.keys[key] = false;
    }
    if (!e.shiftKey) {
      this.keys.shift = false;
    }
  }

  getMovementInput() {
    if (this.gameState.mode !== 'PLAYING' || this.gameState.isHidingInLocker) {
      this.gameState.player.isMoving = false;
      this.gameState.player.isRunning = false;
      return { forward: 0, right: 0, speed: 0, isMoving: false, isRunning: false };
    }

    let forward = 0;
    let right = 0;

    if (this.keys.w || this.keys.arrowup) forward += 1;
    if (this.keys.s || this.keys.arrowdown) forward -= 1;
    if (this.keys.d || this.keys.arrowright) right += 1;
    if (this.keys.a || this.keys.arrowleft) right -= 1;

    if (this.joystickActive) {
      right += this.joystickVec.x;
      forward -= this.joystickVec.y;
    }

    const len = Math.hypot(forward, right);
    if (len > 1) {
      forward /= len;
      right /= len;
    }

    const isMoving = len > 0.05;
    const isRunning = isMoving && (this.keys.shift || this.mobileSprintToggle);
    const speed = isRunning ? this.runSpeed : this.walkSpeed;

    this.gameState.player.isMoving = isMoving;
    this.gameState.player.isRunning = isRunning;

    return { forward, right, speed, isMoving, isRunning };
  }
}
