"use client";

/**
 * Inline Barcode Scanner Component
 *
 * Renders inline (not a modal) within the cart section.
 * Uses @zxing/browser with proper camera constraints for autofocus.
 * 3-second cooldown between scans to prevent duplicates.
 *
 * @module components/admin/BarcodeScanner
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Loader2, ScanBarcode, CheckCircle2, Timer, X } from "lucide-react";

const SCAN_COOLDOWN_MS = 3000;

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);

  // Refs to avoid stale closures inside decode callback
  const lastScanTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);
  
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const isCoolingDown = cooldownRemaining > 0;

  // Cooldown countdown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Stop scanner and release camera
  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch {}
      controlsRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start scanner on mount, stop on unmount
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setIsStarting(true);
      setError(null);

      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;

        const reader = new BrowserMultiFormatReader();
        // Reduce scan frequency → fewer console errors
        (reader as any).timeBetweenDecodingAttempts = 500;

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: "environment",
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        };

        const controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current!,
          (result) => {
            if (result) {
              const code = result.getText();
              const now = Date.now();
              if (now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) return;

              lastScanTimeRef.current = now;
              setLastScannedCode(code);
              setScanCount(prev => prev + 1);
              setCooldownRemaining(SCAN_COOLDOWN_MS);
              onScanRef.current(code);
            }
          }
        );

        if (cancelled) { controls.stop(); return; }
        controlsRef.current = controls;

        // Apply autofocus + optimal focus distance for 15-20cm scanning
        if (videoRef.current?.srcObject) {
          const track = (videoRef.current.srcObject as MediaStream).getVideoTracks()[0];
          try {
            const capabilities = track.getCapabilities?.() as any;
            const advancedConstraints: any[] = [];
            if (capabilities?.focusMode?.includes('continuous')) {
              advancedConstraints.push({ focusMode: 'continuous' });
            }
            if (capabilities?.focusDistance) {
              const { min, max } = capabilities.focusDistance;
              const target = min + (max - min) * 0.2;
              advancedConstraints.push({ focusDistance: target });
            }
            if (advancedConstraints.length > 0) {
              await track.applyConstraints({ advanced: advancedConstraints });
            }
          } catch {} // not supported on all devices/browsers
        }

        setIsStarting(false);
      } catch (err: any) {
        if (cancelled) return;
        setIsStarting(false);
        if (err.name === "NotAllowedError") {
          setError("Camera permission denied. Please allow camera access in your browser settings (click the lock icon in the address bar), then try again.");
        } else if (err.name === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError(err.message || "Failed to start camera.");
        }
      }
    };

    start();
    return () => { cancelled = true; stopScanner(); };
  }, [stopScanner]);

  const cooldownPercent = isCoolingDown ? (cooldownRemaining / SCAN_COOLDOWN_MS) * 100 : 0;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800">
        <div className="flex items-center gap-2">
          <ScanBarcode className="w-4 h-4 text-slate-300" />
          <span className="text-xs font-bold text-white">Camera Scanner</span>
          {scanCount > 0 && (
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/50 px-1.5 py-0.5 rounded">
              {scanCount} scanned
            </span>
          )}
        </div>
        <button
          onClick={() => { stopScanner(); onClose(); }}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Video feed — compact 16:7 aspect ratio */}
      <div className="relative aspect-[16/7] bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />

        {/* Scan guide */}
        {!isStarting && !error && !isCoolingDown && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4/5 h-3/5 border-2 border-white/50 rounded-lg" />
            <div className="absolute left-[10%] right-[10%] h-0.5 bg-red-400/60 animate-pulse" style={{ top: "50%" }} />
          </div>
        )}

        {/* Loading */}
        {isStarting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
            <Loader2 className="w-6 h-6 animate-spin mb-1" />
            <p className="text-xs font-medium">Starting camera...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4">
            <Camera className="w-8 h-8 mb-2 text-red-400" />
            <p className="text-xs text-center text-red-300 font-medium max-w-[260px]">{error}</p>
          </div>
        )}

        {/* Cooldown overlay */}
        {isCoolingDown && (
          <div className="absolute inset-0 bg-emerald-900/50 flex flex-col items-center justify-center pointer-events-none">
            <CheckCircle2 className="w-10 h-10 text-emerald-300 mb-1" />
            <p className="text-white font-bold text-sm">Scanned!</p>
            <p className="text-emerald-200 font-mono text-xs mt-0.5">{lastScannedCode}</p>
            <div className="mt-2 flex items-center gap-1 text-emerald-200 text-[10px]">
              <Timer className="w-3 h-3" />
              <span>Next scan in {Math.ceil(cooldownRemaining / 1000)}s</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-900/50">
              <div className="h-full bg-emerald-400 transition-all duration-100" style={{ width: `${100 - cooldownPercent}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
