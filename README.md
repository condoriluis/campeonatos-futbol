# Campeonatos

Gestor de campeonatos deportivos (fútbol, futsal, minifútbol y más): organiza
categorías y equipos, sortea grupos, genera el fixture, lleva el **marcador en
vivo**, calcula tablas de posiciones y emite actas en PDF. Diseñado mobile-first
y como **PWA**.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **Prisma + PostgreSQL** (Supabase)
- **NextAuth v5** (Credentials, bcrypt)
- **Supabase Realtime** (broadcast + polling como respaldo) para el marcador en vivo
- **Tailwind CSS v4 + shadcn/ui** (Radix)
- **Zod + react-hook-form** (validación)
- **@react-pdf/renderer** (actas y tablas)
- **Vitest** (tests del motor de torneos)

## Funcionalidades

- Roles: ADMIN, ORGANIZADOR y OPERADOR (solo controla sus partidos).
- Campeonatos con categorías, equipos, jugadores (nómina masiva) y reglamento
  (duración, puntuación, penales, criterios de desempate configurables).
- Fases: grupos (sorteo manual o automático, ida y vuelta, mejores terceros),
  eliminatorias (cuadro plegado, tercer puesto, ida y vuelta), cruces con
  clasificados de fases previas.
- Fixture con horarios, sedes y fechas.
- **Tabla de posiciones** en vivo con desempates (puntos, particular, DG, GF, …).
- **Marcador en vivo**: iniciar/pausar/finalizar, goles, tarjetas, cambios,
  resultado manual y tanda de penales; página pública `/t/[slug]`.
- **PDFs**: acta de partido y tabla de posiciones.
- Informes de auditoría de acciones realizadas.
- PWA instalable (manifest + service worker + iconos).

## Puesta en marcha

```bash
npm install
cp .env.example .env   # completa las variables
npm run db:push        # crea el esquema en la base
npm run db:seed        # crea el primer usuario ADMIN (desde SEED_ADMIN_*)
npm run dev
```

El seed no crea datos de ejemplo: solo da de alta al usuario administrador
inicial usando `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`
(las tres son obligatorias). Si la BD está vacía, `/register` también permite
crear el primer usuario ADMIN.

> Solo para pruebas locales: `npm run db:seed:demo` carga un torneo de fútbol
> sala con fixture completo (8 equipos varones en grupos + llaves, y una final
> de damas ya definida) en el torneo cuyo slug indique `SEED_DEMO_SLUG`
> (por defecto `relampago-villa-remedios`). Es idempotente por categoría/fase:
> no modifica equipos ni partidos que ya existan.

### Variables de entorno

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión Prisma (pooled) |
| `DIRECT_URL` | Conexión directa para migraciones |
| `AUTH_SECRET` | Secreto de NextAuth |
| `AUTH_URL` | URL pública (p. ej. `http://localhost:3000`) |
| `AUTH_TRUST_HOST` | `true` en entornos sin HTTPS directo |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (realtime) |
| `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Datos del admin del seed |

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # prisma generate + next build
npm run start      # producción
npm run lint       # eslint
npm test           # vitest (motor: round-robin, posiciones, llaves, penales)
npm run db:push    # sincroniza esquema
npm run db:seed    # crea el primer usuario ADMIN
npm run db:seed:demo  # SOLO prueba local: torneo de demostración con fixture
npm run db:studio  # Prisma Studio
```

## Test

El motor de torneos está cubierto con Vitest en `lib/engine/*.test.ts`:

```bash
npm test
```

## Despliegue

**Vercel**: conecta el repo, fija las variables de entorno y despliega; el
`postinstall` regenera el cliente Prisma.

**Docker**:

```bash
docker build -t campeonatos .
docker run -p 3000:3000 --env-file .env campeonatos
```

Antes de desplegar en un entorno nuevo, ejecuta `npm run db:push` (o una
migración) contra el esquema `public` de la base.