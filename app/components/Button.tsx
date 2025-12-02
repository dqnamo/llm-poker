interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export default function Button({ children, onClick, disabled = false, className = "" }: ButtonProps) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`bg-dark-3 border border-dark-6 text-text-medium px-4 py-2 2xl:px-6 2xl:py-3 text-xs 2xl:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-4 hover:border-dark-8 transition-colors flex items-center gap-2 2xl:gap-3 justify-center ${className}`}
    >
      {children}
    </button>
  )
}
