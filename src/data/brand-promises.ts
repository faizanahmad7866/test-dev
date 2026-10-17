import cleaningTechnology from '@/assets/brand/why-dinar/cleaning-technology.jpg';
import consistentPerformance from '@/assets/brand/why-dinar/consistent-performance.jpg';
import everydayLaundry from '@/assets/brand/why-dinar/everyday-laundry.jpg';
import premiumIngredients from '@/assets/brand/why-dinar/premium-ingredients.jpg';
import trustedFamilies from '@/assets/brand/why-dinar/trusted-families-illustration.jpg';

/**
 * "Why choose Dinar™?" in the client's own English (Super Wash sheet) and Hindi
 * ("क्यों चुनें दिनार™?" sheet), each with the client's photo for it. The fifth line differs
 * between the two sheets, so its Hindi is the sheet's matching benefit, "दैनिक उपयोग के लिए उत्तम".
 * `zoom` keeps a busy photo's subject readable in the small circle: `center` closes in on
 * the middle, `top` on the upper part (faces).
 */
export const BRAND_PROMISES = [
  {
    en: 'Premium quality ingredients',
    hi: 'प्रीमियम क्वालिटी इंग्रेडिएंट्स',
    image: premiumIngredients,
    zoom: 'none',
  },
  {
    en: 'Advanced cleaning technology',
    hi: 'एडवांस क्लीनिंग टेक्नोलॉजी',
    image: cleaningTechnology,
    zoom: 'center',
  },
  {
    en: 'Trusted by families',
    hi: 'परिवारों का भरोसा',
    image: trustedFamilies,
    zoom: 'top',
  },
  {
    en: 'Consistent performance',
    hi: 'लगातार बेहतरीन प्रदर्शन',
    image: consistentPerformance,
    zoom: 'none',
  },
  {
    en: 'Designed for everyday laundry',
    hi: 'दैनिक उपयोग के लिए उत्तम',
    image: everydayLaundry,
    zoom: 'none',
  },
] as const;
