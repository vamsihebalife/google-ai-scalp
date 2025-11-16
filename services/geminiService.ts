import { GoogleGenAI } from "@google/genai";
import { TradeSignal, SignalDirection, Timeframe } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTradeRationale = async (signal: Omit<TradeSignal, 'rationale'>, timeframe: Timeframe): Promise<string> => {
  const prompt = `
    You are a world-class forex scalper with decades of experience analyzing market dynamics in milliseconds.
    Given the following high-probability trade signal on the ${timeframe} timeframe, provide a brief, confident, and professional trading rationale.
    Focus on concepts like market structure, liquidity grabs, order blocks, fair value gaps, or key level breaks relevant to the ${timeframe} chart.
    The rationale should be concise, no more than 2-3 sentences.

    Trade Details:
    - Pair: ${signal.pair}
    - Direction: ${signal.direction}
    - Entry Price: ${signal.entry.toFixed(5)}
    - Take Profit: ${signal.takeProfit.toFixed(5)}
    - Stop Loss: ${signal.stopLoss.toFixed(5)}
    - Risk/Reward Ratio: 1:${signal.riskRewardRatio.toFixed(2)}

    Generate the rationale for this trade.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating trade rationale:", error);
    return "Failed to generate AI rationale. Please check your API key and network connection.";
  }
};
