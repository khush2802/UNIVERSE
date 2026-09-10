import * as THREE from 'three';
import type { PlanetType } from '@/lib/domains';

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
/**
 * A smooth radial glow, for the star's halo.
 *
 * Nested back-side spheres were the wrong tool. Each shell has a hard
 * edge where its geometry ends, so stacking them produces visible steps —
 * concentric rings of brightness rather than a continuous falloff. A
 * single camera-facing sprite with a gradient has no edges at all.
 *
 * The falloff is deliberately not linear. Real glow drops off fast near
 * the source and then trails a long way out; a linear ramp reads as a
 * flat disc with a soft edge.
 */
export function createGlowSprite(inner: string, outer: string): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);

  const [ir, ig, ib] = hexToRgb(inner);
  const [or_, og, ob] = hexToRgb(outer);

  gradient.addColorStop(0, `rgba(${ir}, ${ig}, ${ib}, 0.95)`);
  gradient.addColorStop(0.12, `rgba(${ir}, ${ig}, ${ib}, 0.55)`);
  gradient.addColorStop(0.26, `rgba(${or_}, ${og}, ${ob}, 0.26)`);
  gradient.addColorStop(0.48, `rgba(${or_}, ${og}, ${ob}, 0.09)`);
  gradient.addColorStop(0.72, `rgba(${or_}, ${og}, ${ob}, 0.025)`);
  gradient.addColorStop(1, `rgba(${or_}, ${og}, ${ob}, 0)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * A second, sparser turbulence layer for the star's surface.
 *
 * Rendered on its own sphere rotating at a different rate from the base
 * texture. Where the two overlap they brighten; where they don't, they
 * don't — and because they drift apart continuously, the bright regions
 * move and change shape.
 *
 * That is what makes a star look like it is burning. One static texture,
 * however detailed, rotates rigidly and reads as a painted ball.
 */
export function createStarTurbulence(): THREE.Texture {
  const width = 512;
  const height = 256;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  let state = 0x7f4a7c15;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };

  // Bright cells, sparse enough that the layer is mostly transparent.
  for (let i = 0; i < 120; i++) {
    const x = random() * width;
    const y = random() * height;
    const r = 10 + random() * 52;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, `rgba(255, 214, 140, ${0.16 + random() * 0.3})`);
    gradient.addColorStop(0.5, `rgba(255, 140, 50, ${0.06 + random() * 0.12})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

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
/* ================================================================== *
 * Planet surfaces, by type (spec §4)
 * ================================================================== */

const TEX_W = 512;
const TEX_H = 256;

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  return [canvas, canvas.getContext('2d')];
}

/**
 * Value noise on a canvas.
 *
 * Several surface types need coherent blotches rather than per-pixel
 * static — continents, cratered terrain, ice fracturing. Drawing
 * overlapping soft radial blobs at descending sizes approximates
 * fractal noise closely enough at this resolution and costs a fraction of
 * a real noise implementation.
 */
function blobNoise(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  octaves: Array<{ count: number; min: number; max: number; alpha: number }>,
  colour: (t: number) => string,
) {
  for (const octave of octaves) {
    for (let i = 0; i < octave.count; i++) {
      const x = random() * TEX_W;
      const y = random() * TEX_H;
      const r = octave.min + random() * (octave.max - octave.min);

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, colour(octave.alpha));
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);

      // Wrap horizontally. Without this every blob near an edge is cut in
      // half at the seam and the planet has a visible vertical scar.
      if (x < r) {
        const g2 = ctx.createRadialGradient(x + TEX_W, y, 0, x + TEX_W, y, r);
        g2.addColorStop(0, colour(octave.alpha));
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(x + TEX_W - r, y - r, r * 2, r * 2);
      } else if (x > TEX_W - r) {
        const g2 = ctx.createRadialGradient(x - TEX_W, y, 0, x - TEX_W, y, r);
        g2.addColorStop(0, colour(octave.alpha));
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(x - TEX_W - r, y - r, r * 2, r * 2);
      }
    }
  }
}

/** Poles darken, or bands run flat off the top and the sphere loses its limb. */
function darkenPoles(ctx: CanvasRenderingContext2D, strength = 0.6) {
  const poles = ctx.createLinearGradient(0, 0, 0, TEX_H);
  poles.addColorStop(0, `rgba(4, 4, 12, ${strength})`);
  poles.addColorStop(0.22, 'rgba(4, 4, 12, 0)');
  poles.addColorStop(0.78, 'rgba(4, 4, 12, 0)');
  poles.addColorStop(1, `rgba(4, 4, 12, ${strength})`);
  ctx.fillStyle = poles;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
}

/**
 * Gas giant: latitude bands with undulating edges and storms.
 *
 * Band widths vary by an order of magnitude and tighten toward the poles.
 * Evenly spaced stripes look like a flag; real banding has a few broad
 * zones with narrow ones crowded between them.
 */
