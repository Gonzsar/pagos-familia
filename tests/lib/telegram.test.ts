import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendReminderTelegram, sendTelegramMessage } from '@/lib/telegram';
import type { Payment, Category } from '@/lib/types';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('TELEGRAM_BOT_TOKEN', '123:abc');
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });
});

const cat: Category = { id: 'c1', name: 'Entretenimiento', icon: '🎬', color: null, position: 1, created_at: '' };
const payment: Payment & { category: Category | null } = {
  id: 'p1', name: 'ChatGPT', amount: 20, currency: 'USD',
  due_date: '2026-05-13', category_id: 'c1', payment_method: 'PREX GON',
  is_recurring: true, recurrence_months: 1,
  status: 'pendiente', notify_enabled: true, count_in_totals: true, paid_for_cycle: null,
  notes: null, created_by: null, created_at: '', updated_at: '',
  category: cat,
};

describe('sendTelegramMessage', () => {
  it('llama al endpoint del bot con chat_id y texto', async () => {
    await sendTelegramMessage('99999', 'hola');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bot123:abc/sendMessage');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.chat_id).toBe('99999');
    expect(body.text).toBe('hola');
    expect(body.parse_mode).toBe('Markdown');
  });

  it('tira error si Telegram devuelve no-ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'bad request' });
    await expect(sendTelegramMessage('99999', 'hola')).rejects.toThrow(/Telegram API 400/);
  });
});

describe('sendReminderTelegram', () => {
  it('formato Markdown con todos los campos', async () => {
    await sendReminderTelegram({ chatId: '99999', payment, windowDays: 1 });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.text).toContain('ChatGPT');
    expect(body.text).toContain('Vence mañana');
    expect(body.text).toContain('PREX GON');
    expect(body.text).toContain('Entretenimiento');
  });

  it('vence hoy usa 🔴', async () => {
    await sendReminderTelegram({ chatId: '99999', payment, windowDays: 0 });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.text).toMatch(/🔴.*VENCE HOY/);
  });

  it('escapa caracteres especiales de Markdown en el nombre', async () => {
    const evilPayment = { ...payment, name: 'Pago_con_subrayados' };
    await sendReminderTelegram({ chatId: '99999', payment: evilPayment, windowDays: 7 });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.text).toContain('Pago\\_con\\_subrayados');
  });
});
