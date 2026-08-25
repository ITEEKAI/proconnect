import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { money, pluralise } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Category, Professional } from '../../lib/types';
import { CategoryIcon, Icons } from '../../components/icons';
import { ProfessionalCard } from '../../components/ProfessionalCard';
import { Button, LinkButton, Skeleton } from '../../components/ui';

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
      <section className="bg-white">
        <div className="container-page grid items-center gap-12 py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,22rem)] lg:py-20">
          <div>
            <h1 className="text-ink-950 text-4xl leading-[1.12] font-semibold tracking-tight sm:text-5xl">
              Find trusted professionals.
              <br />
              Book by the hour.{' '}
              <span className="text-brand-600">We manage the rest.</span>
            </h1>
            <p className="text-ink-600 mt-5 max-w-xl text-lg leading-relaxed">
              One request connects you to verified local pros with published rates and a booking you can
              track from start to finish.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {(
                [
                  { label: 'Verified Pros', icon: 'shieldCheck' },
                  { label: 'Upfront Pricing', icon: 'tag' },
                  { label: 'One Point of Contact', icon: 'message' },
                  { label: 'Quality Checks', icon: 'checkCircle' },
                ] as const
              ).map((item) => {
                const Icon = Icons[item.icon];
                return (
                  <li key={item.label} className="text-ink-800 flex items-center gap-2.5 text-sm font-medium">
                    <span className="bg-brand-50 text-brand-700 flex size-8 items-center justify-center rounded-lg">
                      <Icon className="size-4" />
                    </span>
                    {item.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <form onSubmit={search} className="card shadow-lift p-6">
            <p className="text-ink-950 text-lg font-semibold">Find a professional</p>
            <p className="text-ink-500 mt-1 text-sm">Search by the work you need and where you need it.</p>
            <label className="label-text mt-5">What do you need?</label>
            <div className="relative">
              <Icons.search className="text-ink-400 pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g. electrician, solicitor, accountant"
                className="field pl-10"
              />
            </div>
            <label className="label-text mt-4">Town or city</label>
            <div className="relative">
              <Icons.pin className="text-ink-400 pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
              <input
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                placeholder="Address / city"
                className="field pl-10"
              />
            </div>
            <Button type="submit" size="lg" className="mt-5 w-full">
              Search professionals
            </Button>
            <p className="text-ink-500 mt-3 text-center text-xs">
              Popular:{' '}
              {['EV charger', 'Self assessment', 'Boiler'].map((item, i) => (
                <span key={item}>
                  {i > 0 && ' · '}
                  <Link to={`/browse?q=${encodeURIComponent(item)}`} className="text-brand-700 hover:underline">
                    {item}
                  </Link>
                </span>
              ))}
            </p>
          </form>
        </div>
      </section>

      <section className="border-ink-100 border-y bg-ink-50 py-16 lg:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-ink-950 text-3xl font-semibold tracking-tight">Book in three steps</h2>
            <p className="text-ink-500 mt-3">A smarter way to hire service professionals by the hour.</p>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                n: '1',
                icon: 'search' as const,
                title: 'Search once',
                body: 'Tell us the work and the place. Filter by expertise, rate and rating — no chasing a dozen numbers.',
              },
              {
                n: '2',
                icon: 'tag' as const,
                title: 'Compare rates',
                body: 'Every profile shows a published hourly rate, credentials and reviews from completed bookings.',
              },
              {
                n: '3',
                icon: 'checkCircle' as const,
                title: 'We manage it',
                body: 'Send a request, they accept, hours are logged, and the invoice uses the rate you booked at.',
              },
            ].map((step) => {
              const Icon = Icons[step.icon];
              return (
                <li key={step.title} className="card relative overflow-hidden p-6">
                  <span className="bg-brand-600 absolute top-0 right-0 left-0 h-1" />
                  <span className="bg-brand-600 mb-4 flex size-8 items-center justify-center rounded-full text-sm font-semibold text-white">
                    {step.n}
                  </span>
                  <Icon className="text-brand-600 size-6" />
                  <h3 className="text-ink-950 mt-3 text-lg font-semibold">{step.title}</h3>
                  <p className="text-ink-600 mt-2 text-sm leading-relaxed">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="container-page py-16 lg:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-ink-950 text-2xl font-semibold tracking-tight sm:text-3xl">Services</h2>
            <p className="text-ink-500 mt-2">Ten professions, each with published rates and verified credentials.</p>
          </div>
          <LinkButton to="/categories" variant="outline">
            All services <Icons.arrowRight className="size-4" />
          </LinkButton>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.loading &&
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          {categories.data?.categories.map((category) => (
            <Link
              key={category.id}
              to={`/browse?category=${category.slug}`}
              className="card hover:border-brand-300 hover:shadow-lift group p-5 transition"
            >
              <span className="bg-brand-50 text-brand-600 group-hover:bg-brand-600 flex size-11 items-center justify-center rounded-lg transition group-hover:text-white">
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

      <section className="bg-white py-16 lg:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-ink-950 text-3xl font-semibold tracking-tight">How it works</h2>
            <p className="text-ink-500 mt-3">Simple processes for customers and professionals.</p>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="card p-7">
              <p className="text-brand-700 text-sm font-semibold tracking-wide uppercase">For customers</p>
              <ol className="mt-5 space-y-5">
                {[
                  ['Request', 'Search and send a booking with the hours you expect.'],
                  ['See the rate', 'The estimate uses the published hourly rate, locked at request time.'],
                  ['Choose', 'They accept, you track messages, hours and payment in one thread.'],
                  ['Job complete', 'Pay after the work is logged. Then leave a review.'],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="bg-brand-600 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-ink-950 font-medium">{title}</p>
                      <p className="text-ink-600 text-sm">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="card p-7">
              <p className="text-ink-500 text-sm font-semibold tracking-wide uppercase">For professionals</p>
              <ol className="mt-5 space-y-5">
                {[
                  ['Get notified', 'Qualified requests matching your field land in your dashboard.'],
                  ['Set your rate', 'You control the hourly rate. Existing bookings keep the old figure.'],
                  ['Win the job', 'Accept, message the client, then log the hours you actually worked.'],
                  ['Get paid', 'The invoice is generated from logged hours at the booked rate.'],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="bg-ink-900 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-ink-950 font-medium">{title}</p>
                      <p className="text-ink-600 text-sm">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-ink-950 text-3xl font-semibold tracking-tight">Why choose SimplyServices</h2>
          <p className="text-ink-500 mt-3">Everything you need for a seamless service experience.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: 'shieldCheck' as const, title: 'Verified professionals', body: 'Identity and credentials checked before anyone is listed.' },
            { icon: 'tag' as const, title: 'Transparent pricing', body: 'Published hourly rates. No hidden fees after you book.' },
            { icon: 'checkCircle' as const, title: 'Quality guarantees', body: 'Reviews are tied to completed bookings, not anonymous praise.' },
            { icon: 'bolt' as const, title: 'Fast matching', body: 'Search, filter and request in minutes — not days of phone tag.' },
            { icon: 'card' as const, title: 'Secure payments', body: 'Record payment on the job once the hours are logged.' },
            { icon: 'message' as const, title: '24/7 in-app inbox', body: 'Messages and alerts sit on the booking, not across apps.' },
            { icon: 'pin' as const, title: 'Local experts', body: 'Filter by town, region and the areas they actually cover.' },
            { icon: 'clock' as const, title: 'Time savings', body: 'One marketplace instead of a dozen websites and call-backs.' },
          ].map((item) => {
            const Icon = Icons[item.icon];
            return (
              <div key={item.title} className="card p-5">
                <span className="bg-brand-50 text-brand-700 flex size-10 items-center justify-center rounded-lg">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-ink-950 mt-3 font-semibold">{item.title}</h3>
                <p className="text-ink-600 mt-1.5 text-sm leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container-page pb-16 lg:pb-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-ink-950 text-2xl font-semibold tracking-tight sm:text-3xl">
              Top rated this month
            </h2>
            <p className="text-ink-500 mt-2">Professionals with the strongest client feedback right now.</p>
          </div>
          <LinkButton to="/browse" variant="outline">
            See everyone <Icons.arrowRight className="size-4" />
          </LinkButton>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featured.loading &&
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          {featured.data?.results.map((pro) => (
            <ProfessionalCard key={pro.id} pro={pro} />
          ))}
        </div>
        {stats.data && (
          <dl className="border-ink-200 mt-12 grid grid-cols-2 gap-6 border-t pt-8 sm:grid-cols-4">
            <HeroStat label="Vetted professionals" value={`${stats.data.professionals}`} />
            <HeroStat label="Fields of expertise" value={`${stats.data.categories}`} />
            <HeroStat label="Jobs booked" value={`${stats.data.bookings}`} />
            <HeroStat label="Average rating" value={`${stats.data.averageRating.toFixed(1)} / 5`} />
          </dl>
        )}
      </section>

      <section className="bg-ink-950 py-16 text-white lg:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              Get consistent work without wasting money on ads.
            </h2>
            <p className="text-ink-300 mt-3">
              Join SimplyServices. Set your rate, win jobs, and focus on the work.
            </p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: 'users' as const, title: 'Qualified leads', body: 'Requests from people who already saw your rate.' },
              { icon: 'card' as const, title: 'Flat membership', body: 'One monthly fee instead of a lead auction.' },
              { icon: 'layers' as const, title: 'Simple dashboard', body: 'Bookings, messages, hours and invoices together.' },
              { icon: 'bolt' as const, title: 'Faster payouts', body: 'Clients record payment when the job is complete.' },
            ].map((item) => {
              const Icon = Icons[item.icon];
              return (
                <li key={item.title} className="rounded-xl bg-white p-5 text-ink-900">
                  <Icon className="text-brand-600 size-6" />
                  <h3 className="mt-3 font-semibold">{item.title}</h3>
                  <p className="text-ink-600 mt-1 text-sm">{item.body}</p>
                </li>
              );
            })}
          </ul>
          <div className="mt-10 flex justify-center">
            <LinkButton to="/join" size="lg">
              Apply to join now
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="container-page py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-ink-950 text-3xl font-semibold tracking-tight">Ready to get started?</h2>
          <p className="text-ink-500 mt-3">Customers book by the hour. Professionals publish the rate.</p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <Link to="/browse" className="bg-brand-600 hover:bg-brand-700 rounded-xl p-8 text-white transition">
            <Icons.search className="size-8" />
            <h3 className="mt-4 text-2xl font-semibold">Find a professional</h3>
            <p className="mt-2 text-sm text-white/85">
              Compare verified local pros with published hourly rates and send a request today.
            </p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold">
              Start now <Icons.arrowRight className="size-4" />
            </span>
          </Link>
          <Link
            to="/join"
            className="card hover:border-brand-300 p-8 transition"
          >
            <Icons.briefcase className="text-brand-600 size-8" />
            <h3 className="text-ink-950 mt-4 text-2xl font-semibold">Apply as a professional</h3>
            <p className="text-ink-600 mt-2 text-sm">
              Set your rate, get verified, and take bookings from people who already accepted your price.
            </p>
            <span className="text-brand-700 mt-5 inline-flex items-center gap-1 text-sm font-semibold">
              Join now <Icons.arrowRight className="size-4" />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="text-ink-950 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</dd>
      <dt className="text-ink-500 mt-1 text-sm">{label}</dt>
    </div>
  );
}
