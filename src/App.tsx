import { useState, useEffect, useRef } from "react";
import GalaxyCanvas from "./components/GalaxyCanvas";
import InfoPanel from "./components/InfoPanel";
import GuidedTourPanel from "./components/GuidedTourPanel";
import WarpDashboard from "./components/WarpDashboard";
import { HERO_COSMIC_CATALOG, CosmicObject, CollaborativeUser } from "./types";
import { spaceSynths } from "./utils/audio";
import { Volume2, VolumeX, Orbit, Info, Compass, ShieldAlert, Sliders, Radio, Link, Link2 } from "lucide-react";

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
  const [birdsEyeTrigger, setBirdsEyeTrigger] = useState<number>(0);

  // Collaborative spaceships state triggers
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [collaborativeUsers, setCollaborativeUsers] = useState<CollaborativeUser[]>([]);
  const [crewMessages, setCrewMessages] = useState<Array<{ senderId: string; username: string; text: string; time: string; avatarEmoji: string; avatarColor: string }>>([]);
  const [activeBookmarks, setActiveBookmarks] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  
  const wsRef = useRef<WebSocket | null>(null);
  const frameCountRef = useRef<number>(0);

  // Synchronize ship crew over sub-space radio network frequencies
  useEffect(() => {
    const isSecure = window.location.protocol === "https:";
    const wsProtocol = isSecure ? "wss:" : "ws:";
    const wsPort = window.location.port ? `:${window.location.port}` : "";
    const wsUrl = `${wsProtocol}//${window.location.hostname}${wsPort}`;

    console.log("Connecting Subspace Radio channel...", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Telemetry transceiver synchronized!");
      setWsStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "welcome": {
            setActiveUserId(msg.id);
            setCollaborativeUsers(msg.users);
            if (msg.bookmarks) {
              setActiveBookmarks(msg.bookmarks);
            }
            break;
          }
          case "init": {
            setCollaborativeUsers(msg.users);
            if (msg.bookmarks) {
              setActiveBookmarks(msg.bookmarks);
            }
            break;
          }
          case "user_joined": {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setCrewMessages(prev => [
              ...prev,
              {
                senderId: "system",
                username: "TELEMETRY SYNAPSE",
                avatarEmoji: "📡",
                avatarColor: "#22d3ee",
                text: `${msg.user.username} entered active sector orbit.`,
                time: timestamp
              }
            ]);
            break;
          }
          case "user_left": {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setCrewMessages(prev => [
              ...prev,
              {
                senderId: "system",
                username: "TELEMETRY CONTACT",
                avatarEmoji: "🛰️",
                avatarColor: "#64748b",
                text: `${msg.username} lost visual telemetry locks.`,
                time: timestamp
              }
            ]);
            break;
          }
          case "state_update": {
            setCollaborativeUsers(msg.users);
            break;
          }
          case "chat_broadcast": {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setCrewMessages(prev => [
              ...prev,
              {
                senderId: msg.senderId,
                username: msg.username,
                avatarEmoji: msg.avatarEmoji,
                avatarColor: msg.avatarColor,
                text: msg.text,
                time: timestamp
              }
            ]);
            break;
          }
          case "bookmark_added": {
            setActiveBookmarks(prev => {
              if (prev.includes(msg.objectId)) return prev;
              return [...prev, msg.objectId];
            });
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setCrewMessages(prev => [
              ...prev,
              {
                senderId: "system",
                username: "COORDINATE LOCK",
                avatarEmoji: "★",
                avatarColor: "#eab308",
                text: `${msg.username} tagged target lock on ${msg.objectId.replace(/_/g, " ")}.`,
                time: timestamp
              }
            ]);
            break;
          }
          case "bookmark_removed": {
            setActiveBookmarks(prev => prev.filter(id => id !== msg.objectId));
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setCrewMessages(prev => [
              ...prev,
              {
                senderId: "system",
                username: "COORDINATE LOCK",
                avatarEmoji: "☆",
                avatarColor: "#64748b",
                text: `${msg.username} released target lock on ${msg.objectId.replace(/_/g, " ")}.`,
                time: timestamp
              }
            ]);
            break;
          }
          default:
            break;
        }
      } catch (err) {
        console.warn("Telemetry packet parse issue", err);
      }
    };

    ws.onclose = () => {
      console.warn("Subspace transceivers link closed.");
      setWsStatus("disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleCameraChange = (pos: [number, number, number], target: [number, number, number]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    frameCountRef.current++;
    if (frameCountRef.current % 10 !== 0) return;

    wsRef.current.send(JSON.stringify({
      type: "state_update",
      cameraPos: pos,
      cameraTarget: target
    }));
  };

  const handleToggleBookmark = () => {
    if (!selectedObject || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const isBookmarked = activeBookmarks.includes(selectedObject.id);
    wsRef.current.send(JSON.stringify({
      type: isBookmarked ? "remove_bookmark" : "add_bookmark",
      objectId: selectedObject.id
    }));
  };

  const handleSendCrewMessage = (text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: "chat",
      text
    }));
  };

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
          <div className="hidden md:flex items-center gap-4 pr-3 text-[10px] font-mono select-none">
            <div className="flex items-center gap-3 pr-4 text-[10px] font-mono text-white/45 border-r border-white/10 py-1">
              <span className="text-slate-500">ENGINE:</span>
              <span className="text-cyan-400">WebGPU [60 FPS]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 uppercase text-[9px]">Crew Stream:</span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  wsStatus === "connected" ? "bg-cyan-400 animate-pulse" : "bg-red-500"
                }`} />
                <span className="text-white font-bold uppercase tracking-wider text-[8px]">
                  {wsStatus === "connected" ? `${collaborativeUsers.length} Online` : "Offline"}
                </span>
              </div>
            </div>
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
          collaborativeUsers={collaborativeUsers}
          activeUserId={activeUserId}
          onCameraChange={handleCameraChange}
          showSplash={showSplash}
          birdsEyeTrigger={birdsEyeTrigger}
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
            isBookmarked={selectedObject ? activeBookmarks.includes(selectedObject.id) : false}
            onToggleBookmark={handleToggleBookmark}
            activeUserId={activeUserId}
            crewMessages={crewMessages}
            onSendCrewMessage={handleSendCrewMessage}
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
          onResetToBirdsEye={() => {
            setBirdsEyeTrigger(prev => prev + 1);
            setCameraMode("free");
          }}
        />
      </div>

      {/* 5. Floating Navigational help overlay on Solary loads */}
      {showSplash && (
        <div
          id="splash-screen"
          className="absolute inset-0 bg-[#020308]/95 flex items-center justify-center z-50 pointer-events-auto select-none"
        >
          <div className="max-w-md glass-panel p-8 rounded-2xl shadow-2xl text-center space-y-6 border-glow-cyan scanline">
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
