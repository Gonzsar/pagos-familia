# Plan de Pagos Familiar — Design

**Fecha:** 2026-05-05
**Autor:** Gonzalo Sardi (sardigonzalo01@gmail.com)
**Estado:** Aprobado, listo para plan de implementación

---

## 1. Resumen

Web app para gestionar pagos mensuales y únicos de la familia. Reemplaza la planilla de Excel actual por una interfaz moderna, accesible desde cualquier dispositivo, con totales y estados calculados automáticamente, y recordatorios automáticos por Email + Telegram cuando un pago se acerca a su vencimiento.

## 2. Objetivos

- Centralizar todos los pagos recurrentes y únicos de la familia en un único lugar.
- Visualización clara de cuánto falta para cada vencimiento, totales por moneda y combinados.
- Edición rápida (agregar / editar / borrar / marcar pagado) desde PC y celular.
- Recordatorios automáticos a 7, 3 y 1 días antes del vencimiento.
- Acceso compartido para toda la familia con permisos de edición plenos.
- Categorización por tipo de gasto (Entretenimiento, Empresa, etc.).
- Funcionar sin costo o a costo casi nulo en uso esperado.

## 3. No-objetivos (out of scope para v1)

- Integración bancaria automática (no se descarga estado de cuenta).
- Pago real desde la app — solo se marca manualmente como pagado.
- Multi-familia / multi-tenant — esta instancia es para una sola familia.
- Reportes avanzados / gráficos de gasto histórico (puede agregarse en v2).
- App nativa móvil — la web responsive cubre el caso.
- Notificaciones por WhatsApp oficial (descartado por costo de setup; queda como posible v2).

## 4. Decisiones clave

| Decisión | Elegido | Razón |
|---|---|---|
| Hosting | Vercel | Gratis, integrado con Next.js, despliegue por git push. |
| Base de datos | Supabase (Postgres) | Gratis hasta 500 MB, auth incluido, Row Level Security. |
| Framework | Next.js (App Router) | Una sola codebase front + back, soporte nativo en Vercel. |
| Auth | Supabase Magic Link | Simple, sin password, sesión persistente 1 año. |
| Quién puede editar | Todos los usuarios autenticados | Modelo de confianza familiar; auditoría vía `payment_history`. |
| Quién puede registrarse | Allowlist de emails | Restringe el acceso a la familia; previene logins externos. |
| Canales de aviso | Email (Resend) + Telegram (bot) | Gratis, instantáneos, sin trámites. |
| Cron de avisos | GitHub Actions (cron schedule) | Gratis, simple, logs accesibles. |
| Cotización USD/UYU | dolarapi.com | API pública, sin API key, sin costo. |
| Recordatorios — destinatario | Solo Gonzalo (v1) | Simplifica setup. Multi-destinatario en v2. |
| Recordatorios — granularidad | Un mensaje por pago | Más accionable que un resumen. |

## 5. Arquitectura

```
┌─────────────────────┐         ┌──────────────────┐
│   Tu navegador      │ ◄─────► │     Vercel       │
│  (PC, celu, etc.)   │  HTTPS  │  (Next.js app)   │
└─────────────────────┘         └────────┬─────────┘
                                         │
                          ┌──────────────┼──────────────┐
                          ▼              ▼              ▼
                    ┌──────────┐   ┌──────────┐   ┌──────────┐
                    │ Supabase │   │ dolarapi │   │ Telegram │
                    │ Postgres │   │  (cot.)  │   │  Bot API │
                    │  + Auth  │   └──────────┘   └──────────┘
                    └──────────┘
                          ▲
                          │ lee diario 9 AM (UYT)
                          │
                    ┌─────┴──────┐
                    │   GitHub   │
                    │   Actions  │ ──► Resend (Email) + Telegram
                    │ (cron job) │
                    └────────────┘
```

### Componentes

