import {
  collection, addDoc, getDocs, query, where,
  orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AuditLog, AuditAction } from '@/types';

const COLLECTION = 'auditLogs';

interface CreateAuditLogParams {
  adminId: string;
  adminEmail: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    ...params,
    timestamp: serverTimestamp(),
  });
}

export async function getAuditLogs(filters?: {
  action?: AuditAction;
  entity?: string;
  adminEmail?: string;
  limitCount?: number;
}): Promise<AuditLog[]> {
  const constraints = [];

  if (filters?.action) constraints.push(where('action', '==', filters.action));
  if (filters?.entity) constraints.push(where('entity', '==', filters.entity));
  if (filters?.adminEmail) constraints.push(where('adminEmail', '==', filters.adminEmail));

  constraints.push(orderBy('timestamp', 'desc'));
  constraints.push(limit(filters?.limitCount || 100));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
}
