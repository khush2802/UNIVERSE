'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { DomainId } from '@/lib/domains';
import type { Project } from '@/types/project';
import {
  createPointSprite,
  createStarTexture,
  createPlanetEmissiveTexture,
  createPlanetTexture,
  createRingTexture,
  radialiseRingUVs,
} from '@/lib/planetTextures';
import { hashString } from '@/lib/hash';
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
 * Background stars as a single Points object (spec §50).
 *
 * One draw call for the whole field. The alternative — a mesh per star —
 * would be thousands of draw calls and thousands of React components, and
 * §50 rules it out explicitly.
 *
 * Stars sit on a shell well outside the outermost orbit so they read as
 * distant background rather than as debris among the planets.
 */
function Starfield({ count, reduced }: { count: number; reduced: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Uniform distribution on a sphere. Naively randomising the two
      // angles clusters points at the poles; acos of a uniform value
      // corrects for that.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 46 + Math.random() * 34;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      sizes[i] = 0.08 + Math.random() * 0.22;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [count]);

  useFrame((_, delta) => {
    if (reduced || !pointsRef.current) return;
    // Very slow drift. Enough to feel alive, slow enough that nobody
    // consciously notices it moving.
    pointsRef.current.rotation.y += delta * 0.004;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        map={pointSprite()}
        size={0.34}
        sizeAttenuation
        color="#e6e2ff"
        transparent
        opacity={0.85}
        depthWrite={false}
        // Without this, the sprite's transparent corners are drawn as
        // black squares over whatever is behind them.
        alphaTest={0.01}
      />
    </points>
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
}: {
  radius: number;
  inclination: number;
  color: string;
}) {
  // Memoised as a whole. Building the THREE.Line inline would allocate a
  // new geometry, material and object on every render, leaking GPU
  // resources each time the parent re-renders.
  const line = useMemo(() => {
    const segments = 128;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const [x, y, z] = orbitPosition(radius, angle, inclination);
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.3,
    });

    return new THREE.Line(geometry, material);
  }, [radius, inclination, color]);

  // Dispose on unmount — R3F only auto-disposes objects it created itself.
  useEffect(() => {
    return () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    };
  }, [line]);

  return <primitive object={line} />;
}

/* ================================================================== *
 * Planet rings
 * ================================================================== */

