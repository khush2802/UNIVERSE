'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import type { DomainId, PlanetType } from '@/lib/domains';
import type { Project } from '@/types/project';
import {
  createGlowSprite,
  createPointSprite,
  createStarTexture,
  createStarTurbulence,
  createCloudTexture,
  createPlanetEmissiveTexture,
  createPlanetTexture,
  createRingTexture,
  radialiseRingUVs,
} from '@/lib/planetTextures';
import { hashString } from '@/lib/hash';
import { AsteroidBelt } from './AsteroidBelt';
import {
  STAR_RADIUS,
  domainColors,
  orbitPosition,
  placeDomains,
  placeProjects,
  type ProjectPlacement,
} from '@/lib/universe';

/**
 * One sprite texture for the starfield.
 *
 * `THREE.PointsMaterial` draws each point as a screen-aligned square; a
 * radial-gradient map cuts that down to a soft disc. Created lazily rather
 * than at module load, because `document` doesn't exist during server
 * rendering.
 */
let sharedSprite: THREE.Texture | null = null;

function pointSprite(): THREE.Texture {
  if (!sharedSprite) sharedSprite = createPointSprite();
  return sharedSprite;
}

/* ================================================================== *
 * Starfield
 * ================================================================== */

/**
 * Star colour temperatures.
 *
 * Real starfields are not white. Most stars read slightly warm or slightly
 * cool, and that variation is a large part of why a photograph of the sky
 * looks like sky and a field of identical white dots looks like noise.
 *
 * Weighted toward the cooler end so the field sits inside the indigo
 * environment rather than fighting it, with a few warm outliers for
 * contrast.
 */
const STAR_COLOURS: Array<[number, number, number]> = [
  [0.78, 0.82, 1.0], // blue-white
  [0.88, 0.9, 1.0],  // white
  [1.0, 0.97, 0.92], // warm white
  [1.0, 0.88, 0.74], // amber
  [0.86, 0.8, 1.0],  // violet-white
];

const STAR_WEIGHTS = [0.3, 0.34, 0.18, 0.08, 0.1];

function pickColour(random: () => number): [number, number, number] {
  let roll = random();
  for (let i = 0; i < STAR_WEIGHTS.length; i++) {
    roll -= STAR_WEIGHTS[i];
    if (roll <= 0) return STAR_COLOURS[i];
  }
  return STAR_COLOURS[1];
}

interface ShellConfig {
  count: number;
  innerRadius: number;
  outerRadius: number;
  size: number;
  opacity: number;
  /** Fraction of stars placed in clusters rather than uniformly. */
  clustering: number;
}

/**
 * One depth shell of the starfield.
 *
 * The previous version was a single shell: one radius band, one size, one
 * colour, uniformly distributed. That is exactly the "evenly distributed
 * random dots" §1 rules out — uniform distribution has no structure for
 * the eye to read as distance.
 *
 * Three things create the depth instead:
 *
 * - **Separate shells** at different radii, sizes and opacities. Near
 *   stars are larger and brighter, far ones smaller and dimmer, and
 *   because they rotate at different rates the parallax between them is
 *   what actually sells the distance.
 * - **Clustering.** Most stars are placed near one of a handful of seed
 *   points rather than at random, so the field has dense regions and
 *   empty ones.
 * - **Per-vertex colour**, via `vertexColors`, which needs no custom
 *   shader.
 */
function StarShell({
  config,
  seed,
  reduced,
  driftRate,
}: {
  config: ShellConfig;
  seed: number;
  reduced: boolean;
  driftRate: number;
}) {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const { count, innerRadius, outerRadius, clustering } = config;
    const positions = new Float32Array(count * 3);
    const colours = new Float32Array(count * 3);

    let state = seed >>> 0;
    const random = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 0xffffffff;
    };

    // Cluster seeds. Few enough that each gathers a visible group.
    const clusterCount = 7;
    const clusters: Array<[number, number, number]> = [];
    for (let i = 0; i < clusterCount; i++) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      clusters.push([theta, phi, 0.18 + random() * 0.3]);
    }

    for (let i = 0; i < count; i++) {
      let theta: number;
      let phi: number;

      if (random() < clustering) {
        const [ct, cp, spread] = clusters[Math.floor(random() * clusterCount)];
        // Gaussian-ish scatter from two uniforms — enough for visual
        // clustering without pulling in a normal distribution.
        theta = ct + (random() + random() - 1) * spread;
        phi = cp + (random() + random() - 1) * spread * 0.6;
      } else {
        theta = random() * Math.PI * 2;
        // acos of a uniform value, or points pile up at the poles.
        phi = Math.acos(2 * random() - 1);
      }

      const radius = innerRadius + random() * (outerRadius - innerRadius);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const [r, g, b] = pickColour(random);
      // Per-star brightness jitter, squared so most stars are dim and a
      // few are bright — a linear roll makes the field uniformly middling.
      const brightness = 0.45 + Math.pow(random(), 2) * 0.55;
      colours[i * 3] = r * brightness;
      colours[i * 3 + 1] = g * brightness;
      colours[i * 3 + 2] = b * brightness;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    return geo;
  }, [config, seed]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (reduced || !ref.current) return;
    ref.current.rotation.y += delta * driftRate;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        map={pointSprite()}
        size={config.size}
        sizeAttenuation
        vertexColors
        transparent
        opacity={config.opacity}
        depthWrite={false}
        alphaTest={0.01}
      />
    </points>
  );
}

