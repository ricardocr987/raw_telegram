import { 
    TransactionInstruction, 
    PublicKey, 
    ComputeBudgetProgram, 
    TransactionMessage, 
    VersionedTransaction,
    AddressLookupTableAccount,
    type Commitment,
} from "@solana/web3.js";
import { config } from "../../config";
  
const MAX_COMPUTE_UNITS = 1_400_000;
const MIN_LAMPORTS_PER_CU = 10_000;
const MAX_LAMPORTS_PER_CU = 70_000;

export interface PriorityFeeResponse {
    jsonrpc: string;
    result: {
      priorityFeeEstimate: number;
      priorityFeeLevels?: {
        min: number;
        low: number;
        medium: number;
        high: number;
        veryHigh: number;
        unsafeMax: number;
      };
    };
    id: string;
}

async function getComputeUnits(
  transaction: VersionedTransaction
): Promise<{ units: number; error?: string }> {  
  const simulateConfig = {
    replaceRecentBlockhash: false,
    sigVerify: false,
    commitment: 'confirmed' as Commitment,
  };

  const simulation = await config.RPC_CONNECTION.simulateTransaction(transaction, simulateConfig);

  if (simulation.value.err && simulation.value.logs) {
    if ((simulation.value.err as any).InsufficientFundsForRent) {
      throw new Error('You need more SOL to pay for transaction fees');
    }

    if (simulation.value.logs.length === 0) {
      throw new Error('You need more SOL to pay for transaction fees');
    }

    const numLogs = simulation.value.logs.length;
    const lastLogs = simulation.value.logs.slice(Math.max(numLogs - 10, 0));
    console.log(`Last ${lastLogs.length} Solana simulation logs:`, lastLogs);

    for (const log of simulation.value.logs) {
      if (log.includes('0x1771') || log.includes('0x178c')) {
        throw new Error('Maximum slippage reached');
      }
      if (
        log.includes(
          'Program 11111111111111111111111111111111 failed: custom program error: 0x1'
        ) ||
        log.includes('insufficient lamports')
      ) {
        throw new Error('You need more SOL to pay for transaction fees');
      }
    }

    throw new Error('Transaction simulation error');
  }


  return { units: Number(simulation.value.unitsConsumed) || MAX_COMPUTE_UNITS };
}

async function getPriorityFeeEstimate(
  wireTransaction: string,
): Promise<number> {
  try {
    const response = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${config.HELIUS_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'getPriorityFeeEstimate',
          params: [
            {
              transaction: wireTransaction,
              options: {
                recommended: true,
                transactionEncoding: 'base64',
              },
            },
          ],
        }),
      }
    ) as any;

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as PriorityFeeResponse;

    if (!data.result?.priorityFeeEstimate) {
      return MIN_LAMPORTS_PER_CU;
    }

    return Math.min(Math.max(data.result.priorityFeeEstimate, MIN_LAMPORTS_PER_CU), MAX_LAMPORTS_PER_CU);
  } catch (error) {
    console.error('Error getting priority fee estimate:', error);
    return MIN_LAMPORTS_PER_CU;
  }
}

export async function prepareLegacyTransaction(
  instructions: TransactionInstruction[], 
  payerKey: PublicKey, 
  lookupTableAccounts: AddressLookupTableAccount[], 
  recentBlockhash?: string,
  simulate: boolean = true
): Promise<string> {   
  if (!recentBlockhash) throw new Error("Recent blockhash is required");
  if (!simulate) {
    const messageV0 = new TransactionMessage({
      payerKey,
      recentBlockhash,
      instructions: instructions,
    }).compileToV0Message(lookupTableAccounts);
    const transaction = new VersionedTransaction(messageV0);
    return Buffer.from(transaction.serialize()).toString('base64');
  }
  // Validate instructions array
  if (!Array.isArray(instructions) || instructions.length === 0) {
    throw new Error("Invalid instructions array provided");
  }

  const tempComputeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: MAX_COMPUTE_UNITS,
  });
  
  const tempComputePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: MIN_LAMPORTS_PER_CU,
  });
  
  const testInstructions = [tempComputePriceIx, tempComputeBudgetIx, ...instructions];

  const testMessage = new TransactionMessage({
    payerKey: payerKey,
    recentBlockhash: recentBlockhash ?? PublicKey.default.toBase58(),
    instructions: testInstructions,
  }).compileToV0Message(lookupTableAccounts);

  const testTransaction = new VersionedTransaction(testMessage);

  try {
    const [computeUnitsResult, microLamports] = await Promise.all([
      getComputeUnits(testTransaction),
      getPriorityFeeEstimate(Buffer.from(testTransaction.serialize()).toString('base64'))
    ]);
    console.log('compute units result', computeUnitsResult);
    console.log('micro lamports', microLamports);
  
    if (computeUnitsResult.error) {
      console.error(`Simulation error: ${computeUnitsResult.error}`);
      throw new Error(`Simulation error: ${computeUnitsResult.error}`);
    }
  
    const units = Math.ceil(computeUnitsResult.units * 1.2);
    console.log('Estimated compute units:', units);
    if (units === 0) throw new Error("Failed to estimate compute units");
    
    const lamportsPerCu = Math.min(Math.max(microLamports, MIN_LAMPORTS_PER_CU), MAX_LAMPORTS_PER_CU);
    console.log(`Priority fee estimate: ${lamportsPerCu} lamports per CU`);
  
    // Create compute budget instructions
    const computePriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: lamportsPerCu });
    const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({ units });
  
    // Create a new array with compute budget instructions first
    const allInstructions = [computePriceInstruction, computeBudgetInstruction, ...instructions];
  
    console.log('Total instructions:', allInstructions.length);
    console.log('Compute budget instructions added:', allInstructions.slice(0, 2).map(ix => ix.programId.toBase58()));
    
    const messageV0 = new TransactionMessage({
      payerKey,
      recentBlockhash,
      instructions: allInstructions,
    }).compileToV0Message(lookupTableAccounts);
    const transaction = new VersionedTransaction(messageV0);
  
    return Buffer.from(transaction.serialize()).toString('base64');
  } catch (error) {
    return '';
  }
}