import { useState, useEffect } from 'react';
import {
  Radio,
  Heart,
  MessageSquare,
  Gift,
  Swords,
  Activity,
  RotateCcw,
  Play,
  Square,
  Sparkles,
  ExternalLink,
  Crown,
  Trash2,
  Send,
  Zap,
} from 'lucide-react';
import { adminSocket } from './services/socket';
import { BLGLogo, GenGLogo } from './components/TeamLogos';

const BLG_ROSTER = [
  { name: 'Bin', role: 'TOP', champ: 'Jax', avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Jax.png' },
  { name: 'Xun', role: 'JUG', champ: 'Xin Zhao', avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/XinZhao.png' },
  { name: 'knight', role: 'MID', champ: 'Ahri', avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Ahri.png' },
  { name: 'Elk', role: 'ADC', champ: "Kai'Sa", avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Kaisa.png' },
  { name: 'ON', role: 'SUP', champ: 'Rakan', avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Rakan.png' },
];

const GENG_ROSTER = [
  { name: 'Kiin', role: 'TOP', champ: "K'Sante", avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/KSante.png' },
  { name: 'Canyon', role: 'JUG', champ: 'Nidalee', avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Nidalee.png' },
  { name: 'Chovy', role: 'MID', champ: 'Yone', avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Yone.png' },
  { name: 'Ruler', role: 'ADC', champ: 'Ezreal', avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Ezreal.png' },
  { name: 'Duro', role: 'SUP', champ: 'Nautilus', avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/Nautilus.png' },
];

const CHAMPION_PRESETS = [
  { name: 'Zed', role: 'Sát Thủ' },
  { name: 'Yasuo', role: 'Đấu Sĩ' },
  { name: 'Ahri', role: 'Pháp Sư' },
  { name: 'Lee Sin', role: 'Đi Rừng' },
  { name: 'Aatrox', role: 'Đường Trên' },
  { name: 'Lux', role: 'Hỗ Trợ' },
  { name: 'Akali', role: 'Sát Thủ' },
  { name: 'Bin Đao Phủ', role: 'Siêu Sao BLG' },
  { name: 'Chovy CKTG', role: 'Siêu Sao GEN' },
  { name: 'Faker Quỷ Vương', role: 'Huyền Thoại' },
];

const GIFT_PRESETS = [
  { name: 'Hoa Hồng 🌹', coins: 1, label: 'Thường' },
  { name: 'Bánh Quy 🍪', coins: 10, label: 'Thường' },
  { name: 'Súng Nước 🔫', coins: 50, label: 'Hiếm' },
  { name: 'Trái Tim CKTG 💖', coins: 199, label: 'Hiếm' },
  { name: 'Rồng Thần CKTG 🐉', coins: 1000, label: 'VIP' },
  { name: 'Phượng Hoàng Lửa 🔥', coins: 2500, label: 'VIP' },
  { name: 'Tàu Vũ Trụ TikTok 🚀', coins: 10000, label: 'Huyền Thoại' },
];

interface LogItem {
  id: string;
  time: string;
  type: string;
  message: string;
  team?: string;
}

export function App() {
  // TikTok Live connection state
  const [tiktokUsername, setTiktokUsername] = useState('sofm_official');
  const [tiktokStatus, setTiktokStatus] = useState<string>('DISCONNECTED');
  const [tiktokRoomId, setTiktokRoomId] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Form states
  const [summonerName, setSummonerName] = useState('Gamer_Pro_99');
  const [selectedChampion, setSelectedChampion] = useState('Zed');
  const [selectedTeam, setSelectedTeam] = useState<'BLG' | 'GENG'>('BLG');

  const [donorName, setDonorName] = useState('Đại_Gia_TikTok');
  const [selectedGift, setSelectedGift] = useState(GIFT_PRESETS[4]);
  const [giftTeam, setGiftTeam] = useState<'BLG' | 'GENG'>('BLG');

  const [customComment, setCustomComment] = useState('BLG vô địch CKTG 2026!');
  const [chatTeam, setChatTeam] = useState<'BLG' | 'GENG'>('BLG');

  const [bossHp, setBossHp] = useState(100000);
  const [isBotActive, setIsBotActive] = useState(false);
  const [botSpeed, setBotSpeed] = useState(1200);

  const [logs, setLogs] = useState<LogItem[]>([]);

  const addLog = (type: string, message: string, team?: string) => {
    const newLog: LogItem = {
      id: `log-${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      type,
      message,
      team,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  useEffect(() => {
    const unsubscribe = adminSocket.onTiktokStatus((data) => {
      setTiktokStatus(data.status);
      if (data.roomId) setTiktokRoomId(data.roomId);
      if (data.status === 'CONNECTED') {
        addLog('SYSTEM', `Đã kết nối luồng Live TikTok của @${data.username}`);
      } else if (data.status === 'ERROR') {
        addLog('SYSTEM', `Lỗi kết nối: ${data.error || 'Không xác định'}`);
      }
    });
    return unsubscribe;
  }, []);

  // Bot simulation runner
  useEffect(() => {
    if (!isBotActive) return;

    const interval = setInterval(() => {
      const champ = CHAMPION_PRESETS[Math.floor(Math.random() * CHAMPION_PRESETS.length)];
      const team = Math.random() > 0.5 ? 'BLG' : 'GENG';
      const user = `Viewer_${Math.floor(Math.random() * 899) + 100}`;

      // Summon or gift
      if (Math.random() < 0.2) {
        adminSocket.emit('admin:gift', {
          giftName: 'Rồng Thần CKTG 🐉',
          team,
          donorName: user,
          coins: 1000,
        });
        addLog('GIFT', `${user} tặng Rồng Thần CKTG phe ${team}!`, team);
      } else {
        adminSocket.emit('admin:summon', {
          summonerName: user,
          championName: champ.name,
          team,
        });
        addLog('SUMMON', `${user} triệu hồi [${champ.name}] phe ${team}`, team);
      }

      // Random like burst
      adminSocket.emit('admin:like', {
        count: Math.floor(Math.random() * 3) + 1,
        team,
        userName: user,
      });
    }, botSpeed);

    return () => clearInterval(interval);
  }, [isBotActive, botSpeed]);

  const handleConnectTiktok = async () => {
    setIsConnecting(true);
    try {
      await adminSocket.connectTiktokRoom(tiktokUsername);
    } catch (err: any) {
      addLog('SYSTEM', `Lỗi: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectTiktok = async () => {
    await adminSocket.disconnectTiktokRoom();
    setTiktokStatus('DISCONNECTED');
    setTiktokRoomId('');
    addLog('SYSTEM', 'Đã ngắt kết nối phòng TikTok Live');
  };

  const handleSummon = () => {
    const user = summonerName.trim() || 'Viewer_Anonym';
    adminSocket.emit('admin:summon', {
      summonerName: user,
      championName: selectedChampion,
      team: selectedTeam,
    });
    addLog('SUMMON', `${user} triệu hồi [${selectedChampion}] phe ${selectedTeam}`, selectedTeam);
  };

  const handleSendGift = () => {
    const donor = donorName.trim() || 'Đại Gia Ẩn Danh';
    adminSocket.emit('admin:gift', {
      giftName: selectedGift.name,
      team: giftTeam,
      donorName: donor,
      coins: selectedGift.coins,
    });
    addLog('GIFT', `💎 ${donor} tặng [${selectedGift.name}] (${selectedGift.coins} xu) phe ${giftTeam}!`, giftTeam);
  };

  const handleSendLikes = (count: number, team: 'BLG' | 'GENG') => {
    adminSocket.emit('admin:like', {
      count,
      team,
      userName: summonerName || 'Viewer',
    });
    addLog('LIKE', `❤️ Thả ${count} tim cho phe ${team}!`, team);
  };

  const handleSendCustomChat = () => {
    if (!customComment.trim()) return;
    adminSocket.emit('admin:chat', {
      userName: summonerName || 'Viewer',
      text: customComment,
      team: chatTeam,
    });
    addLog('CHAT', `[${chatTeam}] ${summonerName}: ${customComment}`, chatTeam);
    setCustomComment('');
  };

  const handleSetBossHp = (hp: number) => {
    setBossHp(hp);
    adminSocket.emit('admin:boss-control', { action: 'setHp', hp });
    addLog('BOSS', `Chỉnh máu Boss về ${hp.toLocaleString()} HP`);
  };

  const handleResetBoss = () => {
    setBossHp(100000);
    adminSocket.emit('admin:boss-control', { action: 'reset' });
    addLog('BOSS', '🔄 Hồi sinh Boss Baron Nashor về 100,000 HP');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/80 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wide text-white flex items-center space-x-2">
                <span>TIKTOK LIVE ADMIN PORTAL</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  PORT 3001
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Bảng điều khiển độc lập kết nối WebSocket tới Server (Port 4000) & Game View (Port 3000)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-xs font-bold text-cyan-300 flex items-center space-x-2 shadow-lg transition"
            >
              <span>Mở Màn Hình Game OBS (Port 3000)</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={handleResetBoss}
              className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-xs font-bold text-rose-300 flex items-center space-x-1.5 transition shadow"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Hồi Sinh Boss</span>
            </button>
          </div>
        </header>

        {/* TikTok Live Connection Widget */}
        <section className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                tiktokStatus === 'CONNECTED'
                  ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                  : tiktokStatus === 'CONNECTING'
                  ? 'bg-yellow-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <div>
              <div className="text-xs font-black uppercase text-white flex items-center space-x-1.5">
                <span>Trạng thái TikTok Live:</span>
                <span
                  className={
                    tiktokStatus === 'CONNECTED'
                      ? 'text-emerald-400 font-bold'
                      : tiktokStatus === 'CONNECTING'
                      ? 'text-yellow-400'
                      : 'text-slate-400'
                  }
                >
                  {tiktokStatus}
                </span>
                {tiktokRoomId && <span className="text-slate-500 text-[10px]">(Room ID: {tiktokRoomId})</span>}
              </div>
              <p className="text-[10px] text-slate-400">Kết nối trực tiếp tới phòng livestream để bắt chat, gift, like thật</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <span className="absolute left-3 top-2 text-xs text-slate-500">@</span>
              <input
                type="text"
                value={tiktokUsername}
                onChange={(e) => setTiktokUsername(e.target.value)}
                placeholder="username_tiktok"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {tiktokStatus === 'CONNECTED' ? (
              <button
                type="button"
                onClick={handleDisconnectTiktok}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
              >
                Ngắt Kết Nối
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectTiktok}
                disabled={isConnecting}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isConnecting ? 'Đang nối...' : 'Kết Nối Live'}
              </button>
            )}
          </div>
        </section>

        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Column 1: Thả Tim & Bình Luận Chat */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Heart className="w-4 h-4 text-rose-500" />
              <h2 className="text-xs font-black uppercase text-white">1. Thả Tim & Bình Luận</h2>
            </div>

            {/* Quick Heart Burst */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Giả lập Bão Thả Tim</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => handleSendLikes(10, 'BLG')}
                  className="py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 text-xs font-bold flex items-center justify-center space-x-1"
                >
                  <Heart className="w-3.5 h-3.5 fill-current text-cyan-400" />
                  <span>+10 Tim BLG</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendLikes(10, 'GENG')}
                  className="py-1.5 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/80 text-xs font-bold flex items-center justify-center space-x-1"
                >
                  <Heart className="w-3.5 h-3.5 fill-current text-amber-400" />
                  <span>+10 Tim GEN</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSendLikes(50, 'BLG')}
                  className="py-1.5 rounded-lg bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-200 border border-cyan-700/60 text-xs font-bold flex items-center justify-center space-x-1"
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+50 Tim BLG</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendLikes(50, 'GENG')}
                  className="py-1.5 rounded-lg bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border border-amber-700/60 text-xs font-bold flex items-center justify-center space-x-1"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>+50 Tim GEN</span>
                </button>
              </div>
            </div>

            {/* Custom Live Chat */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 block">Gửi bình luận hiển thị lên Live</label>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setChatTeam('BLG')}
                  className={`flex-1 py-1 rounded text-[10px] font-black ${
                    chatTeam === 'BLG' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  BLG
                </button>
                <button
                  type="button"
                  onClick={() => setChatTeam('GENG')}
                  className={`flex-1 py-1 rounded text-[10px] font-black ${
                    chatTeam === 'GENG' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  GEN.G
                </button>
              </div>

              <div className="flex space-x-1.5">
                <input
                  type="text"
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCustomChat()}
                  placeholder="Nhập nội dung chat..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleSendCustomChat}
                  className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Triệu Hồi Tướng */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Swords className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-black uppercase text-white">2. Triệu Hồi Tướng</h2>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nickname người xem</label>
                <input
                  type="text"
                  value={summonerName}
                  onChange={(e) => setSummonerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Chọn Phe</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTeam('BLG')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${
                      selectedTeam === 'BLG' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <BLGLogo className="w-4 h-4" />
                    <span>BLG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTeam('GENG')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${
                      selectedTeam === 'GENG' ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_#f59e0b]' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <GenGLogo className="w-4 h-4" />
                    <span>GEN.G</span>
                  </button>
                </div>
              </div>

              {/* 5-Player CKTG Roster Quick Pick */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Đội Hình Tuyển Thủ CKTG ({selectedTeam})
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(selectedTeam === 'BLG' ? BLG_ROSTER : GENG_ROSTER).map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setSelectedChampion(`${p.name} (${p.champ})`)}
                      className={`p-1.5 rounded-xl text-center transition border flex flex-col items-center ${
                        selectedChampion.includes(p.name)
                          ? selectedTeam === 'BLG'
                            ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_10px_#06b6d4]'
                            : 'bg-amber-950 border-amber-400 text-amber-300 shadow-[0_0_10px_#f59e0b]'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-700 mb-1">
                        <img
                          src={p.avatarUrl}
                          alt={p.champ}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute bottom-0 right-0 bg-slate-950/80 text-[7px] font-black px-0.5 rounded text-white leading-none">
                          {p.role}
                        </span>
                      </div>
                      <div className="text-[10px] font-black leading-tight">{p.name}</div>
                      <div className="text-[8px] text-slate-400 truncate w-full">{p.champ}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Chọn Tướng Triệu Hồi</label>
                <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto pr-1">
                  {CHAMPION_PRESETS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedChampion(c.name)}
                      className={`p-1.5 rounded text-left text-[11px] border ${
                        selectedChampion === c.name
                          ? 'bg-slate-800 border-cyan-400 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div>{c.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSummon}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow"
              >
                Triệu Hồi Ngay
              </button>
            </div>
          </div>

          {/* Column 3: Donate & Quà Tặng VIP */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Gift className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-black uppercase text-white">3. Tặng Quà VIP</h2>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Đại Gia Donate</label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Ủng hộ cho phe</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGiftTeam('BLG')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${
                      giftTeam === 'BLG' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <BLGLogo className="w-4 h-4" />
                    <span>BLG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiftTeam('GENG')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${
                      giftTeam === 'GENG' ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_#f59e0b]' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <GenGLogo className="w-4 h-4" />
                    <span>GEN.G</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Quà Tặng TikTok</label>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {GIFT_PRESETS.map((g) => (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => setSelectedGift(g)}
                      className={`w-full p-1.5 rounded flex items-center justify-between text-[11px] border ${
                        selectedGift.name === g.name
                          ? 'bg-slate-800 border-amber-400 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>{g.name}</span>
                      </div>
                      <span className="font-mono text-amber-400">{g.coins} xu</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendGift}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gửi Quà Tặng Hologram</span>
              </button>
            </div>
          </div>

          {/* Column 4: Boss & Bão Bot */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Activity className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-black uppercase text-white">4. Máu Boss & Bão Bot</h2>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span className="text-slate-400">Điều chỉnh máu Boss</span>
                  <span className="font-mono text-emerald-400 font-bold">{bossHp.toLocaleString()} HP</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="5000"
                  value={bossHp}
                  onChange={(e) => handleSetBossHp(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="grid grid-cols-3 gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetBossHp(100000)}
                    className="py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetBossHp(30000)}
                    className="py-1 rounded bg-purple-950 text-[10px] font-bold text-purple-300 hover:text-white"
                  >
                    Cuồng Nộ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetBossHp(0)}
                    className="py-1 rounded bg-rose-950 text-[10px] font-bold text-rose-300 hover:text-white"
                  >
                    Hạ Gục
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Bão Comment Bot</span>
                  <button
                    type="button"
                    onClick={() => setIsBotActive(!isBotActive)}
                    className={`py-1 px-3 rounded-lg text-xs font-bold flex items-center space-x-1 ${
                      isBotActive ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isBotActive ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>{isBotActive ? 'Dừng Bot' : 'Chạy Bot'}</span>
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                    <span>Tốc độ: {botSpeed} ms / lượt</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="2000"
                    step="100"
                    value={botSpeed}
                    onChange={(e) => setBotSpeed(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Event Logs */}
        <section className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase text-white">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Nhật Ký Tương Tác Trực Tiếp (Live Feed)</span>
              <span className="text-[10px] font-mono text-slate-400">({logs.length} mục)</span>
            </div>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Log</span>
            </button>
          </div>

          <div className="h-44 overflow-y-auto space-y-1 font-mono text-xs pr-1">
            {logs.length === 0 ? (
              <p className="text-slate-500 italic py-4 text-center">Chưa có sự kiện nào. Hãy click vào các panel phía trên để gửi lệnh thử nghiệm!</p>
            ) : (
              logs.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-2 py-1 px-2 rounded bg-slate-950/70 border border-slate-800/60"
                >
                  <span className="text-[10px] text-slate-500">{item.time}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      item.type === 'GIFT'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : item.type === 'SUMMON'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : item.type === 'LIKE'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.type}
                  </span>
                  {item.team && (
                    <span className={`text-[9px] font-black ${item.team === 'BLG' ? 'text-cyan-400' : 'text-amber-400'}`}>
                      [{item.team}]
                    </span>
                  )}
                  <span className="text-slate-200 truncate">{item.message}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;

