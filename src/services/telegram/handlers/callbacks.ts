import type { CallbackQuery } from '../types';
import { answerCallbackQuery, editMessageWithButtons, sendText, sendTextWithButtons } from '../core';
import { getUserState, clearUserState } from '../state';
import { infoMenu, mainMenu, tradeMenu } from '../menu';
import { handleOpenOrders } from './info/orders';
import { handleHoldings } from './info/holdings';
import * as swapStep from './steps/swap';
import * as limitOrderStep from './steps/limitOrder';
import * as dcaStep from './steps/dca';
import * as withdrawStep from './steps/withdraw';

/**
 * Handle callback query from inline keyboard
 */
export async function handleCallback(callbackQuery: CallbackQuery): Promise<void> {
  const { message, data, id } = callbackQuery;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  
  try {
    // Answer the callback query to stop loading animation
    await answerCallbackQuery(id);
        
    // No active flow - handle as menu navigation
    switch (data) {
      // Main menu navigation
      case 'trade':
        await editMessageWithButtons(chatId, messageId, '📊 Trade Options', tradeMenu);
        break;
      
      case 'info':
        await editMessageWithButtons(chatId, messageId, 'ℹ️ Wallet information', infoMenu);
        break;
      
      case 'withdraw':
        await withdrawStep.initWithdraw(chatId, messageId);
        break;
      
      case 'back_main':
        await editMessageWithButtons(chatId, messageId, '🏠 Main Menu', mainMenu);
        break;
      
      case 'back_to_trade':
        await editMessageWithButtons(chatId, messageId, '📊 Trade Options', tradeMenu);
        break;
      
      case 'new_operation':
        await sendTextWithButtons(chatId, '🔄 New Operation', mainMenu);
        break;
      
      // Info menu handlers
      case 'info_open_orders':
        await handleOpenOrders(chatId, messageId);
        break;
      
      case 'info_holdings':
        await handleHoldings(chatId, messageId);
        break;
      
      // Trade menu
      case 'trade_swap':
        await swapStep.initTradeSwap(chatId, messageId);
        break;
      
      case 'trade_limit':
        await limitOrderStep.initLimitOrder(chatId, messageId);
        break;
      
      case 'trade_dca':
        await sendText(chatId, '⏰ DCA feature - coming soon!');
        break;
      
      default:
        // Check if user has active flow in any mode
        const userState = await getUserState(chatId);
      
        if (userState?.swapState) {
          // User has active swap - route to swap step handler
          await swapStep.handleSwapStep(callbackQuery, data);
          return;
        }
        
        if (userState?.limitOrderState) {
          // User has active limit order - route to limit order step handler
          await limitOrderStep.handleLimitOrderStep(callbackQuery, data);
          return;
        }
        
        if (userState?.dcaState) {
          // User has active DCA - route to DCA step handler
          await dcaStep.handleDcaStep(callbackQuery, data);
          return;
        }
        
        if (userState?.withdrawState) {
          // User has active withdraw - route to withdraw step handler
          await withdrawStep.handleWithdrawStep(callbackQuery, data);
          return;
        }
        break;
    }
  } catch (error) {
    console.error('Error handling callback:', error);
    await sendText(chatId, '❌ An error occurred. Please try again.');
    await clearUserState(chatId);
  }
}

