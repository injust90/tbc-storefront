import * as THREE from 'three';

export function dampAngle(current, target, speed, dt) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const t = 1 - Math.exp(-speed * dt);
  return current + delta * t;
}

export function damp(current, target, speed, dt) {
  const t = 1 - Math.exp(-speed * dt);
  return current + (target - current) * t;
}

export function sphericalToOffset(yaw, pitch, distance) {
  const cosPitch = Math.cos(pitch);
  return new THREE.Vector3(
    Math.sin(yaw) * cosPitch * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * cosPitch * distance
  );
}
