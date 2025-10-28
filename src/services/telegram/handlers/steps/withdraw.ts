import type { CallbackQuery } from '../../types';
import { sendText, sendTextWithButtons, editMessageWithButtons } from '../../core';
import { getUserState, setUserState, updateUserWithdrawState, clearUserState } from '../../state';
import { getOrCreateWallet, signTransaction } from '../../../privy';
import type { InlineKeyboard } from '../../types';
import { withdrawAmountMenu, successMenu, mainMenu } from '../../menu';
import { getHoldingsData } from '../../../../utils/enrichedHoldings';
import { Connection, PublicKey, SystemProgram, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { config } from '../../../../config';

/**
 * Handle withdraw flow based on current state
 * This is the main entry point for withdraw callbacks
 */
export async function handleWithdrawStep(callbackQuery: CallbackQuery, data: string): Promise<void> {
  const { message } = callbackQuery;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  
  console.log(`[handleWithdrawStep] data: ${data}`);
  const userState = await getUserState(chatId);
  
  if (!userState?.withdrawState) {
    // No active withdraw state - start new withdraw
    await initWithdraw(chatId, messageId);
    return;
  }

  const { step } = userState.withdrawState;
  console.log(`[handleWithdrawStep] step: ${step}`);
  switch (step) {
    case 'select_token':
      // User is selecting token
      await handleTokenSelection(chatId, data);
      break;
      
    case 'select_amount':
      // User is selecting amount
      await handleAmountSelection(chatId, data);
      break;
      
    default:
      clearUserState(chatId);
      await sendText(chatId, '❌ Invalid state');
  }
}

/**
 * Initiate withdraw flow - ask for recipient address
 */
export async function initWithdraw(chatId: number, messageId?: number): Promise<void> {
  try {
    console.log(`[initWithdraw] Starting for chat ${chatId}`);

    // Initialize withdraw state with messageId
    await setUserState(chatId, {
      chatId,
      withdrawState: {
        step: 'enter_address',
        messageId,
      },
    });

    const messageText = '📝 Please send the recipient address:\n\n(Enter a valid Solana wallet address)';

    if (messageId) {
      await editMessageWithButtons(
        chatId,
        messageId,
        messageText,
        { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'back_main' }]] }
      );
    } else {
      await sendTextWithButtons(
        chatId,
        messageText,
        { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'back_main' }]] }
      );
    }
  } catch (error) {
    console.error('[initWithdraw] Error initiating withdraw:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (messageId) {
      await editMessageWithButtons(
        chatId,
        messageId,
        `❌ Error starting withdraw: ${errorMessage}`,
        mainMenu
      );
    } else {
      await sendText(chatId, `❌ Error starting withdraw: ${errorMessage}`);
    }
    
    await clearUserState(chatId);
  }
}

/**
 * Store recipient address and show token selection
 */
