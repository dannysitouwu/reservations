export type WorkerProfile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'buyer' | 'worker' | 'admin';
};
