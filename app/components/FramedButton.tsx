export default function FramedButton({ children, onClick, className = "", borderColorClass = "border-neutral-400" }: { children: React.ReactNode, onClick: () => void, className?: string, borderColorClass?: string }) {
  return (
    <button 
    onClick={onClick}
    className={`relative text-xs text-neutral-400 hover:text-neutral-200 px-4 py-2 border border-neutral-900 flex flex-row items-center gap-1 group transition-all duration-300 ${className}`}
  >
    <div className={`border-r-2 border-t-2 ${borderColorClass} h-2 w-2 absolute -top-1 -right-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300`}/>
    <div className={`border-l-2 border-b-2 ${borderColorClass} h-2 w-2 absolute -bottom-1 -left-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300`}/>
    <div className={`border-l-2 border-t-2 ${borderColorClass} h-2 w-2 absolute -top-1 -left-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300`}/>
    <div className={`border-r-2 border-b-2 ${borderColorClass} h-2 w-2 absolute -bottom-1 -right-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300`}/>
    {children}
  </button>
  );
}