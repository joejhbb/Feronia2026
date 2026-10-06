import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Camera, Building2, Award, Info, AlertTriangle, CheckCircle2, Trash2, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Animal, Enclosure, Task } from '../../types';
import { findSpeciesBreedingStandard, SPECIES_BREEDING_STANDARDS, evaluateWeightCondition, isEnclosureSpeciesCompatible, isEnclosureAtCapacity, getEnclosureOccupants, getEnclosureCapacityLimit } from '../../utils/breedingStandards';
import { getCroppedImg } from '../../utils/cropImage';
import { calculatePreciseAge, getEffectiveSystemDate, getFormattedDateWithDay } from '../../utils/timeUtils';

interface AddAnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (animal: Animal) => void;
  existingAnimals?: Animal[];
  enclosures?: Enclosure[];
  tasks?: Task[];
  systemDate?: string;
}

export const SPECIES_CODE_MAP: Record<string, string> = {
  'Bearded Dragon': 'BDR',
  'Leopard Gecko': 'LPG',
  'Ball Python': 'BPR',
  'Corn Snake': 'CSN',
  'Crested Gecko': 'CGK',
  'Red-Foot Tortoise': 'RFT',
  'African Spurred Tortoise': 'AST',
  'Red Eared Slider': 'RES',
  'Sugar Glider': 'SGL',
  'Spectacled Caiman': 'SPC',
  'Gargoyle Gecko': 'GGK',
  'Leachianus Gecko': 'LGK',
  'Frilled Dragon': 'FDR',
  'Red-eyed Crocodile Skink': 'RCS',
  'White-eyed Crocodile Skink': 'WCS',
  'Jewel Lizard': 'JWL',
  'Green Iguana': 'IGU',
};

