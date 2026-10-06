import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, X,
  CalendarDays, Check, Clock, AlertTriangle, RefreshCw
} from 'lucide-react';
import { Appointment } from '../../types';

interface VetDateYearPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentViewDate: Date;
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
  onChangeViewDate: (newDate: Date) => void;
  appointments: Appointment[];
  isDarkMode: boolean;
  systemDate: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function VetDateYearPickerModal({
  isOpen,
  onClose,
  currentViewDate,
  selectedDate,
  onSelectDate,
  onChangeViewDate,
  appointments,
  isDarkMode,
  systemDate
}: VetDateYearPickerModalProps) {
  const todayStr = systemDate || new Date().toISOString().split('T')[0];

  const [selectedYear, setSelectedYear] = useState<number>(() => currentViewDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => currentViewDate.getMonth());
  const [pendingSelectedDate, setPendingSelectedDate] = useState<string | null>(selectedDate);
  const [inputDateVal, setInputDateVal] = useState<string>(selectedDate || todayStr);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPendingSelectedDate(selectedDate);
      setInputDateVal(selectedDate || todayStr);
      if (selectedDate) {
        const parts = selectedDate.split('-');
        if (parts.length === 3) {
          const yr = parseInt(parts[0], 10);
          const mo = parseInt(parts[1], 10) - 1;
          if (!isNaN(yr) && !isNaN(mo)) {
            setSelectedYear(yr);
            setSelectedMonth(mo);
            return;
          }
        }
      }
      setSelectedYear(currentViewDate.getFullYear());
      setSelectedMonth(currentViewDate.getMonth());
    }
  }, [isOpen, selectedDate, currentViewDate, todayStr]);

  // Years range from 2023 to 2030
  const availableYears = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

  // Count appointments per month in selected year
  const appointmentCountsByMonth = useMemo(() => {
    const counts: Record<number, number> = {};
    appointments.forEach(apt => {
      if (!apt.date) return;
      const parts = apt.date.split('-');
      if (parts.length === 3) {
        const yr = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10) - 1;
        if (yr === selectedYear && mo >= 0 && mo <= 11) {
          counts[mo] = (counts[mo] || 0) + 1;
        }
      }
    });
    return counts;
  }, [appointments, selectedYear]);

  // Appointments grouped by date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach(apt => {
      if (!apt.date) return;
      if (!map[apt.date]) map[apt.date] = [];
      map[apt.date].push(apt);
    });
    return map;
  }, [appointments]);

  // Generate calendar matrix for selectedYear & selectedMonth
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    const cells: Array<{
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, isCurrentMonth: true });
    }

    // Next month padding
    const remainder = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
    for (let d = 1; d <= remainder; d++) {
      const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
      const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, isCurrentMonth: false });
    }

    return cells;
  }, [selectedYear, selectedMonth]);

  // Selecting a day in the calendar updates pending selection
  const handleSelectDay = (dateStr: string) => {
    setPendingSelectedDate(dateStr);
    setInputDateVal(dateStr);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      if (!isNaN(yr) && !isNaN(mo)) {
        setSelectedYear(yr);
        setSelectedMonth(mo);
      }
    }
  };

  // Quick shortcut: select today
  const handleSelectToday = () => {
    setPendingSelectedDate(todayStr);
    setInputDateVal(todayStr);
    const [yr, mo] = todayStr.split('-').map(Number);
    if (yr && mo) {
      setSelectedYear(yr);
      setSelectedMonth(mo - 1);
    }
  };

  // Quick shortcut: clear selected date filter
  const handleClearFilter = () => {
    setPendingSelectedDate(null);
    setInputDateVal('');
  };

  // Direct date picker input handler
  const handleDirectDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputDateVal(val);
    if (val) {
      setPendingSelectedDate(val);
      const parts = val.split('-');
      if (parts.length === 3) {
        const yr = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10) - 1;
        if (!isNaN(yr) && !isNaN(mo)) {
          setSelectedYear(yr);
          setSelectedMonth(mo);
        }
      }
    } else {
      setPendingSelectedDate(null);
    }
  };

  // Save changes using the Done button
  const handleSaveAndDone = () => {
    if (pendingSelectedDate) {
      const parts = pendingSelectedDate.split('-');
      if (parts.length === 3) {
        const yr = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10) - 1;
        if (!isNaN(yr) && !isNaN(mo)) {
          onChangeViewDate(new Date(yr, mo, 1));
        }
      }
      onSelectDate(pendingSelectedDate);
    } else {
      // Clear specific date filter, view the selected month and year
      onChangeViewDate(new Date(selectedYear, selectedMonth, 1));
      onSelectDate(null);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className={`relative w-full max-w-xl rounded-3xl border shadow-2xl z-10 overflow-hidden flex flex-col max-h-[92vh] ${
        isDarkMode
          ? 'bg-[#06180F] border-emerald-950 text-white shadow-emerald-950/30'
          : 'bg-white border-slate-200 text-slate-900 shadow-xl'
      }`}>
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDarkMode ? 'bg-[#04120B] border-emerald-950' : 'bg-emerald-50/60 border-slate-100'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Calendar & Schedule Date Navigator</h3>
              <p className="text-xs text-slate-400">Select date, month, or year, then click Done to apply changes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDarkMode ? 'hover:bg-emerald-900/40 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* Quick Date Shortcuts Bar */}
          <div className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl border text-xs ${
            isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-100' : 'bg-emerald-50/80 border-emerald-200 text-slate-800'
          }`}>
            <div className="flex items-center space-x-1.5 flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1"
              >
                <Check className="w-3 h-3" />
                <span>Today ({todayStr})</span>
              </button>

              <button
                type="button"
                onClick={handleClearFilter}
                className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                  !pendingSelectedDate
                    ? (isDarkMode ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300' : 'bg-emerald-100 border-emerald-300 text-emerald-900')
                    : isDarkMode
                      ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Show All Dates</span>
              </button>
            </div>

            {/* Direct date picker input */}
            <div className="flex items-center space-x-1.5">
              <span className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Direct Pick:</span>
              <input
                type="date"
                value={inputDateVal}
                onChange={handleDirectDateInput}
                className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold focus:outline-none ${
                  isDarkMode ? 'bg-[#030e07] border-emerald-900/80 text-emerald-300' : 'bg-white border-slate-300 text-slate-800'
                }`}
              />
            </div>
          </div>

          {/* 1. YEAR SELECTOR */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Select Year</span>
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setSelectedYear(prev => prev - 1)}
                  className={`p-1 rounded-lg border cursor-pointer ${
                    isDarkMode ? 'border-emerald-950 text-slate-300 hover:bg-emerald-900/30' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Previous Year"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-black px-2 text-emerald-400">{selectedYear}</span>
                <button
                  type="button"
                  onClick={() => setSelectedYear(prev => prev + 1)}
                  className={`p-1 rounded-lg border cursor-pointer ${
                    isDarkMode ? 'border-emerald-950 text-slate-300 hover:bg-emerald-900/30' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Next Year"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Year Buttons */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {availableYears.map(yr => {
                const isCurrentYear = yr === selectedYear;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                      isCurrentYear
                        ? 'bg-emerald-600 text-white shadow-xs scale-102 ring-2 ring-emerald-400/40'
                        : isDarkMode
                          ? 'bg-[#04110A] text-slate-300 hover:bg-emerald-950/60 border border-emerald-950'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. MONTH SELECTOR */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                <span>2. Select Month ({MONTH_NAMES[selectedMonth]})</span>
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SHORT_MONTHS.map((mo, idx) => {
                const isSelected = idx === selectedMonth;
                const count = appointmentCountsByMonth[idx] || 0;
                return (
                  <button
                    key={mo}
                    type="button"
                    onClick={() => setSelectedMonth(idx)}
                    className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/50'
                        : isDarkMode
                          ? 'bg-[#04110A] hover:bg-emerald-950/60 text-slate-300 border border-emerald-950'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <span>{mo}</span>
                    {count > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white text-emerald-800' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {count} apt{count > 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. CALENDAR DAYS MATRIX */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. Click Date to Select</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-bold">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
            </div>

            <div className={`p-3 rounded-2xl border ${
              isDarkMode ? 'bg-[#04110A] border-emerald-950' : 'bg-slate-50/70 border-slate-200'
            }`}>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {DAYS_OF_WEEK.map(d => (
                  <div key={d} className="text-[10px] font-black text-slate-400 uppercase py-0.5">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, idx) => {
                  const dayApts = appointmentsByDate[cell.dateStr] || [];
                  const count = dayApts.length;
                  const isSelected = pendingSelectedDate === cell.dateStr;
                  const isToday = todayStr === cell.dateStr;
                  const hasEmergency = dayApts.some(a => a.priority === 'Emergency');

                  return (
                    <button
                      key={`${cell.dateStr}-${idx}`}
                      type="button"
                      onClick={() => handleSelectDay(cell.dateStr)}
                      className={`relative p-1.5 min-h-[38px] rounded-xl text-center text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 font-black shadow-md scale-105 z-1'
                          : isToday
                            ? (isDarkMode ? 'bg-emerald-950 text-emerald-300 border border-emerald-500 font-black' : 'bg-emerald-100 text-emerald-900 border border-emerald-400 font-black')
                            : cell.isCurrentMonth
                              ? isDarkMode
                                ? 'bg-[#06180F] hover:bg-emerald-900/40 text-slate-200 border border-emerald-950/60'
                                : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-100'
                              : isDarkMode
                                ? 'text-slate-600 opacity-40 hover:opacity-80'
                                : 'text-slate-400 opacity-40 hover:opacity-80'
                      }`}
                    >
                      <span className="text-xs">{cell.day}</span>
                      
                      {count > 0 && (
                        <div className="flex items-center space-x-0.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            hasEmergency ? 'bg-rose-400 animate-pulse' : isSelected ? 'bg-white' : 'bg-emerald-400'
                          }`} />
                          <span className="text-[9px] font-mono leading-none">
                            {count}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isDarkMode ? 'bg-[#04120B] border-emerald-950' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            {pendingSelectedDate ? (
              <div className="flex items-center space-x-1.5">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Selected:</span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                  {pendingSelectedDate}
                </span>
                <button
                  type="button"
                  onClick={handleClearFilter}
                  className={`text-[11px] underline cursor-pointer ml-1 ${
                    isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Clear
                </button>
              </div>
            ) : (
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Showing all dates ({MONTH_NAMES[selectedMonth]} {selectedYear})</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndDone}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

