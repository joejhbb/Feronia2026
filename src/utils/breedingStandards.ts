import { calculatePreciseAge, getEffectiveSystemDate } from './timeUtils';

export interface SpeciesBreedingStandard {
  code: string;
  name: string;
  scientificName: string;
  taxonomicFamily: string;
  familyCode: string;
  minAgeMonthsFemale: number;
  minAgeMonthsMale: number;
  minAgeTextFemale: string;
  minAgeTextMale: string;
  minWeightGramsFemale: number;
  minWeightGramsMale: number;
  maxWeightGramsFemale?: number;
  maxWeightGramsMale?: number;
  minWeightTextFemale: string;
  minWeightTextMale: string;
  brumationCoolingRequired: string;
  coolingTempRange: string;
  coolingDuration: string;
  pairingSeasonText: string;
  pairingSeasonMonths: number[]; // 0 = Jan, 1 = Feb, ... 11 = Dec
  gestationPreLayPeriod: string;
  avgClutchLitterSize: string;
  incubationTempTarget: string;
  incubationHumidity: string;
  incubationPeriod: string;
  postLayRestFemale: string;
  preLayBehavioralIndicators?: string;
  avgClutchMin?: number;
  avgClutchMax?: number;
  incubationTempMinC?: number;
  incubationTempMaxC?: number;
  incubationHumidityMinPercent?: number;
  incubationHumidityMaxPercent?: number;
  incubationPeriodMinDays?: number;
  incubationPeriodMaxDays?: number;
  aliases: string[];
  id?: string;
  incubationDays?: number;
  seasonMonths?: number[];
  minFemaleWeightGrams?: number;
  minMaleWeightGrams?: number;
}

