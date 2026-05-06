import { CategoriesSettings } from '@/components/settings/categories-settings';
import { NotificationsSettings } from '@/components/settings/notifications-settings';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Gestioná las categorías y los avisos.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Categorías</h2>
        <CategoriesSettings />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Avisos</h2>
        <NotificationsSettings />
      </section>
    </div>
  );
}
