import { getUltraHoldings } from '../services/jupiter/ultra';
import { getTokenBySymbolOrAddress } from '../services/jupiter/tokens';

export interface TokenHolding {
  symbol: string;
  mint: string;
  name: string;
  decimals: number;
  balance: string;
  uiAmount: number;
  uiAmountString: string;
}

export interface HoldingsData {
  solBalance: string;
  solUiAmount: number;
  tokenHoldings: TokenHolding[];
  totalTokens: number;
}

/**
 * Get enriched holdings data with token metadata
 */
export async function getHoldingsData(walletAddress: string): Promise<HoldingsData> {
  try {
    const holdings = await getUltraHoldings(walletAddress);
    
    const solBalance = holdings.uiAmountString;
    const solUiAmount = holdings.uiAmount;
    const tokenHoldings: TokenHolding[] = [];

    // Process other tokens
    if (holdings.tokens) {
      for (const [mint, accounts] of Object.entries(holdings.tokens)) {
        if (accounts && accounts.length > 0) {
          const account = accounts[0];
          if (!account) continue;
          
          const balance = parseFloat(account.uiAmountString);
          
          if (balance > 0) {
            try {
              const tokenInfo = await getTokenBySymbolOrAddress(mint);
              if (tokenInfo) {
                tokenHoldings.push({
                  symbol: tokenInfo.symbol,
                  mint: tokenInfo.id,
                  name: tokenInfo.name,
                  decimals: tokenInfo.decimals,
                  balance: account.amount,
                  uiAmount: account.uiAmount,
                  uiAmountString: account.uiAmountString
                });
              }
            } catch (error) {
              console.error(`Error getting token info for ${mint}:`, error);
              // Add with basic info if token metadata fails
              tokenHoldings.push({
                symbol: 'Unknown',
                mint: mint,
                name: 'Unknown Token',
                decimals: account.decimals,
                balance: account.amount,
                uiAmount: account.uiAmount,
                uiAmountString: account.uiAmountString
              });
            }
          }
        }
      }
    }

    return {
      solBalance,
      solUiAmount,
      tokenHoldings,
      totalTokens: tokenHoldings.length + (solUiAmount > 0 ? 1 : 0)
    };
  } catch (error) {
    console.error('Error fetching holdings data:', error);
    throw new Error('Failed to fetch holdings data');
  }
}
