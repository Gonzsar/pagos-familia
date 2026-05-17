import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendReminderEmail } from '@/lib/email';
import type { Payment, Category } from '@/lib/types';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubEnv('RESEND_FROM_EMAIL', 'Plan Pagos <test@from.com>');
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
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

describe('sendReminderEmail', () => {
  it('manda POST a Resend con el payload correcto', async () => {
    await sendReminderEmail({ to: 'a@b.com', payment, windowDays: 7, appUrl: 'https://app.com' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init as RequestInit).headers).toMatchObject({
      'Authorization': 'Bearer re_test',
      'Content-Type': 'application/json',
    });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.to).toBe('a@b.com');
    expect(body.from).toBe('Plan Pagos <test@from.com>');
    expect(body.subject).toContain('ChatGPT');
    expect(body.subject).toContain('7 día');
    expect(body.html).toContain('ChatGPT');
    expect(body.html).toContain('PREX GON');
    expect(body.html).toContain('Entretenimiento');
  });

  it('asunto especial cuando vence hoy', async () => {
    await sendReminderEmail({ to: 'a@b.com', payment, windowDays: 0, appUrl: 'https://app.com' });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.subject).toContain('Vence hoy');
  });

  it('tira error si Resend devuelve no-ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'unauthorized' });
    await expect(sendReminderEmail({ to: 'a@b.com', payment, windowDays: 7, appUrl: 'https://app.com' })).rejects.toThrow(/Resend API 401/);
  });

  it('escapa HTML en el nombre del pago', async () => {
    const evilPayment = { ...payment, name: '<script>alert(1)</script>' };
    await sendReminderEmail({ to: 'a@b.com', payment: evilPayment, windowDays: 7, appUrl: 'https://app.com' });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.html).toContain('&lt;script&gt;');
    expect(body.html).not.toContain('<script>');
  });
});
