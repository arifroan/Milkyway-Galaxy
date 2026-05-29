import React, { useState, useEffect } from "react";
import { GuidedTour, GUIDED_TOURS, CosmicObject, HERO_COSMIC_CATALOG } from "../types";
import { Compass, GraduationCap, ChevronLeft, ChevronRight, Play, Pause, X, Info } from "lucide-react";

interface GuidedTourPanelProps {
  onSelectObject: (obj: CosmicObject | null) => void;
  activeObject: CosmicObject | null;
  onSelectCameraMode: (mode: "free" | "cinematic" | "spaceship" | "god") => void;
}

export default function GuidedTourPanel({ onSelectObject, activeObject, onSelectCameraMode }: GuidedTourPanelProps) {
  const [activeTour, setActiveTour] = useState<GuidedTour | null>(null);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [isAutoplay, setIsAutoplay] = useState<boolean>(false);

  // Auto-play timer loop
  useEffect(() => {
    if (!isAutoplay || !activeTour) return;

    const currentStep = activeTour.steps[activeStepIdx];
    const duration = currentStep ? 7500 : 10000; // Time spent on this slide before advancing

    const timer = setTimeout(() => {
      if (activeStepIdx < activeTour.steps.length - 1) {
        handleStepChange(activeStepIdx + 1);
      } else {
        // Reset to end
        setIsAutoplay(false);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [isAutoplay, activeTour, activeStepIdx]);

  const handleStartTour = (tour: GuidedTour) => {
    setActiveTour(tour);
    setActiveStepIdx(0);
    setIsAutoplay(true);
    onSelectCameraMode("cinematic");
    handleStepChange(0, tour);
  };

  const handleStepChange = (idx: number, tourOverride?: GuidedTour) => {
    const tour = tourOverride || activeTour;
    if (!tour) return;

    setActiveStepIdx(idx);
    const step = tour.steps[idx];
    if (step) {
      // Find the hero astronomical object in our global files
      const matchedHero = HERO_COSMIC_CATALOG.find(c => c.id === step.targetId);
      if (matchedHero) {
        onSelectObject(matchedHero);
      }
    }
  };

  const handleEndTour = () => {
    setActiveTour(null);
    setIsAutoplay(false);
    onSelectCameraMode("free");
  };

  return (
    <div
      id="guided-tour-panel"
      className="absolute top-4 right-4 w-[360px] glass-panel rounded-2xl shadow-2xl p-5 text-white font-sans z-30 select-none overflow-hidden scanline"
    >
      {!activeTour ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <GraduationCap className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-medium text-white text-sm uppercase tracking-wider">
              Guided Space Lectures
            </h3>
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed font-sans">
            Choose an interactive planetarium curriculum. Our autopilot will sweep the telemetry camera to selected coordinate hubs while displaying real-time scientific telemetry guides.
          </p>

          <div className="space-y-2 mt-2">
            {GUIDED_TOURS.map((tour) => (
              <div
                key={tour.id}
                onClick={() => handleStartTour(tour)}
                className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 cursor-pointer transition flex items-start justify-between group"
              >
                <div className="flex-1 pr-2">
                  <h4 className="text-[11px] font-bold font-mono text-white group-hover:text-cyan-300 transition-colors uppercase">
                    {tour.title}
                  </h4>
                  <p className="text-[10px] text-white/40 mt-1 line-clamp-2 leading-tight">
                    {tour.description}
                  </p>
                </div>
                <div className="text-right flex flex-col justify-between items-end h-full">
                  <span className="text-[9px] text-cyan-400 font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                    {tour.durationString}
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono mt-3.5 group-hover:underline flex items-center gap-0.5">
                    Launch <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <p className="text-xs font-bold font-mono text-cyan-400 truncate uppercase tracking-wider">
                {activeTour.title}
              </p>
            </div>
            <button
              onClick={handleEndTour}
              className="text-white/60 hover:text-white hover:bg-white/5 p-1 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center gap-1">
            {activeTour.steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleStepChange(idx)}
                className={`h-1 rounded-full transition-all flex-1 ${
                  idx === activeStepIdx
                    ? "bg-cyan-400 shadow-md shadow-cyan-400/30"
                    : idx < activeStepIdx
                    ? "bg-white/40"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>

          {/* Step body */}
          <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex justify-between items-center text-[10px] font-mono pr-1">
              <span className="text-white/45 uppercase tracking-wider">
                STAGE {activeStepIdx + 1} OF {activeTour.steps.length}
              </span>
              <span className="text-cyan-400 flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                <Info className="w-3 h-3 text-cyan-450" /> Autopilot Lock
              </span>
            </div>

            <h4 className="text-sm font-bold text-white font-display leading-tight uppercase">
              {activeTour.steps[activeStepIdx]?.title}
            </h4>

            <p className="text-[11px] text-white/70 leading-relaxed font-sans mt-1">
              {activeTour.steps[activeStepIdx]?.description}
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between font-mono text-xs">
            <button
              disabled={activeStepIdx === 0}
              onClick={() => handleStepChange(activeStepIdx - 1)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition flex items-center gap-1 border border-white/10"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>

            {/* Play / Pause Autoplay */}
            <button
              onClick={() => setIsAutoplay(!isAutoplay)}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 border ${
                isAutoplay
                  ? "bg-cyan-500/10 border-cyan-400/50 text-cyan-300 font-bold"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {isAutoplay ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-cyan-400" /> Auto-playing
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 opacity-60" /> Pause Slides
                </>
              )}
            </button>

            {activeStepIdx < activeTour.steps.length - 1 ? (
              <button
                onClick={() => handleStepChange(activeStepIdx + 1)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition flex items-center gap-1 border border-white/10"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleEndTour}
                className="px-3 py-1.5 rounded-lg bg-white text-black font-extrabold transition flex items-center gap-1 border-0 active:scale-95"
              >
                Finish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
