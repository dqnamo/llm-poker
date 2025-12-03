'use client'

import { Club, Diamond, Heart, Spade } from '@phosphor-icons/react';
import { motion } from "motion/react"
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
  const rank = value.slice(0, -1);


  let rankText = rank;
  if (rank === 'T') {
    rankText = '10';
  }

  const isRed = suit === 'h' || suit === 'd';
  const textColor = isRed ? 'text-neutral-200' : 'text-neutral-200';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className={`relative bg-white rounded-md flex items-center justify-center shadow-sm ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >

      {/* <CornerBorders borderColor={borderColor} /> */}

      {(!faceDown || isHovered) ? (
        // Face up card
        <div className={`flex flex-col gap-0.5 2xl:gap-1 items-center justify-center w-full h-full ${textColor}`}>
          <span className="text-[10px] sm:text-xs 2xl:text-base font-bold font-sans text-neutral-900">{rankText}</span>
          {/* <span className="text-xs sm:text-sm font-bold">{suit}</span> */}

          {suit === 'h' && <Heart className={`w-2.5 h-2.5 sm:w-3 sm:h-3 2xl:w-4 2xl:h-4 ${isRed ? 'text-red-500' : 'text-neutral-300'}`} weight={`${isRed ? 'fill' : 'fill'}`} />}
          {suit === 'd' && <Diamond className={`w-2.5 h-2.5 sm:w-3 sm:h-3 2xl:w-4 2xl:h-4 ${isRed ? 'text-red-500' : 'text-neutral-300'}`} weight={`${isRed ? 'fill' : 'fill'}`} />}
          {suit === 'c' && <Club className={`w-2.5 h-2.5 sm:w-3 sm:h-3 2xl:w-4 2xl:h-4 ${isRed ? 'text-red-500' : 'text-neutral-900'}`} weight={`${isRed ? 'fill' : 'fill'}`} />}
          {suit === 's' && <Spade className={`w-2.5 h-2.5 sm:w-3 sm:h-3 2xl:w-4 2xl:h-4 ${isRed ? 'text-red-500' : 'text-neutral-900'}`} weight={`${isRed ? 'fill' : 'fill'}`} />}
        </div>
      ) : (
        // Face down card
        <div className="w-full h-full bg-gradient-to-br from-blue-800 to-blue-600 rounded-md flex items-center justify-center">
          <div className="w-3/4 h-3/4 border-2 border-blue-300 rounded opacity-50"></div>
        </div>
      )}
    </motion.div>
  );
};



export default Card; 