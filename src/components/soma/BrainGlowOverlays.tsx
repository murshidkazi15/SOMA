import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScoreSet } from "./RightPanel";

const REGION_DESCRIPTIONS: Record<string, string> = {
  "Prefrontal Cortex":
    "Your decision-making and focus center. High activation means the music is sharpening your executive function.",
  "Motor Cortex":
    "Controls rhythm processing and physical energy. Active when music drives movement and motivation.",
  "Auditory Cortex":
    "Primary sound processing region. Lower activation here means music is being processed deeper in associative areas.",
  "Superior Temporal":
    "Where music meaning is interpreted. High activation links sound to emotional and cognitive context.",
  "Inferior Frontal":
    "Emotion regulation and language processing. Active when music is shifting your emotional baseline.",
  "Hippocampus":
    "Memory and spatial navigation hub. Theta waves here enhance learning and state consolidation.",
  "Anterior Cingulate":
    "Conflict monitoring and attention switching. High activation means focused, selective attention.",
  "Insula":
    "Body awareness and emotional feeling. Active when music creates a physical sense of calm or energy.",
};

type LabelSide = "left" | "right";

interface RegionGlowProps {
  color: string;
  style: React.CSSProperties;
  label: string;
  score: number;
  isActive: boolean;
  delay: number;
  labelSide: LabelSide;
  breatheDuration: number;
  intensity: number;
}

const CLUSTER_POINTS = [
  { dx: 0, dy: 0, size: 1.0 },
  { dx: 12, dy: -8, size: 0.7 },
  { dx: -10, dy: 10, size: 0.6 },
  { dx: 15, dy: 12, size: 0.5 },
  { dx: -8, dy: -14, size: 0.4 },
];

const parsePct = (v: string | undefined, fallback: number) => {
  if (!v) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const RegionGlow = ({
  color,
  style,
  label,
  score,
  isActive,
  delay,
}: RegionGlowProps) => {
  const [hovered, setHovered] = useState(false);
  const position = {
    left: (style.left as string) ?? "50%",
    top: (style.top as string) ?? "50%",
  };

  const leftNum = parsePct(position.left, 50);
  const topNum = parsePct(position.top, 50);
  const isLeftSide = leftNum < 52;
  const isTopSide = topNum < 45;

  const lineX = isLeftSide ? -60 : 60;
  const lineY = isTopSide ? -35 : 25;

  const description = REGION_DESCRIPTIONS[label];

  return (
    <motion.div
      className="absolute"
      style={{
        left: position.left,
        top: position.top,
        transform: "translate(-50%, -50%)",
        zIndex: 20,
        pointerEvents: isActive ? "auto" : "none",
        cursor: "pointer",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 2, ease: "easeIn", delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Single soft regional glow underneath — subtle, stays within region */}
      <motion.div
        style={{
          position: "absolute",
          width: "60px",
          height: "50px",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${color}50 0%, ${color}20 50%, transparent 75%)`,
          filter: "blur(10px)",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.1, 1] }}
        transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Single bright dot — the precise activation point */}
      <motion.div
        style={{
          position: "absolute",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, white 0%, ${color} 60%, transparent 100%)`,
          boxShadow: `0 0 8px 3px ${color}, 0 0 16px 4px ${color}60`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.9, 1, 0.9],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay * 0.5,
        }}
      />

      {/* Dashed callout line */}
      <svg
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          overflow: "visible",
          pointerEvents: "none",
          width: 0,
          height: 0,
        }}
      >
        <line
          x1="0"
          y1="0"
          x2={lineX}
          y2={lineY}
          stroke={color}
          strokeWidth="0.7"
          strokeDasharray="3 3"
          opacity="0.5"
        />
      </svg>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: 0.8, delay: delay + 1.5 }}
        style={{
          position: "absolute",
          left: isLeftSide ? "auto" : "65px",
          right: isLeftSide ? "65px" : "auto",
          top: isTopSide ? "auto" : "20px",
          bottom: isTopSide ? "30px" : "auto",
          background: "rgba(0,0,0,0.80)",
          backdropFilter: "blur(12px)",
          border: `1px solid ${color}50`,
          borderRadius: "4px",
          padding: "3px 10px",
          fontSize: "9px",
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.9)",
          textTransform: "uppercase",
          fontWeight: 500,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {label} <span style={{ color, fontWeight: 700 }}>{score}%</span>
      </motion.div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "200px",
              background: "rgba(0,0,0,0.90)",
              backdropFilter: "blur(16px)",
              border: `1px solid ${color}30`,
              borderRadius: "8px",
              padding: "10px 12px",
              zIndex: 50,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                color,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", lineHeight: "1.5" }}>
              {description || "Neural activation region"}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "8px" }}>
              Activation <span style={{ color, fontWeight: 700 }}>{score}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface ActivatedRegion {
  name: string;
  intensity: number;
  position: { left: string; top: string };
  color: string;
  description?: string;
}

