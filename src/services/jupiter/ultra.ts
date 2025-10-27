// Ultra API Types
export interface UltraOrderResponse {
  mode: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  inUsdValue?: number;
  outUsdValue?: number;
  priceImpact?: number;
  swapUsdValue?: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
    bps: number;
  }>;
  feeMint: string;
  feeBps: number;
  signatureFeeLamports: number;
  prioritizationFeeLamports: number;
  rentFeeLamports: number;
  swapType: string;
  router: 'aggregator' | 'jupiterz' | 'dflow' | 'okx';
  transaction: string | null;
  gasless: boolean;
  requestId: string;
  totalTime: number;
  taker: string | null;
  quoteId?: string;
  maker?: string;
  expireAt?: string;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  errorCode?: 1 | 2 | 3;
  errorMessage?: 'Insufficient funds' | 'Top up `${solAmount}` SOL for gas' | 'Minimum `${swapAmount}` for gasless';
}

export interface UltraExecuteResponse {
  status: 'Success' | 'Failed';
  signature?: string;
  slot?: string;
  error?: string;
  code: number;
  totalInputAmount?: string;
  totalOutputAmount?: string;
  inputAmountResult?: string;
  outputAmountResult?: string;
  swapEvents?: Array<{
    inputMint: string;
    inputAmount: string;
    outputMint: string;
    outputAmount: string;
  }>;
}

export interface TokenAccount {
  account: string;
  amount: string;
  uiAmount: number;
  uiAmountString: string;
  isFrozen: boolean;
  isAssociatedTokenAccount: boolean;
  decimals: number;
  programId: string;
}

export interface UltraHoldingsResponse {
  amount: string;
  uiAmount: number;
  uiAmountString: string;
  tokens: Record<string, TokenAccount[]>;
}

export interface UltraShieldResponse {
  warnings: Record<string, Array<{
    type: 'NOT_VERIFIED' | 'LOW_LIQUIDITY' | 'NOT_SELLABLE' | 'LOW_ORGANIC_ACTIVITY' | 'HAS_MINT_AUTHORITY' | 'HAS_FREEZE_AUTHORITY' | 'HAS_PERMANENT_DELEGATE' | 'NEW_LISTING' | 'VERY_LOW_TRADING_ACTIVITY' | 'HIGH_SUPPLY_CONCENTRATION' | 'NON_TRANSFERABLE' | 'MUTABLE_TRANSFER_FEES' | 'SUSPICIOUS_DEV_ACTIVITY' | 'SUSPICIOUS_TOP_HOLDER_ACTIVITY' | 'HIGH_SINGLE_OWNERSHIP' | '{}%_TRANSFER_FEES';
    message: string;
    severity: 'info' | 'warning' | 'critical';
    source?: 'RugCheck';
  }>>;
}

export interface UltraSearchResponse {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
  twitter?: string;
  telegram?: string;
  website?: string;
  dev?: string;
  circSupply: number;
  totalSupply: number;
  tokenProgram: string;
  launchpad?: string;
  partnerConfig?: string;
  graduatedPool?: string;
  graduatedAt?: string;
  holderCount: number;
  fdv: number;
  mcap: number;
  usdPrice: number;
  priceBlockId: number;
  liquidity: number;
  stats5m: {
    priceChange: number;
    holderChange: number;
    liquidityChange: number;
    volumeChange: number;
    buyVolume: number;
    sellVolume: number;
    buyOrganicVolume: number;
    sellOrganicVolume: number;
    numBuys: number;
    numSells: number;
    numTraders: number;
    numOrganicBuyers: number;
    numNetBuyers: number;
  };
  stats1h: {
    priceChange: number;
    holderChange: number;
    liquidityChange: number;
    volumeChange: number;
    buyVolume: number;
    sellVolume: number;
    buyOrganicVolume: number;
    sellOrganicVolume: number;
    numBuys: number;
    numSells: number;
    numTraders: number;
    numOrganicBuyers: number;
    numNetBuyers: number;
  };
  stats6h: {
    priceChange: number;
    holderChange: number;
    liquidityChange: number;
    volumeChange: number;
    buyVolume: number;
    sellVolume: number;
    buyOrganicVolume: number;
    sellOrganicVolume: number;
    numBuys: number;
    numSells: number;
    numTraders: number;
    numOrganicBuyers: number;
    numNetBuyers: number;
  };
  stats24h: {
    priceChange: number;
    holderChange: number;
    liquidityChange: number;
    volumeChange: number;
    buyVolume: number;
    sellVolume: number;
    buyOrganicVolume: number;
    sellOrganicVolume: number;
    numBuys: number;
    numSells: number;
    numTraders: number;
    numOrganicBuyers: number;
    numNetBuyers: number;
  };
  firstPool: {
    id: string;
    createdAt: string;
  };
  audit: {
    isSus: boolean;
    mintAuthorityDisabled: boolean;
    freezeAuthorityDisabled: boolean;
    topHoldersPercentage: number;
    devBalancePercentage: number;
    devMigrations: number;
  };
  organicScore: number;
  organicScoreLabel: 'high' | 'medium' | 'low';
  isVerified: boolean;
  cexes: string[];
  tags: string[];
  updatedAt: string;
}

