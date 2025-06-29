import Link from "next/link";

interface FramedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
}

export default function FramedLink({ href, children, className = "", target }: FramedLinkProps) {
  return (
    <Link 
      href={href}
      target={target}
      className={`relative text-xs text-neutral-400 hover:text-neutral-200 px-4 py-2 border border-neutral-900 flex flex-row items-center gap-1 group transition-all duration-300 ${className}`}
    >
      <div className="border-r-2 border-t-2 border-neutral-400 h-2 w-2 absolute -top-1 -right-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300"/>
      <div className="border-l-2 border-b-2 border-neutral-400 h-2 w-2 absolute -bottom-1 -left-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300"/>
      <div className="border-l-2 border-t-2 border-neutral-400 h-2 w-2 absolute -top-1 -left-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300"/>
      <div className="border-r-2 border-b-2 border-neutral-400 h-2 w-2 absolute -bottom-1 -right-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300"/>
      {children}
    </Link>
  );
} 