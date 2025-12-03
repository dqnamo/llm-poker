"use client";

import Link from "next/link";

// Animated corner borders that fade in and "lock in" on hover
const AnimatedCornerBorders = ({
  colorClass = "border-dark-10",
  size = 2,
}: {
  colorClass?: string;
  size?: number;
}) => {
  const baseStyles =
    "transition-all duration-200 ease-out opacity-0 group-hover:opacity-100";

  return (
    <>
      {/* Top-right */}
      <div
        className={`${baseStyles} border-r-${size} border-t-${size} ${colorClass} h-${size} w-${size} absolute -top-2 -right-2 group-hover:-top-0.5 group-hover:-right-0.5`}
      />
      {/* Bottom-left */}
      <div
        className={`${baseStyles} border-l-${size} border-b-${size} ${colorClass} h-${size} w-${size} absolute -bottom-2 -left-2 group-hover:-bottom-0.5 group-hover:-left-0.5`}
      />
      {/* Top-left */}
      <div
        className={`${baseStyles} border-l-${size} border-t-${size} ${colorClass} h-${size} w-${size} absolute -top-2 -left-2 group-hover:-top-0.5 group-hover:-left-0.5`}
      />
      {/* Bottom-right */}
      <div
        className={`${baseStyles} border-r-${size} border-b-${size} ${colorClass} h-${size} w-${size} absolute -bottom-2 -right-2 group-hover:-bottom-0.5 group-hover:-right-0.5`}
      />
    </>
  );
};

interface AnimatedFramedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
}

export default function AnimatedFramedLink({
  href,
  children,
  className = "",
  target,
}: AnimatedFramedLinkProps) {
  return (
    <Link
      href={href}
      target={target}
      className={`relative text-xs 2xl:text-sm text-text-dim hover:text-text-medium px-4 py-2 2xl:px-5 2xl:py-3 bg-dark-4 border border-dark-6 hover:bg-dark-5 flex flex-row items-center gap-1.5 2xl:gap-2 group transition-all duration-300 ${className}`}
    >
      <AnimatedCornerBorders size={2} colorClass="border-dark-10" />
      {children}
    </Link>
  );
}

// Also export a button version for non-link use cases
interface AnimatedFramedButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function AnimatedFramedButton({
  onClick,
  children,
  className = "",
  disabled = false,
}: AnimatedFramedButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative text-xs 2xl:text-sm text-text-dim hover:text-text-medium px-4 py-2 2xl:px-5 2xl:py-3 bg-dark-4 border border-dark-6 hover:bg-dark-5 flex flex-row items-center gap-1.5 2xl:gap-2 group transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <AnimatedCornerBorders size={2} colorClass="border-dark-10" />
      {children}
    </button>
  );
}

