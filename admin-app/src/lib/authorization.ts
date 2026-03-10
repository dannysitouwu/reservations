import type { WorkerProfile } from '../types/profile';

export function isAdmin(role: WorkerProfile['role'] | null | undefined) {
  return role === 'admin';
}

