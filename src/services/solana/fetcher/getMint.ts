import { Connection, PublicKey } from '@solana/web3.js';
import { unpackMint, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { config } from '../../../config';

export type MintInfo = {
  address: string;
  executable: boolean;
  lamports: number;
  programAddress: string;
  mintAuthorityOption: number;
  mintAuthority: string | null;
  supply: string;
  decimals: number;
  isInitialized: boolean;
  freezeAuthorityOption: number;
  freezeAuthority: string | null;
};

/**
 * Get mint information for a given mint address
 * @param mintAddress - The mint address as a string or PublicKey
 * @returns MintInfo object with decoded mint data or null if not found/invalid
 */
export async function getMintInfo(
  mintAddress: string | PublicKey
): Promise<MintInfo | null> {
  try {
    const connection = config.RPC_CONNECTION;
    const mintPubkey = typeof mintAddress === 'string' 
      ? new PublicKey(mintAddress) 
      : mintAddress;

    // Get account info
    const accountInfo = await connection.getAccountInfo(mintPubkey);

    if (!accountInfo) {
      console.warn(`No account found for mint: ${mintPubkey.toString()}`);
      return null;
    }

    if (!accountInfo.data) {
      console.warn(`No data found for mint: ${mintPubkey.toString()}`);
      return null;
    }

    // Decode the mint data using SPL Token library
    const mintData = unpackMint(mintPubkey, accountInfo, TOKEN_PROGRAM_ID);

    return {
      address: mintPubkey.toString(),
      executable: accountInfo.executable,
      lamports: accountInfo.lamports,
      programAddress: accountInfo.owner.toString(),
      mintAuthorityOption: mintData.mintAuthority ? 1 : 0,
      mintAuthority: mintData.mintAuthority?.toString() || null,
      supply: mintData.supply.toString(),
      decimals: mintData.decimals,
      isInitialized: mintData.isInitialized,
      freezeAuthorityOption: mintData.freezeAuthority ? 1 : 0,
      freezeAuthority: mintData.freezeAuthority?.toString() || null,
    };
  } catch (error) {
    console.error('Error getting mint info:', error);
    return null;
  }
}

/**
 * Get multiple mint informations in batch
 * @param mintAddresses - Array of mint addresses
 * @returns Record mapping mint address to MintInfo
 */
export async function getMintInfos(
  mintAddresses: (string | PublicKey)[]
): Promise<Record<string, MintInfo>> {
  if (mintAddresses.length === 0) return {};

  try {
    const connection = config.RPC_CONNECTION;
    const pubkeys = mintAddresses.map(addr => 
      typeof addr === 'string' ? new PublicKey(addr) : addr
    );

    // Get multiple account infos
    const accountInfos = await connection.getMultipleAccountsInfo(pubkeys);
    
    const results: Record<string, MintInfo> = {};

    accountInfos.forEach((accountInfo, index) => {
      try {
        const mintPubkey = pubkeys[index];
        
        if (!mintPubkey) return;

        if (!accountInfo) {
          console.warn(`No account found for mint: ${mintPubkey.toString()}`);
          return;
        }

        if (!accountInfo.data) {
          console.warn(`No data found for mint: ${mintPubkey.toString()}`);
          return;
        }

        // Decode the mint data
        const mintData = unpackMint(mintPubkey, accountInfo, TOKEN_PROGRAM_ID);

        results[mintPubkey.toString()] = {
          address: mintPubkey.toString(),
          executable: accountInfo.executable,
          lamports: accountInfo.lamports,
          programAddress: accountInfo.owner.toString(),
          mintAuthorityOption: mintData.mintAuthority ? 1 : 0,
          mintAuthority: mintData.mintAuthority?.toString() || null,
          supply: mintData.supply.toString(),
          decimals: mintData.decimals,
          isInitialized: mintData.isInitialized,
          freezeAuthorityOption: mintData.freezeAuthority ? 1 : 0,
          freezeAuthority: mintData.freezeAuthority?.toString() || null,
        };
      } catch (error) {
        console.error(`Error processing mint at index ${index}:`, error);
      }
    });

    return results;
  } catch (error) {
    console.error('Error getting multiple mint infos:', error);
    return {};
  }
}