- **Web Next.js** — UI + API routes. Servidor en Vercel (region `gru1` — São Paulo, cercana a Uruguay). App Router, React Server Components donde aplique. Tailwind CSS para estilos.
- **Supabase** — Postgres + Auth + Row Level Security. Una sola instancia. Plan gratuito.
- **GitHub Actions** — workflow programado (`.github/workflows/reminders.yml`) que corre todos los días a las 12:00 UTC (= 9:00 AM Uruguay). Ejecuta script Node que lee Supabase y dispara avisos.
- **Resend** — servicio transaccional de email. Plan gratis (3.000 emails/mes, sobra ampliamente).
- **Telegram Bot** — bot creado vía @BotFather. La API es gratis y sin límites prácticos para este uso.
- **dolarapi.com** — endpoint `https://uy.dolarapi.com/v1/cotizaciones/usd`. Se llama desde la web al cargar el dashboard. Resultado cacheado 1 hora en memoria del servidor para evitar llamadas excesivas.

### Flujos principales

**Login:**
1. Usuario ingresa email en la web.
2. Backend valida que el email esté en la allowlist (`ALLOWED_EMAILS` env var, lista separada por comas). Si no está, devuelve error genérico "No tenés acceso a esta aplicación, contactá al administrador".
3. Supabase manda magic link al email.
4. Usuario hace click → Supabase emite cookie de sesión (1 año).
5. Próximas visitas: la cookie ya está, entra directo al dashboard.

La allowlist arranca con el email de Gonzalo y se completa con los emails de la familia (mamá, papá, etc.) cuando los pase. Cambiar la lista requiere editar la env var en Vercel y redesplegar (operación de 30 segundos, aceptable para una app familiar).

**Marcar pago como pagado:**
1. Click en botón ✓ Pagar en una fila.
2. POST a `/api/payments/{id}/pay`.
3. API valida sesión, inserta fila en `payment_history`, y:
   - Si `is_recurring = true` → actualiza `due_date += recurrence_months`, mantiene `status = 'pendiente'`.
   - Si no → `status = 'pagado'`.
4. UI actualiza optimisticamente; en caso de error revierte y muestra toast.

**Recordatorio diario:**
1. GitHub Action arranca a las 12:00 UTC.
2. Script Node lee `payments` con filtros: `status='pendiente'`, `notify_enabled=true`, `due_date - CURRENT_DATE ∈ {0, 1, 3, 7}`.
3. Para cada pago, verifica que no exista entrada en `notification_log` para esa combinación (pago, ventana, fecha).
4. Manda email vía Resend + mensaje vía Telegram Bot API.
5. Inserta entrada en `notification_log` (anti-duplicado).
6. Si alguno de los dos canales falla, reintenta hasta 3 veces; loguea fallo final pero no bloquea los otros pagos.

## 6. Modelo de datos

Esquema Postgres (Supabase):

### `categories`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `name` | text NOT NULL UNIQUE | "Entretenimiento" |
| `icon` | text | emoji, ej "🎬" |
| `color` | text | hex, ej "#3B82F6" |
| `position` | int | orden de despliegue |
| `created_at` | timestamptz default now() | |

**Seed inicial:**
- 🎬 Entretenimiento — `#8B5CF6`
- 💼 Empresa / Trabajo — `#2563EB`
- 🏠 Hogar / Servicios — `#10B981`
- 🚗 Transporte — `#F59E0B`
- 🛒 Otros — `#64748B`

### `payments`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | "ChatGPT" |
| `amount` | numeric(12,2) NOT NULL | 20.00 |
| `currency` | text NOT NULL CHECK IN ('USD','UYU') | |
| `due_date` | date NOT NULL | |
| `category_id` | uuid FK → categories(id) | |
| `payment_method` | text | "PREX GON", "OCA 0436", etc. |
| `is_recurring` | boolean NOT NULL default true | |
| `recurrence_months` | int default 1 | usado si `is_recurring` |
| `status` | text NOT NULL CHECK IN ('pendiente','pagado') default 'pendiente' | "vencido" se calcula al vuelo |
| `notify_enabled` | boolean NOT NULL default true | |
| `notes` | text | |
| `created_by` | uuid FK → auth.users(id) | |
| `created_at` | timestamptz default now() | |
| `updated_at` | timestamptz default now() | trigger en update |

Índices: `(due_date, status)`, `(category_id)`.

### `payment_history`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `payment_id` | uuid FK → payments(id) ON DELETE CASCADE | |
| `paid_at` | timestamptz NOT NULL default now() | |
| `paid_amount` | numeric(12,2) NOT NULL | snapshot del monto |
| `paid_currency` | text NOT NULL | snapshot de la moneda |
| `due_date_at_payment` | date NOT NULL | snapshot |
| `paid_by` | uuid FK → auth.users(id) | |

