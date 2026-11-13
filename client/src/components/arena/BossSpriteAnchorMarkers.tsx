import React from 'react';
import {
  BOSS_ANCHOR_ELEMENT_ID,
  BossSpriteFormAnchors,
  SpriteAnchorPoint,
} from '../../constants/bossSpriteAnchors';

const toAnchorStyle = (point: SpriteAnchorPoint): React.CSSProperties => ({
  left: `${point.leftPercent}%`,
  top: `${point.topPercent}%`,
});

interface BossSpriteAnchorMarkersProps {
  anchors: BossSpriteFormAnchors;
}

/**
 * Zero-size markers placed on the jaw, eye and body of the sprite. They sit inside
 * the flip / scale / patrol wrappers, so their on-screen rect always tracks the art;
 * 3D skill VFX read them at cast time to launch from the real mouth.
 */
export const BossSpriteAnchorMarkers = React.memo(({ anchors }: BossSpriteAnchorMarkersProps) => (
  <>
    <span id={BOSS_ANCHOR_ELEMENT_ID.MOUTH} aria-hidden="true" className="absolute w-0 h-0 pointer-events-none" style={toAnchorStyle(anchors.mouth)} />
    <span id={BOSS_ANCHOR_ELEMENT_ID.EYE} aria-hidden="true" className="absolute w-0 h-0 pointer-events-none" style={toAnchorStyle(anchors.eye)} />
    <span id={BOSS_ANCHOR_ELEMENT_ID.CORE} aria-hidden="true" className="absolute w-0 h-0 pointer-events-none" style={toAnchorStyle(anchors.core)} />
  </>
));

BossSpriteAnchorMarkers.displayName = 'BossSpriteAnchorMarkers';
