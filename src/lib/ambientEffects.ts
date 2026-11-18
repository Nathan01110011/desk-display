// Procedural, full-bleed ambient artwork for the Raspberry Pi kiosk.
// Canvas 2D only: no downloaded media, WebGL dependency, or network requests.
import type { AmbientScreensaverType, AmbientPalette } from '@/types';
import { AMBIENT_PRESETS } from './ambientPresets';
import { portraitAuroraX, scopePoint } from './ambientGeometry';

export type AmbientScene = {
  kind: AmbientScreensaverType;
  palette: AmbientPalette;
  width: number;
  height: number;
  time: number;
  frame: number;
};

const TAU = Math.PI * 2;
const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const mix = (a: number, b: number, n: number) => a + (b - a) * n;
const rgba = (hex: string, opacity: number) => {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + clamp(opacity) + ')';
};


function gradientBackground(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, tint: string) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const gradient = ctx.createRadialGradient(w * 0.52, h * 0.63, 0, w * 0.52, h * 0.63, Math.max(w, h) * 0.9);
  gradient.addColorStop(0, rgba(tint, 0.72));
  gradient.addColorStop(1, rgba(tint, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha = 0.2) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 27.3) * 43758.5453123;
  return x - Math.floor(x);
};

type LavaCache = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  image: ImageData;
  width: number;
  height: number;
};
let lavaCache: LavaCache | null = null;

function prepareLava(w: number, h: number): LavaCache | null {
  // Sample at low resolution and let canvas linear filtering soften the edges.
  // This is much cheaper than a full-resolution per-pixel metaball shader on a Pi.
  const scale = Math.min(1 / 6, 220 / Math.max(w, h));
  const width = Math.max(2, Math.round(w * scale));
  const height = Math.max(2, Math.round(h * scale));
  if (lavaCache?.width === width && lavaCache.height === height) return lavaCache;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return null;
  lavaCache = { canvas, context, image: context.createImageData(width, height), width, height };
  return lavaCache;
}