export const SPECIES_PRESETS: Record<string, {
  speciesCode: string;
  scientificName: string;
  taxonomicFamily: string;
  familyCode: string;
  image: string;
  defaultWeight: number;
  defaultLength: number;
  defaultMorph: string;
  minBreedingWeight: number;
  minBreedingWeightFemale: number;
  minBreedingWeightMale: number;
  minBreedingAgeFemale: string;
  minBreedingAgeMale: string;
}> = {
  'Bearded Dragon': {
    speciesCode: 'SPC-BDR',
    scientificName: 'Pogona vitticeps',
    taxonomicFamily: 'Agamidae',
    familyCode: 'FAM-AGA',
    image: '',
    defaultWeight: 380,
    defaultLength: 45,
    defaultMorph: 'Citrus Leatherback',
    minBreedingWeight: 350,
    minBreedingWeightFemale: 350,
    minBreedingWeightMale: 300,
    minBreedingAgeFemale: '18–24 mos',
    minBreedingAgeMale: '12–18 mos',
  },
  'Leopard Gecko': {
    speciesCode: 'SPC-LPG',
    scientificName: 'Eublepharis macularius',
    taxonomicFamily: 'Eublepharidae',
    familyCode: 'FAM-EUB',
    image: '',
    defaultWeight: 58,
    defaultLength: 22,
    defaultMorph: 'High Yellow',
    minBreedingWeight: 50,
    minBreedingWeightFemale: 50,
    minBreedingWeightMale: 45,
    minBreedingAgeFemale: '18–24 mos',
    minBreedingAgeMale: '12–15 mos',
  },
  'Ball Python': {
    speciesCode: 'SPC-BPR',
    scientificName: 'Python regius',
    taxonomicFamily: 'Pythonidae',
    familyCode: 'FAM-PYT',
    image: '',
    defaultWeight: 1350,
    defaultLength: 115,
    defaultMorph: 'Pastel',
    minBreedingWeight: 1200,
    minBreedingWeightFemale: 1200,
    minBreedingWeightMale: 700,
    minBreedingAgeFemale: '24–36 mos',
    minBreedingAgeMale: '12–18 mos',
  },
  'Corn Snake': {
    speciesCode: 'SPC-CSN',
    scientificName: 'Pantherophis guttatus',
    taxonomicFamily: 'Colubridae',
    familyCode: 'FAM-COL',
    image: '',
    defaultWeight: 320,
    defaultLength: 125,
    defaultMorph: 'Anerythristic',
    minBreedingWeight: 300,
    minBreedingWeightFemale: 300,
    minBreedingWeightMale: 200,
    minBreedingAgeFemale: '18–24 mos',
    minBreedingAgeMale: '12–18 mos',
  },
  'Crested Gecko': {
    speciesCode: 'SPC-CGK',
    scientificName: 'Correlophus ciliatus',
    taxonomicFamily: 'Diplodactylidae',
    familyCode: 'FAM-DIP',
    image: '',
    defaultWeight: 45,
    defaultLength: 20,
    defaultMorph: 'Harlequin',
    minBreedingWeight: 45,
    minBreedingWeightFemale: 45,
    minBreedingWeightMale: 35,
    minBreedingAgeFemale: '18–24 mos',
    minBreedingAgeMale: '12–15 mos',
  },
  'Red-Foot Tortoise': {
    speciesCode: 'SPC-RFT',
    scientificName: 'Chelonoidis carbonaria',
    taxonomicFamily: 'Testudinidae',
    familyCode: 'FAM-TES',
    image: '',
    defaultWeight: 3800,
    defaultLength: 35,
    defaultMorph: 'Cherry Head',
    minBreedingWeight: 3500,
    minBreedingWeightFemale: 3500,
    minBreedingWeightMale: 3000,
    minBreedingAgeFemale: '5–8 yrs',
    minBreedingAgeMale: '4–6 yrs',
  },
  'African Spurred Tortoise': {
    speciesCode: 'SPC-AST',
    scientificName: 'Centrochelys sulcata',
    taxonomicFamily: 'Testudinidae',
    familyCode: 'FAM-TES',
    image: '',
    defaultWeight: 16500,
    defaultLength: 55,
    defaultMorph: 'Classic Sulcata',
    minBreedingWeight: 15000,
    minBreedingWeightFemale: 15000,
    minBreedingWeightMale: 15000,
    minBreedingAgeFemale: '5–8 yrs',
    minBreedingAgeMale: '4–6 yrs',
  },
  'Red Eared Slider': {
    speciesCode: 'SPC-RES',
    scientificName: 'Trachemys scripta elegans',
    taxonomicFamily: 'Emydidae',
    familyCode: 'FAM-EMY',
    image: '',
    defaultWeight: 650,
    defaultLength: 22,
    defaultMorph: 'Standard Pond',
    minBreedingWeight: 500,
    minBreedingWeightFemale: 500,
    minBreedingWeightMale: 350,
    minBreedingAgeFemale: '4–5 yrs',
    minBreedingAgeMale: '2–3 yrs',
  },
  'Sugar Glider': {
    speciesCode: 'SPC-SGL',
    scientificName: 'Petaurus breviceps',
    taxonomicFamily: 'Petauridae',
    familyCode: 'FAM-PET',
    image: '',
    defaultWeight: 110,
    defaultLength: 17,
    defaultMorph: 'Classic Grey',
    minBreedingWeight: 80,
    minBreedingWeightFemale: 80,
    minBreedingWeightMale: 100,
    minBreedingAgeFemale: '8–12 mos',
    minBreedingAgeMale: '12–15 mos',
  },
  'Spectacled Caiman': {
    speciesCode: 'SPC-SPC',
    scientificName: 'Caiman crocodilus',
    taxonomicFamily: 'Alligatoridae',
    familyCode: 'FAM-ALL',
    image: '',
    defaultWeight: 9500,
    defaultLength: 120,
    defaultMorph: 'Wild Type',
    minBreedingWeight: 8000,
    minBreedingWeightFemale: 8000,
    minBreedingWeightMale: 10000,
    minBreedingAgeFemale: '4–7 yrs',
    minBreedingAgeMale: '4–6 yrs',
  },
  'Gargoyle Gecko': {
    speciesCode: 'SPC-GGK',
    scientificName: 'Rhacodactylus auriculatus',
    taxonomicFamily: 'Diplodactylidae',
    familyCode: 'FAM-DIP',
    image: '',
    defaultWeight: 48,
    defaultLength: 20,
    defaultMorph: 'Red Stripe',
    minBreedingWeight: 45,
    minBreedingWeightFemale: 45,
    minBreedingWeightMale: 40,
    minBreedingAgeFemale: '18–24 mos',
    minBreedingAgeMale: '12–18 mos',
  },
  'Leachianus Gecko': {
    speciesCode: 'SPC-LGK',
    scientificName: 'Rhacodactylus leachianus',
    taxonomicFamily: 'Diplodactylidae',
    familyCode: 'FAM-DIP',
    image: '',
    defaultWeight: 220,
    defaultLength: 32,
    defaultMorph: 'Type A (Grande Terre)',
    minBreedingWeight: 200,
    minBreedingWeightFemale: 200,
    minBreedingWeightMale: 180,
    minBreedingAgeFemale: '3–4 yrs',
    minBreedingAgeMale: '2.5–3.5 yrs',
  },
  'Frilled Dragon': {
    speciesCode: 'SPC-FDR',
    scientificName: 'Chlamydosaurus kingii',
    taxonomicFamily: 'Agamidae',
    familyCode: 'FAM-AGA',
    image: '',
    defaultWeight: 210,
    defaultLength: 60,
    defaultMorph: 'Australian Red/Orange',
    minBreedingWeight: 200,
    minBreedingWeightFemale: 200,
    minBreedingWeightMale: 180,
    minBreedingAgeFemale: '18–24 mos',
    minBreedingAgeMale: '12–18 mos',
  },
  'Red-eyed Crocodile Skink': {
    speciesCode: 'SPC-RCS',
    scientificName: 'Tribolonotus gracilis',
    taxonomicFamily: 'Scincidae',
    familyCode: 'FAM-SCI',
    image: '',
    defaultWeight: 42,
    defaultLength: 18,
    defaultMorph: 'Classic Orange Orbital',
    minBreedingWeight: 38,
    minBreedingWeightFemale: 38,
    minBreedingWeightMale: 35,
    minBreedingAgeFemale: '18–24 mos',
    minBreedingAgeMale: '12–18 mos',
  },
  'White-eyed Crocodile Skink': {
    speciesCode: 'SPC-WCS',
    scientificName: 'Tribolonotus novaeguineae',
    taxonomicFamily: 'Scincidae',
    familyCode: 'FAM-SCI',
    image: '',
    defaultWeight: 42,
    defaultLength: 18,
    defaultMorph: 'Standard White Orbital',
    minBreedingWeight: 38,
    minBreedingWeightFemale: 38,
    minBreedingWeightMale: 35,
    minBreedingAgeFemale: '18–24 mos',
    minBreedingAgeMale: '12–18 mos',
  },
  'Jewel Lizard': {
    speciesCode: 'SPC-JWL',
    scientificName: 'Timon lepidus',
    taxonomicFamily: 'Lacertidae',
    familyCode: 'FAM-LAC',
    image: '',
    defaultWeight: 140,
    defaultLength: 50,
    defaultMorph: 'Ocellated Pattern',
    minBreedingWeight: 120,
    minBreedingWeightFemale: 120,
    minBreedingWeightMale: 100,
    minBreedingAgeFemale: '18–24 mos',
    minBreedingAgeMale: '12–18 mos',
  },
  'Green Iguana': {
    speciesCode: 'SPC-IGU',
    scientificName: 'Iguana iguana',
    taxonomicFamily: 'Iguanidae',
    familyCode: 'FAM-IGU',
    image: '',
    defaultWeight: 2200,
    defaultLength: 120,
    defaultMorph: 'Red Hypo',
    minBreedingWeight: 1500,
    minBreedingWeightFemale: 1500,
    minBreedingWeightMale: 1200,
    minBreedingAgeFemale: '24–36 mos',
    minBreedingAgeMale: '24–36 mos',
  }
};