export const SPECIES_BREEDING_STANDARDS: SpeciesBreedingStandard[] = [
  {
    code: 'SPC-BDR',
    name: 'Bearded Dragon',
    scientificName: 'Pogona vitticeps',
    taxonomicFamily: 'Agamidae',
    familyCode: 'FAM-AGA',
    minAgeMonthsFemale: 18,
    minAgeMonthsMale: 12,
    minAgeTextFemale: '18 mos',
    minAgeTextMale: '12 mos',
    minWeightGramsFemale: 350,
    maxWeightGramsFemale: 400,
    minWeightGramsMale: 300,
    maxWeightGramsMale: 350,
    minWeightTextFemale: '350g',
    minWeightTextMale: '300g',
    brumationCoolingRequired: 'Optional / Recommended',
    coolingTempRange: '15°C–20°C (59–68°F)',
    coolingDuration: '45 – 60 days',
    pairingSeasonText: 'Spring – Summer',
    pairingSeasonMonths: [2, 3, 4, 5, 6, 7], // Mar to Aug
    gestationPreLayPeriod: '30–45 days post-mating',
    preLayBehavioralIndicators: 'Restlessness, aggressive digging in nesting box, reduced appetite, visible abdominal swellings',
    avgClutchLitterSize: '15 – 30 eggs',
    avgClutchMin: 15,
    avgClutchMax: 30,
    incubationTempTarget: '28°C–29.5°C',
    incubationTempMinC: 28,
    incubationTempMaxC: 29.5,
    incubationHumidity: '80% – 85%',
    incubationHumidityMinPercent: 80,
    incubationHumidityMaxPercent: 85,
    incubationPeriod: '50 – 70 days',
    incubationPeriodMinDays: 50,
    incubationPeriodMaxDays: 70,
    postLayRestFemale: '6–8 months (post-season)',
    aliases: ['bearded dragon', 'pogona vitticeps', 'spc-bdr', 'central bearded dragon']
  },
  {
    code: 'SPC-LPG',
    name: 'Leopard Gecko',
    scientificName: 'Eublepharis macularius',
    taxonomicFamily: 'Eublepharidae',
    familyCode: 'FAM-EUB',
    minAgeMonthsFemale: 18,
    minAgeMonthsMale: 12,
    minAgeTextFemale: '18 mos',
    minAgeTextMale: '12 mos',
    minWeightGramsFemale: 50,
    maxWeightGramsFemale: 60,
    minWeightGramsMale: 45,
    maxWeightGramsMale: 50,
    minWeightTextFemale: '50g',
    minWeightTextMale: '45g',
    brumationCoolingRequired: 'Optional (Cooling)',
    coolingTempRange: '18°C–20°C (65–68°F)',
    coolingDuration: '40 – 60 days',
    pairingSeasonText: 'Jan – Aug',
    pairingSeasonMonths: [0, 1, 2, 3, 4, 5, 6, 7], // Jan to Aug
    gestationPreLayPeriod: '14–30 days post-mating',
    preLayBehavioralIndicators: 'Pinkish/white eggs visible through translucent belly skin, frequent visits to moist lay box',
    avgClutchLitterSize: '2 eggs',
    avgClutchMin: 2,
    avgClutchMax: 2,
    incubationTempTarget: '27°C–32°C',
    incubationTempMinC: 27,
    incubationTempMaxC: 32,
    incubationHumidity: '80% – 90%',
    incubationHumidityMinPercent: 80,
    incubationHumidityMaxPercent: 90,
    incubationPeriod: '45 – 70 days',
    incubationPeriodMinDays: 45,
    incubationPeriodMaxDays: 70,
    postLayRestFemale: '2–3 months (seasonal break)',
    aliases: ['leopard gecko', 'eublepharis macularius', 'spc-lpg']
  },
  {
    code: 'SPC-BPR',
    name: 'Ball Python',
    scientificName: 'Python regius',
    taxonomicFamily: 'Pythonidae',
    familyCode: 'FAM-PYT',
    minAgeMonthsFemale: 24,
    minAgeMonthsMale: 12,
    minAgeTextFemale: '24 mos',
    minAgeTextMale: '12 mos',
    minWeightGramsFemale: 1200,
    maxWeightGramsFemale: 1500,
    minWeightGramsMale: 700,
    maxWeightGramsMale: 800,
    minWeightTextFemale: '1,200g',
    minWeightTextMale: '700g',
    brumationCoolingRequired: 'Optional (Night Cooling)',
    coolingTempRange: '22°C–24°C (72–75°F)',
    coolingDuration: '60 – 90 days',
    pairingSeasonText: 'Oct – Mar',
    pairingSeasonMonths: [9, 10, 11, 0, 1, 2], // Oct, Nov, Dec, Jan, Feb, Mar
    gestationPreLayPeriod: '30–45 days post-ovulation (~105-120d post-mating)',
    preLayBehavioralIndicators: 'Distinct ovulation swell, pre-lay shed (approx. 30 days before lay), bowl wrapping, belly glow',
    avgClutchLitterSize: '4 – 11 eggs',
    avgClutchMin: 4,
    avgClutchMax: 11,
    incubationTempTarget: '31.5°C–32°C',
    incubationTempMinC: 31.5,
    incubationTempMaxC: 32,
    incubationHumidity: '85% – 95%',
    incubationHumidityMinPercent: 85,
    incubationHumidityMaxPercent: 95,
    incubationPeriod: '55 – 60 days',
    incubationPeriodMinDays: 55,
    incubationPeriodMaxDays: 60,
    postLayRestFemale: '8–12 months (1 clutch/yr)',
    aliases: ['ball python', 'python regius', 'spc-bpr', 'royal python']
  },
  {
    code: 'SPC-CSN',
    name: 'Corn Snake',
    scientificName: 'Pantherophis guttatus',
    taxonomicFamily: 'Colubridae',
    familyCode: 'FAM-COL',
    minAgeMonthsFemale: 18,
    minAgeMonthsMale: 12,
    minAgeTextFemale: '18 mos',
    minAgeTextMale: '12 mos',
    minWeightGramsFemale: 300,
    maxWeightGramsFemale: 350,
    minWeightGramsMale: 200,
    maxWeightGramsMale: 250,
    minWeightTextFemale: '300g',
    minWeightTextMale: '200g',
    brumationCoolingRequired: 'Yes (Winter Cooling)',
    coolingTempRange: '12°C–15°C (55–60°F)',
    coolingDuration: '60 – 75 days',
    pairingSeasonText: 'Feb – May',
    pairingSeasonMonths: [1, 2, 3, 4], // Feb to May
    gestationPreLayPeriod: '30–45 days post-mating',
    preLayBehavioralIndicators: 'Pre-lay shed (~7–14 days before laying), seeking moist hide, increased restlessness',
    avgClutchLitterSize: '10 – 25 eggs',
    avgClutchMin: 10,
    avgClutchMax: 25,
    incubationTempTarget: '27°C–28.5°C',
    incubationTempMinC: 27,
    incubationTempMaxC: 28.5,
    incubationHumidity: '80% – 90%',
    incubationHumidityMinPercent: 80,
    incubationHumidityMaxPercent: 90,
    incubationPeriod: '55 – 65 days',
    incubationPeriodMinDays: 55,
    incubationPeriodMaxDays: 65,
    postLayRestFemale: '4–6 months (max 2 clutches/yr)',
    aliases: ['corn snake', 'pantherophis guttatus', 'spc-csn', 'red rat snake']
  },
  {
    code: 'SPC-CGK',
    name: 'Crested Gecko',
    scientificName: 'Correlophus ciliatus',
    taxonomicFamily: 'Diplodactylidae',
    familyCode: 'FAM-DIP',
    minAgeMonthsFemale: 18,
    minAgeMonthsMale: 12,
    minAgeTextFemale: '18 mos',
    minAgeTextMale: '12 mos',
    minWeightGramsFemale: 45,
    maxWeightGramsFemale: 50,
    minWeightGramsMale: 35,
    maxWeightGramsMale: 40,
    minWeightTextFemale: '45g',
    minWeightTextMale: '35g',
    brumationCoolingRequired: 'No (Photoperiod shift)',
    coolingTempRange: '18°C–20°C (65–68°F)',
    coolingDuration: '30 – 60 days',
    pairingSeasonText: 'Year-round (Peak: Feb–Oct)',
    pairingSeasonMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Year-round
    gestationPreLayPeriod: '25–35 days per clutch',
    preLayBehavioralIndicators: 'Visible eggs in lower abdomen, digging substrate in moist lay box',
    avgClutchLitterSize: '2 eggs',
    avgClutchMin: 2,
    avgClutchMax: 2,
    incubationTempTarget: '22°C–25°C',
    incubationTempMinC: 22,
    incubationTempMaxC: 25,
    incubationHumidity: '80% – 90%',
    incubationHumidityMinPercent: 80,
    incubationHumidityMaxPercent: 90,
    incubationPeriod: '60 – 120 days',
    incubationPeriodMinDays: 60,
    incubationPeriodMaxDays: 120,
    postLayRestFemale: '3–4 months (seasonal break)',
    aliases: ['crested gecko', 'correlophus ciliatus', 'spc-cgk', 'eyelash gecko']
  },
  {
    code: 'SPC-RFT',
    name: 'Red-Foot Tortoise',
    scientificName: 'Chelonoidis carbonaria',
    taxonomicFamily: 'Testudinidae',
    familyCode: 'FAM-TES',
    minAgeMonthsFemale: 60,
    minAgeMonthsMale: 48,
    minAgeTextFemale: '60 mos (5 yrs)',
    minAgeTextMale: '48 mos (4 yrs)',
    minWeightGramsFemale: 3500,
    maxWeightGramsFemale: 5000,
    minWeightGramsMale: 3000,
    maxWeightGramsMale: 4500,
    minWeightTextFemale: '3,500g',
    minWeightTextMale: '3,000g',
    brumationCoolingRequired: 'No (Rain Stimulation)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    pairingSeasonText: 'Spring – Autumn',
    pairingSeasonMonths: [2, 3, 4, 5, 6, 7, 8, 9], // Mar to Oct
    gestationPreLayPeriod: '30–60 days post-mating',
    preLayBehavioralIndicators: 'Pacing perimeter, test-digging rear leg holes in soil, restlessness, reduced appetite',
    avgClutchLitterSize: '5 – 15 eggs',
    avgClutchMin: 5,
    avgClutchMax: 15,
    incubationTempTarget: '28°C–31°C',
    incubationTempMinC: 28,
    incubationTempMaxC: 31,
    incubationHumidity: '80% – 90%',
    incubationHumidityMinPercent: 80,
    incubationHumidityMaxPercent: 90,
    incubationPeriod: '100 – 150 days',
    incubationPeriodMinDays: 100,
    incubationPeriodMaxDays: 150,
    postLayRestFemale: '4–6 months (seasonal break)',
    aliases: ['red-foot tortoise', 'red foot tortoise', 'chelonoidis carbonaria', 'spc-rft', 'redfoot']
  },
  {
    code: 'SPC-AST',
    name: 'African Spurred Tortoise (Sulcata)',
    scientificName: 'Centrochelys sulcata',
    taxonomicFamily: 'Testudinidae',
    familyCode: 'FAM-TES',
    minAgeMonthsFemale: 60,
    minAgeMonthsMale: 48,
    minAgeTextFemale: '60 mos (5 yrs)',
    minAgeTextMale: '48 mos (4 yrs)',
    minWeightGramsFemale: 15000,
    maxWeightGramsFemale: 20000,
    minWeightGramsMale: 15000,
    maxWeightGramsMale: 20000,
    minWeightTextFemale: '15,000g',
    minWeightTextMale: '15,000g',
    brumationCoolingRequired: 'No (Rain Stimulation)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    pairingSeasonText: 'Autumn – Winter',
    pairingSeasonMonths: [8, 9, 10, 11, 0, 1], // Sep to Feb
    gestationPreLayPeriod: '30–60 days post-mating',
    preLayBehavioralIndicators: 'Extensive nest digging with hind limbs, aggressive pacing, searching for deep soil/sand',
    avgClutchLitterSize: '15 – 30 eggs',
    avgClutchMin: 15,
    avgClutchMax: 30,
    incubationTempTarget: '29°C–31°C',
    incubationTempMinC: 29,
    incubationTempMaxC: 31,
    incubationHumidity: '75% – 85%',
    incubationHumidityMinPercent: 75,
    incubationHumidityMaxPercent: 85,
    incubationPeriod: '90 – 120 days',
    incubationPeriodMinDays: 90,
    incubationPeriodMaxDays: 120,
    postLayRestFemale: '4–6 months (seasonal break)',
    aliases: ['african spurred tortoise', 'sulcata', 'sulcata tortoise', 'centrochelys sulcata', 'spc-ast']
  },
  {
    code: 'SPC-RES',
    name: 'Red Eared Slider',
    scientificName: 'Trachemys scripta elegans',
    taxonomicFamily: 'Emydidae',
    familyCode: 'FAM-EMY',
    minAgeMonthsFemale: 48,
    minAgeMonthsMale: 24,
    minAgeTextFemale: '48 mos (4 yrs)',
    minAgeTextMale: '24 mos (2 yrs)',
    minWeightGramsFemale: 500,
    maxWeightGramsFemale: 800,
    minWeightGramsMale: 350,
    maxWeightGramsMale: 500,
    minWeightTextFemale: '500g',
    minWeightTextMale: '350g',
    brumationCoolingRequired: 'Yes (Winter Cooling)',
    coolingTempRange: '10°C–15°C (50–59°F)',
    coolingDuration: '60 – 90 days',
    pairingSeasonText: 'Spring – Summer',
    pairingSeasonMonths: [2, 3, 4, 5, 6, 7], // Mar to Aug
    gestationPreLayPeriod: '30–45 days post-mating',
    preLayBehavioralIndicators: 'Frantic attempts to leave water, basking frequently, hind leg digging motions',
    avgClutchLitterSize: '6 – 20 eggs',
    avgClutchMin: 6,
    avgClutchMax: 20,
    incubationTempTarget: '27°C–30°C',
    incubationTempMinC: 27,
    incubationTempMaxC: 30,
    incubationHumidity: '80% – 90%',
    incubationHumidityMinPercent: 80,
    incubationHumidityMaxPercent: 90,
    incubationPeriod: '60 – 90 days',
    incubationPeriodMinDays: 60,
    incubationPeriodMaxDays: 90,
    postLayRestFemale: '4–6 months (seasonal break)',
    aliases: ['red eared slider', 'red-eared slider', 'trachemys scripta elegans', 'spc-res', 'res turtle']
  },
  {
    code: 'SPC-SGL',
    name: 'Sugar Glider',
    scientificName: 'Petaurus breviceps',
    taxonomicFamily: 'Petauridae',
    familyCode: 'FAM-PET',
    minAgeMonthsFemale: 8,
    minAgeMonthsMale: 12,
    minAgeTextFemale: '8 mos',
    minAgeTextMale: '12 mos',
    minWeightGramsFemale: 80,
    maxWeightGramsFemale: 100,
    minWeightGramsMale: 100,
    maxWeightGramsMale: 140,
    minWeightTextFemale: '80g',
    minWeightTextMale: '100g',
    brumationCoolingRequired: 'N/A (Marsupial)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    pairingSeasonText: 'Year-round (Peak: Jun–Nov)',
    pairingSeasonMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Year-round
    gestationPreLayPeriod: '16 days gestation (Pouch Rearing: 70 days)',
    preLayBehavioralIndicators: 'Frequent pouch cleaning, small bulge/movement in marsupial pouch, increased appetite',
    avgClutchLitterSize: '1 – 2 joeys',
    avgClutchMin: 1,
    avgClutchMax: 2,
    incubationTempTarget: 'N/A (Pouch Rearing)',
    incubationHumidity: 'N/A',
    incubationPeriod: '16 days gestation',
    incubationPeriodMinDays: 16,
    incubationPeriodMaxDays: 16,
    postLayRestFemale: '3–4 months between litters',
    aliases: ['sugar glider', 'petaurus breviceps', 'spc-sgl']
  },
  {
    code: 'SPC-SPC',
    name: 'Spectacled Caiman',
    scientificName: 'Caiman crocodilus',
    taxonomicFamily: 'Alligatoridae',
    familyCode: 'FAM-ALL',
    minAgeMonthsFemale: 48,
    minAgeMonthsMale: 48,
    minAgeTextFemale: '48 mos (4 yrs)',
    minAgeTextMale: '48 mos (4 yrs)',
    minWeightGramsFemale: 8000,
    maxWeightGramsFemale: 12000,
    minWeightGramsMale: 10000,
    maxWeightGramsMale: 15000,
    minWeightTextFemale: '8,000g',
    minWeightTextMale: '10,000g',
    brumationCoolingRequired: 'No (Rain Stimulation)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    pairingSeasonText: 'Wet Season (May–Aug)',
    pairingSeasonMonths: [4, 5, 6, 7], // May to Aug
    gestationPreLayPeriod: '40–60 days post-mating',
    preLayBehavioralIndicators: 'Active nest-mound building with vegetation/mud, defensive guarding of nest site',
    avgClutchLitterSize: '15 – 40 eggs',
    avgClutchMin: 15,
    avgClutchMax: 40,
    incubationTempTarget: '28°C–32°C',
    incubationTempMinC: 28,
    incubationTempMaxC: 32,
    incubationHumidity: '90% – 95%',
    incubationHumidityMinPercent: 90,
    incubationHumidityMaxPercent: 95,
    incubationPeriod: '70 – 90 days',
    incubationPeriodMinDays: 70,
    incubationPeriodMaxDays: 90,
    postLayRestFemale: '12 months (1 clutch/yr)',
    aliases: ['spectacled caiman', 'caiman crocodilus', 'spc-spc', 'caiman']
  },
  {
    code: 'SPC-GGK',
    name: 'Gargoyle Gecko',
    scientificName: 'Rhacodactylus auriculatus',
    taxonomicFamily: 'Diplodactylidae',
    familyCode: 'FAM-DIP',
    minAgeMonthsFemale: 18,
    minAgeMonthsMale: 12,
    minAgeTextFemale: '18 mos',
    minAgeTextMale: '12 mos',
    minWeightGramsFemale: 45,
    maxWeightGramsFemale: 55,
    minWeightGramsMale: 40,
    maxWeightGramsMale: 50,
    minWeightTextFemale: '45g',
    minWeightTextMale: '40g',
    brumationCoolingRequired: 'No (Photoperiod shift)',
    coolingTempRange: '18°C–20°C (65–68°F)',
    coolingDuration: '30 – 60 days',
    pairingSeasonText: 'Spring – Autumn',
    pairingSeasonMonths: [2, 3, 4, 5, 6, 7, 8, 9], // Mar to Oct
    gestationPreLayPeriod: '30–40 days per clutch',
    preLayBehavioralIndicators: 'Distended abdomen with twin eggs visible, burrowing in moist lay box',
    avgClutchLitterSize: '2 eggs',
    avgClutchMin: 2,
    avgClutchMax: 2,
    incubationTempTarget: '22°C–25°C',
    incubationTempMinC: 22,
    incubationTempMaxC: 25,
    incubationHumidity: '80% – 90%',
    incubationHumidityMinPercent: 80,
    incubationHumidityMaxPercent: 90,
    incubationPeriod: '60 – 90 days',
    incubationPeriodMinDays: 60,
    incubationPeriodMaxDays: 90,
    postLayRestFemale: '3–4 months (seasonal break)',
    aliases: ['gargoyle gecko', 'rhacodactylus auriculatus', 'spc-ggk']
  },
  {
    code: 'SPC-LGK',
    name: 'Leachianus Gecko',
    scientificName: 'Rhacodactylus leachianus',
    taxonomicFamily: 'Diplodactylidae',
    familyCode: 'FAM-DIP',
    minAgeMonthsFemale: 36,
    minAgeMonthsMale: 30,
    minAgeTextFemale: '36 mos (3 yrs)',
    minAgeTextMale: '30 mos (2.5 yrs)',
    minWeightGramsFemale: 200,
    maxWeightGramsFemale: 250,
    minWeightGramsMale: 180,
    maxWeightGramsMale: 220,
    minWeightTextFemale: '200g',
    minWeightTextMale: '180g',
    brumationCoolingRequired: 'Optional (Night Cooling)',
    coolingTempRange: '18°C–20°C (65–68°F)',
    coolingDuration: '45 – 60 days',
    pairingSeasonText: 'Spring – Autumn',
    pairingSeasonMonths: [2, 3, 4, 5, 6, 7, 8, 9], // Mar to Oct
    gestationPreLayPeriod: '30–45 days per clutch',
    preLayBehavioralIndicators: 'Increased weight, aggressive nest-box digging, swollen lower abdomen',
    avgClutchLitterSize: '2 eggs',
    avgClutchMin: 2,
    avgClutchMax: 2,
    incubationTempTarget: '21°C–24°C',
    incubationTempMinC: 21,
    incubationTempMaxC: 24,
    incubationHumidity: '85% – 90%',
    incubationHumidityMinPercent: 85,
    incubationHumidityMaxPercent: 90,
    incubationPeriod: '60 – 120 days',
    incubationPeriodMinDays: 60,
    incubationPeriodMaxDays: 120,
    postLayRestFemale: '4–6 months (seasonal break)',
    aliases: ['leachianus gecko', 'rhacodactylus leachianus', 'spc-lgk', 'new caledonian giant gecko', 'leachie']
  },
  {
    code: 'SPC-FDR',
    name: 'Frilled Dragon',
    scientificName: 'Chlamydosaurus kingii',
    taxonomicFamily: 'Agamidae',
    familyCode: 'FAM-AGA',
    minAgeMonthsFemale: 18,
    minAgeMonthsMale: 12,
    minAgeTextFemale: '18 mos',
    minAgeTextMale: '12 mos',
    minWeightGramsFemale: 200,
    maxWeightGramsFemale: 250,
    minWeightGramsMale: 180,
    maxWeightGramsMale: 220,
    minWeightTextFemale: '200g',
    minWeightTextMale: '180g',
    brumationCoolingRequired: 'Optional / Recommended',
    coolingTempRange: '18°C–22°C (65–72°F)',
    coolingDuration: '45 – 60 days',
    pairingSeasonText: 'Wet Season / Spring',
    pairingSeasonMonths: [2, 3, 4, 5, 6, 7], // Mar to Aug
    gestationPreLayPeriod: '30–45 days post-mating',
    preLayBehavioralIndicators: 'Restless pacing, test digging in sandy damp soil, refusal of food near lay time',
    avgClutchLitterSize: '8 – 14 eggs',
    avgClutchMin: 8,
    avgClutchMax: 14,
    incubationTempTarget: '28°C–30°C',
    incubationTempMinC: 28,
    incubationTempMaxC: 30,
    incubationHumidity: '80% – 90%',
    incubationHumidityMinPercent: 80,
    incubationHumidityMaxPercent: 90,
    incubationPeriod: '65 – 85 days',
    incubationPeriodMinDays: 65,
    incubationPeriodMaxDays: 85,
    postLayRestFemale: '6–8 months (post-season)',
    aliases: ['frilled dragon', 'chlamydosaurus kingii', 'spc-fdr', 'frilled lizard']
  },
  {
    code: 'SPC-RCS',
    name: 'Red-eyed Crocodile Skink',
    scientificName: 'Tribolonotus gracilis',
    taxonomicFamily: 'Scincidae',
    familyCode: 'FAM-SCI',
    minAgeMonthsFemale: 18,
    minAgeMonthsMale: 12,
    minAgeTextFemale: '18 mos',
    minAgeTextMale: '12 mos',
    minWeightGramsFemale: 38,
    maxWeightGramsFemale: 45,
    minWeightGramsMale: 35,
    maxWeightGramsMale: 42,
    minWeightTextFemale: '38g',
    minWeightTextMale: '35g',
    brumationCoolingRequired: 'No (High Humidity)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    pairingSeasonText: 'Year-round',
    pairingSeasonMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Year-round
    gestationPreLayPeriod: '30–45 days per egg (clutch size: 1 egg)',
    preLayBehavioralIndicators: 'Female stays deep in damp burrow, visible single-side abdominal bulge, increased vocalization',
    avgClutchLitterSize: '1 egg (clutch size: 1 egg)',
    avgClutchMin: 1,
    avgClutchMax: 1,
    incubationTempTarget: '22°C–25°C',
    incubationTempMinC: 22,
    incubationTempMaxC: 25,
    incubationHumidity: '85% – 95%',
    incubationHumidityMinPercent: 85,
    incubationHumidityMaxPercent: 95,
    incubationPeriod: '60 – 80 days',
    incubationPeriodMinDays: 60,
    incubationPeriodMaxDays: 80,
    postLayRestFemale: '15–30 days between single eggs',
    aliases: ['red-eyed crocodile skink', 'red eyed crocodile skink', 'tribolonotus gracilis', 'spc-rcs', 'crocodile skink']
  },
  {
    code: 'SPC-WCS',
    name: 'White-eyed Crocodile Skink',
    scientificName: 'Tribolonotus novaeguineae',
    taxonomicFamily: 'Scincidae',
    familyCode: 'FAM-SCI',
    minAgeMonthsFemale: 18,
    minAgeMonthsMale: 12,
    minAgeTextFemale: '18 mos',
    minAgeTextMale: '12 mos',
    minWeightGramsFemale: 38,
    maxWeightGramsFemale: 45,
    minWeightGramsMale: 35,
    maxWeightGramsMale: 42,
    minWeightTextFemale: '38g',
    minWeightTextMale: '35g',
    brumationCoolingRequired: 'No (High Humidity)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    pairingSeasonText: 'Year-round',
    pairingSeasonMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Year-round
    gestationPreLayPeriod: '30–45 days per egg (clutch size: 1 egg)',
    preLayBehavioralIndicators: 'Hiding in moist substrate hide, swollen abdomen, guarding nest cavity',
    avgClutchLitterSize: '1 egg (clutch size: 1 egg)',
    avgClutchMin: 1,
    avgClutchMax: 1,
    incubationTempTarget: '22°C–25°C',
    incubationTempMinC: 22,
    incubationTempMaxC: 25,
    incubationHumidity: '85% – 95%',
    incubationHumidityMinPercent: 85,
    incubationHumidityMaxPercent: 95,
    incubationPeriod: '60 – 80 days',
    incubationPeriodMinDays: 60,
    incubationPeriodMaxDays: 80,
    postLayRestFemale: '15–30 days between single eggs',
    aliases: ['white-eyed crocodile skink', 'white eyed crocodile skink', 'tribolonotus novaeguineae', 'spc-wcs']
  },
  {
    code: 'SPC-JWL',
    name: 'Jewel Lizard',
    scientificName: 'Timon lepidus',
    taxonomicFamily: 'Lacertidae',
    familyCode: 'FAM-LAC',
    minAgeMonthsFemale: 18,
    minAgeMonthsMale: 12,
    minAgeTextFemale: '18 mos',
    minAgeTextMale: '12 mos',
    minWeightGramsFemale: 120,
    maxWeightGramsFemale: 180,
    minWeightGramsMale: 100,
    maxWeightGramsMale: 150,
    minWeightTextFemale: '120g',
    minWeightTextMale: '100g',
    brumationCoolingRequired: 'Yes (Winter Cooling)',
    coolingTempRange: '8°C–12°C (46–54°F)',
    coolingDuration: '60 – 90 days',
    pairingSeasonText: 'Spring (Mar–May)',
    pairingSeasonMonths: [2, 3, 4], // Mar to May
    gestationPreLayPeriod: '30–45 days post-mating',
    preLayBehavioralIndicators: 'Heavy body, active digging behavior in damp soil, sun-basking frequency increases',
    avgClutchLitterSize: '8 – 22 eggs',
    avgClutchMin: 8,
    avgClutchMax: 22,
    incubationTempTarget: '27°C–29°C',
    incubationTempMinC: 27,
    incubationTempMaxC: 29,
    incubationHumidity: '80% – 85%',
    incubationHumidityMinPercent: 80,
    incubationHumidityMaxPercent: 85,
    incubationPeriod: '50 – 70 days',
    incubationPeriodMinDays: 50,
    incubationPeriodMaxDays: 70,
    postLayRestFemale: '6–8 months (post-season)',
    aliases: ['jewel lizard', 'timon lepidus', 'spc-jwl', 'ocellated lizard', 'eyed lizard']
  }
];

