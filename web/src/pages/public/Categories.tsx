import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { money, pluralise } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Category } from '../../lib/types';
import { CategoryIcon, Icons } from '../../components/icons';
import { Skeleton } from '../../components/ui';

export function Categories() {
  const categories = useAsync(() => api<{ categories: Category[] }>('/directory/categories'));

  return (
    <div className="container-page py-14">
      <header className="max-w-2xl">
        <h1 className="text-ink-950 text-3xl font-semibold tracking-tight sm:text-4xl">
          Every field of expertise
        </h1>
        <p className="text-ink-500 mt-3 text-lg">
          Pick a profession to see who is available, what they charge per hour, and how clients rated them.
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.loading &&
          Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}

        {categories.data?.categories.map((category) => (
          <Link
            key={category.id}
            to={`/browse?category=${category.slug}`}
            className="card hover:border-brand-300 hover:shadow-lift group flex flex-col p-6 transition"
          >
            <div className="flex items-start justify-between">
              <span className="bg-brand-50 text-brand-600 group-hover:bg-brand-600 flex size-12 items-center justify-center rounded-xl transition group-hover:text-white">
                <CategoryIcon name={category.icon} className="size-6" />
              </span>
              <span className="text-ink-400 group-hover:text-brand-600 transition">
                <Icons.arrowRight className="size-5" />
              </span>
            </div>
            <h2 className="text-ink-950 mt-5 text-lg font-semibold">{category.name}</h2>
            <p className="text-ink-600 mt-1.5 flex-1 text-sm leading-relaxed">{category.description}</p>
            <div className="border-ink-100 mt-5 flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-ink-500">{pluralise(category.professionalCount, 'professional')}</span>
              {category.fromRateCents !== null ? (
                <span className="text-ink-900 font-medium">from {money(category.fromRateCents)}/hr</span>
              ) : (
                <span className="text-ink-400">Coming soon</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
