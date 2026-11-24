import React from 'react';

export const SafeBottomZone: React.FC = () => {
  return (
    <div className="absolute top-[920px] left-0 w-full h-[360px] z-0 pointer-events-none overflow-hidden bg-gradient-to-t from-black via-[#080503] to-transparent">
      {/* Soft Vintage Ambient Floor Gradient (Completely clean for TikTok LIVE chat overlay) */}
      <div className="w-full h-full opacity-15 bg-[radial-gradient(#3a2312_1px,transparent_1px)] [background-size:24px_24px]" />
    </div>
  );
};
