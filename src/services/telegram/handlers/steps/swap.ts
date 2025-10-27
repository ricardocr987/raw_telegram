import type { CallbackQuery } from '../../types';
import { sendText, sendTextWithButtons, editMessageWithButtons } from '../../core';
import { getUserState, setUserState, updateUserSwapState, clearUserState } from '../../state';
import { getOrCreateWallet } from '../../../privy';
import { getUltraOrder, executeUltraOrder } from '../../../jupiter/ultra';
import { signTransaction } from '../../../privy';
import type { InlineKeyboard } from '../../types';
import { createAmountSelector, tradeMenu } from '../../menu';
import { getHoldingsData } from '../../../../utils/enrichedHoldings';

/**
 * Handle swap flow based on current state
 * This is the main entry point for swap callbacks
 */
export async function handleSwapStep(callbackQuery: CallbackQuery, data: string): Promise<void> {
  const { message } = callbackQuery;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  
  console.log(`[handleSwapStep] data: ${data}`);
  const userState = await getUserState(chatId);
  
  if (!userState?.swapState) {
    // No active swap state - start new swap
    await initTradeSwap(chatId, messageId);
    return;
  }

  
  const { step } = userState.swapState;
  
  switch (step) {
    case 'select_input':
      if (data.length === 44) {
        await handleInputSelection(chatId, data);
      } else {
        await sendText(chatId, '❌ Invalid token selection');
      }
      break;
      
    case 'enter_output':
      // Handled in messages handler
      await sendText(chatId, 'Please wait or send the token symbol...');
      break;
      
    case 'select_amount':
      // User is selecting amount
      await handleAmountSelection(chatId, data);
      break;
      
    case 'completing':
      // Already completing, ignore
      break;
      
    default:
      await sendText(chatId, '❌ Invalid state');
  }
}

/**
 * Initiate swap flow - show user's available tokens
 */
export async function initTradeSwap(chatId: number, messageId?: number): Promise<void> {
  try {
    console.log(`[initTradeSwap] Starting for chat ${chatId}`);
    const wallet = await getOrCreateWallet(chatId);
    console.log(`[initTradeSwap] Got wallet: ${wallet.address}`);
    
    console.log(`[initTradeSwap] Fetching enriched holdings for ${wallet.address}`);
    const holdings = await getHoldingsData(wallet.address);
    console.log(`[initTradeSwap] Got holdings:`, JSON.stringify(holdings, null, 2));

    // Initialize swap state with messageId
    await setUserState(chatId, {
      chatId,
      swapState: {
        step: 'select_input',
        messageId,
      },
    });

    // Check if we have any tokens
    if (holdings.tokenHoldings.length === 0) {
      if (messageId) {
        await editMessageWithButtons(chatId, messageId, '❌ No tokens found in your wallet.', tradeMenu);
      } else {
        await sendText(chatId, '❌ No tokens found in your wallet.');
      }
      await clearUserState(chatId);
      return;
    }

    // Create inline keyboard with user's tokens
    const keyboardButtons = holdings.tokenHoldings.slice(0, 10).map((tokenHolding: { symbol: string; mint: string; uiAmount: number }) => {
      if (tokenHolding.uiAmount === 0) return null;
      
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
          { text: '⬅️ Back', callback_data: 'back_to_trade' },
        ],
      ],
    };

    console.log(`[initTradeSwap] Created keyboard with ${keyboardButtons.length} tokens`);

    if (messageId) {
      await editMessageWithButtons(
        chatId,
        messageId,
        '📊 Select the token you want to swap FROM:',
        keyboard
      );
    } else {
      await sendTextWithButtons(
        chatId,
        '📊 Select the token you want to swap FROM:',
        keyboard
      );
    }
  } catch (error) {
    console.error('[initTradeSwap] Error initiating swap:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (messageId) {
      await editMessageWithButtons(
        chatId,
        messageId,
        `❌ Error loading your holdings: ${errorMessage}`,
        tradeMenu
      );
    } else {
      await sendText(chatId, `❌ Error loading your holdings: ${errorMessage}`);
    }
    
    await clearUserState(chatId);
  }
}

/**
 * Handle input token selection
 */
