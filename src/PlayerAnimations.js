import * as THREE from 'three';

export const CLIP_NAMES = {
  idle: 'Idle_3',
  walk: 'Walking',
  walkBack: 'Walk_Backward',
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
      const raw = clips.find((c) => c.name === clipName);
      if (!raw) {
        console.warn(`[PlayerAnimations] Missing clip: ${clipName}`);
        continue;
      }

      const clip = state === 'walkBack' ? fixWalkBackRootMotion(raw) : raw;
      const action = this.mixer.clipAction(clip);
      action.loop = THREE.LoopRepeat;
      this.actions[state] = action;
      console.info(`[PlayerAnimations] ${state} → "${raw.name}"`);
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

  update({ hasInput, movingBack, running, grounded, speed }, dt) {
    if (!this.mixer) return;

    let state = 'idle';

    if (grounded) {
      if (hasInput && movingBack && this.actions.walkBack) {
        state = 'walkBack';
      } else if (hasInput && running && this.actions.run) {
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

/**
 * Walk_Backward bakes ~124 units of Hips Z root motion into the clip.
 * On loop that snaps back to frame 0 — strip horizontal drift, keep Y bob.
 */
function fixWalkBackRootMotion(clip) {
  const tracks = clip.tracks.map((track) => {
    if (track.name !== 'Hips.position') {
      return track;
    }

    const values = track.values.slice();
    const baseX = values[0];
    const baseZ = values[2];

    for (let i = 0; i < values.length; i += 3) {
      values[i] = baseX;
      values[i + 2] = baseZ;
    }

    return new THREE.VectorKeyframeTrack(
      track.name,
      track.times.slice(),
      values
    );
  });

  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}
