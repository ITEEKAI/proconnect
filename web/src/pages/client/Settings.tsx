import { useEffect, useState } from 'react';
import { ApiError, api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Alert, Button, Card, TextInput } from '../../components/ui';
import { ClientShell } from './ClientShell';

export function ClientSettings() {
  const { user, refresh } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user?.fullName) setFullName(user.fullName);
  }, [user?.fullName]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      await api('/auth/me', { method: 'PATCH', body: { fullName } });
      await refresh();
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Could not update your name.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    setSavingPassword(true);
    try {
      await api('/auth/change-password', { body: { currentPassword, newPassword } });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Could not change your password.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <ClientShell title="Account" subtitle="Your name and password for this client login.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-ink-950 mb-4 font-semibold">Profile</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            {profileError && <Alert tone="danger">{profileError}</Alert>}
            {profileSaved && <Alert tone="success">Saved.</Alert>}
            <TextInput label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <TextInput label="Email" value={user?.email ?? ''} disabled />
            <Button type="submit" loading={savingProfile}>
              Save name
            </Button>
          </form>
        </Card>
        <Card className="p-6">
          <h2 className="text-ink-950 mb-4 font-semibold">Password</h2>
          <form onSubmit={savePassword} className="space-y-4">
            {passwordError && <Alert tone="danger">{passwordError}</Alert>}
            {passwordSaved && <Alert tone="success">Password updated.</Alert>}
            <TextInput
              label="Current password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <TextInput
              label="New password"
              type="password"
              required
              minLength={8}
              hint="At least 8 characters."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button type="submit" loading={savingPassword}>
              Change password
            </Button>
          </form>
        </Card>
      </div>
    </ClientShell>
  );
}
