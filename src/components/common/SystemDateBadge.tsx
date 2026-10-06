import React from 'react';
import { Calendar } from 'lucide-react';
import { getFormattedDateWithDay } from '../../utils/timeUtils';

interface SystemDateBadgeProps {
  systemDate: string;
  onUpdateSystemDate?: (newDate: string) => void;
  isDarkMode?: boolean;
  className?: string;
  title?: string;
}

export const SystemDateBadge: React.FC<SystemDateBadgeProps> = ({
  systemDate,
  onUpdateSystemDate,
  isDarkMode = true,
  className = '',
  title = 'Click to Change System Date'
}) => {
  const { dateFormatted, dayOfWeek } = getFormattedDateWithDay(systemDate);

  return (
    <div 
      className={`relative flex items-center space-x-2 px-3 py-1.5 border rounded-xl cursor-pointer transition-all shadow-xs ${
        isDarkMode 
          ? 'bg-[#061F13] border-emerald-900/70 hover:border-emerald-500/70 hover:bg-[#09291a] text-white' 
          : 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/90 hover:border-emerald-300 text-[#113C24]'
      } ${className}`}
      title={title}
    >
      <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
      <div className="text-left leading-tight select-none">
        <span className={`text-xs font-black tracking-wide block ${
          isDarkMode ? 'text-white' : 'text-[#113C24]'
        }`}>
          {dateFormatted}
        </span>
        <span className={`text-[10px] font-medium block ${
          isDarkMode ? 'text-slate-400' : 'text-slate-600'
        }`}>
          {dayOfWeek}
        </span>
      </div>
      {onUpdateSystemDate && (
        <input
          type="date"
          value={systemDate}
          onChange={(e) => onUpdateSystemDate(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title={title}
        />
      )}
    </div>
  );
};

export default SystemDateBadge;
