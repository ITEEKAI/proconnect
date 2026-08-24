import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, query } from '../../lib/api';
import { pluralise } from '../../lib/format';
import { useAsync, useDebounced } from '../../lib/useAsync';
import type { Category, Professional } from '../../lib/types';
import { Icons } from '../../components/icons';
import { ProfessionalCard } from '../../components/ProfessionalCard';
import { Button, Checkbox, EmptyState, Select, Skeleton, cx } from '../../components/ui';

interface SearchResponse {
  results: Professional[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_low', label: 'Lowest hourly rate' },
  { value: 'price_high', label: 'Highest hourly rate' },
  { value: 'experience', label: 'Most experienced' },
  { value: 'newest', label: 'Newest' },
];

export function Browse() {
  const [params, setParams] = useSearchParams();

  const [term, setTerm] = useState(params.get('q') ?? '');
  const [location, setLocation] = useState(params.get('location') ?? '');
  const debouncedTerm = useDebounced(term, 350);
  const debouncedLocation = useDebounced(location, 350);

  const category = params.get('category') ?? '';
  const maxRate = params.get('maxRate') ?? '';
  const minRating = params.get('minRating') ?? '';
  const freeConsultation = params.get('freeConsultation') === 'true';
  const sort = params.get('sort') ?? 'recommended';
  const page = Number(params.get('page') ?? '1');

  // Keep the URL in step with the debounced text inputs.
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debouncedTerm) next.set('q', debouncedTerm);
    else next.delete('q');
    if (debouncedLocation) next.set('location', debouncedLocation);
    else next.delete('location');
    if (next.toString() !== params.toString()) {
      next.delete('page');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm, debouncedLocation]);

  const categories = useAsync(() => api<{ categories: Category[] }>('/directory/categories'));

  const search = useAsync(
    () =>
      api<SearchResponse>(
        `/directory/professionals${query({
          q: debouncedTerm,
          location: debouncedLocation,
          category,
          maxRate,
          minRating,
          freeConsultation: freeConsultation ? 'true' : '',
          sort,
          page,
          pageSize: 9,
        })}`,
      ),
    [debouncedTerm, debouncedLocation, category, maxRate, minRating, freeConsultation, sort, page],
  );

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  function clearAll() {
    setTerm('');
    setLocation('');
    setParams(new URLSearchParams());
  }

  const activeFilters = [category, maxRate, minRating, freeConsultation ? 'free' : ''].filter(Boolean).length;

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="text-ink-950 text-3xl font-semibold tracking-tight">
          {category
            ? (categories.data?.categories.find((c) => c.slug === category)?.name ?? 'Professionals')
            : 'Find a professional'}
        </h1>
        <p className="text-ink-500 mt-2">
          {search.data
            ? `${pluralise(search.data.total, 'professional')} available${debouncedLocation ? ` near ${debouncedLocation}` : ''}`
            : 'Searching…'}
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filters */}
        <aside className="lg:w-72 lg:shrink-0">
          <div className="card lg:sticky lg:top-24">
            <div className="border-ink-100 flex items-center justify-between border-b px-5 py-4">
              <p className="text-ink-950 text-sm font-semibold">
                Filters {activeFilters > 0 && <span className="text-brand-600">({activeFilters})</span>}
              </p>
              {(activeFilters > 0 || term || location) && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-ink-500 hover:text-brand-700 text-xs font-medium"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <label className="label-text" htmlFor="filter-search">
                  Keyword
                </label>
                <div className="relative">
                  <Icons.search className="text-ink-400 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <input
                    id="filter-search"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="e.g. divorce, boiler, tax"
                    className="field pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="label-text" htmlFor="filter-location">
                  Location
                </label>
                <div className="relative">
                  <Icons.pin className="text-ink-400 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <input
                    id="filter-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Town or city"
                    className="field pl-9"
                  />
                </div>
              </div>

              <div>
                <p className="label-text">Field of expertise</p>
                <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
                  <FilterRow
                    active={category === ''}
                    label="All categories"
                    onClick={() => update('category', null)}
                  />
                  {categories.data?.categories.map((c) => (
                    <FilterRow
                      key={c.id}
                      active={category === c.slug}
                      label={c.name}
                      count={c.professionalCount}
                      onClick={() => update('category', c.slug)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="label-text" htmlFor="filter-rate">
                  Maximum hourly rate
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="filter-rate"
                    type="range"
                    min={40}
                    max={300}
                    step={5}
                    value={maxRate || 300}
                    onChange={(e) => update('maxRate', e.target.value === '300' ? null : e.target.value)}
                    className="accent-brand-600 flex-1"
                  />
                  <span className="text-ink-700 w-16 text-right text-sm font-medium tabular-nums">
                    {maxRate ? `£${maxRate}` : 'Any'}
                  </span>
                </div>
              </div>

              <div>
                <p className="label-text">Minimum rating</p>
                <div className="flex gap-1.5">
                  {['', '3', '4', '4.5'].map((value) => (
                    <button
                      key={value || 'any'}
                      type="button"
                      onClick={() => update('minRating', value || null)}
                      className={cx(
                        'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition',
                        minRating === value
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : 'border-ink-200 text-ink-600 hover:border-ink-300',
                      )}
                    >
                      {value ? `${value}+` : 'Any'}
                    </button>
                  ))}
                </div>
              </div>

              <Checkbox
                label="Free first consultation"
                checked={freeConsultation}
                onChange={(e) => update('freeConsultation', e.target.checked ? 'true' : null)}
              />
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink-500 text-sm">
              {search.data && search.data.total > 0 && (
                <>
                  Showing{' '}
                  <span className="text-ink-900 font-medium">
                    {(search.data.page - 1) * search.data.pageSize + 1}–
                    {Math.min(search.data.page * search.data.pageSize, search.data.total)}
                  </span>{' '}
                  of {search.data.total}
                </>
              )}
            </p>
            <Select
              value={sort}
              onChange={(e) => update('sort', e.target.value)}
              aria-label="Sort results"
              wrapperClassName="w-56"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {search.loading && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          )}

          {!search.loading && search.data?.results.length === 0 && (
            <EmptyState
              title="No professionals match those filters"
              description="Try widening your location, raising the rate ceiling, or clearing a filter or two."
              action={
                <Button variant="secondary" onClick={clearAll}>
                  Clear all filters
                </Button>
              }
            />
          )}

          {!search.loading && search.data && search.data.results.length > 0 && (
            <>
              <div
                className={cx(
                  'grid gap-5 transition-opacity md:grid-cols-2 xl:grid-cols-3',
                  search.busy && 'opacity-50',
                )}
              >
                {search.data.results.map((pro) => (
                  <ProfessionalCard key={pro.id} pro={pro} />
                ))}
              </div>

              {search.data.totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => update('page', String(page - 1))}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: search.data.totalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => update('page', String(i + 1))}
                      className={cx(
                        'size-9 rounded-lg text-sm font-medium transition',
                        page === i + 1
                          ? 'bg-brand-600 text-white'
                          : 'text-ink-600 hover:bg-ink-100 border-ink-200 border bg-white',
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= search.data.totalPages}
                    onClick={() => update('page', String(page + 1))}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition',
        active ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-50',
      )}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && <span className="text-ink-400 ml-2 shrink-0 text-xs">{count}</span>}
    </button>
  );
}