### `notification_log`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `payment_id` | uuid FK → payments(id) ON DELETE CASCADE | |
| `window_days` | int NOT NULL | 7, 3, 1, 0 |
| `due_date` | date NOT NULL | snapshot — clave para evitar duplicados en pagos recurrentes |
| `channel` | text NOT NULL CHECK IN ('email','telegram') | |
| `sent_at` | timestamptz default now() | |
| `success` | boolean NOT NULL | |
| `error_message` | text | si `success=false` |

UNIQUE constraint: `(payment_id, window_days, due_date, channel)` para anti-duplicado.

### `user_settings`
| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | uuid PK FK → auth.users(id) | |
| `notification_email` | text | el email donde recibe avisos (default = email de login) |
| `telegram_chat_id` | text | id del chat con el bot |
| `telegram_link_code` | text | código temporal para vincular Telegram |
| `receives_reminders` | boolean default false | true solo después de configurar |

En v1 solo el usuario "Gonzalo" recibe avisos (los demás usuarios pueden tener `receives_reminders=false` aunque editen pagos).

### Row Level Security (RLS)

- `categories`, `payments`, `payment_history`, `notification_log`: cualquier usuario autenticado puede SELECT/INSERT/UPDATE/DELETE.
- `user_settings`: solo el dueño (`user_id = auth.uid()`) puede SELECT/UPDATE su propia fila.

### Datos calculados (no almacenados)

- `days_remaining = due_date - CURRENT_DATE`
- `is_overdue = (status='pendiente' AND due_date < CURRENT_DATE)`
- `display_status` ∈ {`pagado`, `vencido`, `vence_hoy`, `urgente` (≤3d), `proximo` (≤7d), `futuro` (>7d)}
- `aviso_text` = "VENCE HOY" / "Faltan N días" / "Vencido hace N días"
- `total_usd_combined` = `sum(amount where currency=USD) + sum(amount where currency=UYU) / cotizacion_uyu_per_usd`

## 7. UI

### Stack visual

- **Tailwind CSS** + **shadcn/ui** para componentes base (modal, dropdown, toast, sheet/drawer).
- **Lucide Icons** para iconografía.
- **Inter** (texto general) + **JetBrains Mono** (montos).
- **next-themes** para modo claro/oscuro automático según preferencia del sistema.

### Paleta — "Midnight Finance"

**Modo claro:**
- Fondo: `#F8FAFC` (slate-50)
- Superficie: `#FFFFFF`
- Borde: `#E2E8F0` (slate-200)
- Texto principal: `#0F172A` (slate-900)
- Texto secundario: `#64748B` (slate-500)

**Modo oscuro:**
- Fondo: `#0F172A` (slate-900)
- Superficie: `#1E293B` (slate-800)
- Borde: `#334155` (slate-700)
- Texto principal: `#F1F5F9` (slate-100)
- Texto secundario: `#94A3B8` (slate-400)

**Acentos (ambos modos):**
- Primario: `#2563EB` (blue-600)
- Secundario: `#3B82F6` (blue-500)
- Pagado / OK: `#10B981` (emerald-500)
- ≤7 días: `#F59E0B` (amber-500)
- ≤3 días: `#F97316` (orange-500)
- Hoy / Vencido: `#EF4444` (red-500)

### Pantallas

**Dashboard (`/`)** — pantalla principal
- Header: nombre del proyecto, avatar/nombre del usuario, link a configuración.
- Tarjetas de totales (3 columnas en desktop, 1 en móvil): Total USD, Total UYU, Total combinado.
- Banner de alertas: "X pagos vencen hoy / N pagos esta semana".
- Botón primario "+ Agregar pago" + filtros (estado, categoría, búsqueda).
- Lista agrupada por categoría. Cada fila: nombre, monto+moneda, fecha, "días faltantes/vence hoy/vencido", método de pago, botón ✓ Pagar.
- Click en fila → abre Sheet (drawer lateral) para editar todos los campos.
- Estados visuales: badges/dots de color según `display_status`.

**Configuración (`/settings`)**
- Sección "Mi cuenta": email de avisos, vincular Telegram (botón → muestra código + instrucciones).
- Sección "Categorías": CRUD de categorías (agregar/editar/borrar/reordenar).
- Sección "Preferencias": toggle global "recibir avisos" + horario.

