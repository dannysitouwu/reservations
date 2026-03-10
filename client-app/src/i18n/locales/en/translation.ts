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
    concierge: 'Concierge access',
    language: {
      label: 'Language',
      es: 'ES',
      en: 'EN'
    }
  },
  hero: {
    badge: 'Experience Costa Rica',
    titleLead: 'Reserve authentic adventures in',
    titleHighlight: 'Costa Rica',
    description:
      'Discover white-sand beaches, canopy tours over volcanoes, and sloth encounters led by local experts.',
    primaryCta: 'Plan experience',
    secondaryCta: 'View catalog',
    stats: [
      { value: '320+', label: 'Curated tropical experiences' },
      { value: '4.9/5', label: 'Average traveler rating' }
    ],
    card: {
      statusTitle: 'Current status',
      itinerary: 'Caribbean itinerary',
      schedule: '12 July 2026 • 2 guests',
      teamTitle: 'Assigned team',
      team: ['Naturalist guide', 'Private driver', 'Local chef'],
      testimonial:
        '“We watched turtles hatch at dawn and enjoyed gourmet coffee facing the Arenal Volcano.”'
    }
  },
  highlights: {
    eyebrow: 'Why travel with us',
    title: 'A window into Costa Rican essence',
    description:
      'We craft responsible itineraries that connect Pacific beaches, cloud forests, and villages filled with pura vida.',
    items: [
      {
        icon: '🌊',
        title: 'Network of local experts',
        description: 'Certified guides who share secrets from Cahuita, Monteverde, and the Talamanca highlands.'
      },
      {
        icon: '🦥',
        title: 'Sustainable encounters',
        description: 'Observe sloths and macaws in conservation centers that reinvest in nearby communities.'
      },
      {
        icon: '🌋',
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
        description: 'Your concierge aligns boutique stays, certified tours, and safe transfers.'
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
      'Schedule a video call with your concierge to design a personalized itinerary in under 24 hours.',
    primary: 'Start booking',
    secondary: 'Talk to an expert'
  },
  footer: {
    description:
      'Inspiring responsible travel across Costa Rica: Caribbean shores, active volcanoes, and wildlife-rich rainforests.',
    links: {
      experiences: 'Experiences',
      plan: 'Plan trip',
      status: 'Track status',
      concierge: 'Concierge access'
    },
    copyright: 'All rights reserved.'
  },
  booking: {
    title: 'Book your experience',
    description:
      'Fill in the details to connect with a certified concierge who will confirm availability and coordinate logistics.',
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
      generic: 'We could not save your reservation.'
    },
    availabilityTitle: 'Suggested availability',
    availabilityEmpty: 'Select an experience to view recommended times.',
    availabilityNone: 'Coordinate with your concierge for custom availability.'
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
    curatedTag: 'Curated',
    badges: ['Adventure', 'Nature', 'Wellness'],
    loading: 'Loading tropical experiences…'
  },
  statusPage: {
    title: 'Track your reservation',
    description: 'Enter your code to view updates and meet your concierge team.',
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
      concierge: 'Assigned concierge',
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
    checkEmail: 'Check {{email}} to confirm your account before signing in.'
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
    description: 'Review and track the concierge experiences you have started with us.',
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
    unnamedExperience: 'Costa Rica experience'
  }
};

export default translation;
