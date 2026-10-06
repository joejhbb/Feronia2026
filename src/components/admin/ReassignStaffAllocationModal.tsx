import React, { useState, useMemo } from 'react';
import { 
  X, 
  PawPrint, 
  Search, 
  Sparkles, 
  Check, 
  Building2, 
  Home, 
  CheckSquare, 
  Square, 
  Filter, 
  Layers, 
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { StaffMember, Animal, Enclosure } from '../../types';

interface ReassignStaffAllocationModalProps {
  keeper: StaffMember;
  animals: Animal[];
  enclosures: Enclosure[];
  isDarkMode: boolean;
  onClose: () => void;
  onSave: (assignedAnimalIds: string[], assignedEnclosureIds: string[]) => void;
}

export const ReassignStaffAllocationModal: React.FC<ReassignStaffAllocationModalProps> = ({
  keeper,
  animals,
  enclosures,
  isDarkMode,
  onClose,
  onSave
}) => {
  // Guard: Veterinarians cannot be assigned to animals or enclosures
  if (keeper.role === 'vet') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className={`w-full max-w-md rounded-3xl p-6 text-center space-y-4 shadow-2xl border ${
          isDarkMode ? 'bg-[#071F11] border-emerald-950 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold">
            Veterinarian Assignment Policy
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Staff member <strong>{keeper.name}</strong> holds the role of <strong>Veterinarian</strong>. Under sanctuary policy, veterinarians manage clinical examinations and medical treatments across all species and cannot be assigned to specific animals or enclosures.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    );
  }

  // Mode: select by animals or select by enclosures
  const [activeTab, setActiveTab] = useState<'animals' | 'enclosures'>('animals');

  // Currently assigned animals initial state
  const initialAnimalIds = useMemo(() => {
    if (keeper.assignedAnimalIds && keeper.assignedAnimalIds.length > 0) {
      return keeper.assignedAnimalIds;
    }
    return animals
      .filter(a => a.assignedKeeperId === keeper.id || (a.assignedKeeperName && a.assignedKeeperName.toLowerCase() === keeper.name.toLowerCase()))
      .map(a => a.id);
  }, [keeper, animals]);

  // Initial assigned enclosures
  const initialEnclosureIds = useMemo(() => {
    if (keeper.assignedEnclosureIds && keeper.assignedEnclosureIds.length > 0) {
      return keeper.assignedEnclosureIds;
    }
    // Infer enclosures from assigned animals
    const encIds = new Set<string>();
    animals.forEach(a => {
      if (initialAnimalIds.includes(a.id) && a.enclosureId) {
        encIds.add(a.enclosureId);
      }
    });
    return Array.from(encIds);
  }, [keeper, animals, initialAnimalIds]);

  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>(initialAnimalIds);
  const [selectedEnclosureIds, setSelectedEnclosureIds] = useState<string[]>(initialEnclosureIds);

  // Search queries
  const [animalSearchQuery, setAnimalSearchQuery] = useState('');
  const [enclosureSearchQuery, setEnclosureSearchQuery] = useState('');

  // Animal filter
  const [animalFilter, setAnimalFilter] = useState<'all' | 'mine' | 'unallocated'>('all');

  // Target count for quick allocation
  const [targetCount, setTargetCount] = useState<number>(selectedAnimalIds.length > 0 ? selectedAnimalIds.length : 3);

  // Active reptiles (non-archived)
  const activeAnimals = useMemo(() => animals.filter(a => !a.isArchived), [animals]);

  // Filtered animals list
  const filteredAnimals = useMemo(() => {
    return activeAnimals.filter(animal => {
      const q = animalSearchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        animal.id.toLowerCase().includes(q) ||
        (animal.name && animal.name.toLowerCase().includes(q)) ||
        (animal.species && animal.species.toLowerCase().includes(q)) ||
        (animal.morph && animal.morph.toLowerCase().includes(q)) ||
        (animal.enclosureId && animal.enclosureId.toLowerCase().includes(q));

      const isCurrentForThisKeeper = 
        animal.assignedKeeperId === keeper.id ||
        (animal.assignedKeeperName && animal.assignedKeeperName.toLowerCase() === keeper.name.toLowerCase());
      const isUnallocated = !animal.assignedKeeperId && !animal.assignedKeeperName;

      let matchFilter = true;
      if (animalFilter === 'mine') {
        matchFilter = isCurrentForThisKeeper || selectedAnimalIds.includes(animal.id);
      } else if (animalFilter === 'unallocated') {
        matchFilter = isUnallocated;
      }

      return matchSearch && matchFilter;
    });
  }, [activeAnimals, animalSearchQuery, animalFilter, keeper, selectedAnimalIds]);

  // Filtered enclosures list
  const filteredEnclosures = useMemo(() => {
    return enclosures.filter(enc => {
      const q = enclosureSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        enc.id.toLowerCase().includes(q) ||
        enc.name.toLowerCase().includes(q) ||
        (enc.facility && enc.facility.toLowerCase().includes(q)) ||
        (enc.type && enc.type.toLowerCase().includes(q))
      );
    });
  }, [enclosures, enclosureSearchQuery]);

  // Toggle individual animal
  const handleToggleAnimal = (animalId: string) => {
    const animal = animals.find(a => a.id === animalId);
    setSelectedAnimalIds(prev => {
      const isCurrentlySelected = prev.includes(animalId);
      const next = isCurrentlySelected
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId];

      // If selecting animal, ensure its enclosure is also included in selected enclosures
      if (!isCurrentlySelected && animal?.enclosureId) {
        setSelectedEnclosureIds(ePrev => Array.from(new Set([...ePrev, animal.enclosureId!])));
      }
      return next;
    });
  };

  // Toggle whole enclosure
  const handleToggleEnclosure = (enclosureId: string) => {
    const animalsInEnclosure = activeAnimals.filter(a => a.enclosureId === enclosureId);
    const animalIdsInEnclosure = animalsInEnclosure.map(a => a.id);
    const isEncSelected = selectedEnclosureIds.includes(enclosureId);

    if (isEncSelected) {
      // Deselect enclosure and its animals
      setSelectedEnclosureIds(prev => prev.filter(id => id !== enclosureId));
      if (animalIdsInEnclosure.length > 0) {
        setSelectedAnimalIds(prev => prev.filter(id => !animalIdsInEnclosure.includes(id)));
      }
    } else {
      // Select enclosure and all animals housed in it
      setSelectedEnclosureIds(prev => Array.from(new Set([...prev, enclosureId])));
      if (animalIdsInEnclosure.length > 0) {
        setSelectedAnimalIds(prev => Array.from(new Set([...prev, ...animalIdsInEnclosure])));
      }
    }
  };

  // Quick auto select by count
  const handleAutoSelectCount = (count: number) => {
    // Prefer unallocated animals first, then animals already assigned to this keeper
    const unallocated = activeAnimals.filter(a => !a.assignedKeeperId && !a.assignedKeeperName);
    const mine = activeAnimals.filter(a => 
      a.assignedKeeperId === keeper.id || 
      (a.assignedKeeperName && a.assignedKeeperName.toLowerCase() === keeper.name.toLowerCase())
    );
    const others = activeAnimals.filter(a => !unallocated.includes(a) && !mine.includes(a));

    const pool = [...mine, ...unallocated, ...others];
    const newSelected = pool.slice(0, count).map(a => a.id);
    setSelectedAnimalIds(newSelected);
    setTargetCount(count);

    // Update enclosures
    const encIds = new Set<string>();
    animals.forEach(a => {
      if (newSelected.includes(a.id) && a.enclosureId) {
        encIds.add(a.enclosureId);
      }
    });
    setSelectedEnclosureIds(Array.from(encIds));
  };

  // Select all animals
  const handleSelectAllAnimals = () => {
    const allIds = activeAnimals.map(a => a.id);
    setSelectedAnimalIds(allIds);
    setTargetCount(allIds.length);
    const allEnc = enclosures.map(e => e.id);
    setSelectedEnclosureIds(allEnc);
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedAnimalIds([]);
    setSelectedEnclosureIds([]);
    setTargetCount(0);
  };

  // Save handler
  const handleSave = () => {
    onSave(selectedAnimalIds, selectedEnclosureIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div 
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border transition-all overflow-hidden bg-white dark:bg-[#071F11] border-slate-200 dark:border-emerald-800/80 text-slate-900 dark:text-white animate-scale-in"
      >
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-emerald-900/60 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-[#04140b]/90">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Staff Allocation & Reassignment
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  {keeper.role}
                </span>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                Keeper: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{keeper.name}</strong> 
                <span className="text-slate-600 dark:text-slate-300 font-mono ml-1.5 font-semibold">({keeper.email})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-emerald-950 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS: SELECT BY REPTILES vs SELECT BY ENCLOSURES */}
        <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-200 dark:border-emerald-950 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#05170d]">
          <div className="flex items-center space-x-2 bg-slate-200/80 dark:bg-[#030e07] p-1 rounded-2xl border border-slate-300 dark:border-emerald-950">
            <button
              type="button"
              onClick={() => setActiveTab('animals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'animals'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                  : 'text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-300'
              }`}
            >
              <PawPrint className="w-4 h-4" />
              <span>Select Reptiles ({selectedAnimalIds.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('enclosures')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'enclosures'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                  : 'text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-300'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Select Enclosures ({selectedEnclosureIds.length})</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-800 dark:text-slate-200 font-bold">Selected:</span>
            <span className="font-black px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40">
              {selectedAnimalIds.length} Animals
            </span>
            <span className="font-black px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/40">
              {selectedEnclosureIds.length} Enclosures
            </span>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE CONTENT) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* TAB 1: SELECT BY ANIMALS */}
          {activeTab === 'animals' && (
            <div className="space-y-4">
              {/* Quick Allocation Controls */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#04140b] border border-slate-300 dark:border-emerald-900/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Quick Allocation by Count:</span>
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {[1, 2, 3, 5, 8].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => handleAutoSelectCount(cnt)}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          selectedAnimalIds.length === cnt
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-emerald-950 text-slate-900 dark:text-emerald-200 border border-slate-300 dark:border-emerald-800/80 hover:border-emerald-500'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSelectAllAnimals}
                      className="px-3 py-1 rounded-xl text-xs font-black bg-white dark:bg-emerald-950 text-slate-900 dark:text-emerald-200 border border-slate-300 dark:border-emerald-800/80 hover:border-emerald-500 cursor-pointer"
                    >
                      All ({activeAnimals.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2.5 py-1 rounded-xl text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Search & Filter pills */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={animalSearchQuery}
                      onChange={(e) => setAnimalSearchQuery(e.target.value)}
                      placeholder="Search animals by name, ID, species, morph..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#030e07] border border-slate-300 dark:border-emerald-900/80 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAnimalFilter('all')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        animalFilter === 'all'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-[#030e07] border border-slate-300 dark:border-emerald-900 text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-300'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnimalFilter('mine')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        animalFilter === 'mine'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-[#030e07] border border-slate-300 dark:border-emerald-900 text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-300'
                      }`}
                    >
                      Assigned ({selectedAnimalIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnimalFilter('unallocated')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        animalFilter === 'unallocated'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-[#030e07] border border-slate-300 dark:border-emerald-900 text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-300'
                      }`}
                    >
                      Unallocated
                    </button>
                  </div>
                </div>
              </div>

              {/* Reptiles List Container */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredAnimals.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-emerald-950 space-y-2">
                    <PawPrint className="w-8 h-8 text-slate-500 dark:text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">No reptiles match your filter</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Try clearing your search query or switching filters.</p>
                  </div>
                ) : (
                  filteredAnimals.map(animal => {
                    const isSelected = selectedAnimalIds.includes(animal.id);
                    const isCurrentForThisKeeper = 
                      animal.assignedKeeperId === keeper.id ||
                      (animal.assignedKeeperName && animal.assignedKeeperName.toLowerCase() === keeper.name.toLowerCase());
                    const isOtherKeeper = 
                      animal.assignedKeeperName && 
                      animal.assignedKeeperName.toLowerCase() !== keeper.name.toLowerCase();

                    // Find enclosure name
                    const enc = enclosures.find(e => e.id === animal.enclosureId);
                    const encName = enc ? `${enc.name || enc.id}` : animal.enclosureId || 'No Enclosure';

                    // Display name guarantee (Never blank!)
                    const mainTitle = animal.name ? animal.name : (animal.species || 'Unnamed Reptile');

                    return (
                      <div
                        key={animal.id}
                        onClick={() => handleToggleAnimal(animal.id)}
                        className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-500/15 dark:bg-[#082a17] border-emerald-500 ring-1 ring-emerald-500 shadow-md shadow-emerald-950/30'
                            : 'bg-white dark:bg-[#051c10] border-slate-200 dark:border-emerald-900/50 hover:border-emerald-500/60 hover:bg-slate-50 dark:hover:bg-[#072415]'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 min-w-0">
                          {/* Checkbox indicator */}
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected 
                              ? 'bg-emerald-600 text-white' 
                              : 'border-2 border-slate-400 dark:border-emerald-800 bg-white dark:bg-emerald-950/60'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          {/* Animal thumbnail */}
                          {animal.image ? (
                            <img
                              src={animal.image}
                              alt={mainTitle}
                              className="w-10 h-10 rounded-xl object-cover border border-emerald-500/30 shrink-0 shadow-xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-sm font-bold shrink-0">
                              🐾
                            </div>
                          )}

                          {/* Text information - HIGH CONTRAST & CRISP! */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                                {mainTitle}
                              </span>
                              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-emerald-500/20 dark:bg-emerald-950 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shrink-0">
                                {animal.id}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-slate-800 dark:text-slate-100 font-semibold">
                              <span>
                                {animal.species} {animal.morph ? `• ${animal.morph}` : ''}
                              </span>
                              <span className="text-slate-400 dark:text-slate-500">•</span>
                              <span className="text-emerald-800 dark:text-emerald-300 font-bold flex items-center space-x-1">
                                <Home className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="truncate">{encName}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right side status badge - HIGH CONTRAST! */}
                        <div className="shrink-0 flex items-center space-x-2">
                          {isCurrentForThisKeeper ? (
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200">
                              Assigned to {keeper.name.split(' ')[0]}
                            </span>
                          ) : isOtherKeeper ? (
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200">
                              Keeper: {animal.assignedKeeperName}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                              Unallocated
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SELECT BY ENCLOSURES */}
          {activeTab === 'enclosures' && (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs flex items-start space-x-2.5">
                <Home className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sky-900 dark:text-sky-300">
                    Assign entire enclosures to this keeper
                  </p>
                  <p className="text-[11px] text-slate-800 dark:text-slate-200 mt-0.5 font-medium">
                    Selecting an enclosure will automatically allocate all reptiles housed inside that habitat to <strong className="text-slate-900 dark:text-white">{keeper.name}</strong>.
                  </p>
                </div>
              </div>

              {/* Enclosure Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={enclosureSearchQuery}
                  onChange={(e) => setEnclosureSearchQuery(e.target.value)}
                  placeholder="Search enclosures by name, ID, facility, or species..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-[#030e07] border border-slate-300 dark:border-emerald-900/80 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Enclosures Cards */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredEnclosures.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-emerald-950 space-y-2">
                    <Home className="w-8 h-8 text-slate-500 dark:text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">No enclosures found</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Try searching for a different enclosure name or facility.</p>
                  </div>
                ) : (
                  filteredEnclosures.map(enclosure => {
                    const housedAnimals = activeAnimals.filter(a => a.enclosureId === enclosure.id);
                    const selectedHousedCount = housedAnimals.filter(a => selectedAnimalIds.includes(a.id)).length;
                    const isAllHousedSelected = housedAnimals.length > 0 && selectedHousedCount === housedAnimals.length;
                    const isPartiallySelected = selectedHousedCount > 0 && !isAllHousedSelected;

                    return (
                      <div
                        key={enclosure.id}
                        onClick={() => handleToggleEnclosure(enclosure.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isAllHousedSelected
                            ? 'bg-emerald-500/15 dark:bg-[#082a17] border-emerald-500 ring-1 ring-emerald-500 shadow-md shadow-emerald-950/30'
                            : isPartiallySelected
                            ? 'bg-sky-500/10 dark:bg-[#062024] border-sky-500/50'
                            : 'bg-white dark:bg-[#051c10] border-slate-200 dark:border-emerald-900/50 hover:border-emerald-500/60 hover:bg-slate-50 dark:hover:bg-[#072415]'
                        }`}
                      >
                        <div className="flex items-start space-x-3.5 min-w-0">
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isAllHousedSelected
                              ? 'bg-emerald-600 text-white'
                              : isPartiallySelected
                              ? 'bg-sky-600 text-white'
                              : 'border-2 border-slate-400 dark:border-emerald-800 bg-white dark:bg-emerald-950/60'
                          }`}>
                            {isAllHousedSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            {isPartiallySelected && <span className="w-2.5 h-0.5 bg-white rounded-full" />}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {enclosure.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-emerald-500/20 dark:bg-emerald-950 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300">
                                {enclosure.id}
                              </span>
                              {enclosure.facility && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-emerald-950 border border-slate-300 dark:border-emerald-800 text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                                  <Building2 className="w-3 h-3 text-emerald-500" />
                                  <span>{enclosure.facility}</span>
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-800 dark:text-slate-100 font-medium">
                              <span>Type: <strong className="text-slate-900 dark:text-white font-bold">{enclosure.type}</strong></span>
                              <span>•</span>
                              <span>Climate: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{enclosure.temperature || 'Ambient'} {enclosure.humidity ? `• ${enclosure.humidity}` : ''}</strong></span>
                              <span>•</span>
                              <span>Condition: <strong className="text-slate-900 dark:text-white font-bold">{enclosure.condition}</strong></span>
                            </div>

                            {/* Reptiles in this enclosure preview */}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {housedAnimals.length === 0 ? (
                                <span className="text-[11px] text-slate-600 dark:text-slate-300 italic font-medium">
                                  No reptiles currently housed
                                </span>
                              ) : (
                                housedAnimals.map(anim => {
                                  const isAnimSelected = selectedAnimalIds.includes(anim.id);
                                  return (
                                    <span
                                      key={anim.id}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center space-x-1 ${
                                        isAnimSelected
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : 'bg-slate-100 dark:bg-emerald-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-emerald-800'
                                      }`}
                                    >
                                      <span>🐾 {anim.name || anim.id}</span>
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right side summary pill */}
                        <div className="shrink-0 flex items-center space-x-2 self-end sm:self-center">
                          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                            isAllHousedSelected
                              ? 'bg-emerald-600 text-white'
                              : isPartiallySelected
                              ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40 font-black'
                              : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                          }`}>
                            {selectedHousedCount} of {housedAnimals.length} Selected
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER - ACTION BUTTONS */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-emerald-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-[#04140b]">
          <div className="text-xs text-slate-800 dark:text-slate-200 font-medium text-center sm:text-left">
            Total assignment: <strong className="text-emerald-700 dark:text-emerald-300 font-black">{selectedAnimalIds.length} Reptiles</strong> across <strong className="text-sky-700 dark:text-sky-300 font-black">{selectedEnclosureIds.length} Enclosures</strong>.
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-emerald-950 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#059669] hover:bg-[#047857] active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Allocation ({selectedAnimalIds.length} Animals, {selectedEnclosureIds.length} Enclosures)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
