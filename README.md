# raw_telegram

A Telegram bot with inline keyboard support built with Bun.

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

Create a `.env` file in the root directory with the following variables:

```env
BOT_TELEGRAM_KEY=your_telegram_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_URL=https://yourdomain.com
PORT=3000
REDIS_URL=redis://localhost:6379
```

### 3. Start Redis (Development)

Using Docker Compose:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This starts a Redis container on `localhost:6379`.

### 4. Start the server

The bot will automatically:
- Connect to Redis for session management
- Set up the webhook with Telegram on startup
- Register the bot commands menu

```bash
bun run index.ts
```

You should see:
```
Server running at http://localhost:3000
📡 Connecting to Redis: redis://localhost:6379
✅ Webhook set successfully: https://yourdomain.com/bot...
✅ Bot commands set successfully
```

### 5. Available Commands

- `/start` - Start the bot and create/get wallet
- `/menu` - Show main menu with inline keyboard

## Features

- ✅ **Wallet Integration** - Automatically creates Solana wallets via Privy
- ✅ **Redis State Management** - Persistent session storage using Bun's built-in Redis client
- ✅ **Multistep Inline Keyboards** - Navigate through nested menus
- ✅ **Main Menu** - Trade, Info, Withdraw, and Lend options
- ✅ **Trade Submenu** - Swap, Limit Order, and DCA options
- ✅ **Webhook handling** for messages and callbacks
- ✅ **Callback query handling** with smooth navigation
- ✅ **Error handling and logging**

This project was created using `bun init` in bun v1.3.0. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
