import React, { useId } from 'react';

/**
 * Pet mascot — uses the OpenClaw official lobster (the same chubby red
 * silhouette from the favicon / LobsterIcon component), scaled up and
 * with .left-claw / .right-claw groups so existing pet.css animations
 * (wave-claw, squish, bounce) still attach.
 */
const LobsterPet: React.FC = () => {
  const id = useId();
  const gradientId = `pet-lobster-gradient-${id}`;

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4d4d" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
      </defs>

      {/* Body */}
      <path
        d="M60 10 C30 10 15 35 15 55 C15 75 30 95 45 100 L45 110 L55 110 L55 100 C55 100 60 102 65 100 L65 110 L75 110 L75 100 C90 95 105 75 105 55 C105 35 90 10 60 10Z"
        fill={`url(#${gradientId})`}
      />

      {/* Left claw */}
      <g className="left-claw" style={{ transformOrigin: '15px 55px' }}>
        <path
          d="M20 45 C5 40 0 50 5 60 C10 70 20 65 25 55 C28 48 25 45 20 45Z"
          fill={`url(#${gradientId})`}
        />
      </g>

      {/* Right claw */}
      <g className="right-claw" style={{ transformOrigin: '105px 55px' }}>
        <path
          d="M100 45 C115 40 120 50 115 60 C110 70 100 65 95 55 C92 48 95 45 100 45Z"
          fill={`url(#${gradientId})`}
        />
      </g>

      {/* Antennae */}
      <path d="M45 15 Q35 5 30 8" stroke="#ff4d4d" strokeWidth="3" strokeLinecap="round" />
      <path d="M75 15 Q85 5 90 8" stroke="#ff4d4d" strokeWidth="3" strokeLinecap="round" />

      {/* Eyes */}
      <circle cx="45" cy="35" r="6" fill="#050810" />
      <circle cx="75" cy="35" r="6" fill="#050810" />
      <circle cx="46" cy="34" r="2.5" fill="#00e5cc" />
      <circle cx="76" cy="34" r="2.5" fill="#00e5cc" />
    </svg>
  );
};

export default LobsterPet;
