import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Lock, 
  Copy, 
  Check, 
  RotateCw, 
  PawPrint, 
  Stethoscope, 
  CheckCircle2, 
  Send,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { StaffMember } from '../../types';
import { generateUniqueStaffId } from '../../data';

interface AddStaffMemberModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  facilities?: string[];
  existingStaff: StaffMember[];
  onClose: () => void;
  onSubmit: (newMember: StaffMember, emailResult?: any) => void | Promise<void>;
}

export const AddStaffMemberModal: React.FC<AddStaffMemberModalProps> = ({
  isOpen,
  isDarkMode,
  facilities = [],
  existingStaff,
  onClose,
  onSubmit
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedFacility, setSelectedFacility] = useState('');
  const [customFacility, setCustomFacility] = useState('');
  const [role, setRole] = useState<'keeper' | 'vet'>('keeper');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password generator matching the format in screenshot (e.g. F7k9#Q2zJ)
  const generatePassword = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '#@!%';
    
    // Pick at least one from each
    let pass = '';
    pass += uppercase[Math.floor(Math.random() * uppercase.length)];
    pass += numbers[Math.floor(Math.random() * numbers.length)];
    pass += lowercase[Math.floor(Math.random() * lowercase.length)];
    pass += numbers[Math.floor(Math.random() * numbers.length)];
    pass += symbols[Math.floor(Math.random() * symbols.length)];
    pass += uppercase[Math.floor(Math.random() * uppercase.length)];
    pass += numbers[Math.floor(Math.random() * numbers.length)];
    pass += lowercase[Math.floor(Math.random() * lowercase.length)];
    pass += uppercase[Math.floor(Math.random() * uppercase.length)];

    setTempPassword(pass);
    setCopied(false);
  };

  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setEmail('');
      setPhone('');
      setSelectedFacility(facilities.length > 0 ? facilities[0] : 'Main Facility');
      setCustomFacility('');
      setRole('keeper');
      setErrorMessage('');
      generatePassword();
    }
  }, [isOpen, facilities]);

  const handleCopyPassword = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Please enter the full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (existingStaff.some(s => s.email.toLowerCase() === email.trim().toLowerCase())) {
      setErrorMessage('A staff account with this email address already exists.');
      return;
    }

    let finalFacility = role === 'vet'
      ? 'Veterinary Clinic & Hospital'
      : (selectedFacility.trim() || (facilities.length > 0 ? facilities[0] : 'Main Facility'));
    if (role !== 'vet' && selectedFacility === 'Others') {
      if (!customFacility.trim()) {
        setErrorMessage('Please enter the facility name.');
        return;
      }
      finalFacility = customFacility.trim();
    }

    const nameParts = fullName.trim().split(' ');
    const initials = (nameParts[0][0] + (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '')).toUpperCase();

    // Generate collision-free, strictly unique STF-2026-XXX ID
    const staffId = generateUniqueStaffId(existingStaff);

    const newStaffMember: StaffMember = {
      id: staffId,
      name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || '+63 9XX XXX XXXX',
      role: role,
      status: 'Active',
      assignedFacilities: role === 'vet' ? ['Veterinary Clinic & Hospital'] : [finalFacility],
      password: tempPassword,
      mustChangePassword: true,
      initials,
      createdAt: new Date().toISOString().split('T')[0],
      dutyLoad: role === 'vet'
        ? 'Facility-Wide Health Checkups & Clinical Treatments'
        : 'Reptile Habitat & Primary Care',
      assignedAnimalIds: []
    };

    setIsSubmitting(true);
    
    // Immediately create staff and present success dialog with temporary password
    onSubmit(newStaffMember);
    setIsSubmitting(false);

    // Dispatch email invitation concurrently in background
    fetch('/api/email/send-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email.trim(),
        name: fullName.trim(),
        role: role,
        facility: finalFacility,
        staffId: staffId,
        tempPassword: tempPassword,
        phone: phone.trim(),
        loginUrl: window.location.origin
      })
    }).catch(err => {
      console.warn('Background email dispatch notice:', err);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border transition-all overflow-hidden bg-white dark:bg-[#061e12] border-slate-200 dark:border-emerald-800/80 text-slate-800 dark:text-white animate-scale-in"
      >
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-emerald-950/80 flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-800/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Add Staff Member
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Create a new staff account and assign a role.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-emerald-950 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL FORM BODY */}
        <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl text-xs font-semibold flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: BASIC INFORMATION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-[#0d3f26] dark:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Basic Information
                </h4>
              </div>
              {(fullName || email || phone || selectedFacility) && (
                <button
                  type="button"
                  onClick={() => {
                    setFullName('');
                    setEmail('');
                    setPhone('');
                    setSelectedFacility('');
                    setCustomFacility('');
                    setErrorMessage('');
                  }}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                >
                  Clear Fields
                </button>
              )}
            </div>

            {/* 2x2 Form Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    name="new_staff_fullname_input"
                    autoComplete="off"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#031109] text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                  {fullName && (
                    <button
                      type="button"
                      onClick={() => setFullName('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    name="new_staff_email_address_field"
                    autoComplete="new-password"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@feronia.ph"
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#031109] text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                  {email && (
                    <button
                      type="button"
                      onClick={() => setEmail('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    name="new_staff_phone_no_field"
                    autoComplete="off"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#031109] text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
                  />
                  {phone && (
                    <button
                      type="button"
                      onClick={() => setPhone('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Facility Selection */}
              {role === 'vet' ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Assignment Scope
                  </label>
                  <div className="p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300 text-xs font-semibold flex items-center space-x-2">
                    <Stethoscope className="w-4 h-4 shrink-0 text-sky-500" />
                    <span className="truncate">Veterinary Clinic (General / Unassigned to habitats)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Veterinarians manage clinical care facility-wide and cannot be assigned to specific animals or enclosures.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Facility <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={selectedFacility}
                      onChange={(e) => setSelectedFacility(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#031109] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 appearance-none cursor-pointer transition-colors"
                    >
                      <option value="">Select facility</option>
                      {facilities.map((fac) => (
                        <option key={fac} value={fac}>
                          {fac}
                        </option>
                      ))}
                      <option value="Others">Others</option>
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>

                  {/* Custom input when "Others" is selected */}
                  {selectedFacility === 'Others' && (
                    <div className="pt-1.5">
                      <input
                        type="text"
                        required
                        value={customFacility}
                        onChange={(e) => setCustomFacility(e.target.value)}
                        placeholder="Enter facility name..."
                        className="w-full px-3.5 py-2 rounded-xl border border-emerald-500/60 dark:border-emerald-700/80 bg-white dark:bg-[#031109] text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors shadow-2xs"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TEMPORARY PASSWORD CARD */}
            <div className="p-4 rounded-2xl bg-[#eefcf5] dark:bg-[#082918] border border-[#a4ebd0] dark:border-emerald-800/60 space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-xl bg-[#0d3f26] dark:bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    Temporary Password
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    A temporary password will be generated and sent to the staff member's email address. They can change it after their first login.
                  </p>
                </div>
              </div>

              {/* Password Action Row */}
              <div className="flex items-center space-x-2 pt-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    value={tempPassword}
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-[#91e2c3] dark:border-emerald-700/60 bg-white/90 dark:bg-[#04160d] text-xs font-mono font-bold text-slate-900 dark:text-emerald-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    title="Copy password to clipboard"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-3.5 py-2 rounded-xl border border-[#91e2c3] dark:border-emerald-700/60 bg-white dark:bg-[#062013] hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-2xs"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: SELECT ROLE */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5">
              <span className="w-6 h-6 rounded-full bg-[#0d3f26] dark:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Select Role
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Keeper Card */}
              <div
                onClick={() => setRole('keeper')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${
                  role === 'keeper'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-emerald-950 bg-white dark:bg-[#031109] hover:border-slate-300 dark:hover:border-emerald-800'
                }`}
              >
                {role === 'keeper' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute top-3.5 right-3.5 fill-emerald-100 dark:fill-emerald-950" />
                )}
                <div className="w-10 h-10 rounded-full bg-[#0d3f26] text-white flex items-center justify-center mb-2.5">
                  <PawPrint className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                  Keeper
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                  Handles animal care, feeding, enclosure management, and daily tasks.
                </p>
              </div>

              {/* Veterinarian Card */}
              <div
                onClick={() => setRole('vet')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${
                  role === 'vet'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-emerald-950 bg-white dark:bg-[#031109] hover:border-slate-300 dark:hover:border-emerald-800'
                }`}
              >
                {role === 'vet' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute top-3.5 right-3.5 fill-emerald-100 dark:fill-emerald-950" />
                )}
                <div className="w-10 h-10 rounded-full bg-[#0d3f26] text-white flex items-center justify-center mb-2.5">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                  Veterinarian
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                  Manages animal health, medical records, and veterinary tasks across the facility.
                </p>
                <div className="mt-2 text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-1 rounded-lg inline-flex items-center space-x-1">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>Not assignable to animals/enclosures</span>
                </div>
              </div>
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="pt-4 border-t border-slate-100 dark:border-emerald-950/80 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-emerald-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#0d472c] hover:bg-[#125838] disabled:opacity-60 active:scale-95 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Invitation Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
