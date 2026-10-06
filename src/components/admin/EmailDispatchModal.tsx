import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Send, 
  X, 
  Settings, 
  Key, 
  ShieldCheck,
  Building,
  User,
  Clock,
  Sparkles
} from 'lucide-react';
import { StaffMember } from '../../types';

export interface EmailDispatchResult {
  success: boolean;
  mode?: 'smtp' | 'test_preview' | 'error' | 'not_configured';
  messageId?: string;
  previewUrl?: string | null;
  message?: string;
  error?: string;
  recipient?: string;
  smtpConfigured?: boolean;
}

interface EmailDispatchModalProps {
  isOpen: boolean;
  staff: StaffMember | null;
  result: EmailDispatchResult | null;
  isDarkMode: boolean;
  onClose: () => void;
  onResend: (targetEmail?: string) => Promise<void>;
  isLoading?: boolean;
}

export const EmailDispatchModal: React.FC<EmailDispatchModalProps> = ({
  isOpen,
  staff,
  result,
  isDarkMode,
  onClose,
  onResend,
  isLoading = false
}) => {
  const [copied, setCopied] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);

  // SMTP Settings State
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSenderName, setSmtpSenderName] = useState('Feronia Wildlife System');
  const [isSmtpConfigured, setIsSmtpConfigured] = useState(false);
  const [smtpConfigSaved, setSmtpConfigSaved] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Load existing SMTP config when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/email/config')
        .then(res => res.json())
        .then(data => {
          if (data) {
            setIsSmtpConfigured(Boolean(data.configured));
            if (data.host) setSmtpHost(data.host);
            if (data.port) setSmtpPort(String(data.port));
            if (data.user) setSmtpUser(data.user);
            if (data.fromName) setSmtpSenderName(data.fromName);
            // If not configured, auto expand configuration so keeper can enter details
            if (!data.configured) {
              setShowSmtpConfig(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !staff) return null;

  const activeEmail = customEmail || staff.email;

  const applyPreset = (preset: 'gmail' | 'outlook' | 'custom') => {
    if (preset === 'gmail') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort('465');
    } else if (preset === 'outlook') {
      setSmtpHost('smtp.office365.com');
      setSmtpPort('587');
    }
  };

  const handleCopyCredentials = () => {
    const text = `FERONIA WILDLIFE STAFF CREDENTIALS
Name: ${staff.name}
Role: ${staff.role.toUpperCase()}
Facility: ${staff.assignedFacilities?.[0] || 'Main Facility'}
Login Email: ${staff.email}
Temporary Password: ${staff.password}
System Access: ${window.location.origin}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    setVerifyMessage(null);
    try {
      const res = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost.trim(),
          port: Number(smtpPort),
          secure: Number(smtpPort) === 465,
          user: smtpUser.trim(),
          pass: smtpPass.trim(),
          fromName: smtpSenderName.trim(),
          fromEmail: smtpUser.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setSmtpConfigSaved(true);
        setIsSmtpConfigured(true);
        setTimeout(() => {
          setSmtpConfigSaved(false);
        }, 2000);
      }
    } catch (err: any) {
      setVerifyMessage({ success: false, text: err?.message || 'Failed to save SMTP settings' });
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingSmtp(true);
    setVerifyMessage(null);
    try {
      // First save current inputs
      await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost.trim(),
          port: Number(smtpPort),
          secure: Number(smtpPort) === 465,
          user: smtpUser.trim(),
          pass: smtpPass.trim(),
          fromName: smtpSenderName.trim(),
          fromEmail: smtpUser.trim()
        })
      });

      // Then verify connection
      const res = await fetch('/api/email/verify', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setVerifyMessage({ success: true, text: data.message || 'Connection successful!' });
        setIsSmtpConfigured(true);
      } else {
        setVerifyMessage({ success: false, text: data.error || 'Connection failed. Check host, port, or app password.' });
      }
    } catch (err: any) {
      setVerifyMessage({ success: false, text: err?.message || 'Verification failed.' });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Generate mailto link as direct fallback to guarantee direct delivery right away
  const mailtoSubject = encodeURIComponent(`Welcome to Feronia Wildlife - Staff Account Credentials (${staff.name})`);
  const mailtoBody = encodeURIComponent(`Hello ${staff.name},

You have been registered in the Feronia Wildlife Facility Management System.

ACCOUNT CREDENTIALS:
- Role: ${staff.role.toUpperCase()}
- Facility: ${staff.assignedFacilities?.[0] || 'Main Facility'}
- Login Email: ${staff.email}
- Temporary Password: ${staff.password}

System Link: ${window.location.origin}

Note: You will be asked to update your password on your first login.`);
  const mailtoUrl = `mailto:${encodeURIComponent(activeEmail)}?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border transition-all overflow-hidden bg-white dark:bg-[#061e12] border-slate-200 dark:border-emerald-800/80 text-slate-800 dark:text-white animate-scale-in"
      >
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-emerald-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-800/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Direct Staff Email Delivery</h3>
              <p className="text-xs text-slate-500 dark:text-emerald-300/70">
                {isSmtpConfigured ? 'Direct SMTP Delivery Active' : 'Configure SMTP for direct inbox delivery'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Status Alert Banner */}
          {result?.success ? (
            <div className="p-3.5 rounded-2xl border bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Email Delivered Directly
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 leading-relaxed">
                  {result.message || `Sent directly to ${activeEmail} without test intermediaries.`}
                </p>
              </div>
            </div>
          ) : result?.error ? (
            <div className="p-3.5 rounded-2xl border bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  {result.mode === 'not_configured' ? 'Direct SMTP Setup Needed' : 'Email Dispatch Alert'}
                </p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300/80 leading-relaxed">
                  {result.error}
                </p>
              </div>
            </div>
          ) : null}

          {/* Credentials Summary Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-emerald-900/60 bg-slate-50/70 dark:bg-[#031109] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-emerald-900/40">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recipient Details</span>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                {staff.id}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold">NAME</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{staff.name}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold">ROLE</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  {staff.role}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold">EMAIL</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {activeEmail}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold">FACILITY</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {staff.assignedFacilities?.[0] || 'Main Facility'}
                </span>
              </div>
            </div>

            {/* Password Box */}
            <div className="pt-2 border-t border-slate-200/70 dark:border-emerald-900/40 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold">TEMPORARY PASSWORD</span>
                <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  {staff.password}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-emerald-800/80 hover:bg-slate-100 dark:hover:bg-emerald-950 text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'Copied' : 'Copy Credentials'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons: Direct Send / 1-Click Mail Client */}
          <div className="space-y-2 pt-1">
            {/* Direct Mailto Launcher for Instant Guaranteed Delivery */}
            <a
              href={mailtoUrl}
              className="w-full py-3 px-4 rounded-xl bg-emerald-800 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-900/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send Instantly via Your Email Client (Gmail / Outlook)</span>
            </a>
          </div>

          {/* Direct Send via Configured Server SMTP */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-emerald-900/60 p-3.5 space-y-2 bg-slate-50/50 dark:bg-[#031109]/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-500" />
                <span>Send Directly via Server SMTP to:</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder={staff.email}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#04140b] text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onResend(customEmail || staff.email)}
                className="px-4 py-2 rounded-xl bg-emerald-800 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Email</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Custom SMTP Configuration */}
          <div className="pt-2 border-t border-slate-100 dark:border-emerald-950/80">
            <button
              type="button"
              onClick={() => setShowSmtpConfig(!showSmtpConfig)}
              className="text-[11px] font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 flex items-center justify-between w-full cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-1.5">
                <Settings className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isSmtpConfigured ? 'Direct SMTP Settings (Configured)' : 'Configure Direct SMTP (Gmail, Outlook, or Custom)'}</span>
              </div>
              <span className="text-emerald-500 font-bold">
                {showSmtpConfig ? 'Hide' : 'Configure'}
              </span>
            </button>

            {showSmtpConfig && (
              <form onSubmit={handleSaveSmtp} className="mt-3 p-3.5 rounded-2xl border border-slate-200 dark:border-emerald-900/60 bg-slate-50 dark:bg-[#031109] space-y-3 text-xs">
                {/* Provider Quick Presets */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5">QUICK PRESETS</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset('gmail')}
                      className="py-1.5 px-2 rounded-lg border border-slate-200 dark:border-emerald-900 bg-white dark:bg-[#04140b] text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-colors"
                    >
                      Gmail (App Password)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('outlook')}
                      className="py-1.5 px-2 rounded-lg border border-slate-200 dark:border-emerald-900 bg-white dark:bg-[#04140b] text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-colors"
                    >
                      Outlook / Office 365
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">SMTP HOST</label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#04140b] text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">PORT</label>
                    <input
                      type="number"
                      placeholder="465 or 587"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#04140b] text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">USERNAME / EMAIL</label>
                    <input
                      type="email"
                      placeholder="your-email@gmail.com"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#04140b] text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">APP PASSWORD</label>
                    <input
                      type="password"
                      placeholder="16-character App Password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#04140b] text-xs"
                      required
                    />
                  </div>
                </div>

                {verifyMessage && (
                  <div className={`p-2 rounded-lg text-xs font-semibold ${verifyMessage.success ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'}`}>
                    {verifyMessage.text}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    disabled={isTestingSmtp || !smtpHost || !smtpUser || !smtpPass}
                    onClick={handleTestConnection}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-emerald-900 hover:bg-slate-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {isTestingSmtp ? 'Testing...' : 'Test Connection'}
                  </button>

                  <div className="flex items-center space-x-2">
                    {smtpConfigSaved && (
                      <span className="text-[11px] font-bold text-emerald-500 flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved!</span>
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingSmtp}
                      className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer shadow-sm"
                    >
                      {isSavingSmtp ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-emerald-950/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-900/40 border border-slate-200 dark:border-emerald-900/60 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
