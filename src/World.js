import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const LEVEL_MODEL_URL = '/models/test_level_003.glb';

/** Meshes named like this in Blender are hidden — game ground replaces them. */
const FLOOR_NAME = /^(floor|ground|street|paver)/i;

/** Legacy floor mesh names until renamed in Blender. */
const LEGACY_FLOOR_NAMES = new Set(['Cube.015']);

const GROUND_PADDING = 6;
const GROUND_COLOR = 0x8e9196;

const _box = new THREE.Box3();
const _size = new THREE.Vector3();

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.root = null;
    this.ground = null;
  }

  static async create(scene, url = LEVEL_MODEL_URL) {
    const world = new World(scene);
    await world.load(url);
    return world;
  }

  async load(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    this.root = gltf.scene;

    this.root.traverse((child) => {
      if (!child.isMesh) return;

      if (isImportedFloor(child)) {
        child.visible = false;
        return;
      }

      child.castShadow = true;
      child.receiveShadow = true;
    });

    this.scene.add(this.root);
    this.addGround(this.scene);
    this.buildColliders();
  }

  addGround(scene) {
    _box.setFromObject(this.root);
    _box.getSize(_size);

    const width = Math.max(12, _size.x + GROUND_PADDING);
    const depth = Math.max(12, _size.z + GROUND_PADDING);
    const centerX = (_box.min.x + _box.max.x) * 0.5;
    const centerZ = (_box.min.z + _box.max.z) * 0.5;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshStandardMaterial({ color: GROUND_COLOR, roughness: 0.98 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(centerX, 0, centerZ);
    ground.receiveShadow = true;

    scene.add(ground);
    this.ground = ground;
  }

  buildColliders() {
    this.colliders.length = 0;
    if (!this.root) return;

    this.root.updateMatrixWorld(true);

    this.root.traverse((child) => {
      if (!child.isMesh || isImportedFloor(child)) return;

      _box.setFromObject(child);
      if (_box.isEmpty()) return;

      this.colliders.push(_box.clone());
    });
  }
}

function isImportedFloor(mesh) {
  return FLOOR_NAME.test(mesh.name) || LEGACY_FLOOR_NAMES.has(mesh.name);
}
