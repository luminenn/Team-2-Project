import React from 'react';

export const BrainFlameSvg: React.FC<{ className?: string }> = ({ className = "w-36 h-36" }) => {
  return (
    <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Flame top (Yellow & Orange) */}
      <path
        d="M100 10C100 10 120 40 115 60C125 45 135 40 140 30C140 30 155 60 145 85C160 70 170 65 170 65C170 65 180 95 160 120C150 110 140 105 135 105C135 105 140 120 125 125C110 130 105 115 100 105C95 115 90 130 75 125C60 120 65 105 65 105C60 105 50 110 40 120C20 95 30 65 30 65C30 65 40 70 55 85C45 60 60 30 60 30C65 40 75 45 85 60C80 40 100 10 100 10Z"
        fill="#FFD200"
      />
      <path
        d="M100 30C100 30 112 52 108 68C116 56 124 52 128 44C128 44 140 68 132 88C144 76 152 72 152 72C152 72 160 96 144 116C136 108 128 104 124 104C124 104 128 116 116 120C104 124 100 112 96 104C92 112 88 124 76 120C64 116 68 104 68 104C64 104 56 108 48 116C32 96 40 72 40 72C40 72 48 76 60 88C52 68 64 44 64 44C68 52 76 56 84 68C80 52 100 30 100 30Z"
        fill="#FF9F00"
      />
      {/* Brain Body (Vibrant Orange) */}
      <g>
        {/* Left Hemisphere lobes */}
        <path
          d="M75 110C50 110 30 130 30 155C30 180 50 195 70 195C70 205 80 215 95 215C100 215 105 210 105 200V120C90 110 80 110 75 110Z"
          fill="#FF6B35"
        />
        {/* Right Hemisphere lobes */}
        <path
          d="M125 110C150 110 170 130 170 155C170 180 150 195 130 195C130 205 120 215 105 215C100 215 95 210 95 200V120C110 110 120 110 125 110Z"
          fill="#FF6B35"
        />
        {/* Brain Folds & Sulci Lines */}
        <path d="M55 145C65 135 85 145 95 140" stroke="#CC4E1B" strokeWidth="4" strokeLinecap="round" />
        <path d="M45 165C60 160 80 175 95 165" stroke="#CC4E1B" strokeWidth="4" strokeLinecap="round" />
        <path d="M65 185C75 175 85 190 95 185" stroke="#CC4E1B" strokeWidth="4" strokeLinecap="round" />
        <path d="M145 145C135 135 115 145 105 140" stroke="#CC4E1B" strokeWidth="4" strokeLinecap="round" />
        <path d="M155 165C140 160 120 175 105 165" stroke="#CC4E1B" strokeWidth="4" strokeLinecap="round" />
        <path d="M135 185C125 175 115 190 105 185" stroke="#CC4E1B" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
};
