"use client";

import {
  ChartScatterIcon,
  CircleNotch,
  GithubLogoIcon,
  Play,
  DiamondsFourIcon,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import FramedLink from "./components/FramedLink";
import Button from "./components/Button";
import { useEffect, useState } from "react";
import Footer from "./components/Footer";
import { useRouter } from "next/navigation";

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
  humanPlayer?: boolean;
}

type AIProvider = "openrouter" | "vercel-ai-gateway";

type SeatSelection =
  | { type: "model"; model: SelectedModel }
  | { type: "empty" }
  | { type: "human" }
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

        if (selection.type === "human") {
          return {
            model: "",
            seatNumber: index,
            humanPlayer: true,
          };
        }

        // AI model
        return {
          model: selection.model.id,
          seatNumber: index,
        };
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start simulation");
      }

      // Navigate to the game page
      router.push(`/game/${data.simulationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsStartingGame(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center">
        <div className="text-neutral-200  w-max p-4 flex flex-col items-center gap-2">
          <CircleNotch size={16} className="animate-spin" />
          <p className="text-xs text-neutral-500 font-semibold uppercase">
            Loading Models
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-neutral-950 flex flex-col items-center justify-center p-8">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-3">
        <div className="p-6 rounded-lg col-span-2">
          <div className="flex flex-col col-span-2">
            <div className="text-neutral-200  grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
              <div className="flex flex-row items-center justify-between col-span-3 mb-8">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-semibold">Model Selection</h1>
                  </div>
                  <p className="text-xs text-neutral-500 max-w-sm font-sans">
                    Configure and start a poker simulation with AI models
                  </p>
                </div>
                <div className="flex flex-row items-center gap-2">
                  <FramedLink href="/history">
                    <ChartScatterIcon size={16} />
                    <p>Game History</p>
                  </FramedLink>
                  <FramedLink
                    href="https://github.com/dqnamo/llm-poker"
                    target="_blank"
                  >
                    <GithubLogoIcon size={16} />
                    <p>Github</p>
                  </FramedLink>
                </div>
              </div>
              <div className="grid grid-cols-3 relative col-span-3 lg:col-span-3 space-x-2">
                <ModelSelector
                  position={0}
                  selection={seatSelections[0]}
                  onSelect={() => openModelSelection(0)}
                />
                <ModelSelector
                  position={1}
                  selection={seatSelections[1]}
                  onSelect={() => openModelSelection(1)}
                />
                <ModelSelector
                  position={2}
                  selection={seatSelections[2]}
                  onSelect={() => openModelSelection(2)}
                />
                <PokerTable
                  selectedCount={seatSelections.filter(Boolean).length}
                />
                <ModelSelector
                  position={5}
                  selection={seatSelections[5]}
                  onSelect={() => openModelSelection(5)}
                />
                <ModelSelector
                  position={4}
                  selection={seatSelections[4]}
                  onSelect={() => openModelSelection(4)}
                />
                <ModelSelector
                  position={3}
                  selection={seatSelections[3]}
                  onSelect={() => openModelSelection(3)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="relative h-0 min-h-full">
          <div className="absolute inset-0 overflow-y-auto p-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-neutral-200">
                  Game Settings
                </h2>

                <div className="flex flex-col gap-2">
                  <p className="text-xs text-neutral-400">Seats Configured</p>
                  <p className="text-sm text-neutral-200">
                    {seatSelections.filter(Boolean).length} / 6 seats filled
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-neutral-400">
                    AI Provider
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setProvider("openrouter");
                        localStorage.setItem(
                          "llm-poker-provider",
                          "openrouter"
                        );
                        setApiKey("");
                        localStorage.removeItem("llm-poker-api-key");
                        setError(null);
                      }}
                      className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${
                        provider === "openrouter"
                          ? "bg-emerald-950/50 border-emerald-700 text-emerald-300"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
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
                      className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${
                        provider === "vercel-ai-gateway"
                          ? "bg-emerald-950/50 border-emerald-700 text-emerald-300"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      Vercel AI Gateway
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-neutral-400">
                    {provider === "vercel-ai-gateway"
                      ? "Vercel AI Gateway API Key"
                      : "OpenRouter API Key"}
                  </label>
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
                    className="bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-700 placeholder:text-neutral-600 rounded"
                  />
                  <p className="text-xs text-neutral-500">
                    {provider === "vercel-ai-gateway"
                      ? "Get your key from Vercel Dashboard → AI Gateway"
                      : "Required to run AI models via OpenRouter"}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs text-neutral-400">Starting Stack</p>
                  <input
                    type="number"
                    value={startingStack}
                    onChange={(e) => setStartingStack(Number(e.target.value))}
                    min="100"
                    max="100000"
                    className="bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-700 placeholder:text-neutral-600 rounded"
                  />
                  <p className="text-xs text-neutral-500">
                    Minimum: 100, Maximum: 100,000
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs text-neutral-400">Number of Hands</p>
                  <input
                    type="number"
                    value={numberOfHands}
                    onChange={(e) => setNumberOfHands(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-700 placeholder:text-neutral-600 rounded"
                  />
                  <p className="text-xs text-neutral-500">
                    Minimum: 1, Maximum: 100
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs text-neutral-400">Estimated Cost</p>
                  <div className="bg-neutral-900 border border-neutral-800 p-3 rounded">
                    <p className="text-xs text-neutral-300">
                      ~{numberOfHands * 6 * 4} API calls
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      Actual cost depends on selected models
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-950/20 border border-red-900 p-3 rounded">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                <Button
                  onClick={startGame}
                  disabled={!canStartGame || isStartingGame}
                  className="w-full"
                >
                  {isStartingGame ? (
                    <>
                      <CircleNotch size={16} className="animate-spin" />
                      Starting Game...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Start Game
                    </>
                  )}
                </Button>
              </div>

              {seatSelections.some(Boolean) && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-neutral-200">
                    Seat Configuration
                  </h3>
                  <div className="flex flex-col gap-2">
                    {seatSelections.map(
                      (selection, index) =>
                        selection && (
                          <div
                            key={`${index}-${selection.type}`}
                            className="flex flex-col gap-1 p-3 bg-neutral-900 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-neutral-200">
                                Position {index + 1}
                              </p>
                              <button
                                onClick={() => updateSeatSelection(index, null)}
                                className="text-xs text-neutral-500 hover:text-neutral-300"
                              >
                                Remove
                              </button>
                            </div>
                            {selection.type === "model" && (
                              <p className="text-xs text-neutral-400 truncate">
                                {selection.model.name}
                              </p>
                            )}
                            {selection.type === "empty" && (
                              <p className="text-xs text-neutral-500 italic">
                                Empty Seat
                              </p>
                            )}
                            {selection.type === "human" && (
                              <p className="text-xs text-lime-400">
                                Human Player
                              </p>
                            )}
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <p className="text-xs text-neutral-400">Available Models</p>
                <p className="text-xs text-neutral-500">
                  {models.length} models support tool calling
                </p>
              </div>
            </div>
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

const ModelSelector = ({
  position,
  selection,
  onSelect,
}: {
  position: number;
  selection: SeatSelection;
  onSelect: () => void;
}) => {
  return (
    <div className="p-px overflow-hidden relative rounded-md h-full flex flex-col">
      <div className="bg-neutral-950 relative hover:bg-neutral-900 flex flex-col h-full rounded-md transition-colors">
        <div className="flex flex-col lg:flex-row items-start gap-2 justify-between p-4">
          <div className="flex flex-col h-full w-full">
            <div className="text-xs font-semibold font-sans text-neutral-400 mb-2">
              Position {position + 1}
            </div>

            <button
              onClick={onSelect}
              className="w-full text-left p-3 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors cursor-pointer"
            >
              {selection ? (
                <div className="flex flex-col gap-1">
                  {selection.type === "model" && (
                    <>
                      <span className="text-xs text-neutral-200 truncate font-medium">
                        {selection.model.name}
                      </span>
                      <span className="text-[10px] text-neutral-500 truncate">
                        {selection.model.slug}
                      </span>
                    </>
                  )}
                  {selection.type === "empty" && (
                    <span className="text-xs text-neutral-500 italic text-center py-2">
                      Empty Seat
                    </span>
                  )}
                  {selection.type === "human" && (
                    <span className="text-xs text-lime-400 font-medium text-center py-2">
                      Human Player
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-4">
                  <span className="text-xs text-neutral-500">
                    Configure Seat
                  </span>
                  <div className="w-4 h-4 border border-dashed border-neutral-600 rounded"></div>
                </div>
              )}
            </button>
          </div>
        </div>
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-md flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-neutral-200">
                Configure Position {position + 1}
              </h2>
              <p className="text-xs text-neutral-500">Choose seat type</p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Options */}
          <div className="p-4 flex flex-col gap-2">
            <button
              onClick={() => setView("models")}
              className="w-full text-left p-4 bg-neutral-800 hover:bg-neutral-750 rounded-lg transition-colors border border-neutral-700 hover:border-neutral-600"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm text-neutral-200 font-medium">
                  AI Player
                </span>
                <span className="text-xs text-neutral-500">
                  Select an AI model to play
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                onSelect({ type: "empty" });
              }}
              className="w-full text-left p-4 bg-neutral-800 hover:bg-neutral-750 rounded-lg transition-colors border border-neutral-700 hover:border-neutral-600"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm text-neutral-200 font-medium">
                  Empty Seat
                </span>
                <span className="text-xs text-neutral-500">
                  Leave this seat empty
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                onSelect({ type: "human" });
              }}
              className="w-full text-left p-4 bg-neutral-800 hover:bg-neutral-750 rounded-lg transition-colors border border-neutral-700 hover:border-neutral-600"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm text-lime-400 font-medium">
                  Human Player
                </span>
                <span className="text-xs text-neutral-500">
                  Reserve for human player
                </span>
              </div>
            </button>

            {currentSelection && (
              <button
                onClick={() => onSelect(null)}
                className="w-full text-left p-4 bg-red-950/20 hover:bg-red-950/30 rounded-lg transition-colors border border-red-900/50 hover:border-red-900"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-red-400 font-medium">
                    Clear Selection
                  </span>
                  <span className="text-xs text-neutral-500">
                    Remove configuration from this seat
                  </span>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-neutral-200">
              Select AI Model for Position {position + 1}
            </h2>
            <p className="text-xs text-neutral-500">
              {models.length} models available with tool support
            </p>
          </div>
          <button
            onClick={() => setView("options")}
            className="text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-neutral-800">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
            />
            <input
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredModels.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-neutral-500">
                No models found matching your search
              </p>
            </div>
          ) : (
            filteredModels.map((model) => (
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
                className={`w-full text-left p-3 hover:bg-neutral-800 rounded-lg transition-colors ${
                  currentSelection?.type === "model" &&
                  currentSelection.model.id === model.id
                    ? "bg-neutral-800 border border-neutral-700"
                    : ""
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <span className="text-xs text-neutral-200 font-medium truncate">
                        {model.name}
                      </span>
                      <span className="text-[10px] text-neutral-500 truncate">
                        {model.id}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <span className="text-[10px] text-neutral-600">
                        {Math.round(model.context_length / 1000)}k context
                      </span>
                      <div className="flex gap-1">
                        <span className="text-[9px] text-neutral-600 bg-neutral-800 px-1 py-0.5 rounded">
                          ${parseFloat(model.pricing.prompt) * 1000000}M
                        </span>
                      </div>
                    </div>
                  </div>
                  {model.description && (
                    <p className="text-[10px] text-neutral-600 line-clamp-2">
                      {model.description}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <button
              onClick={() => setView("options")}
              className="hover:text-neutral-300 transition-colors"
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

const PokerTable = ({ selectedCount }: { selectedCount: number }) => {
  return (
    <div className="col-span-6 relative perspective-[1000px] mb-8 w-[95%] mx-auto">
      <div
        className="bg-radial w-full from-emerald-700 to-emerald-950 p-20 rounded-full relative overflow-hidden transform-gpu"
        style={{
          transform: "rotateX(28deg)",
          transformStyle: "preserve-3d",
          boxShadow:
            "inset 0 4px 20px rgba(255, 255, 255, 0.15), inset 0 -4px 20px rgba(0, 0, 0, 0.4)",
          border: "20px solid transparent",
          backgroundImage: `
            radial-gradient(ellipse at center, #10b981 0%, #065f46 100%),
            linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 25%, #0f0f0f 50%, #171717 75%, #1f1f1f 100%)
          `,
          backgroundOrigin: "padding-box, border-box",
          backgroundClip: "padding-box, border-box",
        }}
      >
        {/* Subtle diamond/cube pattern overlay */}
        <div
          className="absolute inset-0 opacity-12"
          style={{
            backgroundImage: `linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.08) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.08) 75%),
                             linear-gradient(-45deg, transparent 25%, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.08) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.08) 75%)`,
            backgroundSize: "24px 24px",
            backgroundPosition: "0 0, 12px 12px",
          }}
        />

        {/* Diamond icon imprint on felt */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <DiamondsFourIcon size={120} className="text-white" weight="fill" />
        </div>

        <div className="flex flex-col items-center justify-center relative z-10 min-h-[120px]">
          <div className="flex flex-col items-center gap-2">
            <div className="text-lg font-semibold text-neutral-200">
              LLM Poker
            </div>
            <div className="text-sm text-neutral-400">
              {selectedCount} / 6 seats configured
            </div>
            {selectedCount === 6 && (
              <div className="text-xs text-green-400">Ready to start</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
