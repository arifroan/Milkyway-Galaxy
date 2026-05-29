import React, { useState, useEffect, useRef } from "react";
import { CosmicObject } from "../types";
import { Sparkles, Send, Globe, Radio, Compass, Orbit, AlertCircle, Info, ChevronRight, HelpCircle } from "lucide-react";

interface InfoPanelProps {
  selectedObject: CosmicObject | null;
  onClose: () => void;
  onInitiateWarp: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  activeUserId: string | null;
  crewMessages: Array<{ senderId: string; username: string; text: string; time: string; avatarEmoji: string; avatarColor: string }>;
  onSendCrewMessage?: (text: string) => void;
}

export default function InfoPanel({
  selectedObject,
  onClose,
  onInitiateWarp,
  isBookmarked,
  onToggleBookmark,
  activeUserId,
  crewMessages,
  onSendCrewMessage
}: InfoPanelProps) {
  const [aiReport, setAiReport] = useState<string>("");
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<{ sender: 'crew' | 'advisor'; text: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"telemetry" | "analysis" | "satellites">("telemetry");
  const [chatChannel, setChatChannel] = useState<"advisor" | "crew">("advisor");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch astronomical analysis report from Gemini proxy on target selection
  useEffect(() => {
    if (!selectedObject) return;
    setAiReport("");
    setIsLoadingReport(true);
    // Reset chat history with initial AI Greeting
    setChatHistory([
      {
        sender: "advisor",
        text: `Commander, we have stabilized our orbit around **${selectedObject.name}**. Scientific data channels are primed. Ask me anything about this sector's thermal dynamics or stellar composition!`
      }
    ]);

    fetch("/api/gemini/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objectName: selectedObject.name,
        objectType: selectedObject.commonName || selectedObject.type,
        spectralType: selectedObject.spectralType,
        distance: selectedObject.distance,
        luminosity: selectedObject.luminosity
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error("Telemetry channel offline");
        return res.json();
      })
      .then((data) => {
        setAiReport(data.text);
      })
      .catch((err) => {
        console.warn(err);
        setAiReport(`### Telemetry Warning
Failed to link secondary neural transponders.

**Core Dynamics for ${selectedObject.name}:**
This sector is located at galactic index coordinate range [${selectedObject.position.join(", ")}]. It possesses a spectral signature of **${selectedObject.spectralType || "unclassified"}** with a high orbital stability index of ${Math.round(98 + Math.random() * 2)}%. Raise warp factor to travel ahead!`);
      })
      .finally(() => {
        setIsLoadingReport(false);
      });
  }, [selectedObject]);

  // Handle freeform crew chat question submission or WebSocket team broadcast
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    if (chatChannel === "crew") {
      if (onSendCrewMessage) {
        onSendCrewMessage(chatMessage);
      }
      setChatMessage("");
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
      return;
    }

    if (!selectedObject) return;
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { sender: 'crew', text: userMsg }]);
    setChatMessage("");

    // Scroll to bottom of terminal
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);

    // Call Gemini chat server proxy
    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          contextObject: {
            name: selectedObject.name,
            type: selectedObject.type,
            distance: selectedObject.distance
          }
        })
      });
      const data = await response.json();
      setChatHistory(prev => [...prev, { sender: 'advisor', text: data.text || "Channel weak. Re-routing signals." }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'advisor', text: "Signal lost in the cosmic background radiation. Please try pitching the command frequency again." }]);
    }

    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  };

  const renderChatHistory = () => {
    if (chatChannel === "advisor") {
      return chatHistory.map((chat, idx) => (
        <div key={idx} className="flex flex-col items-start">
          <span className="text-[8px] text-white/30 mb-0.5">{chat.sender === 'crew' ? 'COMMANDER (YOU)' : 'ADVISOR CORE'}</span>
          <div className={`p-2 rounded-lg max-w-[85%] leading-relaxed ${
            chat.sender === 'crew'
              ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-100'
              : 'bg-white/5 border-white/10 text-white/85'
          }`}>
            {chat.text}
          </div>
        </div>
      ));
    } else {
      if (crewMessages.length === 0) {
        return (
          <div className="text-center py-8 text-white/30 text-[9px] italic flex flex-col items-center gap-1">
            <span>No crew communications intercepted.</span>
            <span>Coordinates are fully synchronized.</span>
          </div>
        );
      }
      return crewMessages.map((msg, idx) => {
        const isSelf = msg.senderId === activeUserId;
        return (
          <div key={idx} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-1 text-[8px] text-white/40 mb-0.5">
              <span style={{ color: msg.avatarColor }}>{msg.avatarEmoji}</span>
              <span style={{ color: msg.avatarColor }} className="font-bold">{msg.username}</span>
              <span>• {msg.time}</span>
            </div>
            <div className={`p-2 rounded-lg max-w-[85%] leading-relaxed ${
              isSelf
                ? 'bg-purple-500/15 border border-purple-500/30 text-purple-100'
                : 'bg-white/5 border-white/10 text-white/85'
            }`}>
              {msg.text}
            </div>
          </div>
        );
      });
    }
  };

  if (!selectedObject) {
    return (
      <div 
        id="telemetry-hud-panel"
        className="absolute top-4 left-4 w-96 glass-panel rounded-2xl p-6 shadow-2xl text-white font-sans select-none z-30 scanline border-glow-cyan"
      >
        <div className="text-center py-6">
          <Compass className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-spin" style={{ animationDuration: "12s" }} />
          <h2 className="text-xs font-bold font-mono text-cyan-400 tracking-[0.3em] uppercase">Telemetry Off</h2>
          <p className="text-lg font-light tracking-tighter text-white font-display mt-1">NO ACTIVE HUB LOCKED</p>
          <p className="text-xs text-white/55 mt-3 leading-relaxed">Select a highlighted star, exoplanet, or dust nebula on the interactive 3D grid below to establish secure sub-space linkages.</p>
        </div>
      </div>
    );
  }

  // Generate color labels based on object types
  const getTypeColorClass = (type: string) => {
    switch (type) {
      case "black_hole": return "text-purple-400 bg-purple-500/10 border border-purple-500/20";
      case "star": return "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20";
      case "nebula": return "text-pink-400 bg-pink-500/10 border border-pink-500/20";
      case "cluster": return "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20";
      case "exoplanet": return "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
      case "region": return "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 border-glow-cyan";
      default: return "text-cyan-400 bg-white/5 border border-white/10";
    }
  };

  return (
    <div
      id="telemetry-hud-panel"
      className="absolute top-4 left-4 w-[360px] glass-panel rounded-2xl shadow-2xl flex flex-col max-h-[85vh] text-white font-sans z-30 overflow-hidden scanline border-glow-violet"
    >
      {/* Header Info */}
      <div className="p-5 border-b border-white/10 flex items-start justify-between bg-black/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${getTypeColorClass(selectedObject.type)}`}>
              {selectedObject.type.replace("_", " ")}
            </span>
            {selectedObject.spectralType && (
              <span className="text-[9px] bg-white/5 text-white/60 border border-white/10 px-1.5 py-0.5 rounded font-mono">
                Class {selectedObject.spectralType}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display">
            {selectedObject.name}
          </h2>
          {selectedObject.commonName && (
            <p className="text-xs text-cyan-400 font-mono tracking-wide mt-0.5">{selectedObject.commonName}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/65 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full text-xs transition border border-white/10 font-mono tracking-wider active:scale-95"
        >
          DISMISS [X]
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/10 text-[10px] uppercase font-bold tracking-wider font-mono bg-black/20">
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex-1 py-2.5 text-center border-b-2 transition ${
            activeTab === "telemetry"
              ? "border-cyan-500 text-cyan-300 font-bold bg-white/5"
              : "border-transparent text-white/50 hover:text-white"
          }`}
        >
          Telemetry
        </button>
        <button
          onClick={() => setActiveTab("analysis")}
          className={`flex-1 py-2.5 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === "analysis"
              ? "border-cyan-500 text-cyan-300 font-bold bg-white/5"
              : "border-transparent text-white/50 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Neural Link
        </button>
        <button
          onClick={() => setActiveTab("satellites")}
          className={`flex-1 py-2.5 text-center border-b-2 transition ${
            activeTab === "satellites"
              ? "border-cyan-500 text-cyan-300 font-bold bg-white/5"
              : "border-transparent text-white/50 hover:text-white"
          }`}
        >
          Satellites
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar lg:max-h-[50vh]">
        {activeTab === "telemetry" && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-xs text-white/70 leading-relaxed font-sans first-letter:text-xl font-light">
              {selectedObject.description}
            </p>

            {/* Structured scientific specifications */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-white/5 p-4 rounded-xl border border-white/10 font-mono text-[11px]">
              <div className="border-b border-white/5 pb-2">
                <span className="text-white/40 uppercase text-[9px] block mb-0.5">Distance from Sol</span>
                <span className="text-white font-bold">
                  {selectedObject.distance >= 1 ? `${Math.round(selectedObject.distance).toLocaleString()} ly` : `${(selectedObject.distance * 63241.1).toFixed(1)} AU`}
                </span>
              </div>
              <div className="border-b border-white/5 pb-2">
                <span className="text-white/40 uppercase text-[9px] block mb-0.5">Surface Temp</span>
                <span className="text-cyan-400 font-bold">
                  {selectedObject.temperature ? `${selectedObject.temperature.toLocaleString()} K` : "0 K"}
                </span>
              </div>
              <div className="border-b border-white/5 pb-2">
                <span className="text-white/40 uppercase text-[9px] block mb-0.5">Apparent Magnitude</span>
                <span className="text-white font-bold">{selectedObject.apparentMagnitude !== undefined ? `${selectedObject.apparentMagnitude} (V-mag)` : "N/A"}</span>
              </div>
              <div className="border-b border-white/5 pb-2">
                <span className="text-white/40 uppercase text-[9px] block mb-0.5">Abs. Luminosity</span>
                <span className="text-white font-bold font-mono">{selectedObject.luminosity !== undefined ? `~${selectedObject.luminosity.toLocaleString()} L☉` : "Negligible"}</span>
              </div>
              <div className="col-span-2 pt-1">
                <span className="text-white/40 uppercase text-[9px] block mb-0.5">Galactic Coordinates [X, Y, Z]</span>
                <span className="text-cyan-400 font-mono text-[10px] tracking-tight">{selectedObject.position.map(v => v.toFixed(0)).join(", ")} ly</span>
              </div>
            </div>

            {selectedObject.culturalSignificance && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <h4 className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 mb-1.5 uppercase font-bold tracking-wider">
                  <Globe className="w-3.5 h-3.5" /> Sector Mythology
                </h4>
                <p className="text-[11px] text-white/70 leading-relaxed font-sans">{selectedObject.culturalSignificance}</p>
              </div>
            )}

            {selectedObject.funFact && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <h4 className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 mb-1.5 uppercase font-bold tracking-wider">
                  <Info className="w-3.5 h-3.5" /> Astrophysical Record
                </h4>
                <p className="text-[11px] text-white/70 leading-relaxed italic font-sans">"{selectedObject.funFact}"</p>
              </div>
            )}
          </div>
        )}

        {/* AI Analysis Tab (Gemini Science Telemetry Report & Terminal Chat) */}
        {activeTab === "analysis" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-3 border border-white/10 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-mono text-cyan-400 flex items-center gap-1.5 uppercase font-bold tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Neural Network Link
                </h4>
                <span className="text-[9px] text-white/40 font-mono">Gemini 3.5</span>
              </div>

              {isLoadingReport ? (
                <div className="space-y-2 py-4 text-center">
                  <div className="inline-block w-5 h-5 border-2 border-t-cyan-400 border-r-transparent rounded-full animate-spin"></div>
                  <p className="text-[9px] font-mono text-white/50 animate-pulse">Establishing sub-space linkage...</p>
                </div>
              ) : (
                <div className="text-[11px] leading-relaxed text-white/80 space-y-2 prose prose-invert font-sans markdown-body border-slate-800 pl-1 custom-scrollbar max-h-48 overflow-y-auto">
                  {aiReport ? (
                    <div className="whitespace-pre-line text-left">
                      {aiReport}
                    </div>
                  ) : (
                    <p className="text-white/40 font-mono italic">Failed to download neural telemetry bounds.</p>
                  )}
                </div>
              )}
            </div>

            {/* Crew Terminal Chatbox */}
            <div className="border border-white/10 rounded-xl bg-black/60 flex flex-col h-48 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 bg-white/5 text-[9px] font-mono text-white/40 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold">
                  <Radio className="w-3 h-3 text-cyan-400 animate-pulse" /> Commander Tactical Feed
                </div>
                <div className="flex bg-black/40 border border-white/10 rounded-md overflow-hidden p-0.5 pointer-events-auto z-10">
                  <button
                    type="button"
                    onClick={() => setChatChannel("advisor")}
                    className={`px-1.5 py-0.5 rounded text-[8px] transition cursor-pointer ${
                      chatChannel === "advisor"
                        ? "bg-cyan-500/20 text-cyan-300 font-bold"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    Advisor
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatChannel("crew")}
                    className={`px-1.5 py-0.5 rounded text-[8px] transition cursor-pointer relative ${
                      chatChannel === "crew"
                        ? "bg-purple-500/20 text-purple-300 font-bold"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    Crew Sync
                    {crewMessages.length > 0 && chatChannel !== "crew" && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                    )}
                  </button>
                </div>
              </div>

              {/* Chat Log History */}
              <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 custom-scrollbar text-[10px] font-mono" ref={scrollRef}>
                {renderChatHistory() /* chatHistory.map((chat, idx) => ( */ }
                  {/* <div key={idx} className={`flex flex-col ${chat.sender === 'crew' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[8px] text-white/30 mb-0.5">{chat.sender === 'crew' ? 'COMMANDER (CREW)' : 'NEURAL TELEMETRY'}</span>
                    <div className={`p-2 rounded-lg max-w-[85%] leading-relaxed ${
                      chat.sender === 'crew'
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-100'
                        : 'bg-white/5 border border-white/10 text-white/85'
                    }`}>
                      {chat.text}
                    </div>
                  </div> */ }
              </div>

              {/* Chat inputs */}
              <form onSubmit={handleSendChat} className="p-1.5 px-3 border-t border-white/10 flex bg-black/30 pointer-events-auto z-10">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder={chatChannel === "advisor" ? "Query stellar parameters or historical data..." : "Broadcast message to active orbit crew..."}
                  className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 text-[10px] font-mono text-white placeholder-white/30 focus:outline-none"
                />
                <button type="submit" className="text-cyan-400 hover:text-white transition active:scale-95">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Exoplanets and Satellites lists */}
        {activeTab === "satellites" && (
          <div className="space-y-4 animate-fadeIn">
            <h4 className="text-xs font-mono text-white flex items-center gap-1.5 border-b border-white/10 pb-1.5 uppercase font-bold tracking-wider">
              <Orbit className="w-4 h-4 text-cyan-400" /> System Habitation Limits
            </h4>

            {selectedObject.exoplanetsCount || selectedObject.type === "exoplanet" ? (
              <div className="space-y-2">
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-cyan-400 font-mono text-[11px] flex gap-2 items-start animate-fadeIn">
                  <Globe className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse text-cyan-400" />
                  <div>
                    <span className="font-bold uppercase text-white block">Confirmed Orbits Active</span>
                    <span className="text-white/70">Scientific satellites suggest high heavy metal cores within this star's local gravity well.</span>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-[10px] font-mono space-y-1.5 text-white/60">
                  <p className="text-white font-bold mb-1 flex items-center justify-between uppercase text-[9px] tracking-wider">
                    <span>Telemetry Scan</span>
                    <span className="text-cyan-400 text-[8px]">Index Status: Valid</span>
                  </p>
                  <p>• <span className="text-white">Coordinate Hub Parent:</span> {selectedObject.name}</p>
                  <p>• <span className="text-white">Habitation Core:</span> Iron-silicate composition ratio</p>
                  <p>• <span className="text-white">Atmospheric Precession:</span> Premium nitrogen mix index</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-white/40 font-mono text-[11px]">
                <AlertCircle className="w-8 h-8 mx-auto text-white/20 mb-2" />
                No active orbital bodies detected under the current sensor threshold.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer controls: warp speeds */}
      <div className="p-5 border-t border-white/10 bg-black/45 flex gap-2 pointer-events-auto">
        <button
          onClick={onInitiateWarp}
          className="flex-1 py-3.5 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-lg transition-all duration-200 hover:bg-slate-200 active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.15)] text-center font-mono"
        >
          Warp Drive
        </button>
        <button
          onClick={onToggleBookmark}
          className={`px-4 py-3.5 font-bold text-xs uppercase tracking-widest rounded-lg transition-all duration-200 active:scale-95 cursor-pointer font-mono border flex items-center justify-center gap-1.5 ${
            isBookmarked
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
              : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
          }`}
          title={isBookmarked ? "Release sector bookmark synchronization" : "Bookmark sector and broadcast coordinates to crew"}
        >
          <span>{isBookmarked ? '★ Locked' : '☆ Lock'}</span>
        </button>
      </div>
    </div>
  );
}