const LEGACY_PREFIX_MAP: Record<string, string[]> = {
  'BDR': ['BDR', 'BD'],
  'BPR': ['BPR', 'BP'],
  'CGK': ['CGK', 'CG'],
  'LPG': ['LPG', 'LG'],
  'CSN': ['CSN', 'CS'],
  'RFT': ['RFT', 'RF'],
  'AST': ['AST', 'AS'],
  'RES': ['RES', 'RE'],
};

export function generateAnimalId(speciesName: string, existingAnimals: Animal[] = []): string {
  const targetSpecies = (speciesName || 'Animal').trim();
  const cleanSpecies = targetSpecies.split('(')[0].trim();
  
  let prefix = SPECIES_CODE_MAP[cleanSpecies];
  if (!prefix) {
    const clean = cleanSpecies.replace(/[^a-zA-Z0-9\s]/g, '');
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      prefix = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    } else if (words.length === 1) {
      const word = words[0].toUpperCase();
      prefix = word.length >= 2 ? word.substring(0, 2) : word;
    } else {
      prefix = 'AN';
    }
  }

  const allowedPrefixes = LEGACY_PREFIX_MAP[prefix] || [prefix];

  const matchingCount = existingAnimals.filter(a => {
    if (!a) return false;
    const aSpecies = (a.species || '').split('(')[0].trim().toLowerCase();
    const aId = (a.id || '').toUpperCase();
    const matchesPrefix = allowedPrefixes.some(p => aId.startsWith(`${p}-`));
    return matchesPrefix || aSpecies === cleanSpecies.toLowerCase();
  }).length;

  const sequence = matchingCount + 1;
  const seqPadded = String(sequence).padStart(3, '0');
  
  return `${prefix}-${seqPadded}`;
}

