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
  const borderColor = isRed ? 'border-red-500' : 'border-neutral-300';
  
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
        <div className={`flex flex-col gap-1 items-center justify-center w-full h-full ${textColor}`}>
          <span className="text-xs sm:text-sm font-bold text-neutral-900">{rankText}</span>
          {/* <span className="text-xs sm:text-sm font-bold">{suit}</span> */}

          {suit === 'h' && <Heart className={`w-3 h-3 ${isRed ? 'text-red-500' : 'text-neutral-300'}`} weight={`${isRed ? 'fill' : 'fill'}`} />}
          {suit === 'd' && <Diamond className={`w-3 h-3 ${isRed ? 'text-red-500' : 'text-neutral-300'}`} weight={`${isRed ? 'fill' : 'fill'}`} />}
          {suit === 'c' && <Club className={`w-3 h-3 ${isRed ? 'text-red-500' : 'text-neutral-900'}`} weight={`${isRed ? 'fill' : 'fill'}`} />}
          {suit === 's' && <Spade className={`w-3 h-3 ${isRed ? 'text-red-500' : 'text-neutral-900'}`} weight={`${isRed ? 'fill' : 'fill'}`} />}
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

const CornerBorders = ({ borderColor }: { borderColor: string }) => {
  return (
    <>
      <div className={`border-r-1 border-t-1 ${borderColor} h-1 w-1 absolute -top-px -right-px`}/>
      <div className={`border-l-1 border-b-1 ${borderColor} h-1 w-1 absolute -bottom-px -left-px`}/>
      <div className={`border-l-1 border-t-1 ${borderColor} h-1 w-1 absolute -top-px -left-px`}/>
      <div className={`border-r-1 border-b-1 ${borderColor} h-1 w-1 absolute -bottom-px -right-px`}/>
    </>
  );
};

export default Card; 