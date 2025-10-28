import type { TelegramMessage } from '../types';
import { sendText, sendTextWithButtons } from '../core';
import { getUserState, clearUserState } from '../state';
import { mainMenu } from '../menu';
import { getOrCreateWallet } from '../../privy';
import { getTokenBySymbolOrAddress } from '../../jupiter/tokens';
import { storeOutputToken, executeSwapWithAmount } from './steps/swap';
import { storeRecipientAddress, executeWithdrawWithAmount } from './steps/withdraw';
import { storeLimitOrderOutputToken, storeLimitOrderInputToken, storeLimitOrderPrice, executeLimitOrderWithAmount } from './steps/limitOrder';

/**
 * Handle start command
 */
export async function handleStart(chatId: number): Promise<void> {
  try {
    const wallet = await getOrCreateWallet(chatId);
    const walletAddress = wallet.address;
    const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    
    const welcomeText = `🎉 Welcome to Telegram Bot!\n\n💼 Wallet: \`${shortAddress}\``;
    
    await sendTextWithButtons(chatId, welcomeText, mainMenu);
  } catch (error) {
    console.error('Error in /start command:', error);
    await sendText(chatId, '❌ Error creating wallet. Please try again.');
  }
}

/**
 * Handle menu command
 */
export async function handleMenu(chatId: number): Promise<void> {
  await sendTextWithButtons(chatId, '🏠 Main Menu', mainMenu);
}

/**
 * Handle text messages during swap flow
 */
export async function handleSwapText(chatId: number, text: string, step: string): Promise<boolean> {
  const userState = await getUserState(chatId);
  
  if (step === 'enter_output') {
    // User is entering output token
    try {
      const token = await getTokenBySymbolOrAddress(text.trim());
      if (!token) {
        await sendText(chatId, '❌ Token not found. Please try again with a valid symbol or address.');
        return true;
      }

      // Store output token (this will also edit the message with amount selector)
      await storeOutputToken(chatId, {
        mint: token.id,
        symbol: token.symbol,
        decimals: token.decimals,
      });
      
      return true;
    } catch (error) {
      console.error('Error in swap output token:', error);
      await sendText(chatId, '❌ Error processing token. Please try again.');
      await clearUserState(chatId);
      return true;
    }
  }

  if (step === 'select_amount') {
    // User is typing amount directly instead of using buttons
    const amount = parseFloat(text.trim());
    if (isNaN(amount) || amount <= 0) {
      await sendText(chatId, '❌ Invalid amount. Please enter a valid number.');
      await clearUserState(chatId);
      return true;
    }

    const totalAmount = parseFloat(userState?.swapState?.inputToken?.amount || '0');
    if (amount > totalAmount) {
      await sendText(chatId, `❌ Amount exceeds available balance (${totalAmount}). Please enter a valid amount.`);
      await clearUserState(chatId);
      return true;
    }

    // Execute the swap
    await executeSwapWithAmount(chatId, amount);
    return true;
  }

  return false;
}

/**
 * Handle text messages during limit order flow
 */
export async function handleLimitOrderText(chatId: number, text: string, step: string): Promise<boolean> {
  const userState = await getUserState(chatId);
  
  if (step === 'select_input') {
    // User is entering input token (for buying)
    if (userState?.limitOrderState?.direction === 'buy') {
      try {
        const token = await getTokenBySymbolOrAddress(text.trim());
        if (!token) {
          await sendText(chatId, '❌ Token not found. Please try again with a valid symbol or address.');
          return true;
        }

        await storeLimitOrderInputToken(chatId, {
          mint: token.id,
          symbol: token.symbol,
          decimals: token.decimals,
        });
        
        return true;
      } catch (error) {
        console.error('Error in limit order input token:', error);
        await sendText(chatId, '❌ Error processing token. Please try again.');
        await clearUserState(chatId);
        return true;
      }
    }
  }

  if (step === 'enter_output') {
    // User is entering output token
    try {
      const token = await getTokenBySymbolOrAddress(text.trim());
      if (!token) {
        await sendText(chatId, '❌ Token not found. Please try again with a valid symbol or address.');
        return true;
      }

      await storeLimitOrderOutputToken(chatId, {
        mint: token.id,
        symbol: token.symbol,
        decimals: token.decimals,
      });
      
      return true;
    } catch (error) {
      console.error('Error in limit order output token:', error);
      await sendText(chatId, '❌ Error processing token. Please try again.');
      await clearUserState(chatId);
      return true;
    }
  }

  if (step === 'enter_price') {
    // User is entering price
    const price = parseFloat(text.trim());
    if (isNaN(price) || price <= 0) {
      await sendText(chatId, '❌ Invalid price. Please enter a valid number.');
      return true;
    }

    await storeLimitOrderPrice(chatId, text.trim());
    return true;
  }

  if (step === 'enter_amount') {
    // User is entering amount
    const amount = parseFloat(text.trim());
    if (isNaN(amount) || amount <= 0) {
      await sendText(chatId, '❌ Invalid amount. Please enter a valid number.');
      await clearUserState(chatId);
      return true;
    }

    await executeLimitOrderWithAmount(chatId, text.trim());
    return true;
  }

  return false;
}

/**
 * Handle text messages during DCA flow
 */
export async function handleDcaText(chatId: number, text: string, step: string): Promise<boolean> {
  // TODO: Implement DCA text handling
  return false;
}

/**
 * Handle text messages during withdraw flow
 */
export async function handleWithdrawText(chatId: number, text: string, step: string): Promise<boolean> {
  const userState = await getUserState(chatId);
  
  if (step === 'enter_address') {
    // User is entering recipient address
    await storeRecipientAddress(chatId, text.trim());
    return true;
  }

  if (step === 'select_amount') {
    // User is typing amount directly instead of using buttons
    const amount = parseFloat(text.trim());
    if (isNaN(amount) || amount <= 0) {
      await sendText(chatId, '❌ Invalid amount. Please enter a valid number.');
      await clearUserState(chatId);
      return true;
    }

    const totalAmount = parseFloat(userState?.withdrawState?.token?.amount || '0');
    if (amount > totalAmount) {
      await sendText(chatId, `❌ Amount exceeds available balance (${totalAmount}). Please enter a valid amount.`);
      await clearUserState(chatId);
      return true;
    }

    // Execute the withdrawal
    await executeWithdrawWithAmount(chatId, amount);
    return true;
  }

  return false;
}

/**
 * Main message handler - routes to appropriate handler
 */
export async function handleMessage(message: TelegramMessage): Promise<void> {
  const { chat, text } = message;
  const chatId = chat.id;
  const name = chat.first_name || 'User';

  console.log(`Message from ${name} (${chatId}): ${text}`);

  if (!text) {
    return;
  }

  // Handle commands
  switch (text) {
    case '/start':
      await handleStart(chatId);
      return;
    case '/menu':
      await handleMenu(chatId);
      return;
    default:
      // Check for active flows
      const userState = await getUserState(chatId);
      if (!userState) return;
      
      // Switch on active flow type
      switch (true) {
        case !!userState.swapState:
          await handleSwapText(chatId, text, userState.swapState.step);
          return;
        case !!userState.limitOrderState:
          await handleLimitOrderText(chatId, text, userState.limitOrderState.step);
          return;
        case !!userState.dcaState:
          await handleDcaText(chatId, text, userState.dcaState.step);
          return;
        case !!userState.withdrawState:
          await handleWithdrawText(chatId, text, userState.withdrawState.step);
          return;
      }
      break;
  }
}

