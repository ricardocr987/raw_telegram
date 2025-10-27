// Recurring API Types
export interface TimeRecurringCreationParams {
  inAmount: number;
  numberOfOrders: number;
  interval: number;
  maxPrice?: number;
  minPrice?: number;
  startAt?: number;
}

export interface RecurringType {
  time: TimeRecurringCreationParams;
}

export interface CreateRecurringRequest {
  user: string;
  inputMint: string;
  outputMint: string;
  params: RecurringType;
}

export interface RecurringResponse {
  requestId: string;
  transaction: string;
}

export interface ExecuteRecurringRequest {
  requestId: string;
  signedTransaction: string;
}

export interface ExecuteRecurringResponse {
  error?: string;
  order?: string;
  signature: string;
  status: 'Success' | 'Failed';
}

export interface CloseRecurringRequest {
  user: string;
  order: string;
  recurringType: 'time' | 'price';
}

export interface OrderHistoryResponse {
  orderKey: string;
  keeper: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  rawInputAmount: string;
  rawOutputAmount: string;
  feeMint: string;
  feeAmount: string;
  rawFeeAmount: string;
  txId: string;
  confirmedAt: string;
  action: string;
  productMeta?: any;
}

export interface TimeRecurringResponse {
  userPubkey: string;
  orderKey: string;
  inputMint: string;
  outputMint: string;
  inDeposited: string;
  inWithdrawn: string;
  rawInDeposited: string;
  rawInWithdrawn: string;
  cycleFrequency: string;
  outWithdrawn: string;
  inAmountPerCycle: string;
  minOutAmount: string;
  maxOutAmount: string;
  inUsed: string;
  outReceived: string;
  rawOutWithdrawn: string;
  rawInAmountPerCycle: string;
  rawMinOutAmount: string;
  rawMaxOutAmount: string;
  rawInUsed: string;
  rawOutReceived: string;
  openTx: string;
  closeTx: string;
  userClosed: boolean;
  createdAt: string;
  updatedAt: string;
  trades: OrderHistoryResponse[];
}

export interface PriceRecurringResponse {
  userPubkey: string;
  orderKey: string;
  inputMint: string;
  outputMint: string;
  inDeposited: string;
  inWithdrawn: string;
  inLeft: string;
  inUsed: string;
  outReceived: string;
  outWithdrawn: string;
  orderInterval: string;
  incrementalUsdValue: string;
  supposedUsdValue: string;
  estimatedUsdcValueSpent: string;
  rawInDeposited: string;
  rawInWithdrawn: string;
  rawInLeft: string;
  rawInUsed: string;
  rawOutReceived: string;
  rawOutWithdrawn: string;
  rawIncrementalUsdValue: string;
  rawSupposedUsdValue: string;
  rawEstimatedUsdcValueSpent: string;
  status: string;
  closedBy: string;
  openTx: string;
  closeTx: string;
  createdAt: string;
  startAt: string;
  updatedAt: string;
  trades: OrderHistoryResponse[];
}

export interface AllRecurringResponse {
  recurringType: 'time' | 'price';
  [key: string]: any; // Union of TimeRecurringResponse and PriceRecurringResponse
}

export interface GetRecurringOrdersResponse {
  user: string;
  orderStatus: 'active' | 'history';
  time?: TimeRecurringResponse[];
  price?: PriceRecurringResponse[];
  all?: AllRecurringResponse[];
  totalPages: number;
  page: number;
}

// API Base URL
const RECURRING_BASE_URL = 'https://lite-api.jup.ag/recurring/v1';

// Recurring API Functions
export async function createRecurringOrder(
  request: CreateRecurringRequest
): Promise<RecurringResponse> {
  try {
    console.log('🔄 Jupiter Recurring API Request:', JSON.stringify(request, null, 2));
    
    const response = await fetch(`${RECURRING_BASE_URL}/createOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Recurring API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as RecurringResponse;
    console.log('✅ Jupiter Recurring API Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Error creating recurring order:', error);
    throw error;
  }
}

export async function executeRecurringOrder(
  request: ExecuteRecurringRequest
): Promise<ExecuteRecurringResponse> {
  try {
    const response = await fetch(`${RECURRING_BASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Recurring API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as ExecuteRecurringResponse;
  } catch (error) {
    console.error('Error executing recurring order:', error);
    throw error;
  }
}

export async function cancelRecurringOrder(
  request: CloseRecurringRequest
): Promise<RecurringResponse> {
  try {
    const response = await fetch(`${RECURRING_BASE_URL}/cancelOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Recurring API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as RecurringResponse;
  } catch (error) {
    console.error('Error canceling recurring order:', error);
    throw error;
  }
}

export async function getRecurringOrders(
  recurringType: 'time' | 'price' | 'all',
  orderStatus: 'active' | 'history',
  user: string,
  page: number,
  mint?: string | null,
  includeFailedTx: boolean = false
): Promise<GetRecurringOrdersResponse> {
  try {
    const params = new URLSearchParams({
      recurringType,
      orderStatus,
      user,
      page: page.toString(),
      includeFailedTx: includeFailedTx.toString(),
    });

    if (mint) {
      params.append('mint', mint);
    }

    const response = await fetch(`${RECURRING_BASE_URL}/getRecurringOrders?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Recurring API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as GetRecurringOrdersResponse;
  } catch (error) {
    console.error('Error getting recurring orders:', error);
    throw error;
  }
}
