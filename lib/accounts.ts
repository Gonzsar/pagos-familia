/**
 * Datos de cuentas bancarias de proveedores.
 * Para editar / agregar / borrar: modificar este archivo y commitear.
 */

export type Bank = 'BROU' | 'SCOTIA' | 'ITAU';

export interface AccountEntry {
  provider: string;          // Nombre del proveedor (mostrado en grande)
  accountName: string;       // Nombre de cuenta (formal, mostrado chiquito arriba)
  bank: Bank;
  accountType?: string;      // "Caja Ahorro Dólares", "Cuenta Corriente", "Caja Ahorro"
  accountNumber: string;     // Número formateado tal como se debe ver / copiar
}

export const ACCOUNTS: AccountEntry[] = [
  {
    provider: 'TRULYMAXX',
    accountName: 'TRULYMAX S.A',
    bank: 'BROU',
    accountType: 'Caja Ahorro Dólares',
    accountNumber: '110 187 499 000 02',
  },
  {
    provider: 'FRIELECTRIC',
    accountName: 'REFRIGERACION FRIELECTRIC S.A',
    bank: 'BROU',
    accountNumber: '001 547 032 000 01',
  },
  {
    provider: 'CHALAR',
    accountName: 'REFRISHOP S.A',
    bank: 'BROU',
    accountNumber: '001 561 441 000 02',
  },
  {
    provider: 'CEGA',
    accountName: 'CEGA TEAM SRL',
    bank: 'BROU',
    accountNumber: '110 143 783 000 04',
  },
  {
    provider: 'CCIAP',
    accountName: 'CCIAP',
    bank: 'BROU',
    accountNumber: '001 532 412 000 05',
  },
  {
    provider: 'PAMPIN',
    accountName: 'PAMPIN Y CIA S.A',
    bank: 'BROU',
    accountNumber: '001 548 969 000 01',
  },
  {
    provider: 'SCANTECH',
    accountName: 'HOSTING SA',
    bank: 'SCOTIA',
    accountNumber: '03-3636 74700',
  },
  {
    provider: 'TOYIMA',
    accountName: 'TOYIMA',
    bank: 'BROU',
    accountNumber: '001 566 902 000 07',
  },
  {
    provider: 'HERBI',
    accountName: 'ALEJANDRO BIA Y OTRO',
    bank: 'BROU',
    accountNumber: '000 420 167 000 01',
  },
  {
    provider: 'FIVISA',
    accountName: 'FIVISA',
    bank: 'SCOTIA',
    accountType: 'Cuenta Corriente',
    accountNumber: '01-0589862500',
  },
  {
    provider: 'TORBUL (TRIZUR)',
    accountName: 'TRIZUR S.A',
    bank: 'SCOTIA',
    accountType: 'Cuenta Corriente',
    accountNumber: '002-096 392 1700',
  },
  {
    provider: 'ASPIRATUTO',
    accountName: 'ANALIZA RAFFAELLI',
    bank: 'BROU',
    accountType: 'Caja Ahorro',
    accountNumber: '198 038 2756',
  },
  {
    provider: 'REFRIMAXX',
    accountName: 'REFRIMAXX SAS',
    bank: 'ITAU',
    accountNumber: '2357192',
  },
];

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
