import type { Payment, Category } from '@/lib/types';
import { formatAmount } from '@/lib/currency';

interface ReminderEmailOpts {
  to: string;
  payment: Payment & { category: Category | null };
  windowDays: number;
  appUrl: string;
}

function getUrgencyColor(window: number): string {
  if (window === 0) return '#EF4444';
  if (window === 1) return '#F97316';
  if (window === 3) return '#F59E0B';
  return '#3B82F6';
}

function getUrgencyText(window: number): string {
  if (window === 0) return 'VENCE HOY';
  if (window === 1) return 'Vence mañana';
  return `Vence en ${window} días`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendReminderEmail(opts: ReminderEmailOpts): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'Plan Pagos <onboarding@resend.dev>';

  if (!apiKey) throw new Error('RESEND_API_KEY no configurado');

  const color = getUrgencyColor(opts.windowDays);
  const urgency = getUrgencyText(opts.windowDays);
  const cat = opts.payment.category;
  const dateFormatted = opts.payment.due_date.split('-').reverse().join('/');

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f8fafc; padding: 24px; margin: 0;">
  <table role="presentation" width="100%" style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <tr><td style="background: ${color}; color: white; padding: 16px 24px; font-weight: 600; font-size: 18px;">${urgency}</td></tr>
    <tr><td style="padding: 24px;">
      <h1 style="margin: 0 0 16px 0; font-size: 22px; color: #0f172a;">${escapeHtml(opts.payment.name)}</h1>
      <table style="width: 100%; font-size: 15px; color: #334155; border-collapse: collapse;">
        <tr><td style="padding: 4px 0;">💵 Monto:</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${formatAmount(opts.payment.amount, opts.payment.currency)}</td></tr>
        <tr><td style="padding: 4px 0;">📅 Fecha:</td><td style="padding: 4px 0; text-align: right;">${dateFormatted}</td></tr>
        ${opts.payment.payment_method ? `<tr><td style="padding: 4px 0;">💳 Método:</td><td style="padding: 4px 0; text-align: right;">${escapeHtml(opts.payment.payment_method)}</td></tr>` : ''}
        ${cat ? `<tr><td style="padding: 4px 0;">🏷️ Categoría:</td><td style="padding: 4px 0; text-align: right;">${cat.icon ?? ''} ${escapeHtml(cat.name)}</td></tr>` : ''}
      </table>
      <div style="margin-top: 24px; text-align: center;">
        <a href="${opts.appUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Ver en la web</a>
      </div>
    </td></tr>
    <tr><td style="background: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 12px; color: #64748b;">Plan de Pagos Familiar</td></tr>
  </table>
</body></html>`;

  const subject = opts.windowDays === 0
    ? `🔴 Vence hoy: ${opts.payment.name}`
    : `📌 ${opts.payment.name} vence en ${opts.windowDays} día${opts.windowDays === 1 ? '' : 's'}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: opts.to, subject, html }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API ${res.status}: ${errText}`);
  }
}
