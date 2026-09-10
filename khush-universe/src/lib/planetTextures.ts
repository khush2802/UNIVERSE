import * as THREE from 'three';

/**
 * A soft circular sprite for point clouds.
 *
 * `THREE.PointsMaterial` draws each point as a screen-aligned **square**.
 * At small sizes that passes for a dot, but anything large enough to see
 * reveals itself as a hard-edged box — which is exactly what the grey
 * squares in the scene were.
 *
 * Applying a radial-gradient texture as the material's `map` cuts the
 * square down to a soft disc. One 64×64 texture is shared by every point
 * cloud in the scene, so this costs 16 KB total.
 */
export function createPointSprite(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);

  // A hot core with a long soft tail. A linear falloff would still show a
  // visible circular edge; this fades to nothing before it reaches the
  // sprite boundary.
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.42, 'rgba(255,255,255,0.32)');
  gradient.addColorStop(0.72, 'rgba(255,255,255,0.06)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * The star's surface.
 *
 * A `meshBasicMaterial` in one flat colour is a disc. Real stellar surfaces
 * are turbulent, and even a suggestion of granulation is what separates
 * "light source" from "yellow circle".
 */
export function createStarTexture(): THREE.Texture {
  const width = 512;
  const height = 256;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = '#ffd9a0';
  ctx.fillRect(0, 0, width, height);

  let state = 0x5bf03635;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };

  /*
   * Banding, like the planets have.
   *
   * Stars do have latitude structure, and giving the centre the same
   * visual language as the things orbiting it makes the system read as one
   * family of objects rather than a lamp surrounded by planets.
   *
   * Kept far subtler than a planet's: the contrast between adjacent bands
   * is a few percent, because a star with obvious stripes looks like a
   * planet that happens to be bright.
   */
  let y = 0;
  while (y < height) {
    const bandHeight = 6 + random() * 26;
    const warm = random() > 0.5;
    const strength = 0.05 + random() * 0.12;

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const wobble =
        Math.sin(u * Math.PI * 2 + y * 0.05) * 2.4 +
        Math.sin(u * Math.PI * 5 + y * 0.11) * 1.2;

      ctx.fillStyle = warm
        ? `rgba(255, 168, 84, ${strength})`
        : `rgba(255, 250, 226, ${strength})`;
      ctx.fillRect(x, y + wobble, 1, bandHeight + 1.5);
    }

    y += bandHeight;
  }

  /*
   * Granulation over the top: overlapping convection cells.
   *
   * Bands alone read as a striped ball. The cells break the stripes up so
   * the surface looks turbulent, which is what separates "light source"
   * from "yellow circle".
   */
  for (let i = 0; i < 240; i++) {
    const x = random() * width;
    const cy = random() * height;
    const radius = 6 + random() * 38;
    const warm = random() > 0.45;

    const gradient = ctx.createRadialGradient(x, cy, 0, x, cy, radius);
    gradient.addColorStop(
      0,
      warm
        ? `rgba(255, 158, 70, ${0.08 + random() * 0.18})`
        : `rgba(255, 252, 236, ${0.1 + random() * 0.24})`,
    );
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, cy - radius, radius * 2, radius * 2);
  }

  // Poles cool slightly, so the sphere keeps its roundness at the limb.
  const poles = ctx.createLinearGradient(0, 0, 0, height);
  poles.addColorStop(0, 'rgba(196, 92, 30, 0.34)');
  poles.addColorStop(0.25, 'rgba(196, 92, 30, 0)');
  poles.addColorStop(0.75, 'rgba(196, 92, 30, 0)');
  poles.addColorStop(1, 'rgba(196, 92, 30, 0.34)');
  ctx.fillStyle = poles;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * A seeded pseudo-random generator.
 *
 * `Math.random` can't be used in texture generation: the universe is built
 * on the promise that a planet looks the same on every load, and a surface
 * that reshuffled itself each refresh would break that in the most visible
 * way possible.
 */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    // xorshift32 — small, fast, good enough spread for texture work.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

/**
 * The planet surface.
 *
 * Without this, a planet is a solid-coloured sphere with a lighting
 * gradient — which is exactly what "a circle" looks like. The reference
 * image's sphere is dark and mottled with bright specks scattered across
 * it, and the specks are most of what makes it read as an object rather
 * than a shape.
 *
 * Drawn equirectangular (2:1) so it wraps a sphere without distortion at
 * the seam.
 */
