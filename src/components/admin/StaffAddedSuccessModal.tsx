import React from 'react';
import { X } from 'lucide-react';

interface StaffAddedSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewStaffList?: () => void;
  staffName: string;
  role: string;
  email: string;
  tempPassword?: string;
}

export const StaffAddedSuccessModal: React.FC<StaffAddedSuccessModalProps> = ({
  isOpen,
  onClose,
  onViewStaffList,
  staffName,
  role,
  email,
  tempPassword
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format role for display: 'keeper' -> 'Keeper', 'vet' -> 'Veterinarian' or 'Vet'
  const displayRole = role.toLowerCase() === 'vet' 
    ? 'Veterinarian' 
    : role.toLowerCase() === 'keeper' 
      ? 'Keeper' 
      : role.charAt(0).toUpperCase() + role.slice(1);

  const handleViewList = () => {
    onClose();
    if (onViewStaffList) {
      onViewStaffList();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-[400px] rounded-3xl p-6 sm:p-7 shadow-2xl border transition-all relative overflow-hidden bg-[#041c10] border-emerald-800/60 text-white animate-scale-in"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px 0 rgba(16, 185, 129, 0.15)'
        }}
      >
        {/* CLOSE 'X' BUTTON */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-emerald-400/80 hover:text-white hover:bg-emerald-900/40 transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* ILLUSTRATION: Glowing checkmark, botanical foliage, envelope & paper plane */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="relative w-48 h-36 flex items-center justify-center">
            {/* Soft background ambient glow */}
            <div className="absolute w-28 h-28 rounded-full bg-emerald-500/20 blur-xl pointer-events-none" />

            <svg
              viewBox="0 0 240 180"
              className="w-full h-full drop-shadow-md overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Checkmark gradient */}
                <linearGradient id="checkGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>

                {/* Envelope gradient */}
                <linearGradient id="envelopeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>

                {/* Leaves shadow filter */}
                <filter id="glowBadge" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#10b981" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* BOTANICAL FOLIAGE / LEAVES BACKGROUND */}
              <g id="botanical-leaves" opacity="0.95">
                {/* Left side branches */}
                <path d="M 68 110 C 60 90, 40 85, 32 80 C 42 75, 62 82, 70 100" fill="#15803d" />
                <path d="M 75 95 C 65 72, 45 68, 38 62 C 50 60, 72 70, 78 88" fill="#16a34a" />
                <path d="M 85 82 C 72 58, 58 50, 52 42 C 65 42, 82 55, 88 74" fill="#22c55e" />
                <path d="M 98 72 C 88 48, 76 38, 70 28 C 84 30, 98 46, 102 65" fill="#4ade80" />
                <path d="M 112 66 C 108 40, 100 28, 95 18 C 107 20, 117 38, 116 60" fill="#22c55e" />

                {/* Additional left accents */}
                <path d="M 60 120 C 50 106, 36 102, 28 100 C 38 95, 54 99, 62 112" fill="#14532d" />
                <path d="M 80 108 C 68 96, 52 94, 44 92 C 54 88, 72 90, 82 102" fill="#15803d" />

                {/* Right side branches */}
                <path d="M 172 110 C 180 90, 200 85, 208 80 C 198 75, 178 82, 170 100" fill="#15803d" />
                <path d="M 165 95 C 175 72, 195 68, 202 62 C 190 60, 168 70, 162 88" fill="#16a34a" />
                <path d="M 155 82 C 168 58, 182 50, 188 42 C 175 42, 158 55, 152 74" fill="#22c55e" />
                <path d="M 142 72 C 152 48, 164 38, 170 28 C 156 30, 142 46, 138 65" fill="#4ade80" />
                <path d="M 128 66 C 132 40, 140 28, 145 18 C 133 20, 123 38, 124 60" fill="#22c55e" />

                {/* Additional right accents */}
                <path d="M 180 120 C 190 106, 204 102, 212 100 C 202 95, 186 99, 178 112" fill="#14532d" />
                <path d="M 160 108 C 172 96, 188 94, 196 92 C 186 88, 168 90, 158 102" fill="#15803d" />
              </g>

              {/* PAPER AIRPLANE WITH DOTTED TRAIL (Top Right) */}
              <g id="paper-plane" transform="translate(180, 28)">
                {/* Dotted motion trail */}
                <path
                  d="M -35 25 C -25 22, -15 15, -6 6"
                  stroke="#4ade80"
                  strokeWidth="1.5"
                  strokeDasharray="2.5 2.5"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                {/* Paper plane body */}
                <g transform="rotate(-15)">
                  <polygon points="0,0 20,-8 14,14" fill="#a7f3d0" />
                  <polygon points="0,0 20,-8 9,7" fill="#6ee7b7" />
                  <polygon points="9,7 20,-8 14,14" fill="#34d399" />
                </g>
              </g>

              {/* ENVELOPE BASE */}
              <g id="envelope" transform="translate(68, 88)">
                {/* Envelope back & shadow */}
                <rect x="0" y="0" width="104" height="60" rx="10" fill="#ffffff" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.35))" />

                {/* Interior envelope tint / fold */}
                <path d="M 4 8 L 52 40 L 100 8" stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinejoin="round" />
                <path d="M 4 56 L 40 30" stroke="#e2e8f0" strokeWidth="1.5" />
                <path d="M 100 56 L 64 30" stroke="#e2e8f0" strokeWidth="1.5" />

                {/* Cute Plant / Seedling Sprout Stamp on Envelope (right side) */}
                <g transform="translate(74, 34) scale(0.9)">
                  {/* Stem */}
                  <path d="M 12 18 C 12 11, 10 7, 7 4" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Left sprout leaf */}
                  <path d="M 8 7 C 3 6, 2 11, 8 11 C 9 11, 9 9, 8 7 Z" fill="#10b981" />
                  {/* Right sprout leaf */}
                  <path d="M 10 5 C 16 3, 18 8, 12 9 C 11 9, 11 7, 10 5 Z" fill="#059669" />
                </g>
              </g>

              {/* GLOWING ROUND CHECKMARK BADGE (Centered above envelope) */}
              <g id="checkmark-badge" filter="url(#glowBadge)">
                {/* Outer halo */}
                <circle cx="120" cy="74" r="32" fill="#059669" opacity="0.35" />
                {/* Main vibrant circle */}
                <circle cx="120" cy="74" r="26" fill="url(#checkGlow)" />
                {/* Subtle highlight inner rim */}
                <circle cx="120" cy="74" r="24.5" stroke="#86efac" strokeWidth="1.5" opacity="0.6" fill="none" />
                {/* White Checkmark Icon */}
                <path
                  d="M 109 74.5 L 116.5 82 L 131 66.5"
                  stroke="#ffffff"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          </div>
        </div>

        {/* TITLE */}
        <div className="text-center mt-2">
          <h3 className="text-xl sm:text-[22px] font-extrabold text-white tracking-tight">
            Staff Member Added!
          </h3>
        </div>

        {/* SUBTITLE */}
        <div className="text-center mt-2.5 px-2">
          <p className="text-[13px] text-slate-300 leading-relaxed font-normal">
            <span className="font-semibold text-white">{staffName}</span> has been successfully added as a{' '}
            <span className="font-semibold text-emerald-400">{displayRole}</span>.
          </p>
          <p className="text-[13px] text-slate-300 leading-relaxed font-normal mt-1">
            An email with their temporary password has been sent to{' '}
            <span className="font-medium text-emerald-300 underline decoration-emerald-500/40 underline-offset-2">
              {email}
            </span>.
          </p>

          {tempPassword && (
            <div className="mt-3.5 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 block">Temporary Password:</span>
                <span className="font-mono text-sm font-black text-white">{tempPassword}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
              >
                {copied ? 'Copied! ✓' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="space-y-2.5 mt-6 pt-1">
          {/* VIEW STAFF LIST */}
          <button
            type="button"
            onClick={handleViewList}
            className="w-full py-3.5 px-4 rounded-xl bg-[#00c57d] hover:bg-[#00b06f] active:scale-[0.99] text-[#041c10] font-bold text-sm tracking-wide shadow-lg shadow-emerald-950/60 transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>View Staff List</span>
          </button>

          {/* CLOSE */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl border border-emerald-800/80 bg-emerald-950/20 hover:bg-emerald-950/60 active:scale-[0.99] text-white font-semibold text-sm transition-all cursor-pointer flex items-center justify-center"
          >
            <span>Close</span>
          </button>
        </div>

      </div>
    </div>
  );
};
