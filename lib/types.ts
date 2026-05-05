export type Currency = 'USD' | 'UYU';
export type PaymentStatus = 'pendiente' | 'pagado';

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
  created_at: string;
}

export interface Payment {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  due_date: string;          // YYYY-MM-DD
  category_id: string | null;
  payment_method: string | null;
  is_recurring: boolean;
  recurrence_months: number;
  status: PaymentStatus;
  notify_enabled: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithCategory extends Payment {
  category: Category | null;
}

export interface PaymentHistoryEntry {
  id: string;
  payment_id: string;
  paid_at: string;
  paid_amount: number;
  paid_currency: Currency;
  due_date_at_payment: string;
  paid_by: string | null;
}

export type DisplayStatus =
  | 'pagado'
  | 'vencido'
  | 'vence_hoy'
  | 'urgente'    // ≤3 días
  | 'proximo'    // ≤7 días
  | 'futuro';    // >7 días
