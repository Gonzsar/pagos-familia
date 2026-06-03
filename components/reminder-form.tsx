'use client';

import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MESES, type Reminder } from '@/lib/reminders';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder | null;
  onSaved: (r: Reminder) => void;
  onDeleted: (id: string) => void;
}

interface FormData {
  name: string;
  day: number;
  month: number;
  birth_year: string; // como texto para permitir vacío
  notes: string;
}

const empty = (): FormData => ({
  name: '',
  day: 1,
  month: 1,
  birth_year: '',
  notes: '',
});

function fromReminder(r: Reminder): FormData {
  return {
    name: r.name,
    day: r.day,
    month: r.month,
    birth_year: r.birth_year != null ? String(r.birth_year) : '',
    notes: r.notes ?? '',
  };
}

const selectClass =
  'flex h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500';

export function ReminderForm({ open, onOpenChange, reminder, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<FormData>(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setForm(reminder ? fromReminder(reminder) : empty());
    setError(null);
    setConfirmDelete(false);
  }, [reminder, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  async function save() {
    if (!form.name.trim()) {
      setError('Poné un nombre');
      return;
    }
    setSaving(true);
    setError(null);

    let birthYear: number | null = null;
    if (form.birth_year.trim()) {
      const y = Number(form.birth_year.trim());
      if (!Number.isInteger(y) || y < 1900 || y > 2100) {
        setError('El año de nacimiento no es válido');
        setSaving(false);
        return;
      }
      birthYear = y;
    }

    const payload = {
      name: form.name.trim(),
      day: form.day,
      month: form.month,
      birth_year: birthYear,
      notes: form.notes.trim() || null,
    };

    const url = reminder ? `/api/reminders/${reminder.id}` : '/api/reminders';
    const method = reminder ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Error al guardar');
      setSaving(false);
      return;
    }

    const saved = await res.json();
    onSaved(saved);
    onOpenChange(false);
    setSaving(false);
  }

  async function actuallyDelete() {
    if (!reminder) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/reminders/${reminder.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDeleted(reminder.id);
      setConfirmDelete(false);
      onOpenChange(false);
    } else {
      setError('Error al borrar');
    }
    setSaving(false);
  }

  // Días posibles según el mes elegido (para no permitir 31 en meses cortos).
  const daysInMonth = new Date(2024, form.month, 0).getDate(); // 2024 bisiesto → febrero 29

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-backdrop-in"
        aria-hidden="true"
      />
      <div
        className="fixed right-0 top-0 z-50 h-full w-full sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto border-l dark:border-slate-800 animate-panel-in flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-semibold">
            {reminder ? 'Editar cumpleaños' : 'Agregar cumpleaños'}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Valeria García"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="day">Día</Label>
              <select
                id="day"
                value={form.day}
                onChange={e => setForm({ ...form, day: Number(e.target.value) })}
                className={selectClass}
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Mes</Label>
              <select
                id="month"
                value={form.month}
                onChange={e => {
                  const m = Number(e.target.value);
                  const max = new Date(2024, m, 0).getDate();
                  setForm({ ...form, month: m, day: Math.min(form.day, max) });
                }}
                className={selectClass}
              >
                {MESES.map((nombre, i) => (
                  <option key={i} value={i + 1}>
                    {nombre.charAt(0).toUpperCase() + nombre.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_year">Año de nacimiento (opcional)</Label>
            <Input
              id="birth_year"
              type="number"
              inputMode="numeric"
              value={form.birth_year}
              onChange={e => setForm({ ...form, birth_year: e.target.value })}
              placeholder="Ej: 1990"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Si lo cargás, mostramos la edad que cumple.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Nota (opcional)</Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Ej: Tía, prima, etc."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="border-t dark:border-slate-800 p-4 pb-6 flex flex-col gap-3 bg-white dark:bg-slate-900">
          <Button onClick={save} disabled={saving} className="w-full" size="lg">
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          {reminder && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Borrar cumpleaños
            </Button>
          )}
        </div>

        {confirmDelete && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in p-4"
            onClick={() => !saving && setConfirmDelete(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-5 shadow-xl border dark:border-slate-700"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">¿Borrar cumpleaños?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Esta acción no se puede deshacer. Se eliminará el cumpleaños de &quot;<strong>{reminder?.name}</strong>&quot; permanentemente.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                  className="flex-1 text-slate-900 dark:text-slate-100"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={actuallyDelete}
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {saving ? 'Borrando...' : 'Sí, borrar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