interface Props {
  active: boolean;
  scores?: ScoreSet;
  regions?: ActivatedRegion[];
}

const DEFAULT_SCORES: ScoreSet = {
  attention: 0,
  focus: 0,
  motivation: 0,
  comfort: 0,
  resistance: 0,
};

// Score channel mapping per region (used when no explicit intensity is provided)
const REGION_SCORE_KEY: Record<string, keyof ScoreSet | "resistance_inverted"> = {
  "Prefrontal Cortex": "attention",
  "Motor Cortex": "motivation",
  "Superior Temporal": "focus",
  "Inferior Frontal": "comfort",
  "Auditory Cortex": "resistance_inverted",
  "Hippocampus": "focus",
  "Anterior Cingulate": "attention",
  "Insula": "comfort",
};

// Label sides keep text from clashing with center of brain
const REGION_LABEL_SIDE: Record<string, LabelSide> = {
  "Prefrontal Cortex": "left",
  "Motor Cortex": "right",
  "Superior Temporal": "right",
  "Inferior Frontal": "left",
  "Auditory Cortex": "left",
  "Hippocampus": "right",
  "Anterior Cingulate": "right",
  "Insula": "left",
};

const REGION_BREATHE: Record<string, number> = {
  "Prefrontal Cortex": 3.8,
  "Motor Cortex": 4.5,
  "Superior Temporal": 3.2,
  "Inferior Frontal": 5.1,
  "Auditory Cortex": 4.0,
  "Hippocampus": 4.8,
  "Anterior Cingulate": 3.6,
  "Insula": 4.2,
};

// Anatomically precise positions derived from mapping the Spline brain model
// against a human brain anatomy reference. These take precedence over any
// positions returned by Gemini.
//
// CALIBRATED: These positions are verified against the static Spline brain model.
// Do not modify without re-running the calibration process.
const ANATOMICAL_POSITIONS: Record<string, { left: string; top: string }> = {
  // Prefrontal Cortex — front left of brain, ~20% into brain from left, ~30% down
  "Prefrontal Cortex":  { left: "42%", top: "36%" },

  // Inferior Frontal — front left lower, ~18% into brain from left, ~55% down
  "Inferior Frontal":   { left: "39%", top: "49%" },

  // Motor Cortex — crown of brain at frontal/parietal border, ~50% across, ~15% down
  "Motor Cortex":       { left: "51%", top: "36%" },

  // Anterior Cingulate — just behind motor cortex, ~48% across, ~22% down
  "Anterior Cingulate": { left: "53%", top: "37%" },

  // Auditory Cortex — temporal lobe upper, ~40% across, ~60% down
  "Auditory Cortex":    { left: "46%", top: "53%" },

  // Superior Temporal — temporal lobe mid, ~48% across, ~65% down
  "Superior Temporal":  { left: "52%", top: "58%" },

  // Hippocampus — deep temporal, ~58% across, ~65% down
  "Hippocampus":        { left: "58%", top: "59%" },

  // Insula — deep center between frontal and temporal, ~42% across, ~52% down
  "Insula":             { left: "46%", top: "50%" },
};

