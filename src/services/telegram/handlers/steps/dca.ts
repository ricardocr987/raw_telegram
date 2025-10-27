import type { CallbackQuery } from '../../types';
import { sendText } from '../../core';
import { getUserState, clearUserState } from '../../state';

/**
 * Handle DCA flow based on current state
 */
export async function handleDcaStep(callbackQuery: CallbackQuery, data: string): Promise<void> {
  const { message } = callbackQuery;
  const chatId = message.chat.id;
  
  try {
    const userState = await getUserState(chatId);
    
    // TODO: Implement DCA flow
    await sendText(chatId, '⏰ DCA feature - coming soon!');
  } catch (error) {
    console.error('Error in handleDcaStep:', error);
    await sendText(chatId, '❌ An error occurred. Please try again.');
    await clearUserState(chatId);
  }
}

