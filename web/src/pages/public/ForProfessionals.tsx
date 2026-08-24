import { api } from '../../lib/api';
import { money, percentFromBps } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Plan } from '../../lib/types';
import { Icons } from '../../components/icons';
import { Card, LinkButton, Skeleton, cx } from '../../components/ui';

export function ForProfessionals() {
  const plans = useAsync(() => api<{ plans: Plan[] }>('/directory/plans'));
  const recommended = 'professional';

  return (
    <>
      <section className="bg-white">
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="bg-brand-50 text-brand-700 inline-flex rounded-full px-3 py-1 text-xs font-medium">
              For professionals and tradespeople
            </span>
            <h1 className="text-ink-950 mt-5 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              You set the hourly rate. We bring the clients.
            </h1>
            <p className="text-ink-600 mt-5 text-lg leading-relaxed">
              A flat monthly membership instead of a lead auction. Publish what you charge, control it from
              your own dashboard, and only speak to people who already accepted your rate.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to="/join" size="lg">
                Apply to join
              </LinkButton>
              <LinkButton to="#plans" size="lg" variant="secondary">
                Compare plans
              </LinkButton>
            </div>
          </div>

          <Card className="p-7">
            <h2 className="text-ink-950 text-lg font-semibold">What a membership includes</h2>
            <ul className="mt-5 space-y-4">
              {[
                ['Full control of your hourly rate', 'Change it whenever you like. Existing bookings keep the rate they were quoted at.'],
                ['A verified profile', 'We check your credentials once, then your profile carries the verified badge.'],
                ['Enquiries with context', 'Every request arrives with the job, the date and the hours the client expects.'],
                ['Hours and invoicing', 'Log the hours you actually worked and the total is calculated for you.'],
                ['Transparent membership fee', 'One monthly figure, visible in your billing tab, with every change recorded.'],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-3">
                  <span className="bg-brand-50 text-brand-600 mt-0.5 rounded-lg p-1.5">
                    <Icons.check className="size-4" />
                  </span>
                  <div>
                    <p className="text-ink-900 text-sm font-medium">{title}</p>
                    <p className="text-ink-600 text-sm leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section id="plans" className="container-page scroll-mt-24 py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-ink-950 text-3xl font-semibold tracking-tight">Membership plans</h2>
          <p className="text-ink-500 mt-3">
            Pick the plan that matches your practice. Change or cancel it any time from your dashboard.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {plans.loading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-2xl" />)}

          {plans.data?.plans.map((plan) => {
            const featured = plan.slug === recommended;
            return (
              <div
                key={plan.id}
                className={cx(
                  'relative flex flex-col rounded-2xl border p-6',
                  featured
                    ? 'border-brand-600 shadow-lift bg-white ring-1 ring-brand-600'
                    : 'border-ink-200/70 shadow-card bg-white',
                )}
              >
                {featured && (
                  <span className="bg-brand-600 absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-medium text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-ink-950 text-lg font-semibold">{plan.name}</h3>
                <p className="text-ink-500 mt-1 min-h-10 text-sm">{plan.description}</p>
                <p className="text-ink-950 mt-5 text-3xl font-semibold tracking-tight">
                  {money(plan.monthlyFeeCents, plan.currency)}
                  <span className="text-ink-500 text-base font-normal"> /month</span>
                </p>
                <p className="text-ink-500 mt-1 text-xs">
                  Plus {percentFromBps(plan.commissionBps)} commission on completed work
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-ink-700 flex gap-2.5 text-sm">
                      <Icons.check className="text-brand-600 mt-0.5 size-4 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <LinkButton
                  to={`/join?plan=${plan.slug}`}
                  variant={featured ? 'primary' : 'secondary'}
                  className="mt-7 w-full"
                >
                  Choose {plan.name}
                </LinkButton>
              </div>
            );
          })}
        </div>

        <p className="text-ink-500 mt-8 text-center text-sm">
          Running a multi-branch firm? Our team can agree a bespoke monthly fee — it is applied to your
          account directly and always visible in your billing tab.
        </p>
      </section>
    </>
  );
}

export function HowItWorks() {
  return (
    <div className="container-page py-14 lg:py-20">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-ink-950 text-4xl font-semibold tracking-tight">How ProConnect works</h1>
        <p className="text-ink-500 mt-4 text-lg">
          A marketplace built around one idea: you should know the hourly rate before you make contact.
        </p>
      </header>

      <div className="mx-auto mt-14 grid max-w-5xl gap-10 lg:grid-cols-2">
        <Card className="p-8">
          <h2 className="text-ink-950 text-xl font-semibold">If you need help</h2>
          <ol className="mt-6 space-y-6">
            {[
              ['Search', 'Filter by profession, location, hourly rate and rating.'],
              ['Compare', 'Read verified credentials, specialisms and reviews from real bookings.'],
              ['Request', 'Send the job with a date and expected hours. You see the estimate immediately.'],
              ['Confirm', 'They accept, do the work and log hours. You are billed at the rate you booked.'],
              ['Review', 'Rate the work once it is complete. Reviews are tied to real bookings only.'],
            ].map(([title, body], index) => (
              <li key={title} className="flex gap-4">
                <span className="bg-brand-600 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="text-ink-900 font-medium">{title}</p>
                  <p className="text-ink-600 mt-0.5 text-sm leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-8">
          <h2 className="text-ink-950 text-xl font-semibold">If you are the professional</h2>
          <ol className="mt-6 space-y-6">
            {[
              ['Apply', 'Tell us your field, location and hourly rate, and pick a membership plan.'],
              ['Get verified', 'Our team checks your credentials before your profile goes live.'],
              ['Set your rate', 'You control your hourly rate, minimum engagement and call-out fee.'],
              ['Take bookings', 'Accept or decline requests, then log the hours you actually worked.'],
              ['Pay one fee', 'A single monthly membership, always visible in your billing tab.'],
            ].map(([title, body], index) => (
              <li key={title} className="flex gap-4">
                <span className="bg-ink-900 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="text-ink-900 font-medium">{title}</p>
                  <p className="text-ink-600 mt-0.5 text-sm leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <section id="faq" className="mx-auto mt-20 max-w-3xl scroll-mt-24">
        <h2 className="text-ink-950 text-2xl font-semibold tracking-tight">Common questions</h2>
        <dl className="mt-8 space-y-6">
          {[
            [
              'Who sets the hourly rate?',
              'The professional does, from their own dashboard. Administrators can adjust a rate in exceptional cases, and every change is recorded in the pricing history with who made it and why.',
            ],
            [
              'What happens if a rate changes after I book?',
              'Nothing. Your booking stores the rate that was advertised when you sent the request, and the final invoice uses that figure.',
            ],
            [
              'What does the professional pay?',
              'A flat monthly membership fee based on their plan, plus a commission on completed work. Administrators can agree a bespoke monthly fee, which is shown to the professional in their billing tab.',
            ],
            [
              'How are professionals verified?',
              'We check identity and the credentials they list — practising certificates, trade registrations and accreditations. Only verified profiles appear in the directory.',
            ],
            [
              'Can I review anyone?',
              'Only after a booking with them is marked complete, and only once per booking. That keeps ratings tied to real work.',
            ],
          ].map(([question, answer]) => (
            <div key={question} className="border-ink-200 border-b pb-6 last:border-0">
              <dt className="text-ink-950 font-medium">{question}</dt>
              <dd className="text-ink-600 mt-2 text-sm leading-relaxed">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
