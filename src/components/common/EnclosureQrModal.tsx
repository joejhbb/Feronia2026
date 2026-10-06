import React, { useState, useEffect } from 'react';
import { X, QrCode, Download, Printer, Copy, Check, Eye, Shield, Building, Users, Thermometer, ExternalLink } from 'lucide-react';
import { Enclosure, Animal } from '../../types';
import { generateEnclosureQrDataUrl, formatEnclosureQrString } from '../../utils/qrUtils';

interface EnclosureQrModalProps {
  enclosure: Enclosure;
  animals: Animal[];
  onClose: () => void;
  onInspectEnclosure: (enclosure: Enclosure) => void;
  isDarkMode?: boolean;
}

export default function EnclosureQrModal({
  enclosure,
  animals,
  onClose,
  onInspectEnclosure,
  isDarkMode = true
}: EnclosureQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Find animals inside this enclosure
  const assignedAnimals = animals.filter(
    a => a.enclosureId === enclosure.id || a.enclosureId === enclosure.name
  );

  useEffect(() => {
    let isMounted = true;
    generateEnclosureQrDataUrl(enclosure, 360)
      .then(url => {
        if (isMounted) {
          setQrDataUrl(url);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to generate QR code:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [enclosure]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `FERONIA-QR-${enclosure.id}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Enclosure Label - ${enclosure.name} (${enclosure.id})</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 90vh;
              background: #f8fafc;
              margin: 0;
            }
            .label-card {
              width: 380px;
              border: 3px solid #113C24;
              border-radius: 16px;
              padding: 24px;
              background: #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              text-align: center;
            }
            .header-tag {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              color: #113C24;
              margin-bottom: 4px;
            }
            .enc-name {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              margin: 0 0 4px 0;
            }
            .enc-id {
              font-family: monospace;
              font-size: 14px;
              font-weight: 700;
              color: #047857;
              background: #ecfdf5;
              display: inline-block;
              padding: 3px 10px;
              border-radius: 6px;
              margin-bottom: 16px;
            }
            .qr-img {
              width: 240px;
              height: 240px;
              margin: 0 auto 16px auto;
              display: block;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 8px;
            }
            .specs {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              text-align: left;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 10px 14px;
              font-size: 12px;
              margin-bottom: 14px;
            }
            .specs strong {
              color: #334155;
            }
            .instructions {
              font-size: 10px;
              color: #64748b;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header-tag">Feronia Wildlife Facility</div>
            <h1 class="enc-name">${enclosure.name}</h1>
            <div class="enc-id">${enclosure.id}</div>
            <img src="${qrDataUrl}" class="qr-img" alt="QR Code" />
            <div class="specs">
              <div><strong>Facility:</strong> ${enclosure.facility}</div>
              <div><strong>Type:</strong> ${enclosure.type}</div>
              <div><strong>Target Temp:</strong> ${enclosure.temperature || '31°C'}</div>
              <div><strong>Capacity:</strong> ${enclosure.capacity} Animals</div>
            </div>
            <div class="instructions">Scan via Feronia Wildlife App to inspect animals & logs</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyCode = () => {
    const code = formatEnclosureQrString(enclosure);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-emerald-900/40 flex items-center justify-between bg-emerald-950/30">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight">Enclosure QR Pass</h3>
              <p className="text-xs text-emerald-400/80 font-medium">Scannable Field ID Label</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center">
          {/* Enclosure Identity Card */}
          <div className="w-full text-center mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-800/60">
              {enclosure.id}
            </span>
            <h2 className="text-lg font-black mt-1 text-slate-900 dark:text-white">
              {enclosure.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              🏢 {enclosure.facility} • {enclosure.type}
            </p>
          </div>

          {/* QR Code Container */}
          <div className="relative p-4 rounded-2xl bg-white border-2 border-emerald-500/40 shadow-xl flex items-center justify-center mb-4">
            {loading ? (
              <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400">
                <QrCode className="w-10 h-10 animate-pulse text-emerald-600 mb-2" />
                <span className="text-xs font-bold">Generating QR Code...</span>
              </div>
            ) : qrDataUrl ? (
              <div className="relative group">
                <img 
                  src={qrDataUrl} 
                  alt={`QR Code for ${enclosure.name}`} 
                  className="w-56 h-56 object-contain rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-xs transition-opacity rounded-lg">
                  <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-md">
                    Scannable
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-rose-500 text-xs font-bold">
                Failed to generate QR
              </div>
            )}
          </div>

          {/* Enclosure Specs Summary */}
          <div className={`w-full grid grid-cols-3 gap-2 p-3 rounded-xl border mb-5 text-center ${
            isDarkMode ? 'bg-[#071F11]/60 border-emerald-900/40' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Animals</span>
              <span className="text-xs font-extrabold text-emerald-400 mt-0.5 block">
                {assignedAnimals.length} {assignedAnimals.length === 1 ? 'Reptile' : 'Reptiles'}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Target Temp</span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                {enclosure.temperature || '31°C'}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Condition</span>
              <span className={`text-xs font-bold mt-0.5 inline-block px-1.5 py-0.5 rounded-full ${
                enclosure.condition === 'Good' 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {enclosure.condition || 'Good'}
              </span>
            </div>
          </div>

          {/* Utility Actions */}
          <div className="w-full grid grid-cols-3 gap-2">
            <button
              onClick={handlePrint}
              className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-900/80 hover:bg-slate-800 border-emerald-900/60 text-slate-200' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print Card</span>
            </button>

            <button
              onClick={handleDownload}
              className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-900/80 hover:bg-slate-800 border-emerald-900/60 text-slate-200' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save PNG</span>
            </button>

            <button
              onClick={handleCopyCode}
              className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-900/80 hover:bg-slate-800 border-emerald-900/60 text-slate-200' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
