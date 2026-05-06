/**
 * Cron diario: lee pagos en ventana 7/3/1/0, manda Email + Telegram a los suscriptores.
 * Anti-duplicado vía notification_log (UNIQUE constraint en (payment_id, window_days, due_date, channel)).
 *
 * Run: npm run send-reminders
 * Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
 *               RESEND_FROM_EMAIL, TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL
 */
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

import type { Payment, Category } from '@/lib/types';
import { shouldNotify } from '@/lib/notifications';
import { sendReminderEmail } from '@/lib/email';
import { sendReminderTelegram } from '@/lib/telegram';

interface UserSettingsRow {
  user_id: string;
  notification_email: string | null;
  telegram_chat_id: string | null;
  receives_reminders: boolean;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pagos-familia-psi.vercel.app';
  if (!supabaseUrl || !serviceKey) throw new Error('Faltan SUPABASE env vars');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Hoy en zona horaria Uruguay (UTC-3, sin DST)
  const now = new Date();
  const uytNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const today = format(uytNow, 'yyyy-MM-dd');
  console.log(`[send-reminders] today (UYT) = ${today}`);

  // 1. Subscribers
  const { data: subs, error: subsErr } = await supabase
    .from('user_settings')
    .select('user_id, notification_email, telegram_chat_id, receives_reminders')
    .eq('receives_reminders', true);
  if (subsErr) throw subsErr;
  if (!subs || subs.length === 0) {
    console.log('[send-reminders] no subscribers, exiting');
    return;
  }
  console.log(`[send-reminders] ${subs.length} subscribers`);

  // 2. Pagos pendientes con notify_enabled=true
  const { data: payments, error: pErr } = await supabase
    .from('payments')
    .select('*, category:categories(*)')
    .eq('status', 'pendiente')
    .eq('notify_enabled', true);
  if (pErr) throw pErr;
  if (!payments || payments.length === 0) {
    console.log('[send-reminders] no pending payments, exiting');
    return;
  }

  // 3. Filtrar los que están en ventana
  type PaymentWithCat = Payment & { category: Category | null };
  const candidates: { p: PaymentWithCat; w: number }[] = [];
  for (const p of payments as PaymentWithCat[]) {
    const w = shouldNotify(p, today, { returnWindow: true });
    if (w !== null) candidates.push({ p, w });
  }
  console.log(`[send-reminders] ${candidates.length} payments in notification window`);

  let sent = 0, failed = 0, skipped = 0;
  for (const { p, w } of candidates) {
    for (const sub of subs as UserSettingsRow[]) {
      const channels: ('email' | 'telegram')[] = [];
      if (sub.notification_email) channels.push('email');
      if (sub.telegram_chat_id) channels.push('telegram');

      for (const ch of channels) {
        // Anti-dup: si ya hay log success=true para este (payment, window, due_date, channel), skip
        const { data: existing } = await supabase
          .from('notification_log')
          .select('id')
          .eq('payment_id', p.id)
          .eq('window_days', w)
          .eq('due_date', p.due_date)
          .eq('channel', ch)
          .eq('success', true)
          .maybeSingle();
        if (existing) {
          skipped++;
          continue;
        }

        try {
          if (ch === 'email' && sub.notification_email) {
            await sendReminderEmail({
              to: sub.notification_email,
              payment: p,
              windowDays: w,
              appUrl,
            });
          } else if (ch === 'telegram' && sub.telegram_chat_id) {
            await sendReminderTelegram({ chatId: sub.telegram_chat_id, payment: p, windowDays: w });
          }
          await supabase.from('notification_log').insert({
            payment_id: p.id,
            window_days: w,
            due_date: p.due_date,
            channel: ch,
            success: true,
          });
          sent++;
          console.log(`[send-reminders] sent ${ch} for ${p.name} (window=${w})`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[send-reminders] FAIL ${ch} for ${p.name}: ${msg}`);
          await supabase.from('notification_log').insert({
            payment_id: p.id,
            window_days: w,
            due_date: p.due_date,
            channel: ch,
            success: false,
            error_message: msg,
          });
          failed++;
        }
      }
    }
  }

  console.log(`[send-reminders] done. sent=${sent} failed=${failed} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