export function createPlanetTexture(color: string, seed: number): THREE.Texture {
  /*
   * 512×256 equirectangular.
   *
   * At default zoom a domain planet occupies roughly 40 screen pixels; even
   * focused it is a few hundred. 1024×512 came to 24 MB across six planets
   * with two maps each — detail well below the size of a pixel (§50).
   */
  const width = 512;
  const height = 256;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const random = makeRandom(seed);
  const palette = bandPalette(color, random);

  /*
   * Latitude bands.
   *
   * This is the whole difference between a gas giant and a rock. The
   * previous version scattered soft blobs, which reads as terrain; every
   * Saturn-like reference is banded horizontally, and the bands are what
   * the eye recognises.
   *
   * Widths vary a lot on purpose — evenly spaced stripes look like a
   * flag. Real banding has a few broad zones with narrow ones crowded
   * between them.
   */
  const bands: Array<{ top: number; bottom: number; color: string }> = [];
  let y = 0;

  while (y < height) {
    // Bands are widest at the equator and tighten toward the poles, which
    // is both true of real gas giants and what stops the texture looking
    // uniform top to bottom.
    const latitude = Math.abs(y / height - 0.5) * 2;
    const maxHeight = 26 * (1 - latitude * 0.62) + 4;
    const bandHeight = 3 + random() * maxHeight;

    bands.push({
      top: y,
      bottom: Math.min(y + bandHeight, height),
      color: palette[Math.floor(random() * palette.length)],
    });

    y += bandHeight;
  }

  /*
   * Drawn column by column with a sine offset, so band edges undulate.
   *
   * Straight horizontal edges look printed. Two sine waves of different
   * frequency per band give an edge that never quite repeats across the
   * seam — which matters because this texture wraps, and an obvious
   * repeat would show as a vertical scar down the planet.
   */
  for (let x = 0; x < width; x++) {
    const u = x / width;

    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      const phase = i * 1.7;
      const wobble =
        Math.sin(u * Math.PI * 2 + phase) * 3.2 +
        Math.sin(u * Math.PI * 6 + phase * 2.3) * 1.6;

      ctx.fillStyle = band.color;
      ctx.fillRect(x, band.top + wobble, 1, band.bottom - band.top + 1.4);
    }
  }

  /*
   * Storms.
   *
   * A couple of oval spots stretched horizontally, because anything
   * circular on a banded planet reads as a hole rather than weather.
   */
  const storms = 1 + Math.floor(random() * 3);
  for (let i = 0; i < storms; i++) {
    const sx = random() * width;
    const sy = height * (0.25 + random() * 0.5);
    const rx = 14 + random() * 34;
    const ry = rx * (0.28 + random() * 0.2);

    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, rx);
    const [r, g, b] = hexToRgb(palette[0]);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.55)`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, ry / rx);
    ctx.translate(-sx, -sy);
    ctx.fillStyle = gradient;
    ctx.fillRect(sx - rx, sy - rx, rx * 2, rx * 2);
    ctx.restore();
  }

  // Poles darken. Without this the bands run flat off the top and bottom
  // and the sphere loses its roundness at the limb.
  const poles = ctx.createLinearGradient(0, 0, 0, height);
  poles.addColorStop(0, 'rgba(4, 6, 14, 0.6)');
  poles.addColorStop(0.22, 'rgba(4, 6, 14, 0)');
  poles.addColorStop(0.78, 'rgba(4, 6, 14, 0)');
  poles.addColorStop(1, 'rgba(4, 6, 14, 0.6)');
  ctx.fillStyle = poles;
  ctx.fillRect(0, 0, width, height);

  return finishTexture(canvas);
}

/**
 * The colours a planet's bands are drawn from.
 *
 * Built around the domain accent so a planet still identifies its domain,
 * but widened with a cream and a near-black. The references are never one
 * hue at different brightnesses — they hold a warm pale band against a
 * cool dark one, and that contrast is most of what makes them look like
 * atmosphere rather than paint.
 */
function bandPalette(color: string, random: () => number): string[] {
  const [r, g, b] = hexToRgb(color);

  const mix = (t: number, target: [number, number, number]) =>
    `rgb(${Math.round(r + (target[0] - r) * t)}, ${Math.round(
      g + (target[1] - g) * t,
    )}, ${Math.round(b + (target[2] - b) * t)})`;

  const dark: [number, number, number] = [10, 12, 24];
  const cream: [number, number, number] = [232, 214, 190];

  return [
    mix(0.72, dark),
    mix(0.58, dark),
    mix(0.44, dark),
    mix(0.3, dark),
    mix(0.22, cream),
    mix(0.42, cream),
    mix(0.62, dark),
    mix(0.35, cream),
    // Repeats bias the mix toward darker bands, which keeps the planet
    // reading as a dark object with bright detail rather than a light one.
    mix(0.66, dark),
    mix(0.5, dark),
    random() > 0.5 ? mix(0.15, cream) : mix(0.8, dark),
  ];
}

export function createPlanetEmissiveTexture(
  color: string,
  seed: number,
): THREE.Texture {
  const width = 256;
  const height = 128;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  /*
   * A faint equatorial glow, not specks.
   *
   * The previous version scattered bright dots across the surface. That
   * suited the first reference — a rocky sphere dusted with sparkles — but
   * a banded gas giant has none, and dots over bands read as dirt on the
   * lens.
   *
   * What this does instead is keep the night side from going fully black.
   * With no emission at all a planet's unlit half disappears against the
   * sky and the sphere reads as a crescent.
   */
  const [r, g, b] = hexToRgb(color);
  void seed;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.5)`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return finishTexture(canvas);
}

