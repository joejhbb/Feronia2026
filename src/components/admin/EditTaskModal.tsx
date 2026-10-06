import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Repeat, Utensils, Stethoscope, User, FileText, Check, AlertTriangle } from 'lucide-react';
import { Task, StaffMember, InventoryItem } from '../../types';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (updatedTask: Task) => void;
  staffMembers?: StaffMember[];
  inventory?: InventoryItem[];
  isDarkMode?: boolean;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
  staffMembers = [],
  inventory = [],
  isDarkMode = true
}) => {
  if (!isOpen || !task) return null;

  // Parse existing task details
  const parseDetailsString = (detailsStr?: string) => {
    if (!detailsStr) return { food: '', quantity: '', method: '', routine: '', notes: '' };
    const lines = detailsStr.split('\n');
    let food = '';
    let quantity = '';
    let method = '';
    let routine = '';
    let notes = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Food:')) {
        food = trimmed.replace(/^Food:\s*/, '').replace(/\[ID:.*?\]/g, '').trim();
      } else if (trimmed.startsWith('Quantity:')) {
        quantity = trimmed.replace(/^Quantity:\s*/, '').trim();
      } else if (trimmed.startsWith('Method:')) {
        method = trimmed.replace(/^Method:\s*/, '').trim();
      } else if (trimmed.startsWith('Routine:')) {
        routine = trimmed.replace(/^Routine:\s*/, '').trim();
      } else if (trimmed.startsWith('Notes:')) {
        notes = trimmed.replace(/^Notes:\s*/, '').trim();
      }
    }

    return { food, quantity, method, routine, notes };
  };

  const initialParsed = parseDetailsString(task.details);

  const [title, setTitle] = useState(task.title || '');
  const [taskType, setTaskType] = useState<string>(task.type || 'Feeding');
  const [time, setTime] = useState(task.time || '08:00 AM');
  const [frequency, setFrequency] = useState(task.frequency || 'Daily');
  const [date, setDate] = useState(task.date || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<Task['status']>(task.status || 'Pending');
  const [assignedKeeperId, setAssignedKeeperId] = useState<string>(task.assignedKeeperId || '');
  
  // Specific Feeding / Care Detail states
  const [foodItem, setFoodItem] = useState(initialParsed.food || '');
  const [quantity, setQuantity] = useState(initialParsed.quantity || '');
  const [method, setMethod] = useState(initialParsed.method || 'Tongs');
  const [routineName, setRoutineName] = useState(initialParsed.routine || '');
  const [notes, setNotes] = useState(initialParsed.notes || '');

  // Keepers list (Veterinarians cannot be assigned to animal husbandry/care tasks)
  const keepers = staffMembers.filter(s => {
    if (s.role === 'vet') return false;
    const r = (s.role || '').toLowerCase();
    return r.includes('keeper') || r.includes('caretaker') || r.includes('husbandry') || r.includes('staff');
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedKeeperObj = staffMembers.find(s => s.id === assignedKeeperId);
    const assignedKeeperName = selectedKeeperObj ? selectedKeeperObj.name : (assignedKeeperId ? 'Assigned Keeper' : undefined);

    // Reconstruct details string based on task type
    let newDetails = '';
    if (taskType === 'Feeding') {
      const parts = [];
      if (foodItem) parts.push(`Food: ${foodItem}`);
      if (quantity) parts.push(`Quantity: ${quantity}`);
      if (method) parts.push(`Method: ${method}`);
      if (notes) parts.push(`Notes: ${notes}`);
      if (assignedKeeperName) parts.push(`Assigned Keeper: ${assignedKeeperName}`);
      newDetails = parts.join('\n');
    } else {
      const parts = [];
      if (routineName) parts.push(`Routine: ${routineName}`);
      if (notes) parts.push(`Notes: ${notes}`);
      if (assignedKeeperName) parts.push(`Assigned Keeper: ${assignedKeeperName}`);
      newDetails = parts.join('\n');
    }

    const updatedTask: Task = {
      ...task,
      title: title.trim() || `${taskType} Task`,
      type: taskType as any,
      time: time,
      frequency: frequency,
      date: date,
      status: status,
      assignedKeeperId: assignedKeeperId || undefined,
      assignedKeeperName: assignedKeeperName,
      details: newDetails || task.details
    };

    onSave(updatedTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all ${
        isDarkMode ? 'bg-[#071F11] border-emerald-900/80 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between ${
          isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl text-emerald-400">
              ⚙️
            </div>
            <div>
              <h3 className={`font-extrabold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Edit Feeding & Care Task
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-emerald-300/70' : 'text-slate-500'}`}>
                Modify task scheduling, assigned keeper, or instructions
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Task Title */}
          <div>
            <label className={`block text-xs font-extrabold uppercase tracking-wider mb-1.5 ${
              isDarkMode ? 'text-emerald-300' : 'text-slate-700'
            }`}>
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning Feeding - Corn Snake"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-colors ${
                isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60 focus:border-emerald-400' : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-[#113C24]'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Task Type */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Task Category
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                  isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-slate-50 text-slate-900 border-slate-200'
                }`}
              >
                <option value="Feeding">🍽 Feeding</option>
                <option value="Care">🦎 Care & Husbandry</option>
                <option value="Cleaning">🧹 Cleaning & Sanitization</option>
                <option value="Water Change">💧 Water Refresh</option>
                <option value="Health Check">🩺 Health Examination</option>
                <option value="Observation">👁 Behavioral Check</option>
              </select>
            </div>

            {/* Scheduled Time */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Scheduled Time
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                  isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-slate-50 text-slate-900 border-slate-200'
                }`}
              >
                <option value="06:00 AM">06:00 AM (Early Morning)</option>
                <option value="07:00 AM">07:00 AM</option>
                <option value="08:00 AM">08:00 AM (Standard Morning)</option>
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="12:00 PM">12:00 PM (Noon)</option>
                <option value="02:00 PM">02:00 PM (Afternoon)</option>
                <option value="04:00 PM">04:00 PM</option>
                <option value="06:00 PM">06:00 PM (Evening)</option>
                <option value="08:00 PM">08:00 PM (Night Feed)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Frequency */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Frequency / Interval
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                  isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-slate-50 text-slate-900 border-slate-200'
                }`}
              >
                <option value="Daily">Daily (Every 1 day)</option>
                <option value="Every 2 days">Every 2 days</option>
                <option value="Every 3 days">Every 3 days</option>
                <option value="Every 5 days">Every 5 days</option>
                <option value="Every 7 days">Every 7 days (Weekly)</option>
                <option value="Every 10 days">Every 10 days</option>
                <option value="Bi-weekly">Bi-weekly (Every 14 days)</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Schedule Start Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${
                  isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-slate-50 text-slate-900 border-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Assigned Keeper */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Assigned Keeper
            </label>
            <select
              value={assignedKeeperId}
              onChange={(e) => setAssignedKeeperId(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                isDarkMode ? 'bg-[#04110A] text-emerald-200 border-emerald-900/60' : 'bg-slate-50 text-slate-900 border-slate-200'
              }`}
            >
              <option value="">-- General Duty Keepers / Unassigned Pool --</option>
              {keepers.map(k => (
                <option key={k.id} value={k.id}>
                  👤 {k.name} ({k.role || 'Keeper'})
                </option>
              ))}
            </select>
          </div>

          {/* Specific Feeding Fields */}
          {taskType === 'Feeding' && (
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-[#04110A]/60 border-emerald-900/40' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                <Utensils className="w-3.5 h-3.5" />
                <span>Feeding Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Food / Prey Item</label>
                  <input
                    type="text"
                    value={foodItem}
                    onChange={(e) => setFoodItem(e.target.value)}
                    placeholder="e.g. Dubia Roaches, Pinky Mouse"
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60' : 'bg-white text-slate-900 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Method & Portion</label>
                  <input
                    type="text"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    placeholder="e.g. Tongs, Bowl, Hand"
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60' : 'bg-white text-slate-900 border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Specific Care Fields */}
          {taskType !== 'Feeding' && (
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-[#04110A]/60 border-emerald-900/40' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-xs font-bold text-teal-400 flex items-center space-x-1.5">
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Care Routine Details</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Routine Action Name</label>
                <input
                  type="text"
                  value={routineName}
                  onChange={(e) => setRoutineName(e.target.value)}
                  placeholder="e.g. Mist Humid Hide & Substrate Check"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                    isDarkMode ? 'bg-[#071F11] text-white border-emerald-900/60' : 'bg-white text-slate-900 border-slate-200'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Special Instructions / Notes */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Special Keeper Instructions / Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dust with D3 Calcium twice a week. Do not disturb 48 hrs post-feed."
              className={`w-full px-3.5 py-2 rounded-xl border text-xs font-normal outline-none ${
                isDarkMode ? 'bg-[#04110A] text-white border-emerald-900/60' : 'bg-slate-50 text-slate-900 border-slate-200'
              }`}
            />
          </div>

          {/* Status */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Task Status
            </label>
            <div className="flex items-center space-x-3">
              {(['Pending', 'Completed', 'Overdue'] as const).map((s) => (
                <label key={s} className="flex items-center space-x-1.5 text-xs font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="taskStatus"
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    className="text-emerald-600 accent-[#113C24]"
                  />
                  <span className={
                    s === 'Completed' ? 'text-emerald-400' : s === 'Overdue' ? 'text-rose-400' : 'text-amber-400'
                  }>
                    {s}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className={`pt-4 border-t flex justify-end space-x-3 ${
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
              type="submit"
              className="px-6 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