**Historial (`/history`)**
- Tabla de pagos marcados pagados.
- Filtros: rango de fechas, categoría.
- Total gastado en el rango (en USD y UYU).

### Detalles de UX

- Acciones optimistas con rollback en caso de error.
- Toasts para feedback (pagado, error, etc.).
- Animaciones ≤200ms (Tailwind `transition-all duration-150`).
- Bordes redondeados `rounded-xl` (12px).
- Sombras sutiles (`shadow-sm` en cards, `shadow-md` en hover).
- Responsive: `md:` breakpoint para layout de columnas.

## 8. Recordatorios

### Configuración inicial (one-time)

**Email:**
1. En `/settings`, el usuario ingresa el email donde quiere recibir avisos (default: email de login).
2. Se manda mail de prueba con link de verificación.
3. Click → marca `notification_email` como verificado, `receives_reminders=true`.

**Telegram:**
1. Botón "Vincular Telegram" en `/settings` → genera `telegram_link_code` (6 caracteres alfanuméricos).
2. Web muestra: "Abrí Telegram, buscá @PlanPagosFamiliarBot, mandale `/start`, después mandale el código `XXXXXX`".
3. Usuario habla con el bot → bot recibe `/start`, luego el código.
4. Bot llama webhook que valida código contra `user_settings` y guarda `telegram_chat_id`.
5. Web muestra "✓ Telegram vinculado".

### Job diario (GitHub Action)

**Archivo:** `.github/workflows/reminders.yml`
**Schedule:** `cron: "0 12 * * *"` (12:00 UTC = 09:00 Uruguay UYT, UTC-3)

**Pseudocódigo:**
```ts
const today = startOfDayUYT();
const targets = await supabase
  .from('payments')
  .select('*, category:categories(*)')
  .eq('status', 'pendiente')
  .eq('notify_enabled', true)
  .in('due_date_diff_days', [0, 1, 3, 7]);  // computed via SQL

const subscribers = await supabase
  .from('user_settings')
  .select('*')
  .eq('receives_reminders', true);

for (const payment of targets) {
  const window = payment.due_date_diff_days;
  for (const sub of subscribers) {
    for (const channel of ['email', 'telegram']) {
      const already = await checkNotificationLog(payment.id, window, payment.due_date, channel);
      if (already) continue;

      try {
        await send(channel, sub, payment);
        await logNotification(payment.id, window, payment.due_date, channel, true);
      } catch (e) {
        await logNotification(payment.id, window, payment.due_date, channel, false, e.message);
      }
    }
  }
}
```

### Formato de mensajes

**Email (HTML):**
```
Asunto: [Plan Pagos] Mañana vence ChatGPT — $20 USD

[Header con color según urgencia]
ChatGPT vence en 1 día

💵 Monto:    $20,00 USD
📅 Fecha:    05/05/2026
💳 Método:   PREX GON
🏷️ Categoría: 🎬 Entretenimiento

[Botón: Marcar como pagado]   [Botón: Ver en la web]
```

**Telegram:**
```
📌 *ChatGPT* — vence en 1 día

💵 $20,00 USD
📅 05/05/2026
💳 PREX GON
🏷️ 🎬 Entretenimiento

[Inline button: ✓ Marcar pagado]
[Inline button: 🌐 Abrir web]
```

### Reglas

- Mensaje **separado por cada pago** (no resumen).
- Ventanas: 7, 3, 1, 0 días.
- Estado vencido: a partir del día 1 después de la fecha, el pago aparece en rojo en la web pero NO se manda más avisos (evita spam).
- `notification_log` tiene UNIQUE en `(payment_id, window_days, due_date, channel)` → si el job corre dos veces el mismo día, no duplica.
- Cuando se marca pagado un pago recurrente, su `due_date` cambia → las entradas en `notification_log` con la `due_date` vieja siguen ahí pero no afectan al ciclo nuevo (porque la nueva `due_date` es distinta).

## 9. Manejo de errores