/**
 * A handful of bright foreground stars (§1, "hero stars").
 *
 * Additive and larger, so they bloom slightly against the nebula without
 * any post-processing. Kept deliberately few — the whole effect of a hero
 * star is that it is rare.
 */
function HeroStars({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const count = 14;
    const positions = new Float32Array(count * 3);
    const colours = new Float32Array(count * 3);

    let state = 0x1f83d9ab;
    const random = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 0xffffffff;
    };

    for (let i = 0; i < count; i++) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const radius = 40 + random() * 26;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const [r, g, b] = pickColour(random);
      colours[i * 3] = r;
      colours[i * 3 + 1] = g;
      colours[i * 3 + 2] = b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (reduced || !ref.current) return;
    const material = ref.current.material as THREE.PointsMaterial;
    material.opacity = 0.72 + Math.sin(clock.getElapsedTime() * 0.5) * 0.14;
  });

  return (
    <points ref={ref} geometry={geometry} raycast={() => null}>
      <pointsMaterial
        map={pointSprite()}
        size={1.5}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.72}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/**
 * The full starfield: three shells plus hero stars.
 *
 * Four draw calls rather than one. At this geometry count that is
 * negligible, and it buys per-shell control over size, opacity and drift
 * rate that a single `Points` object cannot express without a custom
 * shader.
 */
function Starfield({ count, reduced }: { count: number; reduced: boolean }) {
  const shells = useMemo<Array<{ config: ShellConfig; seed: number; drift: number }>>(
    () => [
      // Far: many, tiny, dim. Reads as texture rather than as objects.
      {
        config: {
          count: Math.round(count * 0.55),
          innerRadius: 62,
          outerRadius: 88,
          size: 0.22,
          opacity: 0.55,
          clustering: 0.7,
        },
        seed: 0x9e3779b9,
        drift: 0.002,
      },
      // Mid.
      {
        config: {
          count: Math.round(count * 0.3),
          innerRadius: 46,
          outerRadius: 64,
          size: 0.36,
          opacity: 0.75,
          clustering: 0.55,
        },
        seed: 0x85ebca6b,
        drift: 0.0038,
      },
      // Near: few, larger, brightest. Drifts fastest, which is what
      // produces parallax against the shells behind it.
      {
        config: {
          count: Math.round(count * 0.15),
          innerRadius: 34,
          outerRadius: 48,
          size: 0.58,
          opacity: 0.9,
          clustering: 0.35,
        },
        seed: 0xc2b2ae35,
        drift: 0.0062,
      },
    ],
    [count],
  );

  return (
    <>
      {shells.map((shell) => (
        <StarShell
          key={shell.seed}
          config={shell.config}
          seed={shell.seed}
          reduced={reduced}
          driftRate={shell.drift}
        />
      ))}
      <HeroStars reduced={reduced} />
    </>
  );
}

/* ================================================================== *
 * Orbit rings
 * ================================================================== */

/**
 * A thin ring marking one orbital path.
 *
 * Built from a line loop rather than a torus: a torus is hundreds of
 * triangles to draw a circle one pixel wide, and at this scale the
 * difference is invisible except in the frame budget.
 */
function OrbitRing({
  radius,
  inclination,
  color,
  emphasis = 0,
}: {
  radius: number;
  inclination: number;
  color: string;
  /** 0 = resting, 1 = this orbit's planet is selected. */
  emphasis?: number;
}) {
  /*
   * Memoised as a whole. Building the line inline would allocate a new
   * geometry, material and object on every render.
   */
  const line = useMemo(() => {
    const segments = 160;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const [x, y, z] = orbitPosition(radius, angle, inclination);
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    /*
     * Orbits recede with distance.
     *
     * §6 says the orbit lines can dominate the scene, and a fixed opacity
     * is why: the outermost ring is the longest line on screen, so at
     * equal opacity it carries the most visual weight of anything in the
     * composition. Fading them with radius means the near orbits read
     * clearly and the far ones settle into the background, which is also
     * what atmospheric perspective does in a real photograph.
     *
     * Indigo rather than the domain accent. Six saturated accent rings
     * competed with the planets they belong to; a common indigo lets the
     * planets carry the colour and the orbits carry only the structure.
     */
    const distanceFade = 1 - Math.min(radius / 26, 1) * 0.55;

    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color('#7c5cc4').lerp(new THREE.Color(color), 0.25),
      transparent: true,
      opacity: 0.17 * distanceFade,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Line(geometry, material);
  }, [radius, inclination, color]);

  // Emphasis is animated rather than switched, so an orbit brightening on
  // selection reads as a response instead of a state change.
  useFrame((_, delta) => {
    const material = line.material as THREE.LineBasicMaterial;
    const distanceFade = 1 - Math.min(radius / 26, 1) * 0.55;
    const target = (emphasis > 0 ? 0.55 : 0.17) * distanceFade;
    material.opacity += (target - material.opacity) * Math.min(delta * 5, 1);
  });

  // Dispose on unmount — R3F only auto-disposes objects it created itself.
  useEffect(() => {
    return () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    };
  }, [line]);

  return <primitive object={line} raycast={() => null} />;
}

