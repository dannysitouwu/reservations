# API Documentation

## Funciones RPC (Remote Procedure Call)

Las funciones RPC son funciones PostgreSQL ejecutadas desde el cliente con `SECURITY DEFINER` para operaciones protegidas.

### 1. Service Management

#### `admin_create_service(data: jsonb)`

Crear un nuevo servicio (categoría).

**Parámetros:**
```typescript
{
  name: string;              // Requerido: nombre del servicio
  description?: string;      // Opcional: descripción
  is_active?: boolean;       // Default: true
  metadata?: object;         // Default: {}
}
```

**Respuesta:**
```typescript
{
  success: boolean;
  id?: string;              // UUID del servicio creado
  error?: string;           // Si hay error
}
```

**Ejemplo:**
```typescript
const { data, error } = await supabase.rpc('admin_create_service', {
  data: {
    name: 'Aventuras al aire libre',
    description: 'Tours y expediciones',
    is_active: true
  }
});
```

---

#### `admin_create_service_option(data: jsonb)`

Crear una opción de servicio (variante con foto y precio).

**Parámetros:**
```typescript
{
  service_id: string;        // Requerido: UUID del servicio padre
  name: string;              // Requerido: nombre de la opción
  description?: string;      // Opcional
  duration_minutes: number;  // Requerido: duración en minutos
  base_price: number;        // Requerido: precio en CENTAVOS
  currency_code?: string;    // Default: 'USD'
  image_url?: string;        // URL de foto (requiere subir a bucket primero)
  is_active?: boolean;       // Default: true
  metadata?: object;         // Default: {}
}
```

**Respuesta:**
```typescript
{
  success: boolean;
  id?: string;              // UUID de la opción creada
  error?: string;           // Si hay error
}
```

**Ejemplo:**
```typescript
const { data, error } = await supabase.rpc('admin_create_service_option', {
  data: {
    service_id: 'uuid-of-service',
    name: 'Tour de 3 horas',
    duration_minutes: 180,
    base_price: 9999,        // USD 99.99
    currency_code: 'USD',
    image_url: 'https://storage.url/image.jpg',
    is_active: true
  }
});
```

---

### 2. Reservation Management

#### `admin_update_reservation_status(reservation_id: uuid, next_status: enum)`

Cambiar el estado de una reserva.

**Parámetros:**
```typescript
reservation_id: string;     // UUID de la reserva
next_status: 'pending' | 'paid' | 'fulfilled' | 'cancelled';
```

**Transiciones válidas:**
```
pending     → paid, cancelled
paid        → fulfilled, cancelled
fulfilled   → fulfilled (no cambia)
cancelled   → cancelled (no cambia)
```

**Respuesta:**
```typescript
{
  success: boolean;
  status?: string;          // Nuevo estado
  error?: string;           // Si hay error
}
```

**Ejemplo:**
```typescript
const { data, error } = await supabase.rpc('admin_update_reservation_status', {
  reservation_id: 'uuid-of-reservation',
  next_status: 'paid'
});
```

---

### 3. Analytics Functions

#### `analytics_overview()`

Obtener métricas générales del sistema.

**Parámetros:** Ninguno

**Respuesta:**
```typescript
{
  total_reservations: number;    // Total de reservas
  total_revenue: number;         // En CENTAVOS (ej: 450000 = USD 4500)
  average_ticket: number;        // En CENTAVOS
  cancellation_rate: number;     // Porcentaje (0-100)
}
```

**Ejemplo:**
```typescript
const { data, error } = await supabase.rpc('analytics_overview');
// Dividir por 100 para mostrar en USD
const usd = data[0].total_revenue / 100;  // USD 4500.00
```

---

#### `analytics_monthly_revenue(months_count?: number)`

Ingresos mensuales (últimos N meses).

**Parámetros:**
```typescript
months_count?: number;  // Default: 6
```

**Respuesta:**
```typescript
Array<{
  month_start: string;      // ISO timestamp
  month_label: string;      // Ej: "Mar 2026"
  reservations: number;     // Cantidad de reservas
  revenue: number;          // En CENTAVOS
}>
```

