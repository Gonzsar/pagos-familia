import type { Payment, Category } from '@/lib/types';
import { formatAmount } from '@/lib/currency';

const TG_API = 'https://api.telegram.org';

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  opts?: { parseMode?: 'Markdown' | 'HTML' },
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurado');

  const res = await fetch(`${TG_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: opts?.parseMode ?? 'Markdown',
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Telegram API ${res.status}: ${errText}`);
  }
}

interface ReminderTelegramOpts {
  chatId: string;
  payment: Payment & { category: Category | null };
  windowDays: number;
}

function escapeMarkdown(s: string): string {
  return s.replace(/[_*`[\]]/g, ch => `\\${ch}`);
}

export async function sendReminderTelegram(opts: ReminderTelegramOpts): Promise<void> {
  const cat = opts.payment.category;
  const dateFormatted = opts.payment.due_date.split('-').reverse().join('/');

  const urgencyEmoji = opts.windowDays === 0 ? '🔴' : opts.windowDays === 1 ? '🟠' : opts.windowDays === 3 ? '🟡' : '🔵';
  const urgencyText = opts.windowDays === 0 ? 'VENCE HOY' : opts.windowDays === 1 ? 'Vence mañana' : `Vence en ${opts.windowDays} días`;

  const lines = [
    `${urgencyEmoji} *${escapeMarkdown(opts.payment.name)}* — ${urgencyText}`,
    '',
    `💵 ${formatAmount(opts.payment.amount, opts.payment.currency)}`,
    `📅 ${dateFormatted}`,
  ];
  if (opts.payment.payment_method) lines.push(`💳 ${escapeMarkdown(opts.payment.payment_method)}`);
  if (cat) lines.push(`🏷️ ${cat.icon ?? ''} ${escapeMarkdown(cat.name)}`);

  await sendTelegramMessage(opts.chatId, lines.join('\n'), { parseMode: 'Markdown' });
}
