import type { CallbackQuery } from '../../types';
import { sendText, sendTextWithButtons, editMessageWithButtons } from '../../core';
import { getUserState, setUserState, updateUserLimitOrderState, clearUserState } from '../../state';
import { getOrCreateWallet, signTransaction } from '../../../privy';
import { createTriggerOrder, executeTriggerOrder } from '../../../jupiter/trigger';
import type { InlineKeyboard } from '../../types';
import { buyOrSellMenu, successMenu, tradeMenu, confirmOrderMenu } from '../../menu';
import { getHoldingsData } from '../../../../utils/enrichedHoldings';
import { getTokenPrice } from '../../../jupiter/tokens';
import { showWalletTokenSelection, handleTokenSelection, type TokenHolding } from '../shared/tokenSelection';
import { parsePriceInput, formatPrice, formatPercentage } from '../shared/priceParser';

/**
 * Handle limit order flow based on current state
 * This is the main entry point for limit order callbacks
 */
export async function handleLimitOrderStep(callbackQuery: CallbackQuery, data: string): Promise<void> {
  const { message } = callbackQuery;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  
  console.log(`[handleLimitOrderStep] data: ${data}`);
  const userState = await getUserState(chatId);
  
  if (!userState?.limitOrderState) {
    // No active limit order state - start new limit order
    await initLimitOrder(chatId, messageId);
    return;
  }

  const { step } = userState.limitOrderState;
  console.log(`[handleLimitOrderStep] step: ${step}`);
  switch (step) {
    case 'select_direction':
      await handleDirectionSelection(chatId, data);
      break;
      
    case 'select_input':
      // User is selecting input token
      await handleLimitOrderInputSelection(chatId, data);
      break;
      
    default:
      clearUserState(chatId);
      await sendText(chatId, '❌ Invalid state');
  }
}

/**
 * Initiate limit order flow - ask buy or sell
 */
export async function initLimitOrder(chatId: number, messageId?: number): Promise<void> {
  try {
    console.log(`[initLimitOrder] Starting for chat ${chatId}`);

    // Initialize limit order state with messageId
    await setUserState(chatId, {
      chatId,
      limitOrderState: {
        step: 'select_direction',
        messageId,
      },
    });

    const messageText = '📈 Create a Limit Order\n\nSelect your order type:';

    if (messageId) {
      await editMessageWithButtons(
        chatId,
        messageId,
        messageText,
        buyOrSellMenu
      );
    } else {
      await sendTextWithButtons(
        chatId,
        messageText,
        buyOrSellMenu
      );
    }
  } catch (error) {
    console.error('[initLimitOrder] Error initiating limit order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (messageId) {
      await editMessageWithButtons(
        chatId,
        messageId,
        `❌ Error starting limit order: ${errorMessage}`,
        tradeMenu
      );
    } else {
      await sendText(chatId, `❌ Error starting limit order: ${errorMessage}`);
    }
    
    await clearUserState(chatId);
  }
}

/**
 * Handle buy or sell selection
 */
