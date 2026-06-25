import { VirtualJoystick } from './VirtualJoystick.js';

const STICK_DEADZONE = 0.22;
const STICK_RUN_THRESHOLD = 0.82;

export class Input {
  constructor(canvas, { joystickZone, joystickKnob, jumpButton } = {}) {
    this.canvas = canvas;
    this.keys = new Set();
    this.jumpQueued = false;
    this.wheelDelta = 0;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;

    this.pointer = { down: false, x: 0, y: 0, dx: 0, dy: 0 };
    this.cameraTouch = { dx: 0, dy: 0 };
    this.pinchDelta = 0;

    this.joystick =
      joystickZone && joystickKnob
        ? new VirtualJoystick(joystickZone, joystickKnob)
        : null;

    if (jumpButton) {
      jumpButton.addEventListener('pointerdown', (e) => {
        this.jumpQueued = true;
        e.preventDefault();
      });
    }

    window.addEventListener('keydown', (e) => {
      const key = normalizeKey(e.code);
      this.keys.add(key);
      if (key === 'jump') {
        this.jumpQueued = true;
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(normalizeKey(e.code));
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.jumpQueued = false;
      this.pointer.down = false;
      this.joystick?.reset();
    });

    if (this.isTouch) {
      this.bindTouchCamera();
    } else {
      this.bindMouseCamera();
    }

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.wheelDelta += e.deltaY;
      },
      { passive: false }
    );
  }

  bindMouseCamera() {
    const { canvas } = this;

    canvas.addEventListener('pointerdown', (e) => {
      this.pointer.down = true;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.pointer.down) return;
      this.pointer.dx += e.clientX - this.pointer.x;
      this.pointer.dy += e.clientY - this.pointer.y;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
    });

    canvas.addEventListener('pointerup', (e) => {
      this.pointer.down = false;
      canvas.releasePointerCapture(e.pointerId);
    });
  }

  bindTouchCamera() {
    const { canvas } = this;
    const touches = new Map();
    let pinchStartDist = 0;

    const isUiTouch = (x, y) => {
      if (this.joystick?.zone) {
        const r = this.joystick.zone.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          return true;
        }
      }
      const jumpBtn = document.getElementById('jump-btn');
      if (jumpBtn && jumpBtn.style.display !== 'none') {
        const r = jumpBtn.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          return true;
        }
      }
      return false;
    };

    const touchDistance = () => {
      const pts = [...touches.values()];
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };

    canvas.addEventListener(
      'touchstart',
      (e) => {
        for (const t of e.changedTouches) {
          if (isUiTouch(t.clientX, t.clientY)) continue;
          touches.set(t.identifier, { x: t.clientX, y: t.clientY, px: t.clientX, py: t.clientY });
        }
        if (touches.size === 2) {
          pinchStartDist = touchDistance();
        }
        e.preventDefault();
      },
      { passive: false }
    );

    canvas.addEventListener(
      'touchmove',
      (e) => {
        for (const t of e.changedTouches) {
          const entry = touches.get(t.identifier);
          if (!entry) continue;
          entry.px = entry.x;
          entry.py = entry.y;
          entry.x = t.clientX;
          entry.y = t.clientY;
        }

        if (touches.size >= 2) {
          const dist = touchDistance();
          if (pinchStartDist > 0) {
            this.pinchDelta += pinchStartDist - dist;
          }
          pinchStartDist = dist;
        } else if (touches.size === 1) {
          const t = touches.values().next().value;
          this.cameraTouch.dx += t.x - t.px;
          this.cameraTouch.dy += t.y - t.py;
        }

        e.preventDefault();
      },
      { passive: false }
    );

    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        touches.delete(t.identifier);
      }
      if (touches.size < 2) {
        pinchStartDist = 0;
      }
    };

    canvas.addEventListener('touchend', endTouch, { passive: false });
    canvas.addEventListener('touchcancel', endTouch, { passive: false });
  }

  getState() {
    const k = this.keys;
    let forward = k.has('forward');
    let backward = k.has('backward');
    let left = k.has('left');
    let right = k.has('right');
    let run = k.has('run');

    if (this.joystick) {
      const { x, y, magnitude } = this.joystick;
      if (y > STICK_DEADZONE) forward = true;
      if (y < -STICK_DEADZONE) backward = true;
      if (x < -STICK_DEADZONE) left = true;
      if (x > STICK_DEADZONE) right = true;
      if (magnitude > STICK_RUN_THRESHOLD) run = true;
    }

    return { forward, backward, left, right, run };
  }

  consumeJump() {
    const jump = this.jumpQueued;
    this.jumpQueued = false;
    return jump;
  }

  consumePointerDelta() {
    if (this.isTouch) {
      const delta = {
        dx: this.cameraTouch.dx * 1.35,
        dy: this.cameraTouch.dy * 1.35,
      };
      this.cameraTouch.dx = 0;
      this.cameraTouch.dy = 0;
      return delta;
    }

    const delta = { dx: this.pointer.dx, dy: this.pointer.dy };
    this.pointer.dx = 0;
    this.pointer.dy = 0;
    return delta;
  }

  consumeWheel() {
    let delta = this.wheelDelta;
    this.wheelDelta = 0;

    if (this.isTouch && this.pinchDelta !== 0) {
      delta += this.pinchDelta * 2.5;
      this.pinchDelta = 0;
    }

    return delta;
  }

  getHintText() {
    if (this.isTouch) {
      return 'Joystick to move · Pinch to zoom · Drag to look · Tap jump';
    }
    return 'W/S front view · A/D slide camera · Space to jump · Shift to run · Drag to orbit';
  }
}

function normalizeKey(code) {
  switch (code) {
    case 'KeyW':
    case 'ArrowUp':
      return 'forward';
    case 'KeyS':
    case 'ArrowDown':
      return 'backward';
    case 'KeyA':
    case 'ArrowLeft':
      return 'left';
    case 'KeyD':
    case 'ArrowRight':
      return 'right';
    case 'ShiftLeft':
    case 'ShiftRight':
      return 'run';
    case 'Space':
      return 'jump';
    default:
      return code;
  }
}
