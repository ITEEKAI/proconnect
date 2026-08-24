import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../lib/auth';
import { Avatar, Button, LinkButton, cx } from './ui';
import { Icons } from './icons';
import { NotificationBell } from './NotificationBell';

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" className={cx('inline-flex items-center gap-2.5', className)}>
      <span className="bg-brand-600 flex size-8 items-center justify-center rounded-lg text-white">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path d="M6 18V6h5a4 4 0 0 1 0 8H9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16.5" cy="16.5" r="2" fill="#7dd3fc" />
        </svg>
      </span>
      <span className={cx('text-[17px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-ink-950')}>
        Pro<span className="text-brand-600">Connect</span>
      </span>
    </Link>
  );
}

const PUBLIC_NAV = [
  { to: '/browse', label: 'Find a professional' },
  { to: '/categories', label: 'Categories' },
  { to: '/for-professionals', label: 'For professionals' },
  { to: '/how-it-works', label: 'How it works' },
];

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <LinkButton to="/login" variant="ghost" size="sm">
          Sign in
        </LinkButton>
        <LinkButton to="/signup" size="sm">
          Join free
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
        <Avatar name={user.fullName} size="sm" />
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
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="text-ink-700 hover:bg-ink-50 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
              >
                <Icons.calendar className="size-4" /> My bookings
              </Link>
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
            Vetted professionals, transparent hourly rates, and one place to manage the work.
          </p>
        </div>
        <FooterColumn
          title="For clients"
          links={[
            { to: '/browse', label: 'Find a professional' },
            { to: '/categories', label: 'Browse categories' },
            { to: '/how-it-works', label: 'How it works' },
            { to: '/signup', label: 'Create an account' },
          ]}
        />
        <FooterColumn
          title="For professionals"
          links={[
            { to: '/for-professionals', label: 'Why join' },
            { to: '/for-professionals#plans', label: 'Membership plans' },
            { to: '/join', label: 'Apply to join' },
            { to: '/login', label: 'Professional sign in' },
          ]}
        />
        <FooterColumn
          title="Company"
          links={[
            { to: '/how-it-works', label: 'Trust and safety' },
            { to: '/how-it-works#faq', label: 'FAQ' },
            { to: '/login', label: 'Admin sign in' },
          ]}
        />
      </div>
      <div className="border-ink-800 container-page text-ink-500 flex flex-wrap items-center justify-between gap-3 border-t py-6 text-xs">
        <p>© {new Date().getFullYear()} ProConnect. A demonstration marketplace.</p>
        <p>Built with React, Express and SQLite.</p>
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
