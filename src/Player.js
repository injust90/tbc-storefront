import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { dampAngle, damp } from './math.js';

export const PLAYER_MODEL_URL = '/models/player.glb';

const MOVE_SPEED = 4.2;
const RUN_MULTIPLIER = 1.55;
const TURN_SPEED = 7;
const ACCEL = 10;
const DECEL = 14;
const JUMP_VELOCITY = 6.2;
const GRAVITY = 20;
const PLAYER_RADIUS = 0.35;
const TARGET_HEIGHT = 1.6;
const MODEL_YAW = 0;

const _moveDir = new THREE.Vector3();
const _targetVelocity = new THREE.Vector3();
const _horizontalVelocity = new THREE.Vector3();
const _box = new THREE.Box3();
const _size = new THREE.Vector3();

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.velocity = new THREE.Vector3();
    this.verticalVelocity = 0;
    this.grounded = true;
    this.facing = Math.PI;
    this.moving = false;
    this.model = null;
    this.mixer = null;
    this.walkAction = null;
    this.animWeight = 0;

    scene.add(this.group);
  }

  static async create(scene, url = PLAYER_MODEL_URL) {
    const player = new Player(scene);
    player.group.rotation.y = player.facing;

    try {
      await player.loadModel(url);
    } catch (error) {
      console.warn(`Could not load ${url}, using placeholder mesh.`, error);
      player.addPlaceholder();
    }

    return player;
  }

  async loadModel(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    const model = gltf.scene;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.group.add(model);
    this.fitAndGround(model);
    model.rotation.y = MODEL_YAW;

    this.model = model;
    this.setupAnimations(gltf);
  }

  fitAndGround(model) {
    _box.setFromObject(model);
    _box.getSize(_size);
    const scale = TARGET_HEIGHT / _size.y;
    model.scale.setScalar(scale);

    model.updateMatrixWorld(true);
    _box.setFromObject(model);
    model.position.y -= _box.min.y;
  }

  setupAnimations(gltf) {
    if (!gltf.animations.length) return;

    this.mixer = new THREE.AnimationMixer(this.model);
    const clip =
      gltf.animations.find((a) => /walk|run|move/i.test(a.name)) ??
      gltf.animations[0];

    this.walkAction = this.mixer.clipAction(clip);
    this.walkAction.play();
    this.walkAction.setEffectiveWeight(0);
  }

  addPlaceholder() {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.85, 4, 12),
      new THREE.MeshStandardMaterial({ color: 0xf2c9a0, roughness: 0.85 })
    );
    body.position.y = 0.95;
    body.castShadow = true;

    const jacket = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.55, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x4a6fa5, roughness: 0.9 })
    );
    jacket.position.set(0, 1.05, 0);
    jacket.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf2c9a0, roughness: 0.85 })
    );
    head.position.y = 1.55;
    head.castShadow = true;

    this.group.add(body, jacket, head);
  }

  get position() {
    return this.group.position;
  }

  update(input, forward, right, jump, dt, colliders) {
    _moveDir.set(0, 0, 0);
    if (input.forward) _moveDir.add(forward);
    if (input.backward) _moveDir.sub(forward);
    if (input.right) _moveDir.add(right);
    if (input.left) _moveDir.sub(right);

    const hasInput = _moveDir.lengthSq() > 0;
    this.moving = hasInput;

    if (hasInput) {
      _moveDir.normalize();
      const speed = MOVE_SPEED * (input.run ? RUN_MULTIPLIER : 1);
      _targetVelocity.copy(_moveDir).multiplyScalar(speed);

      const walkingStraight =
        (input.forward || input.backward) && !input.left && !input.right;
      const targetFacing = walkingStraight
        ? Math.atan2(forward.x, forward.z)
        : Math.atan2(_moveDir.x, _moveDir.z);
      this.facing = dampAngle(this.facing, targetFacing, TURN_SPEED, dt);
    } else {
      _targetVelocity.set(0, 0, 0);
    }

    const blend = 1 - Math.exp(-(hasInput ? ACCEL : DECEL) * dt);
    _horizontalVelocity.set(this.velocity.x, 0, this.velocity.z);
    _horizontalVelocity.lerp(_targetVelocity, blend);
    this.velocity.set(_horizontalVelocity.x, 0, _horizontalVelocity.z);
    this.group.rotation.y = this.facing;

    if (jump && this.grounded) {
      this.verticalVelocity = JUMP_VELOCITY;
      this.grounded = false;
    }

    this.verticalVelocity -= GRAVITY * dt;

    const next = this.position.clone().addScaledVector(this.velocity, dt);
    next.y += this.verticalVelocity * dt;

    if (next.y <= 0) {
      next.y = 0;
      this.verticalVelocity = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    for (const box of colliders) {
      resolveCircleBox(next, PLAYER_RADIUS, box);
    }

    this.position.copy(next);
    this.updateAnimations(dt);
  }

  updateAnimations(dt) {
    if (!this.mixer || !this.walkAction) return;

    const targetWeight = this.moving && this.grounded ? 1 : 0;
    this.animWeight = damp(this.animWeight, targetWeight, 8, dt);
    this.walkAction.setEffectiveWeight(this.animWeight);
    this.mixer.update(dt);
  }
}

function resolveCircleBox(center, radius, box) {
  const closest = new THREE.Vector3(
    THREE.MathUtils.clamp(center.x, box.min.x, box.max.x),
    0,
    THREE.MathUtils.clamp(center.z, box.min.z, box.max.z)
  );

  const offset = center.clone().sub(closest);
  const distSq = offset.lengthSq();
  if (distSq === 0 || distSq >= radius * radius) return;

  const dist = Math.sqrt(distSq);
  offset.normalize().multiplyScalar(radius - dist);
  center.add(offset);
}
