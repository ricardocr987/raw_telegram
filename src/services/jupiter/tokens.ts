import type { JupiterToken } from ".";

// Token API Types based on OpenAPI specification
export interface SwapStats {
  priceChange?: number;
  holderChange?: number;
  liquidityChange?: number;
  volumeChange?: number;
  buyVolume?: number;
  sellVolume?: number;
  buyOrganicVolume?: number;
  sellOrganicVolume?: number;
  numBuys?: number;
  numSells?: number;
  numTraders?: number;
  numOrganicBuyers?: number;
  numNetBuyers?: number;
}

export interface MintInformation {
  id: string;
  name: string;
  symbol: string;
  icon?: string;
  decimals: number;
  twitter?: string;
  telegram?: string;
  website?: string;
  dev?: string;
  circSupply?: number;
  totalSupply?: number;
  tokenProgram: string;
  launchpad?: string;
  partnerConfig?: string;
  graduatedPool?: string;
  graduatedAt?: string;
  holderCount?: number;
  fdv?: number;
  mcap?: number;
  usdPrice?: number;
  priceBlockId?: number;
  liquidity?: number;
  stats5m?: SwapStats;
  stats1h?: SwapStats;
  stats6h?: SwapStats;
  stats24h?: SwapStats;
  firstPool?: {
    id: string;
    createdAt: string;
  };
  audit?: {
    isSus?: boolean;
    mintAuthorityDisabled?: boolean;
    freezeAuthorityDisabled?: boolean;
    topHoldersPercentage?: number;
    devBalancePercentage?: number;
    devMigrations?: number;
  };
  organicScore: number;
  organicScoreLabel: 'high' | 'medium' | 'low';
  isVerified?: boolean;
  cexes?: string[];
  tags?: string[];
  updatedAt: string;
}

export type TokenSearchResult = MintInformation;

export type TrendingCategory = 'toporganicscore' | 'toptraded' | 'toptrending';
export type TrendingInterval = '5m' | '1h' | '6h' | '24h';
export type TokenTag = 'lst' | 'verified';

// API Base URLs
const TOKEN_SEARCH_BASE_URL = 'https://lite-api.jup.ag/tokens/v2';
const TOKEN_TRENDING_BASE_URL = 'https://lite-api.jup.ag/tokens/v2';
const PRICE_BASE_URL = 'https://lite-api.jup.ag/price/v3';


// Token Search Functions
export async function searchTokens(query: string): Promise<TokenSearchResult[]> {
  try {
    const params = new URLSearchParams({
      query: query.trim()
    });

    const response = await fetch(`${TOKEN_SEARCH_BASE_URL}/search?${params}`, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Token search API error: ${response.status} ${response.statusText}`);
    }

    const results = await response.json() as TokenSearchResult[];
    return results;
  } catch (error) {
    console.error('Error searching tokens:', error);
    throw error;
  }
}

export async function getTokenBySymbolOrAddress(symbolOrAddress: string): Promise<TokenSearchResult | null> {
  try {
    let result: TokenSearchResult | null = null;

    // If it's a short string (likely symbol), search by symbol
    if (symbolOrAddress.length < 10) {
      const results = await searchTokens(symbolOrAddress);
      result = results.find(token => 
        token.symbol.toLowerCase() === symbolOrAddress.toLowerCase()
      ) || null;
    } else {
      // If it's a long string (likely address), search by address
      const results = await searchTokens(symbolOrAddress);
      result = results.find(token => 
        token.id === symbolOrAddress
      ) || null;
    }

    return result;
  } catch (error) {
    console.error('Error getting token by symbol or address:', error);
    return null;
  }
}

// Trending Tokens Functions
export async function getTrendingTokens(
  category: TrendingCategory,
  interval: TrendingInterval,
  limit: number = 50
): Promise<MintInformation[]> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString()
    });

    const response = await fetch(`${TOKEN_TRENDING_BASE_URL}/${category}/${interval}?${params}`, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Trending tokens API error: ${response.status} ${response.statusText}`);
    }

    const results = await response.json() as MintInformation[];
    return results;
  } catch (error) {
    console.error('Error fetching trending tokens:', error);
    throw error;
  }
}