export interface SpeciesClimatePreset {
  speciesName: string;
  speciesCode: string;
  scientificName: string;
  coolingRequired: string;
  coolingTempRange: string;
  coolingDuration: string;
  recommendedDayTemp: number;
  recommendedNightTemp: number;
  recommendedPhotoperiodHours: number;
  recommendedHumidity: number;
  pairingSeasonText: string;
  notes: string;
}

export const SPECIES_CLIMATE_PRESETS: Record<string, SpeciesClimatePreset> = {
  'SPC-BDR': {
    speciesName: 'Bearded Dragon',
    speciesCode: 'SPC-BDR',
    scientificName: 'Pogona vitticeps',
    coolingRequired: 'Optional / Recommended',
    coolingTempRange: '15°C–20°C (59–68°F)',
    coolingDuration: '45 – 60 days',
    recommendedDayTemp: 24,
    recommendedNightTemp: 18,
    recommendedPhotoperiodHours: 9,
    recommendedHumidity: 35,
    pairingSeasonText: 'Spring – Summer',
    notes: 'Thermostat calibrated for winter brumation cooling. Basking lamp dimmed (24°C); ambient night temp at 18°C within 15°C–20°C standard for 45–60 days.'
  },
  'SPC-LPG': {
    speciesName: 'Leopard Gecko',
    speciesCode: 'SPC-LPG',
    scientificName: 'Eublepharis macularius',
    coolingRequired: 'Optional (Cooling)',
    coolingTempRange: '18°C–20°C (65–68°F)',
    coolingDuration: '40 – 60 days',
    recommendedDayTemp: 25,
    recommendedNightTemp: 19,
    recommendedPhotoperiodHours: 10,
    recommendedHumidity: 40,
    pairingSeasonText: 'Jan – Aug',
    notes: 'Seasonal cooling cycle: night drop to 19°C (range 18°C–20°C) with 10h photoperiod for 40–60 days to stimulate follicle development.'
  },
  'SPC-BPR': {
    speciesName: 'Ball Python',
    speciesCode: 'SPC-BPR',
    scientificName: 'Python regius',
    coolingRequired: 'Optional (Night Cooling)',
    coolingTempRange: '22°C–24°C (72–75°F)',
    coolingDuration: '60 – 90 days',
    recommendedDayTemp: 29,
    recommendedNightTemp: 23,
    recommendedPhotoperiodHours: 10,
    recommendedHumidity: 55,
    pairingSeasonText: 'Oct – Mar',
    notes: 'Night cooling drop to 23°C (range 22°C–24°C) with 29°C daytime hotspot for 60–90 days initiated for Oct–Mar pairing cycle.'
  },
  'SPC-CSN': {
    speciesName: 'Corn Snake',
    speciesCode: 'SPC-CSN',
    scientificName: 'Pantherophis guttatus',
    coolingRequired: 'Yes (Winter Cooling)',
    coolingTempRange: '12°C–15°C (55–60°F)',
    coolingDuration: '60 – 75 days',
    recommendedDayTemp: 15,
    recommendedNightTemp: 13,
    recommendedPhotoperiodHours: 8,
    recommendedHumidity: 50,
    pairingSeasonText: 'Feb – May',
    notes: 'Mandatory winter brumation cooling at 13°C (range 12°C–15°C) with 8h light timer for 60–75 days prior to spring pairing.'
  },
  'SPC-CGK': {
    speciesName: 'Crested Gecko',
    speciesCode: 'SPC-CGK',
    scientificName: 'Correlophus ciliatus',
    coolingRequired: 'No (Photoperiod Shift)',
    coolingTempRange: '18°C–20°C (65–68°F)',
    coolingDuration: '30 – 60 days',
    recommendedDayTemp: 21,
    recommendedNightTemp: 19,
    recommendedPhotoperiodHours: 10,
    recommendedHumidity: 75,
    pairingSeasonText: 'Year-round (Peak: Feb–Oct)',
    notes: 'Photoperiod shift to 10h light with 19°C night rest (range 18°C–20°C) for 30–60 days to simulate seasonal rest.'
  },
  'SPC-RFT': {
    speciesName: 'Red-Foot Tortoise',
    speciesCode: 'SPC-RFT',
    scientificName: 'Chelonoidis carbonaria',
    coolingRequired: 'No (Rain Stimulation)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    recommendedDayTemp: 29,
    recommendedNightTemp: 23,
    recommendedPhotoperiodHours: 12,
    recommendedHumidity: 85,
    pairingSeasonText: 'Spring – Autumn',
    notes: 'Rain stimulation protocol: humidity elevated to 85% with daily misting cycle. No cold temperature brumation required.'
  },
  'SPC-AST': {
    speciesName: 'African Spurred Tortoise',
    speciesCode: 'SPC-AST',
    scientificName: 'Centrochelys sulcata',
    coolingRequired: 'No (Rain Stimulation)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    recommendedDayTemp: 31,
    recommendedNightTemp: 22,
    recommendedPhotoperiodHours: 12,
    recommendedHumidity: 75,
    pairingSeasonText: 'Autumn – Winter',
    notes: 'Rain simulation protocol: warm humid microclimate with moist hide box to trigger courtship. No cold brumation.'
  },
  'SPC-RES': {
    speciesName: 'Red Eared Slider',
    speciesCode: 'SPC-RES',
    scientificName: 'Trachemys scripta elegans',
    coolingRequired: 'Yes (Winter Cooling)',
    coolingTempRange: '10°C–15°C (50–59°F)',
    coolingDuration: '60 – 90 days',
    recommendedDayTemp: 15,
    recommendedNightTemp: 12,
    recommendedPhotoperiodHours: 8,
    recommendedHumidity: 80,
    pairingSeasonText: 'Spring – Summer',
    notes: 'Winter aquatic brumation cooling at 12°C (range 10°C–15°C) with 8h photoperiod for 60–90 days.'
  },
  'SPC-SGL': {
    speciesName: 'Sugar Glider',
    speciesCode: 'SPC-SGL',
    scientificName: 'Petaurus breviceps',
    coolingRequired: 'N/A (Marsupial)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    recommendedDayTemp: 24,
    recommendedNightTemp: 21,
    recommendedPhotoperiodHours: 12,
    recommendedHumidity: 50,
    pairingSeasonText: 'Year-round (Peak: Jun–Nov)',
    notes: 'Marsupial baseline: thermal stability maintained at 21°C–24°C, 12h day/night cycle. N/A for brumation cooling.'
  },
  'SPC-SPC': {
    speciesName: 'Spectacled Caiman',
    speciesCode: 'SPC-SPC',
    scientificName: 'Caiman crocodilus',
    coolingRequired: 'No (Rain Stimulation)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    recommendedDayTemp: 30,
    recommendedNightTemp: 25,
    recommendedPhotoperiodHours: 12,
    recommendedHumidity: 90,
    pairingSeasonText: 'Wet Season (May–Aug)',
    notes: 'Rain stimulation chamber: elevated humidity (90%) and rain simulator to mimic wet season (May–Aug). No cooling required.'
  },
  'SPC-GGK': {
    speciesName: 'Gargoyle Gecko',
    speciesCode: 'SPC-GGK',
    scientificName: 'Rhacodactylus auriculatus',
    coolingRequired: 'No (Photoperiod Shift)',
    coolingTempRange: '18°C–20°C (65–68°F)',
    coolingDuration: '30 – 60 days',
    recommendedDayTemp: 21,
    recommendedNightTemp: 19,
    recommendedPhotoperiodHours: 10,
    recommendedHumidity: 70,
    pairingSeasonText: 'Spring – Autumn',
    notes: 'Photoperiod shift: 10h light, night temp 19°C (range 18°C–20°C) for 30–60 days.'
  },
  'SPC-LGK': {
    speciesName: 'Leachianus Gecko',
    speciesCode: 'SPC-LGK',
    scientificName: 'Rhacodactylus leachianus',
    coolingRequired: 'Optional (Night Cooling)',
    coolingTempRange: '18°C–20°C (65–68°F)',
    coolingDuration: '45 – 60 days',
    recommendedDayTemp: 22,
    recommendedNightTemp: 19,
    recommendedPhotoperiodHours: 10,
    recommendedHumidity: 80,
    pairingSeasonText: 'Spring – Autumn',
    notes: 'Night cooling drop to 19°C (range 18°C–20°C) for 45–60 days to stimulate giant gecko breeding cycle.'
  },
  'SPC-FDR': {
    speciesName: 'Frilled Dragon',
    speciesCode: 'SPC-FDR',
    scientificName: 'Chlamydosaurus kingii',
    coolingRequired: 'Optional / Recommended',
    coolingTempRange: '18°C–22°C (65–72°F)',
    coolingDuration: '45 – 60 days',
    recommendedDayTemp: 26,
    recommendedNightTemp: 20,
    recommendedPhotoperiodHours: 10,
    recommendedHumidity: 65,
    pairingSeasonText: 'Wet Season / Spring',
    notes: 'Dry season cooling at 20°C (range 18°C–22°C) for 45–60 days, followed by misting to trigger wet season breeding.'
  },
  'SPC-RCS': {
    speciesName: 'Red-eyed Crocodile Skink',
    speciesCode: 'SPC-RCS',
    scientificName: 'Tribolonotus gracilis',
    coolingRequired: 'No (High Humidity)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    recommendedDayTemp: 24,
    recommendedNightTemp: 21,
    recommendedPhotoperiodHours: 11,
    recommendedHumidity: 90,
    pairingSeasonText: 'Year-round',
    notes: 'High humidity conditioning: 90% RH with cool ambient 21°C–24°C. No low-temperature cooling required.'
  },
  'SPC-WCS': {
    speciesName: 'White-eyed Crocodile Skink',
    speciesCode: 'SPC-WCS',
    scientificName: 'Tribolonotus novaeguineae',
    coolingRequired: 'No (High Humidity)',
    coolingTempRange: 'N/A',
    coolingDuration: 'N/A',
    recommendedDayTemp: 24,
    recommendedNightTemp: 21,
    recommendedPhotoperiodHours: 11,
    recommendedHumidity: 90,
    pairingSeasonText: 'Year-round',
    notes: 'High humidity conditioning: 90% RH with cool ambient 21°C–24°C. No low-temperature cooling required.'
  },
  'SPC-JWL': {
    speciesName: 'Jewel Lizard',
    speciesCode: 'SPC-JWL',
    scientificName: 'Timon lepidus',
    coolingRequired: 'Yes (Winter Cooling)',
    coolingTempRange: '8°C–12°C (46–54°F)',
    coolingDuration: '60 – 90 days',
    recommendedDayTemp: 12,
    recommendedNightTemp: 10,
    recommendedPhotoperiodHours: 8,
    recommendedHumidity: 50,
    pairingSeasonText: 'Spring (Mar–May)',
    notes: 'Mandatory winter brumation at 10°C (range 8°C–12°C) with 8h light timer for 60–90 days prior to spring mating.'
  }
};

