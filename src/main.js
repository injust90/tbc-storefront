import * as THREE from 'three';
import { Player } from './Player.js';
import { Input } from './Input.js';
import { CameraRig } from './CameraRig.js';
import { World } from './World.js';

const canvas = document.getElementById('canvas');
const hint = document.querySelector('.hint');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8c4d4);
scene.fog = new THREE.Fog(0xb8c4d4, 28, 95);

const camera = new THREE.PerspectiveCamera(
  48,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const hemi = new THREE.HemisphereLight(0xfff3dd, 0x8ea6b8, 1.1);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0d0, 1.35);
sun.position.set(6, 12, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -22;
sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22;
sun.shadow.camera.bottom = -50;
scene.add(sun);

const input = new Input(canvas, {
  joystickZone: document.getElementById('joystick-zone'),
  joystickKnob: document.getElementById('joystick-knob'),
  jumpButton: document.getElementById('jump-btn'),
});
const cameraRig = new CameraRig(camera);

const clock = new THREE.Clock();

async function main() {
  hint.textContent = 'Loading…';

  const [player, world] = await Promise.all([
    Player.create(scene),
    World.create(scene),
  ]);
  player.position.set(0, 0, 4);
  cameraRig.setOccluders(world.root);

  hint.textContent = input.getHintText();

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const keyState = input.getState();
    const pointer = input.consumePointerDelta();
    const wheel = input.consumeWheel();

    const { forward, right } = cameraRig.getMovementBasis();
    player.update(keyState, forward, right, input.consumeJump(), dt, world.colliders);

    cameraRig.update(
      player.position,
      player.facing,
      keyState,
      pointer,
      wheel,
      dt
    );

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

main();
