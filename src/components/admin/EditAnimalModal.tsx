import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Camera, Trash2, Sliders, Award, Info, AlertTriangle, CheckCircle2, ZoomIn, ZoomOut, Move, Lock } from 'lucide-react';
import { Animal, Enclosure } from '../../types';
import { SPECIES_PRESETS } from './AddAnimalModal';
import { findSpeciesBreedingStandard, evaluateWeightCondition, isEnclosureSpeciesCompatible, isEnclosureAtCapacity, getEnclosureOccupants, getEnclosureCapacityLimit } from '../../utils/breedingStandards';
import { getCroppedImg } from '../../utils/cropImage';
import { calculatePreciseAge, getEffectiveSystemDate, getFormattedDateWithDay } from '../../utils/timeUtils';

interface EditAnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: Animal | null;
  onSave: (updated: Animal) => void;
  enclosures?: Enclosure[];
  existingAnimals?: Animal[];
  systemDate?: string;
}

export default function EditAnimalModal({
  isOpen,
  onClose,
  animal,
  onSave,
  enclosures = [],
  existingAnimals = [],
  systemDate
}: EditAnimalModalProps) {
  // Form State (Declared unconditionally at the top level)
  const [name, setName] = useState(animal?.name || '');
  const [species, setSpecies] = useState(animal?.species || '');
  const [otherSpecies, setOtherSpecies] = useState(animal?.otherSpecies || '');
  const [scientificName, setScientificName] = useState(animal?.scientificName || '');
  const [morph, setMorph] = useState(animal?.morph || '');
  const [sex, setSex] = useState<'Male' | 'Female'>(animal?.sex || 'Male');
  const [dob, setDob] = useState(animal?.dob || '');
  const [dateAcquired, setDateAcquired] = useState(animal?.dateAcquired || '');
  const [dateError, setDateError] = useState<string | null>(null);
  const [enclosureError, setEnclosureError] = useState<string | null>(null);
  const [source, setSource] = useState(animal?.source || 'Captive Bred');
  const [otherSource, setOtherSource] = useState('');
  const [weight, setWeight] = useState<string | number>(animal?.weight ?? '');
  const [length, setLength] = useState<string | number>(animal?.length ?? '');
  const [healthStatus, setHealthStatus] = useState<Animal['healthStatus']>(animal?.healthStatus || 'Healthy');
  const [breedingStatus, setBreedingStatus] = useState<Animal['breedingStatus']>(animal?.breedingStatus || 'Pending Assessment');
  const [enclosureId, setEnclosureId] = useState<string>(animal?.enclosureId || '');
  const [notes, setNotes] = useState<string>(animal?.notes || '');
  const [image, setImage] = useState<string>(animal?.image || animal?.imageUrl || animal?.photoUrl || '');
  const [imageZoom, setImageZoom] = useState<number>(100);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // Sync state whenever animal or modal open state changes
  useEffect(() => {
    if (animal && isOpen) {
      setName(animal.name || '');
      setSpecies(animal.species || '');
      setOtherSpecies(animal.otherSpecies || animal.species || '');
      const clean = (animal.species || '').split('(')[0].trim();
      const preset = SPECIES_PRESETS[clean];
      const std = findSpeciesBreedingStandard(clean);
      setScientificName(animal.scientificName || preset?.scientificName || std?.scientificName || '');
      setMorph(animal.morph || '');
      setSex(animal.sex || 'Male');
      setDob(animal.dob || '');
      setDateAcquired(animal.dateAcquired || '');
      setSource(animal.source || 'Captive Bred');
      setWeight(animal.weight ?? '');
      setLength(animal.length ?? '');
      setHealthStatus(animal.healthStatus || 'Healthy');
      setBreedingStatus(animal.breedingStatus || 'Pending Assessment');
      setEnclosureId(animal.enclosureId || '');
      setNotes(animal.notes || '');
      setImage(animal.image || animal.photoUrl || '');
      setImageZoom(100);
      setPan({ x: 0, y: 0 });
    }
  }, [animal, isOpen]);

  // Handle Species selection change
  const handleSpeciesChange = (selectedSpecies: string) => {
    setSpecies(selectedSpecies);
    const cleanName = selectedSpecies.split('(')[0].trim();
    const preset = SPECIES_PRESETS[cleanName];
    const std = findSpeciesBreedingStandard(cleanName);
    const targetScientific = preset?.scientificName || std?.scientificName;
    if (targetScientific) {
      setScientificName(targetScientific);
    }
    // Validate current enclosure compatibility with new species
    if (enclosures && enclosures.length > 0) {
      const compatibleList = enclosures.filter(e => isEnclosureSpeciesCompatible(e, cleanName, existingAnimals));
      if (enclosureId && !compatibleList.some(e => e.id === enclosureId)) {
        setEnclosureId(compatibleList[0]?.id || '');
      }
    }
  };

  // Image Upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImage(result);
        setImageZoom(100);
        setPan({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const effectiveSystemDate = systemDate || getEffectiveSystemDate();
  // Animal age is automated based on date of birth and the current date, not when acquired
  const currentAgeResult = dob ? calculatePreciseAge(dob, effectiveSystemDate) : null;
  const acquiredAgeResult = (dob && dateAcquired) ? calculatePreciseAge(dob, dateAcquired) : null;

  // Age Calculator display
  const calculateAgeDisplay = (birthDate: string) => {
    if (!birthDate) return 'Age: Not set';
    const res = calculatePreciseAge(birthDate, effectiveSystemDate);
    if (!res) return 'Invalid date';
    if (res.isFuture) return 'Future Date';
    return `Current Age: ${res.text}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animal) return;

    // Strict Date Validation: Date Acquired cannot precede Date of Birth
    if (dob && dateAcquired && new Date(dateAcquired) < new Date(dob)) {
      setDateError(`Invalid dates: Date Acquired (${dateAcquired}) cannot be earlier than Date of Birth (${dob}).`);
      return;
    }
    setDateError(null);

    // Enclosure Capacity Validation: Cannot assign to an enclosure that has reached capacity limit
    if (enclosureId && enclosureId !== animal.enclosureId) {
      const targetEnc = enclosures.find(e => e.id === enclosureId || e.name === enclosureId);
      if (targetEnc && isEnclosureAtCapacity(targetEnc, existingAnimals, animal.id)) {
        const occupants = getEnclosureOccupants(targetEnc, existingAnimals, animal.id);
        const maxCap = getEnclosureCapacityLimit(targetEnc);
        setEnclosureError(`Enclosure "${targetEnc.name || targetEnc.id}" is at full capacity limit (${occupants.length}/${maxCap} animals). You cannot transfer this animal into this enclosure until an occupant is moved or removed.`);
        return;
      }
    }
    setEnclosureError(null);

    const finalSpecies = species === 'Other' ? otherSpecies.trim() || 'Exotic Reptile' : species;
    const finalSource = source === 'Other' ? otherSource.trim() || 'Captive Bred' : source;

    let finalImage = image;
    if (image && (pan.x !== 0 || pan.y !== 0 || imageZoom !== 100)) {
      try {
        finalImage = await getCroppedImg(image, pan, imageZoom, 280, 280);
      } catch (err) {
        console.warn('Error cropping image:', err);
      }
    }

    const updatedAnimal: Animal = {
      ...animal,
      name: name.trim(),
      species: finalSpecies,
      otherSpecies: species === 'Other' ? otherSpecies : undefined,
      scientificName: scientificName.trim(),
      morph: morph.trim() || 'Normal',
      sex,
      dob,
      dateAcquired: dateAcquired || dob,
      source: finalSource,
      weight: weight === '' ? 0 : Number(weight),
      length: length === '' ? 0 : Number(length),
      healthStatus,
      breedingStatus,
      enclosureId: enclosureId || undefined,
      notes: notes.trim(),
      image: finalImage || undefined,
      imageUrl: finalImage || undefined,
      photoUrl: finalImage || undefined
    };

    onSave(updatedAnimal);
    onClose();
  };

  if (!isOpen || !animal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl bg-[#04110A] text-slate-100 rounded-2xl border border-emerald-900/60 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-900/40 bg-[#071F11] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white">Edit Animal Profile</h3>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
                  {animal.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Update reptile identity, enclosure assignment, biological stats, and care notes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-950/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Photo Management */}
            <div className="lg:col-span-4 space-y-3.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                Animal Photograph
              </label>

              <div 
                className={`relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-emerald-900/60 bg-[#020905] flex flex-col items-center justify-center shadow-inner select-none ${
                  image ? 'cursor-grab active:cursor-grabbing touch-none group' : ''
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                {image ? (
                  <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                    <img 
                      src={image} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover filter blur-md scale-125 opacity-30 pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    <img 
                      src={image} 
                      alt="Reptile Preview" 
                      referrerPolicy="no-referrer"
                      draggable={false}
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${imageZoom / 100})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                      }}
                      className="max-w-full max-h-full object-contain select-none pointer-events-none relative z-10"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-medium rounded backdrop-blur-xs flex items-center space-x-1 pointer-events-none z-20 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Move className="w-3 h-3 text-emerald-400" />
                      <span>Drag to position</span>
                    </div>
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-emerald-950/20 transition-colors text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">Upload Photo</span>
                    <span className="text-[10px] text-slate-500 mt-1">PNG, JPG, WEBP or GIF</span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Actions & Zoom Controls */}
              {image && (
                <div className="flex items-center flex-wrap gap-2">
                  <div className="flex items-center space-x-1 bg-[#071F11] border border-emerald-900/60 px-1.5 py-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setImageZoom(prev => Math.max(100, prev - 10))}
                      className="p-0.5 text-slate-300 hover:text-emerald-400 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[10px] font-bold text-emerald-300 px-1 select-none">{imageZoom}%</span>
                    <button
                      type="button"
                      onClick={() => setImageZoom(prev => Math.min(250, prev + 10))}
                      className="p-0.5 text-slate-300 hover:text-emerald-400 cursor-pointer"
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
                    className="px-2 py-1 rounded-md text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer transition-colors"
                  >
                    Reset
                  </button>
                </div>
              )}

              {/* Photo Action Buttons */}
              <div className="flex items-center flex-wrap gap-2 pt-0.5">
                <label className="inline-flex px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg cursor-pointer shadow-xs transition-all active:scale-95 items-center space-x-1 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{image ? 'Change Photo' : 'Upload Photo'}</span>
                  <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
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

            {/* Right Column: Information Fields */}
            <div className="lg:col-span-8 space-y-4">
              {/* Row 1: Name & Sex */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Animal Name / Alias <span className="text-slate-500 normal-case font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spike, Draco, Mango"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#071F11] border border-emerald-900/60 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Biological Sex <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSex('Male')}
                      className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                        sex === 'Male'
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-xs'
                          : 'bg-[#071F11] border-emerald-900/40 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">♂</span>
                      <span>Male</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSex('Female')}
                      className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                        sex === 'Female'
                          ? 'bg-rose-600/30 border-rose-500 text-rose-300 shadow-xs'
                          : 'bg-[#071F11] border-emerald-900/40 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">♀</span>
                      <span>Female</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Species & Morph */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Species
                    </label>
                    <span className="flex items-center space-x-1 text-[10px] text-slate-400 font-semibold">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Locked to {animal.id}</span>
                    </span>
                  </div>
                  <div className="w-full px-3.5 py-2.5 bg-[#04110A] border border-emerald-950/80 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-between cursor-not-allowed select-none">
                    <span className="truncate mr-2">{species}</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-medium shrink-0">Permanent</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Morph / Genetic Line
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Normal, Hypo, Pastel, Leatherback"
                    value={morph}
                    onChange={(e) => setMorph(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#071F11] border border-emerald-900/60 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Other Species input if selected */}
              {species === 'Other' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                    Specify Custom Common Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Blue Tongue Skink"
                    value={otherSpecies}
                    onChange={(e) => setOtherSpecies(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#071F11] border border-emerald-900/60 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                    required
                  />
                </div>
              )}

              {/* Scientific Name Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Scientific Name (Binomial Nomenclature)
                  </label>
                  <span className="flex items-center space-x-1 text-[10px] text-slate-400 font-semibold">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Taxonomic Standard</span>
                  </span>
                </div>
                <div className="w-full px-3.5 py-2.5 bg-[#04110A] border border-emerald-950/80 rounded-xl text-xs italic font-medium text-emerald-300 select-none cursor-not-allowed">
                  {scientificName || 'Pogona vitticeps'}
                </div>
              </div>

              {/* Row 3: Enclosure & Health Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Enclosure Location
                    </label>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      {enclosures.filter(e => e.condition !== 'Out of Service' && !isEnclosureAtCapacity(e, existingAnimals, animal?.id)).length} Available
                    </span>
                  </div>
                  <select
                    value={enclosureId}
                    onChange={(e) => {
                      setEnclosureId(e.target.value);
                      setEnclosureError(null);
                    }}
                    className={`w-full px-3.5 py-2.5 bg-[#071F11] border rounded-xl text-xs font-bold text-white focus:outline-none transition-all cursor-pointer ${
                      enclosureError ? 'border-red-500 ring-1 ring-red-500' : 'border-emerald-900/60 focus:border-emerald-500'
                    }`}
                  >
                    <option value="">None / Unassigned (Holding)</option>
                    {(() => {
                      const cleanCurrentSpecies = species === 'Other' ? otherSpecies : species.split('(')[0].trim();
                      const inServiceEnclosures = enclosures.filter(enc => enc.condition !== 'Out of Service');

                      if (inServiceEnclosures.length === 0) {
                        return (
                          <option value="" disabled>
                            No enclosures registered yet
                          </option>
                        );
                      }

                      return inServiceEnclosures
                        .sort((a, b) => {
                          const aFull = isEnclosureAtCapacity(a, existingAnimals, animal?.id) ? 1 : 0;
                          const bFull = isEnclosureAtCapacity(b, existingAnimals, animal?.id) ? 1 : 0;
                          if (aFull !== bFull) return aFull - bFull;
                          const aRec = isEnclosureSpeciesCompatible(a, cleanCurrentSpecies, existingAnimals) ? 1 : 0;
                          const bRec = isEnclosureSpeciesCompatible(b, cleanCurrentSpecies, existingAnimals) ? 1 : 0;
                          return bRec - aRec;
                        })
                        .map(enc => {
                          const isRec = isEnclosureSpeciesCompatible(enc, cleanCurrentSpecies, existingAnimals);
                          const isFull = isEnclosureAtCapacity(enc, existingAnimals, animal?.id);
                          const occupants = getEnclosureOccupants(enc, existingAnimals, animal?.id);
                          const maxCap = getEnclosureCapacityLimit(enc);

                          return (
                            <option key={enc.id} value={enc.id} disabled={isFull}>
                              {enc.id} — {enc.name || enc.id} ({enc.facility} • {enc.type}) {isFull ? `⛔ [FULL - Capacity Limit: ${occupants.length}/${maxCap} Animals]` : `(${occupants.length}/${maxCap} Occupants)`} {isRec && !isFull ? '★ Recommended' : ''}
                            </option>
                          );
                        });
                    })()}
                  </select>
                  {enclosureError && (
                    <div className="mt-1.5 p-2 rounded-lg bg-red-950/50 border border-red-900/60 text-red-300 text-[11px] font-semibold flex items-start space-x-1.5 animate-in fade-in duration-200">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
                      <span>{enclosureError}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Health Status
                    </label>
                    <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span>Managed by Vet</span>
                    </span>
                  </div>
                  <div className="w-full px-3.5 py-2.5 bg-[#04110A] border border-emerald-950/80 rounded-xl text-xs font-bold text-white flex items-center justify-between select-none cursor-not-allowed">
                    <span className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        healthStatus === 'Healthy' ? 'bg-emerald-400' :
                        healthStatus === 'Pending Checkup' ? 'bg-amber-400' :
                        'bg-red-400'
                      }`} />
                      <span>{healthStatus}</span>
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">Clinical Exam Required</span>
                  </div>
                </div>
              </div>

              {/* Row 4: Weight & Length */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Weight (grams)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 450"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#071F11] border border-emerald-900/60 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-500">g</span>
                  </div>
                  {weight && Number(weight) > 0 && (() => {
                    const cleanSpecies = species === 'Other' ? otherSpecies : species.split('(')[0].trim();
                    const evalResult = evaluateWeightCondition(cleanSpecies, sex, Number(weight));
                    return (
                      <div className="mt-1.5 flex items-start space-x-1.5 text-[11px]">
                        {evalResult.status === 'optimal' && (
                          <span className="text-emerald-400 font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{evalResult.message}</span>
                          </span>
                        )}
                        {evalResult.status === 'underweight' && (
                          <span className="text-amber-400 font-semibold flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                            <span>{evalResult.message}</span>
                          </span>
                        )}
                        {evalResult.status === 'above_standard' && (
                          <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{evalResult.message}</span>
                          </span>
                        )}
                        {evalResult.status === 'extreme_excess' && (
                          <span className="text-orange-400 font-semibold flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                            <span>{evalResult.message}</span>
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Length (cm)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 42"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#071F11] border border-emerald-900/60 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-500">cm</span>
                  </div>
                </div>
              </div>

              {/* Row 5: DOB & Date Acquired */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Date of Birth (Est.)
                      </label>
                      <span className="text-[10px] font-bold text-emerald-400">
                        {calculateAgeDisplay(dob)}
                      </span>
                    </div>
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
                      className={`w-full px-3.5 py-2.5 bg-[#071F11] border rounded-xl text-xs font-bold text-white focus:outline-none transition-all cursor-pointer ${
                        dateError ? 'border-red-500 ring-1 ring-red-500' : 'border-emerald-900/60 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Date Acquired
                      </label>
                      {dateAcquired && acquiredAgeResult && !acquiredAgeResult.isFuture && (
                        <span className="text-[10px] font-medium text-emerald-400/80">
                          Acquired at: {acquiredAgeResult.shortText}
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      value={dateAcquired}
                      min={dob || undefined}
                      max={effectiveSystemDate}
                      onChange={(e) => {
                        const newAcq = e.target.value;
                        setDateAcquired(newAcq);
                        if (dob && newAcq && newAcq < dob) {
                          setDateError(`Date Acquired (${newAcq}) cannot be earlier than Date of Birth (${dob}).`);
                        } else if (newAcq && effectiveSystemDate && newAcq > effectiveSystemDate) {
                          setDateError(`Date Acquired (${newAcq}) cannot be in the future (Facility Date: ${effectiveSystemDate}).`);
                        } else {
                          setDateError(null);
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 bg-[#071F11] border rounded-xl text-xs font-bold text-white focus:outline-none transition-all cursor-pointer ${
                        dateError ? 'border-red-500 ring-1 ring-red-500' : 'border-emerald-900/60 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {dateError && (
                  <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-900/80 text-red-300 text-xs font-semibold flex items-start space-x-2 animate-in fade-in duration-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <span>{dateError}</span>
                  </div>
                )}
              </div>

              {/* Row 6: Source & Breeding Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Acquisition Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#071F11] border border-emerald-900/60 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                  >
                    <option value="Captive Bred">Captive Bred (Internal)</option>
                    <option value="Breeder Purchase">Breeder Purchase</option>
                    <option value="Imported">Imported</option>
                    <option value="Donation / Surrender">Donation / Surrender</option>
                    <option value="Rescue">Rescue</option>
                    <option value="Wild Caught">Wild Caught</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Breeding Status
                    </label>
                    <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span>Breeding Module</span>
                    </span>
                  </div>
                  <div className="w-full px-3.5 py-2.5 bg-[#04110A] border border-emerald-950/80 rounded-xl text-xs font-bold text-white flex items-center justify-between select-none cursor-not-allowed">
                    <span className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        breedingStatus === 'Ready for Pairing' ? 'bg-emerald-400' :
                        breedingStatus === 'Pending Assessment' ? 'bg-amber-400' :
                        'bg-slate-400'
                      }`} />
                      <span>{breedingStatus}</span>
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">Evaluated by Matrix</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Keeper Care Notes & Special Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Temperament, handling precautions, dietary preferences, or shedding notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#071F11] border border-emerald-900/60 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-600 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-emerald-900/40 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950 flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Animal Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
