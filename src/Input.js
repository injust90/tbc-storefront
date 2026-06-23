export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.jumpQueued = false;
    this.pointer = { down: false, x: 0, y: 0, dx: 0, dy: 0 };
    this.wheelDelta = 0;

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
    });

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

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.wheelDelta += e.deltaY;
      },
      { passive: false }
    );
  }

  getState() {
    const k = this.keys;
    return {
      forward: k.has('forward'),
      backward: k.has('backward'),
      left: k.has('left'),
      right: k.has('right'),
      run: k.has('run'),
    };
  }

  consumeJump() {
    const jump = this.jumpQueued;
    this.jumpQueued = false;
    return jump;
  }

  consumePointerDelta() {
    const delta = { dx: this.pointer.dx, dy: this.pointer.dy };
    this.pointer.dx = 0;
    this.pointer.dy = 0;
    return delta;
  }

  consumeWheel() {
    const delta = this.wheelDelta;
    this.wheelDelta = 0;
    return delta;
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
