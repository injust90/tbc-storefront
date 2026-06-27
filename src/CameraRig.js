import * as THREE from 'three';
import { dampAngle, damp, sphericalToOffset } from './math.js';

const LOOK_HEIGHT = 1.0;
const DEFAULT_PITCH = -0.05;
const DEFAULT_DISTANCE = 6.4;
const MAX_SIDE = 0.48;
const SIDE_RATE = 1.05;
const SIDE_RETURN = 1.35;
const YAW_DAMP = 2.6;
const SLIDE_YAW_DAMP = 5.5;
const PITCH_DAMP = 2.2;
const MANUAL_DAMP = 2.4;
const MIN_PITCH = -0.14;
const MAX_PITCH = 0.38;
const MIN_DISTANCE = 4.2;
const MAX_DISTANCE = 13;
const MIN_PULLIN_DIST = 1.65;
const COLLISION_PADDING = 0.32;
const COLLISION_DAMP = 14;
const DRAG_YAW = 0.0038;
const DRAG_PITCH = 0.0028;
const ZOOM_SPEED = 0.009;

const _target = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _idealOffset = new THREE.Vector3();
const _idealDir = new THREE.Vector3();

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.occluderRoot = null;
    this.orbitYaw = 0;
    this.orbitPitch = DEFAULT_PITCH;
    this.distance = DEFAULT_DISTANCE;
    this.collisionDistance = DEFAULT_DISTANCE;
    this.sideOffset = 0;
    this.manualYaw = 0;
    this.manualPitch = 0;
    this.lockedYaw = 0;
    this.wasSliding = false;
    this.target = new THREE.Vector3(0, LOOK_HEIGHT, 8);
  }

  setOccluders(root) {
    this.occluderRoot = root;
  }

  update(playerPosition, playerFacing, input, pointer, wheelDelta, dt) {
    const resettingView = input.forward || input.backward;
    const sliding = (input.left || input.right) && !resettingView;

    if (resettingView) {
      this.sideOffset = damp(this.sideOffset, 0, SIDE_RETURN, dt);
      this.manualYaw = damp(this.manualYaw, 0, MANUAL_DAMP, dt);
      this.manualPitch = damp(this.manualPitch, 0, MANUAL_DAMP, dt);
      this.wasSliding = false;
    } else if (input.left && !input.right) {
      this.sideOffset = Math.min(this.sideOffset + SIDE_RATE * dt, MAX_SIDE);
    } else if (input.right && !input.left) {
      this.sideOffset = Math.max(this.sideOffset - SIDE_RATE * dt, -MAX_SIDE);
    } else {
      this.sideOffset = damp(this.sideOffset, 0, SIDE_RETURN, dt);
    }

    if (pointer.dx !== 0 || pointer.dy !== 0) {
      if (!resettingView) {
        this.manualYaw -= pointer.dx * DRAG_YAW;
        this.manualPitch -= pointer.dy * DRAG_PITCH;
        this.manualPitch = THREE.MathUtils.clamp(this.manualPitch, -0.35, 0.4);
      }
    }

    // W/S use camera-relative movement — keep orbit fixed while moving so the
    // player can turn 180° without the view spinning with them.
    if (!resettingView) {
      if (sliding) {
        if (!this.wasSliding) {
          this.lockedYaw = this.orbitYaw - this.sideOffset - this.manualYaw;
        }

        const desiredYaw = this.lockedYaw + this.sideOffset + this.manualYaw;
        this.orbitYaw = dampAngle(this.orbitYaw, desiredYaw, SLIDE_YAW_DAMP, dt);
      } else {
        const desiredYaw =
          playerFacing + Math.PI + this.sideOffset + this.manualYaw;
        this.orbitYaw = dampAngle(this.orbitYaw, desiredYaw, YAW_DAMP, dt);
      }

      this.wasSliding = sliding;
    }

    const desiredPitch = THREE.MathUtils.clamp(
      DEFAULT_PITCH + this.manualPitch,
      MIN_PITCH,
      MAX_PITCH
    );
    this.orbitPitch = damp(this.orbitPitch, desiredPitch, PITCH_DAMP, dt);

    if (wheelDelta !== 0) {
      this.distance = THREE.MathUtils.clamp(
        this.distance + wheelDelta * ZOOM_SPEED,
        MIN_DISTANCE,
        MAX_DISTANCE
      );
    }

    _target.set(
      playerPosition.x,
      playerPosition.y + LOOK_HEIGHT,
      playerPosition.z
    );
    this.target.copy(_target);

    _idealOffset.copy(
      sphericalToOffset(this.orbitYaw, this.orbitPitch, this.distance)
    );
    const idealDist = _idealOffset.length();
    _idealDir.copy(_idealOffset).multiplyScalar(1 / idealDist);

    let safeDist = idealDist;

    if (this.occluderRoot && idealDist > MIN_PULLIN_DIST) {
      this.raycaster.set(this.target, _idealDir);
      this.raycaster.far = idealDist;
      this.raycaster.near = 0.05;

      const hits = this.raycaster.intersectObject(this.occluderRoot, true);
      if (hits.length > 0) {
        safeDist = Math.max(
          MIN_PULLIN_DIST,
          hits[0].distance - COLLISION_PADDING
        );
      }
    }

    this.collisionDistance = damp(
      this.collisionDistance,
      safeDist,
      COLLISION_DAMP,
      dt
    );

    this.camera.position
      .copy(this.target)
      .addScaledVector(_idealDir, this.collisionDistance);
    this.camera.lookAt(this.target);
  }

  getMovementBasis() {
    this.camera.getWorldDirection(_forward);
    _forward.y = 0;

    if (_forward.lengthSq() < 0.0001) {
      _forward.set(0, 0, -1);
    } else {
      _forward.normalize();
    }

    _right.crossVectors(_forward, _up).normalize();
    return { forward: _forward.clone(), right: _right.clone() };
  }
}
