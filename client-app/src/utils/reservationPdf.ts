type ReservationPdfInput = {
  reference: string;
  optionName: string;
  fullName: string;
  phone: string;
  scheduledDate: string;
  scheduledTime: string;
  partySize: string;
  contactPreference: string;
  notes: string;
};

export function downloadReservationPdf(input: ReservationPdfInput) {
  if (typeof window === 'undefined') return;

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Reserva ${input.reference}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
          h1 { margin: 0 0 8px; }
          p { margin: 6px 0; }
          .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-top: 16px; }
          .label { color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
          .value { font-size: 16px; margin-top: 2px; }
        </style>
      </head>
      <body>
        <h1>ReservaPro</h1>
        <p>Comprobante de reserva</p>
        <div class="box">
          <p class="label">Codigo de reserva</p>
          <p class="value"><strong>${escapeHtml(input.reference)}</strong></p>

          <p class="label">Experiencia</p>
          <p class="value">${escapeHtml(input.optionName || 'No especificada')}</p>

          <p class="label">Cliente</p>
          <p class="value">${escapeHtml(input.fullName)}</p>

          <p class="label">Telefono</p>
          <p class="value">${escapeHtml(input.phone)}</p>

          <p class="label">Fecha y hora</p>
          <p class="value">${escapeHtml(`${input.scheduledDate || '-'} ${input.scheduledTime || ''}`.trim())}</p>

          <p class="label">Personas</p>
          <p class="value">${escapeHtml(input.partySize || '-')}</p>

          <p class="label">Preferencia de contacto</p>
          <p class="value">${escapeHtml(input.contactPreference || '-')}</p>

          <p class="label">Notas</p>
          <p class="value">${escapeHtml(input.notes || '-')}</p>
        </div>
      </body>
    </html>
  `;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
