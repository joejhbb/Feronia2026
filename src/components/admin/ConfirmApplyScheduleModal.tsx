import React from 'react';
import { X, CheckCircle2, Shield, Utensils, Stethoscope, Calendar, Clock, Repeat, User, AlertCircle } from 'lucide-react';
import { Animal } from '../../types';

export interface ScheduleToConfirm {
  animal: Animal;
  targetAnimals: Animal[];
  scheduleType: 'both' | 'feeding' | 'care';
  foodItem: string;
  quantity: string;
  method: string;
  feedingFreq: string;
  feedingTime: string;
  feedingDate: string;
  feedingNotes: string;
  careTaskName: string;
  careFreq: string;
  careTime: string;
  careDate: string;
  careNotes: string;
  assignedKeeperId?: string;
  assignedKeeperName?: string;
  isSyncingSiblings?: boolean;
}

interface ConfirmApplyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleData: ScheduleToConfirm | null;
  onConfirm: () => void;
  isDarkMode?: boolean;
}

export const ConfirmApplyScheduleModal: React.FC<ConfirmApplyScheduleModalProps> = ({
  isOpen,
  onClose,
  scheduleData,
  onConfirm,
  isDarkMode = true
}) => {
  if (!isOpen || !scheduleData) return null;

  const {
    animal,
    targetAnimals,
    scheduleType,
    foodItem,
    quantity,
    method,
    feedingFreq,
    feedingTime,
    feedingDate,
    feedingNotes,
    careTaskName,
    careFreq,
    careTime,
    careDate,
    careNotes,
    assignedKeeperName,
    isSyncingSiblings
  } = scheduleData;

  const targetCount = targetAnimals && targetAnimals.length > 0 ? targetAnimals.length : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all ${
        isDarkMode ? 'bg-[#071F11] border-emerald-900/80 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between ${
          isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl text-emerald-400">
              📋
            </div>
            <div>
              <h3 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Confirm Feeding & Care Schedule
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-emerald-300/80' : 'text-slate-600'}`}>
                Please confirm before creating active task routines for keepers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Animals Banner */}
          <div className={`p-4 rounded-2xl border flex items-center space-x-3.5 ${
            isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <img
              src={animal.image || 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&q=80&w=200'}
              alt={animal.id}
              className="w-12 h-12 rounded-2xl object-cover border border-emerald-500/30 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-emerald-400 truncate">
                  {animal.id} - {animal.name || animal.species}
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {targetCount} {targetCount === 1 ? 'Specimen' : 'Specimens'}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {animal.species} • Enclosure: <strong className="text-emerald-300">{animal.enclosureId || 'Unassigned'}</strong>
              </p>
            </div>
          </div>

          {/* Assigned Keeper */}
          <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
            isDarkMode ? 'bg-[#04110A]/80 border-emerald-900/50' : 'bg-white border-slate-200'
          }`}>
            <span className="font-bold text-slate-400 flex items-center space-x-1.5">
              <span>👤</span>
              <span>Assigned Keeper:</span>
            </span>
            <span className="font-extrabold text-emerald-300">
              {assignedKeeperName || 'Duty Keepers / General Pool'}
            </span>
          </div>

          {/* Feeding Summary */}
          {(scheduleType === 'both' || scheduleType === 'feeding') && (
            <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
              isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-white border-slate-200 shadow-2xs'
            }`}>
              <div className="flex items-center space-x-2 font-bold text-emerald-400 pb-1.5 border-b border-emerald-900/40">
                <Utensils className="w-4 h-4" />
                <span className="uppercase tracking-wider">Feeding Task Parameters</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Food / Prey Item:</span>
                  <strong className="text-white dark:text-emerald-100">{foodItem || 'Standard Prey'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Portion & Method:</span>
                  <strong className="text-slate-200">{quantity || '1 portion'} ({method || 'Standard'})</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Frequency:</span>
                  <strong className="text-emerald-300">{feedingFreq || 'Daily'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Scheduled Time:</span>
                  <strong className="text-emerald-300">{feedingTime || '08:00 AM'} (Starts: {feedingDate})</strong>
                </div>
              </div>
              {feedingNotes && (
                <p className="text-[11px] text-slate-400 italic pt-1.5 border-t border-emerald-950/40">
                  "{feedingNotes}"
                </p>
              )}
            </div>
          )}

          {/* Care Summary */}
          {(scheduleType === 'both' || scheduleType === 'care') && (
            <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
              isDarkMode ? 'bg-[#04110A] border-teal-900/60' : 'bg-white border-slate-200 shadow-2xs'
            }`}>
              <div className="flex items-center space-x-2 font-bold text-teal-400 pb-1.5 border-b border-teal-900/40">
                <Stethoscope className="w-4 h-4" />
                <span className="uppercase tracking-wider">Care Routine Parameters</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Routine Task:</span>
                  <strong className="text-white dark:text-teal-100">{careTaskName || 'General Care'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Frequency & Time:</span>
                  <strong className="text-teal-300">{careFreq || 'Every 3 days'} at {careTime || '09:00 AM'}</strong>
                </div>
              </div>
              {careNotes && (
                <p className="text-[11px] text-slate-400 italic pt-1.5 border-t border-teal-950/40">
                  "{careNotes}"
                </p>
              )}
            </div>
          )}

          {/* Recycling notice */}
          <div className={`p-3 rounded-xl border flex items-center space-x-2.5 text-[11px] ${
            isDarkMode ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <span className="text-base">♻️</span>
            <span>
              {isSyncingSiblings
                ? `This schedule will be copied to ${targetCount - 1} other matching specimens of the same species and age stage.`
                : 'This configuration will also be saved as the reusable template for future specimens of this species.'}
            </span>
          </div>

          {/* Actions */}
          <div className={`pt-4 border-t flex items-center justify-between ${
            isDarkMode ? 'border-emerald-900/60' : 'border-slate-100'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                isDarkMode ? 'border-emerald-900/60 text-slate-300 hover:bg-emerald-950/60' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-6 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Confirm & Apply Schedule ✓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
