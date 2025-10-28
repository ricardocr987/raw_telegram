import type { CallbackQuery } from '../../types';
import { sendText, sendTextWithButtons, editMessageWithButtons } from '../../core';
import { getUserState, setUserState, updateUserSwapState, clearUserState } from '../../state';
import { getOrCreateWallet } from '../../../privy';
import { getUltraOrder, executeUltraOrder } from '../../../jupiter/ultra';
import { signTransaction } from '../../../privy';
import type { InlineKeyboard } from '../../types';
import { percentageAmountMenu, successMenu, tradeMenu } from '../../menu';
import { getHoldingsData } from '../../../../utils/enrichedHoldings';
import { showWalletTokenSelection, handleTokenSelection, type TokenHolding } from '../shared/tokenSelection';

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
  console.log(`[handleSwapStep] step: ${step}`);
  switch (step) {
    case 'select_input':
      await handleSwapInputSelection(chatId, data);
      break;
      
    case 'select_amount':
      // User is selecting amount
      await handleAmountSelection(chatId, data);
      break;
      
    default:
      clearUserState(chatId);
      await sendText(chatId, '❌ Invalid state');
  }
}

/**
 * Initiate swap flow - show user's available tokens
 */
export async function initTradeSwap(chatId: number, messageId?: number): Promise<void> {
  try {
    console.log(`[initTradeSwap] Starting for chat ${chatId}`);

    // Initialize swap state with messageId
    await setUserState(chatId, {
      chatId,
      swapState: {
        step: 'select_input',
        messageId,
      },
    });

    await showWalletTokenSelection({
      chatId,
      messageId,
      title: '📊 Select the token you want to swap FROM:',
      backCallbackData: 'back_to_trade',
      onTokenSelected: handleSwapInputSelection,
      onError: async (chatId, error) => {
        await sendText(chatId, `❌ Error loading holdings: ${error}`);
      }
    });
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
async function handleSwapInputSelection(chatId: number, tokenAddress: string): Promise<void> {
  await handleTokenSelection(chatId, tokenAddress, async (chatId, tokenHolding) => {
    const userState = await getUserState(chatId);
    if (!userState?.swapState) {
      await sendText(chatId, '❌ Invalid state.');
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
  });
}

/**
 * Handle amount selection by percentage
 * Callback format: swap_percent_25, swap_percent_50, swap_percent_75, swap_percent_100
 */
async function handleAmountSelection(chatId: number, data: string): Promise<void> {
  // Validate callback format
  if (!data.startsWith('swap_percent_')) {
    await sendText(chatId, '❌ Invalid request');
    return;
  }

  // Extract and validate percentage
  const percentageStr = data.replace('swap_percent_', '');
  const percentage = Number(percentageStr);
  
  if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
    await sendText(chatId, '❌ Invalid percentage');
    return;
  }

  // Handle the swap
  await handleAmountByPercentage(chatId, percentage);
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
    const { decimals } = userState.swapState.inputToken;
    
    // Calculate native amount - only round down if NOT 100%
    const amountToConvert = swapAmount * 10 ** decimals;
    const nativeAmount = (percentage === 100 ? amountToConvert : Math.floor(amountToConvert)).toString();

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
    await executeSwap(chatId, swapAmount, nativeAmount);
  } catch (error) {
    console.error('Error in handleAmountByPercentage:', error);
    await sendText(chatId, '❌ Error processing amount selection. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Execute swap with manually entered amount
 */
export async function executeSwapWithAmount(chatId: number, swapAmount: number): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.swapState?.inputToken) {
      await sendText(chatId, '❌ Invalid swap state');
      await clearUserState(chatId);
      return;
    }

    // Calculate native amount - always round down for manual entry
    const { decimals } = userState.swapState.inputToken;
    const amountToConvert = swapAmount * 10 ** decimals;
    const nativeAmount = Math.floor(amountToConvert).toString();

    const messageId = userState.swapState.messageId;
    const messageText = `✅ Swap Confirmed!\n\n` +
      `From: ${swapAmount} ${userState.swapState.inputToken.symbol}\n` +
      `To: ${userState.swapState.outputToken?.symbol || 'Unknown'}\n\n` +
      `🔄 Processing swap...`;
    
    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, { inline_keyboard: [] });
    }
    
    // Execute the swap
    await executeSwap(chatId, swapAmount, nativeAmount);
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

    const messageText = `✅ Confirmed Swap:\n\n` +
      `From: ${totalAmount} ${userState?.swapState?.inputToken?.symbol}\n` +
      `To: ${tokenData.symbol}\n\n` +
      `Please select the amount to swap or type it manually:`;

    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, percentageAmountMenu);
    } else {
      await sendTextWithButtons(chatId, messageText, percentageAmountMenu);
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
async function executeSwap(chatId: number, swapAmount: number, nativeAmount: string): Promise<void> {
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

    console.log('swapAmount', swapAmount, 'nativeAmount', nativeAmount);
    console.log('Converting nativeAmount to BigInt...', nativeAmount);

    const nativeAmountBigInt = BigInt(nativeAmount).toString();

    console.log('Getting Ultra order:', {
      inputMint: inputToken.mint,
      outputMint: outputToken.mint,
      amount: nativeAmountBigInt,
      taker: wallet.address
    });

    // Get Ultra order
    const orderResponse = await getUltraOrder(
      inputToken.mint,
      outputToken.mint,
      nativeAmountBigInt,
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

    // Edit the message to show success if messageId exists, otherwise send new message
    if (messageId) {
      await editMessageWithButtons(chatId, messageId, message, successMenu);
    } else {
      await sendTextWithButtons(chatId, message, successMenu);
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