export async function storeRecipientAddress(chatId: number, address: string): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.withdrawState) {
      await sendText(chatId, '❌ Invalid state.');
      return;
    }

    // Validate Solana address
    try {
      new PublicKey(address);
    } catch (error) {
      await sendText(chatId, '❌ Invalid Solana address. Please try again.');
      return;
    }

    await updateUserWithdrawState(chatId, {
      recipientAddress: address,
      step: 'select_token',
    });

    // Fetch wallet holdings
    const wallet = await getOrCreateWallet(chatId);
    const holdings = await getHoldingsData(wallet.address);

    // Prepare all tokens including SOL
    const allTokens = [];
    
    // Add SOL first if balance > 0
    if (holdings.solUiAmount > 0) {
      allTokens.push({
        symbol: 'SOL',
        mint: 'So11111111111111111111111111111111111111112',
        uiAmount: holdings.solUiAmount,
        decimals: 9
      });
    }
    
    // Add other tokens
    holdings.tokenHoldings.forEach(tokenHolding => {
      if (tokenHolding.uiAmount > 0) {
        allTokens.push(tokenHolding);
      }
    });

    if (allTokens.length === 0) {
      await sendText(chatId, '❌ No tokens found in your wallet.');
      await clearUserState(chatId);
      return;
    }

    // Create inline keyboard with user's tokens
    const keyboardButtons = allTokens.slice(0, 10).map((tokenHolding: { symbol: string; mint: string; uiAmount: number }) => {
      const amount = tokenHolding.uiAmount.toFixed(4);
      
      return [
        {
          text: `${tokenHolding.symbol} - ${amount}`,
          callback_data: tokenHolding.mint,
        },
      ];
    }).filter(Boolean) as InlineKeyboard['inline_keyboard'];

    const keyboard: InlineKeyboard = {
      inline_keyboard: [
        ...keyboardButtons,
        [
          { text: '⬅️ Back', callback_data: 'back_main' },
        ],
      ],
    };

    // Edit the message to show token selection
    const messageId = userState.withdrawState.messageId;
    const messageText = `✅ Recipient address confirmed:\n\`${address.slice(0, 8)}...${address.slice(-8)}\`\n\n📊 Select the token to withdraw:`;

    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, keyboard);
    } else {
      await sendTextWithButtons(chatId, messageText, keyboard);
    }
  } catch (error) {
    console.error('Error storing recipient address:', error);
    await sendText(chatId, '❌ Error processing address. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Handle token selection
 */
async function handleTokenSelection(chatId: number, tokenAddress: string): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.withdrawState) {
      await sendText(chatId, '❌ Invalid state.');
      return;
    }

    const wallet = await getOrCreateWallet(chatId);
    const holdings = await getHoldingsData(wallet.address);
    
    // Check if it's SOL (native mint)
    const isSOL = tokenAddress === 'So11111111111111111111111111111111111111112';
    
    let tokenHolding;
    
    if (isSOL) {
      // Handle SOL
      tokenHolding = {
        symbol: 'SOL',
        mint: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        uiAmount: holdings.solUiAmount,
        amount: holdings.solUiAmount.toString()
      };
    } else {
      // Find the token holding by mint address
      tokenHolding = holdings.tokenHoldings.find((t: { mint: string }) => t.mint === tokenAddress);
      if (!tokenHolding) {
        await sendText(chatId, '❌ Token data not found.');
        return;
      }
    }

    // Update state with full token info
    await updateUserWithdrawState(chatId, {
      token: {
        mint: tokenAddress,
        symbol: tokenHolding.symbol,
        decimals: tokenHolding.decimals,
        amount: tokenHolding.uiAmount.toString(),
      },
      step: 'select_amount',
    });

    // Edit the same message to ask for amount
    const messageId = userState.withdrawState.messageId;
    const totalAmount = parseFloat(tokenHolding.uiAmount.toString());

    const messageText = `✅ Token Selected: ${tokenHolding.symbol}\n\n` +
      `Total Balance: ${totalAmount}\n\n` +
      `Please select the amount to withdraw or type it manually:`;

    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, withdrawAmountMenu);
    } else {
      await sendTextWithButtons(chatId, messageText, withdrawAmountMenu);
    }
  } catch (error) {
    console.error('Error selecting token:', error);
    await sendText(chatId, '❌ Error processing token. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Handle amount selection by percentage
 * Callback format: withdraw_percent_25, withdraw_percent_50, withdraw_percent_75, withdraw_percent_100
 */
async function handleAmountSelection(chatId: number, data: string): Promise<void> {
  // Validate callback format
  if (!data.startsWith('withdraw_percent_')) {
    await sendText(chatId, '❌ Invalid request');
    return;
  }

  // Extract and validate percentage
  const percentageStr = data.replace('withdraw_percent_', '');
  const percentage = Number(percentageStr);
  
  if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
    await sendText(chatId, '❌ Invalid percentage');
    return;
  }

  // Handle the withdrawal
  await handleAmountByPercentage(chatId, percentage);
}

/**
 * Handle amount selection by percentage
 */
async function handleAmountByPercentage(chatId: number, percentage: number): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.withdrawState?.token?.amount) {
      await sendText(chatId, '❌ Invalid request. Please start a new withdrawal.');
      await clearUserState(chatId);
      return;
    }

    const totalAmount = parseFloat(userState.withdrawState.token.amount);
    const withdrawAmount = totalAmount * percentage / 100;

    // Edit the message to show processing
    const messageId = userState.withdrawState.messageId;
    const messageText = `✅ Withdrawal Confirmed!\n\n` +
      `From: Your wallet\n` +
      `To: ${userState.withdrawState.recipientAddress?.slice(0, 8)}...${userState.withdrawState.recipientAddress?.slice(-8)}\n` +
      `Amount: ${withdrawAmount} ${userState.withdrawState.token.symbol}\n\n` +
      `🔄 Processing withdrawal...`;

    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, { inline_keyboard: [] });
    } else {
      await sendText(chatId, messageText);
    }
    
    // Execute the withdrawal
    await executeWithdraw(chatId, withdrawAmount);
  } catch (error) {
    console.error('Error in handleAmountByPercentage:', error);
    await sendText(chatId, '❌ Error processing amount selection. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Execute withdrawal with manually entered amount
 */
export async function executeWithdrawWithAmount(chatId: number, withdrawAmount: number): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.withdrawState?.token) {
      await sendText(chatId, '❌ Invalid withdraw state');
      await clearUserState(chatId);
      return;
    }

    const messageId = userState.withdrawState.messageId;
    const messageText = `✅ Withdrawal Confirmed!\n\n` +
      `From: Your wallet\n` +
      `To: ${userState.withdrawState.recipientAddress?.slice(0, 8)}...${userState.withdrawState.recipientAddress?.slice(-8)}\n` +
      `Amount: ${withdrawAmount} ${userState.withdrawState.token.symbol}\n\n` +
      `🔄 Processing withdrawal...`;
    
    if (messageId) {
      await editMessageWithButtons(chatId, messageId, messageText, { inline_keyboard: [] });
    }
    
    // Execute the withdrawal
    await executeWithdraw(chatId, withdrawAmount);
  } catch (error) {
    console.error('Error in executeWithdrawWithAmount:', error);
    await sendText(chatId, '❌ Error executing withdrawal. Please try again.');
    await clearUserState(chatId);
  }
}

