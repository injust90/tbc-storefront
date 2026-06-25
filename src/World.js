import * as THREE from 'three';

const STREET_WIDTH = 7;
const STREET_LENGTH = 72;

const COLORS = {
  paver: 0x8e9196,
  curb: 0x6a6d72,
  cream: 0xf2ece4,
  white: 0xf7f7f5,
  pink: 0xe8899f,
  purple: 0x9a7ec8,
  blue: 0x6a9fd4,
  dark: 0x2b2d38,
  trim: 0x4a4a52,
  window: 0x8ec8e8,
  door: 0x3d2e28,
  glass: 0xc8dce8,
  neonRed: 0xff3b4f,
  screen: 0x4a8fd4,
  signYellow: 0xf5d76e,
  signWhite: 0xffffff,
  lantern: 0xffe8a8,
};

export class World {
  constructor(scene) {
    this.colliders = [];
    this.scene = scene;
    this.build(scene);
  }

  build(scene) {
    this.addStreet(scene);
    this.buildLeftRow(scene);
    this.buildRightRow(scene);
    this.addBladeClub(scene);
    this.addStreetProps(scene);
  }

  addStreet(scene) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(STREET_WIDTH, STREET_LENGTH),
      new THREE.MeshStandardMaterial({ color: COLORS.paver, roughness: 0.98 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -STREET_LENGTH / 2 + 14);
    ground.receiveShadow = true;
    scene.add(ground);

    for (const x of [-STREET_WIDTH / 2, STREET_WIDTH / 2]) {
      const curb = createBox(0.15, 0.1, STREET_LENGTH, COLORS.curb);
      curb.position.set(x, 0.05, -STREET_LENGTH / 2 + 14);
      curb.receiveShadow = true;
      scene.add(curb);
    }
  }

  buildLeftRow(scene) {
    this.addShop(scene, {
      side: 'left',
      z: 7,
      width: 5,
      depth: 5,
      height: 5.5,
      color: COLORS.pink,
      awning: COLORS.pink,
      sign: COLORS.signWhite,
      signLabel: 'mew mew',
      openFront: true,
    });

    this.addShop(scene, {
      side: 'left',
      z: 0,
      width: 6,
      depth: 5.5,
      height: 6.5,
      color: COLORS.cream,
      awning: 0x7a8a9a,
      sign: COLORS.signYellow,
      signLabel: 'FRNK',
      balcony: true,
    });

    this.addShop(scene, {
      side: 'left',
      z: -9,
      width: 6,
      depth: 5,
      height: 5.5,
      color: COLORS.white,
      awning: COLORS.cream,
      sign: COLORS.signWhite,
      signLabel: 'COYSEIO',
    });

    this.addShop(scene, {
      side: 'left',
      z: -18,
      width: 5,
      depth: 5,
      height: 5,
      color: 0xd8d0c8,
      awning: 0x8a7060,
      sign: COLORS.signYellow,
    });
  }

  buildRightRow(scene) {
    this.addShop(scene, {
      side: 'right',
      z: 7,
      width: 5,
      depth: 5,
      height: 5.5,
      color: COLORS.white,
      awning: COLORS.white,
      sign: COLORS.trim,
      signLabel: 'untwo',
      glassFront: true,
    });

    this.addShop(scene, {
      side: 'right',
      z: -1,
      width: 6,
      depth: 5.5,
      height: 6,
      color: COLORS.purple,
      awning: 0x7a5ea0,
      sign: COLORS.signWhite,
      signLabel: 'YAMEPI',
    });

    this.addShop(scene, {
      side: 'right',
      z: -12,
      width: 6,
      depth: 5.5,
      height: 5.5,
      color: COLORS.cream,
      awning: COLORS.blue,
      sign: COLORS.pink,
      signLabel: 'VANITTY',
      billboard: true,
    });

    this.addShop(scene, {
      side: 'right',
      z: -20,
      width: 5,
      depth: 5,
      height: 5,
      color: COLORS.white,
      awning: COLORS.purple,
      sign: COLORS.blue,
    });
  }

