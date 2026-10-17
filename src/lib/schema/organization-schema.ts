import { getImage } from 'astro:assets';
import logo from '@/assets/brand/dinar-logo.png';
import { site } from '@/config/site';

const SCHEMA_LOGO_WIDTH = 512;

/**
 * The brand and the company behind it as one schema.org Organization: the trading name,
 * the legal name, proprietor, office address and support line. Shared by every page that
 * describes the company, so search engines always see the same facts.
 */
export async function buildOrganizationNode(siteUrl: string): Promise<Record<string, unknown>> {
  const { company } = site;
  const schemaLogo = await getImage({ src: logo, width: SCHEMA_LOGO_WIDTH, format: 'png' });

  return {
    '@type': 'Organization',
    '@id': new URL('/#organization', siteUrl).href,
    name: site.name,
    legalName: company.legalName,
    url: siteUrl,
    logo: new URL(schemaLogo.src, siteUrl).href,
    email: site.email,
    founder: { '@type': 'Person', name: company.proprietor },
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.office.streetAddress,
      addressLocality: company.office.locality,
      addressRegion: company.office.region,
      postalCode: company.office.postalCode,
      addressCountry: company.office.country,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: site.supportPhone,
      email: site.email,
      contactType: 'customer support',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    },
  };
}
