import { useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { avatarColour, initials } from '../lib/format';

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm disabled:bg-brand-300',
  secondary: 'bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 hover:border-ink-300',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center font-medium transition disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx('size-4 animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

interface LinkButtonProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export function LinkButton({ to, variant = 'primary', size = 'md', className, children }: LinkButtonProps) {
  return (
    <Link
      to={to}
      className={cx(
        'inline-flex items-center justify-center font-medium transition',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, required, className, children }: FieldWrapperProps) {
  return (
    <div className={className}>
      {label && (
        <span className="label-text">
          {label}
          {required && <span className="text-rose-600"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <p className="text-ink-500 mt-1.5 text-xs">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: string;
  wrapperClassName?: string;
}

export function TextInput({ label, hint, error, prefix, wrapperClassName, className, ...rest }: TextInputProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      className={wrapperClassName}
    >
      <div className="relative">
        {prefix && (
          <span className="text-ink-500 pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm">
            {prefix}
          </span>
        )}
        <input
          {...rest}
          className={cx('field', prefix && 'pl-7', error && 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20', className)}
        />
      </div>
    </Field>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

export function TextArea({ label, hint, error, wrapperClassName, className, ...rest }: TextAreaProps) {
  return (
    <Field label={label} hint={hint} error={error} required={rest.required} className={wrapperClassName}>
      <textarea {...rest} className={cx('field min-h-28 resize-y', error && 'border-rose-300', className)} />
    </Field>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

export function Select({ label, hint, error, wrapperClassName, className, children, ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} required={rest.required} className={wrapperClassName}>
      <select {...rest} className={cx('field appearance-none bg-[length:16px] pr-9', error && 'border-rose-300', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23647694'%3E%3Cpath d='M4.5 6.5 8 10l3.5-3.5' stroke='%23647694' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
        }}
      >
        {children}
      </select>
    </Field>
  );
}

interface TagInputProps {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  values: string[];
  onChange: (values: string[]) => void;
  wrapperClassName?: string;
}

/** Free-text list editor used for specialisms, languages and service areas. */
export function TagInput({
  label,
  hint,
  error,
  placeholder,
  values,
  onChange,
  wrapperClassName,
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  function commit() {
    const value = draft.trim();
    if (!value) return;
    if (!values.includes(value)) onChange([...values, value]);
    setDraft('');
  }

  return (
    <Field label={label} hint={hint} error={error} className={wrapperClassName}>
      <div className="border-ink-200 focus-within:border-brand-500 focus-within:ring-brand-500/20 flex flex-wrap items-center gap-1.5 rounded-xl border bg-white p-2 transition focus-within:ring-4">
        {values.map((value) => (
          <span
            key={value}
            className="bg-brand-50 text-brand-700 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
          >
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((v) => v !== value))}
              className="hover:text-brand-900"
            >
              <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !draft && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : ''}
          className="text-ink-900 placeholder:text-ink-400 min-w-32 flex-1 bg-transparent px-1.5 py-1 text-sm focus:outline-none"
        />
      </div>
    </Field>
  );
}

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export function Checkbox({ label, description, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-3', className)}>
      <input
        type="checkbox"
        {...rest}
        className="border-ink-300 text-brand-600 focus:ring-brand-500/30 mt-0.5 size-4 rounded"
      />
      <span>
        <span className="text-ink-800 block text-sm font-medium">{label}</span>
        {description && <span className="text-ink-500 block text-xs">{description}</span>}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({
  name,
  size = 'md',
  src,
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  src?: string | null;
  className?: string;
}) {
  const sizes = {
    sm: 'size-8 text-xs',
    md: 'size-11 text-sm',
    lg: 'size-16 text-lg',
    xl: 'size-24 text-2xl',
  };
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cx('inline-flex shrink-0 rounded-full object-cover', sizes[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        sizes[size],
        avatarColour(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Stars({ value, count, size = 'md' }: { value: number; count?: number; size?: 'sm' | 'md' }) {
  const dimension = size === 'sm' ? 'size-3.5' : 'size-4';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            viewBox="0 0 20 20"
            className={cx(dimension, i <= Math.round(value) ? 'text-accent-500' : 'text-ink-200')}
            fill="currentColor"
            aria-hidden
          >
            <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85L10 1.5z" />
          </svg>
        ))}
      </span>
      <span className="text-ink-700 text-sm font-semibold">{value > 0 ? value.toFixed(1) : 'New'}</span>
      {count !== undefined && count > 0 && <span className="text-ink-500 text-sm">({count})</span>}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('card', className)}>{children}</div>;
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-ink-950 text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-ink-500 mt-1 text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">{label}</p>
        {icon && <span className={cx('rounded-lg p-1.5 ring-1 ring-inset', TONES[tone])}>{icon}</span>}
      </div>
      <p className="text-ink-950 mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-ink-500 mt-1 text-xs">{sub}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-ink-200 rounded-2xl border border-dashed px-6 py-14 text-center">
      <p className="text-ink-800 text-sm font-semibold">{title}</p>
      {description && <p className="text-ink-500 mx-auto mt-1 max-w-md text-sm">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Alert({ tone = 'danger', title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-xl px-4 py-3 text-sm ring-1 ring-inset', TONES[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? 'mt-0.5' : undefined}>{children}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('bg-ink-200/60 animate-pulse rounded-lg', className)} />;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="border-ink-200 flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cx(
            '-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-medium transition',
            active === tab.id
              ? 'border-brand-600 text-brand-700'
              : 'text-ink-500 hover:text-ink-800 border-transparent',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cx('ml-1.5 rounded-full px-1.5 py-0.5 text-xs', active === tab.id ? 'bg-brand-50' : 'bg-ink-100')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div
        className="bg-ink-950/40 fixed inset-0 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <div className={cx('shadow-lift relative z-10 w-full rounded-2xl bg-white', widths[width])}>
        <div className="border-ink-100 flex items-start justify-between gap-4 border-b px-6 py-4">
          <div>
            <h3 className="text-ink-950 text-base font-semibold">{title}</h3>
            {description && <p className="text-ink-500 mt-0.5 text-sm">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-400 hover:bg-ink-100 hover:text-ink-700 -mt-1 rounded-lg p-1.5 transition"
          >
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="border-ink-100 flex justify-end gap-2 border-t px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
