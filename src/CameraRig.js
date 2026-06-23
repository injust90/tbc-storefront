import * as THREE from 'three';
import { dampAngle, damp, sphericalToOffset } from './math.js';

const LOOK_HEIGHT = 1.15;
const DEFAULT_PITCH = 0.42;
const DEFAULT_DISTANCE = 5.8;
const SIDE_ANGLE = 0.62;
const YAW_DAMP = 2.6;
const PITCH_DAMP = 2.2;
const SIDE_DAMP = 2.0;
const MANUAL_DAMP = 2.4;
const MIN_PITCH = 0.22;
const MAX_PITCH = 0.72;
const MIN_DISTANCE = 3.8;
const MAX_DISTANCE = 13;
const DRAG_YAW = 0.0038;
const DRAG_PITCH = 0.0028;
const ZOOM_SPEED = 0.009;

const _target = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _offset = new THREE.Vector3();

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.orbitYaw = 0;
    this.orbitPitch = DEFAULT_PITCH;
    this.distance = DEFAULT_DISTANCE;
    this.sideOffset = 0;
    this.manualYaw = 0;
    this.manualPitch = 0;
    this.target = new THREE.Vector3(0, LOOK_HEIGHT, 8);
  }

  update(playerPosition, playerFacing, input, pointer, wheelDelta, dt) {
    let desiredSide = this.sideOffset;

    const resettingView = input.forward || input.backward;

    if (resettingView) {
      desiredSide = 0;
      this.manualYaw = damp(this.manualYaw, 0, MANUAL_DAMP, dt);
      this.manualPitch = damp(this.manualPitch, 0, MANUAL_DAMP, dt);
    } else if (input.left && !input.right) {
      desiredSide = SIDE_ANGLE;
    } else if (input.right && !input.left) {
      desiredSide = -SIDE_ANGLE;
    } else {
      desiredSide = damp(this.sideOffset, 0, SIDE_DAMP * 0.65, dt);
    }

    this.sideOffset = damp(this.sideOffset, desiredSide, SIDE_DAMP, dt);

    if (pointer.dx !== 0 || pointer.dy !== 0) {
      if (!resettingView) {
        this.manualYaw -= pointer.dx * DRAG_YAW;
        this.manualPitch -= pointer.dy * DRAG_PITCH;
        this.manualPitch = THREE.MathUtils.clamp(this.manualPitch, -0.35, 0.4);
      }
    }

    const desiredYaw =
      playerFacing + Math.PI + this.sideOffset + this.manualYaw;
    this.orbitYaw = dampAngle(this.orbitYaw, desiredYaw, YAW_DAMP, dt);

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

    _offset.copy(
      sphericalToOffset(this.orbitYaw, this.orbitPitch, this.distance)
    );
    this.camera.position.copy(this.target).add(_offset);
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
