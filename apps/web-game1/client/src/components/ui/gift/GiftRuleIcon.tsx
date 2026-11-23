import { useState } from 'react';
import clsx from 'clsx';
import { GIFT_IMAGE_FALLBACK_EMOJI, GIFT_IMAGE_REFERRER_POLICY } from './giftRuleDisplay';

interface GiftRuleIconProps {
  imageUrl: string;
  name: string;
  sizeClassName: string;
}

/** TikTok gift icon, or a gift emoji when the rule has no image or it fails to load. */
export const GiftRuleIcon = ({ imageUrl, name, sizeClassName }: GiftRuleIconProps) => {
  const [hasFailed, setHasFailed] = useState(false);
  if (!imageUrl || hasFailed) {
    return (
      <span className={clsx('flex items-center justify-center leading-none shrink-0', sizeClassName)} aria-hidden="true">
        {GIFT_IMAGE_FALLBACK_EMOJI}
      </span>
    );
  }
  return (
    <img
      src={imageUrl}
      alt={name}
      referrerPolicy={GIFT_IMAGE_REFERRER_POLICY}
      className={clsx('object-contain shrink-0', sizeClassName)}
      onError={() => setHasFailed(true)}
    />
  );
};
