# raw_telegram

A Telegram bot with inline keyboard support built with Bun for Solana trading operations.

## Architecture Overview

This bot handles Telegram messages through a webhook-based architecture:

1. **Webhook Setup**: The server automatically configures Telegram webhooks on startup
2. **Message Routing**: Incoming messages are routed to appropriate handlers based on user state
3. **State Management**: User sessions and trading flows are stored in Redis
4. **Wallet Integration**: Solana wallets are created and managed via Privy
5. **Trading Operations**: Supports swap, limit orders, DCA, and withdrawal operations

### Message Flow

- **Commands** (`/start`, `/menu`) → Direct command handlers
- **Text Messages** → Routed based on active user state (swap, limit order, withdraw flows)
- **Callback Queries** → Inline keyboard button interactions for navigation and trading steps

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Telegram Bot Configuration
BOT_TELEGRAM_KEY=your_telegram_bot_token_from_botfather
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret_token
WEBHOOK_URL=https://yourdomain.com

# Solana Configuration
JUPITER_API_KEY=your_jupiter_api_key
RPC_ENDPOINT=https://your-solana-rpc-endpoint
HELIUS_API_KEY=your_helius_api_key

# Server Configuration
NODE_ENV=development
PORT=3000

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Privy Configuration
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
PRIVY_AUTHORIZATION_KEY=your_privy_authorization_private_key
PRIVY_AUTHORIZATION_ID=your_privy_authorization_id
```

### 3. Telegram Bot Setup

1. **Create Bot with BotFather**:
   - Message `@BotFather` on Telegram
   - Use `/newbot` command
   - Follow prompts to create your bot
   - Copy the bot token to `BOT_TELEGRAM_KEY`

2. **Webhook Configuration**:
   - The bot automatically sets up webhooks on startup
   - Uses `TELEGRAM_WEBHOOK_SECRET` for security
   - Webhook URL format: `{WEBHOOK_URL}/bot{BOT_TELEGRAM_KEY}`

### 4. Privy Setup

1. **Create Privy Project**:
   - Go to [Privy Dashboard](https://dashboard.privy.io/)
   - Create a new project
   - Copy `App ID` to `PRIVY_APP_ID`
   - Copy `App Secret` to `PRIVY_APP_SECRET`

2. **Create Authorization Key**:
   - Navigate to "Wallet Infrastructure" → "Authorization"
   - Create a new authorization key
   - Copy the `ID` to `PRIVY_AUTHORIZATION_ID`
   - Copy the `Private Key` to `PRIVY_AUTHORIZATION_KEY`

### 5. Launch the Application

You need **three terminal processes** running simultaneously:

#### Terminal 1: Ngrok (for webhook tunneling)
```bash
ngrok http 3000
```
Copy the HTTPS URL (e.g., `https://1fae862874d7.ngrok-free.app`) to your `WEBHOOK_URL` in `.env`

#### Terminal 2: Redis Service
```bash
docker-compose -f docker-compose.dev.yml up
```
This starts Redis on `localhost:6379` for session management.

#### Terminal 3: Bot Server
```bash
bun start
```

### 6. Verification

You should see the following output when the server starts:

```
Server running at http://localhost:3000
📡 Connecting to Redis: redis://localhost:6379
✅ Webhook set successfully: https://yourdomain.com/bot...
✅ Bot commands set successfully
```

## Available Commands

- `/start` - Initialize bot and create/get Solana wallet
- `/menu` - Show main menu


## Trading Operations

### Swap
- Select input token from holdings
- Choose output token (by symbol or address)
- Enter amount or use percentage buttons
- Execute swap via Jupiter

### Limit Orders
- Choose buy/sell direction
- Select input/output tokens
- Set target price (TO-DO limit orders by % (ie: -5%), by MC)
- Enter amount
- Place limit order

### Withdraw
- Select token from holdings
- Enter recipient address
- Choose amount
- Execute withdrawal

### DCA (Dollar Cost Averaging)
- TO-DO

## Technical Details

### Message Handling Architecture

1. **Webhook Reception**: Server receives updates at `/bot{BOT_TELEGRAM_KEY}`
2. **Secret Validation**: Validates `X-Telegram-Bot-Api-Secret-Token` header
3. **Message Routing**: Routes to `handleMessage()` or `handleCallback()` based on update type
4. **State Management**: Uses Redis to track user sessions and active trading flows
5. **Flow Execution**: Multi-step processes with inline keyboard navigation

### Handler Structure

- **`messages.ts`**: Handles text commands and trading flow text input
- **`callbacks.ts`**: Manages inline keyboard button interactions
- **`steps/`**: Individual trading operation handlers (swap, limit order, withdraw, DCA)
- **`info/`**: Information display handlers (holdings, orders)