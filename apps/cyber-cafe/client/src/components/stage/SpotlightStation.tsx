import React from 'react';
import { ShieldAlert, Sparkles, User } from 'lucide-react';
import { useCafeStore } from '../../store/cafeStore';
import { CRTDisplay } from './CRTDisplay';

export const SpotlightStation: React.FC = () => {
  const currentSession = useCafeStore((s) => s.currentSession);
  const momEvent = useCafeStore((s) => s.momEvent);
  const blackout = useCafeStore((s) => s.blackout);
  const language = useCafeStore((s) => s.language);
  const sparkTrigger = useCafeStore((s) => s.sparkTrigger);

  const isEn = language === 'EN';
  const isMomWarning = momEvent.status === 'WARNING_3S';
  const isMomBusting = momEvent.status === 'BUSTING';
  const isSafePassed = momEvent.status === 'SAFE_PASSED';
  const isBlackout = blackout.isActive;
  const isBuffed = currentSession?.isNoodleBuffActive || false;
  const isBSOD = currentSession?.status === 'BSOD_ERROR';
  const isNup = currentSession?.status === 'STUDYING_NUP';
  const isTyping = sparkTrigger && Date.now() - sparkTrigger.timestamp < 700;

  // Panic state when time remaining is low
  const remainingSec = currentSession?.timeRemainingSec ?? 0;
  const isLowTime = remainingSec > 0 && remainingSec <= 15;
  const isPanic = isLowTime || isMomWarning;

  return (
    <div className="absolute top-[88px] left-0 w-full h-[785px] z-10 overflow-hidden flex flex-col justify-between select-none">
      {/* 1. Seamless Warm Cyber Cafe 2008 Wall (y: 0 -> 360) */}
      <div className="absolute inset-0 bg-[#120c08] pointer-events-none">
        {/* Soft Ambient Overhead Tube Light Cone */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[540px] h-[340px] bg-amber-400/10 rounded-full blur-3xl" />

        {/* Top Retro Cyber Neon Sign on Wall */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-0.5 rounded-full bg-neutral-950/90 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black tracking-widest text-amber-300 font-mono">
            ★ ADSL MEGANET 1.5MBPS - CÁP ĐỒNG 2008 ★
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        </div>

        {/* Vintage Gaming Posters Pinned to Wall */}
        <div className="absolute top-4 left-6 w-20 h-28 bg-[#1e1712] border-2 border-amber-800/60 rounded shadow-lg overflow-hidden rotate-[-3deg] p-1 flex flex-col items-center justify-between">
          <div className="w-full h-18 bg-gradient-to-b from-amber-600 via-amber-800 to-red-950 rounded-xs flex flex-col items-center justify-center p-0.5">
            <span className="text-[9px] font-black text-yellow-300 drop-shadow">VÕ LÂM</span>
            <span className="text-[7px] font-bold text-amber-200">TRUYỀN KỲ</span>
          </div>
          <span className="text-[7px] font-black text-amber-400 font-mono">VINAGAME 2008</span>
        </div>

        <div className="absolute top-4 right-6 w-20 h-28 bg-[#1e1712] border-2 border-cyan-800/60 rounded shadow-lg overflow-hidden rotate-[3deg] p-1 flex flex-col items-center justify-between">
          <div className="w-full h-18 bg-gradient-to-b from-cyan-600 via-blue-800 to-indigo-950 rounded-xs flex flex-col items-center justify-center p-0.5">
            <span className="text-[9px] font-black text-cyan-200 drop-shadow">ĐỘT KÍCH</span>
            <span className="text-[7px] font-bold text-cyan-300">CROSSFIRE</span>
          </div>
          <span className="text-[7px] font-black text-cyan-400 font-mono">VTC GAME 2008</span>
        </div>

        {/* Vintage Wall Fan with fluttering red ribbon */}
        <div className="absolute top-34 right-4 flex flex-col items-center opacity-90">
          <div className="w-14 h-14 rounded-full border-2 border-emerald-700 bg-emerald-950/80 relative flex items-center justify-center shadow-md">
            <div className="w-12 h-12 relative animate-fan">
              <div className="absolute top-1/2 left-0 right-0 h-2 bg-emerald-500 rounded-full -translate-y-1/2" />
              <div className="absolute top-0 bottom-0 left-1/2 w-2 bg-emerald-500 rounded-full -translate-x-1/2" />
            </div>
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border border-emerald-900 z-10" />
            <div className="absolute bottom-1 right-1.5 w-1.5 h-5 bg-red-500 rounded-full rotate-[25deg] animate-pulse z-15" />
          </div>
          <div className="w-1 h-6 bg-emerald-900 shadow" />
        </div>
      </div>

      {/* 2. Mom Alert & Event Banners (Dynamic Alert Layer) */}
      <div className="w-full pt-1 px-4 z-40">
        {/* Mom Warning Banner */}
        {isMomWarning && (
          <div className="w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 p-1 rounded-2xl shadow-[0_0_35px_rgba(239,68,68,0.9)] border-2 border-yellow-300 animate-alarm">
            <div className="bg-neutral-950/95 rounded-xl px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-8 h-8 text-yellow-300 animate-bounce" />
                <div>
                  <div className="text-sm font-black text-yellow-300 tracking-wider">
                    {isEn ? '⚠️ MOM COMING! TYPE "NUP"' : '⚠️ MẸ TỚI! GÕ "NUP" ĐỂ NÚP'}
                  </div>
                  <div className="text-[11px] text-neutral-300 font-mono">
                    {isEn ? 'Quick! Switch to Word or get busted!' : 'Alt-Tab sang Word học bài nhanh kẻo bị túm tai!'}
                  </div>
                </div>
              </div>
              <div className="px-3.5 py-1 rounded-xl bg-red-600 text-white font-mono font-black text-2xl shadow-lg animate-pulse">
                {momEvent.countdownSec}s
              </div>
            </div>
          </div>
        )}

        {/* Mom Busted Banner */}
        {isMomBusting && (
          <div className="w-full bg-red-600 text-white font-black text-center py-2 px-4 rounded-2xl shadow-[0_0_35px_rgba(239,68,68,0.95)] border-2 border-white animate-bounce text-sm">
            💥 {isEn ? 'BUSTED! MOM DRAGGED PLAYER OUT OF CHAIR!' : 'BỊ BẮT QUẢ TANG! MẸ VỤT CHỔI LÔI RA KHỎI QUÁN!'}
          </div>
        )}

        {/* Mom Safe Passed Banner */}
        {isSafePassed && (
          <div className="w-full bg-emerald-600 text-white font-black text-center py-1.5 px-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.7)] border border-emerald-300 text-xs flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
            <span>{isEn ? 'PHEW! Mom walked by safely!' : 'HÚ HỒN! Mẹ vừa đi qua, an toàn rồi cày tiếp thôi!'}</span>
          </div>
        )}
      </div>

      {/* 3. Center CRT Monitor (Resting securely on the wooden desk with realistic shadow) */}
      <div className="w-full flex-1 flex flex-col items-center justify-center relative z-20 mt-1">
        {/* Giant Beige CRT Monitor Housing (SyncMaster 793DF) */}
        <div
          className={`w-[450px] h-[310px] bg-[#d7d3cb] rounded-3xl p-3.5 shadow-[0_25px_50px_rgba(0,0,0,0.95)] border-4 border-[#b8b2a5] relative flex flex-col justify-between ${
            isBSOD ? 'border-blue-600 shadow-[0_0_35px_rgba(0,34,204,0.8)]' : ''
          }`}
        >
          {/* Paper Ticket Taped on Corner of Monitor */}
          <div className="absolute -top-3 right-6 bg-yellow-100 border border-yellow-400 text-neutral-800 font-mono text-[8px] font-bold px-2 py-0.5 rounded shadow rotate-[5deg] z-20">
            MÁY 02 - 10.000đ
          </div>

          {/* Top Brand Tag & Vent Slots */}
          <div className="w-full flex items-center justify-between px-2 mb-0.5">
            <div className="flex gap-1">
              <span className="w-8 h-1 bg-[#a39c8e] rounded-full" />
              <span className="w-8 h-1 bg-[#a39c8e] rounded-full" />
              <span className="w-8 h-1 bg-[#a39c8e] rounded-full" />
            </div>
            <span className="text-[10px] font-black text-[#635c50] tracking-widest font-mono">
              SYNCMASTER 793DF
            </span>
          </div>

          {/* Inner Curved Glass Screen (CRT Bezel) */}
          <div className="w-full h-[230px] bg-black rounded-2xl p-1 shadow-inner border-4 border-[#2b2925] relative overflow-hidden">
            <CRTDisplay />

            {/* Retro Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
            {/* Vignette & Curved Glass Reflection */}
            <div className="absolute inset-0 pointer-events-none crt-screen-overlay" />
          </div>

          {/* Bottom Control Bar of CRT (Buttons, LED, Dials) */}
          <div className="w-full flex items-center justify-between px-3 mt-1">
            <div className="px-2 py-0.5 rounded bg-red-700 text-white font-black text-[8px] tracking-wider shadow">
              CẤM HÚT THUỐC
            </div>

            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#a39c8e] shadow-xs cursor-pointer" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#a39c8e] shadow-xs cursor-pointer" />
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-[9px] font-bold text-[#635c50]">POWER</span>
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isBlackout ? 'bg-neutral-800' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* CRT Monitor Stand Base (Grounding directly onto the wooden desk) */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-5 bg-[#aba496] border-t-2 border-[#8a8375] rounded-b-xl shadow-lg -z-10" />
        </div>
      </div>

      {/* 4. Continuous Seamless Solid Wood Cyber Cafe Desk (width: 100%, spans across the entire scene) */}
      <div className="w-full h-[320px] bg-[#2a170b] border-t-4 border-[#4a2e1c] shadow-[0_-15px_30px_rgba(0,0,0,0.9)] relative flex justify-between items-start px-5 pt-3 z-15">
        {/* Left Desk Section: Steaming Hảo Hảo Noodles + Cold Sting Ruby Bottle */}
        <div className="flex items-end gap-2.5 relative">
          {/* Steaming Noodles Bowl with Fried Egg & Chili */}
          <div className={`relative transition-all ${isBuffed ? 'scale-115' : 'opacity-90 scale-100'}`}>
            {/* Soft Rising Steam */}
            <div className="absolute -top-7 left-3 flex gap-1 pointer-events-none">
              <div className="w-1.5 h-6 bg-white/40 rounded-full animate-steam" />
              <div className="w-1.5 h-7 bg-white/50 rounded-full animate-steam [animation-delay:0.3s]" />
              <div className="w-1.5 h-5 bg-white/30 rounded-full animate-steam [animation-delay:0.6s]" />
            </div>

            <div className="w-16 h-9 bg-amber-600 rounded-b-2xl border-2 border-amber-300 relative shadow-lg flex items-center justify-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-3 bg-amber-700/80 flex items-center justify-around px-1">
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-300 border border-amber-500 shadow" />
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              </div>
              <span className="text-[8px] font-black text-yellow-200 mt-2">HẢO HẢO</span>
            </div>
          </div>

          {/* Cold Sting Strawberry Bottle */}
          <div className={`relative transition-all ${isBuffed ? 'scale-115' : 'opacity-90 scale-100'}`}>
            <div className="w-6 h-15 bg-gradient-to-b from-rose-500 to-red-700 border border-rose-300 rounded-t-md rounded-b relative shadow-lg flex flex-col items-center justify-between p-0.5">
              <div className="w-3.5 h-1.5 bg-yellow-400 rounded-xs shadow" />
              <span className="text-[7px] font-black text-yellow-300 -rotate-90">STING</span>
              <div className="w-4 h-1 bg-rose-900 rounded-xs" />
            </div>
          </div>

          {/* Iced Tea Glass (Trà Đá Vỉa Hè) */}
          <div className="w-6 h-11 bg-amber-600/60 border border-amber-300/80 rounded-b-md relative shadow flex flex-col items-center justify-end p-0.5">
            <div className="w-3 h-3 bg-white/60 rounded-xs mb-1" />
            <div className="text-[6px] font-bold text-amber-200">TRÀ ĐÁ</div>
          </div>
        </div>

        {/* Center Desk Section: Mitsumi Keyboard & Mouse with Hands Operating Them */}
        <div className="flex items-center gap-4 relative">
          {/* Mitsumi Ivory Keyboard */}
          <div
            className={`w-68 h-19 bg-[#e5e0d8] border-2 border-[#b5afa3] rounded-lg p-1.5 shadow-md flex flex-col justify-between relative ${
              isTyping ? 'animate-typing border-amber-400 shadow-[0_0_15px_#f59e0b]' : ''
            }`}
          >
            <div className="flex justify-between gap-0.5">
              {[...Array(14)].map((_, i) => (
                <div key={i} className="h-2.5 flex-1 bg-[#d3cfc7] rounded-xs border border-[#999] shadow-xs" />
              ))}
            </div>
            <div className="flex justify-between gap-0.5">
              {[...Array(13)].map((_, i) => (
                <div key={i} className="h-2.5 flex-1 bg-[#d3cfc7] rounded-xs border border-[#999] shadow-xs" />
              ))}
            </div>
            <div className="flex justify-between items-center px-1">
              <div className="w-32 h-2.5 bg-[#d3cfc7] rounded-xs border border-[#999]" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
            </div>

            {/* LEFT HAND & FINGERS TAPPING ON KEYBOARD (Animated based on grinding/state) */}
            {!isBSOD && (
              <div
                className={`absolute -bottom-3 left-6 z-30 transition-transform ${
                  isTyping ? 'translate-y-[-4px] rotate-[-2deg]' : isPanic ? 'translate-y-[-6px]' : ''
                }`}
              >
                {/* Arm / Forearm reaching from player to keyboard */}
                <div className="w-8 h-10 bg-[#fed7aa] border-2 border-[#fba760] rounded-t-xl rotate-[20deg] shadow-md flex flex-col items-center justify-end">
                  {/* Fingers pressing keys */}
                  <div className="flex gap-0.5 mb-0.5">
                    <span className="w-1.5 h-2.5 bg-[#fed7aa] border-t border-black/30 rounded-t-xs" />
                    <span className="w-1.5 h-3 bg-[#fed7aa] border-t border-black/30 rounded-t-xs" />
                    <span className="w-1.5 h-2 bg-[#fed7aa] border-t border-black/30 rounded-t-xs" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mitsumi Mouse on Blue Mousepad with Right Hand Gripping Mouse */}
          <div className="w-14 h-16 bg-blue-900/60 rounded-lg p-1 flex items-center justify-center border border-blue-700/50 relative">
            <div className="w-8 h-12 bg-[#d3cfc7] border border-[#999] rounded-full shadow relative flex flex-col items-center justify-center">
              <div className="w-1 h-3 bg-[#777] rounded-full mb-1" />
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 blur-[2px] animate-pulse" />
            </div>

            {/* RIGHT HAND GRIPPING MOUSE */}
            {!isBSOD && (
              <div
                className={`absolute -bottom-2 right-1 z-30 transition-transform ${
                  isTyping ? 'translate-y-[-3px] scale-105' : ''
                }`}
              >
                <div className="w-8 h-10 bg-[#fed7aa] border-2 border-[#fba760] rounded-t-xl rotate-[-20deg] shadow-md flex flex-col items-center justify-end">
                  <div className="flex gap-0.5 mb-0.5">
                    <span className="w-1.5 h-3 bg-[#fed7aa] border-t border-black/30 rounded-t-xs" />
                    <span className="w-1.5 h-2.5 bg-[#fed7aa] border-t border-black/30 rounded-t-xs" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Desk Section: Cigarettes 555 & Glass Ashtray */}
        <div className="flex items-center gap-2.5 opacity-85">
          <div className="w-6 h-10 bg-red-700 border border-yellow-400 rounded-xs shadow flex flex-col items-center justify-between p-0.5">
            <div className="text-[6px] font-black text-yellow-300">555</div>
            <div className="w-4 h-1 bg-white rounded-xs" />
          </div>

          <div className="w-8 h-8 rounded-full border-2 border-slate-400 bg-slate-800/60 flex items-center justify-center shadow-inner">
            <div className="w-2 h-2 rounded-full bg-amber-500/80" />
          </div>
        </div>
      </div>

      {/* 5. Seated Gamer Character (Eating/Gaming at the desk, rich expressive faces) */}
      <div className="w-full flex justify-center items-end relative z-25 -mt-24 pointer-events-none">
        {/* Red Net Cafe Backrest Chair */}
        <div className="w-64 h-52 bg-[#991b1b] border-4 border-[#7f1d1d] rounded-t-3xl shadow-2xl relative flex flex-col items-center pt-2">
          {/* Headrest Cushion */}
          <div className="w-42 h-12 bg-[#b91c1c] rounded-xl border border-red-500/40 mb-1" />

          {/* Player Character Container */}
          <div className="relative flex flex-col items-center">
            {/* Nickname Pill */}
            <div className="px-3 py-0.5 rounded-full bg-neutral-900/95 border border-amber-400 shadow-md flex items-center gap-1.5 mb-1">
              <User className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-bold text-white font-mono truncate max-w-[130px]">
                {currentSession?.user.nickname || (isEn ? 'Empty Seat' : 'Ghế Trống')}
              </span>
              {currentSession?.user.isVip && (
                <span className="px-1 rounded bg-amber-500 text-black text-[9px] font-black">VIP</span>
              )}
            </div>

            {/* Head & Expression Face */}
            <div className="w-24 h-24 rounded-full bg-[#fed7aa] border-2 border-[#fba760] relative shadow-xl flex flex-col items-center justify-center overflow-visible">
              {/* Legendary Buffalo Headphone (Tai Nghe Trâu Vàng) */}
              <div className="absolute -top-3 w-28 h-12 border-t-4 border-amber-500 rounded-t-full pointer-events-none z-25" />
              <div className="absolute top-6 -left-3.5 w-5 h-9 bg-amber-500 rounded-full border-2 border-amber-700 shadow-md z-25 flex items-center justify-center">
                <span className="text-[6px] font-black text-black">TRÂU</span>
              </div>
              <div className="absolute top-6 -right-3.5 w-5 h-9 bg-amber-500 rounded-full border-2 border-amber-700 shadow-md z-25 flex items-center justify-center">
                <span className="text-[6px] font-black text-black">VÀNG</span>
              </div>

              {/* Audition / HKT Mái Xéo Haircut 2008 */}
              <div className="absolute top-0 w-full h-9 bg-[#201812] rounded-t-full z-15 overflow-hidden">
                <div className="w-18 h-9 bg-[#2b1f17] rounded-br-2xl rotate-[-15deg] translate-x-2" />
              </div>

              {/* DYNAMIC HILARIOUS FACIAL EXPRESSIONS */}
              {isBSOD ? (
                // 3. BSOD / TROLLED: Hands clutching head, waterfall tears, funny screaming face
                <div className="flex flex-col items-center mt-3 z-20">
                  {/* Two hands clutching head */}
                  <div className="absolute -left-2 top-2 w-4 h-6 bg-[#fed7aa] border border-[#fba760] rounded-full rotate-[-45deg]" />
                  <div className="absolute -right-2 top-2 w-4 h-6 bg-[#fed7aa] border border-[#fba760] rounded-full rotate-[45deg]" />

                  {/* Crying eyes with stream of tears */}
                  <div className="flex gap-4 text-cyan-600 font-black text-sm">
                    <span>T_T</span>
                  </div>
                  {/* Waterfall tears streaming down */}
                  <div className="flex gap-6 -mt-1">
                    <span className="w-1 h-5 bg-cyan-400 rounded-full animate-bounce" />
                    <span className="w-1 h-5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                  {/* Screaming mouth */}
                  <div className="w-6 h-3 bg-red-800 rounded-full border border-black" />
                </div>
              ) : isPanic ? (
                // 2. LOW_TIME / PANIC: Bulging eyes, sweating profusely, pounding heart
                <div className="flex flex-col items-center mt-3 z-20">
                  <div className="flex gap-4">
                    <span className="text-base font-black text-black animate-ping">O</span>
                    <span className="text-base font-black text-black animate-ping">O</span>
                  </div>
                  <div className="w-6 h-3.5 rounded-full bg-red-600 mt-0.5 animate-pulse" />
                  {/* Sweat droplets falling */}
                  <div className="absolute top-4 right-0 text-cyan-500 text-sm animate-bounce">💧</div>
                  <div className="absolute top-6 left-0 text-cyan-500 text-xs animate-bounce [animation-delay:0.3s]">💧</div>
                  <div className="absolute -bottom-5 text-red-500 text-[9px] font-black animate-pulse">
                    THUMP THUMP!
                  </div>
                </div>
              ) : isNup ? (
                // 4. STUDYING NÚP MẸ: Nerd glasses, innocent bookish smile
                <div className="flex flex-col items-center mt-3 z-20">
                  <div className="flex gap-2 items-center">
                    <div className="w-5 h-5 rounded-full border-2 border-black bg-white/50" />
                    <div className="w-2 h-0.5 bg-black" />
                    <div className="w-5 h-5 rounded-full border-2 border-black bg-white/50" />
                  </div>
                  <div className="w-4 h-1 bg-black rounded-full mt-1.5" />
                </div>
              ) : (
                // 1. NORMAL / GRINDING: Confident gamer grin, focused eyes
                <div className="flex flex-col items-center mt-3 z-20">
                  <div className="flex gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-black" />
                    <div className="w-2.5 h-2.5 rounded-full bg-black" />
                  </div>
                  <div className="w-4 h-1.5 bg-black rounded-full mt-2" />
                </div>
              )}
            </div>

            {/* Striped Tank Top (Áo Ba Lỗ Sọc Đỏ Trắng Dân Cày Net) */}
            <div className="w-26 h-14 bg-neutral-100 border-2 border-neutral-400 rounded-t-xl mt-1 flex flex-col justify-around overflow-hidden shadow">
              <div className="w-full h-1.5 bg-red-600" />
              <div className="w-full h-1.5 bg-red-600" />
              <div className="w-full h-1.5 bg-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Power Cut Blackout Overlay */}
      {isBlackout && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center text-center p-6 select-none animate-fadeIn">
          <div className="absolute top-8 w-14 h-14 rounded-full bg-red-600/50 blur-xl animate-pulse" />

          <div className="text-red-500 font-mono font-black text-2xl tracking-widest animate-pulse mb-4">
            ⚡ {isEn ? 'POWER OUTAGE / BLACKOUT' : 'CÚP CẦU DAO CẢ QUÁN!'} ⚡
          </div>

          <div className="p-5 rounded-2xl bg-cyan-950/90 border-2 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.9)] max-w-md">
            <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
              <span>🔋</span>
              <span>{isEn ? 'UPS BACKUP POWER ACTIVE' : 'BỘ LƯU ĐIỆN UPS ĐANG HOẠT ĐỘNG'}</span>
            </div>
            <div className="text-lg font-black text-yellow-300">
              👑 {blackout.vipImmuneUser?.nickname || blackout.initiatorName || 'Đại Gia Nạp Nét'}
            </div>
            <div className="text-xs text-cyan-200 mt-2 font-mono">
              {isEn
                ? 'Only this VIP station stays illuminated & scores massive bonus points!'
                : 'Chỉ duy nhất máy của đại gia phát sáng và nhận thưởng điểm bùng nổ!'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
