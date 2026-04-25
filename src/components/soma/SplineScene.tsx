import { Suspense, lazy, useEffect, useState } from "react";
import brainActive from "@/assets/brain-active.png";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface Props {
  scene: string;
  className?: string;
  onLoad?: (spline: any) => void;
  /** Fade fallback image with this opacity when Spline fails */
  fallbackVisible?: boolean;
}

export function SplineScene({ scene, className, onLoad, fallbackVisible = true }: Props) {
  const [splineLoaded, setSplineLoaded] = useState(false);
  const [splineFailed, setSplineFailed] = useState(false);

  // Fall back to static brain image if Spline doesn't load within 10s
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!splineLoaded) {
        console.warn("Spline did not load within 10s, falling back to image");
        setSplineFailed(true);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [splineLoaded]);

  if (splineFailed) {
    return (
      <img
        src={brainActive}
        alt="Brain"
        className={`${className ?? ""} object-contain`}
        style={{
          mixBlendMode: "screen",
          opacity: fallbackVisible ? 1 : 0,
          width: "100%",
          height: "100%",
          transition: "opacity 800ms ease-out",
        }}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className={`${className ?? ""} w-full h-full flex items-center justify-center`}>
          <div className="text-white/20 text-xs">Loading brain…</div>
        </div>
      }
    >
      <Spline
        scene={scene}
        className={className}
        onLoad={(spline) => {
          setSplineLoaded(true);
          onLoad?.(spline);
        }}
        onError={(e: unknown) => {
          console.error("Spline failed to load:", e);
          setSplineFailed(true);
        }}
      />
    </Suspense>
  );
}
