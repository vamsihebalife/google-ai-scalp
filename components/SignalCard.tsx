import React from 'react';
import { TradeSignal, SignalDirection } from '../types';

interface SignalCardProps {
  signal: TradeSignal;
  livePrice: { price: number; movement: 'up' | 'down' | 'none' } | null;
  isMarketOpen: boolean;
}

const getPairDecimals = (pair: string): number => {
    if (pair.includes('JPY')) return 3;
    if (pair === 'XAU/USD' || pair === 'BTC/USD') return 2;
    return 5;
}

const LivePriceDisplay: React.FC<{ 
    livePrice: SignalCardProps['livePrice'], 
    decimals: number, 
    isMarketOpen: boolean 
}> = ({ livePrice, decimals, isMarketOpen }) => {
    if (!livePrice) return null;

    if (!isMarketOpen) {
        return (
            <div className="flex justify-between items-baseline text-base sm:text-lg">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500"></span>
                    </span>
                    <span className="text-gray-400 font-semibold">Status</span>
                </div>
                <span className={`font-mono font-bold text-yellow-500`}>
                    Market Closed
                </span>
            </div>
        );
    }
    
    const priceColor = livePrice.movement === 'up' ? 'text-emerald-400' : livePrice.movement === 'down' ? 'text-red-500' : 'text-white';

    return (
        <div className="flex justify-between items-baseline text-base sm:text-lg">
            <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
                <span className="text-gray-300 font-semibold">Live Price</span>
            </div>
            <span className={`font-mono font-bold transition-colors duration-300 ${priceColor}`}>
                {livePrice.price.toFixed(decimals)}
            </span>
        </div>
    );
};

const SignalDetail: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className = '' }) => (
    <div className="flex justify-between items-baseline text-sm sm:text-base">
        <span className="text-gray-400">{label}</span>
        <span className={`font-mono font-semibold ${className}`}>{value}</span>
    </div>
);

export const SignalCard: React.FC<SignalCardProps> = ({ signal, livePrice, isMarketOpen }) => {
  const isBuy = signal.direction === SignalDirection.BUY;
  const directionClass = isBuy ? 'text-emerald-400' : 'text-red-500';
  const bgClass = isBuy ? 'bg-emerald-500/10' : 'bg-red-500/10';
  const borderClass = isBuy ? 'border-emerald-500/30' : 'border-red-500/30';
  const decimals = getPairDecimals(signal.pair);

  return (
    <div className={`w-full max-w-md mx-auto bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border ${borderClass} overflow-hidden transition-all duration-500 ease-in-out transform`}>
      <div className={`p-4 ${bgClass}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">{signal.pair}</h2>
          <span className={`px-4 py-1 text-sm font-bold rounded-full ${directionClass} ${bgClass}`}>
            {signal.direction}
          </span>
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        {livePrice && <LivePriceDisplay livePrice={livePrice} decimals={decimals} isMarketOpen={isMarketOpen} />}
        <div className={`pt-4 space-y-4 ${livePrice ? 'border-t border-gray-700/50' : ''}`}>
            <SignalDetail label="Entry Price" value={signal.entry.toFixed(decimals)} className="text-white" />
            <SignalDetail label="Take Profit" value={signal.takeProfit.toFixed(decimals)} className="text-emerald-400" />
            <SignalDetail label="Stop Loss" value={signal.stopLoss.toFixed(decimals)} className="text-red-500" />
            <SignalDetail label="Risk/Reward" value={`1 : ${signal.riskRewardRatio.toFixed(2)}`} className="text-cyan-400" />
        </div>
      </div>

      <div className="p-5 border-t border-gray-700/50">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">AI Rationale</h3>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">{signal.rationale}</p>
      </div>
    </div>
  );
};