/* ================================================================== *
 * Planet rings
 * ================================================================== */

/**
 * A ring system.
 *
 * Rings are matter, not light. Earlier versions used additive blending,
 * which makes them glow and — at high alpha — clip to white. Every
 * reference shows rings as *material*: bands of dust and ice, brighter
 * than the planet but plainly solid. Normal blending lets a ring occlude
 * the planet where it passes in front, which additive can never do because
 * it only ever brightens.
 *
 * `DoubleSide` matters: seen from below, a single-sided ring vanishes
 * exactly when the orbit carries the planet to the far side of the star.
 */
function PlanetRing({
  planetSize,
  color,
  seed,
  tilt,
}: {
  planetSize: number;
  color: string;
  seed: number;
  tilt: number;
}) {
  const ring = useMemo(() => {
    /*
     * Proportions from the references: the system reads as roughly as wide
     * again as the planet on each side, starting close to the surface.
     */
    const inner = planetSize * 1.28;
    const outer = planetSize * 2.35;

    const geometry = new THREE.RingGeometry(inner, outer, 128, 1);
    radialiseRingUVs(geometry, inner, outer);

    const material = new THREE.MeshBasicMaterial({
      map: createRingTexture(color, seed),
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      opacity: 0.95,
    });

    return new THREE.Mesh(geometry, material);
  }, [planetSize, color, seed]);

  useEffect(() => {
    return () => {
      ring.geometry.dispose();
      const material = ring.material as THREE.MeshBasicMaterial;
      material.map?.dispose();
      material.dispose();
    };
  }, [ring]);

  return (
    <primitive
      object={ring}
      rotation={[Math.PI / 2 - tilt, 0, tilt * 0.6]}
      raycast={() => null}
    />
  );
}

/* ================================================================== *
 * Central star
 * ================================================================== */

function CentralStar({ reduced }: { reduced: boolean }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const turbulenceRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const outerGlowRef = useRef<THREE.Sprite>(null);

  const surface = useMemo(() => createStarTexture(), []);
  const turbulence = useMemo(() => createStarTurbulence(), []);
  const innerGlow = useMemo(() => createGlowSprite('#fff0cf', '#ff9c3c'), []);
  const outerGlow = useMemo(() => createGlowSprite('#ffb15a', '#b06bd8'), []);

  useEffect(() => {
    return () => {
      surface.dispose();
      turbulence.dispose();
      innerGlow.dispose();
      outerGlow.dispose();
    };
  }, [surface, turbulence, innerGlow, outerGlow]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.getElapsedTime();

    /*
     * Two surface layers turning at different rates.
     *
     * Where they overlap they brighten; where they separate they don't.
     * Because they drift apart continuously the bright regions move and
     * change shape, which is what makes the star look like it is burning.
     * A single texture, however detailed, rotates rigidly and reads as a
     * painted ball.
     */
    if (coreRef.current) coreRef.current.rotation.y = t * 0.028;
    if (turbulenceRef.current) {
      turbulenceRef.current.rotation.y = -t * 0.045;
      turbulenceRef.current.rotation.x = Math.sin(t * 0.12) * 0.06;
    }

    // Halo breathes gently, and the two sprites are out of phase — in
    // phase they read as one object scaling rather than as light.
    if (glowRef.current) {
      const pulse = STAR_RADIUS * 7.4 * (1 + Math.sin(t * 0.55) * 0.022);
      glowRef.current.scale.setScalar(pulse);
    }
    if (outerGlowRef.current) {
      const pulse = STAR_RADIUS * 13 * (1 + Math.sin(t * 0.37 + 1.4) * 0.03);
      outerGlowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* Core. `meshBasicMaterial` ignores lighting, which is right — the
          star is the light source and must never be shaded by it.
          `toneMapped={false}` keeps it hot rather than being pulled down
          with the rest of the scene. */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[STAR_RADIUS, 64, 64]} />
        <meshBasicMaterial map={surface} toneMapped={false} />
      </mesh>

      <mesh ref={turbulenceRef} scale={1.012} raycast={() => null}>
        <sphereGeometry args={[STAR_RADIUS, 48, 48]} />
        <meshBasicMaterial
          map={turbulence}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/*
        The halo is two camera-facing sprites, not nested spheres.

        Back-side spheres were the wrong tool: each shell has a hard edge
        where its geometry ends, so stacking them produces visible steps —
        concentric rings of brightness instead of a continuous falloff. A
        sprite with a gradient has no edges at all, and being
        camera-facing it never shows its own geometry from an angle.

        The outer one fades into violet so the star sits inside the nebula
        rather than on top of it.
      */}
      <sprite ref={glowRef} scale={STAR_RADIUS * 7.4}>
        <spriteMaterial
          map={innerGlow}
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <sprite ref={outerGlowRef} scale={STAR_RADIUS * 13}>
        <spriteMaterial
          map={outerGlow}
          transparent
          opacity={0.34}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      {/* The only light in the scene, so planets are lit from the centre
          outward — which is what makes this read as a system. */}
      <pointLight
        position={[0, 0, 0]}
        intensity={340}
        distance={110}
        decay={2}
        color="#ffd9a0"
      />
    </group>
  );
}

