import React, { useState } from 'react';
import { X, Box, Thermometer, Users, Edit3, Trash2, Camera, Check, AlertTriangle, Building, ShieldCheck, Tag, Info, PawPrint, ChevronRight, QrCode, Sun, Moon, Clock, Sparkles, Zap, CheckCircle2, Archive } from 'lucide-react';
import { Enclosure, Animal } from '../../types';
import { findSpeciesBreedingStandard, detectEnclosureSpecies } from '../../utils/breedingStandards';

interface EnclosureDetailModalProps {
  enclosure: Enclosure;
  onClose: () => void;
  animals: Animal[];
  facilities?: string[];
  onUpdateEnclosure?: (updated: Enclosure) => void;
  onDeleteEnclosure?: (id: string) => void;
  onOpenQrPass?: (enclosure: Enclosure) => void;
  onOpenClimateModal?: (enclosure: Enclosure) => void;
  onSelectAnimal?: (animal: Animal) => void;
  isDarkMode?: boolean;
}

const STANDARD_ENCLOSURE_TYPES = [
  'Glass Terrarium',
  'PVC Enclosure',
  'Rack System',
  'Wooden Vivarium',
  'Mesh Cage',
  'Tub / Storage Bin',
  'Outdoor Pen',
  'Acrylic Terrarium',
  'Mesh Aviary',
  'Outdoor Paddock',
  'Aquarium'
];

