/**
 * Tipos y helpers para cuentas bancarias.
 * Los datos viven en la tabla `accounts` de Supabase; CRUD vía /api/accounts.
 */

export type Bank = 'BROU' | 'SCOTIA' | 'ITAU';

export interface Account {
  id: string;
  provider: string;
  account_name: string;
  bank: Bank;
  account_type: string | null;
  account_number: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export function bankStyle(bank: Bank): { label: string; class: string } {
  switch (bank) {
    case 'BROU':
      return {
        label: 'BROU',
        class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      };
    case 'SCOTIA':
      return {
        label: 'SCOTIA',
        class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      };
    case 'ITAU':
      return {
        label: 'ITAÚ',
        class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      };
  }
}

export const BANK_ORDER: Bank[] = ['BROU', 'SCOTIA', 'ITAU'];