/* ================================================================== *
 * Domain planet
 * ================================================================== */

interface PlanetProps {
  id: DomainId;
  radius: number;
  angle: number;
  inclination: number;
  size: number;
  speed: number;
  color: string;
  reduced: boolean;
  frozen: boolean;
  hovered: boolean;
  /** Something else is selected, so this one recedes. */
  dimmed: boolean;
  onHover: (id: DomainId | null) => void;
  onSelect: (id: DomainId | null) => void;
  /** Lets the parent read live world position for the HTML labels. */
  register: (id: DomainId, group: THREE.Group | null) => void;
  /** Position in the orbit order, 0 = innermost. Decides ring eligibility. */
  orbitIndex: number;
  /** Archetype: drives surface generation and material treatment. */
  planetType: PlanetType;
  children?: React.ReactNode;
}

function DomainPlanet({
  id,
  radius,
  angle,
  inclination,
  size,
  speed,
  color,
  reduced,
  frozen,
  hovered,
  dimmed,
  onHover,
  onSelect,
  register,
  orbitIndex,
  planetType,
  children,
}: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  // Holds the sphere, its glows and its ring, so hover scales all of them
  // as one object.
  const bodyRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(angle);
  const scaleRef = useRef(1);

  const ringSeed = useMemo(() => hashString(`${id}:ring`), [id]);

  // Surface and glow maps, generated once per planet and disposed with it.
  const surfaceSeed = useMemo(() => hashString(`${id}:surface`), [id]);
  const surfaceMap = useMemo(
    () => createPlanetTexture(color, surfaceSeed, planetType),
    [color, surfaceSeed, planetType],
  );
  const emissiveMap = useMemo(
    () => createPlanetEmissiveTexture(color, surfaceSeed, planetType),
    [color, surfaceSeed, planetType],
  );
  const cloudMap = useMemo(
    () => createCloudTexture(surfaceSeed, planetType),
    [surfaceSeed, planetType],
  );

  useEffect(() => {
    return () => {
      surfaceMap.dispose();
      emissiveMap?.dispose();
      cloudMap?.dispose();
    };
  }, [surfaceMap, emissiveMap, cloudMap]);

  /*
   * Material properties per archetype.
   *
   * A single roughness/metalness pair across all six is what made them
   * look like one planet in different colours. Ice is smoother and more
   * reflective; rock is matte and slightly metallic from mineral content;
   * gas has no real surface, so it is uniformly rough.
   */
  const materialProps = {
    'gas-giant': { roughness: 0.9, metalness: 0.04, emissiveIntensity: 0.42 },
    'ice-giant': { roughness: 0.42, metalness: 0.12, emissiveIntensity: 0.34 },
    terrestrial: { roughness: 0.72, metalness: 0.08, emissiveIntensity: 0.22 },
    rocky: { roughness: 0.96, metalness: 0.16, emissiveIntensity: 0 },
  }[planetType];

  /* Rim strength: an atmosphere glows at the limb, an airless rock does not. */
  const rimOpacity = planetType === 'rocky' ? 0.08 : planetType === 'ice-giant' ? 0.34 : 0.26;

  /*
   * Rings on the outer planets only.
   *
   * Not a hash this time — orbit position decides. The two innermost
   * planets go bare, which mirrors how real systems are arranged: close to
   * a star, ring material doesn't survive, and the ringed giants sit
   * further out. That makes the arrangement mean something rather than
   * being decoration distributed at random, and it gives the inner orbits
   * room to pass each other without ring edges overlapping.
   *
   * Tilt stays above 0.3 rad. Below about 15° a ring is edge-on and renders
   * as a bright line through the planet, which looks like a glitch.
   */
  /*
   * Rings on the giants only.
   *
   * Previously this was orbit position alone. Type is the better rule: a
   * small rocky body has neither the gravity to hold a ring system nor the
   * visual mass to carry one, and giving every outer planet rings made the
   * outer half of the system look repetitive.
   *
   * The orbit gate is gone — the system was widened instead, so even the
   * innermost planet has room. See BASE_ORBIT_RADIUS for that arithmetic.
   */
  const hasRing = planetType === 'gas-giant' || planetType === 'ice-giant';
  const ringTilt = ((ringSeed % 1000) / 1000) * 0.44 + 0.3;

  useEffect(() => {
    register(id, groupRef.current);
    return () => register(id, null);
  }, [id, register]);

  useFrame((_, delta) => {
    // `frozen` holds the planet still while it is being inspected. A
    // planet that keeps orbiting while the camera studies it forces the
    // camera to chase it, which reads as drift rather than focus.
    if (!reduced && !frozen) {
      angleRef.current += delta * speed;

      if (groupRef.current) {
        const [x, y, z] = orbitPosition(radius, angleRef.current, inclination);
        groupRef.current.position.set(x, y, z);
      }

      if (meshRef.current) meshRef.current.rotation.y += delta * 0.25;
      // Clouds run ~40% faster than the ground beneath them.
      if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.35;
    }

    /*
     * Hover scale, applied to the whole planet rather than the sphere.
     *
     * This was scaling `meshRef` alone, so the sphere grew while its ring
     * stayed put and the surface pushed straight through it. The ring is
     * a sibling in the same group, so scaling the group scales both
     * together and their proportions hold.
     */
    const target = hovered ? 1.28 : 1;
    scaleRef.current += (target - scaleRef.current) * Math.min(delta * 9, 1);
    if (bodyRef.current) bodyRef.current.scale.setScalar(scaleRef.current);

    /*
     * Dimming darkens the planet; it never makes it transparent.
     *
     * The previous version faded `material.opacity` to 0.35, which is why
     * planets looked see-through — the nebula behind them showed straight
     * through the surface. A dimmed planet should look unlit, not
     * ghostly, so brightness is the only thing that moves and the material
     * is fully opaque at all times.
     */
    const material = meshRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (material) {
      const targetEmissive = dimmed ? 0.1 : hovered ? 0.85 : 0.42;
      material.emissiveIntensity +=
        (targetEmissive - material.emissiveIntensity) * Math.min(delta * 6, 1);

      // Multiplies the texture down toward black rather than fading it out.
      const targetTint = dimmed ? 0.34 : 1;
      const current = material.color.r;
      const next = current + (targetTint - current) * Math.min(delta * 6, 1);
      material.color.setScalar(next);
    }

    const atmosphere = atmosphereRef.current?.material as
      | THREE.MeshBasicMaterial
      | undefined;
    if (atmosphere) {
      const targetOpacity = dimmed ? 0.05 : hovered ? 0.5 : 0.26;
      atmosphere.opacity +=
        (targetOpacity - atmosphere.opacity) * Math.min(delta * 6, 1);
    }
  });

  const initial = orbitPosition(radius, angle, inclination);

  return (
    <group ref={groupRef} position={initial}>
      {/* Everything that is "the planet" lives in here, so hover scales
          the sphere, its glow and its ring as one object. */}
      <group ref={bodyRef}>
        <mesh
          ref={meshRef}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(id);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            onHover(null);
            document.body.style.cursor = '';
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id);
          }}
        >
          {/* Hit area is the mesh itself. A larger invisible collider would
              make neighbouring planets steal each other's hovers on the
              inner orbits, where they pass close together. */}
          <sphereGeometry args={[size, 48, 48]} />
          <meshStandardMaterial
            map={surfaceMap}
            emissiveMap={emissiveMap}
            color="#ffffff"
            roughness={0.9}
            metalness={0.06}
            emissive={new THREE.Color(color)}
            emissiveIntensity={0.42}
          />
        </mesh>

        {/*
          Cloud shell.

          Its own sphere at 1.02×, rotating faster than the surface. That
          relative drift is most of what makes a planet look alive —
          clouds baked into the surface texture turn in lockstep with the
          ground and read as markings rather than weather.
        */}
        {cloudMap && (
          <mesh ref={cloudRef} scale={1.02} raycast={() => null}>
            <sphereGeometry args={[size, 40, 40]} />
            <meshStandardMaterial
              map={cloudMap}
              transparent
              opacity={0.5}
              depthWrite={false}
              roughness={1}
            />
          </mesh>
        )}

        {/* Rim light. Tight to the surface and additive, so it reads as an
            edge catching light rather than fog around the planet. */}
        <mesh ref={atmosphereRef} scale={1.16} raycast={() => null}>
          <sphereGeometry args={[size, 28, 28]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={rimOpacity}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh scale={1.55} raycast={() => null}>
          <sphereGeometry args={[size, 20, 20]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.07}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {hasRing && (
          <PlanetRing
            planetSize={size}
            color={color}
            seed={ringSeed}
            tilt={ringTilt}
          />
        )}
      </group>

      {/*
        Project moons sit outside the body group on purpose.

        Inside it they would scale with the hover, and since their orbital
        radii are set relative to the planet's size, a hovered planet would
        fling its projects outward and pull them back on release. Their
        orbits belong to the planet's position, not its apparent size.
      */}
      {children}
    </group>
  );
}

