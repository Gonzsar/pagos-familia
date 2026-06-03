'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Wallet, Settings, History, LogOut, User, ChevronDown, Cake } from 'lucide-react';

interface Props {
  userEmail: string;
}

export function AppHeader({ userEmail }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  async function logout() {
    setOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur dark:bg-slate-900/80 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Wallet className="h-4 w-4" />
          </span>
          <span>Plan de Pagos</span>
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-expanded={open}
            aria-haspopup="true"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline max-w-[200px] truncate">{userEmail}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 shadow-lg overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-100"
            >
              <div className="px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-b dark:border-slate-700 truncate">
                {userEmail}
              </div>
              <Link
                href="/recordatorios"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Cake className="h-4 w-4" /> Cumpleaños
              </Link>
              <Link
                href="/history"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <History className="h-4 w-4" /> Historial
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="h-4 w-4" /> Configuración
              </Link>
              <button
                type="button"
                onClick={logout}
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t dark:border-slate-700"
              >
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
