import { useEffect, useState } from "react";

interface Score { label: string; value: number; color: string; }

export interface ScoreSet {
  attention: number;
  focus: number;
  motivation: number;
  comfort: number;
  resistance: number;
}

const DEFAULT_SCORES: ScoreSet = {
  attention: 86,
  focus: 78,
  motivation: 92,
  comfort: 71,
  resistance: 24,
};

const DEFAULT_MATCH = 94;

const buildScores = (s: ScoreSet): Score[] => [
  { label: "Attention",  value: s.attention,  color: "var(--teal)" },
  { label: "Focus",      value: s.focus,      color: "var(--purple-glow)" },
  { label: "Motivation", value: s.motivation, color: "var(--amber)" },
  { label: "Comfort",    value: s.comfort,    color: "var(--magenta)" },
  { label: "Resistance", value: s.resistance, color: "hsl(0 0% 70%)" },
];

interface Props {
  active: boolean;
  scores?: ScoreSet;
  matchScore?: number;
}

export const RightPanel = ({ active, scores: scoresInput, matchScore: matchInput }: Props) => {
  const scores = buildScores(scoresInput ?? DEFAULT_SCORES);
  const gaugeTarget = matchInput ?? DEFAULT_MATCH;
  const [animatedValues, setAnimatedValues] = useState<number[]>(scores.map(() => 0));
  const [matchScore, setMatchScore] = useState(0);
  const [matchDisplay, setMatchDisplay] = useState(0);
  const illuminated = active || matchScore > 0;

  useEffect(() => {
    if (!active) {
      setAnimatedValues(scores.map(() => 0));
      setMatchScore(0);
      setMatchDisplay(0);
      return;
    }
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    // Bars: stagger 400ms, each animates over 1800ms (CSS handles the easing)
    scores.forEach((s, i) => {
      timeouts.push(setTimeout(() => {
        setAnimatedValues((prev) => prev.map((v, idx) => (idx === i ? s.value : v)));
      }, i * 400));
    });
    // Gauge starts after all bars finish: (4 * 400) + 1800 = 3400ms
    timeouts.push(setTimeout(() => setMatchScore(gaugeTarget), 3400));
    // Number tick: increment every 40ms, starts with the gauge fill
    timeouts.push(setTimeout(() => {
      let n = 0;
      const tick = setInterval(() => {
        n += 1;
        setMatchDisplay(n);
        if (n >= gaugeTarget) clearInterval(tick);
      }, 40);
      timeouts.push(tick as unknown as ReturnType<typeof setTimeout>);
    }, 3400));
    return () => timeouts.forEach((t) => { clearTimeout(t); clearInterval(t as unknown as number); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, gaugeTarget]);

  return (
    <aside className={`glass neural-response-panel rounded-2xl p-6 flex flex-col gap-6 h-full overflow-y-auto scrollbar-none animate-fade-in ${illuminated ? "is-illuminated" : ""}`}>
      <div>
        <h3 className="smallcaps text-xs text-teal text-glow-teal">Neural Response</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Cortical activation profile</p>
      </div>

      {/* Bar charts */}
      <div className="space-y-4">
        {scores.map((s, i) => (
          <div key={s.label}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs text-foreground/90">{s.label}</span>
              <span className="text-[11px] tabular-nums smallcaps" style={{ color: `hsl(${s.color})` }}>
                {Math.round(animatedValues[i])}
              </span>
            </div>
            <div className="relative h-1.5 rounded-full bg-white/5 overflow-visible">
              <div
                className="relative h-full rounded-full"
                style={{
                  width: `${animatedValues[i]}%`,
                  background: `linear-gradient(90deg, hsl(${s.color} / 0.4), hsl(${s.color}))`,
                  boxShadow: `0 0 10px hsl(${s.color} / 0.6)`,
                  transition: "width 1800ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {animatedValues[i] > 0 && (
                  <div
                    className="absolute top-0 right-0 h-full w-1 rounded-full"
                    style={{
                      background: `hsl(${s.color})`,
                      boxShadow: `0 0 8px 3px hsl(${s.color}), 0 0 20px 5px hsl(${s.color} / 0.5)`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Match Score gauge */}
      <div className="flex flex-col items-center pt-2">
        <h4 className="smallcaps text-[10px] text-muted-foreground mb-3">Match Score</h4>
        <Gauge value={matchScore} displayValue={matchDisplay} />
      </div>
    </aside>
  );
};

const Gauge = ({ value, displayValue }: { value: number; displayValue: number }) => {
  // Semi-circle arc: -90deg to 90deg
  const size = 180;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = Math.PI * r; // half-circle length
  const offset = circ * (1 - value / 100);

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 16 }}>
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(338 100% 59%)" />
            <stop offset="50%" stopColor="hsl(36 91% 55%)" />
            <stop offset="100%" stopColor="hsl(192 100% 50%)" />
          </linearGradient>
          <filter id="gaugeGlow"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        {/* Track */}
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke="hsl(0 0% 100% / 0.06)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Value */}
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 2500ms cubic-bezier(0.42, 0, 0.58, 1)" }}
          filter="url(#gaugeGlow)"
        />
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={stroke - 6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 2500ms cubic-bezier(0.42, 0, 0.58, 1)" }}
        />
      </svg>
      <div className="absolute inset-x-0 top-6 text-center">
        <div className="font-display text-4xl tabular-nums leading-none">
          {displayValue}<span className="text-lg text-muted-foreground">%</span>
        </div>
        <div className="smallcaps text-[9px] text-muted-foreground mt-1">Optimal</div>
      </div>
    </div>
  );
};
