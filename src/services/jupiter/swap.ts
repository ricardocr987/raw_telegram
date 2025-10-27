// Swap API Types
export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      inAmount: string;
      outputMint: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

export interface JupiterSwapInstructions {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

// API Base URLs
const TOKEN_BASE_URL = 'https://quote-api.jup.ag/v6';

// Swap API Functions
export async function jupiterSwapInstructions(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number = 50,
  userAddress: string
): Promise<JupiterSwapInstructions> {
  try {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps: slippageBps.toString(),
      userAddress,
    });

    const response = await fetch(`${TOKEN_BASE_URL}/swap-instructions?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as JupiterSwapInstructions;
  } catch (error) {
    console.error('Error getting swap instructions:', error);
    throw error;
  }
}
