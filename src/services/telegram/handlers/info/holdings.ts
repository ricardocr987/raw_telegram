import { editMessageWithButtons } from '../../core';
import { infoMenu } from '../../menu';
import { getWalletAddress } from '../../../privy';
import { getHoldingsData } from '../../../../utils/enrichedHoldings';
import { getTokenPrices } from '../../../jupiter/tokens';

/**
 * Display wallet holdings
 */
export async function handleHoldings(chatId: number, messageId: number): Promise<void> {
  try {
    // Get user's wallet address
    const walletAddress = await getWalletAddress(chatId);
    if (!walletAddress) {
      await editMessageWithButtons(chatId, messageId, '❌ Wallet not found. Please use /start first.', infoMenu);
      return;
    }

    // Get holdings data
    const holdings = await getHoldingsData(walletAddress);

    // Get token prices for all tokens
    const allMints = [
      'So11111111111111111111111111111111111111112', // SOL mint
      ...holdings.tokenHoldings.map(token => token.mint)
    ];
    
    const tokenPrices = await getTokenPrices(allMints);

    // Format the response
    let message = '💼 Wallet Holdings\n\n';
    let totalValue = 0;

    // Display SOL balance with value
    if (holdings.solUiAmount > 0) {
      const solPrice = tokenPrices['So11111111111111111111111111111111111111112']?.usdPrice || 0;
      const solValue = holdings.solUiAmount * solPrice;
      totalValue += solValue;
      message += `🟡 SOL: ${holdings.solBalance} ($${solValue.toFixed(2)})\n\n`;
    }

    // Display token holdings with values
    if (holdings.tokenHoldings.length > 0) {
      message += '🪙 Tokens:\n';
      for (const token of holdings.tokenHoldings.slice(0, 10)) {
        const tokenPrice = tokenPrices[token.mint]?.usdPrice || 0;
        const tokenValue = token.uiAmount * tokenPrice;
        totalValue += tokenValue;
        message += `• ${token.symbol}: ${token.uiAmountString} ($${tokenValue.toFixed(2)})\n`;
      }
      
      if (holdings.tokenHoldings.length > 10) {
        message += `... and ${holdings.tokenHoldings.length - 10} more tokens\n`;
      }
      message += '\n';
    }

    // Summary with total value
    message += `📊 Total: ${holdings.totalTokens} assets\n💰 Total Value: $${totalValue.toFixed(2)}`;

    await editMessageWithButtons(chatId, messageId, message, infoMenu);
  } catch (error) {
    console.error('Error fetching holdings:', error);
    await editMessageWithButtons(
      chatId,
      messageId,
      '❌ Error fetching holdings. Please try again later.',
      infoMenu
    );
  }
}
