import React from 'react';

export const LoginCharactersSvg: React.FC<{ className?: string }> = ({ className = "w-full h-auto max-w-lg" }) => {
  return (
    <svg viewBox="0 0 500 450" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      
      {/* 1. Purple Tall Rectangle Character (Back Center Left) */}
      <rect x="150" y="100" width="115" height="270" rx="4" fill="#6320EE" />
      {/* Purple Character Eyes */}
      <circle cx="185" cy="140" r="5" fill="#FFFFFF" />
      <circle cx="185" cy="140" r="2.5" fill="#000000" />
      <circle cx="230" cy="140" r="5" fill="#FFFFFF" />
      <circle cx="230" cy="140" r="2.5" fill="#000000" />
      {/* Purple Character Mouth Line */}
      <line x1="207.5" y1="140" x2="207.5" y2="175" stroke="#000000" strokeWidth="4" strokeLinecap="round" />

      {/* 2. Black Rectangle Character (Back Center Right) */}
      <rect x="290" y="210" width="75" height="160" rx="4" fill="#18181B" />
      {/* Black Character Eyes */}
      <circle cx="315" cy="245" r="5" fill="#FFFFFF" />
      <circle cx="315" cy="245" r="2.5" fill="#000000" />
      <circle cx="340" cy="245" r="5" fill="#FFFFFF" />
      <circle cx="340" cy="245" r="2.5" fill="#000000" />

      {/* 3. Orange Semi-Circle Character (Front Left) */}
      <path
        d="M75 370C75 276.112 151.112 200 245 200C338.888 200 415 276.112 415 370H75Z"
        fill="#FF6B35"
      />
      {/* Orange Character Eyes & Mouth */}
      <circle cx="165" cy="315" r="4.5" fill="#000000" />
      <circle cx="215" cy="315" r="4.5" fill="#000000" />
      <path d="M180 326C185 333 195 333 200 326" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" fill="none" />

      {/* 4. Yellow Pillar Character with Beak (Front Right) */}
      <path
        d="M360 270C360 250 376 234 396 234C416 234 432 250 432 270V370H360V270Z"
        fill="#F8E14B"
      />
      {/* Yellow Character Eye */}
      <circle cx="395" cy="275" r="4.5" fill="#000000" />
      {/* Yellow Character Beak/Line */}
      <line x1="410" y1="290" x2="450" y2="290" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" />

    </svg>
  );
};
