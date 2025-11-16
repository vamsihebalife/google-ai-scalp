import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TradeSignal, SignalDirection, TradeResult, TradeOutcome, Timeframe, ScalperState } from './types';
import { generateTradeRationale } from './services/geminiService';
import { SignalCard } from './components/SignalCard';
import { LoadingSpinner, ChartIcon } from './components/icons';
import { SimulatorStats } from './components/SimulatorStats';
import { TradeHistory } from './components/TradeHistory';

const availablePairs = [
  'BTC/USD', 'XAU/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD', 'AUD/USD', 'SOL/USD', 'XRP/USD'
];

const initialScalperState = (id: Timeframe, defaultPair: string): ScalperState => ({
  id,
  selectedPair: defaultPair,
  accountBalance: 200,
  winStreak: 0,
  lossStreak: 0,
  activeSignal: null,
  tradeHistory: [],
  isTradeActive: false,
  isLoading: true,
  isMarketOpen: true,
  livePrice: null,
});

const isForexMarketOpen = (): boolean => {
  const now = new Date();
  const dayUTC = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const hourUTC = now.getUTCHours();

  // Market is closed on Saturday
  if (dayUTC === 6) {
    return false;
  }
  // Market is closed on Friday after 22:00 UTC (5 PM ET)
  if (dayUTC === 5 && hourUTC >= 22) {
    return false;
  }
  // Market is closed on Sunday before 22:00 UTC (5 PM ET)
  if (dayUTC === 0 && hourUTC < 22) {
    return false;
  }
  return true;
};

const formatPairForBinance = (pair: string): string => {
    if (pair === 'XAU/USD') return 'XAUUSDT';
    return pair.replace('/', '') + 'T'; // BTC/USD -> BTCUSDT
}