/**
 * A ring system.
 *
 * The reference image's contrast comes from an almost unlit sphere beside
 * a ring far brighter than it — the ring is the light source in that
 * composition. So this is additively blended and deliberately brighter
 * than the planet it belongs to.
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
     * Proportions taken from the references: the ring system reads as
     * roughly as wide again as the planet on each side, and it starts
     * close to the surface. The earlier 1.5–2.6 made a thin hoop floating
     * well clear of the planet, which is not what any of them look like.
     */
    const inner = planetSize * 1.28;
    const outer = planetSize * 2.35;

    const geometry = new THREE.RingGeometry(inner, outer, 128, 1);
    radialiseRingUVs(geometry, inner, outer);

    const material = new THREE.MeshBasicMaterial({
      map: createRingTexture(color, seed),
      side: THREE.DoubleSide,
      transparent: true,
      // Normal blending, not additive. Rings are matter, not light — they
      // should occlude the planet where they pass in front of it, which
      // additive blending can never do because it only ever brightens.
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
  const surface = useMemo(() => createStarTexture(), []);

  useEffect(() => () => surface.dispose(), [surface]);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.getElapsedTime();

    if (coreRef.current) coreRef.current.rotation.y = t * 0.04;

    // Two glow shells breathing slightly out of phase. In phase they read
    // as one object scaling; offset, they read as light.
    if (innerGlowRef.current) {
      innerGlowRef.current.scale.setScalar(1 + Math.sin(t * 0.6) * 0.03);
    }
    if (coronaRef.current) {
      coronaRef.current.scale.setScalar(1 + Math.sin(t * 0.42 + 1.1) * 0.045);
    }
  });

  return (
    <group>
      {/* Core. `meshBasicMaterial` ignores lighting, which is right — the
          star is the light source, so it should never be shaded by it. */}
      {/*
        Textured, like the planets. A single flat colour renders as a disc
        no matter how much glow surrounds it — granulation is what makes
        the surface read as a surface. `meshBasicMaterial` still, because
        the star is the light source and must never be shaded by its own
        light.
      */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[STAR_RADIUS, 64, 64]} />
        <meshBasicMaterial map={surface} color="#ffffff" />
      </mesh>

      {/*
        Brightness comes from stacked transparent shells rather than a
        bloom pass. §50 asks for minimal post-processing, and bloom is an
        extra full-screen render target for every frame — expensive on the
        mobile GPUs this most needs to stay smooth on. Three additive
        shells cost almost nothing and read as glow at any resolution.
      */}
      <mesh ref={innerGlowRef} raycast={() => null}>
        <sphereGeometry args={[STAR_RADIUS * 1.22, 32, 32]} />
        <meshBasicMaterial
          color="#ffc978"
          transparent
          opacity={0.34}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={coronaRef} raycast={() => null}>
        <sphereGeometry args={[STAR_RADIUS * 1.75, 32, 32]} />
        <meshBasicMaterial
          color="#f5a742"
          transparent
          opacity={0.16}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh raycast={() => null}>
        <sphereGeometry args={[STAR_RADIUS * 2.2, 24, 24]} />
        <meshBasicMaterial
          color="#e8853a"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* The only light in the scene. Planets are lit from the centre
          outward, which is what makes this read as a system. */}
      <pointLight
        position={[0, 0, 0]}
        intensity={260}
        distance={90}
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
  children,
}: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  // Holds the sphere, its glows and its ring, so hover scales all of them
  // as one object.
  const bodyRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(angle);
  const scaleRef = useRef(1);

  const ringSeed = useMemo(() => hashString(`${id}:ring`), [id]);

  // Surface and glow maps, generated once per planet and disposed with it.
  const surfaceSeed = useMemo(() => hashString(`${id}:surface`), [id]);
  const surfaceMap = useMemo(
    () => createPlanetTexture(color, surfaceSeed),
    [color, surfaceSeed],
  );
  const emissiveMap = useMemo(
    () => createPlanetEmissiveTexture(color, surfaceSeed),
    [color, surfaceSeed],
  );

  useEffect(() => {
    return () => {
      surfaceMap.dispose();
      emissiveMap.dispose();
    };
  }, [surfaceMap, emissiveMap]);

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
  const hasRing = orbitIndex >= 2;
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

        {/* Rim light. Tight to the surface and additive, so it reads as an
            edge catching light rather than fog around the planet. */}
        <mesh ref={atmosphereRef} scale={1.16} raycast={() => null}>
          <sphereGeometry args={[size, 28, 28]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.26}
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

const HOME_POSITION = new THREE.Vector3(0, 10, 24);

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
  /**
   * Zoom as a distance multiplier, held in a ref rather than state.
   * A wheel gesture fires dozens of events per second; routing each
   * through React would re-render the scene tree to move a camera.
   */
  zoomRef: React.RefObject<number>;
}) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));
  const desiredLook = useRef(new THREE.Vector3(0, 0, 0));
  const scratch = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const ease = Math.min(delta * 2.2, 1);
    const zoom = zoomRef.current ?? 1;

    let targetPosition: THREE.Vector3;

    if (focusTarget) {
      // Sit off to one side of the planet and slightly above, rather than
      // directly in front. Head-on, the planet is a flat disc and the
      // orbit it sits on is invisible.
      const offset = focusTarget.clone().normalize().multiplyScalar(3.1 * zoom);
      targetPosition = focusTarget
        .clone()
        .add(offset)
        .add(new THREE.Vector3(0, 1.4 * zoom, 0));
      desiredLook.current.copy(focusTarget);
    } else {
      // Scale the home position rather than dollying along the view axis,
      // so the camera keeps its angle on the system as it pulls back. A
      // straight dolly would flatten toward a top-down view at the far end.
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

        {placements.map((p, index) => (
          <group key={p.domain.id}>
            <OrbitRing
              radius={p.radius}
              inclination={p.inclination}
              color={colors[p.domain.id].accent}
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
