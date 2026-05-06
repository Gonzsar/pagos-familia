import type { DisplayStatus } from '@/lib/types';

export function statusStyle(status: DisplayStatus): {
  badgeClass: string;
  dotClass: string;
  label: (days: number) => string;
} {
  switch (status) {
    case 'pagado':
      return {
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        dotClass: 'bg-emerald-500',
        label: () => 'Pagado',
      };
    case 'vencido':
      return {
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        dotClass: 'bg-red-500',
        label: (d) => `Vencido hace ${Math.abs(d)} d`,
      };
    case 'vence_hoy':
      return {
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold',
        dotClass: 'bg-red-500 animate-pulse',
        label: () => 'VENCE HOY',
      };
    case 'urgente':
      return {
        badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        dotClass: 'bg-orange-500',
        label: (d) => `Faltan ${d} d`,
      };
    case 'proximo':
      return {
        badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        dotClass: 'bg-amber-500',
        label: (d) => `Faltan ${d} d`,
      };
    case 'futuro':
      return {
        badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        dotClass: 'bg-slate-400',
        label: (d) => `Faltan ${d} d`,
      };
  }
}
