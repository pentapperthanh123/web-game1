import { useState } from 'react';

const REFERRER_POLICY = 'no-referrer';
const FALLBACK_EMOJI = '🎁';

interface GiftIconProps {
  imageUrl: string;
  name: string;
}

/** TikTok gift icon (their CDN refuses hotlinks with a referrer), or a gift emoji. */
export function GiftIcon({ imageUrl, name }: GiftIconProps) {
  const [hasFailed, setHasFailed] = useState(false);
  if (!imageUrl || hasFailed) {
    return <span className="w-8 h-8 flex items-center justify-center text-lg shrink-0">{FALLBACK_EMOJI}</span>;
  }
  return (
    <img
      src={imageUrl}
      alt={name}
      referrerPolicy={REFERRER_POLICY}
      onError={() => setHasFailed(true)}
      className="w-8 h-8 object-contain shrink-0"
    />
  );
}
