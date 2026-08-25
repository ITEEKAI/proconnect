import { useEffect, useState } from 'react';
import { ApiError, api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { AvailabilitySlot, Credential, ProfessionalPrivate } from '../../lib/types';
import { PageLoader } from '../../components/Layout';
import { Icons } from '../../components/icons';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  LinkButton,
  TagInput,
  TextArea,
  TextInput,
} from '../../components/ui';
import { ProShell, VerificationNotice } from './ProDashboard';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function ProProfile() {
  const { professional, refresh } = useAuth();

  const [form, setForm] = useState({
    displayName: '',
    businessName: '',
    headline: '',
    bio: '',
    city: '',
    region: '',
    country: '',
    website: '',
    yearsExperience: '0',
    responseTimeHours: '24',
  });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [hours, setHours] = useState(
    WEEKDAYS.map((_, weekday) => ({ weekday, enabled: weekday < 5, start: '09:00', end: '17:00' })),
  );

  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (!professional) return;
    setForm({
      displayName: professional.displayName,
      businessName: professional.businessName ?? '',
      headline: professional.headline,
      bio: professional.bio,
      city: professional.location.city,
      region: professional.location.region,
      country: professional.location.country,
      website: professional.website ?? '',
      yearsExperience: String(professional.yearsExperience),
      responseTimeHours: String(professional.responseTimeHours),
    });
    setSpecialties(professional.specialties);
    setLanguages(professional.languages);
    setServiceAreas(professional.serviceAreas);
    setCredentials(professional.credentials.length ? professional.credentials : []);
    setIsPublished(professional.isPublished);
  }, [professional]);

  useEffect(() => {
    let cancelled = false;
    void api<{ availability: AvailabilitySlot[] }>('/professional/availability').then((data) => {
      if (cancelled) return;
      const byDay = new Map(data.availability.map((slot) => [slot.weekday, slot]));
      setHours(
        WEEKDAYS.map((_, weekday) => {
          const slot = byDay.get(weekday);
          return {
            weekday,
            enabled: Boolean(slot),
            start: slot?.start ?? '09:00',
            end: slot?.end ?? '17:00',
          };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!professional) {
    return (
      <ProShell title="Profile">
        <PageLoader />
      </ProShell>
    );
  }

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setError(null);
    try {
      await api('/professional/avatar', { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Could not remove that photo.'));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function uploadAvatar(file: File) {
    setAvatarBusy(true);
    setError(null);
    try {
      const imageBase64 = await readFileAsDataUrl(file);
      await api('/professional/avatar', { body: { mimeType: file.type, imageBase64 } });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Could not upload that photo.'));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api<{ professional: ProfessionalPrivate }>('/professional/profile', {
        method: 'PATCH',
        body: {
          displayName: form.displayName,
          businessName: form.businessName || null,
          headline: form.headline,
          bio: form.bio,
          city: form.city,
          region: form.region,
          country: form.country,
          website: form.website || null,
          yearsExperience: Number(form.yearsExperience),
          responseTimeHours: Number(form.responseTimeHours),
          specialties,
          languages,
          serviceAreas,
          credentials: credentials.filter((item) => item.label.trim()),
          isPublished,
        },
      });
      await api('/professional/availability', {
        method: 'PUT',
        body: {
          slots: hours
            .filter((day) => day.enabled)
            .map((day) => ({ weekday: day.weekday, start: day.start, end: day.end })),
        },
      });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProShell
      title="Profile"
      subtitle="This is what clients read before they contact you."
      actions={
        professional.isPublished ? (
          <LinkButton to={`/pro/${professional.slug}`} variant="secondary">
            View public profile <Icons.arrowRight className="size-4" />
          </LinkButton>
        ) : undefined
      }
    >
      <VerificationNotice />

      <form onSubmit={save} className="space-y-6">
        {error && <Alert tone="danger">{error.message}</Alert>}
        {saved && <Alert tone="success">Profile saved.</Alert>}

        <Card className="p-6">
          <h2 className="text-ink-950 mb-5 font-semibold">Photo</h2>
          <div className="flex flex-wrap items-center gap-5">
            <Avatar name={professional.displayName} size="xl" src={professional.avatarUrl} />
            <div>
              <label className="inline-flex">
                <span className="bg-white text-ink-800 border-ink-200 hover:bg-ink-50 inline-flex h-10 cursor-pointer items-center rounded-xl border px-4 text-sm font-medium">
                  {avatarBusy ? 'Uploading…' : 'Upload photo'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={avatarBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadAvatar(file);
                    event.target.value = '';
                  }}
                />
              </label>
              {professional.avatarUrl && (
                <button
                  type="button"
                  className="text-ink-600 ml-3 text-sm font-medium hover:underline"
                  disabled={avatarBusy}
                  onClick={() => void removeAvatar()}
                >
                  Remove photo
                </button>
              )}
              <p className="text-ink-500 mt-2 text-xs">JPEG, PNG, WebP or GIF. Keep it under 1.5 MB.</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-ink-950 mb-5 font-semibold">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Display name"
              required
              value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
            />
            <TextInput
              label="Business name"
              value={form.businessName}
              onChange={(e) => set('businessName', e.target.value)}
            />
            <TextInput
              label="Headline"
              required
              wrapperClassName="sm:col-span-2"
              hint="One sentence. This is the first thing people read in search results."
              value={form.headline}
              onChange={(e) => set('headline', e.target.value)}
            />
            <TextArea
              label="About"
              wrapperClassName="sm:col-span-2"
              className="min-h-40"
              hint="What you specialise in, who you work with, and how you like to work."
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-ink-950 mb-5 font-semibold">Typical hours</h2>
          <p className="text-ink-500 mb-4 text-sm">
            Shown on your public profile so clients know when you usually work.
          </p>
          <ul className="space-y-2">
            {hours.map((day) => (
              <li key={day.weekday} className="flex flex-wrap items-center gap-3">
                <label className="flex w-32 items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => {
                      setHours((current) =>
                        current.map((item) =>
                          item.weekday === day.weekday ? { ...item, enabled: e.target.checked } : item,
                        ),
                      );
                      setSaved(false);
                    }}
                  />
                  {WEEKDAYS[day.weekday]}
                </label>
                <input
                  type="time"
                  disabled={!day.enabled}
                  value={day.start}
                  onChange={(e) => {
                    setHours((current) =>
                      current.map((item) =>
                        item.weekday === day.weekday ? { ...item, start: e.target.value } : item,
                      ),
                    );
                    setSaved(false);
                  }}
                  className="border-ink-200 h-9 rounded-lg border px-2 text-sm disabled:opacity-40"
                />
                <span className="text-ink-400 text-sm">to</span>
                <input
                  type="time"
                  disabled={!day.enabled}
                  value={day.end}
                  onChange={(e) => {
                    setHours((current) =>
                      current.map((item) =>
                        item.weekday === day.weekday ? { ...item, end: e.target.value } : item,
                      ),
                    );
                    setSaved(false);
                  }}
                  className="border-ink-200 h-9 rounded-lg border px-2 text-sm disabled:opacity-40"
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="text-ink-950 mb-2 font-semibold">Credentials and accreditations</h2>
          <p className="text-ink-500 mb-4 text-sm">
            Shown on your public profile. Our team checks these when they verify you.
          </p>
          <ul className="space-y-3">
            {credentials.map((credential, index) => (
              <li key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
                <TextInput
                  label={index === 0 ? 'Credential' : undefined}
                  placeholder="e.g. Gas Safe Registered"
                  value={credential.label}
                  onChange={(e) => {
                    setCredentials((current) =>
                      current.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)),
                    );
                    setSaved(false);
                  }}
                />
                <TextInput
                  label={index === 0 ? 'Issuer' : undefined}
                  placeholder="e.g. Gas Safe Register"
                  value={credential.issuer}
                  onChange={(e) => {
                    setCredentials((current) =>
                      current.map((item, i) => (i === index ? { ...item, issuer: e.target.value } : item)),
                    );
                    setSaved(false);
                  }}
                />
                <TextInput
                  label={index === 0 ? 'Year' : undefined}
                  type="number"
                  min={1900}
                  max={2100}
                  value={credential.year ?? ''}
                  onChange={(e) => {
                    const year = e.target.value === '' ? null : Number(e.target.value);
                    setCredentials((current) =>
                      current.map((item, i) => (i === index ? { ...item, year } : item)),
                    );
                    setSaved(false);
                  }}
                />
                <button
                  type="button"
                  className="text-ink-500 hover:text-rose-700 self-end pb-2 text-sm"
                  onClick={() => {
                    setCredentials((current) => current.filter((_, i) => i !== index));
                    setSaved(false);
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => {
              setCredentials((current) => [...current, { label: '', issuer: '', year: null }]);
              setSaved(false);
            }}
          >
            Add credential
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-ink-950 mb-5 font-semibold">Expertise</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TagInput
              label="Specialisms"
              wrapperClassName="sm:col-span-2"
              hint="Press Enter after each one. These are searchable."
              values={specialties}
              onChange={(v) => {
                setSpecialties(v);
                setSaved(false);
              }}
              placeholder="e.g. Full rewires"
            />
            <TextInput
              label="Years of experience"
              type="number"
              min={0}
              max={80}
              value={form.yearsExperience}
              onChange={(e) => set('yearsExperience', e.target.value)}
            />
            <TextInput
              label="Typical response time (hours)"
              type="number"
              min={1}
              max={168}
              value={form.responseTimeHours}
              onChange={(e) => set('responseTimeHours', e.target.value)}
            />
            <TagInput
              label="Languages"
              values={languages}
              onChange={(v) => {
                setLanguages(v);
                setSaved(false);
              }}
              placeholder="English"
            />
            <TagInput
              label="Areas covered"
              values={serviceAreas}
              onChange={(v) => {
                setServiceAreas(v);
                setSaved(false);
              }}
              placeholder="e.g. Manchester"
            />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-ink-950 mb-5 font-semibold">Location and links</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label="Town or city" value={form.city} onChange={(e) => set('city', e.target.value)} />
            <TextInput
              label="County or region"
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
            />
            <TextInput label="Country" value={form.country} onChange={(e) => set('country', e.target.value)} />
            <TextInput
              label="Website"
              wrapperClassName="sm:col-span-3"
              placeholder="https://"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-ink-950 mb-4 font-semibold">Visibility</h2>
          <Checkbox
            label="List my profile in the public directory"
            description={
              professional.verificationStatus === 'verified'
                ? 'Turn this off to pause new enquiries without losing your profile.'
                : 'Available once our team has verified your credentials.'
            }
            checked={isPublished}
            disabled={professional.verificationStatus !== 'verified'}
            onChange={(e) => {
              setIsPublished(e.target.checked);
              setSaved(false);
            }}
          />
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={saving}>
            Save profile
          </Button>
        </div>
      </form>
    </ProShell>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}