function finishTexture(canvas: HTMLCanvasElement): THREE.Texture {
  const texture = new THREE.CanvasTexture(canvas);
  // Without this the texture is treated as linear and comes out washed
  // out and pale against everything else in the scene.
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean;

  return [
    parseInt(full.slice(0, 2), 16) || 120,
    parseInt(full.slice(2, 4), 16) || 100,
    parseInt(full.slice(4, 6), 16) || 200,
  ];
}

/**
 * Planet ring textures, generated in the browser.
 *
 * Drawn to a canvas rather than shipped as an image: a ring is a radial
 * gradient with banding, which is a few lines of canvas work and no
 * network request, and generating it per accent colour means rings match
 * their domain instead of all being the same grey.
 */
export function createRingTexture(color: string, seed: number): THREE.Texture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = 4;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const random = makeRandom(seed);
  const [r, g, b] = hexToRgb(color);

  /*
   * Rings as matter, not light.
   *
   * The two previous versions were additively blended, which makes rings
   * glow and — at high alpha — clip to white. Every reference shows rings
   * as *material*: bands of dust and ice, brighter than the planet but
   * plainly solid, with dark divisions cut through them.
   *
   * So this draws ordinary transparent bands and the mesh uses normal
   * blending. The ring is lit like an object now instead of emitting, and
   * can occlude the planet where it passes in front — something additive
   * blending can never do, because it only ever brightens.
   */
  ctx.clearRect(0, 0, size, 4);

  /*
   * Many narrow bands rather than a smooth gradient.
   *
   * A gradient reads as a painted disc. Discrete bands read as billions of
   * particles at different densities, which is what a ring system is.
   */
  let x = size * 0.06;
  while (x < size) {
    const bandWidth = 2 + random() * 26;
    const brightness = 0.25 + random() * 0.75;

    // Alpha tapers outward so the ring fades rather than stopping at a
    // hard rim.
    const falloff = 1 - Math.pow(x / size, 2.1);
    const alpha = Math.max(brightness * falloff * 0.92, 0);

    // Bands run from the accent toward a pale ice colour. Holding some
    // accent in them is what keeps a ring identifiable as its domain's.
    const tint = 0.5 + random() * 0.5;
    const cr = Math.round(r + (238 - r) * tint);
    const cg = Math.round(g + (228 - g) * tint);
    const cb = Math.round(b + (214 - b) * tint);

    ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
    ctx.fillRect(x, 0, bandWidth, 4);

    x += bandWidth;
  }

  /*
   * Divisions — the Cassini kind.
   *
   * Wide dark gaps are what stop a ring reading as one solid disc. The eye
   * needs the break to understand it as separate orbiting populations.
   */
  ctx.globalCompositeOperation = 'destination-out';

  const divisions = 3 + Math.floor(random() * 3);
  for (let i = 0; i < divisions; i++) {
    const position = 0.15 + random() * 0.68;
    const width = 6 + random() * 22;
    ctx.fillStyle = 'rgba(0,0,0,0.95)';
    ctx.fillRect(position * size, 0, width, 4);
  }

  // Inner gap: flush against the surface a ring reads as a collar.
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(0, 0, size * 0.06, 4);

  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Remaps a RingGeometry's UVs so a texture runs from inner to outer edge.
 *
 * `THREE.RingGeometry` sets UVs for a flat quad, which makes a linear
 * gradient run across the ring's bounding box instead of outward from its
 * centre — the banding ends up sliced across the disc rather than
 * following it. This rewrites `u` as normalised radial distance.
 */
export function radialiseRingUVs(
  geometry: THREE.RingGeometry,
  innerRadius: number,
  outerRadius: number,
): void {
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const vector = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vector.fromBufferAttribute(position, i);
    const distance = vector.length();
    const u = (distance - innerRadius) / (outerRadius - innerRadius);
    uv.setXY(i, u, 0.5);
  }

  uv.needsUpdate = true;
}