function drawGasGiant(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  palette: string[],
) {
  const bands: Array<{ top: number; bottom: number; color: string }> = [];
  let y = 0;

  while (y < TEX_H) {
    const latitude = Math.abs(y / TEX_H - 0.5) * 2;
    const maxHeight = 26 * (1 - latitude * 0.62) + 4;
    const bandHeight = 3 + random() * maxHeight;
    bands.push({
      top: y,
      bottom: Math.min(y + bandHeight, TEX_H),
      color: palette[Math.floor(random() * palette.length)],
    });
    y += bandHeight;
  }

  // Column by column, with two sine offsets at different frequencies so
  // edges undulate and never quite repeat across the seam.
  for (let x = 0; x < TEX_W; x++) {
    const u = x / TEX_W;
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

  // Storms, always stretched horizontally — anything circular on a banded
  // planet reads as a hole rather than weather.
  const storms = 1 + Math.floor(random() * 3);
  for (let i = 0; i < storms; i++) {
    const sx = random() * TEX_W;
    const sy = TEX_H * (0.25 + random() * 0.5);
    const rx = 14 + random() * 34;
    const ry = rx * (0.28 + random() * 0.2);

    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, rx);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, ry / rx);
    ctx.translate(-sx, -sy);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = gradient;
    ctx.fillRect(sx - rx, sy - rx, rx * 2, rx * 2);
    ctx.restore();
  }
}

/**
 * Ice giant: far smoother than a gas giant.
 *
 * Uranus and Neptune show almost no visible banding — a couple of broad
 * zones and a faint storm. Giving an ice giant Jupiter's stripes is the
 * commonest way these end up looking identical to each other.
 */
function drawIceGiant(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  palette: string[],
) {
  const vertical = ctx.createLinearGradient(0, 0, 0, TEX_H);
  vertical.addColorStop(0, palette[3]);
  vertical.addColorStop(0.32, palette[1]);
  vertical.addColorStop(0.5, palette[0]);
  vertical.addColorStop(0.68, palette[1]);
  vertical.addColorStop(1, palette[3]);
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Three or four very broad, very soft zones.
  for (let i = 0; i < 4; i++) {
    const y = random() * TEX_H;
    const h = 20 + random() * 48;
    const gradient = ctx.createLinearGradient(0, y - h, 0, y + h);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, palette[random() > 0.5 ? 2 : 4]);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - h, TEX_W, h * 2);
    ctx.globalAlpha = 1;
  }

  blobNoise(
    ctx,
    random,
    [{ count: 26, min: 16, max: 70, alpha: 0.1 }],
    (a) => `rgba(226, 244, 255, ${a})`,
  );
}

/**
 * Terrestrial: ocean, continents, ice caps.
 *
 * Continents come from overlapping blobs at three scales — large masses,
 * medium peninsulas, small islands. Real coastlines are fractal, and
 * layering scales is the cheapest way to get an edge that doesn't look
 * drawn with a compass.
 *
 * This will not look like Earth. Recognisable Earth needs a real
 * elevation map; this produces a plausible habitable planet, which is what
 * the composition actually needs.
 */
function drawTerrestrial(ctx: CanvasRenderingContext2D, random: () => number) {
  const ocean = ctx.createLinearGradient(0, 0, 0, TEX_H);
  ocean.addColorStop(0, '#1d3f6e');
  ocean.addColorStop(0.5, '#123a63');
  ocean.addColorStop(1, '#1d3f6e');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  blobNoise(
    ctx,
    random,
    [
      { count: 9, min: 40, max: 92, alpha: 0.92 },
      { count: 22, min: 16, max: 44, alpha: 0.8 },
      { count: 40, min: 5, max: 16, alpha: 0.62 },
    ],
    (a) => `rgba(58, 104, 62, ${a})`,
  );

  // Arid interiors, biased toward the tropics.
  for (let i = 0; i < 16; i++) {
    const x = random() * TEX_W;
    const y = TEX_H * (0.3 + random() * 0.4);
    const r = 8 + random() * 30;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, `rgba(150, 126, 76, ${0.32 + random() * 0.3})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Ice caps.
  const caps = ctx.createLinearGradient(0, 0, 0, TEX_H);
  caps.addColorStop(0, 'rgba(238, 248, 255, 0.92)');
  caps.addColorStop(0.11, 'rgba(238, 248, 255, 0)');
  caps.addColorStop(0.89, 'rgba(238, 248, 255, 0)');
  caps.addColorStop(1, 'rgba(238, 248, 255, 0.92)');
  ctx.fillStyle = caps;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
}

/** Rocky: cratered, airless, low contrast. */
function drawRocky(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  palette: string[],
) {
  ctx.fillStyle = palette[2];
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  blobNoise(
    ctx,
    random,
    [
      { count: 18, min: 30, max: 80, alpha: 0.3 },
      { count: 40, min: 10, max: 34, alpha: 0.24 },
    ],
    (a) => `rgba(0, 0, 0, ${a})`,
  );

  blobNoise(
    ctx,
    random,
    [{ count: 30, min: 8, max: 36, alpha: 0.22 }],
    (a) => `rgba(255, 236, 214, ${a})`,
  );

  /*
   * Craters: a bright rim with a dark floor.
   *
   * The rim is what makes a crater read as a depression rather than a
   * stain. Drawn as a stroked circle slightly larger than the filled
   * floor, offset so the lighting reads consistently across the surface.
   */
  const craters = 40 + Math.floor(random() * 30);
  for (let i = 0; i < craters; i++) {
    const x = random() * TEX_W;
    const y = random() * TEX_H;
    const r = 2 + random() * 11;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.2 + random() * 0.25})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x - r * 0.12, y - r * 0.12, r * 1.05, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 240, 220, ${0.12 + random() * 0.2})`;
    ctx.lineWidth = Math.max(r * 0.22, 0.6);
    ctx.stroke();
  }
}

