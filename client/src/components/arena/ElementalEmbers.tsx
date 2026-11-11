import React from 'react';

interface ElementalEmbersProps {
  isElderDragon: boolean;
  isEnraged: boolean;
  isDefeated: boolean;
}

interface EmberItem {
  id: number;
  left: string;
  bottom: string;
  tx: string;
  ty: string;
  dur: string;
  delay: string;
  size: string;
}

const EMBER_CONFIGS: readonly EmberItem[] = [
  { id: 1, left: '18%', bottom: '28%', tx: '-22px', ty: '-85px', dur: '2.4s', delay: '0s', size: 'w-1.5 h-1.5' },
  { id: 2, left: '32%', bottom: '22%', tx: '16px', ty: '-105px', dur: '2.8s', delay: '0.5s', size: 'w-2 h-2' },
  { id: 3, left: '50%', bottom: '16%', tx: '-12px', ty: '-90px', dur: '2.1s', delay: '1.0s', size: 'w-1.5 h-1.5' },
  { id: 4, left: '68%', bottom: '24%', tx: '24px', ty: '-95px', dur: '2.6s', delay: '1.4s', size: 'w-2 h-2' },
  { id: 5, left: '82%', bottom: '30%', tx: '18px', ty: '-75px', dur: '2.3s', delay: '0.7s', size: 'w-1.5 h-1.5' },
  { id: 6, left: '44%', bottom: '34%', tx: '-16px', ty: '-115px', dur: '3.1s', delay: '1.8s', size: 'w-2.5 h-2.5' },
];

export const ElementalEmbers: React.FC<ElementalEmbersProps> = React.memo(
  ({ isElderDragon, isEnraged, isDefeated }) => {
    if (isDefeated) return null;

    const emberColor = isElderDragon
      ? isEnraged
        ? '#f97316'
        : '#f59e0b'
      : isEnraged
        ? '#ef4444'
        : '#c084fc';

    return (
      <div className="absolute inset-0 pointer-events-none z-10 overflow-visible">
        {EMBER_CONFIGS.map((ember) => (
          <div
            key={ember.id}
            style={{
              left: ember.left,
              bottom: ember.bottom,
              ['--ember-tx' as string]: ember.tx,
              ['--ember-ty' as string]: ember.ty,
              ['--ember-dur' as string]: ember.dur,
              animationDelay: ember.delay,
              backgroundColor: emberColor,
              boxShadow: `0 0 10px ${emberColor}, 0 0 20px ${emberColor}`,
            }}
            className={`absolute rounded-full animate-ember ${ember.size}`}
          />
        ))}
      </div>
    );
  }
);

ElementalEmbers.displayName = 'ElementalEmbers';