**Ejemplo:**
```typescript
const { data, error } = await supabase.rpc('analytics_monthly_revenue', {
  months_count: 6
});

// Dividir por 100 para mostrar
data.forEach(month => {
  console.log(month.month_label, month.revenue / 100);  // USD
});
```

---

#### `analytics_status_distribution()`

Distribución de reservas por estado.

**Parámetros:** Ninguno

**Respuesta:**
```typescript
Array<{
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled';
  reservations: number;     // Cantidad en este estado
}>
```

**Ejemplo:**
```typescript
const { data, error } = await supabase.rpc('analytics_status_distribution');

data.forEach(item => {
  console.log(`${item.status}: ${item.reservations}`);
});
```

---

## Direct Queries (SELECT)

### Views

Estas vistas pueden consultarse directamente (no son funciones):

#### `reservations_view`

Vista para admin con información completa de reservas.

**Columnas:**
```typescript
id: uuid;
public_reference: string;      // Código visible para usuario
status: enum;                  // pending, paid, fulfilled, cancelled
buyer_id: uuid;
buyer_email: string;           // Email del cliente
buyer_name: string;            // Nombre del cliente
service_name: string;          // Nombre del servicio
service_category: string;      // Categoría padre
scheduled_for: timestamp;      // Fecha de la reserva
total_amount: number;          // En CENTAVOS
base_price: number;            // Precio in CENTAVOS
duration_minutes: number;      // Duración
image_url?: string;            // URL de foto
contact_preference: string;    // whatsapp, email, phone_call
created_at: timestamp;
updated_at: timestamp;
```

**Ejemplo:**
```typescript
const { data } = await supabase
  .from('reservations_view')
  .select('*')
  .order('created_at', { ascending: false });
```

---

#### `reservations_detail_view`

Vista para usuarios (filtrada solo a sus propias reservas).

**Columnas:** Similar a `reservations_view`

**Nota:** Esta vista filtra automáticamente por `auth.uid()`, así que cada usuario solo ve sus propias reservas.

**Ejemplo:**
```typescript
const { data } = await supabase
  .from('reservations_detail_view')
  .select('*')
  .order('created_at', { ascending: false });
// Solo retorna reservas del usuario autenticado
```

---

## Almacenamiento (Storage)

### Upload Foto de Servicio

```typescript
const fileName = `${Date.now()}-${file.name}`;

const { data, error } = await supabase.storage
  .from('service-photos')
  .upload(`services/${fileName}`, file);

if (error) throw new Error(error.message);

// Obtener URL pública
const { data: { publicUrl } } = supabase.storage
  .from('service-photos')
  .getPublicUrl(`services/${fileName}`);

// Usar publicUrl en admin_create_service_option
```

---

## Error Handling

Todos los RPC retornan un objeto con `success` y `error`:

```typescript
const { data, error } = await supabase.rpc('admin_update_reservation_status', { ... });

if (error) {
  console.error('RPC Error:', error.message);
  return;
}

if (!data.success) {
  console.error('Function Error:', data.error);
  return;
}

console.log('Success!', data);
```

---

## Precios en Centavos

**IMPORTANTE:** Todos los precios se almacenan en centavos en la BD.

```typescript
// Guardar en BD (centavos)
const centavos = Math.round(99.99 * 100);  // 9999
await savePrice(centavos);

// Mostrar a usuario (USD)
const usd = centavos / 100;  // 99.99
console.log(`USD ${usd.toFixed(2)}`);  // USD 99.99

// Formatear moneda
const formatted = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0
}).format(centavos / 100);  // USD 100
```

---

## Rate Limiting

No hay rate limiting explícito, pero es recomendable:
- Limitar requests a 10 por segundo
- Usar debounce en búsquedas
- Cache de queries costosas

---

## Versioning

API está en v1 (implícito). Cambios breaking se marcarán en CHANGELOG.md.
