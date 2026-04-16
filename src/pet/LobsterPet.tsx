import React from 'react';

const LobsterPet: React.FC = () => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Body */}
    <ellipse cx="40" cy="48" rx="18" ry="20" fill="var(--pet-body)" />
    <ellipse cx="40" cy="50" rx="13" ry="13" fill="var(--pet-belly)" />
    {/* Head */}
    <circle cx="40" cy="30" r="16" fill="var(--pet-body-light)" />
    {/* Antennae */}
    <path d="M33 18 Q28 6 24 2" stroke="var(--pet-body)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M47 18 Q52 6 56 2" stroke="var(--pet-body)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <circle cx="24" cy="2" r="2.5" fill="var(--pet-body-light)" />
    <circle cx="56" cy="2" r="2.5" fill="var(--pet-body-light)" />
    {/* Eyes */}
    <circle cx="33" cy="28" r="5" fill="var(--pet-eye-white)" />
    <circle cx="47" cy="28" r="5" fill="var(--pet-eye-white)" />
    <circle cx="34" cy="28" r="2.8" fill="var(--pet-eye-pupil)" />
    <circle cx="48" cy="28" r="2.8" fill="var(--pet-eye-pupil)" />
    <circle cx="35" cy="27" r="1" fill="var(--pet-eye-shine)" />
    <circle cx="49" cy="27" r="1" fill="var(--pet-eye-shine)" />
    {/* Cheeks */}
    <circle cx="25" cy="33" r="3.5" fill="var(--pet-cheek)" />
    <circle cx="55" cy="33" r="3.5" fill="var(--pet-cheek)" />
    {/* Mouth */}
    <path d="M35 35 Q40 39 45 35" stroke="var(--pet-eye-pupil)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Left Claw */}
    <g className="left-claw">
      <path d="M22 42 Q12 36 10 30" stroke="var(--pet-body)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="9" cy="27" rx="5" ry="4" fill="var(--pet-body-light)" transform="rotate(-20 9 27)" />
      <path d="M6 24 Q9 21 12 24" stroke="var(--pet-body)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </g>
    {/* Right Claw */}
    <g className="right-claw">
      <path d="M58 42 Q68 36 70 30" stroke="var(--pet-body)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="71" cy="27" rx="5" ry="4" fill="var(--pet-body-light)" transform="rotate(20 71 27)" />
      <path d="M68 24 Q71 21 74 24" stroke="var(--pet-body)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </g>
    {/* Legs */}
    <line x1="28" y1="58" x2="22" y2="66" stroke="var(--pet-body)" strokeWidth="2" strokeLinecap="round" />
    <line x1="34" y1="60" x2="30" y2="68" stroke="var(--pet-body)" strokeWidth="2" strokeLinecap="round" />
    <line x1="46" y1="60" x2="50" y2="68" stroke="var(--pet-body)" strokeWidth="2" strokeLinecap="round" />
    <line x1="52" y1="58" x2="58" y2="66" stroke="var(--pet-body)" strokeWidth="2" strokeLinecap="round" />
    {/* Tail */}
    <ellipse cx="40" cy="68" rx="8" ry="5" fill="var(--pet-body)" />
    <path d="M36 72 Q40 78 44 72" stroke="var(--pet-body-light)" strokeWidth="1.5" fill="none" />
  </svg>
);

export default LobsterPet;
