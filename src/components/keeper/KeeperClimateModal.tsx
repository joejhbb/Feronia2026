import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Thermometer, 
  Camera, 
  Upload, 
  Trash2, 
  Send,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Enclosure, Animal } from '../../types';

interface KeeperClimateModalProps {
  enclosure: Enclosure;
  isOpen?: boolean;
  onClose: () => void;
  onSave: (updatedEnclosure: Enclosure) => void;
  animals?: Animal[];
  keeperName?: string;
  isDarkMode?: boolean;
}

export const KeeperClimateModal: React.FC<KeeperClimateModalProps> = ({
  enclosure,
  isOpen = true,
  onClose,
  onSave,
  animals = [],
  keeperName: keeperNameProp,
  isDarkMode = true,
}) => {
  if (isOpen === false) return null;

  const currentProfile = enclosure.climateProfile;
  const currentTempNum = parseFloat(enclosure.temperature || '31') || 31;

  const [actualTemp, setActualTemp] = useState<string>(currentTempNum.toString());
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [photoProof, setPhotoProof] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up camera stream when modal unmounts
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Synchronous Trigger for Native Device Camera Shutter (Always works on Phone, Tablet & Laptop)
  const triggerNativeCamera = () => {
    setCameraError(null);
    setPhotoError(null);
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Live Webcam Stream Option for Laptops/Desktops
  const handleLiveWebcamClick = () => {
    setCameraError(null);
    setPhotoError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      triggerNativeCamera();
      return;
    }

    setIsCameraActive(true);

    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('Primary webcam error:', err);
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          })
          .catch(() => {
            setIsCameraActive(false);
            setCameraError('Live webcam unavailable. Switching to camera device...');
            triggerNativeCamera();
          });
      });
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Add timestamp & enclosure overlay onto photo proof
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(10, canvas.height - 35, canvas.width - 20, 25);
        ctx.fillStyle = '#00FF99';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`PROOFTAG: ${enclosure.name || enclosure.id} | ${actualTemp}°C | ${new Date().toLocaleTimeString()}`, 15, canvas.height - 18);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoProof(dataUrl);
        setPhotoError(null);
        stopCameraStream();
      }
    } catch (e) {
      console.error('Error snapping photo:', e);
    }
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoProof(event.target?.result as string);
        setPhotoError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!photoProof) {
      setPhotoError('Physical Photo Proof is REQUIRED before confirming!');
      return;
    }

    if (!isConfirmed) return;

    setIsSubmitting(true);
    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + new Date().toLocaleDateString();
    const keeper = keeperNameProp || 'Keeper';
    const parsedNum = parseFloat(actualTemp);
    const finalTempStr = !isNaN(parsedNum) ? `${parsedNum}°C` : `${actualTemp.trim()}°C`;

    const updatedProfile = {
      ...(currentProfile || { isActive: true }),
      status: 'Approved' as const,
      dayTemp: !isNaN(parsedNum) ? parsedNum : currentTempNum,
      nightTemp: !isNaN(parsedNum) ? parsedNum : currentTempNum,
      configuredByKeeper: keeper,
      configuredAt: nowFormatted,
      notes: notes ? `${notes} (Physical photo proof attached)` : `Climate set to ${finalTempStr} and verified by keeper with physical photo proof.`,
      photoProofUrl: photoProof
    };

    const updatedEnclosure: Enclosure = {
      ...enclosure,
      temperature: finalTempStr,
      climateProfile: updatedProfile
    };

    setTimeout(() => {
      onSave(updatedEnclosure);
      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        onClose();
      }, 1000);
    }, 300);
  };

  // Determine short description range based on profile or default
  const reqRange = currentProfile?.coolingTempRange 
    ? currentProfile.coolingTempRange 
    : 'Cooling Target: 20°C – 22°C (Off-Season Conditioning / Brumation)';

  const parsedActual = parseFloat(actualTemp);

  // Helper to extract numeric range
  const targetBounds = React.useMemo(() => {
    if (!reqRange) return null;
    const celsiusMatches = reqRange.match(/(\d+(?:\.\d+)?)\s*°?C?\s*(?:–|-|to)\s*(\d+(?:\.\d+)?)\s*°?C/i);
    if (celsiusMatches) {
      const min = parseFloat(celsiusMatches[1]);
      const max = parseFloat(celsiusMatches[2]);
      if (!isNaN(min) && !isNaN(max)) {
        return { min: Math.min(min, max), max: Math.max(min, max) };
      }
    }
    const singleMatch = reqRange.match(/(\d+(?:\.\d+)?)\s*°C/i);
    if (singleMatch) {
      const val = parseFloat(singleMatch[1]);
      if (!isNaN(val)) return { min: val, max: val };
    }
    return null;
  }, [reqRange]);

  const isOutOfRange = React.useMemo(() => {
    if (isNaN(parsedActual) || !targetBounds) return false;
    return parsedActual < targetBounds.min || parsedActual > targetBounds.max;
  }, [parsedActual, targetBounds]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
      onClick={() => {
        stopCameraStream();
        onClose();
      }}
    >
      <div 
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${
          isDarkMode 
            ? 'bg-[#061A10] border-emerald-950 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Simple & Clean */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDarkMode ? 'border-emerald-950/80 bg-[#04140D]' : 'border-slate-100 bg-emerald-50/60'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Enclosure Climate Confirmation
              </h3>
              <p className="text-xs text-slate-400">
                Enclosure: <strong className="text-emerald-400 font-bold">{enclosure.name || enclosure.id}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isDarkMode 
                ? 'border-emerald-900/60 bg-[#04140D] hover:bg-emerald-950/60 text-slate-400 hover:text-white' 
                : 'border-slate-200 hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs overflow-y-auto no-scrollbar max-h-[80vh]">
          {/* Target Requirement Short Description */}
          <div className={`p-3.5 rounded-2xl border space-y-1 ${
            isDarkMode ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
              📋 Target Climate Requirement
            </span>
            <p className="text-xs font-bold leading-relaxed">
              {reqRange}
            </p>
            {currentProfile?.requestedBy && (
              <p className="text-[11px] text-amber-300/80 italic">
                Requested by: {currentProfile.requestedBy}
              </p>
            )}
          </div>

          {/* Actual Set Temperature Input */}
          <div className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
            isOutOfRange
              ? 'bg-amber-950/20 border-amber-500/80'
              : (isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50 border-slate-200')
          }`}>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-white leading-snug">
                Actual Set Temperature for {enclosure.name ? (enclosure.name.toLowerCase().includes('enclosure') ? enclosure.name : `Enclosure ${enclosure.name}`) : enclosure.id} (°C) *
              </label>
              {isOutOfRange && (
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse">
                  OUT OF RANGE
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="0.1"
                min="5"
                max="50"
                value={actualTemp}
                onChange={(e) => setActualTemp(e.target.value)}
                required
                placeholder="e.g. 21.5"
                className={`w-full px-3.5 py-2.5 rounded-xl border font-mono font-bold text-sm focus:outline-none transition-colors ${
                  isOutOfRange
                    ? 'bg-amber-950/40 border-amber-500 text-amber-200 focus:border-amber-400'
                    : isDarkMode 
                    ? 'bg-[#04140D] border-emerald-950 text-emerald-300 focus:border-emerald-500' 
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              />
              <span className="text-sm font-bold text-slate-400 pr-1 shrink-0">°C</span>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-950/60 font-medium">
              <span className="text-slate-400">Current on record: <strong className="text-slate-300">{enclosure.temperature || '31°C'}</strong></span>
              <span className={`font-bold ${isOutOfRange ? 'text-amber-300' : 'text-emerald-400'}`}>
                New Live Value: {actualTemp ? `${actualTemp}°C` : '—'}
              </span>
            </div>

            {isOutOfRange ? (
              <div className="p-3 bg-amber-500/20 border border-amber-500/80 text-amber-200 rounded-xl text-xs font-bold flex items-start space-x-2.5 animate-fade-in shadow-md">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <span className="font-black text-amber-300 block uppercase tracking-wider text-[10px]">
                    ⚠️ Temperature Warning: Outside Target Requirement!
                  </span>
                  <p className="text-[11px] text-amber-100 font-semibold leading-relaxed">
                    Your set temperature of <strong className="text-amber-300 font-extrabold">{actualTemp}°C</strong> is outside the requested target requirement ({targetBounds ? `${targetBounds.min}°C – ${targetBounds.max}°C` : reqRange}).
                  </p>
                  <p className="text-[10px] text-amber-300/90 italic">
                    Please double-check your physical thermostat settings before confirming.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-emerald-400/90 italic font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Saving will instantly update this enclosure's live target climate record to {actualTemp ? `${actualTemp}°C` : 'your input'}.</span>
              </p>
            )}
          </div>

          {/* Photo Proof Attachment (REQUIRED) */}
          <div className={`p-4 rounded-2xl border space-y-3 transition-colors ${
            photoError 
              ? 'bg-rose-950/40 border-rose-500/80' 
              : photoProof 
              ? 'bg-[#041a0e] border-emerald-500/80'
              : (isDarkMode ? 'bg-[#04110A] border-amber-500/50' : 'bg-amber-50 border-amber-300')
          }`}>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-white flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Attach Physical Photo Proof *</span>
              </label>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                REQUIRED
              </span>
            </div>

            {/* Active Live Camera Stream */}
            {isCameraActive ? (
              <div className="space-y-2 animate-fade-in">
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-black aspect-video flex items-center justify-center shadow-lg">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[9px] flex items-center space-x-1 animate-pulse shadow-md">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    <span>LIVE CAMERA</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={capturePhotoFromCamera}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Snap Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-3 py-2.5 border border-slate-700 text-slate-300 hover:text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : photoProof ? (
              <div className="relative rounded-2xl overflow-hidden border border-emerald-800/60 bg-black/40 p-1 animate-fade-in">
                <img src={photoProof} alt="Climate Proof" className="w-full h-40 object-cover rounded-xl" />
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold shadow-xs flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Physical Proof Attached</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoProof(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-xl bg-rose-600/90 text-white hover:bg-rose-500 cursor-pointer shadow-md transition-all active:scale-90"
                  title="Remove photo and retake"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  {/* 1. Camera / Take Photo */}
                  <button
                    type="button"
                    onClick={triggerNativeCamera}
                    className="p-4 rounded-2xl border border-emerald-900/60 hover:border-emerald-500/80 bg-[#04140D]/80 hover:bg-emerald-950/50 flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all group active:scale-95"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-extrabold text-emerald-300">Camera</span>
                    <span className="text-[10px] text-slate-400">Take photo</span>
                  </button>

                  {/* 2. Attach Image */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-2xl border border-emerald-900/60 hover:border-emerald-500/80 bg-[#04140D]/80 hover:bg-emerald-950/50 flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all group active:scale-95"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-extrabold text-emerald-300">Attach Image</span>
                    <span className="text-[10px] text-slate-400">Select photo file</span>
                  </button>
                </div>

                {/* Optional Live Webcam stream for laptops */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleLiveWebcamClick}
                    className="text-[11px] text-slate-400 hover:text-emerald-400 underline cursor-pointer transition-colors"
                  >
                    💻 Or open Live Webcam View
                  </button>
                </div>
              </div>
            )}

            {photoError && (
              <div className="text-rose-400 text-[11px] font-bold flex items-center space-x-1 animate-pulse pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{photoError}</span>
              </div>
            )}

            {cameraError && (
              <p className="text-[10px] text-amber-300/80 italic">
                {cameraError}
              </p>
            )}

            {/* Hidden Inputs for Direct Native Device Camera Capture and File Picker */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Confirmation Checkbox */}
          <label className={`flex items-start space-x-3 p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
            isConfirmed 
              ? (isDarkMode ? 'bg-[#052215] border-emerald-600' : 'bg-emerald-50 border-emerald-300')
              : (isDarkMode ? 'bg-[#04110A] border-emerald-950 hover:border-emerald-800' : 'bg-slate-50 border-slate-200')
          }`}>
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-emerald-600 accent-emerald-500 rounded cursor-pointer shrink-0"
              required
            />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-white block">
                I confirm that I have set and verified this enclosure temperature
              </span>
              <span className="text-[11px] text-slate-400">
                Thermostat updated and verified physically by keeper.
              </span>
            </div>
          </label>

          {/* Success Notification */}
          {submittedSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Climate confirmation saved! Enclosure record updated.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-emerald-950 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="px-4 py-2 border border-emerald-950 hover:border-emerald-800 rounded-xl font-bold text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isConfirmed || !photoProof}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer shadow-md transition-all active:scale-95 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Confirm & Save Climate Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
