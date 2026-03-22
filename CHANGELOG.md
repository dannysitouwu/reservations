# Changelog

Todos los cambios significativos en este proyecto están documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/es/).

## [Unreleased]

### Added
- Sistema completo de reservas con admin panel, app web y mobile
- Autenticación con Supabase Auth
- Gestión de servicios y opciones
- Panel de analíticas en tiempo real
- Soporte para múltiples idiomas (ES/EN)
- Descarga de reservas en PDF
- Sistema de feedback y evaluaciones
- Real-time updates con Supabase subscriptions

### Core Features
- **Admin Panel**: Gestión de reservas, servicios, estados y analíticas
- **Client Web**: Búsqueda de servicios, creación de reservas, historial
- **Mobile App**: Acceso nativo iOS/Android con Expo
- **Database**: PostgreSQL con RLS y migraciones versionadas
- **Analytics**: Ingresos, distribución de estados, tasa de cancelación

## Schema de Migraciones

### 0001-0011: Fundación (Base schema + Auth)
- Schema inicial de reservas, servicios, usuarios
- Sincronización de auth con profiles
- Campos de contacto y feedback

### 0012-0025: Security & State Management
- Implementación de RLS
- Simplificación del modelo de estados (7 → 4 estados)
- Funciones de cálculo de total_amount
- Restauración de vistas y funciones analytics

### 0026-0034: Production Cleanup
- 0026: Urgent fixes - Reset de funciones y RLS
- 0027: Complete reset - Disabling RLS completamente
- 0028: Fix views - Corrección de joins y relaciones
- 0029: Fix analytics - Agregar buyer info y status distribution
- 0030: Nuclear cleanup - Forzar deshabilitación de RLS
- 0031: Fix transitions - Actualizar validación de estados
- 0032: Clean core functions - Funciones RPC refactoreadas
- 0033: Clean views - Vistas y analytics finales
- 0034: State transitions - Validación limpia de transiciones

## Notas Técnicas

### Almacenamiento de Precios
Todos los precios se almacenan en **centavos** en la BD:
- 99.99 USD = 9999 (centavos)
- Mostrar a usuario: `totalAmount / 100` = USD 99.99

### Estados de Reservas (4 estados)
1. **pending** - Reserva creada, aguardando pago
2. **paid** - Pago confirmado
3. **fulfilled** - Servicio completado
4. **cancelled** - Cancelada

### Funciones RPC Principales
- `admin_create_service(jsonb)` - Crear servicio
- `admin_create_service_option(jsonb)` - Crear opción con imagen
- `admin_update_reservation_status(uuid, status)` - Cambiar estado

### Vistas Disponibles
- `reservations_view` - Vista para admin (con buyer info)
- `reservations_detail_view` - Vista para usuario (filtrada por auth)

---

**Formato de commit recomendado:**
```
feat: agregar nueva característica
fix: corregir bug específico
refactor: refactorizar código sin cambios funcionales
docs: actualizar documentación
chore: cambios de configuración o dependencias
perf: mejoras de rendimiento
test: agregar o actualizar tests
```

Ejemplo:
```
feat: agregar descarga de PDF de reservas
```
