'use client'

import { FC } from 'react'

interface ChipStackProps {
  amount: number
  className?: string
}

const ChipStack: FC<ChipStackProps> = ({ amount, className = '' }) => {
  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      aria-label={`Amount: $${amount}`}
    >
      <span className="font-bold">${amount}</span>
    </div>
  )
}

export default ChipStack 