/* ================================================================== *
 * Project planet
 * ================================================================== */

/**
 * A project, orbiting its domain (spec §16, §48).
 *
 * Rendered as a child of the domain planet's group, so it inherits that
 * planet's position automatically — the moon and its ring travel with the
 * parent without any code coordinating the two. That's also what makes the
 * relationship legible: a project visibly belongs to a domain because it
 * moves with it.
 *
 * Nothing here is configured per project. Size, orbit and phase all come
 * from a hash of the project id, so adding a repository creates a planet
 * with no manual placement step (§4, §49).
 */
function ProjectPlanet({
  placement,
  color,
  reduced,
  frozen,
  hovered,
  dimmed,
  onHover,
  onSelect,
}: {
  placement: ProjectPlacement;
  color: string;
  reduced: boolean;
  frozen: boolean;
  hovered: boolean;
  dimmed: boolean;
  onHover: (project: Project | null) => void;
  onSelect: (project: Project) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(placement.angle);
  const scaleRef = useRef(1);

  useFrame((_, delta) => {
    if (!reduced && !frozen) {
      angleRef.current += delta * placement.angularSpeed;

      if (groupRef.current) {
        const [x, y, z] = orbitPosition(
          placement.radius,
          angleRef.current,
          placement.inclination,
        );
        groupRef.current.position.set(x, y, z);
      }
    }

    // Moons are small, so hover scales them harder than a domain planet —
    // a 1.28x bump on a 0.075 sphere is invisible.
    const target = hovered ? 1.9 : 1;
    scaleRef.current += (target - scaleRef.current) * Math.min(delta * 10, 1);
    if (meshRef.current) meshRef.current.scale.setScalar(scaleRef.current);

    const material = meshRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (material) {
      const targetEmissive = dimmed ? 0.05 : hovered ? 0.7 : 0.32;
      material.emissiveIntensity +=
        (targetEmissive - material.emissiveIntensity) * Math.min(delta * 6, 1);
    }
  });

  const initial = orbitPosition(
    placement.radius,
    placement.angle,
    placement.inclination,
  );

  return (
    <group ref={groupRef} position={initial}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(placement.project);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(placement.project);
        }}
      >
        {/*
          Moons keep a plain material. At roughly a tenth of a domain
          planet's radius the surface detail would be sub-pixel, so
          generating a 1024×512 texture per project would cost memory for
          something nobody can see. They get brightness instead — moons
          need to be findable, not detailed.
        */}
        <sphereGeometry args={[placement.size, 20, 20]} />
        <meshStandardMaterial
          color={new THREE.Color(color).lerp(new THREE.Color('#0c1020'), 0.35)}
          roughness={0.5}
          emissive={new THREE.Color(color)}
          emissiveIntensity={0.32}
        />
      </mesh>

      <mesh scale={2.1} raycast={() => null}>
        <sphereGeometry args={[placement.size, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.16}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ================================================================== *
 * Camera
 * ================================================================== */

/*
 * Framed against the widened system, not chosen by eye.
 *
 * At [0, 10, 24] the visible half-width was 15.45 units while the
 * Academics orbit now sits at 16.75 — it would have been clipped off the
 * side of the frame. This gives 17.88 at a 1.4 aspect ratio, which is the
 * narrowest desktop window worth designing for.
 */
const HOME_POSITION = new THREE.Vector3(0, 11, 28);

/**
 * Eases the camera toward a target rather than cutting to it (spec §15).
 *
 * Lerping every frame gives an ease-out for free: the gap shrinks each
 * frame, so the approach naturally decelerates. `delta`-scaled so the
 * motion is the same on a 60Hz and a 144Hz display — a fixed per-frame
 * factor would make the camera twice as fast on a gaming monitor.
 *
 * §15 warns against excessive camera movement, so this only ever moves
 * between two states: home, and one focused planet.
 */
function CameraRig({
  focusTarget,
  reduced,
  zoomRef,
}: {
  focusTarget: THREE.Vector3 | null;
  reduced: boolean;
  zoomRef: React.RefObject<number>;
}) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));
  const desiredLook = useRef(new THREE.Vector3(0, 0, 0));
  const scratch = useRef(new THREE.Vector3());

  /*
   * Entrance, once, on mount (§9).
   *
   * GSAP earns its place here specifically: this is a scripted move with a
   * defined start, end and easing curve, and it needs to run to completion
   * regardless of what the per-frame follow logic wants. A `lerp` cannot
   * express "travel this path over 2.4 seconds" — it only ever expresses
   * "approach the current target", so it has no notion of a beginning.
   *
   * `entranceDone` gates the follow logic below. Without it, the rig would
   * fight the tween every frame and the camera would arrive instantly.
   */
  const entranceDone = useRef(false);

  useEffect(() => {
    if (reduced) {
      // §14: no camera flight. The scene is simply already composed.
      camera.position.copy(HOME_POSITION);
      camera.lookAt(0, 0, 0);
      entranceDone.current = true;
      return;
    }

    // Start further out and higher, so the move settles inward and down —
    // arriving at a system rather than sliding across it.
    camera.position.set(0, 30, 62);
    camera.lookAt(0, 0, 0);

    const tween = gsap.to(camera.position, {
      x: HOME_POSITION.x,
      y: HOME_POSITION.y,
      z: HOME_POSITION.z,
      duration: 2.4,
      // Slow out of the gate, long deceleration. `power2.out` arrives too
      // eagerly for a move this size and reads as a jump cut.
      ease: 'power3.out',
      onUpdate: () => camera.lookAt(0, 0, 0),
      onComplete: () => {
        entranceDone.current = true;
      },
    });

    return () => {
      tween.kill();
      entranceDone.current = true;
    };
  }, [camera, reduced]);

  useFrame((_, delta) => {
    // Hand control to the tween until it finishes.
    if (!entranceDone.current) return;

    const ease = Math.min(delta * 2.2, 1);
    const zoom = zoomRef.current ?? 1;

    let targetPosition: THREE.Vector3;

    if (focusTarget) {
      // Off to one side and slightly above, not head-on. Straight in
      // front, a planet is a flat disc and its orbit is invisible.
      const offset = focusTarget.clone().normalize().multiplyScalar(3.4 * zoom);
      targetPosition = focusTarget
        .clone()
        .add(offset)
        .add(new THREE.Vector3(0, 1.5 * zoom, 0));
      desiredLook.current.copy(focusTarget);
    } else {
      // Scaling the home position rather than dollying along the view
      // axis keeps the camera's angle on the system as it pulls back. A
      // straight dolly flattens toward a top-down view at the far end.
      targetPosition = scratch.current.copy(HOME_POSITION).multiplyScalar(zoom);
      desiredLook.current.set(0, 0, 0);
    }

    if (reduced) {
      camera.position.copy(targetPosition);
      lookAt.current.copy(desiredLook.current);
    } else {
      camera.position.lerp(targetPosition, ease);
      lookAt.current.lerp(desiredLook.current, ease);
    }

    camera.lookAt(lookAt.current);
  });

  return null;
}

