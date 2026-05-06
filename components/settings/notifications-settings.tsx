'use client';

import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Check, X, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface UserSettings {
  user_id: string;
  notification_email: string | null;
  telegram_chat_id: string | null;
  telegram_link_code: string | null;
  receives_reminders: boolean;
}

const cardClass = 'rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-4';
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? '';

export function NotificationsSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailDraft, setEmailDraft] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setSettings(d);
      setEmailDraft(d.notification_email ?? '');
      setLoading(false);
    });
  }, []);

  async function saveEmail() {
    setSavingEmail(true);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_email: emailDraft.trim() || null }),
    });
    if (res.ok) {
      const d = await res.json();
      setSettings(d);
      toast.success('Email guardado');
    } else {
      toast.error('Error al guardar el email');
    }
    setSavingEmail(false);
  }

  async function toggleReminders() {
    if (!settings) return;
    const next = !settings.receives_reminders;
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receives_reminders: next }),
    });
    if (res.ok) {
      const d = await res.json();
      setSettings(d);
      toast.success(next ? 'Avisos activados' : 'Avisos desactivados');
    } else {
      toast.error('Error');
    }
  }

  async function generateCode() {
    setGeneratingCode(true);
    const res = await fetch('/api/settings/telegram-code', { method: 'POST' });
    if (res.ok) {
      const d = await res.json();
      setSettings(d.settings);
      toast.success('Código generado');
    } else {
      toast.error('Error al generar código');
    }
    setGeneratingCode(false);
  }

  async function actuallyUnlink() {
    setUnlinking(true);
    const res = await fetch('/api/settings/telegram-code', { method: 'DELETE' });
    if (res.ok) {
      setSettings(s => s ? { ...s, telegram_chat_id: null, telegram_link_code: null } : s);
      toast.success('Telegram desvinculado');
      setConfirmingUnlink(false);
    } else {
      toast.error('Error');
    }
    setUnlinking(false);
  }

  function copyCode() {
    if (settings?.telegram_link_code) {
      navigator.clipboard.writeText(settings.telegram_link_code);
      toast.success('Código copiado');
    }
  }

  // Re-fetch settings when user comes back from Telegram (window focus)
  useEffect(() => {
    function onFocus() {
      fetch('/api/settings').then(r => r.json()).then(d => setSettings(d));
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (loading || !settings) return <p className="text-slate-500">Cargando...</p>;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={toggleReminders}
        className="flex items-center justify-between rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 p-4 w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        role="switch"
        aria-checked={settings.receives_reminders}
      >
        <div>
          <p className="font-medium">Recibir avisos automáticos</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Te avisamos 7, 3 y 1 días antes de cada vencimiento.</p>
        </div>
        <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${settings.receives_reminders ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`} aria-hidden>
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${settings.receives_reminders ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </span>
      </button>

      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium">Email</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">A qué dirección te llegan los avisos por mail.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input type="email" value={emailDraft} onChange={e => setEmailDraft(e.target.value)} placeholder="tu@email.com" />
          <Button onClick={saveEmail} disabled={savingEmail || emailDraft === (settings.notification_email ?? '')}>
            {savingEmail ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium">Telegram</h3>
          {settings.telegram_chat_id && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Vinculado
            </span>
          )}
        </div>

        {settings.telegram_chat_id ? (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Telegram está vinculado y vas a recibir avisos por ahí.</p>
            <Button
              variant="outline"
              onClick={() => setConfirmingUnlink(true)}
              className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50"
            >
              <X className="h-4 w-4 mr-1" /> Desvincular
            </Button>
          </>
        ) : settings.telegram_link_code ? (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Tu código:</p>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800 text-lg font-mono tracking-wider text-center">
                {settings.telegram_link_code}
              </code>
              <Button variant="outline" onClick={copyCode} className="text-slate-900 dark:text-slate-100"><Copy className="h-4 w-4" /></Button>
            </div>
            <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-decimal list-inside mb-3">
              <li>
                {BOT_USERNAME ? (
                  <>Abrí el bot:{' '}
                    <a
                      href={`https://t.me/${BOT_USERNAME}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline inline-flex items-center gap-0.5"
                    >
                      @{BOT_USERNAME} <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                ) : 'Abrí el bot en Telegram.'}
              </li>
              <li>Mandale <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">/start</code></li>
              <li>Después mandale el código de arriba.</li>
              <li>Esta página se actualiza sola cuando vuelvas — o recargá si querés.</li>
            </ol>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Vinculá tu Telegram para recibir avisos por ahí también.</p>
            <Button onClick={generateCode} disabled={generatingCode}>
              {generatingCode ? 'Generando...' : 'Vincular Telegram'}
            </Button>
          </>
        )}
      </div>

      {confirmingUnlink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-in p-4"
          onClick={() => !unlinking && setConfirmingUnlink(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-5 shadow-xl border dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">¿Desvincular Telegram?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Vas a dejar de recibir avisos por Telegram. Podés volver a vincularlo cuando quieras.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingUnlink(false)}
                disabled={unlinking}
                className="flex-1 text-slate-900 dark:text-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={actuallyUnlink}
                disabled={unlinking}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {unlinking ? 'Desvinculando...' : 'Sí, desvincular'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