async function handleDirectionSelection(chatId: number, data: string): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.limitOrderState) {
      await sendText(chatId, '❌ Invalid state.');
      return;
    }

    const direction = data.includes('buy') ? 'buy' : 'sell';
    await updateUserLimitOrderState(chatId, {
      direction,
      step: 'select_input',
    });

    // Edit the same message to ask for input token
    const messageId = userState.limitOrderState.messageId;
    
    // For both buy and sell, show wallet holdings
    const messageText = `✅ Order Type: ${direction.toUpperCase()}\n\n📊 Select the token you want to use to make the ${direction} order:`;

    await showWalletTokenSelection({
      chatId,
      messageId,
      title: messageText,
      backCallbackData: 'back_to_trade',
      onTokenSelected: handleLimitOrderInputSelection,
      onError: async (chatId, error) => {
        await sendText(chatId, `❌ Error loading holdings: ${error}`);
      }
    });
  } catch (error) {
    console.error('Error selecting direction:', error);
    await sendText(chatId, '❌ Error processing selection. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Handle input token selection (for both buy and sell)
 */
async function handleLimitOrderInputSelection(chatId: number, tokenAddress: string): Promise<void> {
  await handleTokenSelection(chatId, tokenAddress, async (chatId, tokenHolding) => {
    const userState = await getUserState(chatId);
    if (!userState?.limitOrderState) {
      await sendText(chatId, '❌ Invalid state.');
      return;
    }

    // Update state with full token info
    await updateUserLimitOrderState(chatId, {
      inputToken: {
        mint: tokenAddress,
        symbol: tokenHolding.symbol,
        decimals: tokenHolding.decimals,
        amount: tokenHolding.uiAmount.toString(),
      },
      step: 'enter_output',
    });

    // Edit the same message to ask for output token
    const messageId = userState.limitOrderState.messageId;
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
 * Store output token in state (called from messages handler)
 */
export async function storeLimitOrderOutputToken(chatId: number, tokenData: { mint: string; symbol: string; decimals: number }): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.limitOrderState) {
      await sendText(chatId, '❌ Invalid state.');
      return;
    }

    await updateUserLimitOrderState(chatId, {
      outputToken: tokenData,
      step: 'enter_price',
    });

    const messageId = userState.limitOrderState.messageId;
    
    const messageText = `✅ Output Token: ${tokenData.symbol}\n\n💰 Enter the trigger price of your limit ${userState.limitOrderState.direction} order. Valid options are % change (e.g. -5% or 5%) or a specific price (e.g. $150.50):`;

    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, { inline_keyboard: [] });
    } else {
      await sendText(chatId, messageText);
    }
  } catch (error) {
    console.error('Error storing output token:', error);
    await sendText(chatId, '❌ Error storing token. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Store price and ask for amount
 */
export async function storeLimitOrderPrice(chatId: number, priceInput: string): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.limitOrderState) {
      await sendText(chatId, '❌ Invalid state.');
      return;
    }

    const { direction, outputToken } = userState.limitOrderState;
    if (!outputToken) {
      await sendText(chatId, '❌ Output token not found.');
      return;
    }

    // Parse the price input
    const parsedPrice = await parsePriceInput(priceInput, outputToken.mint, direction!);
    
    if (!parsedPrice) {
      await sendText(chatId, '❌ Invalid price format. Please use:\n• Absolute price: $150.50 or 150.50\n• Percentage change: +5%, -5%, or 5%');
      return;
    }

    // Server-side protection: block >5% above market for buys, >5% below market for sells
    try {
      const current = await getTokenPrice(outputToken.mint);
      const market = current?.usdPrice;
      if (typeof market === 'number' && parsedPrice.triggerPrice) {
        const upper = market * 1.05;
        const lower = market * 0.95;
        if ((direction === 'buy' && parsedPrice.triggerPrice > upper) || (direction === 'sell' && parsedPrice.triggerPrice < lower)) {
          const warning = direction === 'buy'
            ? `❌ Price too high. Trigger (${formatPrice(parsedPrice.triggerPrice)}) is > 5% above market (${formatPrice(market)}).`
            : `❌ Price too low. Trigger (${formatPrice(parsedPrice.triggerPrice)}) is > 5% below market (${formatPrice(market)}).`;
          await sendText(chatId, `${warning}\nPlease choose a trigger within ±5% of market to proceed.`);
          return;
        }
      }
    } catch (err) {
      // If price fetch fails, continue but we already validated format
      console.warn('[storeLimitOrderPrice] Could not fetch market price for validation', err);
    }

    // Store the parsed price data
    await updateUserLimitOrderState(chatId, {
      price: priceInput, // Store original input
      triggerPrice: parsedPrice.triggerPrice,
      step: 'enter_amount',
    });

    const messageId = userState.limitOrderState.messageId;
    const inputSymbol = userState.limitOrderState.inputToken?.symbol || 'tokens';
    
    // Create confirmation message
    let priceDisplay: string;
    if (parsedPrice.type === 'percentage') {
      priceDisplay = `${formatPercentage(parsedPrice.value)} (${formatPrice(parsedPrice.triggerPrice!)})`;
    } else {
      priceDisplay = formatPrice(parsedPrice.value);
    }
    
    const messageText = `✅ Trigger Price: ${priceDisplay}\n\n📊 Enter the amount of ${inputSymbol} to ${direction === 'buy' ? 'buy with' : 'sell'}:`;

    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, { inline_keyboard: [] });
    } else {
      await sendText(chatId, messageText);
    }
  } catch (error) {
    console.error('Error storing price:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await sendText(chatId, `❌ Error processing price: ${errorMessage}`);
    await clearUserState(chatId);
  }
}

/**
 * Store input token (for buying)
 */
