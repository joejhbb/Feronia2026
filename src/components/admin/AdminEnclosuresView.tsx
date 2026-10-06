import React from 'react';
import {
  QrCode,
  Plus,
  Search,
  List,
  LayoutGrid,
  Box,
  Camera,
  ChevronRight,
  Thermometer,
  Users,
  ArrowLeft
} from 'lucide-react';
import { Enclosure, Animal } from '../../types';

interface AdminEnclosuresViewProps {
  enclosures: Enclosure[];
  animals: Animal[];
  facilitiesList: string[];
  isDarkMode: boolean;
  selectedBranch: string;
  setSelectedBranch: (val: string) => void;
  enclosureSpeciesFilter: string;
  setEnclosureSpeciesFilter: (val: string) => void;
  enclosureSearch: string;
  setEnclosureSearch: (val: string) => void;
  enclosureViewMode: 'list' | 'grid';
  setEnclosureViewMode: (val: 'list' | 'grid') => void;
  onOpenAddEnclosureModal: () => void;
  onOpenQrScanner: () => void;
  onSelectEnclosure: (enc: Enclosure) => void;
  onSelectQrPass: (enc: Enclosure) => void;
  onCardImageUpload: (enc: Enclosure, e: React.ChangeEvent<HTMLInputElement>) => void;
  onBackToDashboard?: () => void;
  onBack?: () => void;
}