| Falla | Comportamiento |
|---|---|
| dolarapi.com no responde | UI muestra "Cotización no disponible"; oculta tarjeta de "Total combinado"; resto funciona. |
| Telegram API falla (envío) | Reintento exponencial x3 (1s, 2s, 4s). Si falla todo, log + entry en `notification_log` con `success=false`. Email se manda igual. |
| Resend API falla (envío) | Mismo patrón que Telegram. |
| Supabase caído (web) | Toast "Conexión perdida", reintento automático. |
| Conflicto de edición concurrente | Last-write-wins. UI muestra toast "Este pago se actualizó, recargando" si detecta `updated_at` distinto al esperado. |
| Pago marcado pagado por error | Botón "Deshacer" en la última fila de `payment_history`, disponible 24h. |
| Magic link expirado | Mensaje claro, opción de reenviar. |

## 10. Logs y monitoreo

- **GitHub Actions logs** — accesibles vía la pestaña Actions del repo. Cada corrida muestra cuántos avisos se mandaron, cuántos fallaron.
- **Supabase logs** — built-in en el dashboard de Supabase.
- **Vercel logs** — built-in en el dashboard de Vercel.
- **`notification_log` table** — auditoría completa de qué se mandó / qué falló.

## 11. Backups

- **Supabase backup diario** — incluido en el plan free, retención de 7 días.
- **Backup semanal a GitHub** — GitHub Action separado (`backup.yml`, domingos 03:00 UTC) exporta `payments`, `categories`, `payment_history` a JSON y commit a una carpeta `backups/` del repo. Garantiza que aunque Supabase tenga un problema irrecuperable, los datos siguen accesibles.

## 12. Seguridad

- Magic link auth gestionado por Supabase (estándar de industria).
- Sesiones cookie-based, `httpOnly`, `secure`, expiración 1 año.
- RLS activo en todas las tablas.
- Service role key (Supabase) y secrets de Resend/Telegram solo en GitHub Actions secrets y Vercel env vars — nunca en el repo.
- Webhook de Telegram validado con secret token.
- HTTPS forzado por Vercel.

## 13. Plan de testing

### Tests automáticos (Vitest)

- **`lib/payments.ts`** — `computeDisplayStatus`, `daysRemaining`, `isOverdue`, `nextDueDate(payment)` para distintas fechas.
- **`lib/notifications.ts`** — `shouldNotify(payment, today)` para todas las ventanas y casos borde.
- **`lib/currency.ts`** — `combineTotals(payments, rate)` con monedas mezcladas.
- **`api/payments/[id]/pay`** — POST marca pagado, recurrente vs único, persistencia en `payment_history`.

### Tests manuales (checklist al final de la implementación)

- [ ] Login con magic link en PC.
- [ ] Login en celular.
- [ ] Sesión persiste tras cerrar el navegador.
- [ ] Crear pago, verlo aparecer.
- [ ] Editar pago, verlo actualizado.
- [ ] Borrar pago, verlo desaparecer.
- [ ] Marcar pagado un pago recurrente → la fecha avanza un mes y vuelve a pendiente.
- [ ] Marcar pagado un pago único → queda como pagado, aparece en historial.
- [ ] "Deshacer último pago" funciona.
- [ ] Filtrar por categoría.
- [ ] Vista responsive en móvil.
- [ ] Modo oscuro respeta sistema.
- [ ] Vincular Telegram con código.
- [ ] Recibir email de prueba.
- [ ] Disparar manualmente la GitHub Action y verificar que llega 1 mensaje por canal por pago en ventana.

## 14. Estructura del repo

```
plan-pagos-familiar/
├── .github/
│   └── workflows/
│       ├── reminders.yml
│       └── backup.yml
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Dashboard
│   │   ├── settings/page.tsx
│   │   └── history/page.tsx
│   └── api/
│       ├── payments/
│       │   ├── route.ts             # GET/POST
│       │   └── [id]/
│       │       ├── route.ts         # PATCH/DELETE
│       │       └── pay/route.ts     # POST marcar pagado
│       ├── categories/route.ts
│       ├── settings/route.ts
│       ├── telegram/webhook/route.ts
│       └── exchange-rate/route.ts
├── components/
│   ├── ui/                          # shadcn primitives
│   ├── payment-row.tsx
│   ├── payment-form.tsx
│   ├── totals-cards.tsx
│   └── ...
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── payments.ts                  # logic puro
│   ├── notifications.ts
│   ├── currency.ts
│   ├── telegram.ts
│   └── email.ts
├── scripts/
│   ├── send-reminders.ts            # ejecutado por GitHub Action
│   └── backup.ts
├── supabase/
│   ├── migrations/
│   │   └── 0001_init.sql
│   └── seed.sql
├── tests/
│   └── ...
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 15. Variables de entorno

Documentadas en `.env.example`:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # solo backend / GH Action

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=                 # ej: "Plan Pagos <pagos@tudominio.com>" o el dominio default

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=               # https://plan-pagos.vercel.app
ALLOWED_EMAILS=                    # CSV: gonzalo@... ,mama@...,papa@...
```

