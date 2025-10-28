import { getTokenPrice } from '../../../jupiter/tokens';

export interface ParsedPrice {
  type: 'absolute' | 'percentage';
  value: number;
  triggerPrice?: number; // Calculated trigger price for percentage changes
}

/**
 * Parse price input from user
 * Supports:
 * - Absolute prices: $150.50, 150.50, 150
 * - Percentage changes: +5%, -5%, 5%, -10%
 */
export async function parsePriceInput(
  input: string, 
  tokenMint: string, 
  direction: 'buy' | 'sell'
): Promise<ParsedPrice | null> {
  try {
    const trimmed = input.trim().toLowerCase();
    
    // Check if it's a percentage change
    const percentageMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)%$/);
    if (percentageMatch && percentageMatch[1]) {
      const percentage = parseFloat(percentageMatch[1]);
      
      // Get current token price
      const currentPriceData = await getTokenPrice(tokenMint);
      if (!currentPriceData?.usdPrice) {
        throw new Error('Could not fetch current token price');
      }
      
      const currentPrice = currentPriceData.usdPrice;
      
      // Calculate trigger price based on direction and percentage
      let triggerPrice: number;
      if (direction === 'buy') {
        // For buy orders: trigger when price drops by the percentage
        // +5% means buy when price is 5% higher than current (price goes up)
        // -5% means buy when price is 5% lower than current (price goes down)
        triggerPrice = currentPrice * (1 + percentage / 100);
      } else {
        // For sell orders: trigger when price rises by the percentage
        // +5% means sell when price is 5% higher than current (price goes up)
        // -5% means sell when price is 5% lower than current (price goes down)
        triggerPrice = currentPrice * (1 + percentage / 100);
      }
      
      return {
        type: 'percentage',
        value: percentage,
        triggerPrice: triggerPrice
      };
    }
    
    // Check if it's an absolute price
    const priceMatch = trimmed.match(/^\$?(\d+(?:\.\d+)?)$/);
    if (priceMatch && priceMatch[1]) {
      const price = parseFloat(priceMatch[1]);
      
      if (price <= 0) {
        throw new Error('Price must be greater than 0');
      }
      
      return {
        type: 'absolute',
        value: price,
        triggerPrice: price
      };
    }
    
    // No valid format found
    return null;
    
  } catch (error) {
    console.error('Error parsing price input:', error);
    throw error;
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(6)}`;
  }
}

/**
 * Format percentage for display
 */
export function formatPercentage(percentage: number): string {
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
}