export interface UltraRouter {
  id: string;
  name: 'Metis v1.6' | 'JupiterZ' | 'DFlow' | 'OKX DEX Router';
  icon: string;
}

// API Base URL
const ULTRA_BASE_URL = 'https://lite-api.jup.ag/ultra/v1';

// Ultra API Functions
export async function getUltraOrder(
  inputMint: string,
  outputMint: string,
  amount: string,
  taker?: string,
  referralAccount?: string,
  referralFee?: number,
  excludeRouters?: string[],
  excludeDexes?: string,
  payer?: string
): Promise<UltraOrderResponse> {
  try {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
    });

    if (taker) params.append('taker', taker);
    if (referralAccount) params.append('referralAccount', referralAccount);
    if (referralFee) params.append('referralFee', referralFee.toString());
    if (excludeRouters) params.append('excludeRouters', excludeRouters.join(','));
    if (excludeDexes) params.append('excludeDexes', excludeDexes);
    if (payer) params.append('payer', payer);

    const url = `${ULTRA_BASE_URL}/order?${params}`;
    console.log('Ultra API request URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Ultra API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { errorMessage?: string; errorCode?: number };
        if (errorBody.errorMessage) {
          errorMessage += ` - ${errorBody.errorMessage}`;
        }
        if (errorBody.errorCode) {
          errorMessage += ` (Code: ${errorBody.errorCode})`;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as UltraOrderResponse;
  } catch (error) {
    console.error('Error getting ultra order:', error);
    throw error;
  }
}

export async function executeUltraOrder(
  signedTransaction: string,
  requestId: string
): Promise<UltraExecuteResponse> {
  try {
    const response = await fetch(`${ULTRA_BASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signedTransaction,
        requestId,
      }),
    });

    if (!response.ok) {
      let errorMessage = `Ultra API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { errorMessage?: string; errorCode?: number };
        if (errorBody.errorMessage) {
          errorMessage += ` - ${errorBody.errorMessage}`;
        }
        if (errorBody.errorCode) {
          errorMessage += ` (Code: ${errorBody.errorCode})`;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as UltraExecuteResponse;
  } catch (error) {
    console.error('Error executing ultra order:', error);
    throw error;
  }
}

export async function getUltraHoldings(address: string): Promise<UltraHoldingsResponse> {
  try {
    console.log(`[getUltraHoldings] Fetching holdings for address: ${address}`);
    
    const response = await fetch(`${ULTRA_BASE_URL}/holdings/${address}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Ultra API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { errorMessage?: string; errorCode?: number };
        if (errorBody.errorMessage) {
          errorMessage += ` - ${errorBody.errorMessage}`;
        }
        if (errorBody.errorCode) {
          errorMessage += ` (Code: ${errorBody.errorCode})`;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json() as UltraHoldingsResponse;
    console.log(`[getUltraHoldings] Successfully fetched holdings for ${address}`);
    return result;
  } catch (error) {
    console.error('[getUltraHoldings] Error getting ultra holdings:', error);
    throw error;
  }
}

export async function getUltraShield(mints: string[]): Promise<UltraShieldResponse> {
  try {
    const params = new URLSearchParams({
      mints: mints.join(',')
    });

    const response = await fetch(`${ULTRA_BASE_URL}/shield?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Ultra API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { errorMessage?: string; errorCode?: number };
        if (errorBody.errorMessage) {
          errorMessage += ` - ${errorBody.errorMessage}`;
        }
        if (errorBody.errorCode) {
          errorMessage += ` (Code: ${errorBody.errorCode})`;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as UltraShieldResponse;
  } catch (error) {
    console.error('Error getting ultra shield:', error);
    throw error;
  }
}

export async function searchUltraTokens(query: string): Promise<UltraSearchResponse[]> {
  try {
    const params = new URLSearchParams({
      query
    });

    const response = await fetch(`${ULTRA_BASE_URL}/search?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Ultra API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { errorMessage?: string; errorCode?: number };
        if (errorBody.errorMessage) {
          errorMessage += ` - ${errorBody.errorMessage}`;
        }
        if (errorBody.errorCode) {
          errorMessage += ` (Code: ${errorBody.errorCode})`;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as UltraSearchResponse[];
  } catch (error) {
    console.error('Error searching ultra tokens:', error);
    throw error;
  }
}

export async function getUltraRouters(): Promise<UltraRouter[]> {
  try {
    const response = await fetch(`${ULTRA_BASE_URL}/order/routers`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Ultra API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { errorMessage?: string; errorCode?: number };
        if (errorBody.errorMessage) {
          errorMessage += ` - ${errorBody.errorMessage}`;
        }
        if (errorBody.errorCode) {
          errorMessage += ` (Code: ${errorBody.errorCode})`;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as UltraRouter[];
  } catch (error) {
    console.error('Error getting ultra routers:', error);
    throw error;
  }
}
