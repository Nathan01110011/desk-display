// Normalized animation geometry, independent of the screen and Canvas API.
const TAU = Math.PI * 2;
const patterns = [[3, 2], [4, 3], [5, 4], [2, 3], [3, 4]] as const;

export function scopePoint(fraction: number, time: number, portrait: boolean) {
  // Interpolate between complete integer-harmonic curves, rather than
  // interpolating the frequencies. Every intermediate trace is periodic.
  const cycle = Math.max(0, time) / 24;
  const index = Math.floor(cycle) % patterns.length;
  const current = patterns[index];
  const next = patterns[(index + 1) % patterns.length];
  const u = cycle % 1;
  const blend = u * u * (3 - 2 * u);
  const angle = fraction * TAU;
  const phase = time * 0.24;
  const axis = (i: 0 | 1, offset: number) =>
    Math.sin(current[i] * angle + offset) * (1 - blend) +
    Math.sin(next[i] * angle + offset) * blend;
  return {
    x: axis(portrait ? 1 : 0, phase),
    y: axis(portrait ? 0 : 1, -phase * 0.37),
  };
}

export function portraitAuroraX(layer: number, fraction: number, time: number) {
  // Four evenly spaced curtains sweep around a shared, zero-mean center.
  // Opposite wave phases cancel the overall bias, while each ribbon moves.
  const lane = 0.5 + (layer - 1.5) * 0.22;
  const globalDrift = 0.08 * Math.sin(time * 0.16);
  const lean = (fraction - 0.5) * 0.16 * Math.cos(time * 0.12);
  return lane + globalDrift + lean +
    0.12 * Math.sin(fraction * 6.5 + time * 0.22 + layer * Math.PI / 2) +
    0.035 * Math.sin(fraction * 13 - time * 0.17 + layer * Math.PI);
}
