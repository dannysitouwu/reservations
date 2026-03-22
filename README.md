# ReservaApp - Sistema de Reservas

Sistema completo de reservas con admin panel, cliente web y aplicación móvil.

## 📁 Estructura del Proyecto

```
.
├── admin-app/              # Panel de administración (React + Vite)
├── client-app/             # App web para usuarios (React + Vite)
├── app/                    # App móvil (React Native + Expo)
├── supabase/
│   └── migrations/         # Migraciones de base de datos
├── docs/                   # Documentación
│   ├── debug/             # Archivos de debugging
│   └── guides/            # Guías de desarrollo
└── package.json           # Workspace root
```

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- npm o yarn
- Supabase CLI

### Setup Inicial

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Ejecutar migraciones de BD
supabase db push

# Iniciar desarrollo
make dev
```

## 🏗️ Stack Tecnológico

- **Frontend Admin**: React 18 + TypeScript + Tailwind CSS + Vite
- **Frontend Cliente**: React + TypeScript + React Native (Expo)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Tailwind CSS + shadcn/ui

## 📦 Aplicaciones

### Admin App (`/admin-app`)
Panel de administración para gestionar reservas, servicios y analíticas.

**Características:**
- Gestión de servicios y opciones
- Visualización de reservas
- Cambio de estados
- Analíticas y reportes
- Autenticación segura

**Ejecutar:**
```bash
cd admin-app
npm run dev
```

### Client App (`/client-app`)
Aplicación web para usuarios finales.

**Características:**
- Búsqueda de servicios
- Creación de reservas
- Historial de reservas
- Descarga de PDF
- Feedback y evaluaciones

**Ejecutar:**
```bash
cd client-app
npm run dev
```

### Mobile App (`/app`)
Aplicación móvil con Expo.

**Características:**
- Acceso nativo iOS/Android
- Sinc en tiempo real
- Push notifications

**Ejecutar:**
```bash
npx expo start -c
```

## 🗄️ Base de Datos

### Migraciones
Las migraciones están en `supabase/migrations/` y se nombran secuencialmente:

```
0001_reservations.sql        # Schema inicial
0002_seed_initial_data.sql   # Datos de prueba
...
0032_clean_core_functions.sql    # Funciones RPC limpias
0033_clean_views_analytics.sql   # Vistas y analytics
0034_clean_state_transitions.sql # Validación de estados
```

### Aplicar migraciones
```bash
supabase db push
```

### Ver migraciones aplicadas
```bash
supabase migration list
```

## 🔐 Autenticación

- Sistema de auth con Supabase
- Roles: `user`, `admin`
- Funciones SECURITY DEFINER para operaciones protegidas

## 📊 Analytics

El sistema proporciona:
- Ingresos mensuales
- Distribución de estados
- Tasa de cancelación
- Ticket promedio
- Datos por servicio

**Base de datos en centavos**: Todos los precios se guardan en centavos (ej: 99.99 USD = 9999).

## 🛠️ Desarrollo

### Comandos útiles

```bash
# Instalar dependencias
npm install

# Iniciar desarrollo (admin + client + expo)
make dev

# Linter
eslint . --fix

# Type check
tsc --noEmit
```

### Estructura de carpetas por app

Cada aplicación sigue un patrón consistente:
```
app/
├── src/
│   ├── components/    # Componentes reutilizables
│   ├── pages/        # Páginas/rutas
│   ├── lib/          # Utilidades y helpers
│   ├── types/        # Tipos TypeScript
│   ├── utils/        # Funciones de utilidad
│   └── providers/    # Context/Providers
├── package.json
└── vite.config.ts    # (Solo web apps)
```

## 🐛 Debugging

Archivos de debugging disponibles en `docs/debug/`:
- `DEBUGGING_RPC.sql` - Verificar funciones RPC
- `DIAGNOSTIC_QUERIES.sql` - Queries de diagnóstico
- `TROUBLESHOOT.sh` - Script de troubleshooting

## 📝 Commits

Para hacer commits limpios:

```bash
# Ver cambios
git status

# Preparar cambios
git add .

# Commit con mensaje descriptivo
git commit -m "feat: description of changes"
```

## 📚 Documentación Adicional

- [Guía de Desarrollo](docs/guides/DEVELOPMENT.md)
- [API Documentation](docs/guides/API.md)
- [Troubleshooting](docs/debug/TROUBLESHOOT.sh)

## 📄 Licencia

Propietario - 2026
