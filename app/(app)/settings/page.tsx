import { CategoriesSettings } from '@/components/settings/categories-settings';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Gestioná las categorías de tus pagos.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Categorías</h2>
        <CategoriesSettings />
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm text-slate-500 dark:text-slate-400">
        Próximamente vas a poder configurar tu email y vincular Telegram para recibir avisos automáticos antes de cada vencimiento.
      </section>
    </div>
  );
}
