export type PaymentKind = 'booking' | 'membership';
export type PaymentProviderName = 'stripe' | 'demo';
export type PaymentSessionStatus = 'pending' | 'paid' | 'cancelled';

export interface PaymentSessionRow {
  id: number;
  provider: PaymentProviderName;
  provider_ref: string;
  kind: PaymentKind;
  booking_id: number | null;
  invoice_id: number | null;
  payer_user_id: number;
  amount_cents: number;
  currency: string;
  description: string;
  success_path: string;
  cancel_path: string;
  status: PaymentSessionStatus;
}

export interface CreateCheckoutInput {
  kind: PaymentKind;
  amountCents: number;
  currency: string;
  description: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export interface RemoteCheckout {
  id: string;
  url: string;
}

export interface PaymentGateway {
  readonly name: PaymentProviderName;
  createCheckout(input: CreateCheckoutInput): Promise<RemoteCheckout>;
  retrieveIfPaid(providerRef: string): Promise<boolean>;
  parseWebhook(rawBody: Buffer, signature: string): Promise<string | null>;
}
