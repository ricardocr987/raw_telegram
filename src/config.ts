import { Connection } from "@solana/web3.js";

export const config = {
  // Telegram configuration
  BOT_TELEGRAM_KEY: process.env.BOT_TELEGRAM_KEY || '',
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  WEBHOOK_URL: process.env.WEBHOOK_URL || '',

  // Solana configuration
  JUPITER_API_KEY: process.env.JUPITER_API_KEY || '',
  RPC_ENDPOINT: process.env.RPC_ENDPOINT || '',
  RPC_CONNECTION: new Connection(process.env.RPC_ENDPOINT || ''),
  HELIUS_API_KEY: process.env.HELIUS_API_KEY || '',

  // Server configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  
  // Redis configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Privy configuration
  PRIVY_APP_ID: process.env.PRIVY_APP_ID || '',
  PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET || '',
  PRIVY_AUTHORIZATION_KEY: process.env.PRIVY_AUTHORIZATION_KEY || '',
  PRIVY_AUTHORIZATION_ID: process.env.PRIVY_AUTHORIZATION_ID || '',
};

const requiredEnvVariables = [
  'RPC_ENDPOINT',
  'BOT_TELEGRAM_KEY',
  'TELEGRAM_WEBHOOK_SECRET',
  'WEBHOOK_URL',
  'PRIVY_APP_ID',
  'PRIVY_APP_SECRET',
  'PRIVY_AUTHORIZATION_KEY',
  'PRIVY_AUTHORIZATION_ID',
];

requiredEnvVariables.forEach((variable) => {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
});

