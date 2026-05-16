import React, { useMemo, useState } from 'react';
import {
  Anchor,
  Aperture,
  Atom,
  Badge,
  Binary,
  Bolt,
  Box,
  Brain,
  CircuitBoard,
  CircleDot,
  Compass,
  Diamond,
  Flame,
  Flower2,
  Gem,
  Hexagon,
  KeyRound,
  Landmark,
  Leaf,
  Moon,
  Mountain,
  Palette,
  Pentagon,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Satellite,
  ScanEye,
  ShieldQuestion,
  Shuffle,
  Snowflake,
  Sparkles,
  Square,
  Star,
  Sun,
  Triangle,
  Waves
} from 'lucide-react';
import { motion } from 'framer-motion';

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
type PromptHouse = 'orbit' | 'ember' | 'tide' | 'signal';
type PromptLens = 'sun' | 'moon' | 'compass' | 'mirror';
type Difficulty = 'easy' | 'medium' | 'hard';
type ResponseId =
  | 'anchor'
  | 'aperture'
  | 'bolt'
  | 'brain'
  | 'diamond'
  | 'flame'
  | 'flower'
  | 'gem'
  | 'key'
  | 'landmark'
  | 'leaf'
  | 'moon'
  | 'mountain'
  | 'palette'
  | 'puzzle'
  | 'satellite'
  | 'snow'
  | 'spark'
  | 'star'
  | 'waves';

interface Challenge {
  house: PromptHouse;
  step: number;
  lens: PromptLens;
}

interface IconMeta<T extends string> {
  id: T;
  label: string;
  Icon: IconComponent;
}

const houses: IconMeta<PromptHouse>[] = [
  { id: 'orbit', label: 'Key One', Icon: Atom },
  { id: 'ember', label: 'Key Two', Icon: Box },
  { id: 'tide', label: 'Key Three', Icon: Badge },
  { id: 'signal', label: 'Key Four', Icon: CircuitBoard }
];

const lenses: IconMeta<PromptLens>[] = [
  { id: 'sun', label: 'Sun', Icon: Sun },
  { id: 'moon', label: 'Moon', Icon: Moon },
  { id: 'compass', label: 'Compass', Icon: Compass },
  { id: 'mirror', label: 'Mirror', Icon: ScanEye }
];

const counts: IconMeta<string>[] = [
  { id: '1', label: 'One', Icon: CircleDot },
  { id: '2', label: 'Two', Icon: Binary },
  { id: '3', label: 'Three', Icon: Triangle },
  { id: '4', label: 'Four', Icon: Square },
  { id: '5', label: 'Five', Icon: Pentagon },
  { id: '6', label: 'Six', Icon: Hexagon }
];

const responses: IconMeta<ResponseId>[] = [
  { id: 'anchor', label: 'Anchor', Icon: Anchor },
  { id: 'aperture', label: 'Aperture', Icon: Aperture },
  { id: 'bolt', label: 'Bolt', Icon: Bolt },
  { id: 'brain', label: 'Brain', Icon: Brain },
  { id: 'diamond', label: 'Diamond', Icon: Diamond },
  { id: 'flame', label: 'Flame', Icon: Flame },
  { id: 'flower', label: 'Flower', Icon: Flower2 },
  { id: 'gem', label: 'Gem', Icon: Gem },
  { id: 'key', label: 'Key', Icon: KeyRound },
  { id: 'landmark', label: 'Landmark', Icon: Landmark },
  { id: 'leaf', label: 'Leaf', Icon: Leaf },
  { id: 'moon', label: 'Moon', Icon: Moon },
  { id: 'mountain', label: 'Mountain', Icon: Mountain },
  { id: 'palette', label: 'Palette', Icon: Palette },
  { id: 'puzzle', label: 'Puzzle', Icon: Puzzle },
  { id: 'satellite', label: 'Satellite', Icon: Satellite },
  { id: 'snow', label: 'Snow', Icon: Snowflake },
  { id: 'spark', label: 'Spark', Icon: Sparkles },
  { id: 'star', label: 'Star', Icon: Star },
  { id: 'waves', label: 'Waves', Icon: Waves }
];

