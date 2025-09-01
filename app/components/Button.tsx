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
      className={`bg-neutral-950 border border-neutral-900 text-neutral-200 px-4 py-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-900 transition-colors flex items-center gap-2 justify-center ${className}`}
    >
      {children}
    </button>
  )
}