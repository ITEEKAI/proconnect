import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { locationLabel, money, pluralise } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Category, Professional } from '../../lib/types';
import { CategoryIcon, Icons } from '../../components/icons';
import { ProfessionalCard } from '../../components/ProfessionalCard';
import { Avatar, Badge, Button, LinkButton, Skeleton, Stars } from '../../components/ui';

export function Home() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [where, setWhere] = useState('');

  const categories = useAsync(() => api<{ categories: Category[] }>('/directory/categories'));
  const featured = useAsync(() =>
    api<{ results: Professional[] }>('/directory/professionals?sort=rating&pageSize=6'),
  );
  const stats = useAsync(() =>
    api<{ professionals: number; categories: number; bookings: number; averageRating: number }>(
      '/directory/stats',
    ),
  );

  function search(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (term.trim()) params.set('q', term.trim());
    if (where.trim()) params.set('location', where.trim());
    navigate(`/browse?${params.toString()}`);
  }

  return (
    <>
      {/* Hero */}
      <section className="from-ink-950 via-ink-950 to-brand-950 relative overflow-hidden bg-gradient-to-br">
        <div
          aria-hidden
          className="bg-brand-600/25 absolute -top-32 -right-24 size-[28rem] rounded-full blur-3xl"
        />
        <div aria-hidden className="absolute -bottom-40 -left-20 size-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="container-page relative grid items-center gap-12 py-20 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:py-28">
          <div>
            <span className="ring-brand-400/30 bg-brand-500/10 text-brand-200 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset">
              <Icons.shieldCheck className="size-3.5" />
              Every professional is identity and credential checked
            </span>
            <h1 className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-white sm:text-5xl">
              Find the right professional.
              <br />
              <span className="text-brand-300">Pay by the hour, not by the guess.</span>
            </h1>
            <p className="text-ink-300 mt-5 max-w-2xl text-lg leading-relaxed">
              Lawyers, accountants, electricians, plumbers, estate agents, architects and coaches — all
              with published hourly rates, real client reviews and a booking you can track.
            </p>

            <form
              onSubmit={search}
              className="shadow-lift mt-8 flex flex-col gap-2 rounded-2xl bg-white p-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <Icons.search className="text-ink-400 pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="What do you need help with?"
                  aria-label="What do you need help with?"
                  className="text-ink-900 placeholder:text-ink-400 h-12 w-full rounded-xl pr-3 pl-10 text-sm focus:outline-none"
                />
              </div>
              <div className="bg-ink-100 hidden w-px sm:block" />
              <div className="relative sm:w-48">
                <Icons.pin className="text-ink-400 pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                <input
                  value={where}
                  onChange={(e) => setWhere(e.target.value)}
                  placeholder="Town or city"
                  aria-label="Town or city"
                  className="text-ink-900 placeholder:text-ink-400 h-12 w-full rounded-xl pr-3 pl-10 text-sm focus:outline-none"
                />
              </div>
              <Button type="submit" size="lg" className="sm:w-auto">
                <Icons.search className="size-4" /> Search
              </Button>
            </form>

            <div className="text-ink-400 mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span>Popular:</span>
              {['Divorce solicitor', 'Self assessment', 'EV charger', 'Boiler replacement', 'Loft conversion'].map(
                (item) => (
                  <Link
                    key={item}
                    to={`/browse?q=${encodeURIComponent(item)}`}
                    className="hover:text-brand-300 underline-offset-4 transition hover:underline"
                  >
                    {item}
                  </Link>
                ),
              )}
            </div>

            <dl className="border-ink-800/80 mt-14 grid grid-cols-2 gap-6 border-t pt-8 sm:grid-cols-4">
              <HeroStat
                label="Vetted professionals"
                value={stats.data ? `${stats.data.professionals}` : '—'}
              />
              <HeroStat label="Fields of expertise" value={stats.data ? `${stats.data.categories}` : '—'} />
              <HeroStat label="Jobs booked" value={stats.data ? `${stats.data.bookings}` : '—'} />
              <HeroStat
                label="Average rating"
                value={stats.data ? `${stats.data.averageRating.toFixed(1)} / 5` : '—'}
              />
            </dl>
          </div>

          <HeroPreview professional={featured.data?.results[0]} />
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-16 lg:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-ink-950 text-2xl font-semibold tracking-tight sm:text-3xl">
              Browse by field of expertise
            </h2>
            <p className="text-ink-500 mt-2">
              Ten professions and counting, each with published rates and verified credentials.
            </p>
          </div>
          <LinkButton to="/categories" variant="secondary">
            All categories <Icons.arrowRight className="size-4" />
          </LinkButton>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.loading &&
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          {categories.data?.categories.map((category) => (
            <Link
              key={category.id}
              to={`/browse?category=${category.slug}`}
              className="card hover:border-brand-300 hover:shadow-lift group p-5 transition"
            >
              <span className="bg-brand-50 text-brand-600 group-hover:bg-brand-600 flex size-11 items-center justify-center rounded-xl transition group-hover:text-white">
                <CategoryIcon name={category.icon} className="size-5" />
              </span>
              <h3 className="text-ink-950 mt-4 font-semibold">{category.name}</h3>
              <p className="text-ink-500 mt-1 line-clamp-2 text-sm">{category.description}</p>
              <div className="border-ink-100 text-ink-500 mt-4 flex items-center justify-between border-t pt-3 text-xs">
                <span>{pluralise(category.professionalCount, 'professional')}</span>
                {category.fromRateCents !== null && (
                  <span className="text-ink-700 font-medium">from {money(category.fromRateCents)}/hr</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-ink-950 text-2xl font-semibold tracking-tight sm:text-3xl">
              Three steps, no phone tag
            </h2>
            <p className="text-ink-500 mt-3">
              You see the rate before you enquire, and the quote is locked to that rate.
            </p>
          </div>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: 'search' as const,
                title: 'Search and compare',
                body: 'Filter by expertise, location, hourly rate and rating. Every profile shows credentials, specialisms and real reviews.',
              },
              {
                icon: 'calendar' as const,
                title: 'Send a request',
                body: 'Describe the job, pick a date and set how many hours you expect. You get an estimate instantly at the published rate.',
              },
              {
                icon: 'checkCircle' as const,
                title: 'Work and review',
                body: 'They accept, do the work and log the hours actually spent. You are billed at the rate you booked, then you leave a review.',
              },
            ].map((step, index) => {
              const Icon = Icons[step.icon];
              return (
                <li key={step.title} className="relative">
                  <span className="bg-brand-50 text-brand-600 flex size-12 items-center justify-center rounded-2xl">
                    <Icon className="size-6" />
                  </span>
                  <p className="text-brand-600 mt-4 text-xs font-semibold tracking-wider uppercase">
                    Step {index + 1}
                  </p>
                  <h3 className="text-ink-950 mt-1 text-lg font-semibold">{step.title}</h3>
                  <p className="text-ink-600 mt-2 text-sm leading-relaxed">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Featured */}
      <section className="container-page py-16 lg:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-ink-950 text-2xl font-semibold tracking-tight sm:text-3xl">
              Top rated this month
            </h2>
            <p className="text-ink-500 mt-2">Professionals with the strongest client feedback right now.</p>
          </div>
          <LinkButton to="/browse" variant="secondary">
            See everyone <Icons.arrowRight className="size-4" />
          </LinkButton>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featured.loading &&
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          {featured.data?.results.map((pro) => (
            <ProfessionalCard key={pro.id} pro={pro} />
          ))}
        </div>
      </section>

      {/* Professional CTA */}
      <section className="container-page pb-16 lg:pb-24">
        <div className="from-brand-700 to-brand-900 relative overflow-hidden rounded-3xl bg-gradient-to-br px-8 py-14 sm:px-14">
          <div aria-hidden className="absolute -top-24 -right-16 size-80 rounded-full bg-white/10 blur-3xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Are you the professional?
              </h2>
              <p className="text-brand-100 mt-4 leading-relaxed">
                Set your own hourly rate, choose a membership that suits your practice, and get enquiries
                from people who already know what you charge. No commission surprises, no lead auctions.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <LinkButton to="/join" size="lg" variant="secondary">
                  Apply to join
                </LinkButton>
                <LinkButton
                  to="/for-professionals"
                  size="lg"
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                >
                  See membership plans <Icons.arrowRight className="size-4" />
                </LinkButton>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:gap-4">
              {[
                'You control your hourly rate',
                'Fixed monthly membership',
                'Verified badge on your profile',
                'Bookings, hours and invoices in one place',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 rounded-xl bg-white/10 p-3.5 text-sm text-white ring-1 ring-white/15 ring-inset"
                >
                  <Icons.check className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Shows a real top-rated listing beside the hero so the published-rate model is
 * visible before the visitor scrolls.
 */
function HeroPreview({ professional }: { professional: Professional | undefined }) {
  if (!professional) {
    return <Skeleton className="hidden h-80 rounded-3xl bg-white/10 lg:block" />;
  }

  const exampleHours = 3;
  const exampleTotal =
    professional.pricing.hourlyRateCents * exampleHours + professional.pricing.calloutFeeCents;

  return (
    <div className="relative hidden lg:block">
      <div
        aria-hidden
        className="absolute -top-4 right-6 left-10 h-full rounded-3xl bg-white/5 ring-1 ring-white/10"
      />
      <Link
        to={`/pro/${professional.slug}`}
        className="shadow-lift relative block rounded-3xl bg-white p-6 transition hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-ink-400 text-xs font-medium tracking-wide uppercase">
            Top rated this week
          </span>
          <Badge tone="success">
            <Icons.shieldCheck className="size-3" /> Verified
          </Badge>
        </div>

        <div className="mt-5 flex items-start gap-4">
          <Avatar name={professional.displayName} size="lg" src={professional.avatarUrl} />
          <div className="min-w-0">
            <p className="text-ink-950 text-lg font-semibold">{professional.displayName}</p>
            <p className="text-ink-500 text-sm">
              {professional.category.name} · {locationLabel(professional.location)}
            </p>
            <div className="mt-1.5">
              <Stars value={professional.rating.average} count={professional.rating.count} size="sm" />
            </div>
          </div>
        </div>

        <p className="text-ink-700 mt-4 line-clamp-2 text-sm leading-relaxed">{professional.headline}</p>

        <div className="border-ink-100 mt-5 flex items-end justify-between border-t pt-4">
          <div>
            <p className="text-ink-500 text-xs">Published hourly rate</p>
            <p className="text-ink-950 text-2xl font-semibold tracking-tight">
              {money(professional.pricing.hourlyRateCents, professional.pricing.currency)}
              <span className="text-ink-500 text-sm font-normal"> /hour</span>
            </p>
          </div>
          <div className="bg-ink-50 rounded-xl px-3.5 py-2.5 text-right">
            <p className="text-ink-500 text-xs">A {exampleHours} hour job</p>
            <p className="text-ink-950 font-semibold tabular-nums">
              {money(exampleTotal, professional.pricing.currency)}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="text-2xl font-semibold text-white tabular-nums sm:text-3xl">{value}</dd>
      <dt className="text-ink-400 mt-1 text-sm">{label}</dt>
    </div>
  );
}
