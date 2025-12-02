"use client";

import { useState } from "react";
import {
  X,
  DiamondsFourIcon,
  GithubLogoIcon,
  DiscordLogoIcon,
  Spade,
  Heart,
  Club,
  Diamond,
  ArrowRight,
  Check,
  Key,
  ArrowRightIcon,
  PlugsConnectedIcon,
  HeadCircuitIcon,
  CodeIcon,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import DqnamoSignature from "./DqnamoSignature";
import { CornerBorders } from "./GameSidebar";
import { ReactNode, ComponentType } from "react";

// Animated corner borders that fade in and "lock in" on hover
const AnimatedCornerBorders = ({
  colorClass = "border-dark-5",
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

type Step = "welcome" | "api-key";
type AIProvider = "openrouter" | "vercel-ai-gateway";

interface FeatureCardProps {
  icon: ComponentType<{ size?: number; className?: string; weight?: "bold" }>;
  iconColorClass: string;
  description: ReactNode;
  actionLabel: string;
  onClick: () => void;
}

function FeatureCard({
  icon: Icon,
  iconColorClass,
  description,
  actionLabel,
  onClick,
}: FeatureCardProps) {
  return (
    <div className="h-full flex flex-col bg-dark-3 border border-dark-6 relative">
      <div className="p-4 flex flex-col justify-between h-full">
        <Icon size={16} className={`${iconColorClass} mb-2`} weight="bold" />
        <p className="text-xs text-text-dim leading-relaxed mt-auto">
          {description}
        </p>
      </div>
      <div
        className="border-t flex flex-row items-center justify-between bg-dark-4 border-dark-6 p-2 px-4 hover:bg-dark-5 text-text-dim hover:text-text-medium transition-colors cursor-pointer"
        onClick={onClick}
      >
        <p className="text-xs leading-relaxed">{actionLabel}</p>
        <ArrowRightIcon size={16} className="transition-colors" />
      </div>
    </div>
  );
}

interface WelcomeModalProps {
  onClose: () => void;
}

export default function WelcomeModal({ onClose }: WelcomeModalProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [provider, setProvider] = useState<AIProvider>("openrouter");
  const [apiKey, setApiKey] = useState("");

  const handleClose = () => {
    // Set cookie to remember the user has seen this
    document.cookie = "LLMPokerWelcomeViewed=true; path=/; max-age=31536000"; // 1 year
    onClose();
  };

  const handleSaveAndClose = () => {
    // Save API key and provider to localStorage
    if (apiKey.trim()) {
      localStorage.setItem("llm-poker-api-key", apiKey.trim());
      localStorage.setItem("llm-poker-provider", provider);
    }
    handleClose();
  };

  const handleSkip = () => {
    handleClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-dark-1/80 z-50 flex items-center justify-center p-6"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 1, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1, y: 20 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
        className="bg-dark-2 border border-dark-4 max-w-lg w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <CornerBorders />
        {/* Background pattern */}
        {/* <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%),
                               linear-gradient(-45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%)`,
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 10px 10px",
            }}
          />
        </div> */}

        {/* Close button */}
        {/* <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-300 transition-colors z-10"
        >
          <X size={18} />
        </button> */}

        {/* Content */}
        <div className="relative z-[1] p-8">
          <AnimatePresence mode="wait">
            {step === "welcome" && (
              <WelcomeStep
                key="welcome"
                onNext={() => setStep("api-key")}
                onSkip={handleSkip}
              />
            )}
            {step === "api-key" && (
              <ApiKeyStep
                key="api-key"
                provider={provider}
                setProvider={setProvider}
                apiKey={apiKey}
                setApiKey={setApiKey}
                onBack={() => setStep("welcome")}
                onSave={handleSaveAndClose}
                onSkip={handleSkip}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WelcomeStep({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header with icon */}
      <div className="flex flex-col items-start gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-md font-bold text-text-bright uppercase">
              LLM Poker
            </h1>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-4 mb-6">
        <p className="text-sm text-text-dim leading-relaxed">
          An experimental arena where large language models play Texas
          Hold&apos;em poker against each other.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <FeatureCard
            icon={PlugsConnectedIcon}
            iconColorClass="text-sky-500"
            description={
              <>
                Supports <span className="text-text-medium">Openrouter</span>{" "}
                and <span className="text-text-medium">Vercel AI Gateway</span>.
              </>
            }
            actionLabel="Setup API Key"
            onClick={onNext}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <FeatureCard
            icon={HeadCircuitIcon}
            iconColorClass="text-purple-500"
            description={
              <>
                Over <span className="text-text-medium">200 AI models </span>
                supported.
              </>
            }
            actionLabel="Setup API Key"
            onClick={onNext}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <FeatureCard
            icon={CodeIcon}
            iconColorClass="text-green-500"
            description={
              <>
                Free and fully{" "}
                <span className="text-text-medium">open source</span>.
              </>
            }
            actionLabel="View Code"
            onClick={onNext}
          />
        </motion.div>
      </div>

      {/* Actions */}
      {/* <motion.div
        className="flex flex-col gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <button
          onClick={onNext}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Key size={16} weight="fill" />
          Set Up API Key
          <ArrowRight size={14} />
        </button>

        <button
          onClick={onSkip}
          className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 px-4 py-2 text-xs font-medium transition-colors"
        >
          Skip for now
        </button>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/dqnamo/llm-poker"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 px-4 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <GithubLogoIcon size={14} />
            GitHub
          </a>
          <a
            href="https://discord.gg/3xx9e48CcT"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 px-4 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <DiscordLogoIcon size={14} />
            Discord
          </a>
        </div>
      </motion.div> */}

      {/* Footer */}
      {/* <motion.div
        className="mt-6 pt-4 border-t border-neutral-800/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-[10px] text-neutral-600 text-center">
          Built by{" "}
          <a
            href="https://x.com/dqnamo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-neutral-400 transition-colors"
          >
            JP
          </a>{" "}
          • Open source & experimental
        </p>
      </motion.div> */}

      <div className="flex flex-row items-end justify-between">
        <div className="flex flex-col">
          <p className="text-xs text-text-dim leading-relaxed">Built by</p>
          <DqnamoSignature className="text-2xl!" />
        </div>

        <button
          onClick={onSkip}
          className="flex flex-row items-center gap-2 px-3 py-1.5 bg-dark-4 border border-dark-6 hover:bg-dark-5 transition-colors cursor-pointer group relative"
        >
          <AnimatedCornerBorders size={2} colorClass="border-dark-10" />
          <p className="text-xs text-text-dim leading-relaxed group-hover:text-text-medium">
            Let me watch!
          </p>
          <ArrowRight
            size={16}
            className="transition-colors text-text-dim group-hover:text-text-medium"
          />
        </button>
      </div>
    </motion.div>
  );
}

function ApiKeyStep({
  provider,
  setProvider,
  apiKey,
  setApiKey,
  onBack,
  onSave,
  onSkip,
}: {
  provider: AIProvider;
  setProvider: (provider: AIProvider) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  onBack: () => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex flex-col items-start gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-md font-bold text-text-bright uppercase">
              API Key Setup
            </h1>
          </div>
        </div>
      </div>

      {/* Description */}
      {/* <motion.div
        className="space-y-4 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-sm text-text-dim leading-relaxed">
          Required to run AI model simulations. Your key is stored locally in
          your browser.
        </p>
      </motion.div> */}

      {/* Provider Selection */}
      <div className="space-y-4 mb-6 mt-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-dim font-medium">
            Select Provider
          </label>
          <div className="relative flex bg-dark-3 border border-dark-5 p-1">
            {/* Animated sliding background */}
            <motion.div
              className="absolute top-1 bottom-1 bg-dark-5"
              layoutId="provider-tab-indicator"
              style={{
                left: provider === "openrouter" ? "4px" : "50%",
                right: provider === "openrouter" ? "50%" : "4px",
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
              }}
            />
            <button
              onClick={() => setProvider("openrouter")}
              className={`relative z-10 flex-1 px-2 py-2 text-xs transition-colors ${
                provider === "openrouter"
                  ? "text-text-bright"
                  : "text-text-dim hover:text-text-medium"
              }`}
            >
              <span className="font-semibold">OpenRouter</span>
            </button>
            <button
              onClick={() => setProvider("vercel-ai-gateway")}
              className={`relative z-10 flex-1 px-2 py-2 text-xs transition-colors ${
                provider === "vercel-ai-gateway"
                  ? "text-text-bright"
                  : "text-text-dim hover:text-text-medium"
              }`}
            >
              <span className="font-semibold">Vercel AI Gateway</span>
            </button>
          </div>
        </div>

        {/* API Key Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-dim font-medium">
            {provider === "vercel-ai-gateway"
              ? "Vercel AI Gateway API Key"
              : "OpenRouter API Key"}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              provider === "vercel-ai-gateway"
                ? "Enter your Vercel AI Gateway key"
                : "sk-or-..."
            }
            className="bg-dark-3 border border-dark-6 px-4 py-3 text-sm text-text-medium focus:outline-none focus:border-sky-700 placeholder:text-text-dim/50 transition-colors"
          />
          <p className="text-xs text-text-dim">
            {provider === "vercel-ai-gateway" ? (
              <>
                Get your key from{" "}
                <a
                  href="https://vercel.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-medium hover:text-text-bright underline"
                >
                  Vercel Dashboard
                </a>{" "}
                → AI Gateway
              </>
            ) : (
              <>
                Get your key from{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-medium hover:text-text-bright underline"
                >
                  openrouter.ai/keys
                </a>
              </>
            )}
          </p>
        </div>

        {/* Info box */}
        <div className="-mt-2">
          <p className="text-xs text-text-dim leading-relaxed">
            <span className="text-text-medium font-medium">
              Your key is stored locally
            </span>{" "}
            in your browser and never saved on our servers. It&apos;s only used
            to communicate directly with{" "}
            {provider === "vercel-ai-gateway" ? "Vercel" : "OpenRouter"}.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-row items-end justify-between mt-8">
        <button
          onClick={onBack}
          className="flex flex-row items-center gap-2 px-3 py-1.5 bg-dark-4 border border-dark-6 hover:bg-dark-5 transition-colors cursor-pointer group relative"
        >
          <AnimatedCornerBorders size={2} colorClass="border-dark-10" />
          <ArrowRight
            size={16}
            className="transition-colors text-text-dim group-hover:text-text-medium rotate-180"
          />
          <p className="text-xs text-text-dim leading-relaxed group-hover:text-text-medium">
            Back
          </p>
        </button>

        <div className="flex flex-row items-center gap-2">
          <button
            onClick={onSkip}
            className="flex flex-row items-center gap-2 px-3 py-1.5 bg-dark-4 border border-dark-6 hover:bg-dark-5 transition-colors cursor-pointer group relative"
          >
            <AnimatedCornerBorders size={2} colorClass="border-dark-10" />
            <p className="text-xs text-text-dim leading-relaxed group-hover:text-text-medium">
              Skip for now
            </p>
          </button>

          <button
            onClick={onSave}
            disabled={!apiKey.trim()}
            className={`flex flex-row items-center gap-2 px-3 py-1.5 border transition-colors relative group ${
              apiKey.trim()
                ? "bg-green-900/50 border-green-800 text-green-300  cursor-pointer"
                : "bg-dark-4 border-dark-6 text-text-dim cursor-not-allowed opacity-50"
            }`}
          >
            <AnimatedCornerBorders
              size={2}
              colorClass={apiKey.trim() ? "border-green-600" : "border-dark-10"}
            />
            <Check size={16} weight="bold" />
            <p className="text-xs leading-relaxed">Save & Play</p>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
