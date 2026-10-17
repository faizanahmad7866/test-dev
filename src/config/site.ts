/** Brand and contact details. Components read these from here — never hardcode them in markup. */
export const site = {
  name: 'Dinar Detergent',
  url: 'https://dinardetergent.com',
  tagline: 'Cleanliness you can trust, care you can feel.',
  /**
   * Brand sign-off lines from the client: the Hindi slogan (also drawn as a wordmark, see
   * assets/brand/dinar-hi-dena.png) and the English line, written "moms" (plural, no apostrophe).
   */
  slogans: { hi: 'दिनार ही देना', en: 'Super moms ki super choice' },
  /** Customer support & feedback line, E.164. */
  supportPhone: '+917448211313',
  /** Receives dealer applications on WhatsApp, E.164. The client's support line. */
  whatsappNumber: '+917448211313',
  /** Feedback and queries, as printed on the back of the pack. */
  email: 'dinardetergent@gmail.com',
  /** The company behind the brand ("Mfg & Mktd by" on the pack), as confirmed by the client. */
  company: {
    legalName: 'Kabir Industries',
    proprietor: 'Quasim Khan',
    office: {
      streetAddress: 'Main Road, Nerpinglai',
      locality: 'Amravati',
      region: 'Maharashtra',
      postalCode: '444707',
      /** ISO 3166-1 alpha-2, as schema.org expects. */
      country: 'IN',
    },
  },
  /**
   * The handle @dinardetergent is printed on the client's product sheet; the profile URLs
   * follow each network's standard pattern.
   * TODO(client): confirm each profile exists at these exact addresses before launch.
   */
  socialHandle: '@dinardetergent',
  social: [
    { label: 'Instagram', href: 'https://www.instagram.com/dinardetergent/' },
    { label: 'Facebook', href: 'https://www.facebook.com/dinardetergent' },
    { label: 'YouTube', href: 'https://www.youtube.com/@dinardetergent' },
  ],
} as const;
