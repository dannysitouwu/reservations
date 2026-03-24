const translation = {
  navigation: {
    items: [
      { to: '/', label: 'Home' },
      { to: '/reservations/options', label: 'Experiences' },
      { to: '/reservations/new', label: 'Book' },
      { to: '/reservations/status', label: 'Track' },
      { to: '/reservations/mine', label: 'My reservations' }
    ],
    signIn: 'Sign in',
    Empleado: 'Empleado access',
    language: {
      label: 'Language',
      es: 'ES',
      en: 'EN'
    }
  },
  hero: {
    badge: 'Premium reservations platform',
    titleLead: 'Book memorable experiences with',
    titleHighlight: 'ReservaPro',
    description:
      'Plan venues, catering, and wellness sessions with fast confirmation and real-time tracking.',
    primaryCta: 'Plan experience',
    secondaryCta: 'View catalog',
    stats: [
      { value: '—', label: 'Active catalog experiences' },
      { value: '< 24h', label: 'Average first response time' }
    ],
    catalogCountLabel: '{{count}} active catalog experiences',
    averageFromReviews: 'Based on {{count}} reviews',
    card: {
      statusTitle: 'Current status',
      itinerary: 'Premium request',
      schedule: '17 March 2026 • 12 guests',
      teamTitle: 'Assigned team',
      team: ['Event coordinator', 'Main vendor', 'On-site support'],
      testimonial:
        '“My reservation was confirmed within hours and all details were clear in one place.”'
    }
  },
  highlights: {
    eyebrow: 'Why travel with us',
    title: 'A window into Costa Rican essence',
    description:
      'We craft responsible itineraries that connect Pacific beaches, cloud forests, and villages filled with pura vida.',
    items: [
      {
        iconName: 'people-outline',
        title: 'Network of local experts',
        description: 'Certified guides who share secrets from Cahuita, Monteverde, and the Talamanca highlands.'
      },
      {
        iconName: 'leaf-outline',
        title: 'Sustainable encounters',
        description: 'Observe sloths and macaws in conservation centers that reinvest in nearby communities.'
      },
      {
        iconName: 'compass-outline',
        title: 'Adventure and wellness',
        description: 'Zip-line above volcanoes, raft the Pacuare River, and relax in hot springs at La Fortuna.'
      }
    ]
  },
  flow: {
    eyebrow: 'How it works',
    title: 'Your dream trip in three simple steps',
    description: 'From inspiration to confirmation, we support you with expert logistics and 24/7 assistance.',
    steps: [
      {
        step: '01',
        title: 'Tell us your style',
        description: 'Pick your vibe—surf, wellness, gastronomy, culture—and choose preferred dates.'
      },
      {
        step: '02',
        title: 'Receive curated proposals',
        description: 'Your Empleado aligns boutique stays, certified tours, and safe transfers.'
      },
      {
        step: '03',
        title: 'Confirm and enjoy',
        description: 'Approve the itinerary, pay securely, and get reminders with local tips.'
      }
    ]
  },
  testimonials: {
    eyebrow: 'Pura vida stories',
    title: 'Travelers loving the Costa Rican magic',
    description: 'Real experiences designed with respect for nature and local communities.',
    items: [
      {
        quote:
          'The night walk in Monteverde was magical. We saw glass frogs and learned about community reforestation.',
        name: 'Isabel & Martin',
        role: 'Romantic escape • Monteverde'
      },
      {
        quote:
          'We booked canopy, hot springs, and artisan coffee in one flow. Everything synced flawlessly.',
        name: 'Rodríguez Family',
        role: 'Family vacation • La Fortuna'
      },
      {
        quote:
          'Our VIP clients were amazed by the ancestral cacao tour and private dinner facing the Pacific.',
        name: 'Latitude Agency',
        role: 'Corporate retreat • Guanacaste'
      }
    ]
  },
  cta: {
    title: 'Ready to live the pura vida?',
    description:
      'Schedule a video call with your Empleado to design a personalized itinerary in under 24 hours.',
    primary: 'Start booking',
    secondary: 'Talk to an expert'
  },
  footer: {
    description:
      'Reservation platform for premium experiences, spaces, and services with real-time tracking.',
    links: {
      experiences: 'Experiences',
      plan: 'Plan trip',
      status: 'Track status',
      Empleado: 'Empleado access'
    },
    copyright: 'All rights reserved.'
  },
  booking: {
    title: 'Book your experience',
    description:
      'Fill in the details to connect with a certified Empleado who will confirm availability and coordinate logistics.',
    selectLabel: 'Select an experience',
    selectPlaceholder: 'Choose a Costa Rican experience',
    datetimeLabel: 'Preferred date & time',
    fullNameLabel: 'Full name',
    fullNamePlaceholder: 'Who should we coordinate with?',
    phoneLabel: 'Phone number',
    phonePlaceholder: 'Include country code if outside Costa Rica',
    partySizeLabel: 'Guests in your group',
    partySizePlaceholder: 'e.g. 4',
    contactPreferenceLabel: 'Preferred contact method',
    contactPreferencePlaceholder: 'Select how we should reach you',
    contactPreferenceOptions: {
      whatsapp: 'WhatsApp',
      email: 'Email',
      phoneCall: 'Phone call',
      phone_call: 'Phone call'
    },
    notesLabel: 'Special details',
    notesPlaceholder: 'Share ages, interests, or dietary requirements',
    submit: 'Submit reservation',
    submitting: 'Submitting…',
    success: 'Reservation sent! Your code is {{code}}',
    errors: {
      noOption: 'Select an experience to continue.',
      missingContact: 'Add your name and phone so we can reach you.',
      invalidPartySize: 'Group size must be a number greater than zero.',
      generic: 'We could not save your reservation.',
      selectTime: 'Choose an available time for this experience.',
      dateNotAvailable: 'The selected date is not available for this experience.',
      timeNotAllowed: 'The selected time is not available for this experience.',
      dateTimeRequired: 'Select a date and time to complete your reservation.'
    },
    flow: {
      headerBadge: 'ONLINE BOOKING',
      stepExperience: 'Experience',
      stepDetails: 'Details',
      stepConfirm: 'Confirm',
      sectionExperience: 'Which experience would you like?',
      sectionWhen: 'When would you like to go?',
      sectionContact: 'Contact information',
      sectionNotes: 'Anything special we should know?',
      dateLabel: 'Date',
      timeLabel: 'Time',
      dateHintAvailability: 'Only days with published hours for this experience are shown.',
      dateHintOpen: 'Pick a date within the next few days.',
      selectDate: 'Select date',
      selectTime: 'Select time',
      pickerDone: 'Done',
      noTimesForDate: 'No time slots are available for the selected date.',
      successTitle: 'Reservation confirmed!',
      successDesc:
        'Your request for {{name}} has been recorded. A Empleado will contact you soon.',
      trackingLabel: 'TRACKING CODE',
      trackingHint: 'Use this code to check your reservation status anytime.',
      viewMine: 'View my reservations',
      trackReservation: 'Track reservation',
      bookAgain: 'Book another',
      downloadPdf: 'Download PDF',
      pdfAlertTitle: 'PDF',
      pdfWebOnly: 'Print-to-PDF download is available on the web version.',
      disclaimer:
        'After you submit, a Empleado will review your request and contact you to confirm availability and details.',
      slotsShort: '{{count}} spots',
      next: 'Next',
      back: 'Back',
      pickExperienceFirst: 'Choose an experience in the previous step to see published dates and times.',
      noAvailabilityPublished:
        'This experience has no published time slots yet. Add availability in the admin panel or pick another option.',
      sectionPayment: 'Payment method',
      paymentSinpe: 'SINPE / bank transfer',
      paymentCard: 'Card',
      paymentCash: 'Cash on site',
      paymentCardTitle: 'Pay with card',
      paymentCardHint:
        'Sandbox: use Stripe test cards (e.g. 4242 4242 4242 4242, any future expiry, any CVC). See Stripe testing docs.',
      paymentCardDismiss: 'Pay later / other method',
      paymentCardPay: 'Pay now',
      paymentCardPaying: 'Processing…',
      paymentCardError: 'Error:',
      paymentCardDone: 'Card payment received.',
      paymentCardNative:
        'Card checkout is available in the web app. Open this site in a browser or choose SINPE or cash.',
      stripeNotConfigured:
        'Add your pk_test in app.json → expo.extra (EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY or VITE_STRIPE_PUBLISHABLE_KEY), deploy the stripe-payment Edge Function with STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY, then restart Expo. Until then use SINPE or cash.'
    },
    availabilityTitle: 'Suggested availability',
    availabilityEmpty: 'Select an experience to view recommended times.',
    availabilityNone: 'Coordinate with your Empleado for custom availability.',
    estimatedTotal: 'Estimated total',
    priceHint: 'Base price per guest × party size. Confirmed when paid.'
  },
  availability: {
    weekday: {
      0: 'Sunday',
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday'
    },
    capacity: '{{count}} groups per slot'
  },
  statusLabels: {
    pending: 'Pending',
    paid: 'Paid',
    awaiting_confirmation: 'Awaiting confirmation',
    confirmed: 'Confirmed',
    in_progress: 'In progress',
    fulfilled: 'Fulfilled',
    cancelled: 'Cancelled',
    rejected: 'Rejected'
  },
  options: {
    eyebrow: 'Costa Caribe to Pacific',
    title: 'Costa Rican experience collection',
    description:
      'Explore tailored adventures from the Caribbean to the Pacific. Every option includes bilingual guides and safe transport.',
    curatedTag: 'Featured',
    badges: ['Adventure', 'Nature', 'Wellness'],
    loading: 'Loading tropical experiences…',
    searchLabel: 'Search',
    searchPlaceholder: 'Name or keyword',
    locationLabel: 'Location',
    locationPlaceholder: 'e.g. Costa Rica',
    categoryLabel: 'Category',
    categoryPlaceholder: 'e.g. Adventure',
    filterAllLocations: 'All locations',
    filterAllCategories: 'All categories',
    sortLabel: 'Sort',
    sortRelevance: 'Relevance',
    sortPriceAsc: 'Price ↑',
    sortPriceDesc: 'Price ↓',
    sortRating: 'Top rated',
    applyFilters: 'Apply filters',
    empty: 'No matches. Try different filters.',
    durationLabel: 'Duration',
    fromPriceLabel: 'From',
    viewDetail: 'View details',
    reviewsShort: 'Reviews',
    prevPage: 'Previous',
    nextPage: 'Next',
    pageIndicator: 'Page {{page}}',
    bookNow: 'Book now'
  },
  experience: {
    loadError: 'We could not load this experience.',
    notFound: 'Experience not available.',
    backToCatalog: 'Back to catalog',
    from: 'From',
    duration: '{{minutes}} min',
    about: 'About',
    rating: 'Rating',
    ratingValue: '{{avg}} / 5 ({{count}} reviews)',
    noReviews: 'No reviews yet',
    availabilityTitle: 'Availability',
    availabilityEmpty: 'Ask Empleado for other dates.',
    reviewsTitle: 'Reviews',
    noReviewsYet: 'No reviews yet.',
    reviewScore: '{{score}} / 5'
  },
  statusPage: {
    title: 'Track your reservation',
    description: 'Enter your code to view updates and meet your Empleado team.',
    placeholder: 'Confirmation code',
    search: 'Search',
    loading: 'Searching…',
    errors: {
      empty: 'Enter your confirmation code.',
      generic: 'We did not find a reservation with that code.'
    },
    noResult: 'We could not find a reservation with that reference.',
    labels: {
      status: 'Status',
      scheduled: 'Scheduled for',
      Empleado: 'Assigned Empleado',
      reference: 'Reference code',
      guest: 'Lead traveler',
      partySize: 'Group size',
      contactPreference: 'Preferred contact'
    },
    unscheduled: 'To be confirmed',
    contactPreferenceNone: 'No preference registered',
    partySizeUnknown: '—',
    partySizeValue_one: '{{count}} guest',
    partySizeValue_other: '{{count}} guests'
  },
  auth: {
    title: 'Account access',
    description: 'Manage saved reservations and get priority support.',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    signUp: 'Create account',
    signingUp: 'Creating account…',
    signedIn: 'Signed in successfully.',
    signOut: 'Sign out',
    signedAs: 'Signed in as {{email}}',
    noAccount: 'No account yet?',
    haveAccount: 'Already have an account?',
    createAccount: 'Create account',
    signInHere: 'Sign in here',
    passwordMismatch: 'Passwords do not match.',
    checkEmail: 'Check {{email}} to confirm your account before signing in.',
    passwordTooShort: 'Password must be at least 8 characters.'
  },
  notFound: {
    title: 'We could not find this page',
    description: 'Return home to keep exploring Costa Rican experiences.',
    cta: 'Explore experiences'
  },
  languageSwitcher: {
    tooltip: 'Switch language'
  },
  myReservations: {
    title: 'My reservations',
    description: 'Review and track the Empleado experiences you have started with us.',
    loading: 'Loading your reservations…',
    error: 'We could not load your reservations right now.',
    emptyTitle: 'No reservations yet',
    emptyDescription: 'Plan your first Costa Rican experience to see it listed here.',
    emptyCta: 'Start a reservation',
    signInTitle: 'Access your reservations',
    signInDescription: 'Sign in to view upcoming experiences and manage your requests.',
    signInCta: 'Sign in',
    reference: 'Reference • {{code}}',
    scheduledFor: 'Scheduled for',
    createdAt: 'Created on',
    partySize: 'Group size',
    partySizeValue_one: '{{count}} guest',
    partySizeValue_other: '{{count}} guests',
    contactPreference: 'Preferred contact',
    contactPreferenceNone: 'No contact preference registered',
    notes: 'Traveler notes',
    notesEmpty: 'No notes were provided.',
    unscheduled: 'To be confirmed',
    unnamedExperience: 'Costa Rica experience',
    totalLabel: 'Total',
    cancel: 'Cancel reservation',
    cancelling: 'Cancelling…',
    cancelError: 'Could not cancel this reservation.',
    trackStatus: 'View status',
    copyCode: 'Copy',
    pdf: 'PDF',
    copySuccessTitle: 'Code copied',
    referenceAlertTitle: 'Reference code',
    feedbackTitle: 'Rate your experience',
    starsCount: '{{count}} stars',
    commentPlaceholder: 'Optional comment',
    saveFeedback: 'Save review',
    savingFeedback: 'Saving…',
    feedbackPending: 'You can review this reservation once it is marked completed.',
    feedbackSaveError: 'We could not save your review.',
    archiveTitle: 'Hide reservation',
    archiveConfirm:
      'This reservation will disappear from your list. It is not deleted; staff can still see it.',
    archiveAction: 'Hide',
    archiveCancel: 'Cancel',
    archiveError: 'Could not hide the reservation. Please try again.'
  },
  contact: {
    title: 'Talk to an expert',
    description: 'Reach out through your preferred channel and we will help you close your reservation.',
    whatsappHint: 'Fast response for immediate coordination.',
    emailHint: 'Best for detailed requirements and quotes.',
    phoneHint: 'Direct attention for personalized support.'
  }
};

export default translation;