function lava(ctx: CanvasRenderingContext2D, s: AmbientScene) {
  const { width: w, height: h, time: t } = s;
  const p = AMBIENT_PRESETS[s.kind][s.palette].colors;
  gradientBackground(ctx, w, h, p.base, p.ink);
  glow(ctx, w * 0.5, h * 1.02, w * 0.72, p.warm, 0.21);
  glow(ctx, w * 0.48, h * 0.31, w * 0.56, p.cool, 0.09);

  const cache = prepareLava(w, h);
  if (!cache) return;
  const tall = h > w;
  const unit = Math.min(w, h);
  const blobs = Array.from({ length: tall ? 8 : 11 }, (_, i) => {
    const phase = i * 2.399;
    const drift = t * (0.12 + hash(i + 8) * 0.13);
    return {
      // A tall lamp has a vertical convection column; a wide lamp spreads
      // across several lanes. Sizes are measured in physical logical pixels.
      x: tall
        ? 0.5 + Math.sin(drift * 1.2 + phase) * (0.23 + hash(i + 14) * 0.11)
        : 0.5 + Math.sin(drift * 0.8 + phase) * (0.30 + hash(i + 14) * 0.11),
      y: 0.5 + Math.sin(drift + phase * 1.5) * (tall ? 0.48 : 0.39),
      r: (tall ? 0.09 : 0.078) + hash(i + 20) * 0.072,
    };
  });
  // The bottom pool remains full-bleed, not a silhouette of a lamp.
  for (let i = 0; i < (tall ? 2 : 4); i++) {
    const x = tall ? 0.34 + i * 0.32 : 0.13 + i * 0.245;
    blobs.push({ x: x + Math.sin(t * 0.1 + i) * 0.035, y: 1.04, r: tall ? 0.27 : 0.23 });
  }
  const data = cache.image.data;
  const cw = cache.width;
  const ch = cache.height;
  const col1 = p.warm.slice(1);
  const col2 = p.bright.slice(1);
  const c1 = [parseInt(col1.slice(0, 2), 16), parseInt(col1.slice(2, 4), 16), parseInt(col1.slice(4, 6), 16)];
  const c2 = [parseInt(col2.slice(0, 2), 16), parseInt(col2.slice(2, 4), 16), parseInt(col2.slice(4, 6), 16)];
  let index = 0;
  for (let y = 0; y < ch; y++) {
    const yn = y / ch;
    for (let x = 0; x < cw; x++) {
      const xn = x / cw;
      let field = 0;
      for (const blob of blobs) {
        const dx = (xn - blob.x) * w / unit;
        const dy = (yn - blob.y) * h / unit * (tall ? 0.85 : 1);
        field += (blob.r * blob.r) / (dx * dx + dy * dy + 0.00012);
      }
      const opacity = clamp((field - 0.75) * 6.0);
      const heat = clamp((field - 1.1) * 0.11 + 0.25 + (1 - yn) * 0.23);
      const shine = clamp((clamp((field - 1.8) * 0.12) ** 1.1) * 0.28);
      data[index++] = mix(c1[0], c2[0], heat);
      data[index++] = mix(c1[1], c2[1], heat + shine);
      data[index++] = mix(c1[2], c2[2], heat);
      data[index++] = Math.round(opacity * 255);
    }
  }
  cache.context.putImageData(cache.image, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'screen';
  ctx.shadowColor = p.warm;
  ctx.shadowBlur = 32;
  ctx.drawImage(cache.canvas, 0, 0, w, h);
  ctx.restore();

  // Fine floating motes make the full display feel illuminated, not boxed in.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 22; i++) {
    const x = (hash(i + 70) + t * (0.0003 + hash(i + 3) * 0.0004)) % 1;
    const y = (hash(i + 90) - t * (0.0011 + hash(i + 40) * 0.0011) + 20) % 1;
    ctx.fillStyle = rgba(p.bright, 0.17 + 0.27 * hash(i + 50));
    ctx.beginPath();
    ctx.arc(x * w, y * h, 0.7 + hash(i) * 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function aurora(ctx: CanvasRenderingContext2D, s: AmbientScene) {
  const { width: w, height: h, time: t } = s;
  const p = AMBIENT_PRESETS[s.kind][s.palette].colors;
  gradientBackground(ctx, w, h, p.base, p.ink);
  glow(ctx, w * 0.45, h * 0.64, Math.max(w, h) * 0.85, p.cool, 0.12);

  for (let i = 0; i < 115; i++) {
    const x = hash(i + 80) * w;
    const y = hash(i + 153) * h * 0.95;
    const twinkle = 0.65 + Math.sin(t * (0.3 + hash(i + 60)) + i) * 0.35;
    ctx.fillStyle = rgba('#d8eeff', (0.18 + hash(i + 3) * 0.55) * twinkle);
    ctx.beginPath();
    ctx.arc(x, y, 0.3 + hash(i + 19) * 1.2, 0, TAU);
    ctx.fill();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const hues = [p.warm, p.cool, p.bright, p.warm];
  const tall = h > w;
  // In portrait the curtains arc diagonally through the tall sky, rather
  // than becoming a stack of oversized horizontal bands.
  if (tall) {
    for (let layer = 0; layer < 4; layer++) {
      // Layer a soft halo and a narrow luminous fold along the same curtain.
      // The width and opacity taper gradually instead of forming hard stripes.
      for (let strand = 0; strand < 10; strand++) {
        const f = strand / 9;
        const alpha = 0.055 + f * 0.035;
        const gradient = ctx.createLinearGradient(0, h * 0.015, 0, h * 0.97);
        gradient.addColorStop(0, rgba(hues[layer], 0));
        gradient.addColorStop(0.16, rgba(hues[layer], alpha * 0.55));
        gradient.addColorStop(0.48, rgba(hues[layer], alpha));
        gradient.addColorStop(0.76, rgba(hues[layer], alpha * 0.7));
        gradient.addColorStop(1, rgba(hues[layer], 0));
        ctx.beginPath();
        for (let n = 0; n <= 72; n++) {
          const progress = n / 72;
          const y = h * (-0.08 + progress * 1.16);
          const x = w * (portraitAuroraX(layer, progress, t) +
            (f - 0.5) * 0.055 * Math.cos(progress * 5 + t * 0.2 + layer));
          if (n === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = gradient;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = w * (0.26 - f * 0.225);
        ctx.stroke();
      }
    }
  } else for (let layer = 0; layer < 4; layer++) {
    for (let strand = 0; strand < 9; strand++) {
      const height = h * (0.12 + layer * 0.08 + strand * 0.036);
      const sweep = Math.sin(t * 0.16 + layer * 1.9 + strand * 0.16) * h * 0.09;
      const sway = (x: number) =>
        Math.sin(x / w * 4.9 + t * 0.23 + layer * 1.4) * h * 0.13 +
        Math.sin(x / w * 8.7 - t * 0.16 + strand * 0.5) * h * 0.035;
      const gradient = ctx.createLinearGradient(0, height - h * 0.4, 0, height + h * 0.55);
      const alpha = 0.1 - strand * 0.006;
      gradient.addColorStop(0, rgba(hues[layer], 0));
      gradient.addColorStop(0.43, rgba(hues[layer], alpha));
      gradient.addColorStop(0.7, rgba(hues[layer], alpha * 0.4));
      gradient.addColorStop(1, rgba(hues[layer], 0));
      ctx.beginPath();
      ctx.moveTo(-w * 0.1, height + sway(0) + sweep);
      for (let n = 0; n <= 48; n++) {
        const x = n / 48 * w * 1.2 - w * 0.1;
        ctx.lineTo(x, height + sway(x) + sweep + Math.sin(x / w * 22 + t * 0.3) * h * 0.009);
      }
      ctx.strokeStyle = gradient;
      ctx.lineWidth = h * (0.19 + strand * 0.02);
      ctx.stroke();
    }
  }
  ctx.restore();
  const horizon = ctx.createLinearGradient(0, h * 0.68, 0, h);
  horizon.addColorStop(0, rgba('#01070c', 0));
  horizon.addColorStop(1, rgba('#01070c', 0.82));
  ctx.fillStyle = horizon;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);
}

function koiFish(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, phase: number, variety: AmbientPalette, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.scale(size, size);
  const coat = variety === 'ember'
    ? { edge: '#a9a99c', light: '#fff1db', mid: '#f7d9bd', dark: '#997c74', fin: '#ead3b6', tail: '#e7c4a1', patch: '#bd342a' }
    : variety === 'ultraviolet'
      ? { edge: '#181b29', light: '#e3e1dd', mid: '#a5a7ba', dark: '#242735', fin: '#687084', tail: '#353d50', patch: '#dc5434' }
      : { edge: '#986019', light: '#fff2a8', mid: '#f0c14b', dark: '#a46a20', fin: '#f7d981', tail: '#e9ae39', patch: '#d99a26' };
  // Soft pool shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.21)';
  ctx.beginPath();
  ctx.ellipse(0.1, 0.16, 0.44, 0.92, 0, 0, TAU);
  ctx.fill();
  const wag = Math.sin(t * 3.1 + phase) * 0.24;
  ctx.save();
  ctx.translate(0, 0.7);
  ctx.rotate(wag);
  ctx.fillStyle = coat.tail;
  ctx.beginPath();
  ctx.moveTo(0, -0.1);
  ctx.quadraticCurveTo(-0.5, 0.55, -0.35, 0.78);
  ctx.quadraticCurveTo(0, 0.6, 0.35, 0.78);
  ctx.quadraticCurveTo(0.5, 0.55, 0, -0.1);
  ctx.fill();
  ctx.restore();
  // Pectoral fins.
  ctx.fillStyle = coat.fin;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 0.2, -0.13);
    ctx.quadraticCurveTo(side * 0.87, -0.08 + wag, side * 0.6, 0.5);
    ctx.quadraticCurveTo(side * 0.3, 0.21, side * 0.2, -0.13);
    ctx.fill();
  }
  const body = ctx.createLinearGradient(-0.38, 0, 0.42, 0);
  body.addColorStop(0, coat.edge);
  body.addColorStop(0.38, coat.light);
  body.addColorStop(0.75, coat.mid);
  body.addColorStop(1, coat.dark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -0.88);
  ctx.bezierCurveTo(0.55, -0.8, 0.49, 0.26, 0.18, 0.71);
  ctx.quadraticCurveTo(0, 0.78, -0.18, 0.71);
  ctx.bezierCurveTo(-0.49, 0.26, -0.55, -0.8, 0, -0.88);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = variety === 'ultraviolet' && i % 2 === 1 ? '#171923' : coat.patch;
    const yy = -0.46 + i * 0.43;
    const xx = Math.sin(phase * 2 + i * 2.1) * 0.13;
    ctx.beginPath();
    // Ogon have an uninterrupted metallic coat, not contrasting patches.
    if (variety === 'tidal') continue;
    ctx.ellipse(xx, yy, 0.17 + (i % 2) * 0.09, 0.18, 0.3 + i * 0.23, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#171f20';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * 0.21, -0.62, 0.045, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function koiPond(ctx: CanvasRenderingContext2D, s: AmbientScene) {
  const { width: w, height: h, time: t } = s;
  const p = AMBIENT_PRESETS.koi[s.palette].colors;
  gradientBackground(ctx, w, h, p.base, p.ink);
  glow(ctx, w * 0.16, h * 0.12, w * 0.85, p.warm, 0.2);
  glow(ctx, w * 0.82, h * 0.85, w * 0.78, p.cool, 0.15);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 34; i++) {
    const x = hash(i + 22) * w;
    const y = hash(i + 59) * h;
    const size = 20 + hash(i + 201) * 130;
    ctx.strokeStyle = rgba(p.bright, 0.018 + Math.sin(t * 0.3 + i) * 0.01);
    ctx.lineWidth = 1 + hash(i) * 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.43, hash(i + 12) * TAU, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  const tall = h > w;
  const fishCount = tall ? 5 : 6;
  for (let i = 0; i < fishCount; i++) {
    const phase = i * TAU / fishCount;
    // Tall ponds use long, staggered figure-eight swimming lanes. Wide
    // ponds keep the original looping paths. Tangent sets the fish heading.
    const position = (time: number) => {
      const a = time * (0.13 + i * 0.008) + phase;
      const b = time * (0.105 + i * 0.012) + phase;
      return tall
        ? { x: w * (0.5 + 0.28 * Math.sin(2 * a) + 0.07 * Math.sin(b)), y: h * (0.5 + 0.38 * Math.cos(b)) }
        : { x: w * (0.5 + 0.33 * Math.sin(a) + 0.09 * Math.sin(time * 0.22 + i * 1.8)),
            y: h * (0.5 + 0.33 * Math.cos(b) + 0.04 * Math.sin(time * 0.18 + i)) };
    };
    const { x, y } = position(t);
    const next = position(t + 0.01);
    const vx = next.x - x;
    const vy = next.y - y;
    // Wake rings stay subtle, so the koi remain the focal point.
    for (let ring = 0; ring < 2; ring++) {
      const radius = ((t * 16 + ring * 28 + i * 11) % 80) + 8;
      ctx.strokeStyle = rgba(p.bright, 0.095 * (1 - radius / 95));
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 0.47, 0, 0, TAU);
      ctx.stroke();
    }
    const size = Math.min(w, h) * ((tall ? 0.075 : 0.054) + hash(i + 40) * 0.02);
    koiFish(ctx, x, y, Math.atan2(vy, vx), size, phase, s.palette, t);
  }
  // Drifted highlight trails along the surface.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 21; i++) {
    const x = ((hash(i + 101) + t * 0.0013) % 1) * w;
    const y = hash(i + 142) * h;
    glow(ctx, x, y, Math.min(w, h) * 0.09, p.bright, 0.025);
  }
  ctx.restore();
}

function oscilloscope(ctx: CanvasRenderingContext2D, s: AmbientScene) {
  const { width: w, height: h, time: t } = s;
  const p = AMBIENT_PRESETS[s.kind][s.palette].colors;
  gradientBackground(ctx, w, h, p.base, p.ink);
  const spacing = Math.max(32, Math.round(Math.min(w, h) / 12));
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(p.warm, 0.09);
  ctx.beginPath();
  for (let x = w % spacing; x < w; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = h % spacing; y < h; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  ctx.strokeStyle = rgba(p.warm, 0.16);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, h);
  ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.5);
  ctx.stroke();

  const shape = new Path2D();
  const tall = h > w;
  const radiusX = w * (tall ? 0.37 : 0.40);
  const radiusY = h * (tall ? 0.32 : 0.36);
  const unit = Math.min(w, h);
  for (let i = 0; i <= 750; i++) {
    const point = scopePoint(i / 750, t, tall);
    const x = w / 2 + point.x * radiusX;
    const y = h / 2 + point.y * radiusY;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = rgba(p.cool, 0.15);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(6, unit * 0.013);
  ctx.shadowBlur = unit * 0.025;
  ctx.shadowColor = p.cool;
  ctx.stroke(shape);
  ctx.shadowBlur = 14;
  ctx.strokeStyle = rgba(p.warm, 0.68);
  ctx.lineWidth = Math.max(1.8, unit * 0.004);
  ctx.stroke(shape);
  ctx.shadowBlur = 5;
  ctx.strokeStyle = rgba(p.bright, 0.94);
  ctx.lineWidth = Math.max(0.9, unit * 0.0016);
  ctx.stroke(shape);
  // A travelling bright spot evokes a CRT beam tracing the closed pattern.
  const beam = scopePoint((t * 0.3) % 1, t, tall);
  const bx = w / 2 + beam.x * radiusX;
  const by = h / 2 + beam.y * radiusY;
  glow(ctx, bx, by, unit * 0.022, p.bright, 0.46);
  ctx.restore();

  ctx.fillStyle = rgba(p.warm, 0.035);
  for (let y = 1; y < h; y += 5) ctx.fillRect(0, y, w, 1);
  // Tiny telemetry labels evoke an instrument without enclosing it in a bezel.
  ctx.font = '600 ' + Math.round(Math.max(10, Math.min(14, h * 0.019))) + 'px monospace';
  ctx.fillStyle = rgba(p.bright, 0.35);
  ctx.fillText('CH 01  /  WAVEFORM LAB', 22, 32);
  ctx.textAlign = 'right';
  ctx.fillText('XY MODE  /  SYNTHETIC SIGNAL', w - 22, h - 23);
  ctx.textAlign = 'left';
}

function deepSpace(ctx: CanvasRenderingContext2D, s: AmbientScene) {
  const { width: w, height: h, time: t } = s;
  const p = AMBIENT_PRESETS[s.kind][s.palette].colors;
  gradientBackground(ctx, w, h, p.base, p.ink);
  glow(ctx, w * 0.2 + Math.sin(t * 0.03) * w * 0.07, h * 0.27, w * 0.7, p.cool, 0.14);
  glow(ctx, w * 0.82, h * 0.79, w * 0.63, p.warm, 0.12);
  glow(ctx, w * 0.53, h * 0.46, w * 0.43, p.cool, 0.11);

  for (let i = 0; i < 350; i++) {
    const depth = 0.25 + hash(i + 88) * 0.75;
    const x = ((hash(i + 18) + t * 0.0006 * depth) % 1) * w;
    const y = ((hash(i + 29) + t * 0.0003 * depth) % 1) * h;
    const shimmer = 0.7 + Math.sin(t * 0.5 + i) * 0.3;
    ctx.fillStyle = rgba(i % 8 === 0 ? p.bright : '#c9d9ff', (0.17 + depth * 0.66) * shimmer);
    ctx.beginPath();
    ctx.arc(x, y, 0.35 + depth * (i % 7 === 0 ? 1.9 : 1.0), 0, TAU);
    ctx.fill();
  }
  const tall = h > w;
  // A central planet and tall nebula column in portrait; the landscape
  // retains the off-centre wide-space composition.
  const px = w * ((tall ? 0.50 : 0.77) + Math.sin(t * 0.045) * (tall ? 0.035 : 0.06));
  const py = h * (0.55 + Math.cos(t * 0.037) * 0.05);
  const rad = Math.min(w * (tall ? 0.26 : 0.22), h * 0.31);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(tall ? -0.68 : -0.3);
  // Rear half of the ring sits behind the planet.
  ctx.strokeStyle = rgba(p.bright, 0.32);
  ctx.lineWidth = rad * 0.15;
  ctx.beginPath();
  ctx.ellipse(0, 0, rad * 1.68, rad * 0.39, 0, Math.PI, TAU);
  ctx.stroke();
  const sphere = ctx.createRadialGradient(-rad * 0.42, -rad * 0.42, rad * 0.08, rad * 0.14, rad * 0.25, rad * 1.35);
  sphere.addColorStop(0, p.bright);
  sphere.addColorStop(0.19, p.warm);
  sphere.addColorStop(0.65, p.ink);
  sphere.addColorStop(1, '#02040a');
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(p.bright, 0.66);
  ctx.lineWidth = rad * 0.08;
  ctx.beginPath();
  ctx.ellipse(0, 0, rad * 1.68, rad * 0.39, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
  const shooting = (t * 0.07) % 1;
  if (shooting < 0.25) {
    const x = (0.16 + shooting * 2.6) * w;
    const y = (0.1 + shooting * 1.6) * h;
    const star = ctx.createLinearGradient(x - 110, y - 55, x, y);
    star.addColorStop(0, rgba(p.bright, 0));
    star.addColorStop(1, rgba(p.bright, (0.25 - shooting) * 3.5));
    ctx.strokeStyle = star;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 110, y - 55); ctx.lineTo(x, y);
    ctx.stroke();
  }
}

export function paintAmbient(ctx: CanvasRenderingContext2D, scene: AmbientScene) {
  const { width, height } = scene;
  if (width <= 0 || height <= 0) return;
  ctx.clearRect(0, 0, width, height);
  switch (scene.kind) {
    case 'lava': lava(ctx, scene); break;
    case 'aurora': aurora(ctx, scene); break;
    case 'koi': koiPond(ctx, scene); break;
    case 'oscilloscope': oscilloscope(ctx, scene); break;
    case 'space': deepSpace(ctx, scene); break;
  }
}
