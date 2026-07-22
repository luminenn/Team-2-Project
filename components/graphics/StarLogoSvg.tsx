import React from 'react';

export const StarLogoSvg: React.FC<{ className?: string; color?: string }> = ({ 
  className = "w-6 h-6", 
  color = "currentColor" 
}) => {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M50 0C50 27.614 27.614 50 0 50C27.614 50 50 72.386 50 100C50 72.386 72.386 50 100 50C72.386 50 50 27.614 50 0Z"
        fill={color}
      />
    </svg>
  );
};