/* ================================================================== *
 * Screen projection for HTML labels
 * ================================================================== */

export interface ScreenPoint {
  id: DomainId;
  x: number;
  y: number;
  /** Behind the camera or occluded by the star. */
  hidden: boolean;
}

/**
 * Projects planet positions to screen coordinates each frame.
 *
 * Labels are HTML rather than 3D text: real text is selectable, readable
 * by a screen reader, and stays crisp at any zoom. Drawing it into the
 * canvas would give up all three.
 *
 * The result is handed out through a callback that writes directly to DOM
 * refs. Putting it in React state would re-render the whole overlay sixty
 * times a second for what is ultimately a CSS transform.
 */
function ScreenProjector({
  groups,
  onUpdate,
}: {
  groups: React.RefObject<Map<DomainId, THREE.Group>>;
  onUpdate: (points: ScreenPoint[]) => void;
}) {
  const { camera, size } = useThree();
  const scratch = useRef(new THREE.Vector3());

  useFrame(() => {
    const points: ScreenPoint[] = [];

    groups.current?.forEach((group, id) => {
      group.getWorldPosition(scratch.current);
      const world = scratch.current.clone();
      const projected = world.clone().project(camera);

      points.push({
        id,
        x: (projected.x * 0.5 + 0.5) * size.width,
        y: (-projected.y * 0.5 + 0.5) * size.height,
        // z > 1 means behind the camera. Without this check labels for
        // planets behind you appear mirrored across the screen.
        hidden: projected.z > 1,
      });
    });

    onUpdate(points);
  });

  return null;
}

