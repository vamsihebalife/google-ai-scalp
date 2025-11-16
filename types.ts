export enum SignalDirection {
  BUY = 'BUY',
  SELL = 'SELL',
}

export interface TradeSignal {
  pair: string;
  direction: SignalDirection;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  riskRewardRatio: number;
  rationale: string;
}

export enum TradeOutcome {
  TP = 'Take Profit',
  SL = 'Stop Loss',
}

export interface TradeResult {
  id: string;
  signal: TradeSignal;
  outcome: TradeOutcome;
  closePrice: number;
  profitOrLoss: number;
}

export type Timeframe = '15m' | '1h' | '4h';

export interface ScalperState {
  id: Timeframe;
  selectedPair: string;
  accountBalance: number;
  winStreak: number;
  lossStreak: number;
  activeSignal: TradeSignal | null;
  tradeHistory: TradeResult[];
  isTradeActive: boolean;
  isLoading: boolean;
  isMarketOpen: boolean;
  livePrice: { price: number; movement: 'up' | 'down' | 'none' } | null;
}
