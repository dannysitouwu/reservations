import { Loader2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabaseClient';

type NewServiceForm = {
  name: string;
  description: string;
  price_crc: string;
  price_usd: string;
  photoFile: File | null;
  photoPreview: string | null;
  durationMinutes: string;
};

export function NewServicePage() {
  const [form, setForm] = useState<NewServiceForm>({
    name: '',
    description: '',
    price_crc: '',
    price_usd: '',
    photoFile: null,
    photoPreview: null,
    durationMinutes: '60'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        const fileName = `${Date.now()}-${form.photoFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('service-photos')
          .upload(`services/${fileName}`, form.photoFile);

        if (uploadError) {
          throw new Error(`Error subiendo foto: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('service-photos')
          .getPublicUrl(`services/${fileName}`);

        photoUrl = publicUrl;
      }

      // Create service using RPC function (with authorization check)
      const priceInCents = Math.round(parseFloat(form.price_usd) * 100);

      const { data: serviceResult, error: serviceError } = await supabase
        .rpc('admin_create_service', {
          service_data: {
            name: form.name.trim(),
            description: form.description.trim() || null,
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
            name: `${form.name} - Opción Estándar`,
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

      // Reset form
      setForm({
        name: '',
        description: '',
        price_crc: '',
        price_usd: '',
        photoFile: null,
        photoPreview: null,
        durationMinutes: '60'
      });

      setSuccess(`✓ Servicio "${form.name}" creado exitosamente`);
      setTimeout(() => setSuccess(''), 3000);
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
              <div className="space-y-2">
                <Label htmlFor="price_crc">Precio CRC (opcional)</Label>
                <Input
                  id="price_crc"
                  type="number"
                  step="0.01"
                  value={form.price_crc}
                  onChange={(e) => setForm({ ...form, price_crc: e.target.value })}
                  placeholder="ej: 50000"
                  disabled={loading}
                />
              </div>
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
            <div className="space-y-3">
              <Label>Foto del servicio</Label>
              {form.photoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={form.photoPreview}
                    alt="Préview"
                    className="h-32 w-32 rounded-lg border border-surface-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={loading}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 px-6 py-8 text-center hover:border-slate-400">
                  <Upload className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">Click para seleccionar imagen</p>
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
