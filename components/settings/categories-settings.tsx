'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { Category } from '@/lib/types';

const cardClass = 'rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800';

export function CategoriesSettings() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🛒');
  const [creating, setCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then((d: Category[]) => {
        // Asegurar orden por position por las dudas (la API ya lo hace).
        setCats([...d].sort((a, b) => a.position - b.position));
        setLoading(false);
      });
  }, []);

  async function add() {
    if (!newName.trim()) return;
    setCreating(true);
    const maxPos = cats.reduce((m, c) => Math.max(m, c.position), 0);
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), icon: newIcon.trim() || null, color: '#64748B', position: maxPos + 1 }),
    });
    if (res.ok) {
      const c = await res.json();
      setCats(prev => [...prev, c]);
      setNewName('');
      setNewIcon('🛒');
      toast.success('Categoría creada');
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || 'Error al crear');
    }
    setCreating(false);
  }

  async function update(id: string, patch: Partial<Category>) {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const c = await res.json();
      setCats(prev => prev.map(x => (x.id === id ? c : x)));
      toast.success('Guardado');
    } else {
      toast.error('Error al guardar');
    }
  }

  async function move(index: number, direction: 'up' | 'down') {
    if (reordering) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= cats.length) return;

    setReordering(true);

    // Update optimista del orden local.
    const reordered = [...cats];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    // Asignar positions consecutivos basados en el nuevo orden (1, 2, 3, ...).
    const withNewPositions = reordered.map((c, i) => ({ ...c, position: i + 1 }));
    setCats(withNewPositions);

    // Mandar los 2 PATCH en paralelo (solo los que cambiaron de posición).
    const a = withNewPositions[index];
    const b = withNewPositions[newIndex];
    try {
      await Promise.all([
        fetch(`/api/categories/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: a.position }),
        }),
        fetch(`/api/categories/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: b.position }),
        }),
      ]);
    } catch {
      toast.error('Error al reordenar — recargá la página');
    }
    setReordering(false);
  }

  async function actuallyDelete() {
    if (!confirmingDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/categories/${confirmingDelete.id}`, { method: 'DELETE' });
    if (res.ok) {
      setCats(prev => prev.filter(x => x.id !== confirmingDelete.id));
      toast.success('Categoría borrada');
      setConfirmingDelete(null);
    } else {
      toast.error('Error al borrar');
    }
    setDeleting(false);
  }

  if (loading) return <p className="text-slate-500">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className={`${cardClass} flex flex-wrap items-end gap-2 p-4`}>
        <div className="space-y-1 w-20">
          <label className="text-xs text-slate-600 dark:text-slate-400">Icono</label>
          <Input value={newIcon} onChange={e => setNewIcon(e.target.value)} className="text-center text-lg" maxLength={4} />
        </div>
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-xs text-slate-600 dark:text-slate-400">Nombre</label>
          <Input
            placeholder="Nueva categoría"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
        </div>
        <Button onClick={add} disabled={creating || !newName.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Crear
        </Button>
      </div>

      <div className="space-y-3">
        {cats.length === 0 ? (
          <p className="text-slate-500 text-sm">Todavía no hay categorías.</p>
        ) : (
          cats.map((c, i) => (
            <CategoryRow
              key={c.id}
              category={c}
              isFirst={i === 0}
              isLast={i === cats.length - 1}
              reordering={reordering}
              onSave={p => update(c.id, p)}
              onDelete={() => setConfirmingDelete(c)}
              onMoveUp={() => move(i, 'up')}
              onMoveDown={() => move(i, 'down')}
            />
          ))
        )}
      </div>

      {confirmingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-in p-4"
          onClick={() => !deleting && setConfirmingDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-5 shadow-xl border dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">¿Borrar categoría?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Se borrará la categoría &quot;<strong>{confirmingDelete.name}</strong>&quot;. Los pagos en esta categoría quedarán sin categoría.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingDelete(null)}
                disabled={deleting}
                className="flex-1 text-slate-900 dark:text-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={actuallyDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? 'Borrando...' : 'Sí, borrar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  isFirst,
  isLast,
  reordering,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  category: Category;
  isFirst: boolean;
  isLast: boolean;
  reordering: boolean;
  onSave: (p: Partial<Category>) => Promise<void>;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon ?? '');
  const dirty = name !== category.name || icon !== (category.icon ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave({ name, icon: icon || null });
    setSaving(false);
  }

  const arrowBtnBase =
    'h-5 w-5 inline-flex items-center justify-center rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors';

  return (
    <div className={`${cardClass} flex flex-wrap items-center gap-2 p-3`}>
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst || reordering}
          aria-label="Subir"
          className={arrowBtnBase}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast || reordering}
          aria-label="Bajar"
          className={arrowBtnBase}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <Input value={icon} onChange={e => setIcon(e.target.value)} className="w-16 text-center text-lg" maxLength={4} />
      <Input value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-[180px]" />
      {dirty && (
        <Button
          size="sm"
          onClick={save}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
