import React from 'react';
import ChipStack from './ChipStack'

type Position = 'top' | 'top-right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'top-left'

interface PlayerItemsProps {
  position: Position
  playerNumber: number
  betAmount?: number
}

const positionClasses: Record<Position, string> = {
  'top': 'absolute top-[5%] left-1/2 -translate-x-1/2',
  'top-right': 'absolute top-[20%] right-[10%]',
  'bottom-right': 'absolute bottom-[20%] right-[10%]', 
  'bottom': 'absolute bottom-[5%] left-1/2 -translate-x-1/2',
  'bottom-left': 'absolute bottom-[20%] left-[10%]',
  'top-left': 'absolute top-[20%] left-[10%]'
}

const PlayerItems = ({ position, playerNumber, betAmount = 0 }: PlayerItemsProps) => {
  return (
    <div className={`${positionClasses[position]} w-12 sm:w-16 h-12 sm:h-16 rounded flex flex-col items-center`}>
      <div className="text-[10px] sm:text-xs text-white text-center mb-1">
        {betAmount > 0 ? `Bet: $${betAmount}` : 'No Bet'}
      </div>
      {betAmount > 0 && (
        <div className="w-10 h-10 sm:w-12 sm:h-12">
          <ChipStack amount={betAmount} />
        </div>
      )}
    </div>
  )
}

export default PlayerItems 