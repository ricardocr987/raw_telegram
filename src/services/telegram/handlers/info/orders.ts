import { editMessageWithButtons, sendText } from '../../core';
import { infoMenu } from '../../menu';
import { getWalletAddress } from '../../../privy';
import { getRecurringOrders } from '../../../jupiter/recurring';
import { getTriggerOrders } from '../../../jupiter/trigger';
import { getTokenBySymbolOrAddress } from '../../../jupiter/tokens';

/**
 * Display active orders (recurring and trigger)
 */
export async function handleOpenOrders(chatId: number, messageId: number): Promise<void> {
  try {
    // Get user's wallet address
    const walletAddress = await getWalletAddress(chatId);
    if (!walletAddress) {
      await editMessageWithButtons(chatId, messageId, '❌ Wallet not found. Please use /start first.', infoMenu);
      return;
    }

    // Fetch active recurring orders
    const recurringOrders = await getRecurringOrders('all', 'active', walletAddress, 1);
    
    // Fetch active trigger orders
    const triggerOrders = await getTriggerOrders(walletAddress, 'active', '1');

    // Format the response
    let message = '📊 Active Orders\n\n';

    // Display recurring time orders
    if (recurringOrders.time && recurringOrders.time.length > 0) {
      message += '⏰ Recurring Orders (Time):\n';
      for (const order of recurringOrders.time.slice(0, 5)) {
        const inAmount = parseFloat(order.inAmountPerCycle || order.rawInAmountPerCycle || '0');
        const status = order.userClosed ? '🔴 Closed' : '🟢 Active';
        
        // Get input token symbol
        let inputSymbol = 'Unknown';
        try {
          const inputToken = await getTokenBySymbolOrAddress(order.inputMint);
          inputSymbol = inputToken?.symbol || 'Unknown';
        } catch (e) {
          // Use default if token fetch fails
        }
        
        message += `• ${inAmount.toFixed(4)} ${inputSymbol} per cycle - ${status}\n`;
      }
      message += '\n';
    }

    // Display recurring price orders
    if (recurringOrders.price && recurringOrders.price.length > 0) {
      message += '💰 Recurring Orders (Price):\n';
      for (const order of recurringOrders.price.slice(0, 5)) {
        const incrementalUsd = parseFloat(order.incrementalUsdValue || order.rawIncrementalUsdValue || '0');
        const status = order.status === 'closed' ? '🔴 Closed' : '🟢 Active';
        message += `• $${incrementalUsd.toFixed(2)} per interval - ${status}\n`;
      }
      message += '\n';
    }

    // Display trigger orders
    if (triggerOrders.orders && triggerOrders.orders.length > 0) {
      message += '🎯 Trigger Orders:\n';
      for (const order of triggerOrders.orders.slice(0, 5)) {
        const makingAmount = parseFloat(order.makingAmount || order.rawMakingAmount || '0');
        const takingAmount = parseFloat(order.takingAmount || order.rawTakingAmount || '0');
        const status = order.status === 'executed' || order.status === 'cancelled' ? '🔴 ' + order.status : '🟢 ' + order.status;
        
        // Get token symbols
        let inputSymbol = 'Unknown';
        let outputSymbol = 'Unknown';
        try {
          const inputToken = await getTokenBySymbolOrAddress(order.inputMint);
          const outputToken = await getTokenBySymbolOrAddress(order.outputMint);
          inputSymbol = inputToken?.symbol || 'Unknown';
          outputSymbol = outputToken?.symbol || 'Unknown';
        } catch (e) {
          // Use defaults if token fetch fails
        }
        
        message += `• ${makingAmount.toFixed(4)} ${inputSymbol} → ${takingAmount.toFixed(4)} ${outputSymbol} - ${status}\n`;
      }
      message += '\n';
    }

    // If no orders
    if (
      (!recurringOrders.time || recurringOrders.time.length === 0) &&
      (!recurringOrders.price || recurringOrders.price.length === 0) &&
      (!triggerOrders.orders || triggerOrders.orders.length === 0)
    ) {
      message += 'No active orders found.';
    }

    await editMessageWithButtons(chatId, messageId, message, infoMenu);
  } catch (error) {
    console.error('Error fetching open orders:', error);
    await editMessageWithButtons(
      chatId,
      messageId,
      '❌ Error fetching active orders. Please try again later.',
      infoMenu
    );
  }
}
