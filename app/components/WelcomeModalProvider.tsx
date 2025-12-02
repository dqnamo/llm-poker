"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import WelcomeModal from "./WelcomeModal";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

export function WelcomeModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (hasChecked) return;

    // Check if user has seen the modal before
    const hasSeenModal = getCookie("LLMPokerWelcomeViewed") === "true";

    if (hasSeenModal) {
      setHasChecked(true);
      return;
    }

    // Show modal for new users with a small delay to let the UI settle
    const timer = setTimeout(() => {
      setShowModal(true);
      setHasChecked(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [hasChecked]);

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {showModal && <WelcomeModal onClose={handleClose} />}
      </AnimatePresence>
    </>
  );
}

