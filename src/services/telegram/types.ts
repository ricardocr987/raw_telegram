export interface TelegramMessage {
  chat: {
    id: number;
    first_name?: string;
  };
  text?: string;
  message_id: number;
}

export interface CallbackQuery {
  id: string;
  from?: {
    id: number;
    first_name?: string;
  };
  message: {
    chat: { id: number };
    message_id: number;
  };
  data: string;
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface InlineKeyboard {
  inline_keyboard: InlineKeyboardButton[][];
}

