import { useEffect, useState } from "react";
import logo from "@/assets/soma-logo.png";

const MOODS = ["Tired", "Stressed", "Anxious", "Neutral", "Focused", "Calm", "Energized", "Creative"] as const;
type Mood = (typeof MOODS)[number];

interface Props {
  current: Mood[];
  target: Mood[];
  currentText: string;
  targetText: string;
  onToggleCurrent: (m: Mood) => void;
  onToggleTarget: (m: Mood) => void;
  onCurrentTextChange: (value: string) => void;
  onTargetTextChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  loadingPhase?: string;
  neuralTarget?: string;
}

export const LeftPanel = ({
  current,
  target,
  currentText,
  targetText,
  onToggleCurrent,
  onToggleTarget,
  onCurrentTextChange,
  onTargetTextChange,
  onGenerate,
  isGenerating,
  loadingPhase,
  neuralTarget,
}: Props) => {
  const [loadingText, setLoadingText] = useState(loadingPhase ?? "Analyzing neural targets");
  const [loadingVisible, setLoadingVisible] = useState(true);
  useEffect(() => {
    if (!isGenerating) return;
    setLoadingVisible(false);
    const t = setTimeout(() => {
      setLoadingText(loadingPhase ?? "Analyzing neural targets");
      setLoadingVisible(true);
    }, 300);
    return () => clearTimeout(t);
  }, [isGenerating, loadingPhase]);

  return (
    <aside className="glass rounded-2xl p-6 flex flex-col gap-6 h-full overflow-y-auto scrollbar-none animate-fade-in">
      {/* Brand + user */}
      <div className="flex items-center gap-3 pb-5 border-b border-white/5">
        <img src={logo} alt="SOMA" className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl leading-none tracking-tight">SOMA</div>
          <div className="text-[10px] smallcaps text-muted-foreground mt-1">Subject · M. Vasquez</div>
        </div>
        <span className="h-2 w-2 rounded-full bg-teal animate-blink" aria-label="online" />
      </div>

      {/* Current State */}
      <Section title="Current State" caption="How you feel right now">
        <textarea
          value={currentText}
          onChange={(e) => onCurrentTextChange(e.target.value)}
          placeholder="Add context about your current mood or mental state"
          className="soma-input min-h-[84px] w-full resize-none"
        />
      </Section>

      {/* Target State */}
      <Section title="Target State" caption="Where you want to be">
        <textarea
          value={targetText}
          onChange={(e) => onTargetTextChange(e.target.value)}
          placeholder="Describe the state you want the track to guide you toward"
          className="soma-input min-h-[84px] w-full resize-none"
        />
      </Section>

      {/* Session Parameters */}
      <div className="space-y-2 pt-1">
        <h3 className="text-[10px] uppercase tracking-widest text-white/40">Session Parameters</h3>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
          <span className="text-[10px] uppercase tracking-widest text-white/25">Neural Target</span>
          <span className="text-xs text-white/60 font-mono">{neuralTarget ?? "Prefrontal Engagement"}</span>
          <span className="text-[10px] uppercase tracking-widest text-white/25">BPM Range</span>
          <span className="text-xs text-white/60 font-mono">60 — 80</span>
          <span className="text-[10px] uppercase tracking-widest text-white/25">Modality</span>
          <span className="text-xs text-white/60 font-mono">Binaural + Ambient</span>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={`relative w-full overflow-hidden rounded-xl py-4 px-5 text-sm font-semibold tracking-wide cta-gradient text-white transition-all ${
            isGenerating ? "opacity-90 cursor-wait" : "animate-pulse-cta animate-gradient-shift hover:scale-[1.02]"
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isGenerating ? (
              <>
                <span className="h-2 w-2 rounded-full bg-white/90 animate-blink" />
                <span
                  className="transition-opacity duration-[600ms] ease-out"
                  style={{ opacity: loadingVisible ? 1 : 0 }}
                >
                  {loadingText}…
                </span>
              </>
            ) : (
              <>Generate Track</>
            )}
          </span>
        </button>
        <p className="mt-3 text-[10px] smallcaps text-muted-foreground text-center">
          Powered by TRIBE v2
        </p>
      </div>
    </aside>
  );
};

const Section = ({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div>
      <h3 className="smallcaps text-xs text-teal text-glow-teal">{title}</h3>
      <p className="text-[11px] text-muted-foreground mt-0.5">{caption}</p>
    </div>
    {children}
  </div>
);

export type { Mood };
export { MOODS };
