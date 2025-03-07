'use client'

import React, { useState } from 'react';

interface CardProps {
  value: string;
  className?: string;
  faceDown?: boolean;
}

const Card = ({ value, className = "", faceDown = false }: CardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Determine card color based on suit
  const suit = value.slice(-1);
  const isRed = suit === '♥' || suit === '♦';
  const textColor = isRed ? 'text-red-600' : 'text-black';
  
  return (
    <div 
      className={`relative bg-white rounded-md flex items-center justify-center shadow-md transition-transform duration-200 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {(!faceDown || isHovered) ? (
        // Face up card
        <div className={`flex flex-col items-center justify-center w-full h-full ${textColor}`}>
          <span className="text-xs sm:text-sm font-bold">{value}</span>
        </div>
      ) : (
        // Face down card
        <div className="w-full h-full bg-gradient-to-br from-blue-800 to-blue-600 rounded-md flex items-center justify-center">
          <div className="w-3/4 h-3/4 border-2 border-blue-300 rounded opacity-50"></div>
        </div>
      )}
    </div>
  );
};

export default Card; 