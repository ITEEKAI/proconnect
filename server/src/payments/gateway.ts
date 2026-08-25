import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { ApiError } from '../lib/errors.ts';
import type { CreateCheckoutInput, PaymentGateway, RemoteCheckout } from './types.ts';

class DemoGateway implements PaymentGateway {
  readonly name = 'demo' as const;

  async createCheckout(input: CreateCheckoutInput): Promise<RemoteCheckout> {
    const id = `demo_${randomUUID()}`;
    const url = new URL(`/checkout/${id}`, `${config.publicUrl}/`);
    url.searchParams.set('amount', String(input.amountCents));
    return { id, url: url.toString() };
  }

  async retrieveIfPaid(_providerRef: string): Promise<boolean> {
    return false;
  }

  async parseWebhook(): Promise<string | null> {
    return null;
  }
}

class StripeGateway implements PaymentGateway {
  readonly name = 'stripe' as const;
  #client: import('stripe').default | null = null;

  async #stripe(): Promise<import('stripe').default> {
    if (this.#client) return this.#client;
    const Stripe = (await import('stripe')).default;
    this.#client = new Stripe(config.stripeSecretKey);
    return this.#client;
  }

  async createCheckout(input: CreateCheckoutInput): Promise<RemoteCheckout> {
    if (!config.publicUrl.startsWith('http')) {
      throw ApiError.badRequest('Set PUBLIC_URL to your https origin before taking Stripe payments.');
    }
    const stripe = await this.#stripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail,
      client_reference_id: input.metadata.clientReference,
      metadata: input.metadata,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountCents,
            product_data: { name: input.description },
          },
        },
      ],
    });
    if (!session.url) throw ApiError.badRequest('Stripe did not return a checkout URL.');
    return { id: session.id, url: session.url };
  }

  async retrieveIfPaid(providerRef: string): Promise<boolean> {
    const stripe = await this.#stripe();
    const session = await stripe.checkout.sessions.retrieve(providerRef);
    return session.payment_status === 'paid' || session.status === 'complete';
  }

  async parseWebhook(rawBody: Buffer, signature: string): Promise<string | null> {
    if (!config.stripeWebhookSecret) {
      throw ApiError.badRequest('STRIPE_WEBHOOK_SECRET is not configured.');
    }
    const stripe = await this.#stripe();
    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
      if (event.type !== 'checkout.session.completed') return null;
      const session = event.data.object as { id?: string };
      return session.id ?? null;
    } catch {
      throw ApiError.badRequest('Invalid Stripe signature.');
    }
  }
}

let cached: PaymentGateway | null = null;

export function paymentGateway(): PaymentGateway {
  if (!cached) {
    cached = config.paymentsProvider === 'stripe' ? new StripeGateway() : new DemoGateway();
  }
  return cached;
}

/** Test hook so a suite can force the demo gateway even if env leaked a key. */
export function resetPaymentGateway(): void {
  cached = null;
}
