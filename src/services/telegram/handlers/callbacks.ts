import type { CallbackQuery } from '../types';
import { answerCallbackQuery, editMessageWithButtons, sendText } from '../core';
import { getUserState, clearUserState } from '../state';
import { mainMenu, tradeMenu } from '../menu';
import * as swapStep from './steps/swap';
import * as limitOrderStep from './steps/limitOrder';
import * as dcaStep from './steps/dca';

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
  
  // No active flow - handle as menu navigation
  switch (data) {
    // Main menu navigation
    case 'trade':
      await editMessageWithButtons(chatId, messageId, '📊 Trade Options', tradeMenu);
      break;
    
    case 'info':
      await sendText(chatId, 'ℹ️ Bot information coming soon...');
      break;
    
    case 'withdraw':
      await sendText(chatId, '💸 Withdraw feature coming soon...');
      break;
    
    case 'lend':
      await sendText(chatId, '💰 Lend feature coming soon...');
      break;
    
    case 'back_main':
      await editMessageWithButtons(chatId, messageId, '🏠 Main Menu', mainMenu);
      break;
    
    case 'back_to_trade':
      await editMessageWithButtons(chatId, messageId, '📊 Trade Options', tradeMenu);
      break;
    
    // Trade menu
    case 'trade_swap':
      await swapStep.initTradeSwap(chatId, messageId);
      break;
    
    case 'trade_limit':
      await sendText(chatId, '📈 Limit Order feature - coming soon!');
      break;
    
    case 'trade_dca':
      await sendText(chatId, '⏰ DCA feature - coming soon!');
      break;
    
    default:
      await sendText(chatId, `Unknown action: ${data}`);
      break;
  }
  } catch (error) {
    console.error('Error handling callback:', error);
    await sendText(chatId, '❌ An error occurred. Please try again.');
    await clearUserState(chatId);
  }
}

