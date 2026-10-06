import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Camera, Upload, List, QrCode, AlertCircle, CheckCircle2, 
  RefreshCw, Search, Shield, Building, PawPrint, Eye
} from 'lucide-react';
import { Enclosure, Animal } from '../../types';
import { resolveEnclosureFromScan, decodeQrFromImageData, playScanSound } from '../../utils/qrUtils';

interface QrScannerModalProps {
  enclosures: Enclosure[];
  animals: Animal[];
  onClose: () => void;
  onEnclosureDetected: (enclosure: Enclosure) => void;
  isDarkMode?: boolean;
}

export default function QrScannerModal({
  enclosures,
  animals,
  onClose,
  onEnclosureDetected,
  isDarkMode = true
}: QrScannerModalProps) {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'list'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [manualQuery, setManualQuery] = useState('');
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize camera stream
  useEffect(() => {
    if (activeMode !== 'camera') {
      stopCamera();
      return;
    }

    let isMounted = true;
    setCameraError(null);

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported on this browser or environment.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(e => console.warn('Video play warning:', e));
        }

        // Start scanning frames
        scanVideoFrame();
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        if (isMounted) {
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'Camera permission was denied. You can use the "Upload Photo" or "Quick Select" tabs below.'
              : 'Webcam not detected or unavailable in this environment. Please use the "Upload Photo" or "Quick Select" options below.'
          );
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [activeMode]);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleSuccessfulMatch = (enclosure: Enclosure) => {
    stopCamera();
    playScanSound();
    onEnclosureDetected(enclosure);
  };

  // Frame processing loop for live video
  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const scannedText = decodeQrFromImageData(imageData);

          if (scannedText) {
            const matched = resolveEnclosureFromScan(scannedText, enclosures);
            if (matched) {
              handleSuccessfulMatch(matched);
              return;
            }
          }
        } catch {
          // ignore processing frame errors
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  // Handle Photo File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFeedback('Analyzing image for QR code...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setUploadFeedback('Unable to process image.');
          return;
        }

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const scannedText = decodeQrFromImageData(imageData);

        if (scannedText) {
          const matched = resolveEnclosureFromScan(scannedText, enclosures);
          if (matched) {
            setUploadFeedback(`QR Code recognized: ${matched.name} (${matched.id})`);
            setTimeout(() => {
              handleSuccessfulMatch(matched);
            }, 500);
          } else {
            setUploadFeedback(`Scanned payload: "${scannedText}", but no matching enclosure was found in database.`);
          }
        } else {
          setUploadFeedback('No valid QR code was detected in this photo. Please ensure it is well-lit and unobstructed.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle Manual search / ID submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    const matched = resolveEnclosureFromScan(manualQuery.trim(), enclosures);
    if (matched) {
      handleSuccessfulMatch(matched);
    } else {
      setUploadFeedback(`No enclosure matches code "${manualQuery}".`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-emerald-900/40 flex items-center justify-between bg-emerald-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight text-white">Enclosure QR Field Scanner</h3>
              <p className="text-xs text-emerald-400/80 font-medium">Automatic Enclosure & Animals Detection</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 p-2 bg-black/40 border-b border-emerald-900/40 gap-1">
          <button
            onClick={() => setActiveMode('camera')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeMode === 'camera'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Camera</span>
          </button>

          <button
            onClick={() => setActiveMode('upload')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeMode === 'upload'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>

          <button
            onClick={() => setActiveMode('list')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeMode === 'list'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Select Enclosure</span>
          </button>
        </div>

        {/* Scanner View Area */}
        <div className="p-4 sm:p-5 flex flex-col items-center">
          {/* CAMERA MODE */}
          {activeMode === 'camera' && (
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="w-full p-6 text-center rounded-2xl bg-amber-950/30 border border-amber-800/40 my-2">
                  <AlertCircle className="w-10 h-10 mx-auto text-amber-400 mb-2" />
                  <h4 className="text-sm font-extrabold text-amber-300">Camera Feed Notice</h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {cameraError}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => setActiveMode('list')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
                    >
                      Choose from Enclosures List
                    </button>
                    <button
                      onClick={() => setActiveMode('upload')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all"
                    >
                      Upload QR Image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/50 shadow-2xl flex items-center justify-center group">
                  {/* Real Video Element */}
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                  />
                  {/* Hidden Offscreen Canvas for Frame Reading */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Targeting Overlay Frame */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    {/* Targeting Corner Brackets */}
                    <div className="relative w-56 h-56 border-2 border-emerald-400/80 rounded-2xl shadow-inner">
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                      {/* Animated Laser Scanning Line */}
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" 
                        style={{
                          animation: 'scanLaser 2.2s infinite ease-in-out'
                        }}
                      />
                    </div>

                    <span className="mt-4 px-3 py-1 bg-black/75 backdrop-blur-md rounded-full text-xs font-bold text-emerald-300 border border-white/10 shadow-lg">
                      Point camera at Enclosure QR Pass
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UPLOAD PHOTO MODE */}
          {activeMode === 'upload' && (
            <div className="w-full space-y-4">
              <label className="w-full aspect-video border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 rounded-2xl flex flex-col items-center justify-center p-6 bg-emerald-950/20 hover:bg-emerald-950/30 transition-all cursor-pointer group">
                <Upload className="w-10 h-10 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white">Click or drag & drop QR image here</span>
                <span className="text-xs text-slate-400 mt-1">Supports PNG, JPG, or screenshot files</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>

              {uploadFeedback && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs font-medium text-emerald-300 text-center animate-fade-in">
                  {uploadFeedback}
                </div>
              )}
            </div>
          )}

          {/* DIRECT SELECT FROM ENCLOSURE LIST */}
          {activeMode === 'list' && (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  Select Enclosure to Inspect ({enclosures.length})
                </span>
                <span className="text-xs text-slate-400 font-medium">Direct Unit Select</span>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {enclosures.map(enc => {
                  const occupants = animals.filter(
                    a => a.enclosureId === enc.id || a.enclosureId === enc.name
                  );

                  return (
                    <div
                      key={enc.id}
                      onClick={() => handleSuccessfulMatch(enc)}
                      className={`p-3 rounded-xl border transition-all duration-150 flex items-center justify-between cursor-pointer group ${
                        isDarkMode 
                          ? 'bg-[#071F11] border-emerald-900/50 hover:bg-[#0A2E19] hover:border-emerald-500' 
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-emerald-600'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {enc.id}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              {enc.facility}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                            {enc.name}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {occupants.length} {occupants.length === 1 ? 'Reptile' : 'Reptiles'} housed • Temp {enc.temperature || '31°C'}
                          </p>
                        </div>
                      </div>

                      <button
                        className="px-3 py-1.5 bg-emerald-600 group-hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg shadow-xs transition-all flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Manual Code Input */}
          <form onSubmit={handleManualSubmit} className="w-full mt-4 pt-4 border-t border-emerald-900/40 flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Or enter Enclosure ID (e.g. E-01)..."
                className={`w-full pl-9 pr-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-black/50 border-emerald-900/60 text-white focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
                }`}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Verify
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
