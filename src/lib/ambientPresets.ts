import type { AmbientPalette, AmbientScreensaverType } from '@/types';

export type AmbientColors = { base: string; warm: string; bright: string; cool: string; ink: string };
type Preset = { name: string; detail: string; colors: AmbientColors };
type Presets = Record<AmbientPalette, Preset>;

export const AMBIENT_PALETTE_IDS: AmbientPalette[] = ['ember', 'ultraviolet', 'tidal'];
export const AMBIENT_PRESETS: Record<AmbientScreensaverType, Presets> = {
  lava: {
    ember: { name: 'Molten Amber', detail: 'Orange wax, dark cherry fluid', colors: { base: '#10090e', warm: '#ff6b37', bright: '#ffdc78', cool: '#e64d7e', ink: '#33131a' } },
    ultraviolet: { name: 'Electric Violet', detail: 'Pink wax, violet fluid', colors: { base: '#08091c', warm: '#ba5fff', bright: '#ffb2f3', cool: '#4f9eff', ink: '#231142' } },
    tidal: { name: 'Liquid Jade', detail: 'Mint wax, deep teal fluid', colors: { base: '#03191d', warm: '#40dcc6', bright: '#b7fff1', cool: '#367cdb', ink: '#0a3d42' } },
  },
  aurora: {
    ember: { name: 'Northern Lights', detail: 'Emerald and lime aurora', colors: { base: '#020910', warm: '#26e795', bright: '#c8ff98', cool: '#167eb8', ink: '#07372d' } },
    ultraviolet: { name: 'Arctic Night', detail: 'Blue, indigo and ice', colors: { base: '#030619', warm: '#6faeff', bright: '#b7edff', cool: '#8459ef', ink: '#161a45' } },
    tidal: { name: 'Solar Storm', detail: 'Crimson, coral and magenta', colors: { base: '#130615', warm: '#ff5472', bright: '#ffbc83', cool: '#aa42ce', ink: '#471733' } },
  },
  koi: {
    ember: { name: 'Kohaku Garden', detail: 'White and red koi · jade water', colors: { base: '#062421', warm: '#36a584', bright: '#aeecbe', cool: '#219999', ink: '#185347' } },
    ultraviolet: { name: 'Showa at Night', detail: 'Black, white and red koi · blue water', colors: { base: '#080d28', warm: '#4a70af', bright: '#a9c8ff', cool: '#7254a1', ink: '#25294d' } },
    tidal: { name: 'Golden Ogon', detail: 'Metallic gold koi · amber water', colors: { base: '#20190c', warm: '#c99b48', bright: '#ffe7ac', cool: '#927335', ink: '#554327' } },
  },
  oscilloscope: {
    ember: { name: 'Green Phosphor', detail: 'Classic green CRT', colors: { base: '#020c05', warm: '#36ff71', bright: '#caffba', cool: '#0bba4c', ink: '#09331a' } },
    ultraviolet: { name: 'Amber Terminal', detail: 'Golden orange phosphor', colors: { base: '#120a02', warm: '#ff9b28', bright: '#ffec9b', cool: '#c86a13', ink: '#3b2308' } },
    tidal: { name: 'Blue Vector', detail: 'Electric cyan and ice blue', colors: { base: '#020b1b', warm: '#42baff', bright: '#d1faff', cool: '#2650f0', ink: '#102b47' } },
  },
  space: {
    ember: { name: 'Gas Giant', detail: 'Golden planet, warm dust', colors: { base: '#07040c', warm: '#e59a54', bright: '#ffe8b6', cool: '#62417d', ink: '#57372e' } },
    ultraviolet: { name: 'Violet Nebula', detail: 'Amethyst world, magenta clouds', colors: { base: '#09051b', warm: '#b441eb', bright: '#ffc4ff', cool: '#555df4', ink: '#472964' } },
    tidal: { name: 'Ice World', detail: 'Glacial blue planet, teal nebula', colors: { base: '#020d19', warm: '#4cbcdf', bright: '#d3fbff', cool: '#2675b5', ink: '#204c64' } },
  },
};

export function isAmbientPalette(value: unknown): value is AmbientPalette {
  return AMBIENT_PALETTE_IDS.some(id => id === value);
}
