import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { get, run } from '../db/database.ts';
import { notify } from '../domain/notifications.ts';
import { findById } from '../domain/professionals.ts';
import { ApiError } from '../lib/errors.ts';
import { paymentGateway } from './gateway.ts';
import type { PaymentKind, PaymentSessionRow } from './types.ts';

const SESSION_SELECT = `SELECT * FROM payment_sessions`;

export function getSessionByRef(providerRef: string): PaymentSessionRow | undefined {
  return get<PaymentSessionRow>(`${SESSION_SELECT} WHERE provider_ref = ?`, providerRef);
}

export function getSessionForPayer(providerRef: string, userId: number): PaymentSessionRow {
  const row = getSessionByRef(providerRef);
  if (!row) throw ApiError.notFound('That checkout session was not found.');
  if (row.payer_user_id !== userId) throw ApiError.forbidden();
  return row;
}

export function sessionDto(row: PaymentSessionRow) {
  return {
    id: row.provider_ref,
    provider: row.provider,
    kind: row.kind,
    status: row.status,
    amountCents: row.amount_cents,
    currency: row.currency,
    description: row.description,
    successPath: row.success_path,
    cancelPath: row.cancel_path,
  };
}

function originPath(path: string, query = ''): string {
  return `${config.publicUrl}${path}${query}`;
}

export async function startCheckout(input: {
  kind: PaymentKind;
  bookingId?: number;
  invoiceId?: number;
  payerUserId: number;
  customerEmail: string;
  amountCents: number;
  currency: string;
  description: string;
  successPath: string;
  cancelPath: string;
}): Promise<{ url: string; sessionId: string; provider: 'stripe' | 'demo' }> {
  if (input.amountCents < 1) throw ApiError.badRequest('There is nothing to charge on this invoice.');

  const targetId = input.kind === 'booking' ? input.bookingId : input.invoiceId;
  const pending = get<PaymentSessionRow>(
    `${SESSION_SELECT} WHERE kind = ? AND status = 'pending' AND payer_user_id = ? AND ${
      input.kind === 'booking' ? 'booking_id' : 'invoice_id'
    } = ? ORDER BY id DESC`,
    input.kind,
    input.payerUserId,
    targetId,
  );
  if (
    pending &&
    pending.provider === 'demo' &&
    pending.provider === config.paymentsProvider &&
    pending.amount_cents === input.amountCents
  ) {
    return {
      url: originPath(`/checkout/${pending.provider_ref}`),
      sessionId: pending.provider_ref,
      provider: 'demo',
    };
  }

  const gateway = paymentGateway();
  const { lastInsertRowid } = run(
    `INSERT INTO payment_sessions
       (provider, provider_ref, kind, booking_id, invoice_id, payer_user_id,
        amount_cents, currency, description, success_path, cancel_path, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    gateway.name,
    `pending_${randomUUID()}`,
    input.kind,
    input.bookingId ?? null,
    input.invoiceId ?? null,
    input.payerUserId,
    input.amountCents,
    input.currency,
    input.description,
    input.successPath,
    input.cancelPath,
  );

  const joiner = input.successPath.includes('?') ? '&' : '?';
  const remote = await gateway.createCheckout({
    kind: input.kind,
    amountCents: input.amountCents,
    currency: input.currency,
    description: input.description,
    customerEmail: input.customerEmail,
    successUrl: originPath(
      input.successPath,
      `${joiner}checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    ),
    cancelUrl: originPath(input.cancelPath, `${input.cancelPath.includes('?') ? '&' : '?'}checkout=cancel`),
    metadata: {
      kind: input.kind,
      paymentSessionId: String(lastInsertRowid),
      clientReference: `${input.kind}:${input.bookingId ?? input.invoiceId}`,
    },
  });

  run(
    `UPDATE payment_sessions SET provider_ref = ?, updated_at = datetime('now') WHERE id = ?`,
    remote.id,
    lastInsertRowid,
  );

  const url = gateway.name === 'demo' ? originPath(`/checkout/${remote.id}`) : remote.url;
  return { url, sessionId: remote.id, provider: gateway.name };
}

