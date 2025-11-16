import React from 'react';
import { TradeResult, SignalDirection } from '../types';

interface TradeHistoryProps {
  history: TradeResult[];
}

const HistoryRow: React.FC<{ trade: TradeResult }> = ({ trade }) => {
    const isBuy = trade.signal.direction === SignalDirection.BUY;
    const isWin = trade.profitOrLoss > 0;
    const profitColor = isWin ? 'text-emerald-400' : 'text-red-500';
    const directionColor = isBuy ? 'text-emerald-400' : 'text-red-500';

    return (
        <li className="grid grid-cols-4 items-center gap-2 p-3 text-sm border-b border-gray-700/50">
            <div className="font-semibold text-white">{trade.signal.pair}</div>
            <div className={`font-bold ${directionColor}`}>{trade.signal.direction}</div>
            <div className={`font-mono font-semibold ${profitColor}`}>
                {isWin ? '+' : ''}${trade.profitOrLoss.toFixed(2)}
            </div>
            <div className={`text-right font-semibold ${profitColor}`}>{trade.outcome}</div>
        </li>
    );
};

export const TradeHistory: React.FC<TradeHistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return null; // Don't render anything if there's no history
  }

  return (
    <div className="w-full mt-8">
        <h3 className="text-lg font-semibold text-gray-300 mb-3 px-1">Trade History</h3>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl max-h-64 overflow-y-auto shadow-inner">
            <header className="sticky top-0 bg-gray-800 z-10 grid grid-cols-4 gap-2 p-3 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-700">
                <span>Pair</span>
                <span>Direction</span>
                <span>P/L ($)</span>
                <span className="text-right">Outcome</span>
            </header>
            <ul className="divide-y divide-gray-700/30">
                {history.map((trade) => (
                    <HistoryRow key={trade.id} trade={trade} />
                ))}
            </ul>
        </div>
    </div>
  );
};
