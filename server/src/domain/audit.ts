import { all, run } from '../db/database.ts';
import type { AuthUser } from '../auth/middleware.ts';

export function recordAudit(
  actor: AuthUser | null,
  action: string,
  entityType: string,
  entityId: number | null,
  summary: string,
): void {
  run(
    `INSERT INTO audit_events (actor_id, actor_email, action, entity_type, entity_id, summary)
     VALUES (?, ?, ?, ?, ?, ?)`,
    actor?.id ?? null,
    actor?.email ?? 'system',
    action,
    entityType,
    entityId,
    summary,
  );
}

export interface AuditRow {
  id: number;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  summary: string;
  created_at: string;
}

export function listAudit(limit = 100): AuditRow[] {
  return all<AuditRow>(
    'SELECT * FROM audit_events ORDER BY created_at DESC, id DESC LIMIT ?',
    limit,
  );
}
