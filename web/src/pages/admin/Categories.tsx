import { useEffect, useState } from 'react';
import { ApiError, api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import type { AdminCategory } from '../../lib/types';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { CategoryIcon, Icons } from '../../components/icons';
import { Alert, Badge, Button, Card, Checkbox, Modal, Select, TextArea, TextInput } from '../../components/ui';
import { AdminShell } from './AdminShell';

const ICON_CHOICES = [
  'briefcase',
  'scale',
  'calculator',
  'home',
  'bolt',
  'droplet',
  'hammer',
  'target',
  'chart',
  'ruler',
  'shield',
  'paw',
];

export function AdminCategories() {
  const categories = useAsync(() => api<{ categories: AdminCategory[] }>('/admin/categories'));
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <AdminShell
      title="Categories"
      subtitle="The fields of expertise clients can browse. Deactivating one hides it from the public site."
      actions={
        <Button onClick={() => setCreating(true)}>
          <Icons.plus className="size-4" /> New category
        </Button>
      }
    >
      <ErrorBanner error={categories.error} />
      {categories.loading && <PageLoader />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.data?.categories.map((category) => (
          <Card key={category.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between">
              <span className="bg-brand-50 text-brand-600 flex size-11 items-center justify-center rounded-xl">
                <CategoryIcon name={category.icon} className="size-5" />
              </span>
              {!category.isActive && <Badge tone="neutral">hidden</Badge>}
            </div>
            <h2 className="text-ink-950 mt-4 font-semibold">{category.name}</h2>
            <p className="text-ink-500 mt-1 flex-1 text-sm">{category.description}</p>
            <div className="border-ink-100 mt-4 flex items-center justify-between border-t pt-3">
              <span className="text-ink-500 text-sm">
                {category.professionals} professional{category.professionals === 1 ? '' : 's'}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setEditing(category)}>
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <CategoryModal
        category={editing}
        open={editing !== null || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSaved={() => categories.reload()}
      />
    </AdminShell>
  );
}

function CategoryModal({
  category,
  open,
  onClose,
  onSaved,
}: {
  category: AdminCategory | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('briefcase');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setDescription(category?.description ?? '');
    setIcon(category?.icon ?? 'briefcase');
    setSortOrder(String(category?.sortOrder ?? 99));
    setIsActive(category?.isActive ?? true);
    setError(null);
  }, [open, category]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = { name, description, icon, sortOrder: Number(sortOrder), isActive };
      if (category) await api(`/admin/categories/${category.id}`, { method: 'PATCH', body });
      else await api('/admin/categories', { body });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Could not save the category.'));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={category ? `Edit ${category.name}` : 'New category'}
      width="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {category ? 'Save changes' : 'Create category'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="danger">{error.message}</Alert>}
        <TextInput label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextArea
          label="Description"
          hint="One line, shown on the category cards."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Icon" value={icon} onChange={(e) => setIcon(e.target.value)}>
            {ICON_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </Select>
          <TextInput
            label="Sort order"
            type="number"
            min={0}
            max={999}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-brand-50 text-brand-600 flex size-11 items-center justify-center rounded-xl">
            <CategoryIcon name={icon} className="size-5" />
          </span>
          <span className="text-ink-500 text-sm">Icon preview</span>
        </div>
        <Checkbox
          label="Show on the public site"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
      </div>
    </Modal>
  );
}
