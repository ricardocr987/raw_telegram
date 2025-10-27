import { config } from '../../config';
import type { InlineKeyboard } from './types';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${config.BOT_TELEGRAM_KEY}`;

/**
 * Send a text message to a chat
 */
export async function sendText(chatId: number, text: string): Promise<void> {
  const url = `${TELEGRAM_API_URL}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}`;
  await fetch(url);
}

/**
 * Send a text message with inline keyboard
 */
export async function sendTextWithButtons(
  chatId: number,
  text: string,
  keyboard: InlineKeyboard
): Promise<void> {
  const url = `${TELEGRAM_API_URL}/sendMessage`;
  const data = {
    method: 'sendMessage',
    chat_id: String(chatId),
    text,
    reply_markup: keyboard,
  };

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

/**
 * Edit message text and inline keyboard
 */
export async function editMessageWithButtons(
  chatId: number,
  messageId: number,
  text: string,
  keyboard: InlineKeyboard
): Promise<void> {
  const url = `${TELEGRAM_API_URL}/editMessageText`;
  const data = {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: keyboard,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json() as { ok: boolean; description?: string };

  if (!response.ok || !result.ok) {
    throw new Error(`Failed to edit message: ${JSON.stringify(result)}`);
  }
}

/**
 * Answer a callback query (required to stop loading animation)
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const url = `${TELEGRAM_API_URL}/answerCallbackQuery`;
  const data = {
    callback_query_id: callbackQueryId,
    text: text || 'Processing...',
  };

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

