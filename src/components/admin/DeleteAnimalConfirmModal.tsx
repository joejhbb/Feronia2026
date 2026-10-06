import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  Skull,
  Truck,
  FileText,
  X,
  Calendar,
  Info,
  RotateCcw,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { Animal } from '../../types';

export type ArchiveCategoryType = 'Mortality' | 'Transferred' | 'Deleted' | 'Others';

export interface DeleteConfirmData {
  category: ArchiveCategoryType;
  reason: string;
  date: string;
  notes?: string;
  mortalityCause?: string;
  isPermanentHardDelete?: boolean;
}

interface DeleteAnimalConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: Animal | null;
  onConfirmArchive: (animal: Animal, data: DeleteConfirmData) => void;
  onConfirmPermanentDelete?: (animalId: string) => void;
  isDarkMode?: boolean;
}

export const DeleteAnimalConfirmModal: React.FC<DeleteAnimalConfirmModalProps> = ({
  isOpen,
  onClose,
  animal,
  onConfirmArchive,
  onConfirmPermanentDelete,
  isDarkMode = true
}) => {
  const [category, setCategory] = useState<ArchiveCategoryType>('Deleted');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Mortality specific
  const [mortalityCause, setMortalityCause] = useState('Illness / Clinical Infection');
  const [customMortalityCause, setCustomMortalityCause] = useState('');
  const [mortalityNotes, setMortalityNotes] = useState('');
  
  // Delete / Mistake specific
  const [deleteReason, setDeleteReason] = useState('Mistake / Test Entry');
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  const [deleteNotes, setDeleteNotes] = useState('');
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);

  // Others specific
  const [otherReason, setOtherReason] = useState('');
  const [otherNotes, setOtherNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCategory('Deleted');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setMortalityCause('Illness / Clinical Infection');
      setCustomMortalityCause('');
      setMortalityNotes('');
      setDeleteReason('Mistake / Test Entry');
      setCustomDeleteReason('');
      setDeleteNotes('');
      setIsPermanentDelete(false);
      setOtherReason('');
      setOtherNotes('');
    }
  }, [isOpen, animal]);

  if (!isOpen || !animal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (category === 'Deleted' && isPermanentDelete) {
      if (onConfirmPermanentDelete) {
        onConfirmPermanentDelete(animal.id);
      }
      onClose();
      return;
    }

    let finalReason = '';
    let finalNotes = '';

    if (category === 'Mortality') {
      const cause = mortalityCause === 'Others' ? (customMortalityCause.trim() || 'Other Cause') : mortalityCause;
      finalReason = `Mortality: ${cause}`;
      finalNotes = mortalityNotes.trim();
    } else if (category === 'Deleted') {
      const delReason = deleteReason === 'Others' ? (customDeleteReason.trim() || 'Other Removal Reason') : deleteReason;
      finalReason = `Admin Removed: ${delReason}`;
      finalNotes = deleteNotes.trim();
    } else {
      finalReason = otherReason.trim() ? `Archived: ${otherReason.trim()}` : 'Archived: Other Reason';
      finalNotes = otherNotes.trim();
    }

    onConfirmArchive(animal, {
      category,
      reason: finalReason,
      date: effectiveDate,
      notes: finalNotes,
      mortalityCause: category === 'Mortality' ? (mortalityCause === 'Others' ? customMortalityCause.trim() || 'Other Cause' : mortalityCause) : undefined,
      isPermanentHardDelete: false
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className={`max-w-xl w-full rounded-3xl p-6 shadow-2xl border transition-all my-auto ${
          isDarkMode
            ? 'bg-[#061B10] border-emerald-950/80 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-emerald-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-500/15 text-rose-500 rounded-xl border border-rose-500/25">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Remove / Archive Animal Record</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Confirm removal reason and archival options
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmation Question Banner */}
        <div className="my-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-800 dark:text-amber-300">
              Are you sure you want to remove or archive this animal?
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Archiving removes the animal from the active registry while safely retaining its complete medical, feeding, and biological history in <strong>Archive Records</strong> categorized by removal reason.
            </p>
          </div>
        </div>

        {/* Animal Summary Card */}
        <div className={`p-3.5 rounded-2xl border flex items-center space-x-3 mb-4 ${
          isDarkMode ? 'bg-[#04110A] border-emerald-950' : 'bg-slate-50 border-slate-200'
        }`}>
          {animal.image || animal.photoUrl ? (
            <img
              src={animal.image || animal.photoUrl}
              alt={animal.name || animal.species}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-emerald-900 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-sm shrink-0">
              {animal.sex === 'Female' ? '♀' : '♂'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                {animal.name || animal.species}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {animal.id}
              </span>
            </div>
            <div className="text-xs text-slate-400 truncate mt-0.5">
              {animal.species} {animal.morph ? `• ${animal.morph}` : ''} • {animal.sex}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Enclosure: <strong className="text-slate-700 dark:text-slate-300">{animal.enclosureId || 'None assigned'}</strong>
            </div>
          </div>
        </div>

        {/* Form with Reason Category Selection */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select Removal Reason Category *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Mortality */}
              <button
                type="button"
                onClick={() => setCategory('Mortality')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  category === 'Mortality'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-300 shadow-sm ring-1 ring-rose-500'
                    : isDarkMode
                    ? 'bg-[#04110A] border-emerald-950/80 text-slate-300 hover:border-emerald-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-500">
                    <Skull className="w-4 h-4" />
                  </div>
                  {category === 'Mortality' && <CheckCircle2 className="w-4 h-4 text-rose-500" />}
                </div>
                <div>
                  <strong className="text-xs block">Mortality</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Deceased / Clinical loss</span>
                </div>
              </button>

              {/* Option 2: Just Delete / Mistake */}
              <button
                type="button"
                onClick={() => setCategory('Deleted')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  category === 'Deleted'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-300 shadow-sm ring-1 ring-amber-500'
                    : isDarkMode
                    ? 'bg-[#04110A] border-emerald-950/80 text-slate-300 hover:border-emerald-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-500">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  {category === 'Deleted' && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                </div>
                <div>
                  <strong className="text-xs block">Just Delete / Mistake</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Duplicate or test entry</span>
                </div>
              </button>

              {/* Option 3: Others */}
              <button
                type="button"
                onClick={() => setCategory('Others')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  category === 'Others'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500'
                    : isDarkMode
                    ? 'bg-[#04110A] border-emerald-950/80 text-slate-300 hover:border-emerald-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-500">
                    <FileText className="w-4 h-4" />
                  </div>
                  {category === 'Others' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
                <div>
                  <strong className="text-xs block">Others / Special</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Special administrative</span>
                </div>
              </button>
            </div>
          </div>

          {/* Date of Event */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Effective Date *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={e => setEffectiveDate(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                  isDarkMode
                    ? 'bg-[#04110A] border-emerald-950 text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-600'
                }`}
              />
            </div>
          </div>

          {/* Dynamic Section: MORTALITY */}
          {category === 'Mortality' && (
            <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
              <div>
                <label className="block font-bold text-rose-700 dark:text-rose-300 mb-1">
                  Primary Cause of Mortality *
                </label>
                <select
                  value={mortalityCause}
                  onChange={e => setMortalityCause(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-rose-900/60 text-rose-200' : 'bg-white border-rose-200 text-rose-900'
                  }`}
                >
                  <option value="Illness / Clinical Infection">Illness / Clinical Infection (e.g. RI, Parasites)</option>
                  <option value="Natural Causes / Old Age">Natural Causes / Old Age</option>
                  <option value="Egg Binding / Dystocia">Egg Binding / Dystocia (Reproductive)</option>
                  <option value="Trauma / Accidental Injury">Trauma / Accidental Injury</option>
                  <option value="Failure to Thrive / Neonatal">Failure to Thrive / Neonatal Loss</option>
                  <option value="Sudden Undetermined Loss">Sudden Undetermined Loss</option>
                  <option value="Sent for Necropsy / Lab Testing">Sent for Necropsy / Laboratory Testing</option>
                  <option value="Others">Others (Specify Custom Cause)</option>
                </select>

                {mortalityCause === 'Others' && (
                  <div className="mt-2.5">
                    <label className="block font-bold text-rose-700 dark:text-rose-300 text-[11px] mb-1">
                      Specify Custom Mortality Cause *
                    </label>
                    <input
                      type="text"
                      required
                      value={customMortalityCause}
                      onChange={e => setCustomMortalityCause(e.target.value)}
                      placeholder="e.g. Severe Dehydration, Genetic Deformity..."
                      className={`w-full p-2.5 rounded-xl border outline-none text-xs ${
                        isDarkMode
                          ? 'bg-[#04110A] border-rose-900/40 text-white placeholder-slate-500'
                          : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                      }`}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Necropsy & Clinical Notes (Remarks)
                </label>
                <textarea
                  rows={2}
                  value={mortalityNotes}
                  onChange={e => setMortalityNotes(e.target.value)}
                  placeholder="e.g. Post-mortem necropsy findings, observed symptoms prior to passing, body disposal details..."
                  className={`w-full p-2.5 rounded-xl border outline-none text-xs ${
                    isDarkMode
                      ? 'bg-[#04110A] border-rose-900/40 text-white placeholder-slate-500'
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Dynamic Section: JUST DELETE / MISTAKE */}
          {category === 'Deleted' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
              <div>
                <label className="block font-bold text-amber-700 dark:text-amber-300 mb-1">
                  Deletion Reason *
                </label>
                <select
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-amber-900/60 text-amber-200' : 'bg-white border-amber-200 text-amber-900'
                  }`}
                >
                  <option value="Mistake / Test Entry">Mistake / Test Entry (Testing only)</option>
                  <option value="Duplicate Animal Entry">Duplicate Animal Entry</option>
                  <option value="Wrong Identification / Invalid Data">Wrong Identification / Invalid Data</option>
                  <option value="Administrative Removal">Administrative Removal</option>
                  <option value="Others">Others (Specify Custom Reason)</option>
                </select>

                {deleteReason === 'Others' && (
                  <div className="mt-2.5">
                    <label className="block font-bold text-amber-700 dark:text-amber-300 text-[11px] mb-1">
                      Specify Custom Deletion Reason *
                    </label>
                    <input
                      type="text"
                      required
                      value={customDeleteReason}
                      onChange={e => setCustomDeleteReason(e.target.value)}
                      placeholder="e.g. Record entered under incorrect facility section..."
                      className={`w-full p-2.5 rounded-xl border outline-none text-xs ${
                        isDarkMode
                          ? 'bg-[#04110A] border-amber-900/40 text-white placeholder-slate-500'
                          : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                      }`}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Notes & Remarks
                </label>
                <textarea
                  rows={2}
                  value={deleteNotes}
                  onChange={e => setDeleteNotes(e.target.value)}
                  placeholder="e.g. Record created during initial testing; replacing with true specimen ID..."
                  className={`w-full p-2.5 rounded-xl border outline-none text-xs ${
                    isDarkMode
                      ? 'bg-[#04110A] border-amber-900/40 text-white placeholder-slate-500'
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Dynamic Section: OTHERS / SPECIAL */}
          {category === 'Others' && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <div>
                <label className="block font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                  Specific Reason / Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={otherReason}
                  onChange={e => setOtherReason(e.target.value)}
                  placeholder="e.g. Special Research Program, Sanctuary Quarantine, Administrative Archive..."
                  className={`w-full p-2.5 rounded-xl border outline-none text-xs ${
                    isDarkMode
                      ? 'bg-[#04110A] border-emerald-900/40 text-white placeholder-slate-500'
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Administrative Notes & Legal Documentation
                </label>
                <textarea
                  rows={2}
                  value={otherNotes}
                  onChange={e => setOtherNotes(e.target.value)}
                  placeholder="e.g. Approved under Special Permit #004; specimen remains tracked in archive..."
                  className={`w-full p-2.5 rounded-xl border outline-none text-xs ${
                    isDarkMode
                      ? 'bg-[#04110A] border-emerald-900/40 text-white placeholder-slate-500'
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-emerald-950/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center space-x-1.5 transition-all ${
                category === 'Mortality'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : category === 'Deleted'
                  ? isPermanentDelete ? 'bg-red-700 hover:bg-red-800' : 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {category === 'Mortality' && <Skull className="w-3.5 h-3.5" />}
              {category === 'Deleted' && <Trash2 className="w-3.5 h-3.5" />}
              {category === 'Others' && <FileText className="w-3.5 h-3.5" />}
              <span>
                {category === 'Mortality'
                  ? 'Record Mortality & Archive'
                  : category === 'Deleted'
                  ? isPermanentDelete ? 'Permanently Delete' : 'Archive to Deleted Records'
                  : 'Save to Archive Records'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
