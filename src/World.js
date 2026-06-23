import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const TOWER_MODEL_URL = '/models/tower.glb';

const COLORS = {
  ground: 0xd8c7a8,
  sidewalk: 0xc9b89a,
  building: 0xf4efe6,
  trim: 0x6b5344,
  awning: 0xd96b5c,
  door: 0x4a3428,
  window: 0x9ec5e8,
  tree: 0x5f8f5a,
  trunk: 0x6b4a33,
};

const TOWER = {
  url: TOWER_MODEL_URL,
  x: -12,
  y: 0,
  z: -0.5,
  yaw: 0,
  scale: 10,
};

const _box = new THREE.Box3();

export class World {
  constructor(scene) {
    this.colliders = [];
    this.scene = scene;
  }

  static async create(scene) {
    const world = new World(scene);
    world.buildStatic(scene);
    await world.loadTower();
    return world;
  }

  buildStatic(scene) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const sidewalk = createBox(14, 0.08, 4, COLORS.sidewalk);
    sidewalk.position.set(0, 0.04, 2.2);
    sidewalk.receiveShadow = true;
    scene.add(sidewalk);

    this.addBuilding(scene, -6, 0, 8, 5, 4);
    this.addStorefront(scene, 4, 0, 7, 4.5, 4);
    this.addTree(scene, -2.5, 0, 5.5);
    this.addTree(scene, 1.5, 0, 6.2);
    this.addLamp(scene, -4, 0, 4.2);
    this.addLamp(scene, 3, 0, 4.2);
  }

  async loadTower() {
    try {
      await this.addGlbStructure(TOWER);
    } catch (error) {
      console.warn(`Could not load ${TOWER.url}.`, error);
    }
  }

  async addGlbStructure({ url, x, y, z, yaw = 0, scale = 1 }) {
    const gltf = await new GLTFLoader().loadAsync(url);
    const model = gltf.scene;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    if (scale !== 1) {
      model.scale.multiplyScalar(scale);
    }

    model.updateMatrixWorld(true);
    _box.setFromObject(model);
    model.position.y -= _box.min.y;

    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = yaw;
    group.add(model);
    this.scene.add(group);

    group.updateMatrixWorld(true);
    this.colliders.push(new THREE.Box3().setFromObject(group));
  }

  addBuilding(scene, x, y, w, h, d) {
    const group = new THREE.Group();
    group.position.set(x, y, -d / 2 + 1);

    const wall = createBox(w, h, d, COLORS.building);
    wall.position.y = h / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    const trim = createBox(w + 0.1, 0.15, d + 0.1, COLORS.trim);
    trim.position.y = 0.08;
    group.add(trim);

    scene.add(group);
    this.colliders.push(boxFromObject(wall));
  }

  addStorefront(scene, x, y, w, h, d) {
    const group = new THREE.Group();
    group.position.set(x, y, -d / 2 + 1);

    const wall = createBox(w, h, d, COLORS.building);
    wall.position.y = h / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    const awning = createBox(w * 0.75, 0.12, 1.2, COLORS.awning);
    awning.position.set(0, 2.2, d / 2 + 0.35);
    group.add(awning);

    const door = createBox(1.1, 2.1, 0.15, COLORS.door);
    door.position.set(0, 1.05, d / 2 + 0.05);
    group.add(door);

    const windowLeft = createBox(1.4, 1.2, 0.12, COLORS.window);
    windowLeft.position.set(-1.8, 1.8, d / 2 + 0.05);
    group.add(windowLeft);

    const windowRight = createBox(1.4, 1.2, 0.12, COLORS.window);
    windowRight.position.set(1.8, 1.8, d / 2 + 0.05);
    group.add(windowRight);

    const sign = createBox(2.2, 0.35, 0.12, 0xf7e8a3);
    sign.position.set(0, 3.1, d / 2 + 0.05);
    group.add(sign);

    scene.add(group);
    this.colliders.push(boxFromObject(wall));
  }

  addTree(scene, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const trunk = createBox(0.35, 1.2, 0.35, COLORS.trunk);
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    group.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 12, 12),
      new THREE.MeshStandardMaterial({ color: COLORS.tree, roughness: 0.95 })
    );
    foliage.position.y = 1.55;
    foliage.castShadow = true;
    group.add(foliage);

    scene.add(group);
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(x - 0.35, 0, z - 0.35),
        new THREE.Vector3(x + 0.35, 2.5, z + 0.35)
      )
    );
  }

  addLamp(scene, x, y, z) {
    const pole = createBox(0.12, 2.6, 0.12, 0x555555);
    pole.position.set(x, 1.3, z);
    pole.castShadow = true;
    scene.add(pole);

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfff1c1,
        emissive: 0xffd27a,
        emissiveIntensity: 0.8,
      })
    );
    lamp.position.set(x, 2.65, z);
    scene.add(lamp);
  }
}

function createBox(w, h, d, color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95 })
  );
}

function boxFromObject(object) {
  return new THREE.Box3().setFromObject(object);
}
