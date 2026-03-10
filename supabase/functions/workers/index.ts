import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables");
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      ...(init.headers ?? {})
    }
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, { status: 200 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "No autenticado" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: userError
  } = await adminClient.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ error: "Token inválido" }, { status: 401 });
  }

  const { data: adminProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !adminProfile || adminProfile.role !== "admin") {
    return jsonResponse({ error: "No autorizado" }, { status: 403 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const action = payload?.action;
  const data = payload?.payload ?? {};

  try {
    switch (action) {
      case "create": {
        const { nombre, apellido, correo, telefono, rol = "worker" } = data;
        if (!nombre || !apellido || !correo) {
          return jsonResponse({ error: "Nombre, apellido y correo son obligatorios" }, { status: 400 });
        }

        const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

        const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
          email: correo,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: nombre,
            last_name: apellido,
            phone: telefono ?? null
          }
        });

        if (createError) {
          return jsonResponse({ error: createError.message }, { status: 400 });
        }

        const userId = createdUser.user?.id;
        if (!userId) {
          return jsonResponse({ error: "No se pudo obtener el usuario creado" }, { status: 500 });
        }

        const fullName = `${nombre} ${apellido}`.trim();
        const { error: updateProfileError } = await adminClient
          .from("profiles")
          .update({
            full_name: fullName,
            phone: telefono ?? null,
            role: rol,
            metadata: {
              first_name: nombre,
              last_name: apellido
            },
            is_active: true
          })
          .eq("id", userId);

        if (updateProfileError) {
          return jsonResponse({ error: updateProfileError.message }, { status: 500 });
        }

        return jsonResponse({
          message: "Trabajador creado",
          tempPassword,
          userId
        });
      }
      case "update": {
        const { id, nombre, apellido, correo, telefono, rol, is_active } = data;
        if (!id) {
          return jsonResponse({ error: "El identificador del trabajador es obligatorio" }, { status: 400 });
        }

        if (correo) {
          const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(id, {
            email: correo,
            user_metadata: {
              first_name: nombre,
              last_name: apellido,
              phone: telefono ?? null
            }
          });
          if (updateAuthError) {
            return jsonResponse({ error: updateAuthError.message }, { status: 400 });
          }
        }

        if (typeof is_active === "boolean") {
          await adminClient.auth.admin.updateUserById(id, {
            ban_duration: is_active ? "none" : "8760h"
          });
        }

        const fullName = nombre && apellido ? `${nombre} ${apellido}`.trim() : undefined;
        const updates: Record<string, unknown> = {};
        if (fullName) updates.full_name = fullName;
        if (telefono !== undefined) updates.phone = telefono || null;
        if (rol) updates.role = rol;
        if (typeof is_active === "boolean") updates.is_active = is_active;
        if (nombre || apellido) {
          updates.metadata = {
            first_name: nombre,
            last_name: apellido
          };
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateProfileError } = await adminClient.from("profiles").update(updates).eq("id", id);
          if (updateProfileError) {
            return jsonResponse({ error: updateProfileError.message }, { status: 400 });
          }
        }

        return jsonResponse({ message: "Trabajador actualizado" });
      }
      case "deactivate": {
        const { id } = data;
        if (!id) {
          return jsonResponse({ error: "El identificador del trabajador es obligatorio" }, { status: 400 });
        }
        await adminClient.auth.admin.updateUserById(id, { ban_duration: "8760h" });
        const { error: updateProfileError } = await adminClient
          .from("profiles")
          .update({ is_active: false })
          .eq("id", id);
        if (updateProfileError) {
          return jsonResponse({ error: updateProfileError.message }, { status: 400 });
        }
        return jsonResponse({ message: "Trabajador desactivado" });
      }
      default:
        return jsonResponse({ error: "Acción no soportada" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Error interno" }, { status: 500 });
  }
});
