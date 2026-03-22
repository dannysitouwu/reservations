# Guía de Desarrollo

## Configuración Inicial

### 1. Clonar y instalar

```bash
git clone <repo-url>
cd reservations
npm install
```

### 2. Variables de entorno

Cada app necesita configuración:

**admin-app/.env.local**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**client-app/.env.local**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**app/.env**
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Base de datos

```bash
# Login a Supabase CLI
supabase login

# Link con proyecto
supabase link --project-ref your-project-ref

# Aplicar migraciones
supabase db push

# Ver estado
supabase db status
```

## Desarrollo Local

### Iniciar todos los servicios

```bash
make dev
```

Abre en navegador:
- Admin: http://localhost:5173
- Client: http://localhost:5174
- Mobile: Escanea QR con Expo Go

### Desarrollo individual

```bash
# Admin app
cd admin-app
npm run dev

# Client app
cd client-app
npm run dev

# Mobile (desde raíz)
npx expo start -c
```

## Estructura de Código

### Admin App (`/admin-app`)

```
src/
├── components/ui/        # shadcn/ui components
├── layouts/
│   └── AdminLayout.tsx    # Layout principal
├── pages/
│   ├── DashboardPage.tsx
│   ├── ReservationsPage.tsx
│   ├── ReservationDetailPage.tsx
│   ├── NewServicePage.tsx
│   └── AnalyticsPage.tsx
├── routes/
│   └── AdminRoutes.tsx    # Definición de rutas
├── types/
│   ├── reservation.ts     # Tipos de datos
│   └── profile.ts
├── lib/
│   ├── supabaseClient.ts  # Cliente Supabase
│   ├── formatCurrency.ts
│   └── utils.ts
└── providers/
    └── SupabaseProvider.tsx
```

### Client App (`/client-app`)

Estructura similar con páginas específicas del usuario:
- HomePage
- ReservationOptionsPage
- CreateReservationPage
- MyReservationsPage

### Mobile App (`/app`)

React Native con Expo:
```
app/
├── (tabs)/           # Navegación con tabs
├── reservations/     # Stack de reservas
│   ├── mine.tsx      # Mis reservas
│   └── options.tsx   # Opciones de servicio
└── _layout.tsx       # Definición de rutas
```

## Tipos y Datos

### Reservation Status

```typescript
type ReservationStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled';
```

### Precio en Centavos

En la BD se almacenan en centavos:

```typescript
// BD: 9999 centavos
// Frontend: 9999 / 100 = 99.99 USD

const usdAmount = centavos / 100;
const centavos = Math.round(usd * 100);
```

## Base de Datos

### Acceder a PostgreSQL

```bash
supabase db start
psql -h localhost -U postgres -d postgres
```

### Ver migraciones

```bash
ls -la supabase/migrations/
```

### Crear nueva migración

```bash
# Manual: crear archivo SQL 
supabase/migrations/NNNN_description.sql

# Luego aplicar
supabase db push
```

## Pruebas

### Linter

```bash
eslint . --fix
```

### Type checking

```bash
tsc --noEmit
```

## Debugging

### Admin App

- Abrir DevTools: F12
- Network: Ver requests a Supabase
- Console: Errores y logs
- Application: Ver stored data

### Mobile App

- Expo DevTools: Presionar 'd' en terminal
- MetroDevTools: HTTP://localhost:19002
- React Native Debugger: Conectar a localhost:8081

### Base de Datos

```bash
# Ver queries ejecutadas
supabase db queries

# Ver logs de cron jobs
supabase db logs

# Conectar directo
psql "postgresql://..."
```

## Git Workflow

### Antes de commit

```bash
# Actualizar dependencias
npm update

# Linting
eslint . --fix

# Type check
npm run type-check
```

### Hacer commit

```bash
git add .
git commit -m "feat: descripción corta"
git push
```

### Formato de mensajes

```
feat:    Nueva característica
fix:     Bug fix
refactor: Cambio de código sin funcionalidad
docs:    Cambio de documentación
style:   Formato, semicolons, etc
test:    Agregar tests
chore:   Actualizar dependencias
perf:    Mejora de rendimiento
```

## Performance

### Optimizaciones implementadas

- Lazy loading de componentes
- Memoización de computaciones
- Real-time subscriptions optimizadas
- Vistas pre-computadas en BD

### Monitorear

```bash
# Con Expo DevTools
npm run dev:profile

# Con React DevTools
npm run dev:react-devtools
```

## Troubleshooting

### "Could not connect to database"

```bash
# Verificar que Supabase está corriendo
supabase status

# Reiniciar
supabase db start
```

### "CORS error"

Verificar en Supabase dashboard:
- Settings → API Settings → CORS
- Debe incluir tu dominio local

### "RLS policy violation"

- Verificar auth.uid() en la sesión
- Revisar políticas: `SELECT * FROM pg_policies;`

## Recursos

- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Expo Docs](https://docs.expo.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
