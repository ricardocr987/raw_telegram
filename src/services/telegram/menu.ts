export const mainMenu = {
  inline_keyboard: [
    [
      { text: '📊 Trade', callback_data: 'trade' },
      { text: 'ℹ️ Info', callback_data: 'info' },
      { text: '💸 Withdraw', callback_data: 'withdraw' },
    ],
  ],
};

export const percentageAmountMenu = {
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

export const tradeMenu = {
  inline_keyboard: [
    [
      { text: '🔄 Swap', callback_data: 'trade_swap' },
      { text: '⏰ DCA', callback_data: 'trade_dca' },
      { text: '📈 Limit Order', callback_data: 'trade_limit' },
    ],
    [
      { text: '📊 Copy trade', callback_data: 'trade_copy_trade' },
      { text: '🎯 Snipe', callback_data: 'trade_snipe' },
    ],
    [
      { text: '⬅️ Back', callback_data: 'back_main' },
    ],
  ],
};

export const successMenu = {
  inline_keyboard: [
    [
      { text: '🔄 New Operation', callback_data: 'new_operation' },
    ],
  ],
};