/**
 * Execute the withdrawal transaction
 */
async function executeWithdraw(chatId: number, withdrawAmount: number): Promise<void> {
  try {
    const userState = await getUserState(chatId);
    if (!userState?.withdrawState?.token || !userState.withdrawState.recipientAddress) {
      await sendText(chatId, '❌ Invalid withdraw state. Please start a new withdrawal.');
      return;
    }

    const { token, recipientAddress } = userState.withdrawState;
    const messageId = userState.withdrawState.messageId;
    
    // Get wallet
    const wallet = await getOrCreateWallet(chatId);
    if (!wallet.address || !wallet.id) {
      await sendText(chatId, '❌ Wallet not found');
      return;
    }

    // Check if it's SOL
    const isSOL = token.mint === 'So11111111111111111111111111111111111111112';

    let transaction: VersionedTransaction;
    let signature: string;

    if (isSOL) {
      // Transfer SOL
      const lamports = Math.floor(withdrawAmount * 10 ** token.decimals);
      
      const connection = new Connection(config.RPC_ENDPOINT);
      const transactionMessage = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(wallet.address),
          toPubkey: new PublicKey(recipientAddress),
          lamports: lamports,
        })
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transactionMessage.recentBlockhash = blockhash;
      transactionMessage.feePayer = new PublicKey(wallet.address);

      // Convert to versioned transaction
      transaction = new VersionedTransaction(transactionMessage.compileMessage());
    } else {
      // Transfer SPL token
      const mintPublicKey = new PublicKey(token.mint);
      const amount = BigInt(Math.floor(withdrawAmount * 10 ** token.decimals));
      
      const connection = new Connection(config.RPC_ENDPOINT);
      
      // Get source ATA
      const sourceATA = await getAssociatedTokenAddress(
        mintPublicKey,
        new PublicKey(wallet.address)
      );
      
      // Get destination ATA
      const destATA = await getAssociatedTokenAddress(
        mintPublicKey,
        new PublicKey(recipientAddress)
      );

      const transactionMessage = new Transaction().add(
        createTransferInstruction(
          sourceATA,
          destATA,
          new PublicKey(wallet.address),
          amount,
          []
        )
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transactionMessage.recentBlockhash = blockhash;
      transactionMessage.feePayer = new PublicKey(wallet.address);

      // Convert to versioned transaction
      transaction = new VersionedTransaction(transactionMessage.compileMessage());
    }

    // Sign transaction
    const signedTransactionBase64 = Buffer.from(transaction.serialize()).toString('base64');
    const signedTransaction = await signTransaction(wallet.id, signedTransactionBase64);
    
    if (!signedTransaction) {
      const errorMessage = '❌ Failed to sign transaction';
      if (messageId) {
        await editMessageWithButtons(chatId, messageId, errorMessage, { inline_keyboard: [] });
      } else {
        await sendText(chatId, errorMessage);
      }
      await clearUserState(chatId);
      return;
    }

    // Send transaction
    const connection = new Connection(config.RPC_ENDPOINT);
    signature = await connection.sendRawTransaction(Buffer.from(signedTransaction, 'base64'), {
      skipPreflight: false,
    });

    // Confirm transaction
    await connection.confirmTransaction(signature, 'confirmed');

    // Clear withdraw state
    await clearUserState(chatId);

    // Send success message
    const message = 
      `✅ Withdrawal Executed Successfully!\n\n` +
      `**Amount:** ${withdrawAmount} ${token.symbol}\n` +
      `**To:** \`${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-8)}\`\n` +
      `**Transaction:** ${signature}\n\n` +
      `[View on Solscan](https://solscan.io/tx/${signature})`;

    // Edit the message to show success if messageId exists, otherwise send new message
    if (messageId) {
      await editMessageWithButtons(chatId, messageId, message, successMenu);
    } else {
      await sendTextWithButtons(chatId, message, successMenu);
    }

  } catch (error) {
    console.error('Error executing withdrawal:', error);
    const errorMessage = `❌ Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    const userState = await getUserState(chatId);
    const messageId = userState?.withdrawState?.messageId;
    
    if (messageId) {
      await editMessageWithButtons(chatId, messageId, errorMessage, { inline_keyboard: [] });
    } else {
      await sendText(chatId, errorMessage);
    }
    await clearUserState(chatId);
  }
}

