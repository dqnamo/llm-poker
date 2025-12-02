"use client";

import { Pirata_One } from "next/font/google";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const pirataOne = Pirata_One({
  variable: "--font-pirata-one",
  subsets: ["latin"],
  weight: ["400"],
});

interface DqnamoSignatureProps {
  className?: string;
}

export default function DqnamoSignature({ className }: DqnamoSignatureProps) {
  return (
    <p
      className={cn(
        "relative text-text-medium w-max text-xl cursor-pointer overflow-hidden transition-colors duration-300 hover:text-text-bright",
        pirataOne.className,
        className
      )}
      onClick={() => {
        window.open("https://dqnamo.com", "_blank");
      }}
    >
      dqnamo
    </p>
  );
}
