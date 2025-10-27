import { PrivyClient } from '@privy-io/server-auth';
import { config } from '../config';
import type { WalletWithMetadata } from '@privy-io/server-auth';
import { VersionedTransaction } from '@solana/web3.js';

// Initialize Privy client
let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    privyClient = new PrivyClient(config.PRIVY_APP_ID, config.PRIVY_APP_SECRET, {
      walletApi: {
        authorizationPrivateKey: config.PRIVY_AUTHORIZATION_KEY_ID
      }
    });
  }
  return privyClient;
}

/**
 * Create or get a Privy user linked to Telegram
 */
export async function createOrGetUser(telegramUserId: number): Promise<any> {
  try {
    const privy = getPrivyClient();
    
    // First try to get existing user
    console.log(telegramUserId)
    const existingUser = await privy.getUserByTelegramUserId(telegramUserId.toString());
    console.log(existingUser)
    if (existingUser) {
      return existingUser;
    }

    // Create new user if doesn't exist
    const privyUser = await privy.importUser({
      linkedAccounts: [{
        type: 'telegram',
        telegramUserId: telegramUserId.toString()
      }]
    });

    return privyUser;
  } catch (error) {
    console.error('Error creating/getting Privy user:', error);
    throw error;
  }
}

/**
 * Create a Solana wallet for the user
 */
export async function createWallet(userId: string): Promise<any> {
  try {
    const privy = getPrivyClient();
    
    const wallet = await privy.walletApi.createWallet({
      chainType: 'solana',
      owner: {
        userId: userId
      },
      additionalSigners: [{
        signerId: config.PRIVY_AUTH_ID
      }]
    });

    return wallet;
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw error;
  }
}

/**
 * Get user's Solana wallet
 */
export async function getUserWallet(telegramUserId: number): Promise<WalletWithMetadata | null> {
  try {
    const privy = getPrivyClient();
    
    const user = await privy.getUserByTelegramUserId(telegramUserId.toString());
    if (!user) {
      return null;
    }

    const wallet = user.linkedAccounts.find((account): account is WalletWithMetadata => 
      account.type === 'wallet' && account.walletClientType === 'privy'
    );

    return wallet || null;
  } catch (error) {
    console.error('Error getting user wallet:', error);
    return null;
  }
}

/**
 * Get or create user's Solana wallet
 */
export async function getOrCreateWallet(telegramUserId: number): Promise<WalletWithMetadata> {
  try {
    // First try to get existing wallet
    const existingWallet = await getUserWallet(telegramUserId);
    if (existingWallet) {
      console.log(`✅ Found existing wallet for user ${telegramUserId}: ${existingWallet.address}`);
      return existingWallet;
    }

    console.log(`🔨 Creating new wallet for user ${telegramUserId}...`);
    
    // Create user and wallet if they don't exist
    const user = await createOrGetUser(telegramUserId);
    console.log(`✅ Created/found user: ${user.id}`);
    
    const wallet = await createWallet(user.id);
    console.log(`✅ Created wallet: ${wallet.address}`);
    
    // Return the wallet metadata
    return {
      id: wallet.id,
      type: 'wallet',
      walletClientType: 'privy',
      address: wallet.address,
      chainType: 'solana'
    } as WalletWithMetadata;
  } catch (error) {
    console.error('Error getting/creating wallet:', error);
    throw error;
  }
}

/**
 * Sign a Solana transaction using Privy
 */
export async function signTransaction(walletId: string, transactionBase64: string): Promise<string> {
  try {
    const privy = getPrivyClient();

    // Convert base64 string to transaction bytes
    const transactionBytes = Buffer.from(transactionBase64, 'base64');
    
    // Create VersionedTransaction from raw bytes
    const versionedTransaction = VersionedTransaction.deserialize(transactionBytes);
    
    const result = await privy.walletApi.solana.signTransaction({
      walletId: walletId,
      transaction: versionedTransaction,
    });

    return Buffer.from(result.signedTransaction.serialize()).toString('base64');
  } catch (error) {
    console.error('Error signing transaction:', error);
    throw error;
  }
}

/**
 * Get wallet address for a user
 */
export async function getWalletAddress(telegramUserId: number): Promise<string | null> {
  try {
    const wallet = await getUserWallet(telegramUserId);
    return wallet?.address || null;
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
}