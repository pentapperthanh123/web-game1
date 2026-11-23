import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

export const ScreenFlash = () => {
  const screenFlashColor = useGameStore((state) => state.screenFlashColor);
  const screenFlashTimestamp = useGameStore((state) => state.screenFlashTimestamp);
  const [activeColor, setActiveColor] = useState<string | null>(null);

  useEffect(() => {
    if (!screenFlashColor || !screenFlashTimestamp) return;

    // Trigger flash and auto-clear after 350ms
    setActiveColor(screenFlashColor);
    const timer = setTimeout(() => {
      setActiveColor(null);
    }, 350);

    return () => clearTimeout(timer);
  }, [screenFlashTimestamp, screenFlashColor]);

  if (!activeColor) return null;

  return (
    <div
      style={{
        backgroundColor: activeColor,
      }}
      className="absolute inset-0 pointer-events-none z-50 animate-screen-flash mix-blend-screen"
    />
  );
};

