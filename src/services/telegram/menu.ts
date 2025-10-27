export const mainMenu = {
  inline_keyboard: [
    [
      { text: '📊 Trade', callback_data: 'trade' },
    ],
    [
      { text: 'ℹ️ Info', callback_data: 'info' },
    ],
    [
      { text: '💸 Withdraw', callback_data: 'withdraw' },
    ],
    [
      { text: '💰 Lend', callback_data: 'lend' },
    ],
  ],
};

export function createAmountSelector(chatId: number) {
  return {
    inline_keyboard: [
      [
        { text: '25%', callback_data: `swap_percent_25` },
        { text: '50%', callback_data: `swap_percent_50` },
      ],
      [
        { text: '75%', callback_data: `swap_percent_75` },
        { text: '100%', callback_data: `swap_percent_100` },
      ],
    ],
  };
}

// Legacy export for backwards compatibility
export const amountSelector = createAmountSelector(0);

export const tradeMenu = {
  inline_keyboard: [
    [
      { text: '🔄 Swap', callback_data: 'trade_swap' },
    ],
    [
      { text: '📈 Limit Order', callback_data: 'trade_limit' },
    ],
    [
      { text: '⏰ DCA', callback_data: 'trade_dca' },
    ],
    [
      { text: '⬅️ Back', callback_data: 'back_main' },
    ],
  ],
};