export async function storeLimitOrderInputToken(chatId: number, tokenData: { mint: string; symbol: string; decimals: number }): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.limitOrderState) {
      await sendText(chatId, '❌ Invalid state.');
      return;
    }

    await updateUserLimitOrderState(chatId, {
      inputToken: tokenData,
      step: 'enter_output',
    });

    const messageId = userState.limitOrderState.messageId;
    const messageText = `✅ Input Token: ${tokenData.symbol}\n\n📝 Please send the token symbol or address you want to BUY:\n\n(Example: SOL, USDC, or token address)`;

    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, { inline_keyboard: [] });
    } else {
      await sendText(chatId, messageText);
    }
  } catch (error) {
    console.error('Error storing input token:', error);
    await sendText(chatId, '❌ Error storing token. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Execute limit order with amount
 */
export async function executeLimitOrderWithAmount(chatId: number, amount: string): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.limitOrderState?.inputToken || !userState.limitOrderState.outputToken || !userState.limitOrderState.triggerPrice) {
      await sendText(chatId, '❌ Invalid limit order state');
      await clearUserState(chatId);
      return;
    }

    const messageId = userState.limitOrderState.messageId;
    const priceDisplay = userState.limitOrderState.price || 'Unknown';
    const messageText = `✅ Creating Limit Order...\n\nType: ${userState.limitOrderState.direction?.toUpperCase()}\nAmount: ${amount} ${userState.limitOrderState.inputToken.symbol}\nTrigger Price: ${priceDisplay}`;
    
    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, { inline_keyboard: [] });
    }
    
    // Execute the limit order
    await executeLimitOrder(chatId, amount);
  } catch (error) {
    console.error('Error in executeLimitOrderWithAmount:', error);
    await sendText(chatId, '❌ Error creating limit order. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Execute the limit order
 */
async function executeLimitOrder(chatId: number, amount: string): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.limitOrderState?.inputToken || !userState.limitOrderState.outputToken || !userState.limitOrderState.triggerPrice) {
      await sendText(chatId, '❌ Invalid limit order state. Please create a new order.');
      return;
    }

    const { direction, inputToken, outputToken, triggerPrice } = userState.limitOrderState;
    const messageId = userState.limitOrderState.messageId;
    
    // Get wallet
    const wallet = await getOrCreateWallet(chatId);
    if (!wallet.address || !wallet.id) {
      await sendText(chatId, '❌ Wallet not found');
      return;
    }

    // Calculate amounts based on direction and user input
    // User enters amount in inputToken units (what they're spending)
    const inputNativeAmount = BigInt(Math.floor(parseFloat(amount) * 10 ** inputToken.decimals)).toString();
    
    // Validate minimum order size ($5 USD)
    try {
      const inputTokenPrice = await getTokenPrice(inputToken.mint);
      if (inputTokenPrice?.usdPrice) {
        const orderValueUSD = parseFloat(amount) * inputTokenPrice.usdPrice;
        
        if (orderValueUSD < 5) {
          const errorMessage = `❌ Order size too small. Minimum order size is $5 USD.\n\nYour order value: $${orderValueUSD.toFixed(2)}\nPlease increase the amount to at least $5 USD.`;
          if (messageId) {
            await editMessageWithButtons(chatId, messageId, errorMessage, { inline_keyboard: [] });
          } else {
            await sendText(chatId, errorMessage);
          }
          return;
        }
      } else {
        console.warn(`[executeLimitOrder] Could not get price for ${inputToken.symbol}, skipping USD validation`);
      }
    } catch (error) {
      console.warn(`[executeLimitOrder] Error validating order size:`, error);
      // Continue without validation if price fetch fails
    }
    
    // Calculate how much output token they'll receive based on trigger price
    // If user spends 0.4 USDC at $0.000014 per BONK, they get 0.4 / 0.000014 = 28,571 BONK
    const outputAmount = parseFloat(amount) / (triggerPrice || 1);
    const outputNativeAmount = BigInt(Math.floor(outputAmount * 10 ** outputToken.decimals)).toString();

    const orderRequest = direction === 'buy' ? {
      inputMint: inputToken.mint,   // What we're spending (USDC)
      outputMint: outputToken.mint, // What we want to receive (BONK)
      maker: wallet.address,
      payer: wallet.address,
      params: {
        makingAmount: inputNativeAmount,   // Amount of USDC we're spending
        takingAmount: outputNativeAmount,  // Amount of BONK we want to receive
      },
    } : {
      inputMint: inputToken.mint,   // What we're selling (SOL)
      outputMint: outputToken.mint, // What we want to receive (USDC)
      maker: wallet.address,
      payer: wallet.address,
      params: {
        makingAmount: inputNativeAmount,   // Amount of SOL we're selling
        takingAmount: outputNativeAmount,  // Amount of USDC we want to receive
      },
    };

    // Create trigger order
    const orderResponse = await createTriggerOrder(orderRequest);

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

    // Execute order
    const executeResponse = await executeTriggerOrder({
      requestId: orderResponse.requestId,
      signedTransaction,
    });

    if (executeResponse.status !== 'Success') {
      throw new Error(executeResponse.status || 'Limit order execution failed');
    }

    // Clear limit order state
    await clearUserState(chatId);

    // Send success message
    const priceDisplay = userState.limitOrderState.price || 'Unknown';
    const message = 
      `✅ Limit Order Created Successfully!\n\n` +
      `**Type:** ${direction?.toUpperCase()}\n` +
      `**Amount:** ${amount} ${inputToken.symbol}\n` +
      `**Trigger Price:** ${priceDisplay}\n` +
      `**Transaction:** ${executeResponse.signature}\n\n` +
      `[View on Solscan](https://solscan.io/tx/${executeResponse.signature})`;

    if (messageId) {
      await editMessageWithButtons(chatId, messageId, message, successMenu);
    } else {
      await sendTextWithButtons(chatId, message, successMenu);
    }

  } catch (error) {
    console.error('Error executing limit order:', error);
    const errorMessage = `❌ Limit order failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    const userState = await getUserState(chatId);
    const messageId = userState?.limitOrderState?.messageId;
    
    if (messageId) {
      await editMessageWithButtons(chatId, messageId, errorMessage, { inline_keyboard: [] });
    } else {
      await sendText(chatId, errorMessage);
    }
    await clearUserState(chatId);
  }
}