const responseMap = new Map(responses.map(response => [response.id, response]));

const selectionTiles: ResponseId[] = ['star', 'satellite', 'aperture', 'spark', 'diamond', 'brain', 'puzzle', 'key'];

const rows: Record<PromptHouse, ResponseId[]> = {
  orbit: ['star', 'satellite', 'aperture', 'spark', 'diamond', 'brain', 'puzzle', 'key'],
  ember: ['diamond', 'key', 'star', 'brain', 'spark', 'aperture', 'satellite', 'puzzle'],
  tide: ['brain', 'spark', 'key', 'satellite', 'puzzle', 'diamond', 'star', 'aperture'],
  signal: ['puzzle', 'diamond', 'brain', 'star', 'key', 'satellite', 'aperture', 'spark']
};

const lensOffsets: Record<PromptLens, number> = {
  sun: 1,
  moon: 3,
  compass: 5,
  mirror: 7
};

const difficultyConfig: Record<Difficulty, {
  label: string;
  answerCount: number;
  houses: PromptHouse[];
  lenses: PromptLens[];
  maxStep: number;
}> = {
  easy: {
    label: 'Easy',
    answerCount: 3,
    houses: ['orbit', 'ember'],
    lenses: ['sun', 'moon'],
    maxStep: 3
  },
  medium: {
    label: 'Med',
    answerCount: 3,
    houses: ['orbit', 'ember', 'tide'],
    lenses: ['sun', 'moon', 'compass'],
    maxStep: 4
  },
  hard: {
    label: 'Hard',
    answerCount: 3,
    houses: ['orbit', 'ember', 'tide', 'signal'],
    lenses: ['sun', 'moon', 'compass', 'mirror'],
    maxStep: 6
  }
};

const makeChallenge = (difficulty: Difficulty): Challenge => {
  const config = difficultyConfig[difficulty];

  return {
    house: config.houses[Math.floor(Math.random() * config.houses.length)],
    step: Math.floor(Math.random() * config.maxStep) + 1,
    lens: config.lenses[Math.floor(Math.random() * config.lenses.length)]
  };
};

const iconFor = <T extends string>(items: IconMeta<T>[], id: T) => items.find(item => item.id === id) ?? items[0];

const unique = <T,>(items: T[]) => Array.from(new Set(items));

const expectedFor = (challenge: Challenge, difficulty: Difficulty): ResponseId[] => {
  const answerCount = difficultyConfig[difficulty].answerCount;
  const row = rows[challenge.house];
  const anchor = challenge.step - 1;
  const first = row[(anchor + challenge.step) % row.length];
  const second = row[(anchor + lensOffsets[challenge.lens]) % row.length];
  const third = row[(anchor + challenge.step + lensOffsets[challenge.lens]) % row.length];

  const expected = unique([first, second, third]);
  let cursor = 0;

  while (expected.length < answerCount) {
    const next = row[(anchor + cursor) % row.length];
    if (!expected.includes(next)) expected.push(next);
    cursor += 1;
  }

  return expected.slice(0, answerCount);
};

const choicesFor = (): IconMeta<ResponseId>[] =>
  selectionTiles.map(id => responseMap.get(id)).filter((response): response is IconMeta<ResponseId> => Boolean(response));

const keyFor = (items: string[]) => [...items].sort().join('|');

