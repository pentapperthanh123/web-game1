export type SupportedLanguage = 'EN' | 'VI';

export interface PrankI18nDictionary {
  tierLabels: Record<string, string>;
  hud: {
    rageMeter: string;
    hits: string;
    topPranker: string;
    safeZone: string;
    meltdownBanner: string;
  };
  admin: {
    title: string;
    subtitle: string;
    directControls: string;
    liveSimulator: string;
    autoBotPrank: string;
    audioSettings: string;
    hostMicMode: string;
    micDesc: string;
    keywordsConfig: string;
    meltdownButton: string;
    cleanButton: string;
    resetButton: string;
  };
}

export const I18N_DICTIONARIES: Record<SupportedLanguage, PrankI18nDictionary> = {
  EN: {
    tierLabels: {
      CHILL: 'CHILL',
      ANNOYED: 'ANNOYED',
      FURIOUS: 'FURIOUS',
      MELTDOWN: 'MELTDOWN!',
    },
    hud: {
      rageMeter: 'RAGE / CHAOS METER',
      hits: 'Hits:',
      topPranker: 'Top:',
      safeZone: 'Safe Zone for Chat (y: 985–1280)',
      meltdownBanner: '🔥 MELTDOWN ACTIVE! MAXIMUM CHAOS! 🔥',
    },
    admin: {
      title: 'PRANK TARGET 3D',
      subtitle: 'TikTok LIVE Interactive Studio • 30 FPS • Port 5000',
      directControls: 'DIRECT HOST CONTROLS',
      liveSimulator: 'LIVE INTERACTION SIMULATOR',
      autoBotPrank: 'AUTO-BOT PRANK',
      audioSettings: 'AUDIO & HOST MIC MODE',
      hostMicMode: 'Host Mic Mode',
      micDesc: 'Reduces impact SFX by 65% when host is speaking.',
      keywordsConfig: '6 GIFTS & KEYWORDS CONFIG',
      meltdownButton: 'FORCE 100% MELTDOWN',
      cleanButton: 'WIPE TARGET CLEAN',
      resetButton: 'RESET SESSION',
    },
  },
  VI: {
    tierLabels: {
      CHILL: 'BÌNH THẢN',
      ANNOYED: 'BẮT ĐẦU CÁU',
      FURIOUS: 'CỰC KỲ BỰC BỘI',
      MELTDOWN: 'BÙNG NỔ CÁU!',
    },
    hud: {
      rageMeter: 'ĐỘ CÁU / CHỊU ĐÒN',
      hits: 'Đòn ăn:',
      topPranker: 'Top:',
      safeZone: 'Vùng an toàn cho khung chat (y: 985–1280)',
      meltdownBanner: '🔥 BÙNG NỔ CÁU! ÔNG LÃO BỐC HOẢ! 🔥',
    },
    admin: {
      title: 'PRANK TARGET 3D',
      subtitle: 'Bảng điều khiển tương tác TikTok LIVE • 30 FPS • Cổng 5000',
      directControls: 'ĐIỀU KHIỂN TRỰC TIẾP TỪ HOST',
      liveSimulator: 'BỘ GIẢ LẬP TƯƠNG TÁC LIVE',
      autoBotPrank: 'TỰ ĐỘNG GIẢ LẬP (AUTO-BOT)',
      audioSettings: 'ÂM THANH & CHẾ ĐỘ MIC HOST',
      hostMicMode: 'Chế độ Mic Host',
      micDesc: 'Tự động giảm 65% âm thanh va chạm khi Host nói chuyện.',
      keywordsConfig: 'CẤU HÌNH 6 PHẦN QUÀ & TỪ KHÓA',
      meltdownButton: 'ÉP BÙNG NỔ 100%',
      cleanButton: 'LAU SẠCH NGƯỜI',
      resetButton: 'LÀM MỚI PHIÊN',
    },
  },
};
