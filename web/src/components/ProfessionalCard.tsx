import { Link } from 'react-router-dom';
import type { Professional } from '../lib/types';
import { locationLabel, money, pluralise } from '../lib/format';
import { Avatar, Badge, Stars } from './ui';
import { Icons } from './icons';

export function ProfessionalCard({ pro }: { pro: Professional }) {
  return (
    <Link
      to={`/pro/${pro.slug}`}
      className="card hover:shadow-lift hover:border-brand-200 group flex flex-col p-5 transition"
    >
      <div className="flex items-start gap-4">
        <Avatar name={pro.displayName} size="lg" src={pro.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-ink-950 group-hover:text-brand-700 truncate text-base font-semibold transition">
                {pro.displayName}
              </h3>
              <p className="text-ink-500 truncate text-sm">{pro.businessName ?? pro.category.name}</p>
            </div>
            {pro.verificationStatus === 'verified' && (
              <Badge tone="success" className="shrink-0">
                <Icons.shieldCheck className="size-3" /> Verified
              </Badge>
            )}
          </div>
          <div className="mt-2">
            <Stars value={pro.rating.average} count={pro.rating.count} size="sm" />
          </div>
        </div>
      </div>

      <p className="text-ink-700 mt-4 line-clamp-2 text-sm leading-relaxed">{pro.headline}</p>

      <div className="text-ink-500 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <Icons.pin className="size-3.5" /> {locationLabel(pro.location)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icons.briefcase className="size-3.5" /> {pluralise(pro.yearsExperience, 'year')} experience
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icons.clock className="size-3.5" /> Replies in ~{pro.responseTimeHours}h
        </span>
      </div>

      {pro.specialties.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {pro.specialties.slice(0, 3).map((s) => (
            <span key={s} className="bg-ink-100 text-ink-600 rounded-md px-2 py-1 text-xs">
              {s}
            </span>
          ))}
          {pro.specialties.length > 3 && (
            <span className="text-ink-400 px-1 py-1 text-xs">+{pro.specialties.length - 3} more</span>
          )}
        </div>
      )}

      <div className="border-ink-100 mt-4 flex items-end justify-between border-t pt-4">
        <div>
          <p className="text-ink-950 text-lg font-semibold">
            {money(pro.pricing.hourlyRateCents, pro.pricing.currency)}
            <span className="text-ink-500 text-sm font-normal"> /hour</span>
          </p>
          {pro.pricing.freeConsultation && (
            <p className="mt-0.5 text-xs font-medium text-emerald-600">Free first consultation</p>
          )}
        </div>
        <span className="text-brand-700 inline-flex items-center gap-1 text-sm font-medium">
          View profile <Icons.arrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}
