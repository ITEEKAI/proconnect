import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Icons = {
  scale: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 3v18M7 21h10M5 7l-3 6a3 3 0 0 0 6 0L5 7Zm14 0-3 6a3 3 0 0 0 6 0l-3-6ZM4 7h16" />
    </Base>
  ),
  calculator: (p: IconProps) => (
    <Base {...p}>
      <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
      <path d="M8 6.5h8M8 11h.01M12 11h.01M16 11h.01M8 14.5h.01M12 14.5h.01M16 14.5h.01M8 18h.01M12 18h4" />
    </Base>
  ),
  home: (p: IconProps) => (
    <Base {...p}>
      <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5M10 21v-6h4v6" />
    </Base>
  ),
  bolt: (p: IconProps) => (
    <Base {...p}>
      <path d="M13 2 4 13.5h6L11 22l9-11.5h-6L13 2Z" />
    </Base>
  ),
  droplet: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 2.7c3.5 4 6.5 7.2 6.5 11a6.5 6.5 0 1 1-13 0c0-3.8 3-7 6.5-11Z" />
    </Base>
  ),
  hammer: (p: IconProps) => (
    <Base {...p}>
      <path d="m14.5 5.5 4 4M3 21l8.5-8.5M9 9l3-3 2.5-2.5L18 7l-2.5 2.5L12 12 9 9Zm0 0-2 2 4 4 2-2" />
    </Base>
  ),
  target: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </Base>
  ),
  chart: (p: IconProps) => (
    <Base {...p}>
      <path d="M4 20V4M4 20h16M8 16V11M12.5 16V7M17 16v-3.5" />
    </Base>
  ),
  ruler: (p: IconProps) => (
    <Base {...p}>
      <path d="M3.5 15.5 15.5 3.5 20.5 8.5 8.5 20.5 3.5 15.5Z" />
      <path d="m7 12 2 2M10 9l2 2M13 6l2 2" />
    </Base>
  ),
  shield: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 2.5 4.5 5.5V11c0 4.6 3.1 8.6 7.5 10 4.4-1.4 7.5-5.4 7.5-10V5.5L12 2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </Base>
  ),
  briefcase: (p: IconProps) => (
    <Base {...p}>
      <rect x="2.5" y="7" width="19" height="13" rx="2.5" />
      <path d="M8.5 7V5.5A2 2 0 0 1 10.5 3.5h3a2 2 0 0 1 2 2V7M2.5 12.5h19" />
    </Base>
  ),
  paw: (p: IconProps) => (
    <Base {...p}>
      <circle cx="8" cy="7" r="2" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="5" cy="13" r="2" />
      <circle cx="19" cy="13" r="2" />
      <path d="M12 12c-2.5 0-4.5 2.2-4.5 4.6 0 1.8 1.3 2.9 3 2.9 1 0 1.2-.4 1.5-.4s.5.4 1.5.4c1.7 0 3-1.1 3-2.9C16.5 14.2 14.5 12 12 12Z" />
    </Base>
  ),
  search: (p: IconProps) => (
    <Base {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Base>
  ),
  pin: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Base>
  ),
  clock: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 1.9" />
    </Base>
  ),
  check: (p: IconProps) => (
    <Base {...p}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Base>
  ),
  checkCircle: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.2 2.7 2.8L16 9.5" />
    </Base>
  ),
  users: (p: IconProps) => (
    <Base {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M16.5 5.2a3.2 3.2 0 0 1 0 6M18 14.4a6.2 6.2 0 0 1 3.2 5.6" />
    </Base>
  ),
  card: (p: IconProps) => (
    <Base {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19M6 15h3" />
    </Base>
  ),
  calendar: (p: IconProps) => (
    <Base {...p}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Base>
  ),
  settings: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </Base>
  ),
  layers: (p: IconProps) => (
    <Base {...p}>
      <path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5" />
    </Base>
  ),
  tag: (p: IconProps) => (
    <Base {...p}>
      <path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8-9-9Z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
    </Base>
  ),
  history: (p: IconProps) => (
    <Base {...p}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3 9" />
      <path d="M3 4v5h5M12 7.5V12l3 2" />
    </Base>
  ),
  arrowRight: (p: IconProps) => (
    <Base {...p}>
      <path d="M4 12h15m0 0-6-6m6 6-6 6" />
    </Base>
  ),
  plus: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  ),
  logout: (p: IconProps) => (
    <Base {...p}>
      <path d="M9 21H5.5a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2H9M16 16l4-4-4-4M20 12H9" />
    </Base>
  ),
  sparkle: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </Base>
  ),
  shieldCheck: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 2.5 4.5 5.5V11c0 4.6 3.1 8.6 7.5 10 4.4-1.4 7.5-5.4 7.5-10V5.5L12 2.5Z" />
      <path d="m8.8 12 2.2 2.2L15.4 10" />
    </Base>
  ),
  message: (p: IconProps) => (
    <Base {...p}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.3 9.3 0 0 1-3.7-.8L3 21l1.9-5a8.2 8.2 0 0 1-.9-3.8 8.4 8.4 0 0 1 8.4-8.4h.6a8.4 8.4 0 0 1 8 8Z" />
    </Base>
  ),
  menu: (p: IconProps) => (
    <Base {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Base>
  ),
  bell: (p: IconProps) => (
    <Base {...p}>
      <path d="M6 9a6 6 0 1 1 12 0c0 7 2 8 2 8H4s2-1 2-8ZM10 21a2 2 0 0 0 4 0" />
    </Base>
  ),
};

export type IconName = keyof typeof Icons;

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = Icons[name as IconName] ?? Icons.briefcase;
  return <Icon className={className} />;
}