async function handleInputSelection(chatId: number, tokenAddress: string): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.swapState) {
      await sendText(chatId, '❌ Invalid state.');
      return;
    }

    const wallet = await getOrCreateWallet(chatId);
    const holdings = await getHoldingsData(wallet.address);
    
    // Find the token holding by mint address
    const tokenHolding = holdings.tokenHoldings.find((t: { mint: string }) => t.mint === tokenAddress);
    
    if (!tokenHolding) {
      await sendText(chatId, '❌ Token data not found.');
      return;
    }

    // Update state with full token info
    await updateUserSwapState(chatId, {
      step: 'enter_output',
      inputToken: {
        mint: tokenAddress,
        symbol: tokenHolding.symbol,
        decimals: tokenHolding.decimals,
        amount: tokenHolding.uiAmount.toString(),
      },
    });

    // Edit the same message to ask for output token
    const messageId = userState.swapState.messageId;
    if (messageId) {
      await editMessageWithButtons(
        chatId,
        messageId,
        `✅ Input token: ${tokenHolding.symbol}\n\n📝 Please send the token symbol or address you want to swap TO:\n\n(Example: SOL, USDC, or token address)`,
        { inline_keyboard: [] }
      );
    } else {
      await sendText(chatId, `✅ Input token: ${tokenHolding.symbol}\n\n📝 Please send the token symbol or address you want to swap TO:\n\n(Example: SOL, USDC, or token address)`);
    }
  } catch (error) {
    console.error('Error selecting input token:', error);
    await sendText(chatId, '❌ Error processing token. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Handle amount selection by percentage or manual entry
 * Simplified callback format: swap_percent_0.25 or swap_manual
 */
async function handleAmountSelection(chatId: number, data: string): Promise<void> {
    const percentageStr = data.replace('swap_percent_', '');
    const percentage = Number(percentageStr);
    
    if (percentage > 0 && percentage <= 100) {
      await handleAmountByPercentage(chatId, percentage);
    } else {
      await sendText(chatId, '❌ Invalid percentage');
    }
}

/**
 * Handle amount selection by percentage
 */
async function handleAmountByPercentage(chatId: number, percentage: number): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.swapState?.inputToken?.amount) {
      await sendText(chatId, '❌ Invalid request. Please start a new swap.');
      await clearUserState(chatId);
      return;
    }

    const totalAmount = parseFloat(userState.swapState.inputToken.amount);
    const swapAmount = totalAmount * percentage / 100;

    await updateUserSwapState(chatId, {
      step: 'completing',
      amount: swapAmount.toString(),
    });

    // Edit the message to show processing
    const messageId = userState.swapState.messageId;
    const messageText = `✅ Swap Confirmed!\n\n` +
      `From: ${swapAmount} ${userState.swapState.inputToken.symbol}\n` +
      `To: ${userState.swapState.outputToken?.symbol || 'Unknown'}\n\n` +
      `🔄 Processing swap...`;

    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, { inline_keyboard: [] });
    } else {
      await sendText(chatId, messageText);
    }
    
    // Execute the swap
    await executeSwap(chatId, swapAmount);
  } catch (error) {
    console.error('Error in handleAmountByPercentage:', error);
    await sendText(chatId, '❌ Error processing amount selection. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Handle manual amount entry trigger
 */
async function handleManualAmountEntry(chatId: number): Promise<void> {
  const userState = await getUserState(chatId);
  if (!userState?.swapState) {
    await sendText(chatId, '❌ Invalid request. Please start a new swap.');
    return;
  }

  await updateUserSwapState(chatId, { step: 'select_amount' });
  
  // Edit the message to ask for manual amount entry
  const messageId = userState.swapState.messageId;
  if (messageId) {
    await editMessageWithButtons(
      chatId,
      messageId,
      '📝 Please enter the exact amount you want to swap:',
      { inline_keyboard: [] }
    );
  } else {
    await sendText(chatId, '📝 Please enter the exact amount you want to swap:');
  }
}

/**
 * Execute swap with manually entered amount
 */
export async function executeSwapWithAmount(chatId: number, swapAmount: number): Promise<void> {
  try {
    await updateUserSwapState(chatId, { 
      amount: swapAmount.toString(),
      step: 'completing'
    });
    
    // Get user state to show confirmation
    const userState = await getUserState(chatId);
    if (userState?.swapState) {
      const messageId = userState.swapState.messageId;
      const messageText = `✅ Swap Confirmed!\n\n` +
        `From: ${swapAmount} ${userState.swapState.inputToken?.symbol}\n` +
        `To: ${userState.swapState.outputToken?.symbol || 'Unknown'}\n\n` +
        `🔄 Processing swap...`;
      
      if (messageId) {
        await editMessageWithButtons(chatId, messageId, messageText, { inline_keyboard: [] });
      }
    }
    
    await executeSwap(chatId, swapAmount);
  } catch (error) {
    console.error('Error in executeSwapWithAmount:', error);
    await sendText(chatId, '❌ Error executing swap. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Store output token in state (called from messages handler)
 */
export async function storeOutputToken(chatId: number, tokenData: { mint: string; symbol: string; decimals: number }): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.swapState) {
      await sendText(chatId, '❌ Invalid state.');
      return;
    }

    await updateUserSwapState(chatId, {
      outputToken: tokenData,
      step: 'select_amount',
    });

    // Get messageId from state to edit the message
    const messageId = userState.swapState.messageId;
    
    // Show confirmation with amount selector
    const totalAmount = parseFloat(userState?.swapState?.inputToken?.amount || '0');
    const keyboard = createAmountSelector(chatId);
    
    const messageText = `✅ Confirmed Swap:\n\n` +
      `From: ${totalAmount} ${userState?.swapState?.inputToken?.symbol}\n` +
      `To: ${tokenData.symbol}\n\n` +
      `Please select the amount to swap or type it manually:`;

    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, keyboard);
    } else {
      await sendTextWithButtons(chatId, messageText, keyboard);
    }
  } catch (error) {
    console.error('Error storing output token:', error);
    await sendText(chatId, '❌ Error storing token. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Execute the swap transaction
 */
async function executeSwap(chatId: number, swapAmount: number): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.swapState?.inputToken || !userState.swapState.outputToken) {
      await sendText(chatId, '❌ Invalid swap state. Please start a new swap.');
      return;
    }

    const { inputToken, outputToken } = userState.swapState;
    const messageId = userState.swapState.messageId;
    
    // Get wallet
    const wallet = await getOrCreateWallet(chatId);
    if (!wallet.address || !wallet.id) {
      await sendText(chatId, '❌ Wallet not found');
      return;
    }

    // Convert UI amount to native token units
    const nativeAmount = BigInt(swapAmount * 10 ** inputToken.decimals).toString();

    console.log('Getting Ultra order:', {
      inputMint: inputToken.mint,
      outputMint: outputToken.mint,
      amount: nativeAmount,
      taker: wallet.address
    });

    // Get Ultra order
    const orderResponse = await getUltraOrder(
      inputToken.mint,
      outputToken.mint,
      nativeAmount,
      wallet.address
    );

    if (!orderResponse.transaction) {
      console.error('Ultra order response:', orderResponse);
      const errorMessage = `❌ Failed to get Ultra order: ${orderResponse.errorMessage || 'No transaction returned'}`;
      if (messageId) {
        await editMessageWithButtons(chatId, messageId, errorMessage, { inline_keyboard: [] });
      } else {
        await sendText(chatId, errorMessage);
      }
      await clearUserState(chatId);
      return;
    }

    // Sign transaction
    const signedTransaction = await signTransaction(wallet.id, orderResponse.transaction);
    if (!signedTransaction) {
      const errorMessage = '❌ Failed to sign transaction';
      if (messageId) {
        await editMessageWithButtons(chatId, messageId, errorMessage, { inline_keyboard: [] });
      } else {
        await sendText(chatId, errorMessage);
      }
      await clearUserState(chatId);
      return;
    }

    console.log('Signed transaction', orderResponse.transaction, orderResponse.requestId);

    // Execute swap
    const executeResponse = await executeUltraOrder(signedTransaction, orderResponse.requestId);

    if (executeResponse.status !== 'Success') {
      throw new Error(executeResponse.error || 'Swap execution failed');
    }

    // Calculate output amount
    const outAmount = parseFloat(orderResponse.outAmount) / (10 ** outputToken.decimals);

    // Clear swap state
    await clearUserState(chatId);

    // Send success message
    const message = 
      `✅ Swap Executed Successfully!\n\n` +
      `**From:** ${swapAmount} ${inputToken.symbol}\n` +
      `**To:** ${outAmount.toFixed(6)} ${outputToken.symbol}\n` +
      `**Transaction:** ${executeResponse.signature}\n\n` +
      `[View on Solscan](https://solscan.io/tx/${executeResponse.signature})`;

    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        [
          { text: '🔄 New Swap', callback_data: 'trade_swap' },
          { text: '🏠 Main Menu', callback_data: 'back_main' },
        ],
      ],
    };

    // Edit the message to show success if messageId exists, otherwise send new message
    if (messageId) {
      await editMessageWithButtons(chatId, messageId, message, keyboard);
    } else {
      await sendTextWithButtons(chatId, message, keyboard);
    }

  } catch (error) {
    console.error('Error executing swap:', error);
    const errorMessage = `❌ Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    const userState = await getUserState(chatId);
    const messageId = userState?.swapState?.messageId;
    
    if (messageId) {
      await editMessageWithButtons(chatId, messageId, errorMessage, { inline_keyboard: [] });
    } else {
      await sendText(chatId, errorMessage);
    }
    await clearUserState(chatId);
  }
}
