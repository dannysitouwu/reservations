import { Platform } from 'react-native';

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

export function downloadReservationPdf(input: ReservationPdfInput): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Reserva ${escapeHtml(input.reference)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 28px;
            font-family: "Avenir Next", "Segoe UI", Arial, sans-serif;
            background: #f2f7f6;
            color: #0f172a;
          }
          .sheet {
            max-width: 900px;
            margin: 0 auto;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #c8d7d5;
            background: #ffffff;
          }
          .header {
            padding: 26px 28px;
            background: linear-gradient(120deg, #022c22, #0a5b4a);
            color: #ecfeff;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
          }
          .brand { font-size: 28px; font-weight: 800; letter-spacing: 0.02em; margin: 0; }
          .subtitle { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; letter-spacing: 0.08em; text-transform: uppercase; }
          .code {
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.28);
            border-radius: 12px;
            padding: 10px 14px;
            text-align: right;
          }
          .code-label { margin: 0; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.85; }
          .code-value { margin: 4px 0 0 0; font-size: 24px; font-weight: 800; letter-spacing: 0.09em; }
          .body { padding: 24px 28px 28px; }
          .meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 18px;
          }
          .meta-item {
            border: 1px solid #d8e3e1;
            border-radius: 12px;
            padding: 10px 12px;
            background: #f8fbfb;
          }
          .label { color: #5b677a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
          .value { color: #0f172a; font-size: 16px; margin: 4px 0 0; font-weight: 700; }
          .section {
            border: 1px solid #d8e3e1;
            border-radius: 12px;
            padding: 14px;
            margin-top: 12px;
            background: #ffffff;
          }
          .section .value { font-size: 15px; font-weight: 500; line-height: 1.4; white-space: pre-wrap; }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #5b677a;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            border-top: 1px dashed #c8d7d5;
            padding-top: 12px;
          }
          @media print {
            body { background: #fff; padding: 0; }
            .sheet { border-radius: 0; border: none; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div>
              <h1 class="brand">ReservaPro</h1>
              <p class="subtitle">Comprobante de reserva</p>
            </div>
            <div class="code">
              <p class="code-label">Codigo</p>
              <p class="code-value">${escapeHtml(input.reference)}</p>
            </div>
          </div>

          <div class="body">
            <div class="meta">
              <div class="meta-item">
                <p class="label">Experiencia</p>
                <p class="value">${escapeHtml(input.optionName || 'No especificada')}</p>
              </div>
              <div class="meta-item">
                <p class="label">Fecha y hora</p>
                <p class="value">${escapeHtml(`${input.scheduledDate || '-'} ${input.scheduledTime || ''}`.trim())}</p>
              </div>
              <div class="meta-item">
                <p class="label">Cliente</p>
                <p class="value">${escapeHtml(input.fullName || '-')}</p>
              </div>
              <div class="meta-item">
                <p class="label">Telefono</p>
                <p class="value">${escapeHtml(input.phone || '-')}</p>
              </div>
              <div class="meta-item">
                <p class="label">Personas</p>
                <p class="value">${escapeHtml(input.partySize || '-')}</p>
              </div>
              <div class="meta-item">
                <p class="label">Preferencia de contacto</p>
                <p class="value">${escapeHtml(input.contactPreference || '-')}</p>
              </div>
            </div>

            <div class="section">
              <p class="label">Notas</p>
              <p class="value">${escapeHtml(input.notes || '-')}</p>
            </div>

            <div class="footer">
              <span>Documento generado automaticamente desde ReservaPro.</span>
              <span>${new Date().toLocaleString('es-CR')}</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  return true;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
