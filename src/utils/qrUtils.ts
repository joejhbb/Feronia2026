/**
 * Feronia Wildlife Facility Management Information System
 * Capstone Project - QR Code Utility Service
 * 
 * Supports generating high-resolution QR codes for enclosures
 * and decoding scanned QR images / video frames using jsQR.
 */

import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { Enclosure } from '../types';

export interface EnclosureQrPayload {
  system: 'FERONIA_WILDLIFE';
  type: 'ENCLOSURE';
  id: string;
  name: string;
  facility: string;
}

/**
 * Generate a standard QR payload string for an enclosure.
 * Formatted as a Web URL so native smartphone camera apps (iOS/Android) 
 * can tap-to-open directly without needing to enter the link manually.
 */
export function formatEnclosureQrString(enclosure: Enclosure): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    const pathname = window.location.pathname || '';
    return `${origin}${pathname}?enclosure=${encodeURIComponent(enclosure.id)}`;
  }
  return `https://feronia-wildlife.app/?enclosure=${encodeURIComponent(enclosure.id)}`;
}

/**
 * Generate a scannable QR Code Data URL (PNG) for an enclosure
 */
export async function generateEnclosureQrDataUrl(
  enclosure: Enclosure, 
  size = 320
): Promise<string> {
  const payload = formatEnclosureQrString(enclosure);
  return QRCode.toDataURL(payload, {
    width: size,
    margin: 2,
    color: {
      dark: '#113C24', // Deep wildlife forest green
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
}

/**
 * Parse any scanned string to locate the matching enclosure from the facility database
 */
export function resolveEnclosureFromScan(
  scannedText: string, 
  enclosures: Enclosure[]
): Enclosure | null {
  if (!scannedText || typeof scannedText !== 'string') return null;
  const raw = scannedText.trim();

  // 1. Try parsing JSON format
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id) {
      const match = enclosures.find(
        e => e.id.toLowerCase() === String(parsed.id).toLowerCase() ||
             e.name.toLowerCase() === String(parsed.name || '').toLowerCase()
      );
      if (match) return match;
    }
  } catch {
    // not JSON, continue
  }

  // 2. Try prefixed formats like FERONIA:ENC:E-01 or FERONIA-ENC-E-01
  const prefixMatch = raw.match(/(?:FERONIA[:_-]ENC[:_-]|ENC[:_-]|ENCLOSURE[:_-])([a-zA-Z0-9_-]+)/i);
  if (prefixMatch && prefixMatch[1]) {
    const targetId = prefixMatch[1].trim().toLowerCase();
    const match = enclosures.find(e => e.id.toLowerCase() === targetId);
    if (match) return match;
  }

  // 3. Try matching direct ID (case-insensitive)
  const directIdMatch = enclosures.find(
    e => e.id.toLowerCase() === raw.toLowerCase()
  );
  if (directIdMatch) return directIdMatch;

  // 4. Try matching direct enclosure name
  const nameMatch = enclosures.find(
    e => e.name.toLowerCase() === raw.toLowerCase()
  );
  if (nameMatch) return nameMatch;

  // 5. Try matching URL query parameter (e.g. ?enclosure=E-01 or /enclosure/E-01)
  const urlParamMatch = raw.match(/[?&]enclosure=([a-zA-Z0-9_-]+)/i) || raw.match(/\/enclosure\/([a-zA-Z0-9_-]+)/i);
  if (urlParamMatch && urlParamMatch[1]) {
    const targetId = urlParamMatch[1].toLowerCase();
    const match = enclosures.find(e => e.id.toLowerCase() === targetId);
    if (match) return match;
  }

  return null;
}

/**
 * Decodes QR code from a canvas ImageData using jsQR
 */
export function decodeQrFromImageData(imageData: ImageData): string | null {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });
    return code ? code.data : null;
  } catch (err) {
    console.warn('[QR Utility] Decode error:', err);
    return null;
  }
}

/**
 * Plays a clean, professional auditory confirmation chime on scan
 */
export function playScanSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First tone (higher note)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.12);

    // Second tone (harmonious higher ping)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.08); // A6
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.25);
  } catch {
    // Audio playback not supported or user hasn't interacted with page
  }
}
