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

export const withdrawAmountMenu = {
  inline_keyboard: [
    [
      { text: '25%', callback_data: `withdraw_percent_25` },
      { text: '50%', callback_data: `withdraw_percent_50` },
    ],
    [
      { text: '75%', callback_data: `withdraw_percent_75` },
      { text: '100%', callback_data: `withdraw_percent_100` },
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

export const infoMenu = {
  inline_keyboard: [
    [
      { text: '💼 Holdings', callback_data: 'info_holdings' },
      { text: '📊 Open orders', callback_data: 'info_open_orders' },
    ],
    [
      { text: '🎯 Transaction history', callback_data: 'info_transaction_history' },
      { text: '💾 Export wallet', callback_data: 'info_export_wallet' },
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

export const buyOrSellMenu = {
  inline_keyboard: [
    [
      { text: '🟢 Buy', callback_data: 'limit_order_buy' },
      { text: '🔴 Sell', callback_data: 'limit_order_sell' },
    ],
    [
      { text: '⬅️ Back', callback_data: 'back_to_trade' },
    ],
  ],
};

export const confirmOrderMenu = {
  inline_keyboard: [
    [
      { text: '✅ Confirm', callback_data: 'limit_order_confirm' },
    ],
    [
      { text: '❌ Cancel', callback_data: 'limit_order_cancel' },
    ],
  ],
};