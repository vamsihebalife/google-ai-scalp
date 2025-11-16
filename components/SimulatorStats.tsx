import React from 'react';

interface SimulatorStatsProps {
  balance: number;
  winStreak: number;
  lossStreak: number;
}

const StatItem: React.FC<{ label: string; value: string | number; colorClass: string }> = ({ label, value, colorClass }) => (
    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-800/50">
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{label}</span>
        <span className={`text-xl font-bold ${colorClass}`}>{value}</span>
    </div>
);


export const SimulatorStats: React.FC<SimulatorStatsProps> = ({ balance, winStreak, lossStreak }) => {
  return (
    <div className="w-full bg-gray-800 border border-gray-700/50 rounded-xl shadow-lg p-4 mb-6">
        <div className="flex items-center justify-between">
             <div className="flex flex-col">
                <span className="text-sm text-gray-400">Account Balance</span>
                <span className="text-3xl font-bold text-white tracking-tight">${balance.toFixed(2)}</span>
            </div>
             <div className="grid grid-cols-2 gap-2 text-center">
                <StatItem label="Win Streak" value={winStreak} colorClass="text-emerald-400" />
                <StatItem label="Loss Streak" value={lossStreak} colorClass="text-red-500" />
            </div>
        </div>
    </div>
  );
};