export async function getTopGainers(interval: TrendingInterval = '24h', limit: number = 20): Promise<MintInformation[]> {
  try {
    const tokens = await getTrendingTokens('toptrending', interval, limit);
    
    // Filter and sort by price change
    return tokens
      .filter(token => token.stats24h?.priceChange && token.stats24h.priceChange > 0)
      .sort((a, b) => (b.stats24h?.priceChange || 0) - (a.stats24h?.priceChange || 0))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching top gainers:', error);
    throw error;
  }
}

export async function getTopLosers(interval: TrendingInterval = '24h', limit: number = 20): Promise<MintInformation[]> {
  try {
    const tokens = await getTrendingTokens('toptrending', interval, limit);
    
    // Filter and sort by price change (negative values)
    return tokens
      .filter(token => token.stats24h?.priceChange && token.stats24h.priceChange < 0)
      .sort((a, b) => (a.stats24h?.priceChange || 0) - (b.stats24h?.priceChange || 0))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching top losers:', error);
    throw error;
  }
}

export async function getTopVolume(interval: TrendingInterval = '24h', limit: number = 20): Promise<MintInformation[]> {
  try {
    const tokens = await getTrendingTokens('toptraded', interval, limit);
    
    // Sort by volume
    return tokens
      .filter(token => token.stats24h?.buyVolume && token.stats24h?.sellVolume)
      .sort((a, b) => {
        const volumeA = (a.stats24h?.buyVolume || 0) + (a.stats24h?.sellVolume || 0);
        const volumeB = (b.stats24h?.buyVolume || 0) + (b.stats24h?.sellVolume || 0);
        return volumeB - volumeA;
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching top volume:', error);
    throw error;
  }
}

export async function getTopOrganicScore(interval: TrendingInterval = '24h', limit: number = 20): Promise<MintInformation[]> {
  try {
    const tokens = await getTrendingTokens('toporganicscore', interval, limit);
    
    // Sort by organic score
    return tokens
      .sort((a, b) => b.organicScore - a.organicScore)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching top organic score tokens:', error);
    throw error;
  }
}

// Tag-based token search
export async function getTokensByTag(tag: TokenTag): Promise<MintInformation[]> {
  try {
    const params = new URLSearchParams({
      query: tag
    });

    const response = await fetch(`${TOKEN_SEARCH_BASE_URL}/tag?${params}`, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Token tag API error: ${response.status} ${response.statusText}`);
    }

    const results = await response.json() as MintInformation[];
    return results;
  } catch (error) {
    console.error('Error fetching tokens by tag:', error);
    throw error;
  }
}

// Recent tokens (first pool created)
export async function getRecentTokens(): Promise<MintInformation[]> {
  try {
    const response = await fetch(`${TOKEN_SEARCH_BASE_URL}/recent`, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Recent tokens API error: ${response.status} ${response.statusText}`);
    }

    const results = await response.json() as MintInformation[];
    return results;
  } catch (error) {
    console.error('Error fetching recent tokens:', error);
    throw error;
  }
}

// Price API Types
export interface TokenPrice {
  decimals: number;
  usdPrice: number;
  priceChange24h?: number;
  blockId?: number;
}

export interface TokenPricesResponse {
  [mintAddress: string]: TokenPrice;
}

// Price API Functions
export async function getTokenPrices(mintAddresses: string[]): Promise<TokenPricesResponse> {
  try {
    const params = new URLSearchParams({
      ids: mintAddresses.join(',')
    });

    const response = await fetch(`${PRICE_BASE_URL}?${params}`, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Token prices API error: ${response.status} ${response.statusText}`);
    }

    const prices = await response.json() as TokenPricesResponse;
    return prices;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    throw error;
  }
}

export async function getTokenPrice(mintAddress: string): Promise<TokenPrice | null> {
  try {
    const prices = await getTokenPrices([mintAddress]);
    return prices[mintAddress] || null;
  } catch (error) {
    console.error('Error fetching single token price:', error);
    return null;
  }
}
