export interface JupiterToken {
    address: string;
    chainId: number;
    decimals: number;
    name: string;
    symbol: string;
    logoURI?: string;
    tags?: string[];
    extensions?: {
      coingeckoId?: string;
    };
}

// Export Ultra API
export * from './ultra';

// Export Trigger API
export * from './trigger';

// Export Recurring API
export * from './recurring';

// Export Swap API
export * from './swap';

// Export Token API
export * from './tokens';

// Export Lend API
export * from './lend';

// Export Integration Service - REMOVED (integration.ts was deleted)

// Mappers removed - now using direct Jupiter API response mapping
