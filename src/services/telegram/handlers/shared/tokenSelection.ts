import { getOrCreateWallet } from '../../../privy';
import { getHoldingsData } from '../../../../utils/enrichedHoldings';
import { sendText, sendTextWithButtons, editMessageWithButtons } from '../../core';
import { clearUserState } from '../../state';
import type { InlineKeyboard } from '../../types';

export interface TokenHolding {
  symbol: string;
  mint: string;
  uiAmount: number;
  decimals: number;
}

export interface TokenSelectionOptions {
  chatId: number;
  messageId?: number;
  title: string;
  backCallbackData: string;
  onTokenSelected: (chatId: number, tokenAddress: string) => Promise<void>;
  onError?: (chatId: number, error: string) => Promise<void>;
}

/**
 * Show wallet holdings for token selection
 * This is used by swap, limit order (both buy and sell), and withdraw flows
 */
export async function showWalletTokenSelection(options: TokenSelectionOptions): Promise<void> {
  const { chatId, messageId, title, backCallbackData, onTokenSelected, onError } = options;
  
  try {
    console.log(`[showWalletTokenSelection] Starting for chat ${chatId}`);
    const wallet = await getOrCreateWallet(chatId);
    console.log(`[showWalletTokenSelection] Got wallet: ${wallet.address}`);
    
    console.log(`[showWalletTokenSelection] Fetching enriched holdings for ${wallet.address}`);
    const holdings = await getHoldingsData(wallet.address);
    console.log(`[showWalletTokenSelection] Got holdings:`, JSON.stringify(holdings, null, 2));

    // Prepare all tokens including SOL
    const allTokens: TokenHolding[] = [];
    
    // Add SOL first if balance > 0 (SOL native mint address)
    if (holdings.solUiAmount > 0) {
      allTokens.push({
        symbol: 'SOL',
        mint: 'So11111111111111111111111111111111111111112', // SOL native mint
        uiAmount: holdings.solUiAmount,
        decimals: 9
      });
    }
    
    // Add other tokens
    holdings.tokenHoldings.forEach(tokenHolding => {
      if (tokenHolding.uiAmount > 0) {
        allTokens.push(tokenHolding);
      }
    });

    if (allTokens.length === 0) {
      const errorMessage = '❌ No tokens found in your wallet.';
      if (messageId) {
        await editMessageWithButtons(chatId, messageId, errorMessage, { 
          inline_keyboard: [[{ text: '⬅️ Back', callback_data: backCallbackData }]] 
        });
      } else {
        await sendText(chatId, errorMessage);
      }
      await clearUserState(chatId);
      return;
    }

    // Create inline keyboard with user's tokens
    const keyboardButtons = allTokens.slice(0, 10).map((tokenHolding: TokenHolding) => {
      const amount = tokenHolding.uiAmount.toFixed(4);
      
      return [
        {
          text: `${tokenHolding.symbol} - ${amount}`,
          callback_data: tokenHolding.mint,
        },
      ];
    }).filter(Boolean) as InlineKeyboard['inline_keyboard'];

    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        ...keyboardButtons,
        [
          { text: '⬅️ Back', callback_data: backCallbackData },
        ],
      ],
    };

    console.log(`[showWalletTokenSelection] Created keyboard with ${keyboardButtons.length} tokens`);

    if (messageId) {
      await editMessageWithButtons(chatId, messageId, title, keyboard);
    } else {
      await sendTextWithButtons(chatId, title, keyboard);
    }
  } catch (error) {
    console.error('[showWalletTokenSelection] Error showing token selection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (onError) {
      await onError(chatId, errorMessage);
    } else {
      if (messageId) {
        await editMessageWithButtons(
          chatId,
          messageId,
          `❌ Error loading your holdings: ${errorMessage}`,
          { inline_keyboard: [[{ text: '⬅️ Back', callback_data: backCallbackData }]] }
        );
      } else {
        await sendText(chatId, `❌ Error loading your holdings: ${errorMessage}`);
      }
    }
    
    await clearUserState(chatId);
  }
}

/**
 * Handle token selection from wallet holdings
 * This extracts the common logic for processing selected tokens
 */
export async function handleTokenSelection(
  chatId: number,
  tokenAddress: string,
  onTokenProcessed: (chatId: number, tokenHolding: TokenHolding) => Promise<void>
): Promise<void> {
  try {
    const wallet = await getOrCreateWallet(chatId);
    const holdings = await getHoldingsData(wallet.address);
    
    // Check if it's SOL (native mint)
    const isSOL = tokenAddress === 'So11111111111111111111111111111111111111112';
    
    let tokenHolding: TokenHolding;
    
    if (isSOL) {
      // Handle SOL
      tokenHolding = {
        symbol: 'SOL',
        mint: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        uiAmount: holdings.solUiAmount,
      };
    } else {
      // Find the token holding by mint address
      const foundToken = holdings.tokenHoldings.find((t: { mint: string }) => t.mint === tokenAddress);
      console.log(`[handleTokenSelection] foundToken: ${JSON.stringify(foundToken, null, 2)}`);
      if (!foundToken) {
        await sendText(chatId, '❌ Token data not found.');
        return;
      }
      
      tokenHolding = {
        symbol: foundToken.symbol,
        mint: foundToken.mint,
        decimals: foundToken.decimals,
        uiAmount: foundToken.uiAmount,
      };
    }

    // Call the specific handler for the token
    await onTokenProcessed(chatId, tokenHolding);
  } catch (error) {
    console.error('Error selecting token:', error);
    await sendText(chatId, '❌ Error processing token. Please try again.');
    await clearUserState(chatId);
  }
}