export async function fulfillSession(row: PaymentSessionRow, source: 'webhook' | 'demo' | 'confirm'): Promise<PaymentSessionRow> {
  if (row.status === 'paid') return row;

  if (row.kind === 'booking') {
    if (!row.booking_id) throw ApiError.badRequest('Checkout is missing its booking.');
    const booking = get<{
      id: number;
      reference: string;
      status: string;
      payment_status: string;
      total_cents: number | null;
      estimated_hours: number;
      hourly_rate_cents: number;
      callout_fee_cents: number;
      professional_id: number;
      professional_user_id: number;
      client_name: string;
    }>(
      `SELECT b.*, p.user_id AS professional_user_id, cu.full_name AS client_name
       FROM bookings b
       JOIN professionals p ON p.id = b.professional_id
       JOIN users cu ON cu.id = b.client_id
       WHERE b.id = ?`,
      row.booking_id,
    );
    if (!booking) throw ApiError.notFound('Booking not found.');
    if (booking.status !== 'completed') {
      throw ApiError.badRequest('Payment is only available after the job is completed.');
    }
    if (booking.payment_status !== 'paid') {
      const pro = findById(booking.professional_id);
      const total =
        booking.total_cents ??
        Math.round(booking.hourly_rate_cents * booking.estimated_hours) + booking.callout_fee_cents;
      const commission = Math.round((total * (pro?.plan_commission_bps ?? 0)) / 10_000);
      run(
        `UPDATE bookings
         SET payment_status = 'paid', commission_cents = ?, updated_at = datetime('now')
         WHERE id = ?`,
        commission,
        booking.id,
      );
      notify(
        booking.professional_user_id,
        'booking.paid',
        `${booking.reference} was paid`,
        `${booking.client_name} paid by card${source === 'demo' ? ' (test checkout)' : ''}.`,
        `/dashboard/bookings/${booking.id}`,
      );
    }
  } else {
    if (!row.invoice_id) throw ApiError.badRequest('Checkout is missing its membership invoice.');
    const invoice = get<{
      id: number;
      status: string;
      amount_cents: number;
      professional_id: number;
      user_id: number;
      display_name: string;
    }>(
      `SELECT i.*, p.user_id, p.display_name
       FROM subscription_invoices i
       JOIN professionals p ON p.id = i.professional_id
       WHERE i.id = ?`,
      row.invoice_id,
    );
    if (!invoice) throw ApiError.notFound('Invoice not found.');
    if (invoice.status === 'void') throw ApiError.badRequest('That invoice has been voided.');
    if (invoice.status !== 'paid') {
      run(`UPDATE subscription_invoices SET status = 'paid' WHERE id = ?`, invoice.id);
      notify(
        invoice.user_id,
        'invoice.paid',
        'Membership invoice paid',
        `Your £${(invoice.amount_cents / 100).toFixed(2)} membership invoice was paid by card.`,
        '/dashboard/billing',
      );
    }
  }

  run(
    `UPDATE payment_sessions SET status = 'paid', updated_at = datetime('now') WHERE id = ?`,
    row.id,
  );
  const updated = get<PaymentSessionRow>(`${SESSION_SELECT} WHERE id = ?`, row.id);
  if (!updated) throw ApiError.notFound('Checkout session missing after payment.');
  return updated;
}

export async function confirmProviderRef(providerRef: string, userId: number): Promise<PaymentSessionRow> {
  const row = getSessionForPayer(providerRef, userId);
  if (row.status === 'paid') return row;
  if (row.provider === 'stripe') {
    const paid = await paymentGateway().retrieveIfPaid(providerRef);
    if (!paid) throw ApiError.badRequest('Stripe has not recorded this payment yet.');
  } else if (row.provider === 'demo') {
    throw ApiError.badRequest('Finish the test checkout to complete this payment.');
  }
  return fulfillSession(row, 'confirm');
}

export async function completeDemoSession(providerRef: string, userId: number): Promise<PaymentSessionRow> {
  const row = getSessionForPayer(providerRef, userId);
  if (row.provider !== 'demo') {
    throw ApiError.badRequest('This checkout is handled by Stripe, not the test page.');
  }
  return fulfillSession(row, 'demo');
}

export async function fulfillProviderRef(providerRef: string): Promise<PaymentSessionRow | undefined> {
  const row = getSessionByRef(providerRef);
  if (!row) return undefined;
  return fulfillSession(row, 'webhook');
}
