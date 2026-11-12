import { Heart, Send, Sparkles, Zap } from 'lucide-react';
import { TeamColorPalette, TeamProfile } from '../constants/teams';

interface AdminLikeChatCardProps {
  visible: boolean;
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
  leftTheme: TeamColorPalette;
  rightTheme: TeamColorPalette;
  chatTeam: 'BLG' | 'GENG';
  customComment: string;
  onChatTeamChange: (team: 'BLG' | 'GENG') => void;
  onCustomCommentChange: (value: string) => void;
  onSendLikes: (count: number, team: 'BLG' | 'GENG') => void;
  onSendCustomChat: () => void;
}

/**
 * Column 1 of the interaction grid: simulates heart bursts and custom live chat / summon comments.
 */
export function AdminLikeChatCard({
  visible,
  leftTeam,
  rightTeam,
  leftTheme,
  rightTheme,
  chatTeam,
  customComment,
  onChatTeamChange,
  onCustomCommentChange,
  onSendLikes,
  onSendCustomChat,
}: AdminLikeChatCardProps) {
  return (
    <div
      className={`p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 ${
        visible ? '' : 'hidden'
      }`}
    >
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
        <Heart className="w-4 h-4 text-rose-500" />
        <h2 className="text-xs font-black uppercase text-white">1. Thả Tim & Bình Luận</h2>
      </div>

      {/* Quick Heart Burst */}
      <div>
        <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
          Giả lập Bão Thả Tim
        </label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            type="button"
            onClick={() => onSendLikes(10, 'BLG')}
            className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 ${leftTheme.likeBtnClass}`}
          >
            <Heart className={`w-3.5 h-3.5 fill-current ${leftTheme.textStrongClass}`} />
            <span>+10 Tim {leftTeam.shortTag}</span>
          </button>
          <button
            type="button"
            onClick={() => onSendLikes(10, 'GENG')}
            className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 ${rightTheme.likeBtnClass}`}
          >
            <Heart className={`w-3.5 h-3.5 fill-current ${rightTheme.textStrongClass}`} />
            <span>+10 Tim {rightTeam.shortTag}</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSendLikes(50, 'BLG')}
            className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 ${leftTheme.likeBurstBtnClass}`}
          >
            <Zap className={`w-3.5 h-3.5 ${leftTheme.textStrongClass}`} />
            <span>+50 Tim {leftTeam.shortTag}</span>
          </button>
          <button
            type="button"
            onClick={() => onSendLikes(50, 'GENG')}
            className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 ${rightTheme.likeBurstBtnClass}`}
          >
            <Zap className={`w-3.5 h-3.5 ${rightTheme.textStrongClass}`} />
            <span>+50 Tim {rightTeam.shortTag}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSendLikes(200, 'BLG')}
          className="w-full mt-2 py-2 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-[0_0_12px_rgba(16,185,129,0.5)] transition active:scale-95"
          title="Gửi ngay 200 Tim để kích hoạt Mốc Đại Hồi Phục Toàn Bản Đồ (+100 HP cho tướng)"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
          <span>💖 +200 Tim (Test Hồi Máu Toàn Bản Đồ)</span>
        </button>
      </div>

      {/* Custom Live Chat */}
      <div className="pt-2 border-t border-slate-800 space-y-2">
        <label className="text-[11px] font-semibold text-slate-400 block">
          Gửi bình luận hiển thị lên Live
        </label>
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => onChatTeamChange('BLG')}
            className={`flex-1 py-1 rounded text-[10px] font-black ${
              chatTeam === 'BLG' ? leftTheme.adminActiveBtnClass : 'bg-slate-800 text-slate-400'
            }`}
          >
            {leftTeam.shortTag}
          </button>
          <button
            type="button"
            onClick={() => onChatTeamChange('GENG')}
            className={`flex-1 py-1 rounded text-[10px] font-black ${
              chatTeam === 'GENG' ? rightTheme.adminActiveBtnClass : 'bg-slate-800 text-slate-400'
            }`}
          >
            {rightTeam.shortTag}
          </button>
        </div>

        <div className="flex space-x-1.5">
          <input
            type="text"
            value={customComment}
            onChange={(e) => onCustomCommentChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSendCustomChat()}
            placeholder={`Nhập chat triệu hồi (vd: ${leftTeam.roster[2]?.name || leftTeam.shortTag}, Zed, Yasuo ${rightTeam.shortTag})...`}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={onSendCustomChat}
            title="Gửi bình luận & triệu hồi tướng"
            className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400">
          💡 <span className="text-cyan-400">Chat tên tướng/tuyển thủ</span> (ví dụ:{' '}
          <code className="text-amber-300">{leftTeam.roster[2]?.name || leftTeam.shortTag}</code>,{' '}
          <code className="text-cyan-300">Zed</code>,{' '}
          <code className="text-amber-300">{rightTeam.roster[2]?.name || rightTeam.shortTag}</code>,{' '}
          <code className="text-cyan-300">random</code>) để triệu hồi trực tiếp!
        </p>
      </div>
    </div>
  );
}
