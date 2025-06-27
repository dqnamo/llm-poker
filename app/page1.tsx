import Image from "next/image";
import Player from "./components/Player";
import PlayerItems from "./components/PlayerItems";
import Card from "./components/Card";

export default function Home() {
  // Example community cards (you can make this dynamic later)
  const communityCards = ["A♠", "K♥", "Q♦", "J♣", "10♠"];
  
  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto py-5 sm:py-10 px-4 font-barlow">
      <div className="flex flex-col gap-2 w-full sm:w-max mx-auto">
        <h1 className="text-xl sm:text-2xl uppercase font-medium font-bebas-neue text-center mx-auto">LLM Poker</h1>
        <p className="text-center text-xs sm:text-sm max-w-md mx-auto font-barlow">
          LLM Poker is a benchmark for evaluating the reasoning capabilities of LLMs by playing poker.
        </p>
      </div>

      {/* Poker table with 6 players */}
      <div className="relative w-full max-w-5xl mx-auto mt-5 sm:mt-10 aspect-[6/3]">
        {/* Poker table */}
        <div className="absolute inset-[15%] rounded-full bg-gradient-to-b from-green-800 to-green-900 border-8 sm:border-16 border-neutral-900 flex items-center justify-center shadow-[inset_0_0_30px_rgba(0,255,0,0.3)]">
          {/* Table logo text */}
          <div className="absolute text-2xl sm:text-4xl font-bold tracking-widest text-green-700 opacity-30 select-none rotate-0 font-bebas-neue">
            LLM POKER
          </div>
          
          {/* Center area for community cards and pot */}
          <div className="w-[70%] h-[40%] rounded flex flex-col items-center justify-center">
            <div className="text-xs sm:text-sm md:text-base text-white mb-2">Community Cards</div>
            <div className="flex gap-1 sm:gap-2">
              {communityCards.map((card, index) => (
                <Card key={index} value={card} className="w-8 h-11 sm:w-10 sm:h-14" faceDown={false} />
              ))}
            </div>
            <div className="text-xs sm:text-sm md:text-base text-white mt-2 sm:mt-3">Pot: $0</div>
          </div>
          
          {/* Player item areas on the table */}
          <PlayerItems position="top" playerNumber={1} betAmount={25} />
          <PlayerItems position="top-right" playerNumber={2} betAmount={50} />
          <PlayerItems position="bottom-right" playerNumber={3} betAmount={2100} />
          <PlayerItems position="bottom" playerNumber={4} betAmount={75} />
          <PlayerItems position="bottom-left" playerNumber={5} betAmount={0} />
          <PlayerItems position="top-left" playerNumber={6} betAmount={200} />
        </div>
        
        {/* Player positions */}
        <Player 
          position="top" 
          name="Google Gemini 1.5 Flash" 
          money={1000} 
          cards={["A♠", "K♥"]} 
          status="Betting" 
        />
        <Player 
          position="top-right" 
          name="OpenAI GPT-4.5" 
          money={1000} 
          cards={["A♠", "K♥"]} 
          status="Betting" 
        />
        <Player 
          position="bottom-right" 
          name="OpenAI GPT-4o" 
          money={1000} 
          cards={["A♠", "K♥"]} 
          status="Betting" 
        />
        <Player 
          position="bottom" 
          name="Anthropic Claude 3.5 Sonnet" 
          money={1000} 
          cards={["A♠", "K♥"]} 
          status="Betting" 
        />
        <Player 
          position="bottom-left" 
          name="Anthropic Claude 3.7 Sonnet" 
          money={1000} 
          cards={["A♠", "K♥"]} 
          status="Betting" 
        />
        <Player 
          position="top-left" 
          name="Google Gemini 1.5 Pro" 
          money={1000} 
          cards={["A♠", "K♥"]} 
          status="Betting" 
        />
      </div>
    </div>
  );
}
