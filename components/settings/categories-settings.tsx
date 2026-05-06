'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
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

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => {
        setCats(d);
        setLoading(false);
      });
  }, []);

  async function add() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), icon: newIcon.trim() || null, color: '#64748B', position: cats.length + 1 }),
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
          cats.map(c => (
            <CategoryRow
              key={c.id}
              category={c}
              onSave={p => update(c.id, p)}
              onDelete={() => setConfirmingDelete(c)}
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
  onSave,
  onDelete,
}: {
  category: Category;
  onSave: (p: Partial<Category>) => Promise<void>;
  onDelete: () => void;
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

  return (
    <div className={`${cardClass} flex flex-wrap items-center gap-2 p-3`}>
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
