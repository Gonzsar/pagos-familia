/**
 * Backup semanal: exporta payments + categories + payment_history + user_settings
 * a backups/YYYY-MM-DD.json.
 *
 * Run: npm run backup
 */
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { format } from 'date-fns';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Faltan SUPABASE env vars');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tables = ['payments', 'categories', 'payment_history', 'user_settings'];
  const backup: Record<string, unknown> = {
    __meta: { generated_at: new Date().toISOString() },
  };

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) throw new Error(`error reading ${t}: ${error.message}`);
    backup[t] = data ?? [];
    console.log(`[backup] ${t}: ${data?.length ?? 0} filas`);
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const dir = path.join(process.cwd(), 'backups');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${today}.json`);
  await writeFile(file, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`[backup] guardado en ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