export const AdminEnclosuresView: React.FC<AdminEnclosuresViewProps> = ({
  enclosures,
  animals,
  facilitiesList,
  isDarkMode,
  selectedBranch,
  setSelectedBranch,
  enclosureSpeciesFilter,
  setEnclosureSpeciesFilter,
  enclosureSearch,
  setEnclosureSearch,
  enclosureViewMode,
  setEnclosureViewMode,
  onOpenAddEnclosureModal,
  onOpenQrScanner,
  onSelectEnclosure,
  onSelectQrPass,
  onCardImageUpload,
  onBackToDashboard,
  onBack
}) => {
  const handleBack = onBack || onBackToDashboard;
  const enclosureSpeciesOptions = Array.from(new Set([
    ...animals.map(a => a.species),
    'Ball Python',
    'Bearded Dragon',
    'Iguana',
    'Corn Snake',
    'Leopard Gecko',
    'Reticulated Python',
    'Boa Constrictor'
  ])).filter(Boolean).sort();

  const filteredEnclosures = enclosures.filter(e => {
    const q = enclosureSearch.toLowerCase();
    const matchesSearch = (e.name || '').toLowerCase().includes(q) || 
                          (e.id || '').toLowerCase().includes(q) || 
                          (e.facility || '').toLowerCase().includes(q) ||
                          (e.type || '').toLowerCase().includes(q);
    const matchesBranch = selectedBranch === 'All Facilities' || !selectedBranch || e.facility === selectedBranch;

    const matchesSpecies = enclosureSpeciesFilter === 'All Species' || (() => {
      const targetSp = enclosureSpeciesFilter.toLowerCase();
      const animalMatch = animals.some(a => 
        !a.isArchived && 
        (a.enclosureId === e.id || a.enclosureId === e.name) && 
        a.species.toLowerCase().includes(targetSp)
      );
      const nameMatch = (e.name || '').toLowerCase().includes(targetSp) ||
                        (e.id || '').toLowerCase().includes(targetSp) ||
                        (e.type || '').toLowerCase().includes(targetSp) ||
                        (e.notes || '').toLowerCase().includes(targetSp);
      return animalMatch || nameMatch;
    })();

    return matchesSearch && matchesBranch && matchesSpecies;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          {handleBack && (
            <button
              type="button"
              onClick={handleBack}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                isDarkMode
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border-emerald-800/80'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs'
              }`}
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Enclosures</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage all enclosures, environment controls, and facility assignments.</p>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl border outline-none shadow-2xs transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200 focus:border-emerald-500' 
                : 'bg-white border-slate-200 text-slate-700 focus:border-[#113C24]'
            }`}
          >
            <option value="All Facilities">All Facilities ({enclosures.length})</option>
            {facilitiesList.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <select
            value={enclosureSpeciesFilter}
            onChange={(e) => setEnclosureSpeciesFilter(e.target.value)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl border outline-none shadow-2xs transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-[#04110A] border-emerald-900/60 text-emerald-200 focus:border-emerald-500' 
                : 'bg-white border-slate-200 text-slate-700 focus:border-[#113C24]'
            }`}
          >
            <option value="All Species">All Species</option>
            {enclosureSpeciesOptions.map(sp => (
              <option key={sp} value={sp}>{sp}</option>
            ))}
          </select>
        </div>
      </div>

      {/* FULL WIDTH ENCLOSURE LIST */}
      <div className={`p-6 rounded-2xl border shadow-2xs transition-colors w-full ${
        isDarkMode ? 'bg-[#071F11] border-emerald-950/60' : 'bg-white border-slate-100'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-extrabold tracking-wider text-slate-900 dark:text-white uppercase">ENCLOSURE LIST</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenQrScanner}
              className={`px-3.5 py-2 border text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95 ${
                isDarkMode 
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-700/80 text-emerald-300' 
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#113C24]'
              }`}
              title="Scan Enclosure QR Code using Camera or Image"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Scan Enclosure QR</span>
            </button>

            <button
              onClick={onOpenAddEnclosureModal}
              className="px-4 py-2 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Enclosure</span>
            </button>
          </div>
        </div>

        {/* Search Bar & View Mode Toggle */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search enclosure name, ID, or facility..."
              value={enclosureSearch}
              onChange={(e) => setEnclosureSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                isDarkMode 
                  ? 'bg-[#04110A] border-emerald-900/60 text-white placeholder-slate-500 focus:border-emerald-500' 
                  : 'bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#113C24]'
              }`}
            />
          </div>

          <div className={`flex items-center p-1 rounded-xl border ${
            isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setEnclosureViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                enclosureViewMode === 'list'
                  ? (isDarkMode ? 'bg-[#113C24] text-emerald-300 shadow-xs' : 'bg-white text-slate-800 shadow-xs')
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Compact List View"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">List</span>
            </button>
            <button
              onClick={() => setEnclosureViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                enclosureViewMode === 'grid'
                  ? (isDarkMode ? 'bg-[#113C24] text-emerald-300 shadow-xs' : 'bg-white text-slate-800 shadow-xs')
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">Grid</span>
            </button>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {(selectedBranch !== 'All Facilities' || enclosureSpeciesFilter !== 'All Species' || enclosureSearch.trim() !== '') && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                Active Filter: Showing {filteredEnclosures.length} of {enclosures.length} Enclosures
              </span>
              {selectedBranch !== 'All Facilities' && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-bold text-[10px]">
                  Facility: {selectedBranch}
                </span>
              )}
              {enclosureSpeciesFilter !== 'All Species' && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-bold text-[10px]">
                  Species: {enclosureSpeciesFilter}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedBranch('All Facilities');
                setEnclosureSpeciesFilter('All Species');
                setEnclosureSearch('');
              }}
              className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Reset Filters (Show All {enclosures.length})
            </button>
          </div>
        )}

        {/* Enclosures Empty State or List */}
        {filteredEnclosures.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl border-2 border-slate-200 dark:border-emerald-900/60 flex items-center justify-center text-slate-300 dark:text-emerald-800 mb-2">
              <Box className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2">No enclosures found.</h3>
            <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">Click the button below to register a new enclosure to a facility.</p>

            <button
              onClick={onOpenAddEnclosureModal}
              className="mt-5 px-5 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Enclosure</span>
            </button>

            <span className="text-[11px] text-slate-400 font-medium mt-4 block">
              Showing 0 of {enclosures.length} enclosures
            </span>
          </div>
        ) : enclosureViewMode === 'list' ? (
          <div className="space-y-3">
            {filteredEnclosures.map(enc => (
              <div
                key={enc.id}
                onClick={() => onSelectEnclosure(enc)}
                className={`p-3 rounded-xl border transition-all duration-200 flex items-center justify-between group cursor-pointer hover:border-emerald-500/80 shadow-xs hover:shadow-md ${
                  isDarkMode
                    ? 'bg-[#04110A] border-emerald-900/40 text-slate-200 hover:bg-[#071F11]'
                    : 'bg-white border-slate-200/80 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-slate-200/80 dark:border-emerald-950/40 shrink-0 shadow-xs bg-slate-900 flex items-center justify-center relative group-hover:scale-102 transition-all duration-300">
                    {enc.image ? (
                      <img src={enc.image} alt={enc.name} className="w-full h-full object-cover" />
                    ) : (
                      <label 
                        onClick={(e) => e.stopPropagation()} 
                        className="flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 cursor-pointer w-full h-full p-1 text-center" 
                        title="Attach Photo"
                      >
                        <Camera className="w-4 h-4 text-emerald-500/80" />
                        <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Attach</span>
                        <input type="file" accept="image/*" onChange={(e) => onCardImageUpload(enc, e)} className="hidden" />
                      </label>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDarkMode ? 'text-emerald-300' : 'text-[#113C24]'}`}>
                        {enc.id}
                      </span>
                      <span className={`px-2 py-0.2 text-[9px] font-extrabold rounded-full ${
                        enc.condition === 'Good' 
                          ? (isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800')
                          : (isDarkMode ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-amber-100 text-amber-800')
                      }`}>
                        {enc.condition}
                      </span>
                    </div>
                    <h4 className={`font-bold text-sm leading-tight truncate mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {enc.name}
                    </h4>
                    <p className={`text-[11px] font-semibold truncate mt-0.5 ${isDarkMode ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                      🏢 {enc.facility} • {enc.type}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center space-x-6 md:space-x-8 text-right pr-4 shrink-0">
                  <div className="text-left">
                    <span className={`text-[9px] uppercase tracking-wider block font-extrabold ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`}>
                      TEMP
                    </span>
                    <span className={`font-black text-xs mt-0.5 block ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                      {enc.temperature || '31°C'}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className={`text-[9px] uppercase tracking-wider block font-extrabold ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`}>
                      MAX CAPACITY
                    </span>
                    <span className={`font-black text-xs mt-0.5 block ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                      {enc.capacity} Animals
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pl-1.5 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectQrPass(enc);
                    }}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                      isDarkMode
                        ? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-700/80 text-emerald-300'
                        : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#113C24]'
                    }`}
                    title="View & Print QR Code Pass"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span className="hidden md:inline text-[11px]">QR Pass</span>
                  </button>
                  <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                    isDarkMode ? 'text-emerald-400' : 'text-slate-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEnclosures.map(enc => (
              <div 
                key={enc.id} 
                onClick={() => onSelectEnclosure(enc)}
                className={`p-4 rounded-2xl border transition-all hover:shadow-lg flex flex-col cursor-pointer hover:border-emerald-500/80 group ${
                  isDarkMode ? 'bg-[#04110A] border-emerald-900/40 text-slate-200 hover:bg-[#071F11]' : 'bg-slate-50/60 border-slate-200/80 text-slate-800 hover:bg-white'
                }`}
              >
                {enc.image ? (
                  <div className="w-full h-36 rounded-xl overflow-hidden mb-3.5 relative bg-slate-900 border border-slate-200/40 dark:border-emerald-900/40">
                    <img src={enc.image} alt={enc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-white border border-white/10 shadow-xs">
                      {enc.id}
                    </div>
                    <span className={`absolute top-2 right-2 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full backdrop-blur-md shadow-xs ${
                      enc.condition === 'Good' 
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-amber-500/90 text-white'
                    }`}>
                      {enc.condition}
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-28 rounded-xl border-2 border-dashed border-slate-300 dark:border-emerald-900/50 flex flex-col items-center justify-center p-2 mb-3.5 relative bg-slate-100/50 dark:bg-emerald-950/20">
                    <div className="flex items-center space-x-1.5 text-slate-400 dark:text-emerald-400 mb-1">
                      <Camera className="w-4 h-4" />
                      <span className="text-[11px] font-bold">No Photo Attached</span>
                    </div>
                    <label 
                      onClick={(e) => e.stopPropagation()} 
                      className="px-2.5 py-1 bg-[#113C24] text-white text-[10px] font-bold rounded-lg cursor-pointer hover:bg-[#1B5234] transition-all flex items-center space-x-1 shadow-2xs"
                    >
                      <span>Attach Photo</span>
                      <input type="file" accept="image/*" onChange={(e) => onCardImageUpload(enc, e)} className="hidden" />
                    </label>
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    {!enc.image && <span className={`text-[10px] font-bold font-mono block ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`}>{enc.id}</span>}
                    <h4 className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{enc.name}</h4>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${
                      isDarkMode 
                        ? 'bg-[#082916] border-emerald-800/60 text-emerald-300' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      🏢 {enc.facility}
                    </span>
                  </div>
                  {!enc.image && (
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                      enc.condition === 'Good' 
                        ? (isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800')
                        : (isDarkMode ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-amber-100 text-amber-800')
                    }`}>
                      {enc.condition}
                    </span>
                  )}
                </div>

                <div className={`grid grid-cols-2 gap-2 mt-3 pt-3 border-t ${
                  isDarkMode ? 'border-emerald-900/40' : 'border-slate-200'
                }`}>
                  <div className={`flex items-center space-x-2.5 p-2.5 rounded-xl border ${
                    isDarkMode 
                      ? 'bg-[#0A2917] border-emerald-800/50' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <div>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${
                        isDarkMode ? 'text-emerald-400' : 'text-slate-500'
                      }`}>TEMP</span>
                      <span className={`text-xs font-black ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>{enc.temperature || '31°C'}</span>
                    </div>
                  </div>

                  <div className={`flex items-center space-x-2.5 p-2.5 rounded-xl border ${
                    isDarkMode 
                      ? 'bg-[#0A2917] border-emerald-800/50' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${
                        isDarkMode ? 'text-emerald-400' : 'text-slate-500'
                      }`}>MAX CAPACITY</span>
                      <span className={`text-xs font-black ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>{enc.capacity} Animals</span>
                    </div>
                  </div>
                </div>

                <div className={`mt-3 pt-2.5 flex items-center justify-between text-[11px] font-semibold border-t ${
                  isDarkMode ? 'border-emerald-950 text-emerald-300/90' : 'border-slate-100 text-slate-600'
                }`}>
                  <span className="flex items-center space-x-1.5">
                    <Box className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{enc.type}</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectQrPass(enc);
                      }}
                      className={`px-2 py-0.5 rounded-lg border text-[10px] font-extrabold flex items-center space-x-1 cursor-pointer transition-all ${
                        isDarkMode
                          ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-700/80 text-emerald-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#113C24]'
                      }`}
                      title="View & Print QR Pass"
                    >
                      <QrCode className="w-3 h-3 text-emerald-400" />
                      <span>QR Pass</span>
                    </button>
                    <span className="flex items-center space-x-1 font-bold">
                      <Users className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>Cap: {enc.capacity}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredEnclosures.length > 0 && (
          <span className="text-[11px] text-slate-400 font-medium mt-4 block text-center">
            Showing {filteredEnclosures.length} of {enclosures.length} enclosures
          </span>
        )}
      </div>
    </div>
  );
};
export default AdminEnclosuresView;