export default function EnclosureDetailModal({
  enclosure,
  onClose,
  animals,
  facilities = ['Main Facility'],
  onUpdateEnclosure,
  onDeleteEnclosure,
  onOpenQrPass,
  onOpenClimateModal,
  onSelectAnimal,
  isDarkMode = true
}: EnclosureDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const detectedTargetSpecies = enclosure.climateProfile?.targetSpecies || detectEnclosureSpecies(enclosure, animals);
  const targetSpeciesStandard = findSpeciesBreedingStandard(detectedTargetSpecies);

  // Check if enclosure type is in standard list
  const isStandardType = STANDARD_ENCLOSURE_TYPES.includes(enclosure.type);
  const STANDARD_CONDITIONS = ['Good', 'Needs Attention', 'Under Maintenance', 'Out of Service'];
  const isStandardCondition = STANDARD_CONDITIONS.includes(enclosure.condition || 'Good');
  const isStandardFacility = facilities.includes(enclosure.facility);

  // Form states for editing
  const [name, setName] = useState(enclosure.name);
  const [facilitySelect, setFacilitySelect] = useState(isStandardFacility ? enclosure.facility : 'Other');
  const [customFacility, setCustomFacility] = useState(isStandardFacility ? '' : enclosure.facility);
  const [typeSelect, setTypeSelect] = useState(isStandardType ? enclosure.type : 'Other');
  const [customType, setCustomType] = useState(isStandardType ? '' : enclosure.type);
  const [conditionSelect, setConditionSelect] = useState(isStandardCondition ? (enclosure.condition || 'Good') : 'Other');
  const [customCondition, setCustomCondition] = useState(isStandardCondition ? '' : (enclosure.condition || ''));
  const [tempNum, setTempNum] = useState(() => {
    return enclosure.temperature ? enclosure.temperature.replace(/[^0-9.]/g, '') : '31';
  });
  const [capacity, setCapacity] = useState(enclosure.capacity || '1');
  const [notes, setNotes] = useState(enclosure.notes || '');
  const [image, setImage] = useState(enclosure.image || '');

  // Draggable Photo Position
  const [encPan, setEncPan] = useState({ x: 0, y: 0 });
  const [isDraggingEnc, setIsDraggingEnc] = useState(false);
  const [dragStartEnc, setDragStartEnc] = useState({ x: 0, y: 0 });

  const handleEncMouseDown = (e: React.MouseEvent) => {
    setIsDraggingEnc(true);
    setDragStartEnc({ x: e.clientX - encPan.x, y: e.clientY - encPan.y });
  };

  const handleEncMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingEnc) return;
    const rawX = e.clientX - dragStartEnc.x;
    const rawY = e.clientY - dragStartEnc.y;
    setEncPan({
      x: Math.min(Math.max(rawX, -500), 500),
      y: Math.min(Math.max(rawY, -500), 500)
    });
  };

  const handleEncMouseUp = () => {
    setIsDraggingEnc(false);
  };

  const handleEncTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDraggingEnc(true);
      setDragStartEnc({ x: e.touches[0].clientX - encPan.x, y: e.touches[0].clientY - encPan.y });
    }
  };

  const handleEncTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingEnc || e.touches.length !== 1) return;
    const rawX = e.touches[0].clientX - dragStartEnc.x;
    const rawY = e.touches[0].clientY - dragStartEnc.y;
    setEncPan({
      x: Math.min(Math.max(rawX, -500), 500),
      y: Math.min(Math.max(rawY, -500), 500)
    });
  };

  // Find reptiles assigned to this enclosure
  const assignedAnimals = animals.filter(
    a => a.enclosureId === enclosure.id || a.enclosureId === enclosure.name
  );

  // Handle Image File Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateEnclosure) return;

    const finalFacility = facilitySelect === 'Other' ? (customFacility.trim() || 'Custom Lounge') : facilitySelect;
    const finalType = typeSelect === 'Other' ? (customType.trim() || 'Custom Enclosure') : typeSelect;
    const finalCondition = conditionSelect === 'Other' ? (customCondition.trim() || 'Needs Attention') : conditionSelect;

    const updated: Enclosure = {
      ...enclosure,
      name: name.trim() || enclosure.name,
      facility: finalFacility,
      type: finalType,
      condition: finalCondition,
      temperature: tempNum.trim() ? `${tempNum.trim()}°C` : '31°C',
      capacity: capacity.trim() || '1',
      notes: notes.trim() || undefined,
      image: image || undefined
    };

    onUpdateEnclosure(updated);
    setSaveSuccessMsg(true);
    setIsEditing(false);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  // Handle Delete
  const handleDelete = () => {
    if (onDeleteEnclosure) {
      onDeleteEnclosure(enclosure.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div 
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl border transition-all my-auto max-h-[90vh] flex flex-col ${
          isDarkMode 
            ? 'bg-[#04110A] border-emerald-900/60 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-start justify-between shrink-0 ${
          isDarkMode ? 'border-emerald-900/50 bg-[#071F11]' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center space-x-3 min-w-0 pr-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isDarkMode 
                ? 'bg-[#113C24] border-emerald-700/60 text-emerald-300' 
                : 'bg-emerald-100 border-emerald-200 text-[#113C24]'
            }`}>
              <Box className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`text-[11px] font-mono font-black uppercase tracking-wider ${
                  isDarkMode ? 'text-emerald-400' : 'text-[#113C24]'
                }`}>
                  {enclosure.id}
                </span>
                <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${
                  enclosure.condition === 'Good' 
                    ? (isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800')
                    : (isDarkMode ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-amber-100 text-amber-800')
                }`}>
                  {enclosure.condition}
                </span>
              </div>
              <h2 className={`text-base sm:text-lg font-extrabold truncate mt-0.5 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {enclosure.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onOpenQrPass && !isEditing && (
              <button
                onClick={() => onOpenQrPass(enclosure)}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border cursor-pointer ${
                  isDarkMode 
                    ? 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-700/80 text-emerald-300' 
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                }`}
                title="View & Print Scannable QR Pass"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">QR Pass</span>
              </button>
            )}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border cursor-pointer ${
                  isDarkMode 
                    ? 'bg-[#113C24] hover:bg-[#1B5234] border-emerald-700 text-emerald-200' 
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#113C24]'
                }`}
                title="Edit Enclosure"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDarkMode 
                  ? 'hover:bg-emerald-900/40 text-slate-400 hover:text-white' 
                  : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="mx-5 mt-4 p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-xl flex items-center space-x-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Enclosure details updated successfully!</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Photo Banner / Upload */}
          <div 
            className={`relative rounded-2xl overflow-hidden border border-slate-200/60 dark:border-emerald-900/50 bg-slate-900 group h-44 sm:h-52 flex items-center justify-center select-none ${
              image ? 'cursor-grab active:cursor-grabbing touch-none' : ''
            }`}
            onMouseDown={image ? handleEncMouseDown : undefined}
            onMouseMove={image ? handleEncMouseMove : undefined}
            onMouseUp={image ? handleEncMouseUp : undefined}
            onMouseLeave={image ? handleEncMouseUp : undefined}
            onTouchStart={image ? handleEncTouchStart : undefined}
            onTouchMove={image ? handleEncTouchMove : undefined}
            onTouchEnd={image ? handleEncMouseUp : undefined}
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
                  alt={name} 
                  draggable={false}
                  style={{
                    transform: `translate(${encPan.x}px, ${encPan.y}px)`,
                    transition: isDraggingEnc ? 'none' : 'transform 0.05s ease-out'
                  }}
                  className="max-w-full max-h-full object-contain pointer-events-none select-none"
                  referrerPolicy="no-referrer"
                />
              </>
            ) : (
              <div className="text-center p-4 text-slate-400">
                <Box className="w-10 h-10 mx-auto text-emerald-500/60 mb-1" />
                <p className="text-xs font-bold">No photo available</p>
              </div>
            )}

            {/* Quick Upload / Edit Overlay Button */}
            <label className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/75 hover:bg-black/90 backdrop-blur-md text-white text-xs font-bold rounded-xl border border-white/20 shadow-lg cursor-pointer transition-all flex items-center space-x-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>{image ? 'Change Photo' : 'Upload Photo'}</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>

            {/* Facility & Type Badges */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[80%]">
              <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md text-emerald-300 text-[10px] font-bold rounded-lg border border-white/10 flex items-center space-x-1 shadow-xs">
                <Building className="w-3 h-3 text-emerald-400" />
                <span>{facilitySelect === 'Other' ? (customFacility || 'Custom Facility') : facilitySelect}</span>
              </span>
              <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md text-slate-200 text-[10px] font-bold rounded-lg border border-white/10 shadow-xs">
                {typeSelect === 'Other' ? (customType || 'Custom Enclosure') : typeSelect}
              </span>
            </div>
          </div>

          {!isEditing ? (
            /* VIEW MODE */
            <div className="space-y-5">
              {/* Main Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
                  isDarkMode ? 'bg-[#071F11] border-emerald-900/50' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                    <Thermometer className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${
                      isDarkMode ? 'text-emerald-400' : 'text-slate-500'
                    }`}>Temperature</span>
                    <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {tempNum ? `${tempNum}°C` : '31°C'}
                    </span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
                  isDarkMode ? 'bg-[#071F11] border-emerald-900/50' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                    <Users className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${
                      isDarkMode ? 'text-emerald-400' : 'text-slate-500'
                    }`}>Max Capacity</span>
                    <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {capacity} {Number(capacity) === 1 ? 'Animal' : 'Animals'}
                    </span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center space-x-3 col-span-2 sm:col-span-1 ${
                  isDarkMode ? 'bg-[#071F11] border-emerald-900/50' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`p-2.5 rounded-xl ${
                    (conditionSelect === 'Good' || (!isStandardCondition && conditionSelect === 'Other'))
                      ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                      : (isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')
                  }`}>
                    <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${
                      isDarkMode ? 'text-emerald-400' : 'text-slate-500'
                    }`}>Condition</span>
                    <span className={`text-xs font-black truncate max-w-[120px] block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {conditionSelect === 'Other' ? (customCondition || 'Needs Attention') : conditionSelect}
                    </span>
                  </div>
                </div>
              </div>

              {/* Climate Conditioning & Off-Season Control Card */}
              <div className={`p-4 rounded-xl border ${
                isDarkMode ? 'bg-[#062013] border-emerald-900/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-900/30">
                  <div className="flex items-center space-x-2">
                    <Thermometer className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Off-Season Climate & Environmental Conditioning
                    </h4>
                  </div>
                  {onOpenClimateModal && (
                    <button
                      type="button"
                      onClick={() => onOpenClimateModal(enclosure)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-emerald-400" />
                      <span>{enclosure.climateProfile ? 'Edit Climate Settings' : 'Configure Off-Season Climate'}</span>
                    </button>
                  )}
                </div>

                {enclosure.climateProfile ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full flex items-center space-x-1 ${
                        enclosure.climateProfile.status === 'Approved'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : enclosure.climateProfile.status === 'Pending Approval'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : enclosure.climateProfile.status === 'Pending Setup'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {enclosure.climateProfile.status === 'Approved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {enclosure.climateProfile.status === 'Pending Approval' && <Clock className="w-3 h-3 text-cyan-400" />}
                        {enclosure.climateProfile.status === 'Pending Setup' && <Zap className="w-3 h-3 text-amber-400" />}
                        <span>Status: {enclosure.climateProfile.status}</span>
                      </span>

                      {detectedTargetSpecies && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Species: <strong className="text-white">{detectedTargetSpecies}</strong>
                          {targetSpeciesStandard && (
                            <span className="italic text-emerald-400 ml-1">
                              ({targetSpeciesStandard.scientificName} • {targetSpeciesStandard.familyCode})
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-[#04120B] border-emerald-950' : 'bg-white border-slate-200'}`}>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Day Temp</span>
                        <span className="text-xs font-black text-amber-400">{enclosure.climateProfile.dayTemp ?? 29}°C</span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-[#04120B] border-emerald-950' : 'bg-white border-slate-200'}`}>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Night Temp</span>
                        <span className="text-xs font-black text-cyan-400">{enclosure.climateProfile.nightTemp ?? 19}°C</span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-[#04120B] border-emerald-950' : 'bg-white border-slate-200'}`}>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Photoperiod</span>
                        <span className="text-xs font-black text-emerald-400">{enclosure.climateProfile.photoperiodHours ?? 10}h</span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-[#04120B] border-emerald-950' : 'bg-white border-slate-200'}`}>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Humidity</span>
                        <span className="text-xs font-black text-blue-400">{enclosure.climateProfile.humidity ?? 45}%</span>
                      </div>
                    </div>

                    {targetSpeciesStandard && (
                      <div className={`p-2.5 rounded-xl border text-[10.5px] space-y-1.5 ${
                        isDarkMode ? 'bg-[#031007] border-emerald-950/80 text-slate-300' : 'bg-emerald-50/60 border-emerald-200 text-slate-700'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-400">Scientific Benchmark Cooling Range:</span>
                          <strong className="text-cyan-400">{targetSpeciesStandard.coolingTempRange}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Duration & Requirement:</span>
                          <span className="text-slate-200 font-medium">{targetSpeciesStandard.coolingDuration} • {targetSpeciesStandard.brumationCoolingRequired}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Official Pairing Season:</span>
                          <span className="text-emerald-400 font-bold">{targetSpeciesStandard.pairingSeasonText}</span>
                        </div>
                        {targetSpeciesStandard.preLayBehavioralIndicators && (
                          <div className="pt-1 border-t border-emerald-950/40 text-[10.5px]">
                            <span className="text-amber-400 font-bold block mb-0.5">⚠️ Pre-Lay Behavioral Indicators:</span>
                            <span className="text-slate-300 italic">"{targetSpeciesStandard.preLayBehavioralIndicators}"</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      {enclosure.climateProfile.configuredByKeeper && (
                        <p>Configured by Keeper: <span className="text-slate-200 font-medium">{enclosure.climateProfile.configuredByKeeper}</span> ({enclosure.climateProfile.configuredAt || 'Recently'})</p>
                      )}
                      {enclosure.climateProfile.approvedByAdmin && (
                        <p>Verified & Approved by Admin: <span className="text-emerald-300 font-medium">{enclosure.climateProfile.approvedByAdmin}</span> ({enclosure.climateProfile.approvedAt || 'Approved'})</p>
                      )}
                      {enclosure.climateProfile.notes && (
                        <p className="italic text-slate-400 mt-1">"{enclosure.climateProfile.notes}"</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <p>
                      No active off-season climate simulation assigned.
                      {detectedTargetSpecies && (
                        <span className="text-slate-300 ml-1">
                          Resident species: <strong className="text-emerald-400">{detectedTargetSpecies}</strong>
                        </span>
                      )}
                    </p>
                    {onOpenClimateModal && (
                      <button
                        type="button"
                        onClick={() => onOpenClimateModal(enclosure)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black shadow transition-all cursor-pointer shrink-0"
                      >
                        Setup Climate for {detectedTargetSpecies || 'Species'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Notes / Special Instructions */}
              {notes && (
                <div className={`p-4 rounded-xl border ${
                  isDarkMode ? 'bg-[#071F11]/60 border-emerald-900/40 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1 flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Enclosure Notes & Maintenance</span>
                  </h4>
                  <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap">{notes}</p>
                </div>
              )}

              {/* Reptiles Currently inside this Enclosure */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center space-x-1.5 ${
                    isDarkMode ? 'text-emerald-400' : 'text-slate-700'
                  }`}>
                    <PawPrint className="w-4 h-4 text-emerald-500" />
                    <span>Reptiles inside Enclosure ({assignedAnimals.length})</span>
                  </h3>
                </div>

                {assignedAnimals.length === 0 ? (
                  <div className={`p-4 text-center rounded-xl border ${
                    isDarkMode ? 'bg-[#071F11]/40 border-emerald-900/30 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <p className="text-xs font-semibold">No animals currently assigned to this enclosure.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignedAnimals.map(animal => (
                      <div 
                        key={animal.id}
                        onClick={() => {
                          onClose();
                          onSelectAnimal && onSelectAnimal(animal);
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          onSelectAnimal ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''
                        } ${
                          isDarkMode ? 'bg-[#071F11] border-emerald-900/40 hover:bg-[#0c2f1b]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {animal.image ? (
                            <img src={animal.image} alt={animal.name || animal.species} className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-emerald-800" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-emerald-900/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                              {animal.species.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-mono font-bold text-emerald-400">{animal.id}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                {animal.sex === 'Male' ? '♂ Male' : '♀ Female'}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                              {animal.name ? `${animal.name} (${animal.species})` : animal.species}
                            </h5>
                            <p className="text-[10px] text-slate-400">{animal.morph}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-900/60">
                            {animal.healthStatus}
                          </span>
                          {onSelectAnimal && (
                            <ChevronRight className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EDIT FORM MODE */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 shrink-0" />
                <span>Editing Enclosure Specifications</span>
              </div>

              {/* Name & Facility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Enclosure Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Facility / Lounge *
                  </label>
                  <select
                    value={facilitySelect}
                    onChange={(e) => setFacilitySelect(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                    }`}
                  >
                    {facilities.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                    <option value="Other">Other / Custom Facility...</option>
                  </select>

                  {facilitySelect === 'Other' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        value={customFacility}
                        onChange={(e) => setCustomFacility(e.target.value)}
                        placeholder="Enter custom facility/lounge name..."
                        className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                          isDarkMode
                            ? 'bg-[#04110A] border-emerald-500 text-white'
                            : 'bg-emerald-50/50 border-emerald-600 text-slate-800'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Type & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Enclosure Type *
                  </label>
                  <select
                    value={typeSelect}
                    onChange={(e) => setTypeSelect(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                    }`}
                  >
                    {STANDARD_ENCLOSURE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="Other">Other (Custom Type)...</option>
                  </select>

                  {typeSelect === 'Other' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        placeholder="Specify custom enclosure type..."
                        className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                          isDarkMode
                            ? 'bg-[#04110A] border-emerald-500 text-white'
                            : 'bg-emerald-50/50 border-emerald-600 text-slate-800'
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Condition Status *
                  </label>
                  <select
                    value={conditionSelect}
                    onChange={(e) => setConditionSelect(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                    }`}
                  >
                    <option value="Good">Good (Operational)</option>
                    <option value="Needs Attention">Needs Attention</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Out of Service">Out of Service</option>
                    <option value="Other">Other (Custom Status)...</option>
                  </select>

                  {conditionSelect === 'Other' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        value={customCondition}
                        onChange={(e) => setCustomCondition(e.target.value)}
                        placeholder="Specify condition (e.g. Quarantine Locked)..."
                        className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                          isDarkMode
                            ? 'bg-[#04110A] border-emerald-500 text-white'
                            : 'bg-emerald-50/50 border-emerald-600 text-slate-800'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Temperature & Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center space-x-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    <span>Target Temperature</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={tempNum}
                      onChange={(e) => setTempNum(e.target.value)}
                      placeholder="31"
                      className={`w-full pl-3.5 pr-8 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                        isDarkMode
                          ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                      }`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">°C</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Capacity Limit</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="1"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                      isDarkMode
                        ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                    }`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Notes & Maintenance Instructions
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. UVB bulb replaced, heating mat thermostat set to 31°C..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                    isDarkMode
                      ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#113C24]'
                  }`}
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200/60 dark:border-emerald-900/40">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isDarkMode ? 'hover:bg-emerald-900/40 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          )}

          {/* Delete Confirmation Alert Box */}
          {showDeleteConfirm && (
            <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-xl space-y-3 animate-fadeIn">
              <div className="flex items-start space-x-2.5 text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">Confirm Enclosure Archival</h4>
                  <p className="text-xs mt-1 text-slate-300 dark:text-slate-200">
                    Are you sure you want to archive enclosure <strong className="text-white font-mono">{enclosure.id} ({enclosure.name})</strong>? This record will be safely moved to Archive / Deleted Records and can be restored anytime.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Enclosure</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Delete Action Bar */}
        {!isEditing && !showDeleteConfirm && onDeleteEnclosure && (
          <div className={`p-4 border-t flex items-center justify-between shrink-0 ${
            isDarkMode ? 'border-emerald-900/50 bg-[#071F11]' : 'border-slate-100 bg-slate-50'
          }`}>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3.5 py-2 text-xs font-bold text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              <span>Archive / Remove Enclosure</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-slate-800 dark:text-emerald-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
