import { SOL_MINT } from './constants';
import { getAssociatedTokenAddress, createTransferInstruction as createTokenTransferInstruction } from '@solana/spl-token'; 
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { getMintInfo } from './fetcher/getMint';

/**
 * Create transfer instruction for SOL or SPL tokens
 * @param signer - PublicKey of the signer/sender
 * @param amount - Amount to transfer in native units (lamports for SOL, smallest token units for SPL)
 * @param mint - PublicKey of the mint (use SOL_MINT for SOL transfers)
 * @param destination - PublicKey of the destination wallet
 * @returns TransactionInstruction for the transfer
 */
export async function createTransferInstruction(
  signer: PublicKey,
  amount: bigint,
  mint: PublicKey,
  destination: PublicKey
): Promise<TransactionInstruction> {
  if (mint.equals(SOL_MINT)) {
    // SOL transfer
    return SystemProgram.transfer({
      fromPubkey: signer,
      toPubkey: destination,
      lamports: amount,
    });
  } else {
    // SPL token transfer - get mint info to know the decimals and program
    const mintInfo = await getMintInfo(mint);
    
    if (!mintInfo) {
      throw new Error(`Failed to get mint info for ${mint.toString()}`);
    }

    // Get the token program from the mint info
    const tokenProgram = new PublicKey(mintInfo.programAddress);

    // Get source ATA (Associated Token Account)
    const sourceATA = await getAssociatedTokenAddress(
      mint,
      signer,
      false, // allowOwnerOffCurve
      tokenProgram
    );

    // Get destination ATA
    const destATA = await getAssociatedTokenAddress(
      mint,
      destination,
      false, // allowOwnerOffCurve
      tokenProgram
    );

    // Create transfer instruction
    return createTokenTransferInstruction(
      sourceATA,
      destATA,
      signer,
      amount
    );
  }
}
