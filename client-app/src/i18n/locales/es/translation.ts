const translation = {
  navigation: {
    items: [
      { to: '/', label: 'Inicio' },
      { to: '/reservations/options', label: 'Experiencias' },
      { to: '/reservations/new', label: 'Reservar' },
      { to: '/reservations/status', label: 'Seguimiento' },
      { to: '/reservations/mine', label: 'Mis reservas' }
    ],
    signIn: 'Iniciar sesión',
    mobileMenu: 'Abrir menú',
    concierge: 'Acceso concierge',
    language: {
      label: 'Idioma',
      es: 'ES',
      en: 'EN'
    }
  },
  hero: {
    badge: 'Eventos y experiencias premium',
    titleLead: 'Reserva experiencias memorables con',
    titleHighlight: 'ReservaPro',
    description:
      'Organiza espacios, catering y sesiones de bienestar con confirmación rápida y seguimiento en tiempo real.',
    primaryCta: 'Planear experiencia',
    secondaryCta: 'Ver catálogo',
    stats: [
      { value: '120+', label: 'Experiencias activas en catálogo' },
      { value: '< 24h', label: 'Tiempo promedio de primera respuesta' }
    ],
    averageFromReviews: 'Promedio basado en {{count}} evaluaciones',
    card: {
      statusTitle: 'Estado actual',
      itinerary: 'Solicitud premium',
      schedule: '17 marzo 2026 • 12 personas',
      teamTitle: 'Equipo asignado',
      team: ['Coordinador de evento', 'Proveedor principal', 'Soporte en sitio'],
      testimonial:
        '“Confirmaron mi reserva en horas y recibí toda la información clara en un solo lugar.”'
    }
  },
  highlights: {
    eyebrow: 'Por qué reservar con nosotros',
    title: 'Una plataforma enfocada en resultados',
    description:
      'Centralizamos todo el flujo de reserva para que tu experiencia sea simple, profesional y trazable.',
    items: [
      {
        icon: '🧭',
        title: 'Coordinación experta',
        description: 'Un concierge humano revisa tu solicitud y te contacta por el canal que prefieras.'
      },
      {
        icon: '📲',
        title: 'Seguimiento con código',
        description: 'Cada reserva genera un código único para consultar estado y detalles cuando lo necesites.'
      },
      {
        icon: '✅',
        title: 'Operación confiable',
        description: 'Disponibilidad, contacto y notas quedan registradas para evitar pérdidas de información.'
      }
    ]
  },
  flow: {
    eyebrow: 'Cómo funciona',
    title: 'Tu viaje soñado en tres pasos sencillos',
    description: 'Desde la inspiración hasta la confirmación, te acompañamos con logística experta y soporte 24/7.',
    steps: [
      {
        step: '01',
        title: 'Cuéntanos tu estilo',
        description: 'Elige el tipo de experiencia, fechas y nivel de aventura: surf, bienestar, gastronomía o cultura.'
      },
      {
        step: '02',
        title: 'Recibe propuestas curadas',
        description: 'Nuestro concierge selecciona alojamientos boutique, tours certificados y traslados seguros.'
      },
      {
        step: '03',
        title: 'Confirma y disfruta',
        description: 'Aprueba el itinerario, paga en línea y recibe recordatorios con recomendaciones locales.'
      }
    ]
  },
  testimonials: {
    eyebrow: 'Historias de pura vida',
    title: 'Viajeros que ya viven el encanto tico',
    description: 'Experiencias reales diseñadas con respeto por la naturaleza y las comunidades costarricenses.',
    items: [
      {
        quote:
          'La caminata nocturna en Monteverde fue mágica. Vimos ranas de vidrio y aprendimos sobre reforestación comunitaria.',
        name: 'Isabel & Martín',
        role: 'Escapada romántica • Monteverde'
      },
      {
        quote:
          'Reservamos canopy, aguas termales y cafés artesanales en un solo flujo. Todo sincronizado y sin estrés.',
        name: 'Familia Rodríguez',
        role: 'Vacaciones familiares • La Fortuna'
      },
      {
        quote:
          'Nuestros clientes VIP quedaron fascinados con el tour de cacao ancestral y la cena privada frente al Pacífico.',
        name: 'Agencia Latitude',
        role: 'Evento corporativo • Guanacaste'
      }
    ]
  },
  cta: {
    title: '¿Listo para vivir la pura vida?',
    description:
      'Agendemos una videollamada con tu concierge para diseñar un itinerario personalizado en menos de 24 horas.',
    primary: 'Comenzar reserva',
    secondary: 'Habla con un experto'
  },
  footer: {
    description:
      'Plataforma de reservas para experiencias, espacios y servicios premium con seguimiento en tiempo real.',
    links: {
      experiences: 'Experiencias',
      plan: 'Planificar viaje',
      status: 'Seguimiento',
      concierge: 'Acceso concierge'
    },
    copyright: 'Todos los derechos reservados.'
  },
  booking: {
    title: 'Reserva tu experiencia',
    description:
      'Completa los detalles para conectar con un concierge certificado que confirmará disponibilidad y coordinará traslados.',
    selectLabel: 'Selecciona una experiencia',
    selectPlaceholder: 'Elige una experiencia',
    datetimeLabel: 'Fecha y hora preferida',
    dateLabel: 'Fecha',
    timeLabel: 'Hora',
    fullNameLabel: 'Nombre completo',
    fullNamePlaceholder: '¿Con quién coordinamos la experiencia?',
    phoneLabel: 'Número de teléfono',
    phonePlaceholder: 'Incluye código de país si estás fuera de Costa Rica',
    partySizeLabel: 'Personas en el grupo',
    partySizePlaceholder: 'Ej. 4',
    contactPreferenceLabel: 'Preferencia de contacto',
    contactPreferencePlaceholder: 'Elige cómo prefieres que te contactemos',
    useSavedProfile: 'Usar datos guardados de mi cuenta',
    contactPreferenceOptions: {
      whatsapp: 'WhatsApp',
      email: 'Correo electrónico',
      phoneCall: 'Llamada telefónica',
      phone_call: 'Llamada telefónica'
    },
    notesLabel: 'Detalles especiales',
    notesPlaceholder: 'Cuéntanos sobre edades, intereses o requerimientos alimentarios',
    submit: 'Enviar reserva',
    downloadPdf: 'Descargar comprobante (PDF)',
    viewMine: 'Ir a mis reservas',
    submitting: 'Enviando…',
    success: '¡Reserva enviada! Tu código es {{code}}',
    errors: {
      noOption: 'Selecciona una experiencia para continuar.',
      missingContact: 'Agrega tu nombre y teléfono para poder contactarte.',
      invalidPartySize: 'El tamaño del grupo debe ser un número mayor que cero.',
      generic: 'Ocurrió un error al guardar la reserva.'
    },
    availabilityTitle: 'Disponibilidad sugerida',
    availabilityEmpty: 'Selecciona una experiencia para ver horarios recomendados.',
    availabilityNone: 'Coordina con tu concierge para verificar disponibilidad personalizada.',
    estimatedTotal: 'Total estimado',
    priceHint: 'Precio base por persona × número de personas. Se confirma al pagar.'
  },
  availability: {
    weekday: {
      0: 'Domingo',
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado'
    },
    capacity: '{{count}} grupos por bloque'
  },
  statusLabels: {
    pending: 'Pendiente',
    paid: 'Pagada',
    awaiting_confirmation: 'En confirmación',
    confirmed: 'Confirmada',
    in_progress: 'En curso',
    fulfilled: 'Completada',
    cancelled: 'Cancelada',
    rejected: 'Rechazada'
  },
  options: {
    eyebrow: 'Catálogo activo',
    title: 'Colección de experiencias y servicios',
    description:
      'Explora opciones configurables para eventos, bienestar y experiencias privadas. Puedes reservar en minutos.',
    curatedTag: 'Curada',
    badges: ['Aventura', 'Naturaleza', 'Bienestar'],
    bookNow: 'Reservar ahora',
    loading: 'Cargando experiencias tropicales…',
    searchLabel: 'Buscar',
    searchPlaceholder: 'Nombre o palabra clave',
    locationLabel: 'Ubicación',
    locationPlaceholder: 'Ej. Costa Rica, Guanacaste',
    categoryLabel: 'Categoría',
    categoryPlaceholder: 'Ej. Aventura, cultura',
    sortLabel: 'Ordenar por',
    sortRelevance: 'Relevancia (reseñas)',
    sortPriceAsc: 'Precio: menor a mayor',
    sortPriceDesc: 'Precio: mayor a menor',
    sortRating: 'Mejor calificación',
    applyFilters: 'Aplicar filtros',
    empty: 'No hay experiencias con estos filtros. Prueba ampliar la búsqueda.',
    viewDetail: 'Ver detalle',
    reviewsShort: 'Reseñas',
    prevPage: 'Anterior',
    nextPage: 'Siguiente',
    pageIndicator: 'Página {{page}}'
  },
  experience: {
    loadError: 'No pudimos cargar esta experiencia.',
    notFound: 'Experiencia no disponible.',
    backToCatalog: 'Volver al catálogo',
    from: 'Desde',
    duration: '{{minutes}} minutos',
    about: 'Acerca de',
    location: 'Ubicación',
    rating: 'Valoración',
    ratingValue: '{{avg}} / 5 ({{count}} opiniones)',
    noReviews: 'Sin reseñas aún',
    availabilityTitle: 'Disponibilidad publicada',
    availabilityEmpty: 'Consulta con concierge para fechas especiales.',
    reviewsTitle: 'Opiniones de viajeros',
    noReviewsYet: 'Sé el primero en vivir esta experiencia.',
    reviewScore: '{{score}} / 5'
  },
  statusPage: {
    title: 'Sigue tu reserva',
    description: 'Introduce tu código para ver actualizaciones y conocer a tu equipo de concierge.',
    placeholder: 'Código de confirmación',
    search: 'Consultar',
    loading: 'Buscando…',
    errors: {
      empty: 'Ingresa tu código de confirmación.',
      generic: 'No encontramos una reserva con ese código.'
    },
    noResult: 'No encontramos una reserva con esa referencia.',
    labels: {
      status: 'Estado',
      scheduled: 'Programado para',
      concierge: 'Concierge asignado',
      reference: 'Código de referencia',
      guest: 'Viajero principal',
      partySize: 'Tamaño del grupo',
      contactPreference: 'Preferencia de contacto'
    },
    unscheduled: 'Por confirmar',
    contactPreferenceNone: 'Sin preferencia registrada',
    partySizeUnknown: '—',
    partySizeValue_one: '{{count}} persona',
    partySizeValue_other: '{{count}} personas'
  },
  auth: {
    title: 'Acceso a tu cuenta',
    description: 'Gestiona reservas guardadas y obtén soporte prioritario.',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    signIn: 'Iniciar sesión',
    signingIn: 'Iniciando…',
    signUp: 'Crear cuenta',
    signingUp: 'Creando cuenta…',
    signedIn: 'Sesión iniciada correctamente.',
    signOut: 'Cerrar sesión',
    signedAs: 'Sesión activa como {{email}}',
    noAccount: '¿No tienes cuenta?',
    haveAccount: '¿Ya tienes una cuenta?',
    createAccount: 'Crear cuenta',
    signInHere: 'Inicia sesión aquí',
    profileFirstName: 'Nombre',
    profileLastName: 'Apellidos',
    profilePhone: 'Teléfono',
    profileUsername: 'Username (estético)',
    saveProfile: 'Guardar perfil',
    savingProfile: 'Guardando perfil…',
    profileSaved: 'Perfil actualizado correctamente.',
    passwordMismatch: 'Las contraseñas no coinciden.',
    checkEmail: 'Revisa {{email}} para confirmar tu cuenta antes de iniciar sesión.',
    passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.'
  },
  notFound: {
    title: 'No encontramos esta página',
    description: 'Regresa al inicio para seguir explorando experiencias en Costa Rica.',
    cta: 'Explorar experiencias'
  },
  languageSwitcher: {
    tooltip: 'Cambiar idioma'
  },
  myReservations: {
    title: 'Mis reservas',
    description: 'Consulta y sigue las experiencias que has coordinado con nuestro concierge.',
    loading: 'Cargando tus reservas…',
    error: 'No pudimos cargar tus reservas en este momento.',
    emptyTitle: 'Aún no tienes reservas',
    emptyDescription: 'Planea tu primera experiencia en Costa Rica para verla listada aquí.',
    emptyCta: 'Crear una reserva',
    signInTitle: 'Accede a tus reservas',
    signInDescription: 'Inicia sesión para ver experiencias próximas y gestionar tus solicitudes.',
    signInCta: 'Iniciar sesión',
    reference: 'Referencia • {{code}}',
    copyCode: 'Copiar código',
    downloadPdf: 'Descargar PDF',
    feedbackTitle: 'Califica tu experiencia',
    feedbackPlaceholder: 'Comparte tu comentario (opcional)',
    feedbackScore: '{{score}} estrellas',
    saveFeedback: 'Guardar evaluación',
    savingFeedback: 'Guardando…',
    feedbackError: 'No se pudo guardar tu evaluación.',
    scheduledFor: 'Programada para',
    createdAt: 'Creada el',
    partySize: 'Tamaño del grupo',
    partySizeValue_one: '{{count}} persona',
    partySizeValue_other: '{{count}} personas',
    contactPreference: 'Preferencia de contacto',
    contactPreferenceNone: 'Sin preferencia registrada',
    notes: 'Notas del viajero',
    notesEmpty: 'No se registraron notas.',
    unscheduled: 'Por confirmar',
    unnamedExperience: 'Experiencia en Costa Rica',
    totalLabel: 'Total',
    cancel: 'Cancelar reserva',
    cancelling: 'Cancelando…',
    cancelError: 'No se pudo cancelar la reserva.'
  },
  contact: {
    title: 'Habla con un experto',
    description: 'Contáctanos por el canal que prefieras y te ayudamos a cerrar tu reserva.',
    whatsappHint: 'Respuesta rápida para coordinación inmediata.',
    emailHint: 'Ideal para enviar requisitos detallados o cotizaciones.',
    phoneHint: 'Atención directa para soporte personalizado.'
  }
};

export default translation;
