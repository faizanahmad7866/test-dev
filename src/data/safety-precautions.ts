/**
 * Safety and storage precautions shown on every product page, set out the way a pack's
 * caution panel is: the children warning leads, then each precaution under its topic.
 * The standard cautions for household laundry detergents, approved by the client for the
 * whole range.
 * TODO(client): match the wording to the caution panel on each pack once the pack backs are shared.
 */
export const SAFETY_LEAD = {
  en: 'Keep out of reach of children.',
  hi: 'बच्चों की पहुँच से दूर रखें।',
} as const;

export const SAFETY_PRECAUTIONS = [
  {
    topic: 'Eyes',
    en: 'Avoid contact with eyes. If it gets into the eyes, rinse well with clean water.',
    hi: 'आँखों के संपर्क से बचाएँ। आँख में जाने पर साफ़ पानी से अच्छी तरह धोएँ।',
  },
  {
    topic: 'If swallowed',
    en: 'Do not swallow. If swallowed, see a doctor.',
    hi: 'निगलें नहीं। गलती से निगल लेने पर डॉक्टर से संपर्क करें।',
  },
  {
    topic: 'After use',
    en: 'Wash your hands after use.',
    hi: 'इस्तेमाल के बाद हाथ धो लें।',
  },
  {
    topic: 'Storage',
    en: 'Store in a cool, dry place, away from moisture.',
    hi: 'ठंडी और सूखी जगह पर, नमी से दूर रखें।',
  },
] as const;
