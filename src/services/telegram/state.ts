import { redis } from 'bun';

// Simple Redis state store for user sessions
export interface TokenInfo {
  mint: string;
  symbol: string;
  decimals: number;
  amount?: string; // UI amount
}

export interface UserState {
  chatId: number;
  swapState?: {
    step: 'select_input' | 'enter_output' | 'select_amount';
    messageId?: number; // Store messageId to edit the same message throughout flow
    inputToken?: TokenInfo;
    outputToken?: TokenInfo;
    amount?: string; // UI amount to swap
  };
  limitOrderState?: {
    step: 'select_direction' | 'select_input' | 'enter_output' | 'enter_price' | 'enter_amount' | 'confirm';
    messageId?: number;
    direction?: 'buy' | 'sell';
    inputToken?: TokenInfo;
    outputToken?: TokenInfo;
    price?: string;
    triggerPrice?: number; // Calculated trigger price (for UI display)
    amount?: string;
    currentPrice?: number; // Current price for reference
  };
  dcaState?: {
    step: string;
    // TODO: Add DCA fields
  };
  withdrawState?: {
    step: 'enter_address' | 'select_token' | 'select_amount';
    messageId?: number;
    recipientAddress?: string;
    token?: TokenInfo;
  };
}

const STATE_TTL = 3600; // 1 hour in seconds

/**
 * Get user state from Redis
 */
export async function getUserState(chatId: number): Promise<UserState | undefined> {
  try {
    const data = await redis.get(`user:${chatId}`);
    if (!data) return undefined;
    return JSON.parse(data) as UserState;
  } catch (error) {
    console.error('Error getting user state from Redis:', error);
    return undefined;
  }
}

/**
 * Set user state in Redis
 */
export async function setUserState(chatId: number, state: UserState): Promise<void> {
  try {
    await redis.set(`user:${chatId}`, JSON.stringify(state));
    await redis.expire(`user:${chatId}`, STATE_TTL);
  } catch (error) {
    console.error('Error setting user state in Redis:', error);
    throw error;
  }
}

/**
 * Clear user state from Redis
 */
export async function clearUserState(chatId: number): Promise<void> {
  try {
    await redis.del(`user:${chatId}`);
  } catch (error) {
    console.error('Error clearing user state from Redis:', error);
  }
}

/**
 * Update user swap state
 */
export async function updateUserSwapState(
  chatId: number,
  updates: Partial<NonNullable<UserState['swapState']>>
): Promise<void> {
  try {
    const currentState = await getUserState(chatId);
    if (currentState) {
      if (!currentState.swapState) {
        currentState.swapState = { step: 'select_input' };
      }
      Object.assign(currentState.swapState, updates);
      await setUserState(chatId, currentState);
    }
  } catch (error) {
    console.error('Error updating user swap state in Redis:', error);
  }
}

/**
 * Update user withdraw state
 */
export async function updateUserWithdrawState(
  chatId: number,
  updates: Partial<NonNullable<UserState['withdrawState']>>
): Promise<void> {
  try {
    const currentState = await getUserState(chatId);
    if (currentState) {
      if (!currentState.withdrawState) {
        currentState.withdrawState = { step: 'enter_address' };
      }
      Object.assign(currentState.withdrawState, updates);
      await setUserState(chatId, currentState);
    }
  } catch (error) {
    console.error('Error updating user withdraw state in Redis:', error);
  }
}

/**
 * Update user limit order state
 */
export async function updateUserLimitOrderState(
  chatId: number,
  updates: Partial<NonNullable<UserState['limitOrderState']>>
): Promise<void> {
  try {
    const currentState = await getUserState(chatId);
    if (currentState) {
      if (!currentState.limitOrderState) {
        currentState.limitOrderState = { step: 'select_direction' };
      }
      Object.assign(currentState.limitOrderState, updates);
      await setUserState(chatId, currentState);
    }
  } catch (error) {
    console.error('Error updating user limit order state in Redis:', error);
  }
}