export function RuleView() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [challenge, setChallenge] = useState<Challenge>(() => makeChallenge('easy'));
  const [selected, setSelected] = useState<ResponseId[]>([]);
  const [showTrace, setShowTrace] = useState(false);

  const expected = useMemo(() => expectedFor(challenge, difficulty), [challenge, difficulty]);
  const choices = useMemo(() => choicesFor(), []);
  const visibleHouses = difficultyConfig[difficulty].houses;
  const solved = selected.length === expected.length && keyFor(selected) === keyFor(expected);
  const missed = selected.length >= expected.length && !solved;

  const promptItems = [
    iconFor(houses, challenge.house),
    counts[challenge.step - 1],
    iconFor(lenses, challenge.lens)
  ];

  const resetChallenge = () => {
    setChallenge(makeChallenge(difficulty));
    setSelected([]);
    setShowTrace(false);
  };

  const setLevel = (nextDifficulty: Difficulty) => {
    setDifficulty(nextDifficulty);
    setChallenge(makeChallenge(nextDifficulty));
    setSelected([]);
    setShowTrace(false);
  };

  const toggleSelection = (id: ResponseId) => {
    setSelected(current => {
      if (current.includes(id)) return current.filter(item => item !== id);
      if (current.length >= expected.length) return [...current.slice(1), id];
      return [...current, id];
    });
  };

  return (
    <motion.div
      key="rule-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="grid h-full w-full grid-cols-[0.9fr_1.1fr] gap-8 p-8"
    >
      <section className="flex min-h-0 flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-white/30">
            <ShieldQuestion size={18} />
            Rule
          </div>

          <div className="grid shrink-0 grid-cols-3 gap-2 rounded-[1.25rem] border border-white/10 bg-black/20 p-2">
            {(Object.keys(difficultyConfig) as Difficulty[]).map(level => (
              <button
                key={level}
                onPointerDown={() => setLevel(level)}
                className={`min-h-10 rounded-2xl py-2 text-sm font-black uppercase tracking-[0.18em] transition-all active:scale-95 ${
                  difficulty === level ? 'bg-white text-black' : 'text-white/40'
                }`}
              >
                {difficultyConfig[level].label}
              </button>
            ))}
          </div>

          <div className="grid min-h-0 flex-[1.15_1_0] grid-cols-3 gap-3">
            {promptItems.map(({ id, label, Icon }) => (
              <div
                key={id}
                role="img"
                className="flex h-full items-center justify-center rounded-[1.5rem] border border-white/10 bg-black/30 text-white shadow-2xl shadow-black/20"
                aria-label={label}
                title={label}
              >
                <Icon className="size-[clamp(2.25rem,8vh,3.6rem)]" strokeWidth={1.8} />
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-[0.8_1_0] grid-cols-3 gap-3">
            {selected.map(id => {
              const response = responseMap.get(id);
              if (!response) return null;
              const { Icon, label } = response;
              return (
                <div
                  key={id}
                  role="img"
                  className="flex h-full items-center justify-center rounded-[1.25rem] border border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                  aria-label={label}
                  title={label}
                >
                  <Icon className="size-[clamp(1.75rem,5.8vh,2.6rem)]" strokeWidth={2} />
                </div>
              );
            })}
            {Array.from({ length: expected.length - selected.length }).map((_, index) => (
              <div
                key={index}
                className="h-full rounded-[1.25rem] border border-dashed border-white/10 bg-black/20"
              />
            ))}
          </div>

          <div className="min-h-0 flex-1" />
        </div>

        <div className="grid min-h-12 flex-[0.12_1_0] grid-cols-3 gap-3">
          <button
            onPointerDown={() => setSelected([])}
            className="flex h-full items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-white/50 active:scale-95"
            aria-label="Clear"
            title="Clear"
          >
            <RotateCcw className="size-[clamp(1.35rem,4vh,1.85rem)]" />
          </button>
          <button
            onPointerDown={() => setShowTrace(value => !value)}
            className="flex h-full items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-white/50 active:scale-95"
            aria-label="Reveal"
            title="Reveal"
          >
            <ScanEye className="size-[clamp(1.35rem,4vh,1.85rem)]" />
          </button>
          <button
            onPointerDown={resetChallenge}
            className="flex h-full items-center justify-center rounded-[1.25rem] border border-white/10 bg-white text-black active:scale-95"
            aria-label="New"
            title="New"
          >
            <RefreshCw className="size-[clamp(1.35rem,4vh,1.85rem)]" />
          </button>
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-5">
        <div className="grid min-h-0 flex-[1.05_1_0] grid-cols-4 grid-rows-2 gap-4">
          {choices.map(({ id, label, Icon }) => {
            const isSelected = selected.includes(id);
            const isExpected = showTrace && expected.includes(id);

            return (
              <button
                key={id}
                onPointerDown={() => toggleSelection(id)}
                className={`flex h-full min-h-0 items-center justify-center rounded-[1.25rem] border transition-all active:scale-95 ${
                  isSelected
                    ? 'border-emerald-300/50 bg-emerald-300/15 text-emerald-100'
                    : isExpected
                      ? 'border-sky-300/40 bg-sky-300/10 text-sky-100'
                      : 'border-white/10 bg-white/[0.04] text-white/70'
                }`}
                aria-label={label}
                title={label}
              >
                <Icon className="size-[clamp(2rem,8vh,3.2rem)]" strokeWidth={1.9} />
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-[1.2_1_0] flex-col gap-3 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/25">Keys</div>
          <div
            className="grid min-h-0 flex-1 gap-2 overflow-y-auto scrollbar-hide"
            style={{ gridTemplateRows: `repeat(${visibleHouses.length}, minmax(0, 1fr))` }}
          >
            {visibleHouses.map(house => {
              const isActiveHouse = house === challenge.house;

              return (
                <div
                  key={house}
                  className={`grid h-full min-h-0 grid-cols-8 gap-2 rounded-xl ${
                    showTrace && isActiveHouse ? 'bg-white/[0.03]' : ''
                  }`}
                >
                  {rows[house].map((id, index) => {
                    const response = responseMap.get(id);
                    if (!response) return null;
                    const { Icon, label } = response;
                    const isExpected = showTrace && isActiveHouse && expected.includes(id);
                    const isAnchor = showTrace && isActiveHouse && index === challenge.step - 1;

                    return (
                      <div
                        key={id}
                        role="img"
                        className={`relative flex h-full min-h-0 items-center justify-center rounded-2xl border ${
                          isExpected
                            ? 'border-sky-300/40 bg-sky-300/10 text-sky-100'
                            : isAnchor
                              ? 'border-white/25 bg-white/10 text-white'
                              : 'border-white/10 bg-black/20 text-white/35'
                        }`}
                        aria-label={label}
                        title={label}
                      >
                        <Icon className="size-[clamp(1.6rem,6vh,2.65rem)]" strokeWidth={1.9} />
                        <span className="absolute left-1.5 top-1 text-[9px] font-black text-white/25">{index + 1}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className={`flex min-h-24 items-center justify-between rounded-[1.5rem] border px-6 ${
            solved
              ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
              : missed
                ? 'border-rose-300/30 bg-rose-300/10 text-rose-100'
                : 'border-white/10 bg-white/[0.04] text-white/40'
          }`}
        >
          <div className="flex items-center gap-3">
            {solved ? <KeyRound size={28} /> : missed ? <Shuffle size={28} /> : <ShieldQuestion size={28} />}
            <span className="text-lg font-black uppercase tracking-[0.2em]">
              {solved ? 'Open' : missed ? 'Nope' : 'Pending'}
            </span>
          </div>

          {showTrace && (
            <div className="flex gap-2">
              {expected.map(id => {
                const response = responseMap.get(id);
                if (!response) return null;
                const { Icon, label } = response;
                return (
                  <div
                    key={id}
                    role="img"
                    className="flex size-14 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-300/10 text-sky-100"
                    aria-label={label}
                    title={label}
                  >
                    <Icon size={28} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