export function getSpeciesClimatePreset(speciesNameOrCode: string): SpeciesClimatePreset {
  const std = findSpeciesBreedingStandard(speciesNameOrCode);
  if (std && SPECIES_CLIMATE_PRESETS[std.code]) {
    return SPECIES_CLIMATE_PRESETS[std.code];
  }
  return SPECIES_CLIMATE_PRESETS['SPC-BDR'];
}

export function detectEnclosureSpecies(
  enclosure: { id?: string; name?: string; notes?: string; climateProfile?: { targetSpecies?: string } },
  animals: Array<{ enclosureId?: string; species: string }> = []
): string {
  if (enclosure?.climateProfile?.targetSpecies) {
    return enclosure.climateProfile.targetSpecies;
  }
  if (enclosure?.id && animals.length > 0) {
    const housed = animals.find(a => a.enclosureId === enclosure.id || a.enclosureId === enclosure.name);
    if (housed && housed.species) {
      return housed.species;
    }
  }
  const text = `${enclosure?.name || ''} ${enclosure?.notes || ''} ${enclosure?.id || ''}`.toLowerCase();
  for (const std of SPECIES_BREEDING_STANDARDS) {
    if (
      text.includes(std.name.toLowerCase()) ||
      text.includes(std.code.toLowerCase()) ||
      std.aliases.some(alias => text.includes(alias.toLowerCase()))
    ) {
      return std.name;
    }
  }
  if (animals.length > 0 && enclosure?.name) {
    const housedByName = animals.find(a => a.enclosureId === enclosure.name);
    if (housedByName && housedByName.species) {
      return housedByName.species;
    }
  }
  return 'Reptile Vivarium';
}

