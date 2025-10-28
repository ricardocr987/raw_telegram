// Trigger API Types
export interface CreateOrderRequest {
  inputMint: string;
  outputMint: string;
  maker: string;
  payer: string;
  params: {
    makingAmount: string;
    takingAmount: string;
    expiredAt?: string;
    slippageBps?: string;
    feeBps?: string;
  };
  computeUnitPrice?: string;
  feeAccount?: string;
  wrapAndUnwrapSol?: boolean;
}

export interface CreateOrderResponse {
  requestId: string;
  transaction: string;
  order?: string;
}

export interface ExecuteRequest {
  requestId: string;
  signedTransaction: string;
}

export interface ExecuteResponse {
  code: number;
  signature: string;
  status: 'Success' | 'Failed';
}

export interface CancelOrderRequest {
  maker: string;
  order: string;
  computeUnitPrice?: string;
}

export interface CancelOrderResponse {
  requestId: string;
  transaction: string;
}

export interface CancelOrdersRequest {
  maker: string;
  orders?: string[];
  computeUnitPrice?: string;
}

export interface CancelOrdersResponse {
  requestId: string;
  transactions: string[];
}

export interface TriggerOrder {
  userPubkey: string;
  orderKey: string;
  inputMint: string;
  outputMint: string;
  makingAmount: string;
  takingAmount: string;
  remainingMakingAmount: string;
  remainingTakingAmount: string;
  rawMakingAmount: string;
  rawTakingAmount: string;
  rawRemainingMakingAmount: string;
  rawRemainingTakingAmount: string;
  slippageBps: string;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  openTx: string;
  closeTx: string;
  programVersion: string;
  trades: TriggerTrade[];
}

export interface TriggerTrade {
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
  productMeta: any | null;
}

export interface GetTriggerOrdersResponse {
  user: string;
  orderStatus: 'active' | 'history';
  orders: TriggerOrder[];
  totalPages: number;
  page: number;
}

// API Base URL
const TRIGGER_BASE_URL = 'https://lite-api.jup.ag/trigger/v1';

// Trigger API Functions
export async function createTriggerOrder(
  request: CreateOrderRequest
): Promise<CreateOrderResponse> {
  try {
    console.log('🔄 Jupiter Trigger API Request:', JSON.stringify(request, null, 2));
    
    const response = await fetch(`${TRIGGER_BASE_URL}/createOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Trigger API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json() as CreateOrderResponse;
    console.log('✅ Jupiter Trigger API Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Error creating trigger order:', error);
    throw error;
  }
}

export async function executeTriggerOrder(
  request: ExecuteRequest
): Promise<ExecuteResponse> {
  try {
    console.log('🔄 Jupiter Trigger Execute Request:', JSON.stringify(request, null, 2));
    
    const response = await fetch(`${TRIGGER_BASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Trigger API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.json() as { error?: string; errorMessage?: string; code?: number };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If we can't parse the error body, use the default message
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json() as ExecuteResponse;
    console.log('✅ Jupiter Trigger Execute Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Error executing trigger order:', error);
    throw error;
  }
}

export async function cancelTriggerOrder(
  request: CancelOrderRequest
): Promise<CancelOrderResponse> {
  try {
    const response = await fetch(`${TRIGGER_BASE_URL}/cancelOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Trigger API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as CancelOrderResponse;
  } catch (error) {
    console.error('Error canceling trigger order:', error);
    throw error;
  }
}

export async function cancelTriggerOrders(
  request: CancelOrdersRequest
): Promise<CancelOrdersResponse> {
  try {
    const response = await fetch(`${TRIGGER_BASE_URL}/cancelOrders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Trigger API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as CancelOrdersResponse;
  } catch (error) {
    console.error('Error canceling trigger orders:', error);
    throw error;
  }
}

export async function getTriggerOrders(
  user: string,
  orderStatus: 'active' | 'history',
  page: string = '1',
  includeFailedTx?: 'true' | 'false',
  inputMint?: string,
  outputMint?: string
): Promise<GetTriggerOrdersResponse> {
  try {
    const params = new URLSearchParams({
      user,
      orderStatus,
      page,
    });

    if (includeFailedTx) params.append('includeFailedTx', includeFailedTx);
    if (inputMint) params.append('inputMint', inputMint);
    if (outputMint) params.append('outputMint', outputMint);

    const response = await fetch(`${TRIGGER_BASE_URL}/getTriggerOrders?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Trigger API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as GetTriggerOrdersResponse;
  } catch (error) {
    console.error('Error getting trigger orders:', error);
    throw error;
  }
}