  addBladeClub(scene) {
    const group = new THREE.Group();
    group.position.set(0, 0, -34);

    const main = createBox(18, 10, 7, COLORS.dark);
    main.position.y = 5;
    main.castShadow = true;
    main.receiveShadow = true;
    group.add(main);

    const screen = createEmissiveBox(7, 3.5, 0.2, COLORS.screen, 0.35);
    screen.position.set(0, 5.5, 3.55);
    group.add(screen);

    const sword = createEmissiveBox(0.5, 5, 0.15, COLORS.neonRed, 0.9);
    sword.position.set(-4.5, 6, 3.55);
    group.add(sword);

    const signBand = createBox(10, 1, 0.2, COLORS.trim);
    signBand.position.set(0, 9.2, 3.55);
    group.add(signBand);

    const roofTrim = createBox(18.4, 0.25, 7.4, 0x1a1a22);
    roofTrim.position.y = 10.1;
    group.add(roofTrim);

    scene.add(group);
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(-9, 0, -37.5),
        new THREE.Vector3(9, 10, -30.5)
      )
    );
  }

  addStreetProps(scene) {
    const lanternPositions = [
      [-3.2, 5],
      [3.2, 5],
      [-3.2, -4],
      [3.2, -4],
      [-3.2, -14],
      [3.2, -14],
    ];

    for (const [x, z] of lanternPositions) {
      this.addLantern(scene, x, z);
    }

    const wire = createBox(STREET_WIDTH + 8, 0.04, 0.04, COLORS.trim);
    wire.position.set(0, 4.2, -2);
    scene.add(wire);
  }

  addShop(scene, opts) {
    const {
      side,
      z,
      width,
      depth,
      height,
      color,
      awning,
      sign,
      signLabel,
      openFront = false,
      glassFront = false,
      balcony = false,
      billboard = false,
    } = opts;

    const xDir = side === 'left' ? -1 : 1;
    const xCenter = xDir * (STREET_WIDTH / 2 + depth / 2);
    const facadeZ = side === 'left' ? 1 : -1;

    const group = new THREE.Group();
    group.position.set(xCenter, 0, z);

    const body = createBox(depth, height, width, color);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const floorLine = createBox(depth + 0.05, 0.08, width + 0.05, COLORS.trim);
    floorLine.position.set(0, 2.6, 0);
    group.add(floorLine);

    const awningMesh = createBox(depth * 0.85, 0.1, width * 0.75, awning);
    awningMesh.position.set(0, 2.35, facadeZ * (width / 2 + 0.45));
    group.add(awningMesh);

    if (openFront) {
      const doorGap = createBox(0.12, 2.2, 1.6, COLORS.door);
      doorGap.position.set(0, 1.1, facadeZ * (width / 2 + 0.06));
      group.add(doorGap);
    } else if (glassFront) {
      const glass = createBox(depth * 0.7, 2.2, 0.12, COLORS.glass);
      glass.position.set(0, 1.15, facadeZ * (width / 2 + 0.06));
      group.add(glass);
    } else {
      const door = createBox(0.12, 2.1, 1.1, COLORS.door);
      door.position.set(0, 1.05, facadeZ * (width / 2 + 0.06));
      group.add(door);
    }

    const winY = [1.7, 4.2];
    for (const wy of winY) {
      const win = createBox(0.12, 0.9, 1.2, COLORS.window);
      win.position.set(0, wy, facadeZ * (width / 2 + 0.06));
      group.add(win);
    }

    const signMesh = createBox(depth * 0.55, 0.45, 0.12, sign);
    signMesh.position.set(0, height - 0.5, facadeZ * (width / 2 + 0.2));
    group.add(signMesh);

    if (balcony) {
      const balconySlab = createBox(depth * 0.6, 0.12, 1.6, COLORS.trim);
      balconySlab.position.set(0, 2.85, facadeZ * (width / 2 + 0.85));
      group.add(balconySlab);
    }

    if (billboard) {
      const board = createBox(0.12, 3.2, 2.4, COLORS.pink);
      board.position.set(0, 5.8, facadeZ * (width / 2 + 0.35));
      group.add(board);
    }

    if (signLabel) {
      group.userData.label = signLabel;
    }

    scene.add(group);
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(xCenter - depth / 2, 0, z - width / 2),
        new THREE.Vector3(xCenter + depth / 2, height, z + width / 2)
      )
    );
  }

  addLantern(scene, x, z) {
    const pole = createBox(0.08, 2.8, 0.08, COLORS.trim);
    pole.position.set(x, 1.4, z);
    pole.castShadow = true;
    scene.add(pole);

    const lamp = createEmissiveBox(0.25, 0.35, 0.25, COLORS.lantern, 0.5);
    lamp.position.set(x, 2.9, z);
    scene.add(lamp);
  }
}

function createBox(w, h, d, color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.94 })
  );
}

function createEmissiveBox(w, h, d, color, intensity) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.85,
    })
  );
}