/* ================================================================== *
 * Scene
 * ================================================================== */

export function Scene({
  reduced,
  starCount,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  onProject,
  projects,
  hoveredProjectId,
  selectedProjectId,
  onHoverProject,
  onSelectProject,
  zoomRef,
}: {
  reduced: boolean;
  starCount: number;
  hoveredId: DomainId | null;
  selectedId: DomainId | null;
  onHover: (id: DomainId | null) => void;
  onSelect: (id: DomainId | null) => void;
  onProject: (points: ScreenPoint[]) => void;
  projects: Project[];
  hoveredProjectId: string | null;
  selectedProjectId: string | null;
  onHoverProject: (project: Project | null) => void;
  onSelectProject: (project: Project) => void;
  zoomRef: React.RefObject<number>;
}) {
  const placements = useMemo(() => placeDomains(), []);
  const projectsByDomain = useMemo(() => placeProjects(projects), [projects]);
  const colors = useMemo(() => domainColors(), []);
  const groupRef = useRef<THREE.Group>(null);
  const groups = useRef<Map<DomainId, THREE.Group>>(new Map());
  const [focusTarget, setFocusTarget] = useState<THREE.Vector3 | null>(null);

  const register = useCallback((id: DomainId, group: THREE.Group | null) => {
    if (group) groups.current.set(id, group);
    else groups.current.delete(id);
  }, []);

  // Resolve the selected planet's world position once, at selection time.
  // Planets are frozen while selected, so this value stays correct.
  useEffect(() => {
    if (!selectedId) {
      setFocusTarget(null);
      return;
    }

    const group = groups.current.get(selectedId);
    if (!group) return;

    const world = new THREE.Vector3();
    group.getWorldPosition(world);
    setFocusTarget(world);
  }, [selectedId]);

  useFrame((_, delta) => {
    if (reduced || !groupRef.current) return;
    // System drift stops while something is selected, so the subject of
    // attention holds still.
    if (selectedId) return;
    groupRef.current.rotation.y += delta * 0.012;
  });

  return (
    <>
      <ambientLight intensity={0.28} />
      <Starfield count={starCount} reduced={reduced} />
      <CameraRig focusTarget={focusTarget} reduced={reduced} zoomRef={zoomRef} />
      <ScreenProjector groups={groups} onUpdate={onProject} />

      {/* Clicking empty space returns to the overview (spec §15, Reset). */}
      <mesh position={[0, 0, -40]} onClick={() => onSelect(null)} visible={false}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial />
      </mesh>

      <group ref={groupRef}>
        <CentralStar reduced={reduced} />

        {/*
          Belts occupy genuinely free gaps.

          My first placement put one at radius 10.75 ± 0.62, which ran
          straight through Other's ring system (10.92–13.08). Every
          planet's full reach — sphere plus rings — was mapped before
          choosing these, and each belt's width is 85% of the gap it sits
          in so rocks at the tail of the distribution still clear their
          neighbours.

          Two placements: the 15.03–16.22 gap between Achievements and
          Academics, and open space beyond the outermost orbit. The inner
          gaps are all under 0.7 wide, which is too narrow for a belt to
          read as anything but a line.

          Halved under reduced motion, where nothing moves and the density
          only costs fill rate.
        */}
        <AsteroidBelt
          radius={15.63}
          width={0.5}
          count={reduced ? 160 : 340}
          color="#b9a7d6"
          seed={0x51ed270b}
          reduced={reduced}
          inclination={0.06}
        />
        <AsteroidBelt
          radius={19.2}
          width={1.1}
          count={reduced ? 200 : 420}
          color="#9d8ec2"
          seed={0x2f6a88c1}
          reduced={reduced}
          inclination={-0.09}
        />

        {placements.map((p, index) => (
          <group key={p.domain.id}>
            <OrbitRing
              radius={p.radius}
              inclination={p.inclination}
              color={colors[p.domain.id].accent}
              emphasis={selectedId === p.domain.id ? 1 : 0}
            />
            <DomainPlanet
              id={p.domain.id}
              radius={p.radius}
              angle={p.angle}
              inclination={p.inclination}
              size={p.size}
              speed={p.angularSpeed}
              color={colors[p.domain.id].accent}
              reduced={reduced}
              frozen={selectedId !== null}
              hovered={hoveredId === p.domain.id}
              dimmed={selectedId !== null && selectedId !== p.domain.id}
              onHover={onHover}
              onSelect={onSelect}
              register={register}
              orbitIndex={index}
              planetType={p.domain.planetType}
            >
              {projectsByDomain[p.domain.id]?.map((placement) => (
                <group key={placement.project.id}>
                  <OrbitRing
                    radius={placement.radius}
                    inclination={placement.inclination}
                    color={colors[p.domain.id].accent}
                  />
                  <ProjectPlanet
                    placement={placement}
                    color={colors[p.domain.id].accent}
                    reduced={reduced}
                    frozen={selectedId !== null}
                    hovered={hoveredProjectId === placement.project.id}
                    dimmed={
                      selectedId !== null && selectedId !== p.domain.id
                    }
                    onHover={onHoverProject}
                    onSelect={onSelectProject}
                  />
                </group>
              ))}
            </DomainPlanet>
          </group>
        ))}
      </group>
    </>
  );
}
