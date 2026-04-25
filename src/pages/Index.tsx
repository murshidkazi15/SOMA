import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SplineScene } from "@/components/soma/SplineScene";
import { ShaderBackground } from "@/components/soma/ShaderBackground";
import { BrainGlowOverlays } from "@/components/soma/BrainGlowOverlays";
import { ScoresFloating } from "@/components/soma/ScoresFloating";
import { GlowButton } from "@/components/soma/GlowButton";
import { AmbientParticles } from "@/components/soma/AmbientParticles";
import { Waveform, TravelingWave } from "@/components/soma/Waveform";
import type { ScoreSet } from "@/components/soma/RightPanel";

const DEMO_TRACKS = [
  { src: "/demo-track.mp3",   name: "Liminal Drift",  subtitle: "Ambient Focus · 00:30",  bpm: 68, genre: "Ambient",    baselineScores: { attention: 32, focus: 28, motivation: 30, comfort: 40, resistance: 68 }, scores: { attention: 82, focus: 88, motivation: 64, comfort: 94, resistance: 12 }, matchScore: 91 },
  { src: "/demo-track-2.mp3", name: "Neural Cascade", subtitle: "Lo-fi Theta · 00:30",    bpm: 75, genre: "Lo-fi",      baselineScores: { attention: 36, focus: 30, motivation: 38, comfort: 42, resistance: 70 }, scores: { attention: 76, focus: 84, motivation: 72, comfort: 88, resistance: 18 }, matchScore: 87 },
  { src: "/demo-track-3.mp3", name: "Deep Sync",      subtitle: "Binaural Delta · 00:30", bpm: 60, genre: "Binaural",   baselineScores: { attention: 28, focus: 34, motivation: 22, comfort: 48, resistance: 62 }, scores: { attention: 70, focus: 92, motivation: 58, comfort: 96, resistance: 8  }, matchScore: 94 },
  { src: "/demo-track-4.mp3", name: "Alpha Flow",     subtitle: "Neural Ambient · 00:30", bpm: 85, genre: "Electronic", baselineScores: { attention: 40, focus: 32, motivation: 44, comfort: 36, resistance: 72 }, scores: { attention: 88, focus: 80, motivation: 86, comfort: 78, resistance: 22 }, matchScore: 85 },
  { src: "/demo-track-5.mp3", name: "Cortex Wave",    subtitle: "Focus Drift · 00:30",    bpm: 92, genre: "Chillhop",   baselineScores: { attention: 42, focus: 36, motivation: 40, comfort: 38, resistance: 66 }, scores: { attention: 90, focus: 86, motivation: 82, comfort: 80, resistance: 16 }, matchScore: 89 },
];

const FALLBACK_AUDIO_URL = DEMO_TRACKS[0].src;

export interface ActivatedRegion {
  name: string;
  intensity: number;
  position: { left: string; top: string };
  color: string;
  description?: string;
}

interface TargetingPlan {
  musicgen_prompt: string;
  track_name: string;
  track_subtitle: string;
  bpm: number;
  genre: string;
  neural_target?: string;
  baseline_scores?: ScoreSet;
  scores: ScoreSet;
  match_score: number;
  activated_regions?: ActivatedRegion[];
  science_note?: string;
}

interface MusicGenResult {
  audioUrl: string;
  traceId?: string;
  fallback?: boolean;
  fallbackReason?: string;
  upstreamStatus?: number;
}

const SPLINE_SCENE_URL = "https://prod.spline.design/O0cqNA-0Z8TcbPh5/scene.splinecode";

