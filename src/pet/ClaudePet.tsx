import React from 'react';

/**
 * Claude pet mascot — a chunky pixel-art critter inspired by Anthropic's
 * pixel-art lobster sticker style: square orange body, two black square
 * eyes, two stubby white legs underneath. Uses the same .left-claw /
 * .right-claw / .lobster-svg group hooks the LobsterPet exposes so the
 * existing pet.css idle / wave / squish / bounce animations apply.
 */
const ClaudePet: React.FC = () => {
  // Palette: Claude orange + body shadow + black eyes + white legs.
  const orange = '#cc785c';
  const orangeShadow = '#a04e30';
  const eye = '#0a0a0a';
  const leg = '#fafafa';

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}
      shapeRendering="crispEdges"
    >
      {/* Body — chunky rounded-square block. Notched corners give the
          pixel-art look without manually placing 100+ rects. */}
      <path
        d="M 30 35 H 90 V 40 H 95 V 70 H 90 V 80 H 80 V 70 H 75 V 80 H 65 V 70 H 60 V 80 H 50 V 70 H 45 V 80 H 35 V 70 H 30 V 70 H 25 V 40 H 30 Z"
        fill={orange}
      />

      {/* Subtle inner shadow on the right edge for chunky depth */}
      <path
        d="M 88 40 H 95 V 70 H 88 Z"
        fill={orangeShadow}
        opacity="0.18"
      />

      {/* Two stubby legs — kept in the .left-claw / .right-claw groups
          so the pet.css squish / wave animations attach. */}
      <g className="left-claw" style={{ transformOrigin: '42px 78px' }}>
        <rect x="38" y="78" width="9" height="14" fill={leg} stroke={eye} strokeWidth="2" />
      </g>
      <g className="right-claw" style={{ transformOrigin: '78px 78px' }}>
        <rect x="73" y="78" width="9" height="14" fill={leg} stroke={eye} strokeWidth="2" />
      </g>

      {/* Eyes — two black squares (pixel-art style) */}
      <rect x="42" y="48" width="9" height="9" fill={eye} />
      <rect x="69" y="48" width="9" height="9" fill={eye} />
    </svg>
  );
};

export default ClaudePet;
