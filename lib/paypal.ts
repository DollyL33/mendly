// Every call Mendly makes to PayPal lives in this file.
//
// - Holding, taking and releasing Linda's money use PayPal's official Server SDK
//   (@paypal/paypal-server-sdk): Orders v2 and Payments v2.
// - Paying Marco uses the Payouts v1 REST API directly, because the Server SDK
//   does not include Payouts.
//
// This file only runs on the server. The client secret never reaches a browser.

import {
  ApiError,
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController,
  PaymentsController,
} from "@paypal/paypal-server-sdk";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Add it to .env.local (see .env.example).`);
  return value;
}

const apiBase = () => process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

let sdk: { orders: OrdersController; payments: PaymentsController } | null = null;

function paypal() {
  if (!sdk) {
    const client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: requireEnv("PAYPAL_CLIENT_ID"),
        oAuthClientSecret: requireEnv("PAYPAL_CLIENT_SECRET"),
      },
      environment: apiBase().includes("sandbox") ? Environment.Sandbox : Environment.Production,
      timeout: 30_000,
    });
    sdk = { orders: new OrdersController(client), payments: new PaymentsController(client) };
  }
  return sdk;
}

/** Turns an SDK or REST failure into one readable message. */
export function describePayPalError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.result ?? err.body;
    return `PayPal said ${err.statusCode}: ${typeof body === "string" ? body : JSON.stringify(body)}`;
  }
  return err instanceof Error ? err.message : String(err);
}

const toValue = (cents: number) => (cents / 100).toFixed(2);

// ---------------------------------------------------------------------------
// Linda's money: hold, take, release (Server SDK)
// ---------------------------------------------------------------------------

export interface CreateOrderOptions {
  amountCents: number;
  jobId: string;
  description: string;
  /** Where PayPal sends Linda after approving, when not using the PayPal button. */
  returnUrl?: string;
  cancelUrl?: string;
  /** Fallback only: make Marco the order's payee, so capture pays him directly. */
  payeeEmail?: string;
}

/** Creates an order that will HOLD the money (intent AUTHORIZE), not charge it. */
export async function createAuthorizeOrder(opts: CreateOrderOptions) {
  const { result } = await paypal().orders.createOrder({
    body: {
      intent: CheckoutPaymentIntent.Authorize,
      purchaseUnits: [
        {
          referenceId: opts.jobId,
          description: opts.description.slice(0, 127),
          amount: { currencyCode: "USD", value: toValue(opts.amountCents) },
          ...(opts.payeeEmail ? { payee: { emailAddress: opts.payeeEmail } } : {}),
        },
      ],
      ...(opts.returnUrl
        ? {
            paymentSource: {
              paypal: {
                experienceContext: {
                  brandName: "Mendly",
                  returnUrl: opts.returnUrl,
                  cancelUrl: opts.cancelUrl ?? opts.returnUrl,
                },
              },
            },
          }
        : {}),
    },
    prefer: "return=representation",
  });
  const approveLink = result.links?.find((l) => l.rel === "approve" || l.rel === "payer-action")?.href;
  if (!result.id) throw new Error("PayPal did not return an order ID.");
  return { orderId: result.id, status: result.status, approveLink };
}

export async function getOrderStatus(orderId: string) {
  const { result } = await paypal().orders.getOrder({ id: orderId });
  return result.status as string | undefined;
}

/** After Linda approves: place the hold. Returns the authorization ID we capture or void later. */
export async function authorizeOrder(orderId: string) {
  const { result } = await paypal().orders.authorizeOrder({
    id: orderId,
    prefer: "return=representation",
  });
  const auth = result.purchaseUnits?.[0]?.payments?.authorizations?.[0];
  if (!auth?.id) throw new Error("PayPal did not return an authorization ID.");
  return { authorizationId: auth.id, status: auth.status as string | undefined, expiresAt: auth.expirationTime };
}

/** Takes the held money into Mendly's business account. */
export async function captureAuthorization(authorizationId: string, jobId: string) {
  const { result } = await paypal().payments.captureAuthorizedPayment({
    authorizationId,
    // Same request ID on a retry means PayPal won't capture twice.
    paypalRequestId: `capture-${jobId}`,
    prefer: "return=representation",
    body: { finalCapture: true },
  });
  if (!result.id) throw new Error("PayPal did not return a capture ID.");
  return { captureId: result.id, status: result.status as string | undefined };
}

/** Releases the hold. Linda is never charged. */
export async function voidAuthorization(authorizationId: string) {
  await paypal().payments.voidPayment({ authorizationId });
}

// ---------------------------------------------------------------------------
// Marco's money: payouts (REST, not in the Server SDK)
// ---------------------------------------------------------------------------

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const basic = Buffer.from(`${requireEnv("PAYPAL_CLIENT_ID")}:${requireEnv("PAYPAL_CLIENT_SECRET")}`).toString("base64");
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal login failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function payoutsRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PayPal said ${res.status}: ${text}`);
  return JSON.parse(text) as T;
}

export interface PayoutResult {
  batchId: string;
  batchStatus: string;
}

/**
 * Sends the job's amount to Marco. `senderBatchId` must be unique per payment:
 * PayPal refuses a repeated ID, which is what stops Marco being paid twice.
 */
export async function createPayout(opts: {
  senderBatchId: string;
  amountCents: number;
  receiverEmail: string;
  note: string;
}): Promise<PayoutResult> {
  const data = await payoutsRequest<{ batch_header: { payout_batch_id: string; batch_status: string } }>(
    "/v1/payments/payouts",
    {
      method: "POST",
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: opts.senderBatchId,
          email_subject: "You've been paid for a Mendly repair",
          email_message: opts.note,
        },
        items: [
          {
            recipient_type: "EMAIL",
            receiver: opts.receiverEmail,
            amount: { value: toValue(opts.amountCents), currency: "USD" },
            note: opts.note,
            sender_item_id: opts.senderBatchId,
          },
        ],
      }),
    },
  );
  return { batchId: data.batch_header.payout_batch_id, batchStatus: data.batch_header.batch_status };
}

export interface PayoutStatus {
  batchStatus: string;
  /** Status of the single payment to Marco, e.g. SUCCESS, PENDING, UNCLAIMED. */
  itemStatus?: string;
  itemError?: string;
}

export async function getPayoutStatus(batchId: string): Promise<PayoutStatus> {
  const data = await payoutsRequest<{
    batch_header: { batch_status: string };
    items?: { transaction_status?: string; errors?: { name?: string; message?: string } }[];
  }>(`/v1/payments/payouts/${encodeURIComponent(batchId)}`);
  const item = data.items?.[0];
  return {
    batchStatus: data.batch_header.batch_status,
    itemStatus: item?.transaction_status,
    itemError: item?.errors ? `${item.errors.name ?? ""} ${item.errors.message ?? ""}`.trim() : undefined,
  };
}
