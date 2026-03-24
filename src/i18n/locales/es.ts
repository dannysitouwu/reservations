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
    Empleado: 'Contactanos',
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
      { value: '—', label: 'Experiencias activas en catálogo' },
      { value: '< 24h', label: 'Tiempo promedio de primera respuesta' }
    ],
    averageFromReviews: 'Basado en {{count}} evaluaciones',
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
    title: 'Una ventana a la esencia costarricense',
    description:
      'Diseñamos itinerarios responsables que conectan playas del Pacífico, selvas nubosas y pueblos con sabor a pura vida.',
    items: [
      {
        iconName: 'people-outline',
        title: 'Red de expertos locales',
        description: 'Guías certificados que comparten secretos de Cahuita, Monteverde y las montañas de Talamanca.'
      },
      {
        iconName: 'leaf-outline',
        title: 'Encuentros sostenibles',
        description: 'Observa perezosos y guacamayas en centros de conservación con impacto directo en la comunidad.'
      },
      {
        iconName: 'compass-outline',
        title: 'Aventura y bienestar',
        description: 'Canopy sobre volcanes, rafting en el Pacuare y retiros termales en La Fortuna.'
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
        description: 'Nuestro Empleado selecciona alojamientos boutique, tours certificados y traslados seguros.'
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
      'Agendemos una videollamada con tu Empleado para diseñar un itinerario personalizado en menos de 24 horas.',
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
      Empleado: 'Contactanos'
    },
    copyright: 'Todos los derechos reservados.'
  },
  booking: {
    title: 'Reserva tu experiencia',
    description:
      'Completa los detalles para conectar con un Empleado certificado que confirmará disponibilidad y coordinará traslados.',
    selectLabel: 'Selecciona una experiencia',
    selectPlaceholder: 'Elige una experiencia en Costa Rica',
    datetimeLabel: 'Fecha y hora preferida',
    fullNameLabel: 'Nombre completo',
    fullNamePlaceholder: '¿Con quién coordinamos la experiencia?',
    phoneLabel: 'Número de teléfono',
    phonePlaceholder: 'Incluye código de país si estás fuera de Costa Rica',
    partySizeLabel: 'Personas en el grupo',
    partySizePlaceholder: 'Ej. 4',
    contactPreferenceLabel: 'Preferencia de contacto',
    contactPreferencePlaceholder: 'Elige cómo prefieres que te contactemos',
    contactPreferenceOptions: {
      whatsapp: 'WhatsApp',
      email: 'Correo electrónico',
      phoneCall: 'Llamada telefónica',
      phone_call: 'Llamada telefónica'
    },
    notesLabel: 'Detalles especiales',
    notesPlaceholder: 'Cuéntanos sobre edades, intereses o requerimientos alimentarios',
    submit: 'Enviar reserva',
    submitting: 'Enviando…',
    success: '¡Reserva enviada! Tu código es {{code}}',
    errors: {
      noOption: 'Selecciona una experiencia para continuar.',
      missingContact: 'Agrega tu nombre y teléfono para poder contactarte.',
      invalidPartySize: 'El tamaño del grupo debe ser un número mayor que cero.',
      generic: 'Ocurrió un error al guardar la reserva.',
      selectTime: 'Selecciona una hora disponible para esta experiencia.',
      dateNotAvailable: 'La fecha seleccionada no está disponible para esta experiencia.',
      timeNotAllowed: 'La hora seleccionada no está disponible para esta experiencia.',
      dateTimeRequired: 'Selecciona fecha y hora para completar la reserva.'
    },
    flow: {
      headerBadge: 'RESERVA EN LÍNEA',
      stepExperience: 'Experiencia',
      stepDetails: 'Detalles',
      stepConfirm: 'Confirmar',
      sectionExperience: '¿Qué experiencia deseas?',
      sectionWhen: '¿Cuándo te gustaría ir?',
      sectionContact: 'Información de contacto',
      sectionNotes: '¿Algo especial que debamos saber?',
      dateLabel: 'Fecha',
      timeLabel: 'Hora',
      dateHintAvailability: 'Solo se muestran días con horario publicado para esta experiencia.',
      dateHintOpen: 'Elige una fecha en los próximos días.',
      selectDate: 'Seleccionar fecha',
      selectTime: 'Seleccionar hora',
      pickerDone: 'Listo',
      noTimesForDate: 'No hay horarios disponibles para la fecha seleccionada.',
      successTitle: '¡Reserva confirmada!',
      successDesc:
        'Tu solicitud para {{name}} ha sido registrada. Un Empleado te contactará pronto.',
      trackingLabel: 'CÓDIGO DE SEGUIMIENTO',
      trackingHint:
        'Usa este código para consultar el estado de tu reserva en cualquier momento.',
      viewMine: 'Ver mis reservas',
      trackReservation: 'Rastrear reserva',
      bookAgain: 'Hacer otra reserva',
      downloadPdf: 'Descargar PDF',
      pdfAlertTitle: 'PDF',
      pdfWebOnly: 'La descarga PDF por impresión está disponible en la versión web.',
      disclaimer:
        'Al enviar, un Empleado revisará tu solicitud y te contactará para confirmar disponibilidad y coordinar detalles.',
      slotsShort: '{{count}} cupos',
      next: 'Siguiente',
      back: 'Anterior',
      pickExperienceFirst: 'Elige una experiencia en el paso anterior para ver fechas y horarios publicados.',
      noAvailabilityPublished:
        'Esta experiencia aún no tiene franjas publicadas en el calendario. Configura disponibilidad en el panel admin o elige otra opción.',
      sectionPayment: 'Método de pago',
      paymentSinpe: 'SINPE / transferencia',
      paymentCard: 'Tarjeta',
      paymentCash: 'Efectivo en sitio',
      paymentCardTitle: 'Pagar con tarjeta',
      paymentCardHint:
        'Sandbox: usa tarjetas de prueba de Stripe (ej. 4242 4242 4242 4242, fecha futura, cualquier CVC). Ver documentación de pruebas de Stripe.',
      paymentCardDismiss: 'Pagar después / otro método',
      paymentCardPay: 'Pagar ahora',
      paymentCardPaying: 'Procesando…',
      paymentCardError: 'Error:',
      paymentCardDone: 'Pago con tarjeta recibido.',
      paymentCardNative:
        'El pago con tarjeta está disponible en la versión web. Abre el sitio en el navegador o elige SINPE o efectivo.',
      stripeNotConfigured:
        'Pon tu pk_test en app.json → expo.extra (EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY o VITE_STRIPE_PUBLISHABLE_KEY), despliega la Edge Function stripe-payment con STRIPE_SECRET_KEY y STRIPE_PUBLISHABLE_KEY, y reinicia Expo. Mientras tanto puedes pagar con SINPE o efectivo.'
    },
    availabilityTitle: 'Disponibilidad sugerida',
    availabilityEmpty: 'Selecciona una experiencia para ver horarios recomendados.',
    availabilityNone: 'Coordina con tu Empleado para verificar disponibilidad personalizada.',
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
    eyebrow: 'Colección Costa Caribe - Pacífico',
    title: 'Colección de experiencias costarricenses',
    description:
      'Explora aventuras personalizadas desde el Caribe hasta el Pacífico. Cada opción incluye guías bilingües y transporte seguro.',
    curatedTag: 'Destacada',
    badges: ['Aventura', 'Naturaleza', 'Bienestar'],
    loading: 'Cargando experiencias tropicales…',
    searchLabel: 'Buscar',
    searchPlaceholder: 'Nombre o palabra clave',
    locationLabel: 'Ubicación',
    locationPlaceholder: 'Ej. Costa Rica',
    categoryLabel: 'Categoría',
    categoryPlaceholder: 'Ej. Aventura',
    filterAllLocations: 'Todas las ubicaciones',
    filterAllCategories: 'Todas las categorías',
    sortLabel: 'Ordenar',
    sortRelevance: 'Relevancia',
    sortPriceAsc: 'Precio ↑',
    sortPriceDesc: 'Precio ↓',
    sortRating: 'Mejor valoración',
    applyFilters: 'Aplicar filtros',
    empty: 'No hay resultados. Prueba otros filtros.',
    durationLabel: 'Duración',
    fromPriceLabel: 'Desde',
    viewDetail: 'Ver detalle',
    reviewsShort: 'Reseñas',
    prevPage: 'Anterior',
    nextPage: 'Siguiente',
    pageIndicator: 'Página {{page}}',
    bookNow: 'Reservar ahora'
  },
  experience: {
    loadError: 'No pudimos cargar esta experiencia.',
    notFound: 'Experiencia no disponible.',
    backToCatalog: 'Volver al catálogo',
    from: 'Desde',
    duration: '{{minutes}} min',
    about: 'Acerca de',
    rating: 'Valoración',
    ratingValue: '{{avg}} / 5 ({{count}} opiniones)',
    noReviews: 'Sin reseñas',
    availabilityTitle: 'Disponibilidad',
    availabilityEmpty: 'Consulta con Empleado para otras fechas.',
    reviewsTitle: 'Opiniones',
    noReviewsYet: 'Aún no hay opiniones.',
    reviewScore: '{{score}} / 5'
  },
  statusPage: {
    title: 'Sigue tu reserva',
    description: 'Introduce tu código para ver actualizaciones y conocer a tu equipo de Empleado.',
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
      Empleado: 'Empleado asignado',
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
    description: 'Consulta y sigue las experiencias que has coordinado con nuestro Empleado.',
    loading: 'Cargando tus reservas…',
    error: 'No pudimos cargar tus reservas en este momento.',
    emptyTitle: 'Aún no tienes reservas',
    emptyDescription: 'Planea tu primera experiencia en Costa Rica para verla listada aquí.',
    emptyCta: 'Crear una reserva',
    signInTitle: 'Accede a tus reservas',
    signInDescription: 'Inicia sesión para ver experiencias próximas y gestionar tus solicitudes.',
    signInCta: 'Iniciar sesión',
    reference: 'Referencia • {{code}}',
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
    cancelError: 'No se pudo cancelar la reserva.',
    trackStatus: 'Ver estado',
    copyCode: 'Copiar',
    pdf: 'PDF',
    copySuccessTitle: 'Código copiado',
    referenceAlertTitle: 'Código de referencia',
    feedbackTitle: 'Califica tu experiencia',
    starsCount: '{{count}} estrellas',
    commentPlaceholder: 'Comentario opcional',
    saveFeedback: 'Guardar evaluación',
    savingFeedback: 'Guardando…',
    feedbackPending:
      'Podrás evaluar esta reserva cuando el estado sea completada.',
    feedbackSaveError: 'No se pudo guardar la evaluación.',
    archiveTitle: 'Ocultar reserva',
    archiveConfirm:
      'Esta reserva dejará de mostrarse en tu lista. No se borra del sistema; el equipo puede seguir viéndola.',
    archiveAction: 'Ocultar',
    archiveCancel: 'Cancelar',
    archiveError: 'No se pudo ocultar la reserva. Intenta de nuevo.'
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
