import { Loader2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabaseClient';

const PRESET_CATEGORIES = [
  'Aventura',
  'Naturaleza',
  'Cultura',
  'Relax',
  'Gastronomía',
  'Bienestar',
  'Familiar',
  'Romántica',
  'Eco / outdoor',
];

type NewServiceForm = {
  name: string;
  description: string;
  locationLabel: string;
  categoryLabel: string;
  price_usd: string;
  photoFile: File | null;
  photoPreview: string | null;
  durationMinutes: string;
};

export function NewServicePage() {
  const [categoryOptions, setCategoryOptions] = useState<string[]>(PRESET_CATEGORIES);
  /** Evita que al elegir "Otra categoría" el select vuelva a "" y oculte el campo de texto. */
  const [categoryEntryMode, setCategoryEntryMode] = useState<'preset' | 'custom'>('preset');
  const [form, setForm] = useState<NewServiceForm>({
    name: '',
    description: '',
    locationLabel: '',
    categoryLabel: '',
    price_usd: '',
    photoFile: null,
    photoPreview: null,
    durationMinutes: '60'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('services').select('category_label');
      const fromDb = [
        ...new Set(
          (data ?? [])
            .map((r: { category_label: string | null }) => (r.category_label ?? '').trim())
            .filter(Boolean)
        ),
      ];
      const merged = [...new Set([...PRESET_CATEGORIES, ...fromDb])].sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' })
      );
      setCategoryOptions(merged);
    })();
  }, []);

  const categoryTrim = form.categoryLabel.trim();
  const categoryInList = Boolean(categoryTrim && categoryOptions.includes(categoryTrim));
  const categorySelectValue =
    categoryEntryMode === 'custom' ? '__custom__' : !categoryTrim ? '' : categoryInList ? categoryTrim : '__custom__';
  const showCategoryCustom = categoryEntryMode === 'custom' || (!!categoryTrim && !categoryInList);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setForm((prev) => ({
        ...prev,
        photoFile: file,
        photoPreview: preview
      }));
    }
  };

  const handleRemovePhoto = () => {
    if (form.photoPreview) {
      URL.revokeObjectURL(form.photoPreview);
    }
    setForm((prev) => ({
      ...prev,
      photoFile: null,
      photoPreview: null
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate required fields
      if (!form.name.trim()) {
        setError('El nombre del servicio es requerido');
        setLoading(false);
        return;
      }

      if (!form.price_usd) {
        setError('El precio en USD es requerido');
        setLoading(false);
        return;
      }

      if (!form.durationMinutes) {
        setError('La duración es requerida');
        setLoading(false);
        return;
      }

      let photoUrl: string | null = null;

      // Upload photo if provided
      if (form.photoFile) {
        try {
          const fileName = `${Date.now()}-${form.photoFile.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('service-photos')
            .upload(`services/${fileName}`, form.photoFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error(
              uploadError.message.includes('not found')
                ? 'Bucket "service-photos" no existe. Contacta al admin.'
                : `Error subiendo foto: ${uploadError.message}`
            );
          }

          const { data: { publicUrl } } = supabase.storage
            .from('service-photos')
            .getPublicUrl(`services/${fileName}`);

          photoUrl = publicUrl;
        } catch (photoError) {
          throw photoError instanceof Error ? photoError : new Error('Error procesando foto');
        }
      }

      // Create service using RPC function (with authorization check)
      const priceInCents = Math.round(parseFloat(form.price_usd) * 100);

      const { data: serviceResult, error: serviceError } = await supabase
        .rpc('admin_create_service', {
          service_data: {
            name: form.name.trim(),
            description: form.description.trim() || null,
            location_label: form.locationLabel.trim() || null,
            category_label: form.categoryLabel.trim() || null,
            is_active: true,
            metadata: {}
          }
        });

      if (serviceError || !serviceResult?.success) {
        throw new Error(serviceError?.message || serviceResult?.error || 'Error creating service');
      }

      const serviceId = serviceResult.id;

      // Create service option using RPC function (with photo)
      const { data: optionResult, error: optionError } = await supabase
        .rpc('admin_create_service_option', {
          option_data: {
            service_id: serviceId,
            name: form.name.trim(),
            description: null,
            duration_minutes: parseInt(form.durationMinutes),
            base_price: priceInCents,  // ← CENTS
            currency_code: 'USD',
            image_url: photoUrl || null,  // ← image_url
            is_active: true,
            metadata: {}
          }
        });

      if (optionError || !optionResult?.success) {
        throw new Error(optionError?.message || optionResult?.error || 'Error creating service option');
      }

      const createdName = form.name.trim();

      // Reset form
      setForm({
        name: '',
        description: '',
        locationLabel: '',
        categoryLabel: '',
        price_usd: '',
        photoFile: null,
        photoPreview: null,
        durationMinutes: '60'
      });

      setSuccess(`✓ Servicio "${createdName}" creado exitosamente`);
      setCategoryEntryMode('preset');
      setTimeout(() => setSuccess(''), 3000);

      const { data: catRows } = await supabase.from('services').select('category_label');
      const fromDb = [
        ...new Set(
          (catRows ?? [])
            .map((r: { category_label: string | null }) => (r.category_label ?? '').trim())
            .filter(Boolean)
        ),
      ];
      setCategoryOptions(
        [...new Set([...PRESET_CATEGORIES, ...fromDb])].sort((a, b) =>
          a.localeCompare(b, 'es', { sensitivity: 'base' })
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear servicio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-2xl space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Agregar Nuevo Servicio</h1>
        <p className="text-sm text-slate-500">Crea un nuevo servicio con foto, descripción y precios.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles del servicio</CardTitle>
          <CardDescription>Completa la información básica del nuevo servicio</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del servicio *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ej: Tour a Arenal, Masaje spa"
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descubre la belleza natural de..."
                disabled={loading}
                rows={4}
                className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Pricing */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location_label">Ubicación</Label>
                <Input
                  id="location_label"
                  value={form.locationLabel}
                  onChange={(e) => setForm({ ...form, locationLabel: e.target.value })}
                  placeholder="Ej: Monteverde, La Fortuna"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_select">Categoría</Label>
                <select
                  id="category_select"
                  value={categorySelectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') {
                      setCategoryEntryMode('preset');
                      setForm((prev) => ({ ...prev, categoryLabel: '' }));
                      return;
                    }
                    if (v === '__custom__') {
                      setCategoryEntryMode('custom');
                      setForm((prev) => ({ ...prev, categoryLabel: '' }));
                      return;
                    }
                    setCategoryEntryMode('preset');
                    setForm((prev) => ({ ...prev, categoryLabel: v }));
                  }}
                  disabled={loading}
                  className="h-10 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Seleccionar —</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__custom__">Otra categoría (escribir)…</option>
                </select>
                {showCategoryCustom && (
                  <div className="pt-1">
                    <Label htmlFor="category_custom" className="text-xs text-slate-500">
                      Nombre exacto (aparecerá en el catálogo)
                    </Label>
                    <Input
                      id="category_custom"
                      value={form.categoryLabel}
                      onChange={(e) => setForm({ ...form, categoryLabel: e.target.value })}
                      placeholder="Ej. Avistamiento de aves"
                      disabled={loading}
                      className="mt-1"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Tip: si la usarás en más servicios, escribe siempre el mismo texto para poder filtrar.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_usd">Precio USD *</Label>
              <Input
                id="price_usd"
                type="number"
                step="0.01"
                value={form.price_usd}
                onChange={(e) => setForm({ ...form, price_usd: e.target.value })}
                placeholder="99.99"
                disabled={loading}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duración (minutos) *</Label>
              <Input
                id="duration"
                type="number"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                placeholder="60"
                disabled={loading}
              />
            </div>

            {/* Photo Upload */}
            <div className="flex w-full flex-col gap-2">
              <Label className="block">Foto del servicio</Label>
              <div className="w-full">
                {form.photoPreview ? (
                  <div className="relative inline-block align-top">
                    <img
                      src={form.photoPreview}
                      alt="Vista previa"
                      className="h-36 w-36 rounded-lg border border-surface-border object-cover sm:h-40 sm:w-40"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={loading}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                      aria-label="Quitar imagen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-6 py-8 text-center hover:border-slate-400 sm:flex-row sm:text-left">
                    <Upload className="h-5 w-5 shrink-0 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">Clic para seleccionar imagen</p>
                      <p className="text-xs text-slate-500">JPG, PNG | máx 5MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      disabled={loading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Creando...' : 'Crear Servicio'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-xs text-slate-600">
            <strong>Nota:</strong> Después de crear el servicio, podrás agregar disponibilidad (horarios y días) 
            desde la sección de "Servicios". El servicio tendrá una opción predeterminada con la duración y precio especificados.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