export function isEnclosureSpeciesCompatible(
  enclosure: { id?: string; name?: string; notes?: string; type?: string; climateProfile?: { targetSpecies?: string } },
  animalSpecies: string,
  animals: Array<{ enclosureId?: string; species: string }> = []
): boolean {
  if (!enclosure || !animalSpecies) return false;
  const target = animalSpecies.toLowerCase().trim();
  const cleanTarget = target.split('(')[0].trim();

  // 1. Explicit targetSpecies in climate profile
  if (enclosure.climateProfile?.targetSpecies) {
    const encTarget = enclosure.climateProfile.targetSpecies.toLowerCase().trim().split('(')[0].trim();
    if (encTarget === cleanTarget || encTarget.includes(cleanTarget) || cleanTarget.includes(encTarget)) {
      return true;
    }
    // If it has an explicit targetSpecies of another species, it's incompatible
    return false;
  }

  // 2. Animals currently housed in this enclosure
  if (enclosure.id && animals.length > 0) {
    const housed = animals.filter(a => a.enclosureId === enclosure.id || a.enclosureId === enclosure.name);
    if (housed.length > 0) {
      // If housed animals have this target species, it's compatible
      const hasTarget = housed.some(a => {
        const hSp = (a.species || '').toLowerCase().trim().split('(')[0].trim();
        return hSp === cleanTarget || hSp.includes(cleanTarget) || cleanTarget.includes(hSp);
      });
      if (hasTarget) return true;
      // If housed animals are exclusively other species, incompatible
      return false;
    }
  }

  // 3. Match against species keywords and codes in name, id, notes, or type
  const text = `${enclosure.name || ''} ${enclosure.notes || ''} ${enclosure.id || ''} ${enclosure.type || ''}`.toLowerCase();
  
  // Direct inclusion of clean target species name
  if (text.includes(cleanTarget)) {
    return true;
  }

  const std = findSpeciesBreedingStandard(animalSpecies);
  if (std) {
    if (text.includes(std.name.toLowerCase()) || (std.code && text.includes(std.code.toLowerCase()))) {
      return true;
    }
    if (std.aliases && std.aliases.some(alias => text.includes(alias.toLowerCase()))) {
      return true;
    }
  }

  // Check known species abbreviations and key terms
  const speciesKeywordMap: Record<string, string[]> = {
    'bearded dragon': ['bd', 'bdr', 'pogona', 'bearded dragon', 'bearded', 'spc-bdr'],
    'ball python': ['bp', 'bpr', 'python regius', 'ball python', 'royal python', 'spc-bpr'],
    'crested gecko': ['cg', 'cgk', 'correlophus', 'crested gecko', 'crestie', 'spc-cgk'],
    'leopard gecko': ['lg', 'lpg', 'eublepharis', 'leopard gecko', 'spc-lpg'],
    'african spurred tortoise': ['ast', 'sulcata', 'african spurred tortoise', 'african spur', 'spc-ast'],
    'african sulcata tortoise': ['ast', 'sulcata', 'african spurred tortoise', 'african spur', 'spc-ast'],
    'red-foot tortoise': ['rft', 'red foot', 'red-foot', 'chelonoidis', 'spc-rft'],
    'red eared slider': ['res', 'slider', 'red eared slider', 'trachemys', 'spc-res'],
    'sugar glider': ['sgl', 'sugar glider', 'petaurus', 'spc-sgl'],
    'spectacled caiman': ['caiman', 'crocodilus', 'spectacled caiman', 'spc-spc'],
    'gargoyle gecko': ['ggk', 'gargoyle gecko', 'rhacodactylus auriculatus', 'spc-ggk'],
    'leachianus gecko': ['lgk', 'leachianus gecko', 'leachie', 'rhacodactylus leachianus', 'spc-lgk'],
    'frilled dragon': ['fdr', 'frilled dragon', 'chlamydosaurus', 'spc-fdr'],
    'red-eyed crocodile skink': ['rcs', 'red-eyed crocodile skink', 'tribolonotus gracilis', 'spc-rcs'],
    'white-eyed crocodile skink': ['wcs', 'white-eyed crocodile skink', 'tribolonotus novaeguineae', 'spc-wcs'],
    'jewel lizard': ['jwl', 'jewel lizard', 'timon lepidus', 'spc-jwl'],
    'corn snake': ['csn', 'corn snake', 'pantherophis', 'spc-csn'],
    'green iguana': ['igu', 'iguana', 'green iguana', 'spc-igu']
  };

  const matchesKeyword = (kw: string) => {
    if (kw.length <= 3) {
      const regex = new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`, 'i');
      return regex.test(text);
    }
    return text.includes(kw);
  };

  const currentKeywords = speciesKeywordMap[cleanTarget];
  if (currentKeywords) {
    for (const kw of currentKeywords) {
      if (matchesKeyword(kw)) {
        return true;
      }
    }
  }

  // 4. Negative check: Check if enclosure explicitly matches another specific species
  for (const otherStd of SPECIES_BREEDING_STANDARDS) {
    const otherName = otherStd.name.toLowerCase();
    if (otherName !== cleanTarget) {
      if (text.includes(otherName) || (otherStd.code && text.includes(otherStd.code.toLowerCase()))) {
        return false; // Specifically designated for another species
      }
      const otherKws = speciesKeywordMap[otherName];
      if (otherKws && otherKws.some(kw => matchesKeyword(kw))) {
        return false;
      }
    }
  }

  // If the enclosure has no specific species designation and no conflicting species, allow as generic
  return true;
}

export function getEnclosuresForSpecies<T extends { id?: string; name?: string; notes?: string; type?: string; climateProfile?: any }>(
  enclosures: T[],
  species: string,
  animals: Array<{ id?: string; species: string; enclosureId?: string }> = []
): T[] {
  if (!species || !enclosures || enclosures.length === 0) return enclosures || [];
  const cleanSpecies = species.split('(')[0].trim();
  if (!cleanSpecies) return enclosures;

  return enclosures.filter(enc => isEnclosureSpeciesCompatible(enc, cleanSpecies, animals));
}

export interface EnclosureResolution<T = any> {
  enclosure: T | null;
  isDirectMatch: boolean;
  isSpeciesMatched: boolean;
  hasSpeciesMismatch: boolean;
  originalMismatchedName?: string;
  originalMismatchedSpecies?: string;
  suggestedEnclosure?: T | null;
}

export function resolveAnimalEnclosure<T extends { id: string; name: string; notes?: string; climateProfile?: any }>(
  animal: { id: string; species: string; name?: string; enclosureId?: string },
  enclosures: T[],
  animals: Array<{ id: string; species: string; enclosureId?: string }> = []
): EnclosureResolution<T> {
  if (!animal || !enclosures || enclosures.length === 0) {
    return {
      enclosure: null,
      isDirectMatch: false,
      isSpeciesMatched: false,
      hasSpeciesMismatch: false
    };
  }

  const animalSpecies = (animal.species || '').trim();

  // Find dedicated enclosure specifically matching this species
  const dedicatedSpeciesEnclosure = enclosures.find(e =>
    isEnclosureSpeciesCompatible(e, animalSpecies, animals) &&
    (e.name.toLowerCase().includes(animalSpecies.toLowerCase()) ||
     (e.climateProfile?.targetSpecies && e.climateProfile.targetSpecies.toLowerCase() === animalSpecies.toLowerCase()))
  ) || enclosures.find(e => isEnclosureSpeciesCompatible(e, animalSpecies, animals));

  // 1. Check if assigned enclosure exists
  const assignedEnc = enclosures.find(
    e => (animal.enclosureId && (e.id === animal.enclosureId || e.name === animal.enclosureId))
  );

  if (assignedEnc) {
    const isCompatible = isEnclosureSpeciesCompatible(assignedEnc, animalSpecies, animals);
    if (isCompatible) {
      return {
        enclosure: assignedEnc,
        isDirectMatch: true,
        isSpeciesMatched: true,
        hasSpeciesMismatch: false,
        suggestedEnclosure: assignedEnc
      };
    }

    // Species Mismatch detected! E.g. Bearded Dragon was linked to Corn Snake Enclosure
    const detectedOtherSpecies = detectEnclosureSpecies(assignedEnc, animals);
    return {
      enclosure: dedicatedSpeciesEnclosure || assignedEnc,
      isDirectMatch: false,
      isSpeciesMatched: !!dedicatedSpeciesEnclosure,
      hasSpeciesMismatch: true,
      originalMismatchedName: assignedEnc.name,
      originalMismatchedSpecies: detectedOtherSpecies,
      suggestedEnclosure: dedicatedSpeciesEnclosure || null
    };
  }

  // 2. Animal has no assigned enclosure or enclosureId was not found in enclosures
  if (dedicatedSpeciesEnclosure) {
    return {
      enclosure: dedicatedSpeciesEnclosure,
      isDirectMatch: false,
      isSpeciesMatched: true,
      hasSpeciesMismatch: false,
      suggestedEnclosure: dedicatedSpeciesEnclosure
    };
  }

  // 3. Fallback to first available enclosure
  return {
    enclosure: enclosures[0],
    isDirectMatch: false,
    isSpeciesMatched: false,
    hasSpeciesMismatch: false,
    suggestedEnclosure: null
  };
}

// Helper to lookup standard by species name, code, or scientific name
export function findSpeciesBreedingStandard(speciesName: string): SpeciesBreedingStandard | null {
  if (!speciesName) return null;
  const clean = speciesName.toLowerCase().trim();
  
  // Exact match or contains in name / scientificName / code / aliases
  for (const std of SPECIES_BREEDING_STANDARDS) {
    if (
      clean === std.name.toLowerCase() ||
      clean === std.scientificName.toLowerCase() ||
      clean === std.code.toLowerCase() ||
      std.aliases.some(alias => clean.includes(alias) || alias.includes(clean)) ||
      clean.includes(std.name.toLowerCase()) ||
      clean.includes(std.scientificName.toLowerCase())
    ) {
      return std;
    }
  }
  return null;
}

export interface WeightEvaluationResult {
  status: 'underweight' | 'optimal' | 'above_standard' | 'extreme_excess';
  isQualified: boolean;
  message: string;
  badgeLabel: string;
  badgeColorClass: string;
  minWeight: number;
  maxWeight: number;
  targetRangeText: string;
}

export function evaluateWeightCondition(
  speciesOrStd: string | SpeciesBreedingStandard | null | undefined,
  sex: 'Male' | 'Female' | string,
  weightGrams: number | string
): WeightEvaluationResult {
  const std = typeof speciesOrStd === 'string' ? findSpeciesBreedingStandard(speciesOrStd) : (speciesOrStd || null);
  const isFemale = (sex || '').toLowerCase().startsWith('f');
  const numWeight = typeof weightGrams === 'number' ? weightGrams : parseFloat(String(weightGrams || '0')) || 0;

  if (!std) {
    return {
      status: numWeight >= 100 ? 'optimal' : 'underweight',
      isQualified: numWeight >= 100,
      message: `Current weight: ${numWeight}g`,
      badgeLabel: 'General Specimen Weight',
      badgeColorClass: 'text-slate-400',
      minWeight: 100,
      maxWeight: 1000,
      targetRangeText: 'General'
    };
  }

  const min = isFemale ? std.minWeightGramsFemale : std.minWeightGramsMale;
  const max = isFemale ? (std.maxWeightGramsFemale || std.minWeightGramsFemale * 1.25) : (std.maxWeightGramsMale || std.minWeightGramsMale * 1.25);
  const targetText = isFemale ? std.minWeightTextFemale : std.minWeightTextMale;

  if (numWeight < min) {
    const deficit = Math.round(min - numWeight);
    return {
      status: 'underweight',
      isQualified: false,
      message: `Below min breeding weight (${numWeight}g vs Target: ${targetText} — needs +${deficit}g)`,
      badgeLabel: 'Underweight / Developing',
      badgeColorClass: 'text-amber-500 dark:text-amber-400',
      minWeight: min,
      maxWeight: max,
      targetRangeText: targetText
    };
  }

  if (numWeight >= min && numWeight <= max) {
    return {
      status: 'optimal',
      isQualified: true,
      message: `Optimal breeding weight (${numWeight}g within target ${targetText})`,
      badgeLabel: 'Optimal Breeding Weight Range',
      badgeColorClass: 'text-emerald-500 dark:text-emerald-400',
      minWeight: min,
      maxWeight: max,
      targetRangeText: targetText
    };
  }

  // Weight is greater than standard maximum
  const excessRatio = numWeight / max;
  if (excessRatio > 1.35) {
    return {
      status: 'extreme_excess',
      isQualified: true,
      message: `Exceeds standard weight window (${numWeight}g vs Target: ${targetText} — heavy adult/check obesity)`,
      badgeLabel: 'Exceeds Standard (Heavy Adult / Overweight)',
      badgeColorClass: 'text-orange-500 dark:text-orange-400',
      minWeight: min,
      maxWeight: max,
      targetRangeText: targetText
    };
  }

  return {
    status: 'above_standard',
    isQualified: true,
    message: `Qualified mature weight (${numWeight}g • Standard: ${targetText})`,
    badgeLabel: 'Meets Standard (Mature Adult)',
    badgeColorClass: 'text-emerald-500 dark:text-emerald-400',
    minWeight: min,
    maxWeight: max,
    targetRangeText: targetText
  };
}

export interface AnimalBreedingEvaluation {
  standard: SpeciesBreedingStandard | null;
  ageMonths: number;
  minAgeRequiredMonths: number;
  agePassed: boolean;
  ageText: string;
  minWeightRequiredGrams: number;
  weightPassed: boolean;
  weightText: string;
  seasonPassed: boolean;
  seasonText: string;
  healthPassed: boolean;
  healthStatus: string;
  vetCertified: boolean;
  cooldownPassed: boolean;
  cooldownText: string;
  overallReady: boolean;
  isReady?: boolean;
  scorePercentage: number;
  failureReasons: string[];
  warnings: string[];
  recommendations: string[];
}

export function evaluateAnimalBreedingReadiness(
  animal: any,
  medicalRecords: any[] = [],
  breedingRecords: any[] = [],
  enclosureClimateApproved: boolean = false
): AnimalBreedingEvaluation {
  const std = findSpeciesBreedingStandard(animal.species || '');
  const isFemale = (animal.sex || '').toLowerCase().startsWith('f');
  
  // 1. Age calculation
  let ageMonths = 0;
  if (animal.dob) {
    const ageResult = calculatePreciseAge(animal.dob, getEffectiveSystemDate());
    if (ageResult && !ageResult.isFuture) {
      ageMonths = ageResult.totalMonths;
    }
  } else if (animal.age) {
    const num = parseFloat(animal.age);
    if (!isNaN(num)) {
      if (animal.age.toLowerCase().includes('yr') || animal.age.toLowerCase().includes('year')) {
        ageMonths = Math.round(num * 12);
      } else {
        ageMonths = Math.round(num);
      }
    }
  }

  const minAgeRequired = std 
    ? (isFemale ? std.minAgeMonthsFemale : std.minAgeMonthsMale)
    : 18;
  const agePassed = ageMonths >= minAgeRequired;
  const ageTargetText = std 
    ? (isFemale ? std.minAgeTextFemale : std.minAgeTextMale)
    : `${minAgeRequired} mos`;

  // 2. Weight evaluation
  const currentWeight = typeof animal.weight === 'number' ? animal.weight : parseFloat(animal.weight || '0') || 0;
  const minWeightRequired = std 
    ? (isFemale ? std.minWeightGramsFemale : std.minWeightGramsMale)
    : (isFemale ? 1000 : 500);
  const weightPassed = currentWeight >= minWeightRequired;
  const weightTargetText = std
    ? (isFemale ? std.minWeightTextFemale : std.minWeightTextMale)
    : `>= ${minWeightRequired}g`;

  // 3. Season evaluation
  const currentMonth = new Date().getMonth();
  const naturalSeasonPassed = std
    ? std.pairingSeasonMonths.includes(currentMonth)
    : (currentMonth >= 2 && currentMonth <= 8);
  const seasonPassed = naturalSeasonPassed || enclosureClimateApproved;
  const seasonText = enclosureClimateApproved
    ? 'Simulated Climate (Approved)'
    : (std ? std.pairingSeasonText : 'Mar – Aug');

  // 4. Health evaluation
  const medRecordsForAnimal = medicalRecords.filter(m => m.animalId === animal.id);
  const isHealthy = animal.healthStatus === 'Healthy' || (!animal.healthStatus && animal.status === 'Healthy');
  const healthPassed = isHealthy && !animal.medicalFlags?.length;
  const vetCertified = animal.breedingStatus === 'Ready for Pairing' || medRecordsForAnimal.some(m => m.diagnosis === 'Healthy' || m.treatment?.toLowerCase().includes('cleared'));

  // 5. Cooldown evaluation (from last breeding/lay)
  const lastBreeding = breedingRecords
    .filter(b => (b.femaleId === animal.id || b.maleId === animal.id) && b.status === 'SUCCESSFUL')
    .sort((a, b) => new Date(b.breedingDate).getTime() - new Date(a.breedingDate).getTime())[0];
  
  let cooldownPassed = true;
  let cooldownText = 'Ready (No recent fatigue)';
  if (lastBreeding && isFemale) {
    const daysSince = Math.floor((Date.now() - new Date(lastBreeding.breedingDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < 90) {
      cooldownPassed = false;
      cooldownText = `Resting (${daysSince} days since last cycle. Needs ${std?.postLayRestFemale || '3-6 mos'})`;
    }
  }

  // 6. Reasons & Warnings
  const failureReasons: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (!agePassed) {
    failureReasons.push(`Age Deficit: Animal is ${ageMonths} mos old (Required for ${isFemale ? 'Female' : 'Male'}: ${ageTargetText})`);
  }
  if (!weightPassed) {
    failureReasons.push(`Underweight: Current weight ${currentWeight}g is below species target (${weightTargetText})`);
  }
  if (!seasonPassed) {
    warnings.push(`Off-Peak Season: Current month is outside typical captive pairing window (${seasonText})`);
  }
  if (!healthPassed) {
    failureReasons.push(`Health Hold: Animal has active health status "${animal.healthStatus || 'Unassessed'}"`);
  }
  if (!cooldownPassed) {
    failureReasons.push(`Post-Lay Rest: Female is still in recovery period (${cooldownText})`);
  }

  if (std && std.brumationCoolingRequired !== 'N/A' && !std.brumationCoolingRequired.startsWith('No')) {
    recommendations.push(`Pre-breeding Prep: ${std.brumationCoolingRequired} at ${std.coolingTempRange} for ${std.coolingDuration}`);
  }

  const overallReady = agePassed && weightPassed && healthPassed && cooldownPassed;

  // Calculate score percentage
  let passedCount = 0;
  if (agePassed) passedCount++;
  if (weightPassed) passedCount++;
  if (healthPassed) passedCount++;
  if (seasonPassed) passedCount++;
  if (cooldownPassed) passedCount++;
  const scorePercentage = Math.round((passedCount / 5) * 100);

  return {
    standard: std,
    ageMonths,
    minAgeRequiredMonths: minAgeRequired,
    agePassed,
    ageText: `${ageMonths} mos (Min: ${ageTargetText})`,
    minWeightRequiredGrams: minWeightRequired,
    weightPassed,
    weightText: `${currentWeight}g (Min: ${weightTargetText})`,
    seasonPassed,
    seasonText,
    healthPassed,
    healthStatus: animal.healthStatus || 'Unassessed',
    vetCertified,
    cooldownPassed,
    cooldownText,
    overallReady,
    isReady: overallReady,
    scorePercentage,
    failureReasons,
    warnings,
    recommendations
  };
}

export interface PairEvaluationResult {
  femaleAnimal: any;
  maleAnimal: any;
  femaleEval: AnimalBreedingEvaluation;
  maleEval: AnimalBreedingEvaluation;
  standard: SpeciesBreedingStandard | null;
  speciesMatch: boolean;
  sexValid: boolean;
  bothQualified: boolean;
  compatibilityScore: number;
  overallStatus: 'QUALIFIED' | 'CONDITIONAL' | 'DISQUALIFIED';
  statusBadgeColor: string;
  summaryNote: string;
  clutchExpectations: {
    avgClutchSize: string;
    gestationPreLay: string;
    incubationTemp: string;
    incubationHumidity: string;
    incubationPeriod: string;
    postLayRest: string;
  };
}

export function evaluateBreedingPair(
  femaleAnimal: any,
  maleAnimal: any,
  medicalRecords: any[] = [],
  breedingRecords: any[] = [],
  enclosureClimateApproved: boolean = false
): PairEvaluationResult {
  const femaleEval = evaluateAnimalBreedingReadiness(femaleAnimal, medicalRecords, breedingRecords, enclosureClimateApproved);
  const maleEval = evaluateAnimalBreedingReadiness(maleAnimal, medicalRecords, breedingRecords, enclosureClimateApproved);
  
  const standard = femaleEval.standard || maleEval.standard;
  const speciesMatch = (femaleAnimal?.species || '').toLowerCase().trim() === (maleAnimal?.species || '').toLowerCase().trim();
  
  const fSex = (femaleAnimal?.sex || '').toLowerCase();
  const mSex = (maleAnimal?.sex || '').toLowerCase();
  const sexValid = (fSex.startsWith('f') && mSex.startsWith('m')) || (fSex.startsWith('m') && mSex.startsWith('f'));

  const bothQualified = speciesMatch && sexValid && femaleEval.overallReady && maleEval.overallReady;
  
  // Combined score
  const avgScore = Math.round((femaleEval.scorePercentage + maleEval.scorePercentage) / 2);
  let overallStatus: 'QUALIFIED' | 'CONDITIONAL' | 'DISQUALIFIED' = 'DISQUALIFIED';
  let statusBadgeColor = 'bg-red-100 text-red-800 border-red-200';
  let summaryNote = '';

  if (!speciesMatch) {
    overallStatus = 'DISQUALIFIED';
    summaryNote = 'Species mismatch! Hybrid or mismatched pairing is prohibited.';
  } else if (!sexValid) {
    overallStatus = 'DISQUALIFIED';
    summaryNote = 'Invalid sexes. Pair must consist of 1 Female and 1 Male.';
  } else if (bothQualified) {
    overallStatus = 'QUALIFIED';
    statusBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    summaryNote = 'Both animals meet all physical, age, health, and weight benchmarks. Ready for pairing introduction.';
  } else if ((femaleEval.agePassed && femaleEval.weightPassed) || (maleEval.agePassed && maleEval.weightPassed)) {
    overallStatus = 'CONDITIONAL';
    statusBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
    summaryNote = 'One or more criteria require attention before introducing the pair.';
  } else {
    overallStatus = 'DISQUALIFIED';
    summaryNote = 'Pair does not satisfy fundamental breeding prerequisites (Age/Weight/Health deficit).';
  }

  return {
    femaleAnimal,
    maleAnimal,
    femaleEval,
    maleEval,
    standard,
    speciesMatch,
    sexValid,
    bothQualified,
    compatibilityScore: speciesMatch && sexValid ? avgScore : 0,
    overallStatus,
    statusBadgeColor,
    summaryNote,
    clutchExpectations: {
      avgClutchSize: standard?.avgClutchLitterSize || 'Species baseline not set',
      gestationPreLay: standard?.gestationPreLayPeriod || '30–45 days',
      incubationTemp: standard?.incubationTempTarget || '28°C–31°C (82–88°F)',
      incubationHumidity: standard?.incubationHumidity || '80%–90%',
      incubationPeriod: standard?.incubationPeriod || '50–70 days',
      postLayRest: standard?.postLayRestFemale || '4–6 months'
    }
  };
}

/**
 * Extracts the maximum animal capacity limit of an enclosure as an integer.
 * Handles formats like "1", "2", "1 / 1", "2 Animals", etc.
 */
export function getEnclosureCapacityLimit(enc: { capacity?: string | number } | null | undefined): number {
  if (!enc || enc.capacity === undefined || enc.capacity === null) return 1;
  if (typeof enc.capacity === 'number') return Math.max(1, enc.capacity);
  const match = String(enc.capacity).match(/(\d+)/g);
  if (match && match.length > 0) {
    const maxVal = parseInt(match[match.length - 1], 10);
    return isNaN(maxVal) || maxVal < 1 ? 1 : maxVal;
  }
  return 1;
}

/**
 * Returns active animal occupants assigned to an enclosure.
 */
export function getEnclosureOccupants<T extends { id: string; enclosureId?: string; isArchived?: boolean; healthStatus?: string }>(
  enc: { id: string; name?: string } | null | undefined,
  animals: T[] = [],
  excludeAnimalId?: string
): T[] {
  if (!enc || !enc.id || !animals || animals.length === 0) return [];
  return animals.filter(a =>
    !a.isArchived &&
    a.healthStatus !== 'Deceased' &&
    (a.enclosureId === enc.id || (enc.name && a.enclosureId === enc.name)) &&
    (!excludeAnimalId || a.id !== excludeAnimalId)
  );
}

/**
 * Checks if an enclosure has reached or exceeded its animal capacity limit.
 */
export function isEnclosureAtCapacity<T extends { id: string; enclosureId?: string; isArchived?: boolean; healthStatus?: string }>(
  enc: { id: string; name?: string; capacity?: string | number } | null | undefined,
  animals: T[] = [],
  excludeAnimalId?: string
): boolean {
  if (!enc) return false;
  const maxCap = getEnclosureCapacityLimit(enc);
  const currentOccupants = getEnclosureOccupants(enc, animals, excludeAnimalId);
  return currentOccupants.length >= maxCap;
}

export interface EnclosureClimateQualification {
  isQualified: boolean;
  actualTemp: number | null;
  minTargetTemp: number | null;
  maxTargetTemp: number | null;
  targetRangeString: string;
  reason: string;
  status: 'PASSED' | 'FAILED' | 'UNSET';
}

/**
 * Validates whether an enclosure's recorded climate temperature meets the target cooling/breeding requirements
 * for a given reptile species.
 */
export function evaluateEnclosureClimateQualification(
  enclosure: { id?: string; name?: string; temperature?: string; climateProfile?: any } | null | undefined,
  species: string
): EnclosureClimateQualification {
  if (!enclosure) {
    return {
      isQualified: false,
      actualTemp: null,
      minTargetTemp: null,
      maxTargetTemp: null,
      targetRangeString: 'N/A',
      reason: 'No enclosure selected.',
      status: 'UNSET'
    };
  }

  const speciesStd = findSpeciesBreedingStandard(species);
  const rawRange = enclosure.climateProfile?.coolingTempRange || speciesStd?.coolingTempRange || '';
  const isNa = !rawRange || rawRange.toUpperCase().includes('N/A');

  // Extract actual temperature from enclosure
  const tempStr = enclosure.temperature || (enclosure.climateProfile?.dayTemp ? `${enclosure.climateProfile.dayTemp}°C` : '');
  const tempMatch = tempStr.match(/(\d+(?:\.\d+)?)/);
  const actualTemp = tempMatch ? parseFloat(tempMatch[1]) : null;

  // If species standard does not require specialized brumation cooling
  if (isNa) {
    if (enclosure.climateProfile?.status === 'Approved') {
      return {
        isQualified: true,
        actualTemp: actualTemp ?? (enclosure.climateProfile.dayTemp || 26),
        minTargetTemp: 22,
        maxTargetTemp: 32,
        targetRangeString: 'Standard Ambient (Year-round tropical)',
        reason: 'Climate profile approved and verified.',
        status: 'PASSED'
      };
    }
    const isTempPresent = actualTemp !== null && !isNaN(actualTemp);
    const inAmbientRange = isTempPresent && actualTemp >= 20 && actualTemp <= 32;
    return {
      isQualified: inAmbientRange,
      actualTemp,
      minTargetTemp: 20,
      maxTargetTemp: 32,
      targetRangeString: '20°C–32°C (Standard Ambient)',
      reason: inAmbientRange
        ? `Ambient temperature ${actualTemp}°C is stable for non-brumating species.`
        : (isTempPresent ? `Temperature ${actualTemp}°C is outside standard range.` : 'No live temperature recorded.'),
      status: inAmbientRange ? 'PASSED' : (isTempPresent ? 'FAILED' : 'UNSET')
    };
  }

  // Parse target min/max bounds from string like "15°C–20°C (59–68°F)", "Cooling: 20°C - 22°C", etc.
  const rangeMatch = rawRange.match(/(\d+(?:\.\d+)?)\s*°?C?\s*[-–~]\s*(\d+(?:\.\d+)?)\s*°?C?/i) ||
                     rawRange.match(/(\d+(?:\.\d+)?)\s*[-–~]\s*(\d+(?:\.\d+)?)/);

  let minTarget: number | null = null;
  let maxTarget: number | null = null;
  if (rangeMatch) {
    minTarget = parseFloat(rangeMatch[1]);
    maxTarget = parseFloat(rangeMatch[2]);
  }

  if (actualTemp === null || isNaN(actualTemp)) {
    return {
      isQualified: false,
      actualTemp: null,
      minTargetTemp: minTarget,
      maxTargetTemp: maxTarget,
      targetRangeString: rawRange,
      reason: 'No live temperature reading recorded for this enclosure.',
      status: 'UNSET'
    };
  }

  // Check if admin approved climate profile exists with valid status
  if (enclosure.climateProfile?.status === 'Approved') {
    return {
      isQualified: true,
      actualTemp,
      minTargetTemp: minTarget,
      maxTargetTemp: maxTarget,
      targetRangeString: rawRange,
      reason: `Climate temperature verified and approved (${actualTemp}°C).`,
      status: 'PASSED'
    };
  }

  if (minTarget !== null && maxTarget !== null) {
    const isPassed = actualTemp >= minTarget && actualTemp <= maxTarget;
    return {
      isQualified: isPassed,
      actualTemp,
      minTargetTemp: minTarget,
      maxTargetTemp: maxTarget,
      targetRangeString: rawRange,
      reason: isPassed
        ? `Temperature ${actualTemp}°C PASSED (Within ${minTarget}°C–${maxTarget}°C target requirement).`
        : `Temperature ${actualTemp}°C FAILED (Outside ${minTarget}°C–${maxTarget}°C target requirement).`,
      status: isPassed ? 'PASSED' : 'FAILED'
    };
  }

  return {
    isQualified: true,
    actualTemp,
    minTargetTemp: null,
    maxTargetTemp: null,
    targetRangeString: rawRange,
    reason: `Temperature recorded at ${actualTemp}°C.`,
    status: 'PASSED'
  };
}

/**
 * Returns boolean indicating if the enclosure has a PASSED climate temperature for the target species.
 */
export function isEnclosureQualifiedForBreedingClimate(
  enclosure: { id?: string; name?: string; temperature?: string; climateProfile?: any } | null | undefined,
  species: string
): boolean {
  return evaluateEnclosureClimateQualification(enclosure, species).isQualified;
}


