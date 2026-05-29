import React, { useState, useEffect, useRef } from "react";
import { HERO_COSMIC_CATALOG, CosmicObject } from "../types";
import { Search, Compass, ShieldAlert, Sliders, Play, Pause, FastForward, Navigation2, Network } from "lucide-react";

interface WarpDashboardProps {
  onSelectObject: (obj: CosmicObject | null) => void;
  activeObject: CosmicObject | null;
  selectedFilter: string;
  onSetFilter: (filter: string) => void;
  visualizationMode: "default" | "density" | "metallicity" | "velocity";
  onSetVisMode: (mode: "default" | "density" | "metallicity" | "velocity") => void;
  timeOffset: number; // -100,000 to +100,000 Years
  onSetTimeOffset: (offset: number) => void;
  cameraMode: "free" | "cinematic" | "spaceship" | "god";
  onSetCameraMode: (mode: "free" | "cinematic" | "spaceship" | "god") => void;
  isPlayingTime: boolean;
  onSetIsPlayingTime: (playing: boolean) => void;
  onResetToBirdsEye?: () => void;
}

export default function WarpDashboard({
  onSelectObject,
  activeObject,
  selectedFilter,
  onSetFilter,
  visualizationMode,
  onSetVisMode,
  timeOffset,
  onSetTimeOffset,
  cameraMode,
  onSetCameraMode,
  isPlayingTime,
  onSetIsPlayingTime,
  onResetToBirdsEye
}: WarpDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CosmicObject[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Search autocomplete query filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = HERO_COSMIC_CATALOG.filter(
      (obj) =>
        obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (obj.commonName && obj.commonName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setSearchResults(filtered);
  }, [searchQuery]);

  // Paint the top-down 2D Vector Minimap Canvas every time active object shifts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw background outer galactic boundaries
    ctx.strokeStyle = "rgba(0,180,216,0.12)";
    ctx.lineWidth = 1;
    for (let r = 20; r <= 95; r += 20) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Grid coordinates lines
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Draw central Sagittarius A* core
    ctx.fillStyle = "rgba(114,9,183,0.9)";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Map orbital representation of Sol on Z-axis (at radius ~65px)
    const solX = w / 2;
    const solY = h / 2 + 55; // 26,000 ly scaled coordinates representative
    ctx.fillStyle = "#ffd60a";
    ctx.beginPath();
    ctx.arc(solX, solY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Sol text indicator label
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "8px monospace";
    ctx.fillText("Sol", solX + 5, solY + 3);

    // Draw active target locked line
    if (activeObject) {
      // Scale active positions: Sgr A* at (0,0) vs Sol neighborhood Z index
      const ox = activeObject.position[0];
      const oz = activeObject.position[2];

      // Downscale Z coordinates roughly (max Z radius around 30000)
      const scaledX = w / 2 + (ox / 30000) * 55;
      const scaledY = h / 2 + (oz / 30000) * 55;

      ctx.strokeStyle = "rgba(0,180,216,0.7)";
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(scaledX, scaledY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset

      ctx.fillStyle = "#ff0073";
      ctx.beginPath();
      ctx.arc(scaledX, scaledY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Pulse ring animation
      ctx.strokeStyle = "rgba(255,0,115,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(scaledX, scaledY, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [activeObject]);

  const handleSelectResult = (obj: CosmicObject) => {
    onSelectObject(obj);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handlePresetYearJump = (val: number) => {
    onSetTimeOffset(val);
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 flex flex-col lg:flex-row gap-4 items-stretch justify-between font-mono z-30 pointer-events-none select-none">
      {/* 1. Left controls panel: Star Search, Filter, Camera Selection */}
      <div className="flex-1 max-w-sm pointer-events-auto glass-panel rounded-2xl p-5 shadow-2xl flex flex-col gap-4 min-w-[300px] border-glow-cyan scanline">
        {/* Stellar Autocomplete Search */}
        <div className="relative">
          <label className="text-[10px] text-white/40 uppercase tracking-[0.2em] block mb-2 font-bold">Look up Stars or Nebulae</label>
          <div className="flex bg-white/5 border border-white/10 focus-within:border-cyan-400 rounded-xl overflow-hidden transition-all duration-300">
            <span className="p-2.5 text-white/45">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search eg: 'Betelgeuse', 'Sun'..."
              className="flex-1 bg-transparent py-2 pr-2 focus:outline-none text-[11px] text-white placeholder-white/30"
            />
          </div>

          {/* Autocomplete Lists mapping */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 border border-white/10 rounded-xl max-h-48 overflow-y-auto z-50 shadow-2xl divide-y divide-white/5 custom-scrollbar text-xs backdrop-blur-2xl">
              {searchResults.map((obj) => (
                <div
                  key={obj.id}
                  onClick={() => handleSelectResult(obj)}
                  className="p-3 hover:bg-white/5 cursor-pointer flex justify-between items-center text-left"
                >
                  <div>
                    <span className="text-white font-semibold">{obj.name}</span>
                    <span className="text-[10px] text-cyan-400 ml-2 block italic">{obj.commonName || obj.type.toUpperCase()}</span>
                  </div>
                  <span className="text-[10px] text-white/50">{Math.round(obj.distance).toLocaleString()} ly</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Camera Views Selection Options */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-[0.2em] block mb-2 font-bold">Orbit Cruise Controls</label>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {(["free", "cinematic", "spaceship", "god"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onSetCameraMode(mode)}
                className={`py-2 rounded-lg text-[9px] border tracking-wider uppercase transition-all duration-300 ${
                  cameraMode === mode
                    ? "bg-white text-black font-extrabold border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    : "bg-white/5 border-white/10 text-white/45 hover:text-white hover:bg-white/10"
                }`}
              >
                {mode === "free" ? "Orbit" : mode === "god" ? "Outer" : mode}
              </button>
            ))}
          </div>

          <button
            onClick={onResetToBirdsEye}
            className="w-full py-2.5 px-3 rounded-lg text-[9px] border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/40 hover:border-cyan-400/50 flex items-center justify-center gap-1.5 font-bold tracking-wider uppercase transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <Compass className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            Galactic Birds-Eye View
          </button>
        </div>

        {/* Catalog Categories checklist filter */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-[0.2em] block mb-2 font-bold">Display Filter Outlines</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "All Structures", val: "all" },
              { label: "Black Holes", val: "black_hole" },
              { label: "Star Systems", val: "star" },
              { label: "Exoplanets", val: "exoplanet" },
              { label: "Nebulae", val: "nebula" },
              { label: "Star Clusters", val: "cluster" },
            ].map((cat) => (
              <button
                key={cat.val}
                onClick={() => onSetFilter(cat.val)}
                className={`px-2.5 py-1 text-[9px] rounded-lg border transition-all duration-300 tracking-wider ${
                  selectedFilter === cat.val
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Middle panel: 100,000 Year Time scrubber */}
      <div className="flex-grow pointer-events-auto glass-panel rounded-2xl p-5 shadow-2xl flex flex-col justify-between gap-4 lg:mx-2 max-w-xl border-glow-violet scanline">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <div>
            <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] block font-bold">Cosmic Era Timeline</span>
            <span className="text-sm font-light text-white font-display">
              {timeOffset === 0 ? "Present Era (2026 AD)" : timeOffset > 0 ? `+ ${timeOffset.toLocaleString()} Yrs (Future)` : `${Math.abs(timeOffset).toLocaleString()} Yrs (Past Era)`}
            </span>
          </div>
          <p className="text-[9px] text-cyan-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse">
            Stellar Orbital Drift Active
          </p>
        </div>

        {/* Timeline Range Scroll Input */}
        <div className="space-y-2">
          <input
            type="range"
            min="-100000"
            max="100000"
            step="1000"
            value={timeOffset}
            onChange={(e) => onSetTimeOffset(Number(e.target.value))}
            className="w-full h-1 bg-white/10 accent-cyan-400 rounded-lg appearance-none cursor-pointer focus:outline-none"
          />
          <div className="flex justify-between text-[9px] text-white/30 uppercase tracking-widest font-semibold font-mono">
            <span>-100,000 Years</span>
            <span onClick={() => onSetTimeOffset(0)} className="hover:text-cyan-400 cursor-pointer text-white underline decoration-white/20">Present Day [0]</span>
            <span>+100,000 Years</span>
          </div>
        </div>

        {/* Orbit simulation play buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSetIsPlayingTime(!isPlayingTime)}
              className={`p-2 rounded-xl border transition-all duration-300 ${
                isPlayingTime 
                  ? "bg-cyan-500/20 text-cyan-350 border-cyan-400/80 shadow-[0_0_15px_rgba(0,180,216,0.3)] font-bold animate-pulse" 
                  : "bg-white/5 text-white/50 border border-white/10 hover:text-white hover:bg-white/10"
              }`}
            >
              {isPlayingTime ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[10px] text-white/45">Orbits Speed: 1800x</span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => handlePresetYearJump(-50000)}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 hover:text-white text-[9px] rounded-lg border border-white/10 transition-all font-mono tracking-wider active:scale-95"
            >
              -50K PAST
            </button>
            <button
              onClick={() => handlePresetYearJump(50000)}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 hover:text-white text-[9px] rounded-lg border border-white/10 transition-all font-mono tracking-wider active:scale-95"
            >
              +50K FUTURE
            </button>
          </div>
        </div>
      </div>

      {/* 3. Right panel: Top-Down 2D Minimap vector & Data Overlays selection */}
      <div className="pointer-events-auto glass-panel rounded-2xl p-5 shadow-2xl flex flex-col justify-between align-middle gap-4 w-[240px] border-glow-cyan scanline">
        <label className="text-[10px] text-white/40 uppercase tracking-[0.2em] block text-left font-bold">Sector Mapping [2D XY]</label>
        <div className="mx-auto border border-white/10 rounded-xl p-1 bg-black/40 overflow-hidden relative">
          <canvas ref={canvasRef} width={100} height={100} className="block w-24 h-24 mx-auto opacity-80" />
          <div className="absolute top-1 left-1.5 text-[8px] text-white/40 select-none font-mono">2D MAP</div>
        </div>

        {/* Heat maps and scientific analytical mode overlays */}
        <div>
          <label className="text-[9px] text-white/40 uppercase tracking-[0.2em] block text-left mb-2 font-bold">Analytical Maps</label>
          <div className="grid grid-cols-2 gap-1.5 text-[8px] tracking-wider font-mono">
            {[
              { label: "Visible Spectrum", val: "default" },
              { label: "Stellar Density", val: "density" },
              { label: "Metal Percent", val: "metallicity" },
              { label: "Velocity Shifts", val: "velocity" },
            ].map((mode) => (
              <button
                key={mode.val}
                onClick={() => onSetVisMode(mode.val as any)}
                className={`py-1.5 rounded-lg border text-center transition-all duration-300 leading-3 tracking-wider ${
                  visualizationMode === mode.val
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
