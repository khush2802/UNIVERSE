'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * An asteroid belt.
 *
 * The reference shows debris fields tracing the orbital paths, and they do
 * a lot of work: they give the empty space between planets something to
 * read, and they make the orbits feel like paths rather than drawn lines.
 *
 * Built as a single `InstancedMesh` — one geometry, one material, one draw
 * call for hundreds of rocks. §13 asks for instancing specifically, and
 * this is the case that needs it: the same field as individual meshes
 * would be several hundred draw calls for objects a few pixels across.
 */
export function AsteroidBelt({
  radius,
  width,
  count,
  color,
  seed,
  reduced,
  inclination = 0,
}: {
  /** Centre radius of the belt. */
  radius: number;
  /** How far rocks scatter either side of that radius. */
  width: number;
  count: number;
  color: string;
  seed: number;
  reduced: boolean;
  inclination?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  /*
   * Low-poly geometry on purpose.
   *
   * A rock is a handful of pixels wide. An icosahedron at detail 0 is 20
   * triangles and reads as irregular at that size; anything smoother is
   * geometry nobody can resolve, multiplied by several hundred instances.
   */
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).lerp(new THREE.Color('#15122a'), 0.55),
        roughness: 0.95,
        metalness: 0.1,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.12,
      }),
    [color],
  );

  /** Per-instance transforms, computed once. */
  const instances = useMemo(() => {
    let state = seed >>> 0;
    const random = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 0xffffffff;
    };

    return Array.from({ length: count }, () => {
      const angle = random() * Math.PI * 2;

      /*
       * Radius uses a triangular distribution — two uniforms averaged —
       * so rocks concentrate near the belt's centre line and thin out at
       * the edges. A flat distribution gives a band with hard edges,
       * which reads as a drawn ring rather than a scattered population.
       */
      const offset = (random() + random() - 1) * width;
      const r = radius + offset;

      return {
        angle,
        radius: r,
        // Vertical scatter is much smaller than horizontal — belts are
        // discs, not shells.
        y: (random() + random() - 1) * width * 0.28,
        scale: 0.012 + Math.pow(random(), 2) * 0.055,
        rotation: new THREE.Euler(
          random() * Math.PI,
          random() * Math.PI,
          random() * Math.PI,
        ),
        // Inner rocks orbit faster, as they would.
        speed: (0.06 / (r / radius)) * (0.7 + random() * 0.6),
      };
    });
  }, [count, radius, width, seed]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const anglesRef = useRef<Float32Array>(
    new Float32Array(instances.map((i) => i.angle)),
  );

  /** Writes every instance matrix. Used for the first frame and each tick. */
  const writeMatrices = (advance: number) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];
      anglesRef.current[i] += instance.speed * advance;
      const angle = anglesRef.current[i];

      dummy.position.set(
        Math.cos(angle) * instance.radius,
        instance.y + Math.sin(angle) * instance.radius * Math.sin(inclination),
        Math.sin(angle) * instance.radius * Math.cos(inclination),
      );
      dummy.rotation.copy(instance.rotation);
      dummy.scale.setScalar(instance.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  };

  // One write on mount, so the belt is in place even under reduced motion
  // where the frame loop never advances it.
  useEffect(() => {
    writeMatrices(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances]);

  useFrame((_, delta) => {
    if (reduced) return;
    writeMatrices(delta);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, instances.length]}
      raycast={() => null}
    />
  );
}