const Index = () => {
  const [currentText, setCurrentText] = useState("Stress is high and my energy is dipping after a long work block.");
  const [targetText, setTargetText] = useState("I want to feel clear, steady, and able to lock into deep focus.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [sequenceComplete, setSequenceComplete] = useState(false);
  const [showWave, setShowWave] = useState(false);
  const [showShader, setShowShader] = useState(false);
  const [brainActive, setBrainActive] = useState(false);
  const [scoresActive, setScoresActive] = useState(false);
  const [brainVisible, setBrainVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [plan, setPlan] = useState<TargetingPlan | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [loadingPhase, setLoadingPhase] = useState<string>("Analyzing neural targets");
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [trackCount, setTrackCount] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const brainTargetRef = useRef<any>(null);
  const rotationRafRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionActiveRef = useRef(false);
  const trackCountRef = useRef(0);
  const isContinuingRef = useRef(false);

  const startSessionTimer = () => {
    if (sessionTimerRef.current) return;
    sessionTimerRef.current = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // ----- Living status narrator messages -----
  const buildStatusMessages = (): string[] => {
    const scores = plan?.scores ?? { attention: 0, focus: 0, motivation: 0, comfort: 0, resistance: 0 };
    const regions = plan?.activated_regions ?? [];
    const topRegion = [...regions].sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0))[0];
    const avgScore =
      Object.values(scores).reduce((a, b) => a + b, 0) / Math.max(1, Object.values(scores).length);
    const cycle = trackCount;

    return [
      `Music targeting ${topRegion?.name ?? "prefrontal circuits"} to bridge your state transition`,
      `Theta-range frequencies activating hippocampal-prefrontal pathways`,
      `Neural momentum building — ${Math.round(avgScore)}% average cortical engagement`,
      topRegion && (topRegion.intensity ?? 0) > 70
        ? `${topRegion.name} showing strong activation — this is where your focus lives`
        : `Warming up cortical circuits — engagement increasing`,
      sessionTime < 30
        ? `Early session — your brain is calibrating to the stimulus`
        : sessionTime < 90
        ? `Mid session — neural patterns stabilising toward your target state`
        : `Deep session — sustained cortical engagement building momentum`,
      cycle > 0
        ? `Cycle ${cycle + 1} — building on previous neural gains`
        : `First cycle — establishing your baseline neural trajectory`,
      scores.resistance < 20
        ? `Low cognitive resistance — your brain is accepting the stimulus cleanly`
        : `Resistance reducing — the music is finding your frequency`,
      scores.focus > 70
        ? `Focus circuits highly engaged — sustained attention pathways active`
        : `Focus pathways warming up — stay with it`,
    ];
  };

  const statusMessages = buildStatusMessages();

  useEffect(() => {
    if (!sequenceComplete) {
      setStatusIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [sequenceComplete, statusMessages.length]);

  // Sync audio element to play state changes (timeupdate)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (audio.duration > 0) setProgress(audio.currentTime / audio.duration);
    };
    const onLoaded = () => {
      if (audio.duration > 0) setDuration(audio.duration);
    };
    const onPlay = () => {
      setIsPlaying(true);
      startSessionTimer();
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      if (sessionActiveRef.current && !isContinuingRef.current) {
        isContinuingRef.current = true;
        setTrackCount((prev) => {
          const next = prev + 1;
          trackCountRef.current = next;
          return next;
        });
        setTimeout(async () => {
          setBrainActive(false);
          await sleep(800);
          try {
            await runGeneration({ continuation: true });
          } finally {
            isContinuingRef.current = false;
          }
        }, 1500);
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const POST_SEQUENCE_DELAY_MS = 7000;

  const playAudioAtEnd = () => {
    setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error("Play failed:", e));
    }, POST_SEQUENCE_DELAY_MS);
  };

  const runGeneration = async ({ continuation = false }: { continuation?: boolean } = {}) => {
    if (isGenerating) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      try {
        const ctx = new AudioCtx();
        ctx.resume();
      } catch (e) {
        console.warn("AudioContext unlock failed:", e);
      }
    }

    const nextIndex = (currentTrackIndex + 1) % DEMO_TRACKS.length;
    setCurrentTrackIndex(nextIndex);
    const demoTrack = DEMO_TRACKS[nextIndex];

    setIsGenerating(true);
    setHasGenerated(true);
    setSequenceComplete(false);
    setBrainActive(false);
    setScoresActive(false);
    setBrainVisible(true);
    setShowWave(false);
    setShowShader(true);
    setProgress(0);
    setPlan(null);
    setAudioUrl(null);

    try {
      setLoadingPhase("Analyzing neural targets");
      const continuationNote = continuation
        ? `Continue session track ${trackCountRef.current + 1}. Maintain neural momentum.`
        : undefined;
      console.log("[generate] phase=targeting start", { continuation, continuationNote });
      const { data: planData, error: planError } = await supabase.functions.invoke("generate-music-targeting", {
        body: {
          currentText,
          targetText,
          currentMoods: [],
          targetMoods: [],
          ...(continuationNote ? { continuationNote } : {}),
        },
      });
      if (planError) throw planError;
      if ((planData as any)?.error) throw new Error((planData as any).error);
      const targetingPlan = planData as TargetingPlan;
      console.log("[generate] phase=targeting ok", { traceId: (planData as any)?.traceId, track: targetingPlan.track_name });
      setPlan(targetingPlan);

      setLoadingPhase("Mapping cortical regions");
      setShowWave(true);
      setTimeout(() => {
        setShowWave(false);
        setShowShader(false);
        setBrainActive(true);
      }, 4000);

      setLoadingPhase("Synthesizing waveform");
      console.log("[generate] phase=lyria start");
      let url: string = demoTrack.src;
      let usedFallback = false;
      try {
        const { data: musicData, error: musicError } = await supabase.functions.invoke("generate-lyria", {
          body: { prompt: targetingPlan.musicgen_prompt, fallbackOnError: true },
        });
        if (musicError) throw musicError;
        if ((musicData as any)?.error) throw new Error((musicData as any).error);
        const result = musicData as MusicGenResult & { lyrics?: string | null };
        url = result.audioUrl;
        usedFallback = result.fallback === true || /^\/demo-track/.test(result.audioUrl ?? "");
        if (result.lyrics) console.log("Generated lyrics/structure:", result.lyrics);
        console.log("[generate] phase=lyria ok", { traceId: result.traceId, fallback: result.fallback });
      } catch (musicErr: any) {
        usedFallback = true;
        url = demoTrack.src;
        console.warn("[generate] phase=lyria failed → using fallback", musicErr?.message ?? musicErr);
      }
      setAudioUrl(url);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
      }

      if (usedFallback) {
        setPlan({
          musicgen_prompt: targetingPlan.musicgen_prompt,
          track_name: demoTrack.name,
          track_subtitle: demoTrack.subtitle,
          bpm: demoTrack.bpm,
          genre: demoTrack.genre,
          baseline_scores: demoTrack.baselineScores,
          scores: demoTrack.scores,
          match_score: demoTrack.matchScore,
        });
      }

      setScoresActive(true);
      setIsGenerating(false);
      setSequenceComplete(true);
      playAudioAtEnd();

      if (!usedFallback) {
        toast.success(`${targetingPlan.track_name} ready`, {
          description: `${targetingPlan.genre} · ${targetingPlan.bpm} BPM · ${targetingPlan.match_score}% match`,
        });
      }
    } catch (e: any) {
      console.error("[generate] fatal", e);
      toast.error("Generation failed", { description: e?.message ?? "Unknown error" });
      setIsGenerating(false);
      setShowWave(false);
      setShowShader(false);
    }
  };

  const handleGenerate = async () => {
    setSessionActive(true);
    sessionActiveRef.current = true;
    await runGeneration({ continuation: false });
  };

  const stopSession = async () => {
    console.log("[stopSession] clicked");

    // 0. Show "Session Complete" confirmation message for 1.5s before fade-out begins
    setShowStopConfirm(true);

    // 1. Stop audio with smooth fade out (~1.5s)
    if (audioRef.current) {
      const audio = audioRef.current;
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.05) {
          audio.volume = Math.max(0, audio.volume - 0.04);
        } else {
          clearInterval(fadeOut);
          audio.pause();
          audio.currentTime = 0;
          audio.src = "";
          audio.volume = 1;
        }
      }, 60);
    }

    // 2. Clear timers immediately, mark session inactive — but don't reset visuals yet
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    setSessionActive(false);
    sessionActiveRef.current = false;
    setIsPlaying(false);

    // Hold the confirmation visible while audio fades
    await sleep(1500);
    setShowStopConfirm(false);

    // 3. Fade out brain region glows first
    setBrainActive(false);
    await sleep(1000);

    // 4. Fade out score panels, track info, waveform (driven by sequenceComplete)
    setSequenceComplete(false);
    setScoresActive(false);
    await sleep(800);

    // 5. Fade out the brain mesh
    setBrainVisible(false);
    await sleep(1200);

    // 6. Silently reset numeric / auxiliary state while UI is faded
    setSessionTime(0);
    setTrackCount(0);
    trackCountRef.current = 0;
    setIsGenerating(false);
    setShowShader(false);
    setShowWave(false);
    setProgress(0);
    setPlan(null);

    // 7. Slide inputs back to center using existing layout transition
    await sleep(200);
    setHasGenerated(false);
  };

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch((e) => console.error("Play failed:", e));
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (p: number) => {
    setProgress(p);
    const audio = audioRef.current;
    if (audio && audio.duration > 0) {
      audio.currentTime = p * audio.duration;
    }
  };

  const switchToTrack = (index: number) => {
    const idx = ((index % DEMO_TRACKS.length) + DEMO_TRACKS.length) % DEMO_TRACKS.length;
    const track = DEMO_TRACKS[idx];
    setCurrentTrackIndex(idx);
    setPlan((prev) => ({
      musicgen_prompt: prev?.musicgen_prompt ?? "",
      track_name: track.name,
      track_subtitle: track.subtitle,
      bpm: track.bpm,
      genre: track.genre,
      baseline_scores: track.baselineScores,
      scores: track.scores,
      match_score: track.matchScore,
    }));
    setProgress(0);
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = track.src;
    audio.load();
    audio.play().then(() => setIsPlaying(true)).catch((e) => console.error("Skip play failed:", e));
  };

  const handleSkipPrev = () => switchToTrack(currentTrackIndex - 1);
  const handleSkipNext = () => switchToTrack(currentTrackIndex + 1);

  const trackName = plan?.track_name ?? "Liminal Drift";
  const trackSubtitle = plan?.track_subtitle ?? "Ambient Focus · 00:30";
  const bpm = plan?.bpm ?? 68;
  const genre = plan?.genre ?? "Ambient";

  const handleSplineLoad = (spline: any) => {
    // Make Spline canvas transparent so background and shader bleed through.
    const canvases = document.querySelectorAll("canvas");
    canvases.forEach((c) => {
      (c as HTMLCanvasElement).style.background = "transparent";
    });

    if (!spline) return;
    // Find a rotatable target: prefer named brain object, fall back to scene root.
    let target: any = null;
    const candidateNames = ["Brain", "brain", "BRAIN", "Mesh", "Object", "Scene", "Group"];
    for (const name of candidateNames) {
      try {
        const obj = spline.findObjectByName?.(name);
        if (obj) {
          target = obj;
          break;
        }
      } catch {
        /* ignore */
      }
    }
    if (!target) {
      try {
        const all = spline.getAllObjects?.();
        if (all && all.length > 0) target = all[0];
      } catch {
        /* ignore */
      }
    }
    if (!target) {
      try {
        target = spline._scene ?? spline.scene ?? null;
      } catch {
        target = null;
      }
    }
    if (!target?.rotation) return;
    brainTargetRef.current = target;
  };

  // Brain rotation fully disabled — no animation, no RAF, no rotation.y increments.
  // Brain must remain 100% static for precise 2D region calibration.

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      <h1 className="sr-only">SOMA — Music-Brain State Matching Dashboard</h1>

      {/* Subtle vignette / atmosphere — z-0 */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, hsl(252 58% 14% / 0.7), transparent 50%), radial-gradient(ellipse at 80% 90%, hsl(192 80% 12% / 0.5), transparent 50%), radial-gradient(ellipse at center, hsl(270 60% 8% / 0.6) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />

      {/* Ambient particle field — z-1 */}
      <AmbientParticles />

      {/* Shader background — fires on generate, z-5 */}
      <ShaderBackground isVisible={showShader} />

      {/* Traveling wave overlay during generation */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 6 }}>
        <TravelingWave isVisible={showWave} />
      </div>

      {/* Initial-state ambient glow — only before generation */}
      {!hasGenerated && (
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 2,
            background:
              "radial-gradient(circle at center, rgba(124,58,237,0.08) 0%, transparent 60%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      )}

      {/* 3D Brain — fills viewport, z-10. Fades in after the input panel finishes moving. */}
      <motion.div
        className="absolute inset-0 spline-host"
        style={{
          zIndex: 10,
          pointerEvents: "none",
          minWidth: "100%",
          minHeight: "100%",
        }}
        initial={{ opacity: 0, scale: 0.8, filter: "blur(8px)" }}
        animate={
          brainVisible
            ? { opacity: 1, scale: 1, filter: "blur(0px)" }
            : { opacity: 0, scale: 0.8, filter: "blur(8px)" }
        }
        transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1], delay: brainVisible ? 1.6 : 0 }}
      >
        <SplineScene
          scene={SPLINE_SCENE_URL}
          className="w-full h-full"
          onLoad={handleSplineLoad}
          fallbackVisible={brainVisible}
        />
      </motion.div>

      {/* Region glow overlays — z-15 */}
      <BrainGlowOverlays active={brainActive} scores={plan?.scores} regions={plan?.activated_regions} />

      {/* Edge vignette — darkens the corners so the brain feels lit from within, z-25 */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 25,
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* ===== Floating UI — z-20 ===== */}

      {/* SOMA logo — top-left (post-generation). Fades in as the centered logo fades out. */}
      <motion.div
        className="absolute top-6 left-6 z-20 pointer-events-none"
        initial={false}
        animate={{ opacity: hasGenerated ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: hasGenerated ? 0.6 : 0 }}
      >
        <img
          src="/soma-logo.png"
          alt="SOMA"
          className="w-16 h-16 object-contain"
          style={{ mixBlendMode: "screen" }}
        />
      </motion.div>

      {/* Top right — status indicator (hidden once Live appears next to track name) */}
      <AnimatePresence>
        {!sequenceComplete && hasGenerated && (
          <motion.div
            key="status-indicator"
            className="absolute top-8 right-8 z-20 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: 0.6 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] uppercase tracking-[0.3em] text-white/40">
              {isGenerating ? "Processing" : "Ready"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top center — track info, only visible after generation */}
      <AnimatePresence>
        {sequenceComplete && (
          <motion.div
            key="track-info"
            className="absolute top-8 left-1/2 -translate-x-1/2 z-20 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut", delay: 0 } }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: 2.8 }}
          >
            <div className="flex items-center justify-center gap-2.5">
              <div className="font-display text-xl text-white tracking-tight">{trackName}</div>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] uppercase tracking-[0.25em] text-emerald-400">Live</span>
            </div>
            <div className="text-[10px] text-white/40 mt-1.5">{trackSubtitle}</div>
            {/* Status lines — narrator + science note only, gap-1 between */}
            <div className="flex flex-col gap-1 mt-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={statusIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.6 }}
                  className="text-[10px] text-white/35 italic text-center max-w-sm mx-auto leading-relaxed"
                >
                  {statusMessages[statusIndex]}
                </motion.div>
              </AnimatePresence>
              {plan?.science_note && (
                <div className="text-[9px] text-white/25 max-w-xs leading-relaxed italic mx-auto">
                  {plan.science_note}
                </div>
              )}
            </div>
            {/* Condensed meta line — BPM · genre · track · session */}
            <div className="text-[9px] text-white/20 uppercase tracking-widest mt-1.5">
              {bpm} BPM · {genre} · Track {trackCount + 1} · {formatTime(sessionTime)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stop Session button — above input panel, only when audio is playing */}
      <AnimatePresence>
        {sequenceComplete && isPlaying && (
          <motion.button
            key="stop-session-btn"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onClick={() => stopSession()}
            style={{ pointerEvents: "auto" }}
            className="absolute bottom-4 left-8 z-[60] w-[280px] border border-white/20 text-white/40 text-xs uppercase tracking-widest rounded-full py-2 hover:border-red-400/40 hover:text-red-400/60 transition-all cursor-pointer"
          >
            ■ Stop Session
          </motion.button>
        )}
      </AnimatePresence>

      {/* Animated input panel — centered initially, slides to bottom-left on generate */}
      <motion.div
        className="absolute z-20"
        initial={false}
        animate={
          hasGenerated
            ? {
                left: "32px",
                top: "auto",
                bottom: "32px",
                x: 0,
                y: 0,
                scale: [1, 0.92, 1],
              }
            : {
                left: "50%",
                top: "50%",
                bottom: "auto",
                x: "-50%",
                y: "-50%",
                scale: 1,
              }
        }
        transition={{
          duration: 1.8,
          ease: [0.4, 0, 0.2, 1],
          delay: hasGenerated ? 0.2 : 0,
          scale: { duration: 1.8, times: [0, 0.5, 1], ease: [0.4, 0, 0.2, 1], delay: hasGenerated ? 0.2 : 0 },
        }}
        style={{ width: "340px" }}
      >
        {/* Centered SOMA logo above inputs — only visible in the initial state */}
        <motion.div
          initial={false}
          animate={{ opacity: hasGenerated ? 0 : 1, scale: hasGenerated ? 0.8 : 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex justify-center mb-8"
        >
          <img
            src="/soma-logo.png"
            alt="SOMA"
            className="w-32 h-32 object-contain"
            style={{ mixBlendMode: "screen" }}
          />
        </motion.div>

        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2 font-medium">
            Current State
          </div>
          <textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            className="w-full bg-black/30 backdrop-blur-md border border-white/[0.1] rounded-2xl p-4 text-sm text-white/90 placeholder-white/30 resize-none h-20 focus:outline-none focus:border-purple-500/50 transition-all"
            placeholder="How do you feel right now..."
          />
        </div>
        <div className="mb-5">
          <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2 font-medium">
            Target State
          </div>
          <textarea
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            className="w-full bg-black/30 backdrop-blur-md border border-white/[0.1] rounded-2xl p-4 text-sm text-white/90 placeholder-white/30 resize-none h-20 focus:outline-none focus:border-purple-500/50 transition-all"
            placeholder="Where do you want to be..."
          />
        </div>
        <GlowButton onClick={handleGenerate} isLoading={isGenerating} loadingText={loadingPhase} />
      </motion.div>

      {/* Right side — neural scores, only visible after generation */}
      <AnimatePresence>
        {sequenceComplete && (
          <motion.div
            key="scores-panel"
            className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-56"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut", delay: 0 } }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: 2.5 }}
          >
            <ScoresFloating
              active={scoresActive}
              isPlaying={isPlaying}
              progress={progress}
              baselineScores={plan?.baseline_scores}
              targetScores={plan?.scores}
              matchScore={plan?.match_score}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom center — audio player */}
      <AnimatePresence>
        {sequenceComplete && (
          <motion.div
            key="waveform-player"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[420px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut", delay: 0 } }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: 3.0 }}
          >
            <Waveform
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              progress={progress}
              onSeek={handleSeek}
              onSkipPrev={handleSkipPrev}
              onSkipNext={handleSkipNext}
              duration={duration}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status chip — center, during generation */}
      {isGenerating && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 text-center animate-pulse">
            {loadingPhase}
          </div>
        </div>
      )}

      {/* Stop Session confirmation — flashes briefly before fade-out */}
      <AnimatePresence>
        {showStopConfirm && (
          <motion.div
            key="stop-confirm"
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <div className="text-center">
              <div className="text-sm text-white/60 uppercase tracking-widest">Session Complete</div>
              <div className="text-[10px] text-white/25 mt-2 tracking-wider">
                {formatTime(sessionTime)} · {trackCount + 1} track{trackCount !== 0 ? "s" : ""} · {trackCount} cycle{trackCount !== 1 ? "s" : ""}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} src={FALLBACK_AUDIO_URL} preload="auto" />
    </div>
  );
};

export default Index;
