export interface EarnAmountRequestBody {
  asset: string;
  signer: string;
  amount: string;
}

export interface EarnSharesRequestBody {
  asset: string;
  signer: string;
  shares: string;
}

export interface TransactionResponse {
  transaction: string;
}

export interface AccountMeta {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

export interface InstructionResponse {
  programId: string;
  accounts: AccountMeta[];
  data: string;
}

export interface AssetInfo {
  address: string;
  chain_id: string;
  name: string;
  symbol: string;
  decimals: number;
  logo_url: string;
  price: string;
  coingecko_id: string;
}

export interface LiquiditySupplyData {
  modeWithInterest: boolean;
  supply: string;
  withdrawalLimit: string;
  lastUpdateTimestamp: string;
  expandPercent: string;
  expandDuration: string;
  baseWithdrawalLimit: string;
  withdrawableUntilLimit: string;
  withdrawable: string;
}

export interface TokenInfo {
  id: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  assetAddress: string;
  asset: AssetInfo;
  totalAssets: string;
  totalSupply: string;
  convertToShares: string;
  convertToAssets: string;
  rewardsRate: string;
  supplyRate: string;
  totalRate: string;
  rebalanceDifference: string;
  liquiditySupplyData: LiquiditySupplyData;
}

export interface UserPosition {
  token: TokenInfo;
  ownerAddress: string;
  shares: string;
  underlyingAssets: string;
  underlyingBalance: string;
  allowance: string;
}

export interface UserEarningsResponse {
  address: string;
  ownerAddress: string;
  totalDeposits: string;
  totalWithdraws: string;
  totalBalance: string;
  totalAssets: string;
  earnings: string;
}

// API Base URL
const LEND_BASE_URL = 'https://lite-api.jup.ag/lend/v1';

// Lend API Functions
export async function depositEarn(request: EarnAmountRequestBody): Promise<TransactionResponse> {
  try {
    const response = await fetch(`${LEND_BASE_URL}/earn/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Lend API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as TransactionResponse;
  } catch (error) {
    console.error('Error creating earn deposit transaction:', error);
    throw error;
  }
}

export async function withdrawEarn(request: EarnAmountRequestBody): Promise<TransactionResponse> {
  try {
    const response = await fetch(`${LEND_BASE_URL}/earn/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Lend API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as TransactionResponse;
  } catch (error) {
    console.error('Error creating earn withdraw transaction:', error);
    throw error;
  }
}

export async function mintEarn(request: EarnSharesRequestBody): Promise<TransactionResponse> {
  try {
    const response = await fetch(`${LEND_BASE_URL}/earn/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Lend API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as TransactionResponse;
  } catch (error) {
    console.error('Error creating earn mint transaction:', error);
    throw error;
  }
}

export async function redeemEarn(request: EarnSharesRequestBody): Promise<TransactionResponse> {
  try {
    const response = await fetch(`${LEND_BASE_URL}/earn/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Lend API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as TransactionResponse;
  } catch (error) {
    console.error('Error creating earn redeem transaction:', error);
    throw error;
  }
}

export async function getDepositInstructions(request: EarnAmountRequestBody): Promise<InstructionResponse> {
  try {
    const response = await fetch(`${LEND_BASE_URL}/earn/deposit-instructions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Lend API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as InstructionResponse;
  } catch (error) {
    console.error('Error getting deposit instructions:', error);
    throw error;
  }
}

export async function getWithdrawInstructions(request: EarnAmountRequestBody): Promise<InstructionResponse> {
  try {
    const response = await fetch(`${LEND_BASE_URL}/earn/withdraw-instructions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Lend API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as InstructionResponse;
  } catch (error) {
    console.error('Error getting withdraw instructions:', error);
    throw error;
  }
}

export async function getMintInstructions(request: EarnSharesRequestBody): Promise<InstructionResponse> {
  try {
    const response = await fetch(`${LEND_BASE_URL}/earn/mint-instructions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Lend API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as InstructionResponse;
  } catch (error) {
    console.error('Error getting mint instructions:', error);
    throw error;
  }
}

export async function getRedeemInstructions(request: EarnSharesRequestBody): Promise<InstructionResponse> {
  try {
    const response = await fetch(`${LEND_BASE_URL}/earn/redeem-instructions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Lend API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as InstructionResponse;
  } catch (error) {
    console.error('Error getting redeem instructions:', error);
    throw error;
  }
}

export async function getEarnTokens(): Promise<TokenInfo[]> {
  try {
    const response = await fetch(`${LEND_BASE_URL}/earn/tokens`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Lend API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as TokenInfo[];
  } catch (error) {
    console.error('Error fetching earn tokens:', error);
    throw error;
  }
}

export async function getEarnPositions(users: string): Promise<UserPosition[]> {
  try {
    const params = new URLSearchParams({
      users: users
    });

    const response = await fetch(`${LEND_BASE_URL}/earn/positions?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Lend API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as UserPosition[];
  } catch (error) {
    console.error('Error fetching earn positions:', error);
    throw error;
  }
}

export async function getEarnEarnings(user: string, positions: string): Promise<UserEarningsResponse> {
  try {
    const params = new URLSearchParams({
      user: user,
      positions: positions
    });

    const response = await fetch(`${LEND_BASE_URL}/earn/earnings?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Lend API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as UserEarningsResponse;
  } catch (error) {
    console.error('Error fetching earn earnings:', error);
    throw error;
  }
}
