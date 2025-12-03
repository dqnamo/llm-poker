"use client";

import {
  ChartScatterIcon,
  CircleNotch,
  GithubLogoIcon,
  Play,
  DiamondsFourIcon,
  MagnifyingGlass,
  X,
  Gear,
  CardsThree,
  User,
  Robot,
  Minus,
} from "@phosphor-icons/react";
import AnimatedFramedLink from "./components/AnimatedFramedLink";
import { useEffect, useState } from "react";
import Footer from "./components/Footer";
import { useRouter } from "next/navigation";
import { CornerBorders } from "./components/GameSidebar";

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  supported_parameters: string[];
  canonical_slug: string;
}

interface SelectedModel {
  id: string;
  name: string;
  slug: string;
}

interface PlayerConfig {
  model: string;
  seatNumber?: number;
  emptySeat?: boolean;
}

type AIProvider = "openrouter" | "vercel-ai-gateway";

type SeatSelection =
  | { type: "model"; model: SelectedModel }
  | { type: "empty" }
  | null;

export default function Home() {
  const router = useRouter();
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatSelections, setSeatSelections] = useState<SeatSelection[]>(
    Array(6).fill(null)
  );
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState<number | null>(null);
  const [provider, setProvider] = useState<AIProvider>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [startingStack, setStartingStack] = useState(2000);
  const [numberOfHands, setNumberOfHands] = useState(10);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
    // Load saved API key and provider from localStorage
    const savedApiKey = localStorage.getItem("llm-poker-api-key");
    const savedProvider = localStorage.getItem(
      "llm-poker-provider"
    ) as AIProvider | null;
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    if (
      savedProvider &&
      (savedProvider === "openrouter" || savedProvider === "vercel-ai-gateway")
    ) {
      setProvider(savedProvider);
    }
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models");
      const data = await response.json();

      // Filter models that support "tools"
      const toolsModels = data.data.filter(
        (model: OpenRouterModel) =>
          model.supported_parameters &&
          model.supported_parameters.includes("tools")
      );

      setModels(toolsModels);
    } catch (error) {
      console.error("Error fetching models:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSeatSelection = (position: number, selection: SeatSelection) => {
    const newSelection = [...seatSelections];
    newSelection[position] = selection;
    setSeatSelections(newSelection);
    setError(null); // Clear any existing errors when selection changes
  };

  const openModelSelection = (position: number) => {
    setModalPosition(position);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalPosition(null);
  };

  const canStartGame =
    seatSelections.filter((seat) => seat !== null).length === 6 &&
    apiKey.trim() !== "";

  const startGame = async () => {
    console.log("[startGame] Function called", { canStartGame });
    if (!canStartGame) return;

    // Validation - count filled seats (not empty)
    const filledSeats = seatSelections.filter((seat) => seat !== null);
    if (filledSeats.length !== 6) {
      setError("Please configure all 6 seats");
      return;
    }

    if (!apiKey.trim()) {
      setError(
        `Please provide your ${
          provider === "vercel-ai-gateway" ? "Vercel AI Gateway" : "OpenRouter"
        } API key`
      );
      return;
    }

    if (startingStack < 100 || startingStack > 100000) {
      setError("Starting stack must be between 100 and 100,000");
      return;
    }

    if (numberOfHands < 1 || numberOfHands > 100) {
      setError("Number of hands must be between 1 and 100");
      return;
    }

    console.log("[startGame] Validation passed, setting loading state");
    setIsStartingGame(true);
    setError(null);

    try {
      // Convert seat selections to player configurations
      const players: PlayerConfig[] = seatSelections.map((selection, index) => {
        if (!selection) {
          throw new Error(`Seat ${index + 1} is not configured`);
        }

        if (selection.type === "empty") {
          return {
            model: "",
            seatNumber: index,
            emptySeat: true,
          };
        }

        // AI model
        return {
          model: selection.model.id,
          seatNumber: index,
        };
      });

      console.log("[startGame] Making fetch request to /api/run-simulation", {
        players,
        startingStack,
        numberOfHands,
        provider,
      });

      const response = await fetch("/api/run-simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          players,
          startingStack: startingStack,
          numberOfHands: numberOfHands,
          apiKey: apiKey.trim(),
          provider,
        }),
      });

      console.log("[startGame] Fetch response received", {
        status: response.status,
        ok: response.ok,
      });

      const data = await response.json();
      console.log("[startGame] Response data", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to start simulation");
      }

      console.log("[startGame] Navigating to game page", data.simulationId);
      // Navigate to the game page
      router.push(`/game/${data.simulationId}`);
    } catch (err) {
      console.error("[startGame] Error caught", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsStartingGame(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center bg-dark-1">
        <div className="text-text-medium w-max p-4 flex flex-col items-center gap-2">
          <CircleNotch size={16} className="animate-spin" />
          <p className="text-xs text-text-dim font-semibold uppercase">
            Loading Models
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-dark-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 2xl:p-12">
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1920px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-row items-center justify-between mb-4 2xl:mb-6">
          <div className="flex flex-col gap-1 2xl:gap-2">
            <div className="flex items-center gap-2 2xl:gap-3">
              <h1 className="text-sm 2xl:text-base font-semibold text-text-bright uppercase">
                LLM Poker
              </h1>
              <div className="text-xs 2xl:text-sm text-text-dim uppercase">
                Configuration
              </div>
            </div>
            <p className="text-xs 2xl:text-sm text-text-dim">
              Configure AI models and start a poker simulation
            </p>
          </div>
          <div className="flex flex-row items-center gap-2 2xl:gap-3">
            <AnimatedFramedLink href="/history">
              <ChartScatterIcon size={16} className="2xl:w-5 2xl:h-5" />
              <p>History</p>
            </AnimatedFramedLink>
            <AnimatedFramedLink
              href="https://github.com/dqnamo/llm-poker"
              target="_blank"
            >
              <GithubLogoIcon size={16} className="2xl:w-5 2xl:h-5" />
              <p>Github</p>
            </AnimatedFramedLink>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-4 2xl:gap-6">
          {/* Table Section - 8 columns */}
          <div className="col-span-8 border border-dark-5 relative">
            <CornerBorders colorClass="border-dark-8" />
            <div className="grid grid-cols-3">
              {/* Top Row - Seats 0, 1, 2 */}
              <SeatSelector
                position={0}
                selection={seatSelections[0]}
                onSelect={() => openModelSelection(0)}
              />
              <SeatSelector
                position={1}
                selection={seatSelections[1]}
                onSelect={() => openModelSelection(1)}
              />
              <SeatSelector
                position={2}
                selection={seatSelections[2]}
                onSelect={() => openModelSelection(2)}
              />

              {/* Table Center */}
              <PokerTable
                selectedCount={seatSelections.filter(Boolean).length}
              />

              {/* Bottom Row - Seats 5, 4, 3 */}
              <SeatSelector
                position={5}
                selection={seatSelections[5]}
                onSelect={() => openModelSelection(5)}
              />
              <SeatSelector
                position={4}
                selection={seatSelections[4]}
                onSelect={() => openModelSelection(4)}
              />
              <SeatSelector
                position={3}
                selection={seatSelections[3]}
                onSelect={() => openModelSelection(3)}
              />
            </div>
          </div>

          {/* Sidebar - 4 columns */}
          <div className="col-span-4 min-h-full h-0 flex flex-col relative">
            <CornerBorders colorClass="border-dark-8" />
            <ConfigurationSidebar
              seatSelections={seatSelections}
              provider={provider}
              setProvider={setProvider}
              apiKey={apiKey}
              setApiKey={setApiKey}
              startingStack={startingStack}
              setStartingStack={setStartingStack}
              numberOfHands={numberOfHands}
              setNumberOfHands={setNumberOfHands}
              error={error}
              setError={setError}
              canStartGame={canStartGame}
              isStartingGame={isStartingGame}
              startGame={startGame}
              updateSeatSelection={updateSeatSelection}
              modelsCount={models.length}
            />
          </div>
        </div>
      </div>

      {modalOpen && modalPosition !== null && (
        <ModelSelectionModal
          position={modalPosition}
          models={models}
          currentSelection={seatSelections[modalPosition]}
          onSelect={(selection) => {
            updateSeatSelection(modalPosition, selection);
            closeModal();
          }}
          onClose={closeModal}
        />
      )}

      <Footer />
    </div>
  );
}

const SeatSelector = ({
  position,
  selection,
  onSelect,
}: {
  position: number;
  selection: SeatSelection;
  onSelect: () => void;
}) => {
  return (
    <div className="p-px bg-dark-4 overflow-hidden relative h-full min-h-[120px] 2xl:min-h-[160px] flex flex-col transition-colors cursor-pointer group">
      <button
        onClick={onSelect}
        className="relative bg-dark-2 hover:bg-dark-3 flex flex-col flex-1 transition-colors w-full text-left"
      >
        <div className="flex flex-col lg:flex-row items-start gap-4 2xl:gap-6 justify-between p-4 2xl:p-6 h-full">
          <div className="flex flex-col flex-1 w-full">
            <div className="text-xs 2xl:text-sm font-semibold text-text-dim uppercase mb-2 2xl:mb-3">
              Seat {position + 1}
            </div>

            {selection ? (
              <div className="flex flex-col gap-2 2xl:gap-3">
                {selection.type === "model" && (
                  <>
                    <div className="flex items-center gap-2 2xl:gap-3">
                      <Robot
                        size={14}
                        className="text-sky-500 2xl:w-5 2xl:h-5"
                        weight="fill"
                      />
                      <span className="text-xs 2xl:text-sm text-text-bright font-medium truncate">
                        {selection.model.name}
                      </span>
                    </div>
                    <span className="text-xs 2xl:text-sm text-text-dim truncate">
                      {selection.model.slug}
                    </span>
                  </>
                )}
                {selection.type === "empty" && (
                  <div className="flex items-center gap-2 2xl:gap-3">
                    <Minus size={14} className="text-dark-10 2xl:w-5 2xl:h-5" />
                    <span className="text-xs 2xl:text-sm text-text-dim italic">
                      Empty Seat
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 2xl:gap-4 py-2 2xl:py-3">
                <div className="w-8 h-8 2xl:w-10 2xl:h-10 border border-dashed border-dark-8 flex items-center justify-center">
                  <CardsThree
                    size={16}
                    className="text-dark-8 2xl:w-5 2xl:h-5"
                  />
                </div>
                <span className="text-xs 2xl:text-sm text-text-dim">
                  Configure seat
                </span>
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  );
};

const PokerTable = ({ selectedCount }: { selectedCount: number }) => {
  return (
    <div className="border-y border-dark-5 p-8 lg:p-12 2xl:p-16 col-span-3 bg-dark-2 relative">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      <div className="flex flex-col items-center justify-center relative z-10 h-40 2xl:h-56">
        {/* Status display */}
        <div
          className={`flex flex-row items-center gap-2 2xl:gap-3 bg-dark-2 border px-4 py-3 2xl:px-6 2xl:py-4 ${
            selectedCount === 6 ? "border-green-900/50" : "border-dark-6"
          }`}
        >
          <DiamondsFourIcon
            size={18}
            className={`2xl:w-6 2xl:h-6 ${
              selectedCount === 6 ? "text-green-500" : "text-dark-10"
            }`}
            weight="fill"
          />
          <div className="flex flex-col">
            <div
              className={`text-sm 2xl:text-base font-semibold ${
                selectedCount === 6 ? "text-text-bright" : "text-text-medium"
              }`}
            >
              LLM Poker
            </div>
            <div className="text-xs 2xl:text-sm text-text-dim">
              {selectedCount} / 6 seats configured
            </div>
          </div>
        </div>

        {selectedCount === 6 && (
          <div className="mt-4 2xl:mt-6 flex items-center gap-2 2xl:gap-3">
            <div className="w-2 h-2 2xl:w-2.5 2xl:h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs 2xl:text-sm text-green-400 uppercase font-medium">
              Ready to start
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const ConfigurationSidebar = ({
  seatSelections,
  provider,
  setProvider,
  apiKey,
  setApiKey,
  startingStack,
  setStartingStack,
  numberOfHands,
  setNumberOfHands,
  error,
  setError,
  canStartGame,
  isStartingGame,
  startGame,
  updateSeatSelection,
  modelsCount,
}: {
  seatSelections: SeatSelection[];
  provider: AIProvider;
  setProvider: (p: AIProvider) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  startingStack: number;
  setStartingStack: (n: number) => void;
  numberOfHands: number;
  setNumberOfHands: (n: number) => void;
  error: string | null;
  setError: (e: string | null) => void;
  canStartGame: boolean;
  isStartingGame: boolean;
  startGame: () => void;
  updateSeatSelection: (position: number, selection: SeatSelection) => void;
  modelsCount: number;
}) => {
  const [activeTab, setActiveTab] = useState<"settings" | "seats">("settings");

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-dark-2 border border-dark-5 relative">
      <CornerBorders colorClass="border-dark-10" />

      {/* Tab Navigation */}
      <div className="relative flex bg-dark-3 border-b border-dark-5 p-1 2xl:p-1.5">
        <button
          onClick={() => setActiveTab("settings")}
          className={`relative z-10 flex-1 flex items-center justify-center gap-2 2xl:gap-3 px-2 py-2 2xl:px-3 2xl:py-3 text-xs 2xl:text-sm font-medium uppercase transition-colors ${
            activeTab === "settings"
              ? "text-text-bright bg-dark-5"
              : "text-text-dim hover:text-text-medium"
          }`}
        >
          <Gear size={14} className="text-orange-500 2xl:w-5 2xl:h-5" />
          <span>Settings</span>
        </button>
        <button
          onClick={() => setActiveTab("seats")}
          className={`relative z-10 flex-1 flex items-center justify-center gap-2 2xl:gap-3 px-2 py-2 2xl:px-3 2xl:py-3 text-xs 2xl:text-sm font-medium uppercase transition-colors ${
            activeTab === "seats"
              ? "text-text-bright bg-dark-5"
              : "text-text-dim hover:text-text-medium"
          }`}
        >
          <CardsThree size={14} className="text-sky-500 2xl:w-5 2xl:h-5" />
          <span>Seats</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="overflow-y-auto flex-1">
        {activeTab === "settings" && (
          <div className="space-y-0">
            {/* AI Provider Section */}
            <div className="bg-dark-2 border-b border-dark-5">
              <div className="p-3 2xl:p-4 border-b border-dark-5">
                <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
                  AI Provider
                </h3>
              </div>
              <div className="p-3 2xl:p-4">
                <div className="flex gap-2 2xl:gap-3">
                  <button
                    onClick={() => {
                      setProvider("openrouter");
                      localStorage.setItem("llm-poker-provider", "openrouter");
                      setApiKey("");
                      localStorage.removeItem("llm-poker-api-key");
                      setError(null);
                    }}
                    className={`flex-1 px-3 py-2 2xl:px-4 2xl:py-3 text-xs 2xl:text-sm border transition-colors ${
                      provider === "openrouter"
                        ? "bg-green-950/30 border-green-900/50 text-green-400"
                        : "bg-dark-3 border-dark-6 text-text-dim hover:border-dark-8"
                    }`}
                  >
                    OpenRouter
                  </button>
                  <button
                    onClick={() => {
                      setProvider("vercel-ai-gateway");
                      localStorage.setItem(
                        "llm-poker-provider",
                        "vercel-ai-gateway"
                      );
                      setApiKey("");
                      localStorage.removeItem("llm-poker-api-key");
                      setError(null);
                    }}
                    className={`flex-1 px-3 py-2 2xl:px-4 2xl:py-3 text-xs 2xl:text-sm border transition-colors ${
                      provider === "vercel-ai-gateway"
                        ? "bg-green-950/30 border-green-900/50 text-green-400"
                        : "bg-dark-3 border-dark-6 text-text-dim hover:border-dark-8"
                    }`}
                  >
                    Vercel AI
                  </button>
                </div>
              </div>
            </div>

            {/* API Key Section */}
            <div className="bg-dark-2 border-b border-dark-5">
              <div className="p-3 2xl:p-4 border-b border-dark-5">
                <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
                  {provider === "vercel-ai-gateway"
                    ? "Vercel AI Gateway Key"
                    : "OpenRouter API Key"}
                </h3>
              </div>
              <div className="p-3 2xl:p-4">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (e.target.value.trim()) {
                      localStorage.setItem(
                        "llm-poker-api-key",
                        e.target.value.trim()
                      );
                    } else {
                      localStorage.removeItem("llm-poker-api-key");
                    }
                    setError(null);
                  }}
                  placeholder={
                    provider === "vercel-ai-gateway"
                      ? "Enter your Vercel AI Gateway key"
                      : "sk-or-..."
                  }
                  className="w-full bg-dark-3 border border-dark-6 px-3 py-2 2xl:px-4 2xl:py-3 text-xs 2xl:text-sm text-text-medium focus:outline-none focus:border-dark-8 placeholder:text-dark-10"
                />
                <p className="text-xs 2xl:text-sm text-text-dim mt-2 2xl:mt-3">
                  {provider === "vercel-ai-gateway"
                    ? "From Vercel Dashboard → AI Gateway"
                    : "Required to run AI models"}
                </p>
              </div>
            </div>

            {/* Game Settings Section */}
            <div className="bg-dark-2 border-b border-dark-5">
              <div className="p-3 2xl:p-4 border-b border-dark-5">
                <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
                  Game Settings
                </h3>
              </div>
              <div className="p-3 2xl:p-4 space-y-4 2xl:space-y-6">
                <div className="flex flex-col gap-2 2xl:gap-3">
                  <label className="text-xs 2xl:text-sm text-text-dim">
                    Starting Stack
                  </label>
                  <div className="flex items-center gap-2 2xl:gap-3">
                    <DiamondsFourIcon
                      size={14}
                      className="text-green-500 2xl:w-5 2xl:h-5"
                      weight="fill"
                    />
                    <input
                      type="number"
                      value={startingStack}
                      onChange={(e) => setStartingStack(Number(e.target.value))}
                      min="100"
                      max="100000"
                      className="flex-1 bg-dark-3 border border-dark-6 px-3 py-2 2xl:px-4 2xl:py-3 text-xs 2xl:text-sm text-text-medium focus:outline-none focus:border-dark-8"
                    />
                  </div>
                  <p className="text-xs 2xl:text-sm text-text-dim">
                    Range: 100 - 100,000
                  </p>
                </div>

                <div className="flex flex-col gap-2 2xl:gap-3">
                  <label className="text-xs 2xl:text-sm text-text-dim">
                    Number of Hands
                  </label>
                  <input
                    type="number"
                    value={numberOfHands}
                    onChange={(e) => setNumberOfHands(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full bg-dark-3 border border-dark-6 px-3 py-2 2xl:px-4 2xl:py-3 text-xs 2xl:text-sm text-text-medium focus:outline-none focus:border-dark-8"
                  />
                  <p className="text-xs 2xl:text-sm text-text-dim">
                    Range: 1 - 100
                  </p>
                </div>
              </div>
            </div>

            {/* Cost Estimate */}
            <div className="bg-dark-2 border-b border-dark-5">
              <div className="p-3 2xl:p-4 border-b border-dark-5">
                <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
                  Estimated Calls
                </h3>
              </div>
              <div className="p-3 2xl:p-4">
                <div className="flex justify-between text-xs 2xl:text-sm">
                  <span className="text-text-dim">API Calls</span>
                  <span className="text-text-medium">
                    ~{numberOfHands * 6 * 4}
                  </span>
                </div>
                <p className="text-xs 2xl:text-sm text-text-dim mt-2 2xl:mt-3">
                  Cost depends on selected models
                </p>
              </div>
            </div>

            {/* Info Section */}
            <div className="bg-dark-2 border-b border-dark-5">
              <div className="p-3 2xl:p-4">
                <div className="flex justify-between text-xs 2xl:text-sm">
                  <span className="text-text-dim">Available Models</span>
                  <span className="text-text-medium">{modelsCount}</span>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-950/20 border-b border-red-900/50">
                <div className="p-3 2xl:p-4">
                  <p className="text-xs 2xl:text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Start Button */}
            <div className="p-3 2xl:p-4">
              <button
                onClick={startGame}
                disabled={!canStartGame || isStartingGame}
                className={`w-full flex items-center justify-center gap-2 2xl:gap-3 px-4 py-3 2xl:px-6 2xl:py-4 text-xs 2xl:text-sm font-semibold uppercase transition-colors ${
                  canStartGame && !isStartingGame
                    ? "bg-green-950/50 border border-green-900/50 text-green-400 hover:bg-green-950/70"
                    : "bg-dark-3 border border-dark-6 text-text-dim cursor-not-allowed"
                }`}
              >
                {isStartingGame ? (
                  <>
                    <CircleNotch
                      size={14}
                      className="animate-spin 2xl:w-5 2xl:h-5"
                    />
                    Starting Game...
                  </>
                ) : (
                  <>
                    <Play size={14} weight="fill" className="2xl:w-5 2xl:h-5" />
                    Start Game
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "seats" && (
          <div className="space-y-0">
            <div className="p-3 2xl:p-4 border-b border-dark-5">
              <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
                Seat Configuration
              </h3>
              <p className="text-xs 2xl:text-sm text-text-dim">
                {seatSelections.filter(Boolean).length} / 6 seats configured
              </p>
            </div>

            <div className="divide-y divide-dark-5">
              {seatSelections.map((selection, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 2xl:p-4 bg-dark-2 hover:bg-dark-3 transition-colors"
                >
                  <div className="flex items-center gap-3 2xl:gap-4">
                    <span className="text-xs 2xl:text-sm font-medium text-text-dim uppercase">
                      Seat {index + 1}
                    </span>
                    {selection ? (
                      <div className="flex items-center gap-2 2xl:gap-3">
                        {selection.type === "model" && (
                          <>
                            <Robot
                              size={12}
                              className="text-sky-500 2xl:w-4 2xl:h-4"
                              weight="fill"
                            />
                            <span className="text-xs 2xl:text-sm text-text-medium truncate max-w-[120px] 2xl:max-w-[180px]">
                              {selection.model.name}
                            </span>
                          </>
                        )}
                        {selection.type === "empty" && (
                          <>
                            <Minus
                              size={12}
                              className="text-dark-10 2xl:w-4 2xl:h-4"
                            />
                            <span className="text-xs 2xl:text-sm text-text-dim italic">
                              Empty
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs 2xl:text-sm text-dark-10 italic">
                        Not configured
                      </span>
                    )}
                  </div>
                  {selection && (
                    <button
                      onClick={() => updateSeatSelection(index, null)}
                      className="text-xs 2xl:text-sm text-text-dim hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ModelSelectionModal = ({
  position,
  models,
  currentSelection,
  onSelect,
  onClose,
}: {
  position: number;
  models: OpenRouterModel[];
  currentSelection: SeatSelection;
  onSelect: (selection: SeatSelection) => void;
  onClose: () => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"options" | "models">("options");

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "models") {
          setView("options");
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, view]);

  const filteredModels = models.filter(
    (model) =>
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (view === "options") {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-2 border border-dark-5 w-full max-w-md flex flex-col relative">
          <CornerBorders colorClass="border-dark-10" />

          {/* Header */}
          <div className="flex items-center justify-between p-4 2xl:p-6 border-b border-dark-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm 2xl:text-base font-semibold text-text-bright uppercase">
                Configure Seat {position + 1}
              </h2>
              <p className="text-xs 2xl:text-sm text-text-dim">
                Choose seat type
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-text-dim hover:text-text-medium transition-colors"
            >
              <X size={16} className="2xl:w-5 2xl:h-5" />
            </button>
          </div>

          {/* Options */}
          <div className="p-4 2xl:p-6 flex flex-col gap-3 2xl:gap-4">
            <button
              onClick={() => setView("models")}
              className="w-full text-left p-4 2xl:p-5 bg-dark-3 hover:bg-dark-4 transition-colors border border-dark-6 hover:border-dark-8"
            >
              <div className="flex items-center gap-3 2xl:gap-4">
                <Robot
                  size={18}
                  className="text-sky-500 2xl:w-6 2xl:h-6"
                  weight="fill"
                />
                <div className="flex flex-col gap-1">
                  <span className="text-sm 2xl:text-base text-text-bright font-medium">
                    AI Player
                  </span>
                  <span className="text-xs 2xl:text-sm text-text-dim">
                    Select an AI model to play
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => onSelect({ type: "empty" })}
              className="w-full text-left p-4 2xl:p-5 bg-dark-3 hover:bg-dark-4 transition-colors border border-dark-6 hover:border-dark-8"
            >
              <div className="flex items-center gap-3 2xl:gap-4">
                <Minus size={18} className="text-dark-10 2xl:w-6 2xl:h-6" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm 2xl:text-base text-text-bright font-medium">
                    Empty Seat
                  </span>
                  <span className="text-xs 2xl:text-sm text-text-dim">
                    Leave this seat empty
                  </span>
                </div>
              </div>
            </button>

            {currentSelection && (
              <button
                onClick={() => onSelect(null)}
                className="w-full text-left p-4 2xl:p-5 bg-red-950/20 hover:bg-red-950/30 transition-colors border border-red-900/50 hover:border-red-900"
              >
                <div className="flex items-center gap-3 2xl:gap-4">
                  <X size={18} className="text-red-400 2xl:w-6 2xl:h-6" />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm 2xl:text-base text-red-400 font-medium">
                      Clear Selection
                    </span>
                    <span className="text-xs 2xl:text-sm text-text-dim">
                      Remove configuration from this seat
                    </span>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Models view
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-2 border border-dark-5 w-full max-w-2xl max-h-[80vh] flex flex-col relative">
        <CornerBorders colorClass="border-dark-10" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 2xl:p-6 border-b border-dark-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm 2xl:text-base font-semibold text-text-bright uppercase">
              Select AI Model
            </h2>
            <p className="text-xs 2xl:text-sm text-text-dim">
              {models.length} models available with tool support
            </p>
          </div>
          <button
            onClick={() => setView("options")}
            className="text-text-dim hover:text-text-medium transition-colors"
          >
            <X size={16} className="2xl:w-5 2xl:h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 2xl:p-6 border-b border-dark-5">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 2xl:left-4 top-1/2 transform -translate-y-1/2 text-text-dim 2xl:w-5 2xl:h-5"
            />
            <input
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 2xl:pl-12 2xl:pr-6 2xl:py-3 bg-dark-3 border border-dark-6 text-sm 2xl:text-base text-text-medium placeholder-text-dim focus:outline-none focus:border-dark-8"
            />
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto">
          {filteredModels.length === 0 ? (
            <div className="text-center py-8 2xl:py-12">
              <p className="text-sm 2xl:text-base text-text-dim">
                No models found matching your search
              </p>
            </div>
          ) : (
            <div className="divide-y divide-dark-5">
              {filteredModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() =>
                    onSelect({
                      type: "model",
                      model: {
                        id: model.id,
                        name: model.name,
                        slug: model.canonical_slug,
                      },
                    })
                  }
                  className={`w-full text-left p-4 2xl:p-5 hover:bg-dark-3 transition-colors ${
                    currentSelection?.type === "model" &&
                    currentSelection.model.id === model.id
                      ? "bg-dark-3 border-l-2 border-l-green-500"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-2 2xl:gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="text-xs 2xl:text-sm text-text-bright font-medium truncate">
                          {model.name}
                        </span>
                        <span className="text-xs 2xl:text-sm text-text-dim truncate">
                          {model.id}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2 2xl:ml-4">
                        <span className="text-xs 2xl:text-sm text-text-dim">
                          {Math.round(model.context_length / 1000)}k ctx
                        </span>
                        <span className="text-xs 2xl:text-sm text-dark-10 bg-dark-4 px-2 py-0.5 2xl:px-3 2xl:py-1">
                          $
                          {(parseFloat(model.pricing.prompt) * 1000000).toFixed(
                            2
                          )}
                          /M
                        </span>
                      </div>
                    </div>
                    {model.description && (
                      <p className="text-xs 2xl:text-sm text-text-dim line-clamp-2">
                        {model.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 2xl:p-6 border-t border-dark-5">
          <div className="flex items-center justify-between text-xs 2xl:text-sm text-text-dim">
            <button
              onClick={() => setView("options")}
              className="hover:text-text-medium transition-colors"
            >
              ← Back to options
            </button>
            <span>{filteredModels.length} models shown</span>
          </div>
        </div>
      </div>
    </div>
  );
};
