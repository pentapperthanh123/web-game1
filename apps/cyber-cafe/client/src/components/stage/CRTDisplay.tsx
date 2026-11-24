import React, { useEffect, useState } from 'react';
import { useCafeStore } from '../../store/cafeStore';

export const CRTDisplay: React.FC = () => {
  const currentSession = useCafeStore((s) => s.currentSession);
  const sparkTrigger = useCafeStore((s) => s.sparkTrigger);
  const blackout = useCafeStore((s) => s.blackout);

  const [frameTick, setFrameTick] = useState(0);

  // Smooth 30 FPS game sprite ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameTick((prev) => (prev + 1) % 120);
    }, 66);
    return () => clearInterval(interval);
  }, []);

  const isPowerCut = blackout.isActive;
  const status = currentSession?.status || 'IDLE';
  const isBuffed = currentSession?.isNoodleBuffActive || false;
  const isGrindingNow = sparkTrigger && Date.now() - sparkTrigger.timestamp < 700;

  // 1. Blackout / Power Cut State (Pitch black with CRT capacitor fade out)
  if (isPowerCut) {
    return (
      <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
        <div className="w-3 h-3 rounded-full bg-emerald-400/40 blur-sm animate-ping" />
        <div className="text-[10px] text-neutral-800 font-mono tracking-widest uppercase">
          NO SIGNAL - POWER CUT
        </div>
      </div>
    );
  }

  // 2. BSOD Màn Hình Xanh Windows XP (Authentic Crash)
  if (status === 'BSOD_ERROR') {
    return (
      <div className="w-full h-full bg-[#0022cc] text-white font-mono p-3 text-[10px] leading-tight select-none flex flex-col justify-between overflow-hidden shadow-inner">
        <div>
          <div className="bg-white text-[#0022cc] px-1 font-bold inline-block mb-1 text-[9px] shadow-sm">
            WINDOWS XP PROFESSIONAL - FATAL CRASH
          </div>
          <p className="font-bold text-yellow-300">*** STOP: 0x000000D1 (NET_CABLE_DISCONNECT) ***</p>
          <p className="mt-1 text-slate-200">
            A fatal exception occurred. The internet cable was pulled or RESET was pressed!
          </p>
          <p className="mt-1 text-slate-300">Technical Information:</p>
          <p className="text-yellow-200 font-bold">*** DRIVER_IRQL_NOT_LESS_OR_EQUAL ***</p>
          <p className="text-slate-400 mt-1">cyber_lan.sys - Address F77E2A89 base at F77DE000</p>
          <p className="text-cyan-300 mt-1">Beginning dump of physical memory...</p>
        </div>
        <div className="flex items-center justify-between border-t border-blue-400/40 pt-1 text-yellow-300 animate-pulse font-bold">
          <span>Khởi động lại Windows XP...</span>
          <span className="text-white font-black">(3s)</span>
        </div>
      </div>
    );
  }

  // 3. Núp Mẹ / Word 2003 Học Bài (Windows XP Authentic Theme)
  if (status === 'STUDYING_NUP') {
    return (
      <div className="w-full h-full bg-[#3a6ea5] p-1 flex flex-col font-sans select-none overflow-hidden text-black">
        <div className="bg-gradient-to-r from-[#0055ea] via-[#0a246a] to-[#a6caf0] text-white px-2 py-0.5 text-[9px] font-bold flex items-center justify-between rounded-t shadow-sm">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2.5 h-2.5 bg-blue-700 text-[8px] flex items-center justify-center rounded-xs font-serif font-black">
              W
            </span>
            <span className="truncate">Microsoft Word - BÀI_TẬP_LÀM_VĂN_LỚP_8.doc</span>
          </div>
          <div className="flex gap-0.5 shrink-0">
            <span className="w-3 h-2.5 bg-slate-200 inline-block text-[8px] text-black text-center leading-none font-bold">_</span>
            <span className="w-3 h-2.5 bg-red-600 inline-block text-[8px] text-white text-center leading-none font-bold">×</span>
          </div>
        </div>

        <div className="bg-[#ede9d8] border-b border-[#d4d0c8] px-2 py-0.5 text-[8px] text-neutral-800 flex gap-2 font-medium">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Insert</span>
          <span>Format</span>
          <span>Tools</span>
          <span>Table</span>
          <span>Help</span>
        </div>

        <div className="flex-1 bg-white text-black p-3 font-mono text-[9px] leading-relaxed shadow-inner overflow-hidden border border-[#999]">
          <p className="font-bold text-blue-900 border-b border-blue-200 pb-0.5 mb-1.5 flex justify-between">
            <span>ĐỀ BÀI: Tả một việc tốt em đã làm giúp đỡ gia đình</span>
            <span className="text-neutral-500 font-normal">Điểm: 10/10</span>
          </p>
          <p className="text-slate-800">
            Hôm nay em thức dậy từ 6 giờ sáng để quét nhà và học bài. Em rất ngoan ngoãn, không bao giờ trốn học đi quán net chơi game...
          </p>
          <p className="text-emerald-800 mt-1 font-bold">
            Bảng cửu chương 9: 9 x 1 = 9 ... 9 x 9 = 81 (Thuộc làu)
          </p>
          <div className="mt-2.5 flex items-center text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-300">
            <span className="animate-pulse mr-1.5 text-xs">✍️</span>
            <span>ĐANG GIẢ VỜ CHĂM CHỈ GHI CHÉP ĐỢI MẸ ĐI QUA...</span>
            <span className="w-1.5 h-3 bg-black inline-block ml-1 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 4. Màn Hình Game Võ Lâm / RPG 2008 (Vivid Animated Battle Arena)
  const swordSlashDeg = (frameTick * 12) % 360;

  return (
    <div className="w-full h-full bg-[#060b17] relative overflow-hidden font-mono select-none">
      {/* Ancient Martial Arts Battlefield Horizon */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1b1035] via-[#0d1627] to-[#0a1322] opacity-95" />

      {/* Fiery Battle Sparks Floating in Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
            style={{
              top: `${20 + (i * 12)}%`,
              left: `${15 + ((i * 16 + frameTick * 2) % 70)}%`,
              animationDuration: `${1 + (i % 3) * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Top Game Status HUD (Võ Lâm Truyền Kỳ 2008) */}
      <div className="absolute top-1 left-1.5 right-1.5 flex items-center justify-between px-2 py-0.5 bg-black/85 border border-amber-500/60 rounded text-[9px] z-10 shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400 font-black tracking-wide">⚔️ VÕ LÂM 2008</span>
          <span className="text-emerald-400 font-bold">LV.99</span>
          <span className="text-cyan-300 text-[8px]">[Cái Bang]</span>
        </div>
        <div className="flex items-center gap-2">
          {/* HP Bar */}
          <div className="flex items-center gap-1">
            <span className="text-red-400 font-bold text-[8px]">HP</span>
            <div className="w-12 h-2 bg-neutral-900 rounded overflow-hidden border border-neutral-700">
              <div className="w-[88%] h-full bg-gradient-to-r from-red-600 to-red-400 animate-pulse" />
            </div>
          </div>
          {/* MP Bar */}
          <div className="flex items-center gap-1">
            <span className="text-blue-400 font-bold text-[8px]">MP</span>
            <div className="w-10 h-2 bg-neutral-900 rounded overflow-hidden border border-neutral-700">
              <div className="w-[94%] h-full bg-gradient-to-r from-blue-600 to-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Arena Center: Hero Sprite, Combat Slash Arc & Boss */}
      <div className="absolute inset-0 flex items-center justify-around px-5 pt-3">
        {/* Player Hero Section */}
        <div className="flex flex-col items-center relative">
          <div className="text-[9px] font-black text-yellow-300 bg-neutral-950/90 border border-amber-400/60 px-1.5 py-0.5 rounded shadow mb-1 truncate max-w-[95px] flex items-center gap-1">
            <span>👑</span>
            <span>{currentSession?.user.nickname || 'Thiếu Hiệp'}</span>
          </div>

          {/* Hero Visual Character Container */}
          <div
            className={`w-16 h-18 relative flex items-center justify-center transition-transform ${
              isGrindingNow ? 'scale-115 rotate-[-3deg]' : 'scale-100'
            }`}
          >
            {/* Flying Dragon Aura when Grinding */}
            {isGrindingNow && (
              <div
                className="absolute w-20 h-20 rounded-full border-2 border-dashed border-amber-400 pointer-events-none animate-spin"
                style={{
                  filter: 'drop-shadow(0 0 10px #f59e0b)',
                  animationDuration: '1s',
                }}
              />
            )}

            {/* Pixel Hero Character */}
            <div className="w-11 h-14 bg-gradient-to-b from-cyan-600 to-cyan-900 border-2 border-cyan-300 rounded-lg relative shadow-xl flex flex-col items-center justify-between p-1">
              <div className="w-5 h-5 rounded-full bg-amber-200 border-2 border-amber-600 relative">
                <div className="absolute top-1 left-0 right-0 h-1 bg-red-600" />
              </div>
              <div className="w-7 h-5 bg-cyan-950 rounded-xs flex items-center justify-center text-[7px] text-yellow-300 font-black">
                {isBuffed ? 'BUFF' : 'VL1'}
              </div>
              <div className="w-9 h-1.5 bg-amber-400 rounded-xs shadow" />
            </div>

            {/* Sword Weapon Graphic */}
            <div
              className={`absolute -right-2 top-2 w-2 h-10 bg-gradient-to-t from-slate-300 to-white border border-amber-300 rounded-xs shadow transition-transform ${
                isGrindingNow ? 'rotate-[45deg] translate-x-2 -translate-y-1' : 'rotate-[15deg]'
              }`}
            />
          </div>

          {/* Hit Damage Floating Popup */}
          {isGrindingNow && (
            <div className="absolute -top-4 text-xs font-black text-yellow-300 animate-bounce drop-shadow-[0_2px_5px_rgba(245,158,11,1)]">
              +{isBuffed ? '9999 CRIT!' : '1500 DMG'}
            </div>
          )}
        </div>

        {/* Versus Battle Clash & Dragon Slash Spark */}
        <div className="flex flex-col items-center justify-center">
          <div
            className="w-8 h-8 rounded-full border-2 border-amber-400 flex items-center justify-center text-[10px] text-yellow-300 font-black shadow-[0_0_15px_#f59e0b] animate-pulse"
            style={{ transform: `rotate(${swordSlashDeg}deg)` }}
          >
            ⚡
          </div>
          <span className="text-[8px] font-bold text-neutral-400 mt-1">VS</span>
        </div>

        {/* Boss / Monster Sprite Section */}
        <div className="flex flex-col items-center relative">
          <div className="text-[8px] font-black text-red-300 bg-red-950/90 border border-red-500/60 px-1.5 py-0.5 rounded shadow mb-1">
            ☠️ HẮC ĐẠI MA VƯƠNG
          </div>

          <div
            className="w-18 h-20 bg-gradient-to-b from-red-900 to-neutral-950 border-2 border-red-500 rounded-xl relative flex flex-col items-center justify-between p-1.5 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            style={{
              transform: `translateY(${Math.sin(frameTick * 0.15) * 4}px)`,
            }}
          >
            <div className="absolute -top-2 flex justify-between w-14">
              <span className="text-yellow-400 text-xs">▲</span>
              <span className="text-yellow-400 text-xs">▲</span>
            </div>

            <div className="w-8 h-8 rounded-full bg-red-800 border-2 border-red-400 flex items-center justify-center text-yellow-300 text-xs font-black shadow-inner">
              👹
            </div>

            <div className="text-[8px] font-bold text-red-300 font-mono">BOSS HP</div>

            <div className="w-14 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-700">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 transition-all duration-300"
                style={{ width: `${Math.max(15, 100 - (currentSession?.rankScore || 0) % 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Buff Banner at bottom of CRT */}
      {isBuffed && (
        <div className="absolute bottom-1 left-2 right-2 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-black font-black text-[9px] py-0.5 px-2 rounded flex items-center justify-between shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse">
          <span>🍜 BUFF MÌ TÔM + STING DÂU</span>
          <span>x2 SPEED GRIND</span>
        </div>
      )}
    </div>
  );
};
