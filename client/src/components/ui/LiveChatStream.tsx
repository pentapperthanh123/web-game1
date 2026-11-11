import { useRef, useEffect } from 'react';
import { MessageSquare, Sparkles, Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';

export const LiveChatStream = () => {
  const chatMessages = useGameStore((state) => state.chatMessages);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat box internally without ever hijacking window scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <aside className="relative z-[5] w-full sm:w-64 max-w-full max-h-36 sm:max-h-48 flex flex-col space-y-1 pointer-events-auto pr-0.5 sm:pr-1 select-none">
      <div className="flex items-center space-x-1.5 pb-0.5 text-[10px] font-black uppercase text-slate-400 shrink-0">
        <MessageSquare className="w-3 h-3 text-cyan-400" />
        <span>Bình Luận TikTok Live</span>
      </div>

      <div ref={chatContainerRef} className="space-y-1 overflow-y-auto pr-1 flex-1">
        {chatMessages.length === 0 ? (
          <div className="text-[10px] text-slate-500 italic py-1">
            Đang lắng nghe bình luận từ phòng live...
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isBLG = msg.team === TEAM_KEY.BLG;
            const isGENG = msg.team === TEAM_KEY.GENG;

            return (
              <div
                key={msg.id}
                className="flex items-start space-x-1.5 px-2 py-1 rounded-lg bg-slate-950/35 border border-white/15 backdrop-blur-[1px] animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                {/* Avatar Initial */}
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                    isBLG
                      ? 'bg-cyan-500 text-slate-950'
                      : isGENG
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {msg.userName.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-[10px] leading-tight">
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-slate-300 truncate max-w-[80px]">
                      {msg.userName}
                    </span>

                    {msg.team && (
                      <span
                        className={`text-[8px] font-black px-1 rounded ${
                          isBLG ? 'bg-cyan-950 text-cyan-300' : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {msg.team}
                      </span>
                    )}

                    {msg.championName && (
                      <span className="text-[8px] font-bold text-emerald-400 flex items-center space-x-0.5">
                        <Swords className="w-2.5 h-2.5" />
                        <span>{msg.championName}</span>
                      </span>
                    )}
                  </div>

                  <p
                    className={`mt-0.5 break-words ${
                      msg.isGift ? 'text-amber-300 font-bold flex items-center space-x-1' : 'text-slate-200'
                    }`}
                  >
                    {msg.isGift && <Sparkles className="w-2.5 h-2.5 text-yellow-300 shrink-0" />}
                    <span>{msg.text}</span>
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

