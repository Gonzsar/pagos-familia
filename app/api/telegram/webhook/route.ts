import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendTelegramMessage } from '@/lib/telegram';

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { first_name?: string };
    text?: string;
  };
}

export async function POST(req: Request) {
  // Verificación del secret token que mandamos al registrar el webhook
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided = req.headers.get('x-telegram-bot-api-secret-token');
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const update: TelegramUpdate = await req.json().catch(() => ({}));
  const msg = update.message;
  if (!msg || !msg.text) return NextResponse.json({ ok: true });

  const text = msg.text.trim();
  const chatId = String(msg.chat.id);
  const firstName = msg.from?.first_name || 'amigo';

  if (text === '/start') {
    await sendTelegramMessage(chatId,
      `👋 ¡Hola ${firstName}! Soy el bot de Plan de Pagos Familiar.\n\n` +
      'Para vincular este chat con tu cuenta, andá a *Configuración → Avisos* en la web, click en "Vincular Telegram", y mandame el código de 6 caracteres que te muestre.',
      { parseMode: 'Markdown' },
    );
    return NextResponse.json({ ok: true });
  }

  // Si parece un código de vinculación (6 alfanuméricos en mayúscula)
  const match = text.toUpperCase().match(/^[A-Z0-9]{6}$/);
  if (match) {
    const code = match[0];
    const supabase = createServiceClient();
    const { data: row } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('telegram_link_code', code)
      .maybeSingle();

    if (!row) {
      await sendTelegramMessage(chatId, '❌ Código inválido. Generá uno nuevo en la web y volvé a probar.');
      return NextResponse.json({ ok: true });
    }

    await supabase
      .from('user_settings')
      .update({ telegram_chat_id: chatId, telegram_link_code: null })
      .eq('user_id', row.user_id);

    await sendTelegramMessage(chatId,
      '✅ ¡Listo! Telegram vinculado. Vas a recibir recordatorios de tus pagos por acá.',
    );
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(chatId, 'No entendí. Mandame `/start` para ver las instrucciones.', { parseMode: 'Markdown' });
  return NextResponse.json({ ok: true });
}
