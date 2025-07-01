"use client";

import { useState } from "react";
import { CircleNotch, Play, Warning, X } from "@phosphor-icons/react";
import FramedLink from "../components/FramedLink";
import { OPENROUTER_MODELS } from "@/engine/constants";
import FramedButton from "../components/FramedButton";

interface SimulationConfig {
  models: string[];
  startingStack: number;
  numberOfHands: number;
  openRouterKey: string;
}

export default function RunPage() {
  const [config, setConfig] = useState<SimulationConfig>({
    models: [],
    startingStack: 2000,
    numberOfHands: 10,
    openRouterKey: "",
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleModelToggle = (modelId: string) => {
    setConfig(prev => {
      const isSelected = prev.models.includes(modelId);
      if (isSelected) {
        return { ...prev, models: prev.models.filter(id => id !== modelId) };
      } else if (prev.models.length < 6) {
        return { ...prev, models: [...prev.models, modelId] };
      }
      return prev;
    });
    setError(null);
  };

  const handleRunSimulationClick = () => {
    // Validation
    if (config.models.length !== 6) {
      setError("Please select exactly 6 models");
      return;
    }
    
    if (!config.openRouterKey) {
      setError("Please provide your OpenRouter API key");
      return;
    }

    if (config.startingStack < 100 || config.startingStack > 100000) {
      setError("Starting stack must be between 100 and 100,000");
      return;
    }

    if (config.numberOfHands < 1 || config.numberOfHands > 100) {
      setError("Number of hands must be between 1 and 100");
      return;
    }

    // Show confirmation modal instead of running immediately
    setShowConfirmModal(true);
    setError(null);
  };

  const handleConfirmSimulation = async () => {
    setShowConfirmModal(false);
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/run-simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start simulation");
      }

      setSimulationId(data.simulationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsRunning(false);
    }
  };

  const handleCancelSimulation = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className="flex flex-col h-full p-10">
      <div className="text-neutral-200 font-geist-mono max-w-4xl mx-auto w-full">
        <div className="flex flex-row items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-sm font-semibold uppercase">Run Simulation</h1>
            <p className="text-xs text-neutral-500 max-w-sm">
              Configure and run a poker simulation with custom AI models
            </p>
          </div>
          <FramedLink href="/">
            <p>Back to Game</p>
          </FramedLink>
        </div>

        <div className="grid gap-8">
          {/* Model Selection */}
          <div className="flex flex-col border border-neutral-900 relative">
            <CornerBorders />
            <div className="flex flex-col p-4 border-b border-neutral-900">
              <h2 className="text-xs font-medium uppercase">Select 6 Models</h2>
              <p className="text-xs text-neutral-500">
                Choose the AI models that will compete ({config.models.length}/6 selected)
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y divide-neutral-900">
              {OPENROUTER_MODELS.map((model) => {
                const isSelected = config.models.includes(model.id);
                return (
                  <button
                    key={model.id}
                    onClick={() => handleModelToggle(model.id)}
                    disabled={!isSelected && config.models.length >= 6}
                    className={`
                      p-4 text-left transition-colors
                      ${isSelected 
                        ? "bg-neutral-900/50 text-neutral-200" 
                        : "bg-neutral-950 text-neutral-400 hover:bg-neutral-900/50"
                      }
                      ${!isSelected && config.models.length >= 6 
                        ? "opacity-50 cursor-not-allowed" 
                        : "cursor-pointer"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{model.name}</span>
                      {isSelected && (
                        <span className="text-xs text-lime-500">
                          #{config.models.indexOf(model.id) + 1}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-500">{model.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col border border-neutral-900 relative">
              <CornerBorders />
              <div className="flex flex-col p-4">
                <label className="text-xs font-medium uppercase mb-2">
                  Starting Stack
                </label>
                <input
                  type="number"
                  value={config.startingStack}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    startingStack: parseInt(e.target.value) || 0 
                  }))}
                  className="bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-700"
                  min="100"
                  max="100000"
                  step="100"
                />
              </div>
            </div>

            <div className="flex flex-col border border-neutral-900 relative">
              <CornerBorders />
              <div className="flex flex-col p-4">
                <label className="text-xs font-medium uppercase mb-2">
                  Number of Hands
                </label>
                <input
                  type="number"
                  value={config.numberOfHands}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    numberOfHands: parseInt(e.target.value) || 0 
                  }))}
                  className="bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-700"
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <div className="flex flex-col border border-neutral-900 relative">
              <CornerBorders />
              <div className="flex flex-col p-4">
                <label className="text-xs font-medium uppercase mb-2">
                  OpenRouter API Key
                </label>
                <input
                  type="password"
                  value={config.openRouterKey}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    openRouterKey: e.target.value 
                  }))}
                  placeholder="sk-or-..."
                  className="bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-700 placeholder:text-neutral-600"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="border border-red-900 bg-red-950/20 p-4 relative">
              <CornerBorders />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {simulationId && (
            <div className="border border-lime-900 bg-lime-950/20 p-4 relative">
              <CornerBorders />
              <p className="text-xs text-lime-400 mb-2">
                Simulation started successfully!
              </p>
              <FramedLink href={`/game/${simulationId}`}>
                <p className="text-xs">View Game →</p>
              </FramedLink>
            </div>
          )}

          {/* Run Button */}
          <div className="flex justify-center">
            <button
              onClick={handleRunSimulationClick}
              disabled={isRunning || config.models.length !== 6 || !config.openRouterKey}
              className="bg-neutral-950 border border-neutral-900 text-neutral-200 px-6 py-3 text-xs font-semibold min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-900 transition-colors flex items-center justify-center gap-2"
            >
              {isRunning ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  <span>Starting Simulation...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Run Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-950 border border-neutral-900 max-w-md w-full relative">
            <CornerBorders />
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-900">
              <div className="flex items-center gap-2">
                <Warning size={16} className="text-yellow-500" />
                <h3 className="text-xs font-semibold uppercase text-neutral-200">
                  Confirm Simulation
                </h3>
              </div>
              <button
                onClick={handleCancelSimulation}
                className="text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-neutral-300 font-medium">
                  Important: Please read before proceeding
                </p>
                <div className="space-y-2 text-xs text-neutral-400">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <p>
                      Once started, the simulation <strong className="text-neutral-300">cannot be stopped</strong> until all {config.numberOfHands} hands are completed.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <p>
                      This will consume <strong className="text-neutral-300">AI credits from your OpenRouter account</strong> for approximately {config.numberOfHands * 6 * 4} API calls.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <p>
                      The simulation may run for several minutes depending on the number of hands.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="border border-neutral-800 bg-neutral-900/30 p-3 space-y-1">
                <p className="text-xs text-neutral-300 font-medium">Simulation Summary:</p>
                <p className="text-xs text-neutral-400">Models: {config.models.length} selected</p>
                <p className="text-xs text-neutral-400">Hands: {config.numberOfHands}</p>
                <p className="text-xs text-neutral-400">Starting Stack: {config.startingStack.toLocaleString()}</p>
                <p className="text-xs text-neutral-400">Estimated API Calls: ~{config.numberOfHands * 6 * 4}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 border-t border-neutral-900">
              <FramedButton
                onClick={handleCancelSimulation}
                className="text-center flex-1"
              >
                Cancel
              </FramedButton>
              <FramedButton
                onClick={handleConfirmSimulation}
                className="text-black px-4 py-2 text-xs"
                borderColorClass="border-yellow-500"
              >
                I Understand, Start Simulation
              </FramedButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CornerBorders = () => {
  return (    
    <>  
    <div className="border-r-3 border-t-3 border-neutral-800 h-4 w-4 absolute -top-1 -right-1"/>
    <div className="border-l-3 border-b-3 border-neutral-800 h-4 w-4 absolute -bottom-1 -left-1"/>
    <div className="border-l-3 border-t-3 border-neutral-800 h-4 w-4 absolute -top-1 -left-1"/>
    <div className="border-r-3 border-b-3 border-neutral-800 h-4 w-4 absolute -bottom-1 -right-1"/>
    </>
  );
}; 