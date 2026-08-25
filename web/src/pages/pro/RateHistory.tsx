import type { RateChange } from '../../lib/types';
import { formatDateTime, money } from '../../lib/format';
import { Badge } from '../../components/ui';
import { Icons } from '../../components/icons';

const FIELD_LABEL: Record<RateChange['field'], string> = {
  hourly_rate_cents: 'Hourly rate',
  monthly_fee_cents: 'Monthly membership fee',
  callout_fee_cents: 'Call-out fee',
  plan_id: 'Membership plan',
};

const ROLE_TONE: Record<RateChange['changed_by_role'], 'brand' | 'warning' | 'neutral'> = {
  professional: 'brand',
  admin: 'warning',
  system: 'neutral',
};

const ROLE_LABEL: Record<RateChange['changed_by_role'], string> = {
  professional: 'By you',
  admin: 'By SimplyServices',
  system: 'Automatic',
};

/**
 * Shared pricing audit trail. `actorPerspective` switches the wording between
 * the professional's own dashboard and the admin view of someone else.
 */
export function RateHistoryList({
  entries,
  currency = 'GBP',
  emptyLabel = 'Nothing recorded yet.',
  actorPerspective = 'self',
}: {
  entries: RateChange[];
  currency?: string;
  emptyLabel?: string;
  actorPerspective?: 'self' | 'admin';
}) {
  if (entries.length === 0) {
    return <p className="text-ink-500 px-3 py-6 text-center text-sm">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-ink-100 divide-y">
      {entries.map((entry) => {
        const isPlan = entry.field === 'plan_id';
        const roleLabel =
          actorPerspective === 'admin'
            ? entry.changed_by_role === 'professional'
              ? 'By the professional'
              : entry.changed_by_role === 'admin'
                ? `By ${entry.actor_name ?? 'an admin'}`
                : 'Automatic'
            : ROLE_LABEL[entry.changed_by_role];

        return (
          <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink-900 text-sm font-medium">{FIELD_LABEL[entry.field]}</span>
                <Badge tone={ROLE_TONE[entry.changed_by_role]}>{roleLabel}</Badge>
              </div>
              {entry.reason && <p className="text-ink-500 mt-0.5 text-xs">{entry.reason}</p>}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-ink-400 tabular-nums line-through">
                {entry.old_value === null
                  ? '—'
                  : isPlan
                    ? `#${entry.old_value}`
                    : money(entry.old_value, currency)}
              </span>
              <Icons.arrowRight className="text-ink-300 size-3.5" />
              <span className="text-ink-950 font-semibold tabular-nums">
                {isPlan ? `#${entry.new_value}` : money(entry.new_value, currency)}
              </span>
              <span className="text-ink-400 hidden w-36 text-right text-xs sm:block">
                {formatDateTime(entry.created_at)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