## 16. Etapas de implementación (alto nivel)

El plan detallado se elabora en la próxima fase (writing-plans). A grandes rasgos:

1. **Setup de infraestructura** — crear repo GitHub, proyecto Supabase, proyecto Vercel, cuenta Resend, bot de Telegram. Conectar variables de entorno.
2. **Base de datos** — migración inicial + seed de categorías.
3. **Auth + layout base** — login con magic link, layout principal, modo oscuro.
4. **CRUD de pagos** — API + UI (lista, formulario, marcar pagado).
5. **Totales y cotización** — tarjetas de totales + integración con dolarapi.
6. **Categorías** — CRUD desde `/settings`.
7. **Historial + deshacer** — `/history` + botón undo.
8. **Configuración de avisos** — email + vinculación Telegram.
9. **Job de recordatorios** — script + GitHub Action + tests.
10. **Backups** — GitHub Action de backup semanal.
11. **Pulido visual** — animaciones, responsive, edge cases.
12. **Testing manual end-to-end** — checklist completo.
13. **Deploy a producción** y carga de los pagos actuales.

## 17. Datos iniciales (carga al lanzar)

Pagos a precargar al terminar la implementación:

| Nombre | Monto | Moneda | Vencimiento | Categoría | Método | Recurrente |
|---|---|---|---|---|---|---|
| Canva | 6,50 | USD | 2026-05-16 | Entretenimiento | PREX GON | sí (1 mes) |
| XBOX Game Pass Gon y Cari | 16,00 | USD | 2026-05-22 | Entretenimiento | PREX GON | sí |
| EA Play Pro | 17,00 | USD | 2026-05-30 | Entretenimiento | PREX GON | sí |
| ChatGPT | 20,00 | USD | 2026-05-05 | Entretenimiento | PREX GON | sí |
| Claude | 20,00 | USD | 2026-06-04 | Entretenimiento | PREX GON | sí |
| HBO MAX | 200,00 | UYU | 2026-05-14 | Entretenimiento | PREX MAMA | sí |
| Disney Plus | 12,99 | USD | 2026-05-15 | Entretenimiento | OCA 0436 | sí |
| Amazon Prime | 6,00 | USD | 2026-05-24 | Entretenimiento | VISA 6366 | sí |

## 18. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Supabase free tier se queda corto | Bajo (500 MB es enorme para este uso) | Medio | Plan pago $25/mes si llega el caso; backup semanal a GitHub. |
| dolarapi cae | Medio | Bajo | Cache en memoria + fallback a "no disponible". |
| GitHub Action falla un día | Bajo | Bajo | Próximo día se manda igual (anti-duplicado por `due_date`); logs visibles. |
| Magic link no llega a Gmail | Bajo | Alto (no podés entrar) | Resend tiene buen deliverability; fallback: agregar segundo método (password) en v2 si pasa. |
| Bot de Telegram queda sin responder | Muy bajo | Bajo | El cron sigue mandando emails; logs muestran fallo. |

## 19. Criterios de "listo"

La v1 se considera lista cuando:

- ✅ Login funciona en PC y celular, sesión persiste.
- ✅ Toda la familia puede acceder con sus emails.
- ✅ Los 8 pagos iniciales están cargados y se muestran correctamente.
- ✅ Totales por moneda + total combinado se calculan bien.
- ✅ Estados (vencido, vence hoy, faltan N días) se actualizan automáticamente.
- ✅ CRUD completo de pagos y categorías funciona.
- ✅ Marcar pagado avanza la fecha en recurrentes y archiva en únicos.
- ✅ "Deshacer último pago" funciona.
- ✅ Email de aviso llega correctamente.
- ✅ Telegram vinculado y manda mensajes.
- ✅ Cron diario funciona en GitHub Actions.
- ✅ Modo oscuro/claro responde al sistema.
- ✅ Backup semanal genera commit en `backups/`.
