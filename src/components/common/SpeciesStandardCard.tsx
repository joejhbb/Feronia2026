import React from 'react';
import { Award, Calendar, Thermometer, Droplets, Clock, Egg, Sparkles, Sun, Moon, AlertCircle, Compass } from 'lucide-react';
import { SpeciesBreedingStandard, SPECIES_CLIMATE_PRESETS } from '../../utils/breedingStandards';

interface SpeciesStandardCardProps {
  standard: SpeciesBreedingStandard;
  isDarkMode?: boolean;
  compact?: boolean;
}

export const SpeciesStandardCard: React.FC<SpeciesStandardCardProps> = ({
  standard,
  isDarkMode = true,
  compact = false
}) => {
  const climatePreset = SPECIES_CLIMATE_PRESETS[standard.code];

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      isDarkMode
        ? 'bg-[#04140D] border-emerald-900/60 text-slate-100 shadow-lg shadow-black/20'
        : 'bg-emerald-50/40 border-emerald-200/80 text-slate-800 shadow-md shadow-emerald-900/5'
    }`}>
      {/* Header Banner */}
      <div className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 ${
        isDarkMode ? 'bg-[#061d13] border-emerald-900/50' : 'bg-emerald-100/60 border-emerald-200'
      }`}>
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Award className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 dark:text-emerald-400 block leading-tight">
              Official Species Standard
            </span>
            <h4 className="text-xs font-black truncate text-slate-900 dark:text-white">
              {standard.name} <span className="text-[11px] font-normal italic text-slate-400">({standard.scientificName})</span>
            </h4>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
            {standard.taxonomicFamily}
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-emerald-950 text-slate-700 dark:text-emerald-400 border border-slate-300 dark:border-emerald-900/80">
            {standard.code}
          </span>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-3 space-y-2.5">
        {/* Sex-Specific Readiness Requirements */}
        <div>
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 block">
            Minimum Breeding Thresholds
          </span>
          <div className="grid grid-cols-2 gap-2">
            {/* Female Thresholds */}
            <div className={`p-2.5 rounded-xl border ${
              isDarkMode 
                ? 'bg-[#072417]/70 border-rose-950/40 text-slate-200' 
                : 'bg-rose-50/60 border-rose-100 text-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black text-rose-500 dark:text-rose-400 flex items-center space-x-1">
                  <span>♀ Female</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20">
                  Dam
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Min Age:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{standard.minAgeTextFemale}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Min Wt:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{standard.minWeightTextFemale}</span>
                </div>
              </div>
            </div>

            {/* Male Thresholds */}
            <div className={`p-2.5 rounded-xl border ${
              isDarkMode 
                ? 'bg-[#072417]/70 border-sky-950/40 text-slate-200' 
                : 'bg-sky-50/60 border-sky-100 text-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black text-sky-500 dark:text-sky-400 flex items-center space-x-1">
                  <span>♂ Male</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20">
                  Sire
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Min Age:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{standard.minAgeTextMale}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Min Wt:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{standard.minWeightTextMale}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Behavioral Indicators to Watch For */}
        {standard.preLayBehavioralIndicators && (
          <div className={`p-2.5 rounded-xl border text-[11px] ${
            isDarkMode 
              ? 'bg-[#151206] border-amber-900/50 text-amber-200/90' 
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}>
            <span className="text-[10px] uppercase font-black tracking-wider text-amber-500 dark:text-amber-400 block mb-1 flex items-center space-x-1">
              <span>⚠️ Pre-Lay Behavioral Indicators:</span>
            </span>
            <p className="italic text-[10.5px] leading-relaxed">
              "{standard.preLayBehavioralIndicators}"
            </p>
          </div>
        )}

        {/* Climate & Temperature Conditioning Standard */}
        <div className={`p-2.5 rounded-xl border text-[11px] space-y-1.5 ${
          isDarkMode ? 'bg-[#031008] border-emerald-950/90 text-slate-300' : 'bg-emerald-50/50 border-emerald-200/70 text-slate-800'
        }`}>
          <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-wider text-emerald-500 dark:text-emerald-400">
            <span className="flex items-center space-x-1">
              <Thermometer className="w-3 h-3 text-cyan-400" />
              <span>Climate Conditioning &amp; Temp Parameters</span>
            </span>
            <span className="text-slate-400 font-mono font-bold lowercase">{standard.brumationCoolingRequired}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10.5px]">
            <div className="p-1.5 rounded-lg bg-black/20 dark:bg-black/30 border border-emerald-900/30">
              <span className="text-[9px] text-slate-400 block">Cooling Temp</span>
              <strong className="text-cyan-400 text-[11px]">{standard.coolingTempRange || 'N/A'}</strong>
            </div>
            <div className="p-1.5 rounded-lg bg-black/20 dark:bg-black/30 border border-emerald-900/30">
              <span className="text-[9px] text-slate-400 block">Cooling Duration</span>
              <strong className="text-emerald-400 text-[11px]">{standard.coolingDuration || 'N/A'}</strong>
            </div>
            <div className="p-1.5 rounded-lg bg-black/20 dark:bg-black/30 border border-emerald-900/30">
              <span className="text-[9px] text-slate-400 block">Day / Night Target</span>
              <strong className="text-amber-400 text-[11px]">
                {climatePreset ? `${climatePreset.recommendedDayTemp}°C / ${climatePreset.recommendedNightTemp}°C` : 'Dynamic'}
              </strong>
            </div>
            <div className="p-1.5 rounded-lg bg-black/20 dark:bg-black/30 border border-emerald-900/30">
              <span className="text-[9px] text-slate-400 block">Photoperiod &amp; RH</span>
              <strong className="text-blue-400 text-[11px]">
                {climatePreset ? `${climatePreset.recommendedPhotoperiodHours}h • ${climatePreset.recommendedHumidity}%` : '12h • 60%'}
              </strong>
            </div>
          </div>
        </div>

        {/* Pairing Season & Incubation Specs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-emerald-900/30">
          {/* Pairing Season */}
          <div className="flex items-start space-x-2 text-[11px]">
            <div className="w-5 h-5 rounded-md bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="w-3 h-3" />
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-medium leading-none mb-0.5">
                Pairing Season
              </span>
              <span className="font-bold text-slate-900 dark:text-emerald-200">
                {standard.pairingSeasonText}
              </span>
            </div>
          </div>

          {/* Average Clutch */}
          {standard.avgClutchLitterSize && (
            <div className="flex items-start space-x-2 text-[11px]">
              <div className="w-5 h-5 rounded-md bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <Egg className="w-3 h-3" />
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-medium leading-none mb-0.5">
                  Typical Clutch / Litter
                </span>
                <span className="font-bold text-slate-900 dark:text-purple-200">
                  {standard.avgClutchLitterSize}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Incubation Conditions Ribbon */}
        <div className={`p-2 rounded-xl text-[11px] flex flex-wrap items-center justify-between gap-2 border ${
          isDarkMode ? 'bg-[#030e07] border-emerald-950 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center space-x-1.5">
            <Thermometer className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 text-[10px]">Temp:</span>
            <span className="font-bold text-slate-900 dark:text-emerald-300">{standard.incubationTempTarget}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 text-[10px]">Humidity:</span>
            <span className="font-bold text-slate-900 dark:text-sky-300">{standard.incubationHumidity}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 text-[10px]">Duration:</span>
            <span className="font-bold text-slate-900 dark:text-amber-300">{standard.incubationPeriod}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeciesStandardCard;
