import { useState, useEffect } from "react";
import GalaxyCanvas from "./components/GalaxyCanvas";
import InfoPanel from "./components/InfoPanel";
import GuidedTourPanel from "./components/GuidedTourPanel";
import WarpDashboard from "./components/WarpDashboard";
import { HERO_COSMIC_CATALOG, CosmicObject } from "./types";
import { spaceSynths } from "./utils/audio";
import { Volume2, VolumeX, Orbit, Info, Compass, ShieldAlert, Sliders } from "lucide-react";

export default function App() {
  const [selectedObject, setSelectedObject] = useState<CosmicObject | null>(null);
  const [visualizationMode, setVisualizationMode] = useState<"default" | "density" | "metallicity" | "velocity">("default");
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [cameraMode, setCameraMode] = useState<"free" | "cinematic" | "spaceship" | "god">("free");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isPlayingTime, setIsPlayingTime] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [warpTriggered, setWarpTriggered] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Toggle ambient synthesizers safely based on muting selections
  const handleToggleMute = () => {
    if (isMuted) {
      spaceSynths.startAmbientHum();
      setIsMuted(false);
    } else {
      spaceSynths.stopAmbientHum();
      setIsMuted(true);
    }
  };

  // Turn on ambient hum after first user clicks anywhere to satisfy browser gesture prerequisites
  useEffect(() => {
    const handleGesture = () => {
      // Don't auto-start loud hums - wait for user to click mute button
      // But we initialize audio context
    };
    window.addEventListener("click", handleGesture);
    return () => window.removeEventListener("click", handleGesture);
  }, []);

  // Filter cosmic hero targets based on active catalog selection checkboxes
  const handleSelectObject = (obj: CosmicObject | null) => {
    setSelectedObject(obj);
  };

  const handleInitiateWarp = () => {
    setWarpTriggered(true);
    setTimeout(() => setWarpTriggered(false), 1200);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#00050a] flex flex-col items-stretch justify-between select-none font-sans text-white">
      
      {/* 1. Header Navigation Bar */}
      <header className="relative w-full h-16 bg-black/60 border-b border-white/10 backdrop-blur-md px-6 flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <Orbit className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: "10s" }} />
          <div>
            <h1 className="text-xs font-bold font-mono tracking-[0.3em] text-cyan-400 uppercase">
              GALACTIC EXPLORER
            </h1>
            <p className="text-lg font-light tracking-tighter text-white font-display">
              MILKY WAY <span className="font-extrabold text-white">CORE OBSERVATORY</span>
            </p>
          </div>
        </div>

        {/* Dynamic header status lines */}
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-3 pr-4 text-[10px] font-mono text-white/45">
            <span className="text-slate-500">ENGINE STATUS:</span>
            <span className="text-cyan-400">WebGPU: ACTIVE [60 FPS]</span>
          </div>

          <button
            onClick={handleToggleMute}
            className={`px-3 py-1.5 rounded-full border transition-all duration-300 text-[10px] font-mono uppercase tracking-wider select-none flex items-center gap-2 ${
              !isMuted
                ? "bg-cyan-500/20 border-cyan-400/80 text-cyan-300 shadow-[0_0_15px_rgba(0,180,216,0.25)]"
                : "bg-white/5 border-white/10 text-white/50 hover:text-white"
            }`}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 opacity-60" />
                <span>Ambient Off</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Space Drone Actived</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. Interactive 3D WebGL Canvas Layer */}
      <main className="absolute inset-0 w-full h-full z-10 select-none">
        <GalaxyCanvas
          selectedObject={selectedObject}
          onSelectObject={handleSelectObject}
          visualizationMode={visualizationMode}
          timeOffset={timeOffset}
          cameraMode={cameraMode}
          isPlayingTime={isPlayingTime}
          warpTriggered={warpTriggered}
        />
      </main>

      {/* 3. Outer Floating Panels & Grids (Locked to Layer 30 over the Canvas) */}
      <div className="absolute top-16 left-0 right-0 bottom-4 pointer-events-none z-20 flex justify-between select-none">
        {/* Left Hand: Info and Telemetry Panel */}
        <div className="pointer-events-auto h-full pl-4">
          <InfoPanel
            selectedObject={selectedObject}
            onClose={() => handleSelectObject(null)}
            onInitiateWarp={handleInitiateWarp}
          />
        </div>

        {/* Right Hand: Interactive Guided Tour panel */}
        <div className="pointer-events-auto h-full pr-4">
          <GuidedTourPanel
            onSelectObject={handleSelectObject}
            activeObject={selectedObject}
            onSelectCameraMode={setCameraMode}
          />
        </div>
      </div>

      {/* 4. Timeline Controls and Autocomplete Sector Map (Locked to footer area) */}
      <div className="relative w-full z-30 pointer-events-none">
        <WarpDashboard
          onSelectObject={handleSelectObject}
          activeObject={selectedObject}
          selectedFilter={selectedFilter}
          onSetFilter={setSelectedFilter}
          visualizationMode={visualizationMode}
          onSetVisMode={setVisualizationMode}
          timeOffset={timeOffset}
          onSetTimeOffset={setTimeOffset}
          cameraMode={cameraMode}
          onSetCameraMode={setCameraMode}
          isPlayingTime={isPlayingTime}
          onSetIsPlayingTime={setIsPlayingTime}
        />
      </div>

      {/* 5. Floating Navigational help overlay on Solary loads */}
      {showSplash && (
        <div
          id="splash-screen"
          className="absolute inset-0 bg-[#00050a]/90 backdrop-blur-xl flex items-center justify-center z-50 pointer-events-auto select-none"
        >
          <div className="max-w-md bg-black/60 border border-white/10 p-8 rounded-2xl shadow-2xl text-center space-y-6 backdrop-blur-2xl">
            <Orbit className="w-16 h-16 text-cyan-400 mx-auto animate-spin" style={{ animationDuration: "12s" }} />
            
            <div className="space-y-2">
              <h2 className="text-2xl font-mono font-bold text-white tracking-widest uppercase">
                Milky Way Galaxy
              </h2>
              <p className="text-xs text-cyan-400 uppercase tracking-widest font-mono">
                Ultimate 3D Science Simulator
              </p>
            </div>

            <p className="text-xs text-white/70 leading-relaxed text-center font-sans">
              Welcome, Commander. You are looking at a real-time WebGL map of our home galaxy. We have plotted over 65,000 stars along the spiral arms with a fully detailed accretion model of the central supermassive black hole Sagittarius A*.
            </p>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-[10px] font-mono text-left space-y-2">
              <p className="text-cyan-400 font-bold uppercase mb-0.5">Navigation Protocol:</p>
              <p className="text-white/60">• <span className="text-white font-medium">Drag Left Click:</span> Rotate the camera index sphere</p>
              <p className="text-white/60">• <span className="text-white font-medium">Drag Right Click:</span> Pan workspace coordinates</p>
              <p className="text-white/60">• <span className="text-white font-medium">Scroll Wheel:</span> Zoom inward or zoom outward</p>
              <p className="text-white/60">• <span className="text-white font-medium">Ambient Drone:</span> Unmute for simulated sub-space hums</p>
            </div>

            <button
              onClick={() => {
                setShowSplash(false);
                spaceSynths.startAmbientHum();
                setIsMuted(false);
              }}
              className="w-full py-3 bg-white text-black hover:bg-slate-200 font-mono text-xs font-bold rounded-xl transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.25)] tracking-widest uppercase active:scale-[0.98]"
            >
              Initiate System Sensors
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
