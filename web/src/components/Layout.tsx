import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../lib/auth';
import { Avatar, Button, LinkButton, cx } from './ui';
import { Icons } from './icons';
import { NotificationBell } from './NotificationBell';

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" className={cx('inline-flex items-center gap-2.5', className)} aria-label="SimplyServices home">
      <SimplyServicesMark className="size-9 shrink-0" inverted={inverted} />
      <span
        className={cx(
          'text-[17px] font-semibold tracking-tight',
          inverted ? 'text-white' : 'text-ink-950',
        )}
      >
        SimplyServices
      </span>
    </Link>
  );
}

/** Dual-gear mark from the SimplyServices webapp. */
export function SimplyServicesMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const hole = inverted ? '#081028' : '#ffffff';
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <g fill="#10988a">
        <Gear cx={24.5} cy={15.5} radius={11} teeth={8} />
      </g>
      <g fill="#0c7c72">
        <Gear cx={15} cy={24.5} radius={9.2} teeth={8} />
      </g>
      <circle cx="24.5" cy="15.5" r="3.8" fill={hole} />
      <circle cx="15" cy="24.5" r="3.1" fill={hole} />
    </svg>
  );
}

function Gear({ cx, cy, radius, teeth }: { cx: number; cy: number; radius: number; teeth: number }) {
  const toothW = radius * 0.38;
  const toothH = radius * 0.36;
  return (
    <>
      {Array.from({ length: teeth }, (_, i) => (
        <rect
          key={i}
          x={cx - toothW / 2}
          y={cy - radius - toothH * 0.42}
          width={toothW}
          height={toothH}
          rx={1.1}
          transform={`rotate(${(360 / teeth) * i} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={radius * 0.92} />
    </>
  );
}

const PUBLIC_NAV = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/categories', label: 'Services' },
  { to: '/for-professionals', label: 'For professionals' },
  { to: '/browse', label: 'Browse' },
];

export function UserMenu() {
  const { user, professional, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <LinkButton to="/login" variant="ghost" size="sm">
          Login
        </LinkButton>
        <LinkButton to="/browse" size="sm" className="max-sm:hidden">
          Find a professional
        </LinkButton>
        <LinkButton to="/join" variant="outline" size="sm" className="max-md:hidden">
          Join as a professional
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-ink-100 flex items-center gap-2 rounded-full py-1 pr-2.5 pl-1 transition"
      >
        <Avatar name={user.fullName} size="sm" src={professional?.avatarUrl} />
        <span className="text-ink-800 hidden text-sm font-medium sm:block">{user.fullName.split(' ')[0]}</span>
        <Icons.arrowRight className="text-ink-400 size-3.5 rotate-90" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} role="presentation" />
          <div className="shadow-lift border-ink-200 absolute right-0 z-20 mt-2 w-60 rounded-xl border bg-white p-1.5">
            <div className="border-ink-100 border-b px-3 py-2.5">
              <p className="text-ink-900 truncate text-sm font-semibold">{user.fullName}</p>
              <p className="text-ink-500 truncate text-xs">{user.email}</p>
              <p className="text-brand-700 bg-brand-50 mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize">
                {user.role}
              </p>
            </div>
            <Link
              to={homeFor(user.role)}
              onClick={() => setOpen(false)}
              className="text-ink-700 hover:bg-ink-50 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
            >
              <Icons.layers className="size-4" /> My dashboard
            </Link>
            {user.role === 'client' && (
              <>
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="text-ink-700 hover:bg-ink-50 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
                >
                  <Icons.calendar className="size-4" /> My bookings
                </Link>
                <Link
                  to="/account/invoices"
                  onClick={() => setOpen(false)}
                  className="text-ink-700 hover:bg-ink-50 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
                >
                  <Icons.card className="size-4" /> Invoices
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                setOpen(false);
                navigate('/');
              }}
              className="text-ink-700 hover:bg-ink-50 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
            >
              <Icons.logout className="size-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-ink-200/70 sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-1 lg:flex">
              {PUBLIC_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cx(
                      'rounded-lg px-3 py-2 text-sm font-medium transition',
                      isActive ? 'text-brand-700 bg-brand-50' : 'text-ink-600 hover:text-ink-950 hover:bg-ink-100',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu />
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="text-ink-600 hover:bg-ink-100 rounded-lg p-2 lg:hidden"
            >
              <Icons.menu className="size-5" />
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="border-ink-200 container-page grid gap-1 border-t py-3 lg:hidden">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="text-ink-700 hover:bg-ink-50 rounded-lg px-3 py-2 text-sm font-medium"
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/browse"
              onClick={() => setMobileOpen(false)}
              className="bg-brand-600 mt-2 rounded-lg px-3 py-2 text-center text-sm font-medium text-white sm:hidden"
            >
              Find a professional
            </Link>
            <Link
              to="/join"
              onClick={() => setMobileOpen(false)}
              className="border-brand-600 text-brand-700 rounded-lg border px-3 py-2 text-center text-sm font-medium md:hidden"
            >
              Join as a professional
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-ink-950 mt-20 text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo inverted />
          <p className="text-ink-400 mt-3 max-w-xs text-sm leading-relaxed">
            Connecting customers with trusted professionals. Published hourly rates, verified credentials,
            and one place to manage the work.
          </p>
          <p className="text-ink-500 mt-4 text-xs">The ProConnect marketplace, part of SimplyServices.</p>
        </div>
        <FooterColumn
          title="Company"
          links={[
            { to: '/how-it-works', label: 'How it works' },
            { to: '/categories', label: 'Services' },
            { to: '/for-professionals', label: 'For professionals' },
            { to: '/browse', label: 'Find a professional' },
          ]}
        />
        <FooterColumn
          title="Support"
          links={[
            { to: '/how-it-works#faq', label: 'FAQ' },
            { to: '/how-it-works', label: 'Help centre' },
            { to: '/login', label: 'Login' },
            { to: '/signup', label: 'Create an account' },
          ]}
        />
        <FooterColumn
          title="Professionals"
          links={[
            { to: '/for-professionals', label: 'Why join' },
            { to: '/for-professionals#plans', label: 'Membership plans' },
            { to: '/join', label: 'Apply to join' },
            { to: '/login', label: 'Professional sign in' },
          ]}
        />
      </div>
      <div className="container-page flex flex-wrap gap-3 pb-4">
        <LinkButton to="/login" variant="ghost" className="border-ink-700 text-white hover:bg-white/10">
          Login
        </LinkButton>
        <LinkButton to="/browse">Find a professional</LinkButton>
        <LinkButton to="/join" variant="outline" className="border-brand-400 text-brand-200 hover:bg-white/5">
          Apply as a professional
        </LinkButton>
      </div>
      <div className="border-ink-800 container-page text-ink-500 flex flex-wrap items-center justify-between gap-3 border-t py-6 text-xs">
        <p>© {new Date().getFullYear()} SimplyServices. All rights reserved.</p>
        <p>ProConnect marketplace demo.</p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ to: string; label: string }> }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.to + link.label}>
            <Link to={link.to} className="text-ink-400 text-sm transition hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shared chrome for the professional and admin dashboards. */
export function DashboardShell({
  title,
  subtitle,
  nav,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: Array<{ to: string; label: string; icon: keyof typeof Icons; end?: boolean }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ink-50 min-h-screen">
      <header className="border-ink-200/70 sticky top-0 z-40 border-b bg-white">
        <div className="container-dash flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="bg-ink-200 hidden h-6 w-px sm:block" />
            <span className="text-ink-500 hidden text-sm font-medium sm:block">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <LinkButton to="/" variant="ghost" size="sm" className="hidden sm:inline-flex">
              View site
            </LinkButton>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="container-dash flex flex-col gap-8 py-8 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <nav className="flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:overflow-visible">
            {nav.map((item) => {
              const Icon = Icons[item.icon];
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cx(
                      'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-ink-600 hover:bg-white hover:text-ink-950',
                    )
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-ink-950 text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="text-ink-500 mt-1 text-sm">{subtitle}</p>}
            </div>
            {actions}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ErrorBanner({ error }: { error: Error | undefined }) {
  if (!error) return null;
  return (
    <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200 ring-inset">
      {error.message}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="border-ink-200 border-t-brand-600 size-8 animate-spin rounded-full border-3" />
    </div>
  );
}

export { Button };