/**
 * A planet's surface texture, dispatched on its type.
 *
 * 512×256 equirectangular. A domain planet occupies roughly 40 screen
 * pixels at default zoom and a few hundred when focused; 1024×512 came to
 * 24 MB across six planets with two maps each, which is detail below the
 * size of a pixel (§13).
 */
export function createPlanetTexture(
  color: string,
  seed: number,
  type: PlanetType = 'gas-giant',
): THREE.Texture {
  const [canvas, ctx] = makeCanvas();
  if (!ctx) return new THREE.Texture();

  const random = makeRandom(seed);
  const palette = bandPalette(color, random);

  switch (type) {
    case 'gas-giant':
      drawGasGiant(ctx, random, palette);
      break;
    case 'ice-giant':
      drawIceGiant(ctx, random, palette);
      break;
    case 'terrestrial':
      drawTerrestrial(ctx, random);
      break;
    case 'rocky':
      drawRocky(ctx, random, palette);
      break;
  }

  darkenPoles(ctx, type === 'terrestrial' ? 0.35 : 0.6);
  return finishTexture(canvas);
}

/**
 * Cloud layer for terrestrial planets.
 *
 * Rendered on its own slightly larger sphere rotating at a different rate
 * from the surface. That relative drift is most of what makes a planet
 * look alive rather than like a painted ball — clouds baked into the
 * surface texture rotate in lockstep and read as markings.
 *
 * Returns null for types that shouldn't have one.
 */
export function createCloudTexture(
  seed: number,
  type: PlanetType,
): THREE.Texture | null {
  if (type !== 'terrestrial') return null;

  const [canvas, ctx] = makeCanvas();
  if (!ctx) return null;

  const random = makeRandom(seed ^ 0x5f356495);

  ctx.clearRect(0, 0, TEX_W, TEX_H);

  // Banded toward the equator and mid-latitudes, as real weather is.
  blobNoise(
    ctx,
    random,
    [
      { count: 30, min: 22, max: 60, alpha: 0.5 },
      { count: 60, min: 8, max: 26, alpha: 0.42 },
    ],
    (a) => `rgba(255, 255, 255, ${a})`,
  );

  return finishTexture(canvas);
}

/**
 * The colours a planet's bands are drawn from.
 *
 * Built around the domain accent so a planet still identifies its domain,
 * widened with a cream and a near-black. The references are never one hue
 * at different brightnesses — they hold a warm pale band against a cool
 * dark one, and that contrast is most of what makes them look like
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
    // Repeats bias toward darker bands, which keeps a planet reading as a
    // dark object with bright detail rather than a light one.
    mix(0.66, dark),
    mix(0.5, dark),
    random() > 0.5 ? mix(0.15, cream) : mix(0.8, dark),
  ];
}

/**
 * Faint emission, so the night side doesn't vanish.
 *
 * Not specks — a banded giant has none, and dots over bands read as dirt
 * on the lens. This is a soft equatorial glow whose only job is keeping a
 * planet's unlit half visible against the sky. Without any emission the
 * sphere reads as a crescent.
 *
 * Rocky planets get none: an airless body genuinely is black on its night
 * side, and giving it a glow would make it look like a gas giant.
 */
export function createPlanetEmissiveTexture(
  color: string,
  seed: number,
  type: PlanetType = 'gas-giant',
): THREE.Texture | null {
  if (type === 'rocky') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  void seed;
  const [r, g, b] = hexToRgb(color);

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 256, 128);

  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${type === 'terrestrial' ? 0.28 : 0.5})`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 128);

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
