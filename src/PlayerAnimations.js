import * as THREE from 'three';

export const CLIP_NAMES = {
  idle: 'Idle_3',
  walk: 'Walking',
  run: 'Running',
};

const CROSSFADE = 0.25;
const IDLE_SPEED = 0.2;

export class PlayerAnimations {
  constructor(model, clips) {
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    this.current = null;
    this.currentAction = null;

    for (const [state, clipName] of Object.entries(CLIP_NAMES)) {
      const clip = clips.find((c) => c.name === clipName);
      if (!clip) {
        console.warn(`[PlayerAnimations] Missing clip: ${clipName}`);
        continue;
      }

      const action = this.mixer.clipAction(clip);
      action.loop = THREE.LoopRepeat;
      this.actions[state] = action;
      console.info(`[PlayerAnimations] ${state} → "${clip.name}"`);
    }

    this.fadeTo('idle', 0);
  }

  fadeTo(state, duration = CROSSFADE) {
    const next = this.actions[state];
    if (!next || this.current === state) return;

    if (this.currentAction) {
      this.currentAction.fadeOut(duration);
    }

    next.reset().fadeIn(duration).play();

    this.currentAction = next;
    this.current = state;
  }

  update({ hasInput, running, grounded, speed }, dt) {
    if (!this.mixer) return;

    let state = 'idle';

    if (grounded) {
      if (hasInput && running && this.actions.run) {
        state = 'run';
      } else if (hasInput || speed > IDLE_SPEED) {
        state = this.actions.walk ? 'walk' : 'idle';
      }
    }

    this.fadeTo(state);

    const action = this.actions[state];
    if (action && state !== 'idle') {
      const base = 4.2;
      action.setEffectiveTimeScale(
        THREE.MathUtils.clamp(speed / base, 0.5, 1.5)
      );
    }

    this.mixer.update(dt);
  }
}
