'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Cake, Plus, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ReminderForm } from '@/components/reminder-form';
import { toast } from 'sonner';
import {
  type Reminder,
  ageTurning,
  daysUntilBirthday,
  formatDayMonth,
  sortByUpcoming,
} from '@/lib/reminders';

const cardClass =
  'rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-4 transition-colors hover:border-slate-300 dark:hover:border-slate-700';

function daysBadge(days: number): { label: string; class: string } {
  if (days === 0) {
    return {
      label: '¡Es hoy! 🎂',
      class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    };
  }
  if (days === 1) {
    return {
      label: 'Mañana',
      class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    };
  }
  if (days <= 7) {
    return {
      label: `Faltan ${days} días`,
      class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    };
  }
  return {
    label: `Faltan ${days} días`,
    class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
}

export default function RecordatoriosPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch('/api/reminders').then(r => r.json()).then((d: Reminder[]) => {
      setReminders(d);
      setLoading(false);
    });
  }, []);

  const list = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? reminders.filter(r =>
          r.name.toLowerCase().includes(q) || (r.notes ?? '').toLowerCase().includes(q),
        )
      : reminders;
    return sortByUpcoming(filtered, today);
  }, [reminders, filter, today]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(r: Reminder) {
    setEditing(r);
    setFormOpen(true);
  }

  function onSaved(r: Reminder) {
    setReminders(prev => {
      const exists = prev.some(x => x.id === r.id);
      if (exists) return prev.map(x => (x.id === r.id ? r : x));
      return [...prev, r];
    });
    toast.success(editing ? 'Cumpleaños actualizado' : 'Cumpleaños agregado');
  }

  function onDeleted(id: string) {
    setReminders(prev => prev.filter(x => x.id !== id));
    toast.success('Cumpleaños eliminado');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Cake className="h-7 w-7 text-blue-600" />
          Cumpleaños
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Cumpleaños de la familia y allegados, ordenados por el más próximo.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Input
          type="search"
          placeholder="Buscar por nombre o nota..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 max-w-md"
        />
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Agregar cumpleaños
        </Button>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          {filter ? 'No hay cumpleaños que coincidan con tu búsqueda.' : 'Todavía no agregaste cumpleaños.'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map(r => {
            const days = daysUntilBirthday(r.day, r.month, today);
            const badge = daysBadge(days);
            const age = ageTurning(r.birth_year, r.day, r.month, today);
            return (
              <div key={r.id} className={`${cardClass} relative group flex items-center gap-3`}>
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-2xl"
                  aria-hidden
                >
                  🎂
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold truncate pr-8">{r.name}</h3>
                  <p className="font-display font-medium tabular-nums tracking-wide text-slate-700 dark:text-slate-300">
                    {formatDayMonth(r.day, r.month)}
                    {age != null && (
                      <span className="text-slate-500 dark:text-slate-400 font-normal">
                        {' '}· cumple {age}
                      </span>
                    )}
                  </p>
                  {r.notes && (
                    <p className="text-xs italic text-slate-500 dark:text-slate-400 truncate">
                      {r.notes}
                    </p>
                  )}
                  <span className={`mt-1.5 inline-block text-xs px-2 py-1 rounded-md font-medium ${badge.class}`}>
                    {badge.label}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  aria-label="Editar"
                  className="absolute top-2 right-2 inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ReminderForm
        open={formOpen}
        onOpenChange={setFormOpen}
        reminder={editing}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </div>
  );
}
