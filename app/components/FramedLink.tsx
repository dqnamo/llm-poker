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
      className={`relative text-xs 2xl:text-sm text-text-dim hover:text-text-medium px-4 py-2 2xl:px-5 2xl:py-3 border border-dark-5 flex flex-row items-center gap-1.5 2xl:gap-2 group transition-all duration-300 ${className}`}
    >
      <div className="border-r-2 border-t-2 border-dark-10 h-2 w-2 2xl:h-2.5 2xl:w-2.5 absolute -top-1 -right-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300"/>
      <div className="border-l-2 border-b-2 border-dark-10 h-2 w-2 2xl:h-2.5 2xl:w-2.5 absolute -bottom-1 -left-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300"/>
      <div className="border-l-2 border-t-2 border-dark-10 h-2 w-2 2xl:h-2.5 2xl:w-2.5 absolute -top-1 -left-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300"/>
      <div className="border-r-2 border-b-2 border-dark-10 h-2 w-2 2xl:h-2.5 2xl:w-2.5 absolute -bottom-1 -right-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300"/>
      {children}
    </Link>
  );
}
