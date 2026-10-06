import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, Trash2, Eye, EyeOff } from 'lucide-react';
import UserAvatar, { isImageUrl } from './UserAvatar';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  roleLabel?: string;
  initialName: string;
  initialEmail: string;
  initialPhone?: string;
  initialAvatar: string;
  initialBio?: string;
  isDarkMode?: boolean;
  onSave: (data: {
    name: string;
    email: string;
    phone: string;
    avatar: string;
    bio: string;
  }) => void;
}

const DEFAULT_EMOJIS = ['👑', '👨‍⚕️', '👩‍⚕️', '🙋‍♂️', '🌿', '🦎', '🐍', '🦅', '🩺', '🦁', '🦊', '🦉'];

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  title = 'Profile & Settings',
  subtitle = 'Manage your personal account credentials and profile picture',
  roleLabel,
  initialName,
  initialEmail,
  initialPhone = '',
  initialAvatar,
  initialBio = '',
  isDarkMode = true,
  onSave
}: ProfileSettingsModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [bio, setBio] = useState(initialBio);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setEmail(initialEmail);
      setPhone(initialPhone);
      setAvatar(initialAvatar);
      setBio(initialBio);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg(null);
    }
  }, [isOpen, initialName, initialEmail, initialPhone, initialAvatar, initialBio]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please choose a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result && typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword) {
      if (newPassword.length < 8) {
        setPasswordMsg('Password must be at least 8 characters long.');
        return;
      }
      if (!/[A-Z]/.test(newPassword)) {
        setPasswordMsg('Password must contain at least one uppercase letter (A-Z).');
        return;
      }
      if (!/[a-z]/.test(newPassword)) {
        setPasswordMsg('Password must contain at least one lowercase letter (a-z).');
        return;
      }
      if (!/[0-9]/.test(newPassword)) {
        setPasswordMsg('Password must contain at least one number (0-9).');
        return;
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
        setPasswordMsg('Password must contain at least one special character (!@#$%^&*...).');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordMsg('New passwords do not match.');
        return;
      }
      localStorage.setItem('feronia_user_password', newPassword);
    }
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      avatar,
      bio: bio.trim()
    });
    onClose();
  };

  const isUploadedPhoto = isImageUrl(avatar);

  const handleClearFacilityData = () => {
    if (window.confirm('Are you sure you want to clear all facility records (animals, enclosures, tasks, inventory, breeding records)? This will reset the system to a clean empty state for a new admin.')) {
      localStorage.setItem('feronia_animals', JSON.stringify([]));
      localStorage.setItem('feronia_enclosures', JSON.stringify([]));
      localStorage.setItem('feronia_tasks', JSON.stringify([]));
      localStorage.setItem('feronia_medical_records', JSON.stringify([]));
      localStorage.setItem('feronia_appointments', JSON.stringify([]));
      localStorage.setItem('feronia_breeding_records', JSON.stringify([]));
      localStorage.setItem('feronia_breeding_assessments', JSON.stringify([]));
      localStorage.setItem('feronia_inventory', JSON.stringify([]));
      
      const adminStaff = [{
        id: 'STF-ADM-001',
        name: name,
        email: email,
        role: 'admin',
        facility: 'Main Facility',
        status: 'Active',
        dutyLoad: bio || 'Facility Administrator',
        phone: phone || '',
        avatar: avatar
      }];
      localStorage.setItem('feronia_staff_members', JSON.stringify(adminStaff));
      
      alert('Facility data cleared successfully! The system will now reload into a pristine empty state.');
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDarkMode 
            ? 'bg-[#061A10] border-emerald-950 text-white shadow-emerald-950/20' 
            : 'bg-white border-slate-100 text-slate-800 shadow-slate-200/50'
        }`}
      >
        {/* Header */}
        <div className={`p-5 sm:p-6 border-b flex items-center justify-between shrink-0 ${
          isDarkMode ? 'border-emerald-950/60 bg-[#04140D]' : 'border-slate-100 bg-emerald-50/50'
        }`}>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black tracking-tight">{title}</h3>
              {roleLabel && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {roleLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDarkMode 
                ? 'border-emerald-900/60 bg-[#04140D] hover:bg-emerald-950/60 text-emerald-300' 
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 no-scrollbar">
          
          {/* Avatar & Photo Picker Section */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${
            isDarkMode ? 'border-emerald-950/60 bg-[#041209]' : 'border-slate-200 bg-slate-50/80'
          }`}>
            <span className="text-[10px] font-extrabold uppercase text-emerald-500 dark:text-emerald-400 tracking-wider block mb-3">
              Profile Photo & Avatar
            </span>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              
              {/* Profile Avatar Circle with interactive Camera Badge */}
              <div className="relative group shrink-0">
                <UserAvatar
                  avatar={avatar}
                  name={name}
                  size="xl"
                  isDarkMode={isDarkMode}
                  showCameraBadge={true}
                  onCameraClick={() => fileInputRef.current?.click()}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Emoji Selectors & Remove Photo Option */}
              <div className="flex-1 min-w-0 space-y-2.5 w-full">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-400 font-bold block uppercase">
                    Choose Emoji Avatar:
                  </label>
                  {isUploadedPhoto && (
                    <button
                      type="button"
                      onClick={() => setAvatar('👤')}
                      className="text-[11px] font-bold text-rose-500 hover:text-rose-400 hover:underline flex items-center space-x-1 cursor-pointer transition-colors"
                      title="Remove current uploaded photo"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all border cursor-pointer ${
                        avatar === emoji 
                          ? 'border-emerald-500 bg-emerald-600/30 text-white font-bold scale-110 shadow-xs ring-2 ring-emerald-400/40' 
                          : isDarkMode 
                            ? 'border-emerald-950 bg-[#05190E] text-emerald-200 hover:border-emerald-700' 
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* User Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maria Reyes"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                  isDarkMode 
                    ? 'border-emerald-950 bg-[#04140D] text-white focus:border-emerald-500' 
                    : 'border-slate-200 bg-white text-slate-800 focus:border-[#113C24]'
                }`}
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@feroniasanctuary.org"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                  isDarkMode 
                    ? 'border-emerald-950 bg-[#04140D] text-white focus:border-emerald-500' 
                    : 'border-slate-200 bg-white text-slate-800 focus:border-[#113C24]'
                }`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 917 123 4567"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                  isDarkMode 
                    ? 'border-emerald-950 bg-[#04140D] text-white focus:border-emerald-500' 
                    : 'border-slate-200 bg-white text-slate-800 focus:border-[#113C24]'
                }`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">
                Bio / Duty & Specialty Description
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe responsibilities and specializations..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none transition-all resize-none ${
                  isDarkMode 
                    ? 'border-emerald-950 bg-[#04140D] text-white focus:border-emerald-500' 
                    : 'border-slate-200 bg-white text-slate-800 focus:border-[#113C24]'
                }`}
              />
            </div>

            {/* Change Password Section */}
            <div className={`sm:col-span-2 p-4 rounded-2xl border ${
              isDarkMode ? 'border-emerald-950/60 bg-[#041209]' : 'border-slate-200 bg-slate-50/80'
            }`}>
              <span className="text-[10px] font-extrabold uppercase text-emerald-500 dark:text-emerald-400 tracking-wider block mb-2">
                🔒 Security & Change Password
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">
                    New Password (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className={`w-full pl-3.5 pr-10 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                        isDarkMode 
                          ? 'border-emerald-950 bg-[#04140D] text-white focus:border-emerald-500' 
                          : 'border-slate-200 bg-white text-slate-800 focus:border-[#113C24]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className={`w-full pl-3.5 pr-10 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                        isDarkMode 
                          ? 'border-emerald-950 bg-[#04140D] text-white focus:border-emerald-500' 
                          : 'border-slate-200 bg-white text-slate-800 focus:border-[#113C24]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              {passwordMsg && (
                <p className="text-xs font-bold text-rose-500 mt-2">{passwordMsg}</p>
              )}
              <p className={`text-[10px] font-medium mt-2.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Password requirements: Min. 8 characters, at least 1 uppercase (A-Z), 1 lowercase (a-z), 1 number (0-9), and 1 special character (!@#$%^&*...).
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={`pt-4 border-t flex items-center justify-between ${
            isDarkMode ? 'border-emerald-950/60' : 'border-slate-100'
          }`}>
            <button
              type="button"
              onClick={handleClearFacilityData}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Start Fresh (Clear All Data)</span>
            </button>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer flex items-center space-x-1.5 transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
