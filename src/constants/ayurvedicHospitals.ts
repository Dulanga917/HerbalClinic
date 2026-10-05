export type HospitalType = 'teaching' | 'research' | 'provincial';

export type AyurvedicHospital = {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  type: HospitalType;
  government: boolean;
  mapQuery: string;
  source: string;
};

export const HOSPITAL_TYPE_LABELS: Record<HospitalType, string> = {
  teaching: 'Teaching',
  research: 'Research',
  provincial: 'Provincial',
};

const MINISTRY_LIST = 'https://mim.gov.lk/en/hospitals-and-institutions/';
const NCP_LIST = 'https://ayudeptncp.lk/en/instinfo/ayuhsp/';
const CP_LIST = 'https://ayurveda.cp.gov.lk/more-info/about-us/about-dept-of-ayurveda.html?id=87&view=category';
const SP_CONTACTS = 'http://www.ayurvedadept.sp.gov.lk/viewcontactdetails';
const SP_SERVICES = 'https://www.ayurvedadept.sp.gov.lk/allservices';

// Names and towns come from the official sources listed in `source`.
// Street addresses are only included where an official page states them;
// otherwise `address` is the town and district so nothing is invented.
// `mapQuery` is a text search, not coordinates, because coordinates were not
// independently verified.
export const AYURVEDIC_HOSPITALS: AyurvedicHospital[] = [
  {
    id: 'national-ayurveda-borella',
    name: 'National Ayurvedic Teaching Hospital',
    city: 'Borella',
    district: 'Colombo',
    address: 'No. 325, Dr. N. M. Perera Mawatha, Colombo 08',
    type: 'teaching',
    government: true,
    mapQuery: 'National Ayurvedic Teaching Hospital, 325 Dr N M Perera Mawatha, Borella, Colombo 08, Sri Lanka',
    source: 'https://ayurveda.gov.lk/the-ayurveda-national-hospital-of-sri-lanka/',
  },
  {
    id: 'gampaha-wickramarachchi-yakkala',
    name: 'Gampaha Wickramarachchi Ayurveda Teaching Hospital',
    city: 'Yakkala',
    district: 'Gampaha',
    address: 'Yakkala, Gampaha District',
    type: 'teaching',
    government: true,
    mapQuery: 'Gampaha Wickramarachchi Ayurveda Teaching Hospital, Yakkala, Sri Lanka',
    source: MINISTRY_LIST,
  },
  {
    id: 'bmari-nawinna',
    name: 'Bandaranaike Memorial Ayurvedic Research Institute',
    city: 'Nawinna, Maharagama',
    district: 'Colombo',
    address: 'Nawinna, Maharagama',
    type: 'research',
    government: true,
    mapQuery: 'Bandaranaike Memorial Ayurvedic Research Institute, Nawinna, Maharagama, Sri Lanka',
    source: MINISTRY_LIST,
  },
  {
    id: 'ayurvedic-research-ampara',
    name: 'Ayurvedic Research Hospital',
    city: 'Ampara',
    district: 'Ampara',
    address: 'Ampara',
    type: 'research',
    government: true,
    mapQuery: 'Ayurvedic Research Hospital, Ampara, Sri Lanka',
    source: MINISTRY_LIST,
  },
  {
    id: 'chamal-rajapaksa-hambantota',
    name: 'Chamal Rajapaksa Ayurvedic Research Hospital',
    city: 'Hambantota',
    district: 'Hambantota',
    address: 'Hambantota',
    type: 'research',
    government: true,
    mapQuery: 'Chamal Rajapaksa Ayurvedic Research Hospital, Hambantota, Sri Lanka',
    source: MINISTRY_LIST,
  },
  {
    id: 'unani-research-manchanthuduvai',
    name: 'Ayurveda (Unani) Research Hospital',
    city: 'Manchanthuduvai',
    district: 'Batticaloa',
    address: 'Manchanthuduvai',
    type: 'research',
    government: true,
    mapQuery: 'Ayurveda Unani Research Hospital, Manchanthuduvai, Batticaloa, Sri Lanka',
    source: MINISTRY_LIST,
  },
  {
    id: 'kidney-research-medawachchiya',
    name: 'Kidney Disease Prevention Ayurvedic Research Hospital',
    city: 'Medawachchiya',
    district: 'Anuradhapura',
    address: 'Medawachchiya',
    type: 'research',
    government: true,
    mapQuery: 'Kidney Disease Prevention Ayurvedic Research Hospital, Medawachchiya, Sri Lanka',
    source: MINISTRY_LIST,
  },
  {
    id: 'traditional-research-mihintale',
    name: 'Maithripala Senanayake Memorial Traditional Research Hospital',
    city: 'Mihintale',
    district: 'Anuradhapura',
    address: 'Mihintale',
    type: 'research',
    government: true,
    mapQuery: 'Maithripala Senanayake Memorial Traditional Research Hospital, Mihintale, Sri Lanka',
    source: MINISTRY_LIST,
  },
  {
    id: 'provincial-anuradhapura',
    name: 'Provincial Ayurveda Hospital - Anuradhapura',
    city: 'Anuradhapura',
    district: 'Anuradhapura',
    address: 'Anuradhapura',
    type: 'provincial',
    government: true,
    mapQuery: 'Provincial Ayurveda Hospital, Anuradhapura, Sri Lanka',
    source: NCP_LIST,
  },
  {
    id: 'base-minneriya',
    name: 'Base Ayurveda Hospital - Minneriya',
    city: 'Minneriya',
    district: 'Polonnaruwa',
    address: 'Minneriya',
    type: 'provincial',
    government: true,
    mapQuery: 'Base Ayurveda Hospital, Minneriya, Sri Lanka',
    source: NCP_LIST,
  },
  {
    id: 'provincial-pallekele',
    name: 'Provincial Ayurveda Hospital - Pallekele',
    city: 'Pallekele, Kundasale',
    district: 'Kandy',
    address: 'Pallekele, Kundasale',
    type: 'provincial',
    government: true,
    mapQuery: 'Provincial Ayurveda Hospital, Pallekele, Kundasale, Sri Lanka',
    source: CP_LIST,
  },
  {
    id: 'district-galle',
    name: 'District Ayurveda Hospital - Galle',
    city: 'Megalle, Galle',
    district: 'Galle',
    address: 'Megalle, Galle',
    type: 'provincial',
    government: true,
    mapQuery: 'District Ayurveda Hospital, Megalle, Galle, Sri Lanka',
    source: SP_CONTACTS,
  },
  {
    id: 'ayurveda-aparekka',
    name: 'Ayurveda Hospital - Aparekka',
    city: 'Aparekka',
    district: 'Matara',
    address: 'Aparekka, Matara',
    type: 'provincial',
    government: true,
    mapQuery: 'Ayurveda Hospital, Aparekka, Matara, Sri Lanka',
    source: SP_SERVICES,
  },
];

export const HOSPITAL_SOURCE_NOTE =
  'Hospital information is based on publicly available Sri Lankan Ayurveda health-service information. ' +
  'Confirm services and opening hours directly with the institution before visiting.';