export default function AddAnimalModal({ isOpen, onClose, onAdd, existingAnimals = [], enclosures = [], tasks = [], systemDate }: AddAnimalModalProps) {
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [otherSpecies, setOtherSpecies] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [morph, setMorph] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | ''>('');
  const [dob, setDob] = useState('');
  const [dateAcquired, setDateAcquired] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [enclosureError, setEnclosureError] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [otherSource, setOtherSource] = useState('');
  const [enclosureId, setEnclosureId] = useState<string>('');
  const [weight, setWeight] = useState<string | number>('');
  const [length, setLength] = useState<string | number>('');
  const [image, setImage] = useState<string>('');
  const [imageZoom, setImageZoom] = useState<number>(100);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setSpecies('');
    setOtherSpecies('');
    setScientificName('');
    setMorph('');
    setSex('');
    setDob('');
    setDateAcquired('');
    setDateError(null);
    setEnclosureError(null);
    setSource('');
    setOtherSource('');
    setEnclosureId('');
    setWeight('');
    setLength('');
    setImage('');
    setImageZoom(100);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
    setIsSubmitting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset form inputs every time the modal is opened
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!image) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rawX = e.clientX - startPos.x;
    const rawY = e.clientY - startPos.y;
    const maxPanX = Math.max(300, Math.floor((imageZoom / 100) * 300));
    const maxPanY = Math.max(300, Math.floor((imageZoom / 100) * 300));

    setPan({
      x: Math.min(Math.max(rawX, -maxPanX), maxPanX),
      y: Math.min(Math.max(rawY, -maxPanY), maxPanY)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!image || e.touches.length !== 1) return;
    setIsDragging(true);
    setStartPos({
      x: e.touches[0].clientX - pan.x,
      y: e.touches[0].clientY - pan.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const rawX = e.touches[0].clientX - startPos.x;
    const rawY = e.touches[0].clientY - startPos.y;
    const maxPanX = Math.max(300, Math.floor((imageZoom / 100) * 300));
    const maxPanY = Math.max(300, Math.floor((imageZoom / 100) * 300));

    setPan({
      x: Math.min(Math.max(rawX, -maxPanX), maxPanX),
      y: Math.min(Math.max(rawY, -maxPanY), maxPanY)
    });
  };

  // When species dropdown changes, adjust scientific name and matching vivarium automatically
  const handleSpeciesChange = (newSpeciesFull: string) => {
    setSpecies(newSpeciesFull);
    setEnclosureError(null);
    const cleanName = newSpeciesFull.split('(')[0].trim();
    const preset = SPECIES_PRESETS[cleanName];
    const std = findSpeciesBreedingStandard(cleanName);
    const resolvedScientific = preset?.scientificName || std?.scientificName;

    if (resolvedScientific) {
      setScientificName(resolvedScientific);
    }

    if (preset && preset.image) {
      setImage(preset.image);
    }

    // Do not auto-assign enclosure; admin will assign enclosure later
    setEnclosureId('');
  };

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const effectiveSystemDate = systemDate || getEffectiveSystemDate();

  // Automation of animal age: Age is strictly calculated from Date of Birth (dob) and the current date (effectiveSystemDate),
  // not when the animal was acquired.
  const currentAgeResult = dob ? calculatePreciseAge(dob, effectiveSystemDate) : null;
  const ageInMonths = currentAgeResult ? currentAgeResult.totalMonths : 0;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImage(reader.result);
          setImageZoom(100);
          setPan({ x: 0, y: 0 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const activeSpeciesName = species === 'Other' ? (otherSpecies || 'Other') : species;
  const generatedId = generateAnimalId(activeSpeciesName, existingAnimals);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Strict Date Validation: Date Acquired cannot precede Date of Birth
    if (dob && dateAcquired && new Date(dateAcquired) < new Date(dob)) {
      setDateError(`Invalid dates: Date Acquired (${dateAcquired}) cannot be earlier than Date of Birth (${dob}).`);
      setIsSubmitting(false);
      return;
    }
    setDateError(null);

    // Enclosure Capacity Validation: Cannot assign to an enclosure that has reached capacity limit
    if (enclosureId) {
      const targetEnc = enclosures.find(e => e.id === enclosureId || e.name === enclosureId);
      if (targetEnc && isEnclosureAtCapacity(targetEnc, existingAnimals)) {
        const occupants = getEnclosureOccupants(targetEnc, existingAnimals);
        const maxCap = getEnclosureCapacityLimit(targetEnc);
        setEnclosureError(`Enclosure "${targetEnc.name || targetEnc.id}" is at full capacity limit (${occupants.length}/${maxCap} animals). You cannot put another animal into this enclosure until the existing animal is moved or removed.`);
        return;
      }
    }
    setEnclosureError(null);

    const id = generatedId;
    const cleanSpeciesName = species === 'Other' ? (otherSpecies || 'Other') : species.split('(')[0].trim();
    const std = findSpeciesBreedingStandard(cleanSpeciesName);
    const numWeight = typeof weight === 'string' ? (parseFloat(weight) || 0) : weight;
    
    // Accurate breeding status determination - starts as Pending Assessment until evaluated in Breeding Assessment
    let determinedStatus: Animal['breedingStatus'] = 'Pending Assessment';
    if (std) {
      const minW = sex === 'Female' ? std.minWeightGramsFemale : std.minWeightGramsMale;
      if (numWeight > 0 && numWeight < minW) {
        determinedStatus = 'Underweight';
      } else {
        determinedStatus = 'Pending Assessment';
      }
    } else {
      determinedStatus = 'Pending Assessment';
    }

    let finalImage = image;
    if (image && (pan.x !== 0 || pan.y !== 0 || imageZoom !== 100)) {
      try {
        finalImage = await getCroppedImg(image, pan, imageZoom, 144, 112);
      } catch (err) {
        console.warn('Error cropping image:', err);
      }
    }

    const newAnimal: Animal = {
      id,
      name: name.trim() || undefined,
      species: species === 'Other' ? (otherSpecies || 'Other') : species.split('(')[0].trim(),
      otherSpecies: species === 'Other' ? otherSpecies : undefined,
      scientificName: scientificName.trim() || undefined,
      morph: morph || 'Normal',
      sex: (sex as 'Male' | 'Female') || 'Male',
      dob: dob || getTodayString(),
      dateAcquired: dateAcquired || getTodayString(),
      source: source === 'Other' ? (otherSource || 'Other') : (source || 'Local Breeder'),
      weight: Number(weight) || 0,
      length: Number(length) || 0,
      healthStatus: 'Pending Checkup',
      breedingStatus: determinedStatus,
      enclosureId: enclosureId || undefined,
      image: finalImage,
      imageUrl: finalImage,
      photoUrl: finalImage
    };
    onAdd(newAnimal);
    resetForm();
    onClose();
  };

  const selectedStandard = findSpeciesBreedingStandard(activeSpeciesName);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#071F11] rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-emerald-900/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-100 dark:border-emerald-950 flex items-center justify-between bg-emerald-50/50 dark:bg-[#04110A]">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Add New Specimen / Animal</span>
            </h3>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 mt-0.5">Register new physical record into sanctuary database with validated species standards.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column */}
            <div className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black text-slate-600 dark:text-emerald-300 uppercase tracking-wider">Automated Animal ID</label>
                  <span className="text-[10px] font-extrabold text-[#113C24] dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Auto-Linked #{existingAnimals.filter(a => {
                      const prefix = generatedId.split('-')[0];
                      return (a.id || '').toUpperCase().startsWith(`${prefix}-`);
                    }).length + 1}
                  </span>
                </div>
                <input
                  type="text"
                  value={generatedId}
                  className="w-full px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-sm font-black bg-emerald-50/60 dark:bg-[#04110A] text-[#113C24] dark:text-emerald-300 cursor-not-allowed focus:outline-none"
                  disabled
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">Species code ({generatedId.split('-')[0]}) + 3-digit sequence number.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-emerald-300 mb-1 uppercase tracking-wider">Animal Name / Nickname (Optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nacho, Spike, Pookie"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-sm bg-white dark:bg-[#04110A] text-slate-800 dark:text-white focus:outline-none focus:border-[#113C24] dark:focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-emerald-300 mb-1 uppercase tracking-wider">Species *</label>
                <select
                  value={species}
                  onChange={(e) => handleSpeciesChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-sm bg-white dark:bg-[#04110A] text-slate-800 dark:text-white focus:outline-none focus:border-[#113C24] dark:focus:border-emerald-500"
                  required
                >
                  <option value="" disabled>-- Select Species --</option>
                  <option value="Bearded Dragon">Bearded Dragon (Pogona vitticeps) [SPC-BDR]</option>
                  <option value="Leopard Gecko">Leopard Gecko (Eublepharis macularius) [SPC-LPG]</option>
                  <option value="Ball Python">Ball Python (Python regius) [SPC-BPR]</option>
                  <option value="Corn Snake">Corn Snake (Pantherophis guttatus) [SPC-CSN]</option>
                  <option value="Crested Gecko">Crested Gecko (Correlophus ciliatus) [SPC-CGK]</option>
                  <option value="Red-Foot Tortoise">Red-Foot Tortoise (Chelonoidis carbonaria) [SPC-RFT]</option>
                  <option value="African Spurred Tortoise">African Spurred Tortoise (Centrochelys sulcata) [SPC-AST]</option>
                  <option value="Red Eared Slider">Red Eared Slider (Trachemys scripta elegans) [SPC-RES]</option>
                  <option value="Sugar Glider">Sugar Glider (Petaurus breviceps) [SPC-SGL]</option>
                  <option value="Spectacled Caiman">Spectacled Caiman (Caiman crocodilus) [SPC-SPC]</option>
                  <option value="Gargoyle Gecko">Gargoyle Gecko (Rhacodactylus auriculatus) [SPC-GGK]</option>
                  <option value="Leachianus Gecko">Leachianus Gecko (Rhacodactylus leachianus) [SPC-LGK]</option>
                  <option value="Frilled Dragon">Frilled Dragon (Chlamydosaurus kingii) [SPC-FDR]</option>
                  <option value="Red-eyed Crocodile Skink">Red-eyed Crocodile Skink (Tribolonotus gracilis) [SPC-RCS]</option>
                  <option value="White-eyed Crocodile Skink">White-eyed Crocodile Skink (Tribolonotus novaeguineae) [SPC-WCS]</option>
                  <option value="Jewel Lizard">Jewel Lizard (Timon lepidus) [SPC-JWL]</option>
                  <option value="Green Iguana">Green Iguana (Iguana iguana) [SPC-IGU]</option>
                  <option value="Other">Other (specify below)</option>
                </select>
              </div>

              {species === 'Other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-emerald-300 mb-1 uppercase tracking-wider">Specify Species Name *</label>
                  <input
                    type="text"
                    value={otherSpecies}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOtherSpecies(val);
                      const matchStd = findSpeciesBreedingStandard(val);
                      if (matchStd && matchStd.scientificName && !scientificName) {
                        setScientificName(matchStd.scientificName);
                      }
                    }}
                    placeholder="e.g. Blue Tongue Skink"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-sm bg-white dark:bg-[#04110A] text-slate-800 dark:text-white focus:outline-none focus:border-[#113C24]"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-emerald-300 mb-1 uppercase tracking-wider">
                  Scientific Name (Binomial Name)
                </label>
                <input
                  type="text"
                  value={scientificName}
                  readOnly={species !== 'Other'}
                  onChange={(e) => {
                    if (species === 'Other') {
                      setScientificName(e.target.value);
                    }
                  }}
                  placeholder="e.g. Pogona vitticeps"
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm italic transition-all ${
                    species !== 'Other'
                      ? 'bg-slate-100/80 dark:bg-[#030d07] border-slate-300/50 dark:border-emerald-950/80 text-emerald-300 select-none cursor-not-allowed font-medium'
                      : 'bg-white dark:bg-[#04110A] border-slate-200 dark:border-emerald-900/60 text-slate-800 dark:text-white focus:outline-none focus:border-[#113C24]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-emerald-300 mb-1 uppercase tracking-wider">Morph / Breed</label>
                <input
                  type="text"
                  value={morph}
                  onChange={(e) => setMorph(e.target.value)}
                  placeholder="Enter morph e.g. Citrus Leatherback, Pastel"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-sm bg-white dark:bg-[#04110A] text-slate-800 dark:text-white focus:outline-none focus:border-[#113C24]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-emerald-300 mb-1 uppercase tracking-wider">Sex *</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as 'Male' | 'Female')}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-sm bg-white dark:bg-[#04110A] text-slate-800 dark:text-white focus:outline-none focus:border-[#113C24]"
                  required
                >
                  <option value="" disabled>-- Select Sex / Gender --</option>
                  <option value="Male">Male (♂)</option>
                  <option value="Female">Female (♀)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-emerald-300 mb-1 uppercase tracking-wider">Date of Birth (Est.) *</label>
                <input
                  type="date"
                  value={dob}
                  max={effectiveSystemDate}
                  onChange={(e) => {
                    const newDob = e.target.value;
                    setDob(newDob);
                    if (newDob && effectiveSystemDate && newDob > effectiveSystemDate) {
                      setDateError(`Date of Birth (${newDob}) cannot be in the future (Facility Date: ${effectiveSystemDate}).`);
                    } else if (newDob && dateAcquired && dateAcquired < newDob) {
                      setDateError(`Date Acquired (${dateAcquired}) cannot be earlier than Date of Birth (${newDob}).`);
                    } else {
                      setDateError(null);
                    }
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm bg-white dark:bg-[#04110A] text-slate-800 dark:text-white focus:outline-none transition-colors ${
                    dateError ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500' : 'border-slate-200 dark:border-emerald-900/60 focus:border-[#113C24]'
                  }`}
                  required
                />
                <div className="mt-1.5 flex items-center justify-between px-3 py-2 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs">
                  <span className="text-slate-500 dark:text-emerald-300/80 font-medium">
                    Current Age:
                  </span>
                  <span className="font-bold text-[#113C24] dark:text-emerald-400">
                    {currentAgeResult ? currentAgeResult.text : 'Select Date of Birth'}
                  </span>
                </div>
                {selectedStandard && (
                  <div className="mt-1 flex items-center space-x-1 text-[11px]">
                    {ageInMonths >= (sex === 'Female' ? selectedStandard.minAgeMonthsFemale : selectedStandard.minAgeMonthsMale) ? (
                      <span className="text-emerald-500 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Meets min breeding age ({sex === 'Female' ? selectedStandard.minAgeTextFemale : selectedStandard.minAgeTextMale})</span>
                      </span>
                    ) : (
                      <span className="text-amber-500 font-medium flex items-center space-x-1">
                        <Info className="w-3 h-3" />
                        <span>Developing age (Standard: {sex === 'Female' ? selectedStandard.minAgeTextFemale : selectedStandard.minAgeTextMale})</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-emerald-300 mb-1 uppercase tracking-wider">Date Acquired *</label>
                <input
                  type="date"
                  value={dateAcquired}
                  min={dob || undefined}
                  max={effectiveSystemDate}
                  onChange={(e) => {
                    const newAcq = e.target.value;
                    setDateAcquired(newAcq);
                    if (dob && newAcq && new Date(newAcq) < new Date(dob)) {
                      setDateError(`Date Acquired (${newAcq}) cannot be earlier than Date of Birth (${dob}).`);
                    } else if (newAcq && effectiveSystemDate && newAcq > effectiveSystemDate) {
                      setDateError(`Date Acquired (${newAcq}) cannot be in the future (Facility Date: ${effectiveSystemDate}).`);
                    } else {
                      setDateError(null);
                    }
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm bg-white dark:bg-[#04110A] text-slate-800 dark:text-white focus:outline-none transition-colors ${
                    dateError ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500' : 'border-slate-200 dark:border-emerald-900/60 focus:border-[#113C24]'
                  }`}
                  required
                />
                {dob && dateAcquired && new Date(dateAcquired) >= new Date(dob) && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-emerald-300/80">
                    <span>Age when acquired (Intake):</span>
                    <span className="font-semibold text-slate-700 dark:text-emerald-300">
                      {calculatePreciseAge(dob, dateAcquired)?.shortText || 'N/A'}
                    </span>
                  </div>
                )}
                {dateError && (
                  <div className="mt-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-[11px] font-semibold flex items-start space-x-1.5 animate-in fade-in duration-200">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
                    <span>{dateError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-emerald-300 mb-1 uppercase tracking-wider">Source *</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-sm bg-white dark:bg-[#04110A] text-slate-800 dark:text-white focus:outline-none focus:border-[#113C24]"
                  required
                >
                  <option value="" disabled>-- Select Source --</option>
                  <option value="Local Breeder">Local Breeder</option>
                  <option value="Rescue Center">Rescue Center</option>
                  <option value="Captive Bred">Captive Bred</option>
                  <option value="Wild Born">Wild Born</option>
                  <option value="International Exchange">International Exchange</option>
                  <option value="Other">Other (Specify below)</option>
                </select>

                {source === 'Other' && (
                  <div className="mt-2 animate-in fade-in duration-200">
                    <input
                      type="text"
                      value={otherSource}
                      onChange={(e) => setOtherSource(e.target.value)}
                      placeholder="Specify source..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-sm bg-white dark:bg-[#04110A] text-slate-800 dark:text-white focus:outline-none focus:border-[#113C24]"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-emerald-300 mb-1 uppercase tracking-wider">Weight (grams) *</label>
                <div className="flex rounded-xl border border-slate-200 dark:border-emerald-900/60 overflow-hidden bg-white dark:bg-[#04110A]">
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Enter weight in grams (e.g. 380)"
                    className="w-full px-3.5 py-2 text-sm bg-transparent text-slate-800 dark:text-white focus:outline-none"
                    required
                    min={1}
                  />
                  <span className="bg-emerald-50 dark:bg-emerald-950/80 border-l border-emerald-200 dark:border-emerald-900/60 text-xs font-bold text-emerald-800 dark:text-emerald-300 px-3 flex items-center justify-center">g</span>
                </div>
                {selectedStandard && weight && Number(weight) > 0 && (() => {
                  const evalResult = evaluateWeightCondition(selectedStandard, sex || 'Female', Number(weight));
                  return (
                    <div className="mt-1.5 flex items-start space-x-1.5 text-[11px]">
                      {evalResult.status === 'optimal' && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{evalResult.message}</span>
                        </span>
                      )}
                      {evalResult.status === 'underweight' && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          <span>{evalResult.message}</span>
                        </span>
                      )}
                      {evalResult.status === 'above_standard' && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{evalResult.message}</span>
                        </span>
                      )}
                      {evalResult.status === 'extreme_excess' && (
                        <span className="text-orange-600 dark:text-orange-400 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                          <span>{evalResult.message}</span>
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-emerald-300 mb-1 uppercase tracking-wider">Length *</label>
                <div className="flex rounded-xl border border-slate-200 dark:border-emerald-900/60 overflow-hidden bg-white dark:bg-[#04110A]">
                  <input
                    type="number"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    placeholder="Enter length in cm (e.g. 45)"
                    className="w-full px-3.5 py-2 text-sm bg-transparent text-slate-800 dark:text-white focus:outline-none"
                    required
                    min={1}
                  />
                  <span className="bg-emerald-50 dark:bg-emerald-950/80 border-l border-emerald-200 dark:border-emerald-900/60 text-xs font-bold text-emerald-800 dark:text-emerald-300 px-3 flex items-center justify-center">cm</span>
                </div>
              </div>

              {/* Animal Photo Upload */}
              <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-[#04110A] space-y-2.5">
                <label className="text-xs font-black text-slate-700 dark:text-emerald-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Animal Portrait *</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5 w-full">
                  {/* Draggable & Zoomable Image Preview Box */}
                  <div 
                    className="relative w-full sm:w-36 h-32 sm:h-28 rounded-xl overflow-hidden border-2 border-emerald-600/30 dark:border-emerald-500/40 bg-slate-950 shrink-0 shadow-sm flex items-center justify-center select-none cursor-grab active:cursor-grabbing touch-none group"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleMouseUp}
                  >
                    {image ? (
                      <>
                        <img 
                          src={image} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover filter blur-md scale-125 opacity-30 pointer-events-none"
                          referrerPolicy="no-referrer"
                        />
                        <img
                          src={image}
                          alt="Preview"
                          draggable={false}
                          style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${imageZoom / 100})`,
                            transformOrigin: 'center center',
                            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                          }}
                          className="max-w-full max-h-full object-contain pointer-events-none select-none relative z-10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-medium rounded backdrop-blur-xs flex items-center space-x-1 pointer-events-none z-20 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Move className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Drag to position</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
                        <Camera className="w-6 h-6 text-emerald-500/80 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Zoom Controls */}
                  <div className="flex-1 min-w-0 w-full flex flex-col justify-center space-y-2.5">
                    {image ? (
                      <div className="flex items-center flex-wrap gap-2">
                        {/* Compact Zoom Controls */}
                        <div className="flex items-center space-x-1 bg-white dark:bg-[#071F11] border border-emerald-200 dark:border-emerald-900/60 px-1.5 py-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setImageZoom(prev => Math.max(100, prev - 10))}
                            className="p-0.5 text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer"
                            title="Zoom Out"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-emerald-300 px-1 select-none">{imageZoom}%</span>
                          <button
                            type="button"
                            onClick={() => setImageZoom(prev => Math.min(250, prev + 10))}
                            className="p-0.5 text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer"
                            title="Zoom In"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setImageZoom(100);
                            setPan({ x: 0, y: 0 });
                          }}
                          className="px-2 py-1 rounded-md text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-emerald-400/90 leading-tight">
                        No photo uploaded. Select an image file to upload.
                      </p>
                    )}

                    {/* Button Controls Row */}
                    <div className="flex items-center flex-wrap gap-2 pt-0.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        id="animal-image-upload"
                        className="hidden"
                      />
                      <label
                        htmlFor="animal-image-upload"
                        className="inline-flex px-3 py-1.5 bg-[#113C24] hover:bg-[#1B5234] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg cursor-pointer shadow-xs transition-all active:scale-95 items-center space-x-1 shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{image ? 'Change Photo' : 'Upload Photo'}</span>
                      </label>

                      {image && (
                        <button
                          type="button"
                          onClick={() => {
                            setImage('');
                            setImageZoom(100);
                            setPan({ x: 0, y: 0 });
                          }}
                          className="inline-flex px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer transition-colors items-center space-x-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-emerald-100 dark:border-emerald-950 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-slate-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#113C24] hover:bg-[#1B5234] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Registering...' : 'Confirm New Animal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
