import { useRef, useMemo } from "react";

interface Particle {
  left: string;
  top: string;
  duration: number;
  delay: number;
  minOpacity: number;
  maxOpacity: number;
}

const COUNT = 80;

/**
 * Ambient particle field — 80 tiny white dots gently pulsing in the background
 * to give the dark canvas a sense of depth and space.
 */
export const AmbientParticles = () => {
  const particlesRef = useRef<Particle[] | null>(null);
  const particles = useMemo(() => {
    if (particlesRef.current) return particlesRef.current;
    const arr: Particle[] = Array.from({ length: COUNT }, () => {
      const minOpacity = 0.02 + Math.random() * 0.02; // 0.02 - 0.04
      const maxOpacity = minOpacity + 0.02 + Math.random() * 0.02; // up to ~0.06
      return {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        duration: 3 + Math.random() * 5, // 3 - 8s
        delay: -Math.random() * 8, // de-sync starting points
        minOpacity,
        maxOpacity,
      };
    });
    particlesRef.current = arr;
    return arr;
  }, []);

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <style>{`
        @keyframes ambient-particle-pulse {
          0%, 100% { opacity: var(--p-min); }
          50% { opacity: var(--p-max); }
        }
      `}</style>
      {particles.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: "1px",
            height: "1px",
            background: "white",
            borderRadius: "9999px",
            opacity: p.minOpacity,
            animation: `ambient-particle-pulse ${p.duration}s ease-in-out ${p.delay}s infinite`,
            // CSS variables consumed by the keyframes above
            ["--p-min" as any]: p.minOpacity,
            ["--p-max" as any]: p.maxOpacity,
          }}
        />
      ))}
    </div>
  );
};
