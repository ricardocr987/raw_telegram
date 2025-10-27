import { config } from './config';
import { handleMessage, handleCallback } from './services/telegram/index';
import type { TelegramMessage, CallbackQuery } from './services/telegram/index';

interface TelegramWebhookUpdate {
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

const TELEGRAM_API_URL = `https://api.telegram.org/bot${config.BOT_TELEGRAM_KEY}`;
const WEBHOOK_SECRET = config.TELEGRAM_WEBHOOK_SECRET;
const WEBHOOK_URL = `${config.WEBHOOK_URL}/bot${config.BOT_TELEGRAM_KEY}`;

/**
 * Set up Telegram webhook
 */
async function setupWebhook() {
  try {
    const url = `${TELEGRAM_API_URL}/setWebhook?secret_token=${WEBHOOK_SECRET}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
      }),
    });

    const result = await response.json() as { ok: boolean; description?: string };
    
    if (result.ok) {
      console.log('✅ Webhook set successfully:', WEBHOOK_URL);
    } else {
      console.error('❌ Failed to set webhook:', result);
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
  }
}

/**
 * Set up bot commands menu
 */
async function setupBotCommands() {
  try {
    const commands = [
      {
        command: 'start',
        description: '🚀 Start the bot and create/get your wallet',
      },
      {
        command: 'menu',
        description: '📊 Show main menu with trading options',
      },
    ];

    const response = await fetch(`${TELEGRAM_API_URL}/setMyCommands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ commands }),
    });

    const result = await response.json() as { ok: boolean; description?: string };
    
    if (result.ok) {
      console.log('✅ Bot commands set successfully');
    } else {
      console.error('❌ Failed to set commands:', result);
    }
  } catch (error) {
    console.error('❌ Error setting commands:', error);
  }
}

const server = Bun.serve({
  port: config.PORT,
  routes: {
    [`/bot${config.BOT_TELEGRAM_KEY}`]: async (req: Request) => {
      try {
        // Validate webhook secret token
        const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (secretToken !== WEBHOOK_SECRET) {
          console.error('❌ Invalid webhook secret token');
          return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const body = (await req.json()) as TelegramWebhookUpdate;

        if (body.message) {
          await handleMessage(body.message);
        } else if (body.callback_query) {
          await handleCallback(body.callback_query);
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error handling webhook:', error);
        return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    },
  },
});

console.log(`Server running at ${server.url}`);

// Set up webhook and commands on startup
await setupWebhook();
await setupBotCommands();