/**
 * Region glow overlays positioned over the Spline brain.
 * Sits at z-15: above brain (z-10), below UI (z-20).
 *
 * If `regions` is provided, renders ONLY those regions at the positions/intensities
 * Gemini specified. Otherwise falls back to the static 5-region layout driven by scores.
 */
export const BrainGlowOverlays = ({ active, scores, regions }: Props) => {
  const s = scores ?? DEFAULT_SCORES;

  // Dynamic mode — render exactly what Gemini returned
  if (regions && regions.length > 0) {
    return (
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 15 }}>
        {regions.map((r, i) => {
          const intensity = Math.max(0, Math.min(1, (r.intensity ?? 0) / 100));
          const labelSide = REGION_LABEL_SIDE[r.name] ?? (i % 2 === 0 ? "right" : "left");
          const breathe = REGION_BREATHE[r.name] ?? 4.0;
          const pos = ANATOMICAL_POSITIONS[r.name] ?? r.position;
          return (
            <RegionGlow
              key={`${r.name}-${i}`}
              color={r.color}
              style={{ left: pos.left, top: pos.top }}
              label={r.name}
              score={Math.round(r.intensity ?? 0)}
              isActive={active}
              delay={i * 0.8}
              labelSide={labelSide}
              breatheDuration={breathe}
              intensity={intensity}
            />
          );
        })}
      </div>
    );
  }

  // Fallback static layout
  const regionScoreMap = {
    prefrontal: s.attention / 100,
    motorCortex: s.motivation / 100,
    superiorTemporal: s.focus / 100,
    inferiorFrontal: s.comfort / 100,
    auditoryCortex: 1 - s.resistance / 100,
  };
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 15 }}>
      {/* Prefrontal Cortex — Attention */}
      <RegionGlow
        color="#7c3aed"
        style={ANATOMICAL_POSITIONS["Prefrontal Cortex"]}
        label="Prefrontal"
        score={s.attention}
        isActive={active}
        delay={0}
        labelSide="left"
        breatheDuration={3.8}
        intensity={regionScoreMap.prefrontal}
      />
      {/* Superior Temporal — Focus */}
      <RegionGlow
        color="#00d4ff"
        style={ANATOMICAL_POSITIONS["Superior Temporal"]}
        label="Superior Temporal"
        score={s.focus}
        isActive={active}
        delay={0.8}
        labelSide="right"
        breatheDuration={3.2}
        intensity={regionScoreMap.superiorTemporal}
      />
      {/* Auditory Cortex — Resistance (inverted) */}
      <RegionGlow
        color="#ff2d78"
        style={ANATOMICAL_POSITIONS["Auditory Cortex"]}
        label="Auditory Cortex"
        score={s.resistance}
        isActive={active}
        delay={1.6}
        labelSide="left"
        breatheDuration={4.0}
        intensity={regionScoreMap.auditoryCortex}
      />
      {/* Inferior Frontal — Comfort */}
      <RegionGlow
        color="#e040fb"
        style={ANATOMICAL_POSITIONS["Inferior Frontal"]}
        label="Inferior Frontal"
        score={s.comfort}
        isActive={active}
        delay={2.4}
        labelSide="left"
        breatheDuration={5.1}
        intensity={regionScoreMap.inferiorFrontal}
      />
      {/* Motor Cortex — Motivation */}
      <RegionGlow
        color="#f5a623"
        style={ANATOMICAL_POSITIONS["Motor Cortex"]}
        label="Motor Cortex"
        score={s.motivation}
        isActive={active}
        delay={3.2}
        labelSide="right"
        breatheDuration={4.5}
        intensity={regionScoreMap.motorCortex}
      />
    </div>
  );
};
