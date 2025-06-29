import React from 'react';
import Card from './Card';

interface PlayerProps {
  position: 'top' | 'top-right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'top-left';
  name: string;
  money: number;
  cards?: string[];
  status?: string;
}

export default function Player({ position, name, money, cards = [], status }: PlayerProps) {
  // Position classes based on the position prop
  const positionClasses = {
    'top': 'absolute top-[2%] left-1/2 -translate-x-1/2',
    'top-right': 'absolute top-[15%] right-[5%]',
    'bottom-right': 'absolute bottom-[15%] right-[5%]',
    'bottom': 'absolute bottom-[2%] left-1/2 -translate-x-1/2',
    'bottom-left': 'absolute bottom-[15%] left-[5%]',
    'top-left': 'absolute top-[15%] left-[5%]',
  };

  return (
    <div className={`${positionClasses[position]} flex flex-col items-center`}>
      <div className="bg-neutral-900 border hover:border-neutral-700 hover:bg-neutral-800 transition-all duration-300 border-neutral-800 rounded-md p-2 flex flex-row gap-4">
        <div className="flex flex-col">
          <div className="text-neutral-200 text-xs sm:text-sm font-medium">{name}</div>
          <div className="text-green-400 text-xs sm:text-sm">${money}</div>
          {/* {status && <div className="text-yellow-300 text-xs mt-1">{status}</div>} */}
        </div>
        
        {/* Player cards */}
        {cards.length > 0 && (
          <div className="flex justify-center -space-x-3">
            {cards.map((card, index) => (
              <Card key={index} value={card} className="w-8 h-11 sm:w-10 sm:h-14" faceDown={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}