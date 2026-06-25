export class VirtualJoystick {
  constructor(zoneEl, knobEl) {
    this.zone = zoneEl;
    this.knob = knobEl;
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.pointerId = null;
    this.maxRadius = 52;

    this.zone.addEventListener('pointerdown', (e) => this.onDown(e));
    this.zone.addEventListener('pointermove', (e) => this.onMove(e));
    this.zone.addEventListener('pointerup', (e) => this.onUp(e));
    this.zone.addEventListener('pointercancel', (e) => this.onUp(e));
  }

  onDown(e) {
    if (this.active) return;
    this.active = true;
    this.pointerId = e.pointerId;
    this.zone.setPointerCapture(e.pointerId);
    this.updateKnob(e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation();
  }

  onMove(e) {
    if (!this.active || e.pointerId !== this.pointerId) return;
    this.updateKnob(e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation();
  }

  onUp(e) {
    if (e.pointerId !== this.pointerId) return;
    this.reset();
    e.preventDefault();
    e.stopPropagation();
  }

  updateKnob(clientX, clientY) {
    const rect = this.zone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist > this.maxRadius) {
      dx = (dx / dist) * this.maxRadius;
      dy = (dy / dist) * this.maxRadius;
    }

    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.x = dx / this.maxRadius;
    this.y = -dy / this.maxRadius;
  }

  reset() {
    this.active = false;
    this.pointerId = null;
    this.x = 0;
    this.y = 0;
    this.knob.style.transform = 'translate(-50%, -50%)';
  }

  get magnitude() {
    return Math.min(1, Math.hypot(this.x, this.y));
  }
}
