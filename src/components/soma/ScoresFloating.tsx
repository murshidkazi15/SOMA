import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ScoreSet } from "./RightPanel";

interface Score {
  label: string;
  value: number;
  color: string;
  hex: string;
}

const DEFAULT_BASELINE: ScoreSet = {
  attention: 30,
  focus: 28,
  motivation: 32,
  comfort: 38,
  resistance: 68,
};

const DEFAULT_TARGET: ScoreSet = {
  attention: 86,
  focus: 78,
  motivation: 92,
  comfort: 71,
  resistance: 24,
};

const DEFAULT_MATCH = 94;

const SCORE_META: { key: keyof ScoreSet; label: string; color: string; hex: string }[] = [
  { key: "attention",  label: "Attention",  color: "var(--teal)",        hex: "#00d4ff" },
  { key: "focus",      label: "Focus",      color: "var(--purple-glow)", hex: "#a78bfa" },
  { key: "motivation", label: "Motivation", color: "var(--amber)",       hex: "#f5a623" },
  { key: "comfort",    label: "Comfort",    color: "var(--magenta)",     hex: "#ff2d78" },
  { key: "resistance", label: "Resistance", color: "hsl(0 0% 70%)",      hex: "#00ff9d" },
];

const buildScores = (s: ScoreSet): Score[] =>
  SCORE_META.map((m) => ({ label: m.label, value: s[m.key], color: m.color, hex: m.hex }));

// Generate a new (higher) target from a current baseline.
// Climbing scores nudge up by 6-14, resistance nudges further down by 4-10.
const escalateTarget = (base: ScoreSet): ScoreSet => {
  const jitter = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));
  return {
    attention:  Math.min(100, base.attention  + jitter(6, 14)),
    focus:      Math.min(100, base.focus      + jitter(6, 14)),
    motivation: Math.min(100, base.motivation + jitter(6, 14)),
    comfort:    Math.min(100, base.comfort    + jitter(6, 14)),
    resistance: Math.max(0,   base.resistance - jitter(4, 10)),
  };
};

interface Props {
  active: boolean;
  isPlaying?: boolean;
  /** Audio playback progress 0..1 */
  progress?: number;
  baselineScores?: ScoreSet;
  targetScores?: ScoreSet;
  matchScore?: number;
}

const BUFFER = 0.85; // reach target by 85% of song
const SONG_DURATION_S = 30;
const INTERVAL_MS = 1000;

/**
 * Floating Neural Response panel — current bars climb from baseline toward target,
 * driven authoritatively by audio progress and tweened between ticks.
 */
