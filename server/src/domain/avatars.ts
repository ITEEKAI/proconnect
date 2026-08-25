import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.ts';
import { ApiError } from '../lib/errors.ts';

const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_BYTES = Math.floor(1.5 * 1024 * 1024);

export function ensureUploadsDir(): string {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  return config.uploadsDir;
}

export function removeAvatarFiles(professionalId: number): void {
  const dir = path.join(ensureUploadsDir(), 'avatars');
  if (!fs.existsSync(dir)) return;
  const prefix = `${professionalId}-`;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(prefix)) fs.unlinkSync(path.join(dir, name));
  }
}

/** Persist a base64 image and return the public URL served from `/uploads`. */
export function saveAvatar(professionalId: number, mimeType: string, imageBase64: string): string {
  const ext = ALLOWED[mimeType];
  if (!ext) throw ApiError.badRequest('Upload a JPEG, PNG, WebP or GIF image.');

  const raw = imageBase64.includes(',') ? imageBase64.slice(imageBase64.indexOf(',') + 1) : imageBase64;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(raw, 'base64');
  } catch {
    throw ApiError.badRequest('That image could not be read.');
  }
  if (buffer.length < 32) throw ApiError.badRequest('That file looks empty.');
  if (buffer.length > MAX_BYTES) throw ApiError.badRequest('Keep photos under 1.5 MB.');

  const dir = path.join(ensureUploadsDir(), 'avatars');
  fs.mkdirSync(dir, { recursive: true });
  removeAvatarFiles(professionalId);
  const filename = `${professionalId}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/avatars/${filename}`;
}