const fetchBinancePrice = async (pair: string): Promise<number> => {
    const symbol = formatPairForBinance(pair);
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        if (!response.ok) {
            // Fallback for symbols that don't end in USDT but just T, e.g. EURUSDT
            const responseT = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.slice(0, -1)}`);
             if (!responseT.ok) throw new Error(`Binance API request failed for ${symbol} and ${symbol.slice(0,-1)}`);
             const data = await responseT.json();
             return parseFloat(data.price);
        }
        const data = await response.json();
        return parseFloat(data.price);
    } catch (error) {
        console.error(`Failed to fetch live price for ${pair} from Binance:`, error);
        throw new Error(`Could not fetch price for ${pair}. The asset may not be available on Binance.`);
    }
};

const calculateProfitOrLoss = (signal: TradeSignal, closePrice: number): number => {
    const { pair, direction, entry } = signal;
    const lotSize = 0.01; // Standardized at 0.01 lots
    const priceDifference = direction === SignalDirection.BUY ? closePrice - entry : entry - closePrice;

    let contractSize: number;

    if (pair.includes('/USD') && !pair.includes('XAU')) { // Covers Crypto and Forex
        contractSize = pair.startsWith('BTC') || pair.startsWith('ETH') || pair.startsWith('SOL') || pair.startsWith('XRP')
            ? 1         // For crypto, 1 lot = 1 coin
            : 100000;   // For forex, 1 lot = 100,000 units
    } else if (pair === 'XAU/USD') {
        contractSize = 100; // For Gold, 1 lot = 100 troy ounces
    } else {
        contractSize = 100000; // Default to forex standard
    }

    const unitsTraded = lotSize * contractSize;
    return priceDifference * unitsTraded;
};


const timeframes: Timeframe[] = ['15m', '1h', '4h'];

const App: React.FC = () => {
  const [scalpers, setScalpers] = useState<Record<Timeframe, ScalperState>>({
    '15m': initialScalperState('15m', 'BTC/USD'),
    '1h': initialScalperState('1h', 'XAU/USD'),
    '4h': initialScalperState('4h', 'EUR/USD'),
  });
  const [error, setError] = useState<string | null>(null);
  const intervalRefs = useRef<Record<Timeframe, number | null>>({'15m': null, '1h': null, '4h': null});

  const runNewTradeCycle = useCallback(async (tf: Timeframe, pair: string) => {
    setScalpers(prev => ({ ...prev, [tf]: { ...prev[tf], isLoading: true, isTradeActive: false, activeSignal: null, livePrice: null } }));
    
    try {
        const entry = await fetchBinancePrice(pair);
        const direction = Math.random() > 0.5 ? SignalDirection.BUY : SignalDirection.SELL;
        
        // Define a target risk in dollars for the trade
        const targetRiskInUSD = Math.random() * 10 + 5; // Risk between $5 and $15 per trade
        let slDistance: number;
        const lotSize = 0.01;

        // Calculate slDistance needed to achieve the target risk
        if (pair === 'BTC/USD' || pair === 'ETH/USD' || pair === 'SOL/USD' || pair === 'XRP/USD') {
            // For crypto, P/L = price_change * lot_size (where lot_size is in coins)
            const unitsTraded = lotSize; // 0.01 coins
            slDistance = targetRiskInUSD / unitsTraded;
        } else if (pair === 'XAU/USD') {
            // For Gold, 1 lot = 100 oz. 0.01 lot = 1 oz. P/L = price_change * 1
            const unitsTraded = 1;
            slDistance = targetRiskInUSD / unitsTraded;
        } else { // Forex pairs
            // For Forex, 1 lot = 100,000 units. 0.01 lot = 1000 units. P/L = price_change * 1000
            const unitsTraded = 1000;
            slDistance = targetRiskInUSD / unitsTraded;
        }
        
        const rrr = Math.random() * 1.5 + 1.5; // Risk/Reward Ratio between 1:1.5 and 1:3.0
        const tpDistance = slDistance * rrr;

        const stopLoss = direction === SignalDirection.BUY ? entry - slDistance : entry + slDistance;
        const takeProfit = direction === SignalDirection.BUY ? entry + tpDistance : entry - tpDistance;

        const generatedSignal: Omit<TradeSignal, 'rationale'> = { pair, direction, entry, takeProfit, stopLoss, riskRewardRatio: rrr };
        const rationale = await generateTradeRationale(generatedSignal, tf);

        if (rationale.startsWith("Failed")) {
            setError(rationale);
            return;
        }
        
        const newSignal = { ...generatedSignal, rationale };
        const marketOpen = !pair.includes('USD/') || pair === 'BTC/USD' || pair.includes('ETH') || pair.includes('SOL') || pair.includes('XRP') || isForexMarketOpen();


        setScalpers(prev => ({
            ...prev,
            [tf]: {
                ...prev[tf],
                activeSignal: newSignal,
                isTradeActive: true,
                isLoading: false,
                isMarketOpen: marketOpen,
                livePrice: { price: newSignal.entry, movement: 'none' }
            }
        }));

    } catch (e: any) {
      console.error(e);
      setError(`Error in ${tf} scalper for pair ${pair}: ${e.message}. Please try another pair.`);
      setScalpers(prev => ({ ...prev, [tf]: { ...prev[tf], isLoading: false } }));
    }
  }, []);

  const handlePairChange = (tf: Timeframe, newPair: string) => {
      setScalpers(prev => ({...prev, [tf]: {...prev[tf], selectedPair: newPair }}));
      runNewTradeCycle(tf, newPair);
  }

  const handleTradeConclusion = useCallback((tf: Timeframe, outcome: TradeOutcome, closePrice: number) => {
    setScalpers(prev => {
        const scalper = prev[tf];
        if (!scalper.activeSignal) return prev;
        
        const profitOrLoss = calculateProfitOrLoss(scalper.activeSignal, closePrice);
        const newBalance = scalper.accountBalance + profitOrLoss;

        const newWinStreak = profitOrLoss > 0 ? scalper.winStreak + 1 : 0;
        const newLossStreak = profitOrLoss <= 0 ? scalper.lossStreak + 1 : 0;

        const tradeResult: TradeResult = {
            id: `${tf}-${new Date().toISOString()}`,
            signal: scalper.activeSignal,
            outcome,
            closePrice,
            profitOrLoss,
        };

        const updatedScalper: ScalperState = {
            ...scalper,
            accountBalance: newBalance,
            winStreak: newWinStreak,
            lossStreak: newLossStreak,
            tradeHistory: [tradeResult, ...scalper.tradeHistory],
            isTradeActive: false,
        };
        
        return { ...prev, [tf]: updatedScalper };
    });
    
    setTimeout(() => runNewTradeCycle(tf, scalpers[tf].selectedPair), 1000);
  }, [runNewTradeCycle, scalpers]);
  
  // Effect to manage live price intervals using Binance API
  useEffect(() => {
    timeframes.forEach(tf => {
        if (intervalRefs.current[tf]) {
            clearInterval(intervalRefs.current[tf]);
        }

        const scalper = scalpers[tf];
        if (scalper.isTradeActive && scalper.activeSignal && scalper.isMarketOpen) {
            intervalRefs.current[tf] = window.setInterval(async () => {
                try {
                    const newPrice = await fetchBinancePrice(scalper.activeSignal!.pair);

                    setScalpers(prev => {
                        const currentScalper = prev[tf];
                        const { activeSignal, livePrice } = currentScalper;
                        if (!activeSignal || !livePrice) return prev;

                        const { stopLoss, takeProfit, direction } = activeSignal;

                        if (direction === SignalDirection.BUY) {
                            if (newPrice >= takeProfit) { handleTradeConclusion(tf, TradeOutcome.TP, takeProfit); return prev; }
                            if (newPrice <= stopLoss) { handleTradeConclusion(tf, TradeOutcome.SL, stopLoss); return prev; }
                        } else { // SELL
                            if (newPrice <= takeProfit) { handleTradeConclusion(tf, TradeOutcome.TP, takeProfit); return prev; }
                            if (newPrice >= stopLoss) { handleTradeConclusion(tf, TradeOutcome.SL, stopLoss); return prev; }
                        }
                        
                        const newLivePrice = { price: newPrice, movement: newPrice > livePrice.price ? 'up' : (newPrice < livePrice.price ? 'down' : 'none') as 'up' | 'down' | 'none' };
                        return { ...prev, [tf]: { ...currentScalper, livePrice: newLivePrice }};
                    });
                } catch (e) {
                    console.error(`Could not update price for ${scalper.activeSignal?.pair}`, e);
                }
            }, 2000); // Poll every 2 seconds to be respectful of API limits
        }
    });

    return () => {
        timeframes.forEach(tf => {
            if (intervalRefs.current[tf]) {
                clearInterval(intervalRefs.current[tf]);
            }
        });
    };
  }, [scalpers, handleTradeConclusion]);

  // Initial load effect
  useEffect(() => {
    timeframes.forEach(tf => runNewTradeCycle(tf, scalpers[tf].selectedPair));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-gray-700/20 [mask-image:linear-gradient(to_bottom,white_0,white_75%,transparent_100%)]"></div>
        <div className="relative z-10 flex flex-col items-center w-full max-w-7xl mx-auto">
            <header className="text-center mb-8 w-full">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <ChartIcon className="w-8 h-8 text-cyan-400"/>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                        Scalper AI Dashboard
                    </h1>
                </div>
                <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
                    Three autonomous AI scalping bots trading across multiple timeframes.
                </p>
            </header>
            
            {error && (
                <div className="w-full max-w-3xl bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg text-center mb-6">
                    <p className="font-semibold">Error</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}
            
            <main className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
                {timeframes.map(tf => {
                    const scalper = scalpers[tf];
                    return (
                        <div key={tf} className="flex flex-col gap-6 bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
                            <div className='flex justify-between items-center'>
                               <h2 className="text-2xl font-bold text-white">{tf.toUpperCase()} Scalper</h2>
                                <select 
                                    value={scalper.selectedPair} 
                                    onChange={(e) => handlePairChange(tf, e.target.value)}
                                    className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                                    disabled={scalper.isLoading}
                                >
                                    {availablePairs.map(pair => (
                                        <option key={pair} value={pair}>{pair}</option>
                                    ))}
                                </select>
                            </div>
                            <SimulatorStats balance={scalper.accountBalance} winStreak={scalper.winStreak} lossStreak={scalper.lossStreak} />
                            
                            <div className="w-full min-h-[300px] flex flex-col justify-center">
                                {scalper.isLoading && (
                                    <div className="flex flex-col items-center text-center p-8 space-y-4">
                                        <LoadingSpinner className="w-12 h-12 text-cyan-400" />
                                        <p className="text-lg text-gray-300">Fetching live market data...</p>
                                    </div>
                                )}
                                {scalper.activeSignal && (
                                    <SignalCard 
                                        signal={scalper.activeSignal} 
                                        livePrice={scalper.isTradeActive ? scalper.livePrice : null} 
                                        isMarketOpen={scalper.isMarketOpen}
                                    />
                                )}
                            </div>
                            
                            <TradeHistory history={scalper.tradeHistory} />
                        </div>
                    );
                })}
            </main>
        </div>
    </div>
  );
};

export default App;