export const ScoresFloating = ({
  active,
  isPlaying = false,
  progress = 0,
  baselineScores,
  targetScores,
  matchScore: matchInput,
}: Props) => {
  const propBaseline = baselineScores ?? DEFAULT_BASELINE;
  const propTarget = targetScores ?? DEFAULT_TARGET;
  const initialMatch = matchInput ?? DEFAULT_MATCH;

  // Live baseline & target — start from props but mutate on cycle.
  const [liveBaseline, setLiveBaseline] = useState<ScoreSet>(propBaseline);
  const [liveTarget, setLiveTarget] = useState<ScoreSet>(propTarget);
  const [currentScores, setCurrentScores] = useState<ScoreSet>(propBaseline);
  const baselineRef = useRef(propBaseline);
  const targetRef = useRef(propTarget);
  const cycledRef = useRef(false);

  // Reset whenever a new generation comes in (props change identity)
  useEffect(() => {
    setLiveBaseline(propBaseline);
    setLiveTarget(propTarget);
    setCurrentScores(propBaseline);
    baselineRef.current = propBaseline;
    targetRef.current = propTarget;
    cycledRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    propBaseline.attention, propBaseline.focus, propBaseline.motivation, propBaseline.comfort, propBaseline.resistance,
    propTarget.attention, propTarget.focus, propTarget.motivation, propTarget.comfort, propTarget.resistance,
  ]);

  // Per-score step size to close gap within BUFFER * 30s at 1Hz.
  const stepSizes = useRef<ScoreSet>({ attention: 0, focus: 0, motivation: 0, comfort: 0, resistance: 0 });
  useEffect(() => {
    const stepsAvailable = SONG_DURATION_S * BUFFER;
    const calc = (a: number, b: number) => Math.abs(b - a) / stepsAvailable;
    stepSizes.current = {
      attention: calc(liveBaseline.attention, liveTarget.attention),
      focus: calc(liveBaseline.focus, liveTarget.focus),
      motivation: calc(liveBaseline.motivation, liveTarget.motivation),
      comfort: calc(liveBaseline.comfort, liveTarget.comfort),
      resistance: calc(liveBaseline.resistance, liveTarget.resistance),
    };
  }, [liveBaseline, liveTarget]);

  // Authoritative driver: clamp scores to expected position based on audio progress.
  useEffect(() => {
    if (progress <= 0) return;
    const eased = Math.min(progress / BUFFER, 1);
    setCurrentScores((prev) => {
      const next = { ...prev };
      (Object.keys(next) as (keyof ScoreSet)[]).forEach((k) => {
        const b = baselineRef.current[k];
        const t = targetRef.current[k];
        const expected = b + (t - b) * eased;
        if (k === "resistance") {
          // Resistance decreases — only allow downward motion
          next[k] = Math.min(prev[k], expected);
        } else {
          // Others increase — only allow upward motion
          next[k] = Math.max(prev[k], expected);
        }
      });
      return next;
    });
  }, [progress]);

  // Backup tween between timeupdate ticks for natural motion.
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentScores((prev) => {
        const next = { ...prev };
        (Object.keys(next) as (keyof ScoreSet)[]).forEach((k) => {
          const t = targetRef.current[k];
          const c = next[k];
          const baseStep = stepSizes.current[k] || 0.5;
          const jitter = baseStep * (0.8 + Math.random() * 0.4);
          if (k === "resistance") {
            next[k] = c > t ? Math.max(t, c - jitter) : t;
          } else {
            next[k] = c < t ? Math.min(t, c + jitter) : t;
          }
        });
        return next;
      });
    }, INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Matched count (within 2 points)
  const matchedCount = (Object.keys(currentScores) as (keyof ScoreSet)[]).filter(
    (k) => Math.abs(currentScores[k] - liveTarget[k]) <= 2,
  ).length;

  // Cycle when all 5 match: target → new baseline, escalate target.
  useEffect(() => {
    if (matchedCount !== 5 || cycledRef.current) return;
    cycledRef.current = true;
    const t = setTimeout(() => {
      const newBaseline: ScoreSet = { ...liveTarget };
      const newTarget = escalateTarget(newBaseline);
      setLiveBaseline(newBaseline);
      setLiveTarget(newTarget);
      setCurrentScores(newBaseline);
      baselineRef.current = newBaseline;
      targetRef.current = newTarget;
      cycledRef.current = false;
    }, 1500);
    return () => clearTimeout(t);
  }, [matchedCount, liveTarget]);

  // Live match score: average proximity of each current to its target.
  const liveMatchScore = Math.round(
    ((Object.keys(currentScores) as (keyof ScoreSet)[]).reduce((sum, k) => {
      const proximity = 1 - Math.abs(currentScores[k] - liveTarget[k]) / 100;
      return sum + proximity;
    }, 0) /
      5) *
      100,
  );

  // Match gauge animation — initial reveal tick uses initialMatch, then tracks live.
  const [gaugeRevealed, setGaugeRevealed] = useState(false);
  const [gaugeDisplay, setGaugeDisplay] = useState(0);
  useEffect(() => {
    if (!active) {
      setGaugeRevealed(false);
      setGaugeDisplay(0);
      return;
    }
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    timeouts.push(
      setTimeout(() => {
        setGaugeRevealed(true);
        let n = 0;
        const tick = setInterval(() => {
          n += 1;
          setGaugeDisplay(n);
          if (n >= initialMatch) clearInterval(tick);
        }, 40);
        timeouts.push(tick as unknown as ReturnType<typeof setTimeout>);
      }, 3400),
    );
    return () =>
      timeouts.forEach((t) => {
        clearTimeout(t);
        clearInterval(t as unknown as number);
      });
  }, [active, initialMatch]);

  // Once revealed, gauge tracks live match score.
  useEffect(() => {
    if (!gaugeRevealed) return;
    setGaugeDisplay(liveMatchScore);
  }, [gaugeRevealed, liveMatchScore]);

  const gaugeValue = gaugeRevealed ? liveMatchScore : 0;

  const currentBars = buildScores(currentScores);
  const targetBars = buildScores(liveTarget);

  return (
    <div className="w-full">
      {/* Current Neural Response */}
      <div className="text-[9px] uppercase tracking-[0.25em] text-white/40 mb-5">Neural Response</div>

      <div className="space-y-4">
        {currentBars.map((s, i) => {
          const tVal = liveTarget[SCORE_META[i].key];
          const isMatched = Math.abs(s.value - tVal) <= 2;
          return (
            <div key={s.label}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11px] text-white/70">{s.label}</span>
                <span className="text-[10px] tabular-nums flex items-center" style={{ color: `hsl(${s.color})` }}>
                  {Math.round(s.value)}
                  {isMatched && (
                    <motion.span
                      className="text-emerald-400 ml-1 text-[10px]"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      ✓
                    </motion.span>
                  )}
                </span>
              </div>
              <div className="relative h-1 rounded-full bg-white/[0.06] overflow-visible">
                <motion.div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, hsl(${s.color} / 0.4), hsl(${s.color}))`,
                    boxShadow: `0 0 10px hsl(${s.color} / 0.6)`,
                  }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${s.value}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                {s.value > 0 && (
                  <motion.div
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      width: "3px",
                      background: `hsl(${s.color})`,
                      boxShadow: `0 0 8px 3px hsl(${s.color}), 0 0 20px 5px hsl(${s.color} / 0.5)`,
                    }}
                    initial={{ left: "0%" }}
                    animate={{
                      left: `calc(${s.value}% - 3px)`,
                      scale: isMatched ? [1, 1.6, 1] : 1,
                    }}
                    transition={{ duration: isMatched ? 0.6 : 0.8, ease: "easeOut" }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Match Score gauge */}
      <div className="mt-7 flex flex-col items-center">
        <div className="text-[9px] uppercase tracking-[0.25em] text-white/30 mb-2">Match Score</div>
        <Gauge value={gaugeValue} displayValue={gaugeDisplay} />
      </div>

      {/* Progress indicator */}
      <div className="my-5">
        <div className="flex justify-between text-[9px] text-white/20 uppercase tracking-widest mb-2">
          <span>Current</span>
          <span>{matchedCount}/5 matched</span>
          <span>Target</span>
        </div>
        <div className="h-px bg-white/[0.06] relative">
          <motion.div
            className="absolute top-0 left-0 h-full"
            style={{
              background: "linear-gradient(to right, #00d4ff, #00ff9d)",
              boxShadow: "0 0 6px #00d4ff",
            }}
            animate={{ width: `${(matchedCount / 5) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Target Neural Response */}
      <div className="text-[9px] uppercase tracking-[0.25em] text-emerald-400/70 mb-4">
        Target Neural Response
      </div>

      {targetBars.map(({ label, value, color, hex }) => (
        <div key={label} className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-white/60">{label}</span>
            <span className="text-[10px] font-mono" style={{ color: `hsl(${color})` }}>
              {Math.round(value)}
            </span>
          </div>
          <div className="relative h-0.5 rounded-full bg-white/[0.06] overflow-visible">
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, hsl(${color} / 0.4), hsl(${color}))`,
                boxShadow: `0 0 10px hsl(${color} / 0.6)`,
              }}
              initial={{ width: "0%" }}
              animate={{ width: `${value}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            {value > 0 && (
              <motion.div
                className="absolute top-0 h-full rounded-full"
                style={{
                  width: "3px",
                  background: `hsl(${color})`,
                  boxShadow: `0 0 8px 3px hsl(${color}), 0 0 20px 5px hsl(${color} / 0.5)`,
                }}
                initial={{ left: "0%" }}
                animate={{ left: `calc(${value}% - 3px)` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const Gauge = ({ value, displayValue }: { value: number; displayValue: number }) => {
  const size = 160;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cy = size / 2;
  const circ = Math.PI * r;
  const offset = circ * (1 - value / 100);

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 16 }}>
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
        <defs>
          <linearGradient id="floatGaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(338 100% 59%)" />
            <stop offset="50%" stopColor="hsl(36 91% 55%)" />
            <stop offset="100%" stopColor="hsl(192 100% 50%)" />
          </linearGradient>
          <filter id="floatGaugeGlow"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke="hsl(0 0% 100% / 0.06)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke="url(#floatGaugeGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 2500ms cubic-bezier(0.42, 0, 0.58, 1)" }}
          filter="url(#floatGaugeGlow)"
        />
      </svg>
      <div className="absolute inset-x-0 top-5 text-center">
        <div className="font-display text-3xl tabular-nums leading-none text-white">
          {displayValue}
          <span className="text-base text-white/40">%</span>
        </div>
        <div className="text-[8px] uppercase tracking-[0.25em] text-white/30 mt-1">Optimal</div>
      </div>
    </div>
  );
};
