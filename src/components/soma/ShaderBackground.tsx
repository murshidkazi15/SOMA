import { useEffect, useRef } from "react";

interface Props {
  isVisible: boolean;
}

/**
 * Animated WebGL-feel shader background driven by canvas 2D.
 * Renders flowing magenta→teal aurora layers when isVisible is true.
 */
export const ShaderBackground = ({ isVisible }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();
  const tRef = useRef(0);

  useEffect(() => {
    if (!isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      const blob = (cx: number, cy: number, r: number, color: string, alpha: number) => {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`);
        grad.addColorStop(1, `${color}00`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      };

      ctx.globalCompositeOperation = "lighter";
      blob(W * (0.3 + Math.sin(t) * 0.1), H * (0.4 + Math.cos(t * 0.7) * 0.08), Math.max(W, H) * 0.55, "#ff2d78", 0.35);
      blob(W * (0.7 + Math.cos(t * 0.6) * 0.1), H * (0.5 + Math.sin(t * 0.8) * 0.08), Math.max(W, H) * 0.5, "#00d4ff", 0.32);
      blob(W * (0.5 + Math.sin(t * 0.4) * 0.15), H * (0.7 + Math.cos(t * 0.5) * 0.1), Math.max(W, H) * 0.45, "#7c3aed", 0.3);
      ctx.globalCompositeOperation = "source-over";

      tRef.current += 0.012;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isVisible]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-700"
      style={{
        zIndex: 5,
        opacity: isVisible ? 1 : 0,
        filter: "blur(60px) saturate(140%)",
      }}
    />
  );
};
