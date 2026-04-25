import { forwardRef, useEffect, useRef, useState } from "react";

const BAR_COUNT = 120;
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const a = Math.sin(i * 0.17) * 0.42;
  const b = Math.sin(i * 0.49 + 0.8) * 0.2;
  const c = Math.cos(i * 0.08 - 1.2) * 0.18;
  const envelope = 0.45 + 0.55 * Math.abs(Math.sin(i * 0.055 + 0.6));
  return Math.max(0.08, Math.min(1, (Math.abs(a + b + c) * 0.72 + 0.12) * envelope));
});

interface WaveformProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  progress: number;
  onSeek: (p: number) => void;
  onSkipPrev?: () => void;
  onSkipNext?: () => void;
  duration: number;
}

export const Waveform = forwardRef<HTMLDivElement, WaveformProps>(function Waveform(
  { isPlaying, onTogglePlay, progress, onSeek, onSkipPrev, onSkipNext, duration },
  forwardedRef,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setTick((t) => t + 1), 110);
    return () => clearInterval(id);
  }, [isPlaying]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  const playheadIdx = Math.floor(progress * BAR_COUNT);

  return (
    <div className="px-6 pb-6 pt-2 relative z-20">
      <div
        ref={(node) => {
          ref.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        onClick={handleClick}
        className="relative h-20 cursor-pointer"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2"
          style={{ height: "1px", background: "rgba(255,255,255,0.12)" }}
        />
        <div className="relative flex h-full items-center gap-px">
          {BAR_HEIGHTS.map((h, i) => {
            const played = i <= playheadIdx;
            const distFromHead = Math.abs(i - playheadIdx);
            const reactive = isPlaying && distFromHead < 14
              ? 1 + (Math.sin(tick * 0.7 + i * 0.45) * 0.28 + 0.28) * (1 - distFromHead / 14)
              : 1;
            const height = h * reactive * 100;
            return (
              <span
                key={i}
                className="relative flex-1 rounded-full"
                style={{
                  height: played ? `${Math.max(14, height)}%` : "0%",
                  opacity: played ? 1 : 0,
                  transform: played ? "scaleY(1)" : "scaleY(0)",
                  transformOrigin: "center",
                  transition:
                    "transform 150ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms cubic-bezier(0.22, 1, 0.36, 1), height 150ms cubic-bezier(0.22, 1, 0.36, 1)",
                  background: "linear-gradient(180deg, hsl(var(--magenta) / 0.95), hsl(var(--teal) / 0.96))",
                  boxShadow: played && distFromHead < 4 ? "0 0 14px hsl(var(--teal) / 0.45)" : undefined,
                }}
              />
            );
          })}
        </div>
        <div
          className="absolute top-2 bottom-2 w-px bg-foreground pointer-events-none"
          style={{ left: `calc(${progress * 100}% + 12px)`, boxShadow: "0 0 14px hsl(var(--teal) / 0.7)" }}
        />
        <div
          className="absolute top-1/2 h-12 w-12 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            left: `calc(${progress * 100}% - 12px)`,
            background: "radial-gradient(circle, hsl(var(--teal) / 0.22), transparent 70%)",
          }}
        />
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] smallcaps text-muted-foreground tabular-nums">
          {fmt(progress * duration)}
        </span>
        <div className="flex items-center gap-5">
          <CtrlBtn onClick={() => (onSkipPrev ? onSkipPrev() : onSeek(Math.max(0, progress - 0.05)))}>⏮</CtrlBtn>
          <button
            onClick={onTogglePlay}
            className="h-12 w-12 rounded-full cta-gradient text-white grid place-items-center text-lg shadow-lg hover:scale-105 transition-transform"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <CtrlBtn onClick={() => (onSkipNext ? onSkipNext() : onSeek(Math.min(1, progress + 0.05)))}>⏭</CtrlBtn>
        </div>
        <span className="text-[10px] smallcaps text-muted-foreground tabular-nums">
          {fmt(duration)}
        </span>
      </div>
    </div>
  );
});

const CtrlBtn = forwardRef<HTMLButtonElement, { children: React.ReactNode; onClick: () => void }>(function CtrlBtn(
  { children, onClick },
  ref,
) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className="h-9 w-9 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
    >
      {children}
    </button>
  );
});

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const TravelingWave = ({ isVisible, onComplete }: { isVisible: boolean; onComplete?: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();
  const timeRef = useRef(0);
  const xOffsetRef = useRef(-600);

  useEffect(() => {
    if (!isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const W = canvas.width;
    const H = canvas.height;
    const CY = H / 2;

    xOffsetRef.current = -600;
    timeRef.current = 0;

    const drawWave = () => {
      ctx.clearRect(0, 0, W, H);
      const x = xOffsetRef.current;
      const t = timeRef.current;

      const getY = (px: number) => {
        const nx = px * 0.012;
        return (
          Math.sin(nx * 0.8 + t) * 28 +
          Math.sin(nx * 2.1 + t * 1.3) * 14 +
          Math.sin(nx * 3.7 + t * 0.7) * 7 +
          Math.sin(nx * 5.2 + t * 1.8) * 4
        );
      };

      const drawLayer = (opacity: number, blur: number, strokeWidth: number, offsetY: number) => {
        ctx.save();
        ctx.filter = blur > 0 ? `blur(${blur}px)` : "none";

        const grad = ctx.createLinearGradient(x, 0, x + 500, 0);
        grad.addColorStop(0, `rgba(255,45,120,${opacity})`);
        grad.addColorStop(0.3, `rgba(224,64,251,${opacity})`);
        grad.addColorStop(0.6, `rgba(124,58,237,${opacity})`);
        grad.addColorStop(0.85, `rgba(68,138,255,${opacity})`);
        grad.addColorStop(1, `rgba(0,212,255,${opacity})`);

        ctx.beginPath();
        ctx.moveTo(x, CY + offsetY);
        for (let px = 0; px <= 500; px += 3) {
          const y = CY + getY(px + t * 20) + offsetY;
          ctx.lineTo(x + px, y);
        }
        for (let px = 500; px >= 0; px -= 3) {
          const y = CY - getY(px + t * 20) + offsetY;
          ctx.lineTo(x + px, y);
        }
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        const strokeGrad = ctx.createLinearGradient(x, 0, x + 500, 0);
        strokeGrad.addColorStop(0, `rgba(255,45,120,${Math.min(1, opacity * 2)})`);
        strokeGrad.addColorStop(0.5, `rgba(224,64,251,${Math.min(1, opacity * 2)})`);
        strokeGrad.addColorStop(1, `rgba(0,212,255,${Math.min(1, opacity * 2)})`);

        ctx.beginPath();
        ctx.moveTo(x, CY + offsetY);
        for (let px = 0; px <= 500; px += 3) {
          ctx.lineTo(x + px, CY + getY(px + t * 20) + offsetY);
        }
        ctx.strokeStyle = strokeGrad;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        ctx.restore();
      };

      drawLayer(0.15, 20, 0, 0);
      drawLayer(0.35, 6, 1, 4);
      drawLayer(0.75, 0, 2, 0);

      xOffsetRef.current += 5;
      timeRef.current += 0.008;

      if (xOffsetRef.current >= W * 0.6) {
        cancelAnimationFrame(animRef.current!);
        onComplete?.();
        return;
      }

      animRef.current = requestAnimationFrame(drawWave);
    };

    animRef.current = requestAnimationFrame(drawWave);
    return () => cancelAnimationFrame(animRef.current!);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 6 }}
    />
  );
};
