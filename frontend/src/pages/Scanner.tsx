import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { locationsApi, itemsApi } from '../services/api';
import { Item } from '../types';
import { logger } from '../services/logger';
import toast from 'react-hot-toast';
import {
  CameraIcon,
  ArrowPathIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  VideoCameraSlashIcon,
  BoltIcon,
  BoltSlashIcon,
  CubeIcon,
  CheckCircleIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

// Scan history entry type
interface ScanHistoryEntry {
  type: 'location' | 'item';
  code: string;
  name: string;
  id: string;
  timestamp: number;
}

// Play success beep using Web Audio API
const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1200; // Hz
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15); // 150ms beep
  } catch {
    // Audio not supported, fail silently
  }
};

// Format timestamp as time ago
const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// Styles to ensure html5-qrcode video is visible
const scannerStyles = `
  #scanner-container {
    position: relative;
    width: 100%;
    min-height: 300px;
  }
  #scanner-container video {
    width: 100% !important;
    height: auto !important;
    object-fit: cover;
  }
  #scanner-container img {
    display: none;
  }
`;

export default function Scanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false); // Track scanner state for cleanup
  const scannerContainerId = 'scanner-container';

  // Find mode state
  const findMode = searchParams.get('mode') === 'find';
  const targetItemId = searchParams.get('itemId');
  const passedItem = location.state?.item as Item | undefined;
  const [targetItem, setTargetItem] = useState<Item | null>(passedItem || null);
  const [findResult, setFindResult] = useState<'found' | 'not-found' | null>(null);

  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isMobile] = useState(() => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  const [isChrome] = useState(() => /Chrome/i.test(navigator.userAgent) && !/Edg/i.test(navigator.userAgent));
  const [isFirefox] = useState(() => /Firefox/i.test(navigator.userAgent));

  // Scan history state
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

  // Load scan history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scanHistory');
      if (saved) setScanHistory(JSON.parse(saved));
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Add entry to scan history
  const addToHistory = (entry: Omit<ScanHistoryEntry, 'timestamp'>) => {
    setScanHistory(prev => {
      const newHistory = [
        { ...entry, timestamp: Date.now() },
        ...prev.filter(h => h.id !== entry.id) // Remove duplicates
      ].slice(0, 15); // Keep last 15
      localStorage.setItem('scanHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // Clear scan history
  const clearHistory = () => {
    setScanHistory([]);
    localStorage.removeItem('scanHistory');
  };

  // Initialize scanner and enumerate cameras
  useEffect(() => {
    const initScanner = async () => {
      try {
        // Get available cameras
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const cameraList = devices.map(d => ({ id: d.id, label: d.label || `Camera ${devices.indexOf(d) + 1}` }));
          setCameras(cameraList);

          // Prefer back camera on mobile
          const backCamera = cameraList.find(
            c => c.label.toLowerCase().includes('back') ||
                 c.label.toLowerCase().includes('rear') ||
                 c.label.toLowerCase().includes('environment')
          );
          setSelectedCamera(backCamera?.id || cameraList[0].id);
        } else {
          setCameraError('No camera found on this device.');
        }
      } catch (err: any) {
        logger.error(`Failed to enumerate cameras: ${err?.message || err}`);
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera permission denied. Please allow camera access and refresh.');
        } else {
          setCameraError('Unable to access camera: ' + (err.message || 'Unknown error'));
        }
      }
    };

    initScanner();

    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current && isScanningRef.current) {
        isScanningRef.current = false;
        try {
          const scanner = scannerRef.current;
          scanner.stop().catch(() => {});
          scanner.clear();
        } catch {
          // Ignore cleanup errors - scanner may already be stopped
        }
      }
    };
  }, []);

  // Fetch target item when in find mode
  useEffect(() => {
    if (findMode && targetItemId && !targetItem) {
      itemsApi.getOne(targetItemId)
        .then(res => setTargetItem(res.data.data))
        .catch(() => {
          toast.error('Item not found');
          navigate('/scanner');
        });
    }
  }, [findMode, targetItemId, targetItem, navigate]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current && isScanningRef.current) {
      isScanningRef.current = false;
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
    }
    setScanning(false);
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startScanning = useCallback(async () => {
    if (!selectedCamera) {
      toast.error('No camera selected');
      return;
    }

    setCameraError(null);
    setLastScanned(null);
    setTorchOn(false);

    try {
      // Clear previous scanner if exists
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch {
          // Ignore cleanup errors
        }
        scannerRef.current = null;
      }

      // Create new scanner instance - supports QR and legacy barcodes
      scannerRef.current = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,  // Legacy support
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        verbose: false,
        useBarCodeDetectorIfSupported: true,  // Use native hardware detection when available
      });

      // Dynamic qrbox - 70% of smaller dimension for better detection
      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minEdge * 0.7);
        return { width: qrboxSize, height: qrboxSize };
      };

      // Start scanning with camera facing mode for mobile
      const cameraConfig = isMobile
        ? { facingMode: "environment" }
        : selectedCamera;

      await scannerRef.current.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: qrboxFunction,
        },
        (decodedText) => {
          // Success - barcode detected
          if (decodedText !== lastScanned) {
            setLastScanned(decodedText);
            handleCodeDetected(decodedText);
          }
        },
        () => {
          // Error callback - just means no barcode found this frame, ignore
        }
      );

      isScanningRef.current = true;
      setScanning(true);

      // Check torch support after starting
      try {
        const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
        if (capabilities.torchFeature().isSupported()) {
          setTorchSupported(true);
          logger.info('Torch is supported on this device');
        }
      } catch (e) {
        logger.debug('Could not check torch support');
      }

    } catch (err: any) {
      logger.error(`Failed to start scanning: ${err?.message || err}`);
      setCameraError(err.message || 'Failed to start camera');
      setScanning(false);
    }
  }, [selectedCamera, lastScanned]);

  const handleCodeDetected = async (code: string) => {
    // Stop scanning temporarily
    await stopScanning();

    // FIND MODE: Compare scanned location barcode with target item's location
    if (findMode && targetItem) {
      if (!targetItem.location?.barcode) {
        toast.error('This item has no assigned location with a QR code');
        setFindResult('not-found');
        setTimeout(() => {
          setFindResult(null);
          setLastScanned(null);
          startScanning();
        }, 2000);
        return;
      }

      if (code === targetItem.location.barcode) {
        // SUCCESS - Found the item's location!
        setFindResult('found');
        playSuccessSound();
        navigator.vibrate?.(200); // Haptic feedback
      } else {
        // Not the right location - keep searching
        setFindResult('not-found');
        toast('Not here - keep scanning', { icon: '🔍' });
        setTimeout(() => {
          setFindResult(null);
          setLastScanned(null);
          startScanning();
        }, 1500);
      }
      return;
    }

    // NORMAL MODE: Look up location first, then try item SKU
    toast.loading('Looking up code...', { id: 'lookup' });

    try {
      // Try location first
      const response = await locationsApi.scanBarcode(code);
      toast.dismiss('lookup');
      playSuccessSound();
      addToHistory({ type: 'location', code, name: response.data.data.name, id: response.data.data.id });
      toast.success(`Location: ${response.data.data.name}`);
      navigate(`/locations/${response.data.data.id}`);
    } catch (locError: any) {
      // If location not found (404), try item SKU
      if (locError.response?.status === 404) {
        try {
          const itemRes = await itemsApi.scanSku(code);
          const item = itemRes.data.data;
          toast.dismiss('lookup');
          playSuccessSound();
          addToHistory({ type: 'item', code, name: item.name, id: item.id });
          toast.success(`Item: ${item.name}`);
          navigate(`/items/${item.id}`);
          return;
        } catch {
          // Item lookup failed, continue to error
        }
        // Neither location nor item found
        toast.dismiss('lookup');
        toast.error('No location or item found for this code');
      } else {
        toast.dismiss('lookup');
        toast.error(locError.response?.data?.message || 'Failed to lookup code');
      }
      // Resume scanning after error
      setTimeout(() => {
        setLastScanned(null);
        startScanning();
      }, 2000);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const code = manualCode.trim();

    // FIND MODE: Compare manual entry with target item's location barcode
    if (findMode && targetItem) {
      if (!targetItem.location?.barcode) {
        toast.error('This item has no assigned location with a QR code');
        return;
      }

      if (code === targetItem.location.barcode) {
        setFindResult('found');
        playSuccessSound();
        navigator.vibrate?.(200);
      } else {
        toast.error('Not a match - try another code');
      }
      setManualCode('');
      return;
    }

    // NORMAL MODE: Look up location first, then try item SKU
    setSearching(true);
    try {
      // Try location first
      const response = await locationsApi.scanBarcode(code);
      playSuccessSound();
      addToHistory({ type: 'location', code, name: response.data.data.name, id: response.data.data.id });
      toast.success(`Location: ${response.data.data.name}`);
      navigate(`/locations/${response.data.data.id}`);
    } catch (locError: any) {
      if (locError.response?.status === 404) {
        // Try item SKU
        try {
          const itemRes = await itemsApi.scanSku(code);
          const item = itemRes.data.data;
          playSuccessSound();
          addToHistory({ type: 'item', code, name: item.name, id: item.id });
          toast.success(`Item: ${item.name}`);
          navigate(`/items/${item.id}`);
          setSearching(false);
          return;
        } catch {
          // Item lookup failed
        }
        toast.error('No location or item found for this code');
      } else {
        toast.error(locError.response?.data?.message || 'Failed to lookup code');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleCameraChange = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (scanning) {
      await stopScanning();
      setTimeout(() => startScanning(), 100);
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !scanning) {
      toast.error('Camera not active');
      return;
    }

    try {
      const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
      const torchFeature = capabilities.torchFeature();

      if (torchFeature.isSupported()) {
        await torchFeature.apply(!torchOn);
        setTorchOn(!torchOn);
        logger.info(`Torch toggled: ${!torchOn}`);
      } else {
        toast.error('Flashlight not supported on this camera');
      }
    } catch (e: any) {
      logger.error(`Torch toggle failed: ${e?.message || e}`);
      toast.error('Failed to toggle flashlight');
    }
  };

  // Get primary image for target item
  const targetItemImage = targetItem?.images?.find(img => img.isPrimary) || targetItem?.images?.[0];

  return (
    <div className="space-y-6">
      {/* Inject scanner styles */}
      <style>{scannerStyles}</style>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {findMode ? 'Find Item' : 'QR Code Scanner'}
        </h1>
        <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
          {findMode
            ? 'Scan location QR codes to find where this item is stored'
            : 'Scan a location or item QR code to navigate directly to it'
          }
        </p>
      </div>

      {/* Find Mode: Target Item Display */}
      {findMode && targetItem && (
        <div
          className="card p-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--bg-secondary))' }}
        >
          <div className="flex items-center gap-4">
            {/* Item image */}
            <div
              className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              {targetItemImage ? (
                <img
                  src={`/uploads/${targetItemImage.filename}`}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : (
                <CubeIcon className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
              )}
            </div>

            {/* Item details */}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate" style={{ color: 'var(--text-primary)' }}>
                Finding: {targetItem.name}
              </h2>
              {targetItem.sku && (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>SKU: {targetItem.sku}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <MapPinIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {targetItem.location?.name || 'No location assigned'}
                </span>
              </div>
              {targetItem.location?.barcode && (
                <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Look for: {targetItem.location.barcode}
                </p>
              )}
            </div>

            {/* Cancel button */}
            <button
              onClick={() => navigate('/items')}
              className="btn btn-secondary flex-shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Find Mode: Success Overlay */}
      {findResult === 'found' && targetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-green-500 text-white rounded-2xl p-8 text-center max-w-sm mx-4">
            <CheckCircleIcon className="w-20 h-20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Found It!</h2>
            <p className="mb-2">{targetItem.name}</p>
            <p className="text-sm opacity-90 mb-6">is in this location: {targetItem.location?.name}</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/items/${targetItem.id}`)}
                className="flex-1 px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
              >
                View Item
              </button>
              <button
                onClick={() => { setFindResult(null); navigate('/items'); }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Browser warning for flashlight support */}
      {isMobile && !isChrome && (
        <div
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}
        >
          <BoltSlashIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <p className="text-sm" style={{ color: '#f59e0b' }}>
            {isFirefox ? 'Firefox' : 'This browser'} doesn't support flashlight control. Use <strong>Chrome</strong> for flashlight support while scanning.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Scanner */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <CameraIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                Camera Scanner
              </h2>

              <div className="flex items-center gap-2">
                {/* Torch/Flashlight button */}
                {scanning && torchSupported && (
                  <button
                    onClick={toggleTorch}
                    className={`p-2 rounded-lg transition-colors ${torchOn ? 'bg-yellow-500/20' : 'hover:bg-gray-500/20'}`}
                    style={{ color: torchOn ? '#eab308' : 'var(--text-secondary)' }}
                    title={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
                  >
                    {torchOn ? (
                      <BoltIcon className="w-5 h-5" />
                    ) : (
                      <BoltSlashIcon className="w-5 h-5" />
                    )}
                  </button>
                )}

                {cameras.length > 1 && (
                  <select
                    value={selectedCamera}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="input text-sm py-1 px-2"
                    style={{ width: 'auto' }}
                  >
                    {cameras.map((camera) => (
                      <option key={camera.id} value={camera.id}>
                        {camera.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="relative bg-black" style={{ minHeight: '300px' }}>
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <VideoCameraSlashIcon className="w-16 h-16 text-gray-500 mb-4" />
                <p className="text-gray-400 mb-2">Camera Error</p>
                <p className="text-sm text-gray-500">{cameraError}</p>
                <button
                  onClick={() => {
                    setCameraError(null);
                    startScanning();
                  }}
                  className="btn btn-secondary mt-4"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Retry
                </button>
              </div>
            ) : (
              <>
                {/* Scanner container - html5-qrcode renders video here */}
                <div
                  id={scannerContainerId}
                  style={{
                    width: '100%',
                    minHeight: '300px',
                    display: scanning ? 'block' : 'none'
                  }}
                />
                {!scanning && (
                  <div className="flex flex-col items-center justify-center" style={{ minHeight: '300px' }}>
                    <CameraIcon className="w-16 h-16 text-gray-500 mb-4" />
                    <p className="text-gray-400">Camera not active</p>
                  </div>
                )}
                {scanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Scanning indicator */}
                    <div
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: findResult === 'not-found' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.7)',
                        color: 'white'
                      }}
                    >
                      {findResult === 'not-found' ? 'Not here - keep scanning' : (findMode ? 'Scanning for location...' : 'Scanning...')}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-4">
            {scanning ? (
              <button
                onClick={stopScanning}
                className="btn btn-secondary w-full flex items-center justify-center gap-2"
              >
                <XMarkIcon className="w-5 h-5" />
                Stop Scanning
              </button>
            ) : (
              <button
                onClick={startScanning}
                disabled={!selectedCamera || !!cameraError}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                <CameraIcon className="w-5 h-5" />
                Start Scanning
              </button>
            )}
          </div>
        </div>

        {/* Manual Entry */}
        <div className="card">
          <div className="p-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <MagnifyingGlassIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              Manual Entry
            </h2>
          </div>

          <form onSubmit={handleManualSubmit} className="p-4 space-y-4">
            <div>
              <label className="label">QR Code</label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g., LOC-BIN-A1B2C3"
                className="input"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Enter the code manually if scanning doesn't work
              </p>
            </div>

            <button
              type="submit"
              disabled={!manualCode.trim() || searching}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  Look Up
                </>
              )}
            </button>
          </form>

          {/* Tips */}
          <div className="p-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Tips for scanning
            </h3>
            <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>- Center the QR code within the scanning area</li>
              <li>- Ensure good lighting or use the flashlight button</li>
              <li>- Position 4-10 inches from the camera</li>
              <li>- QR codes scan at any angle - no need to align</li>
              <li>- For best flashlight support, use Chrome on Android</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      {scanHistory.length > 0 && (
        <div className="card">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ClockIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              Recent Scans
            </h2>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <TrashIcon className="w-4 h-4" />
              Clear
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--bg-tertiary)' }}>
            {scanHistory.map((entry, i) => (
              <button
                key={`${entry.id}-${i}`}
                onClick={() => navigate(entry.type === 'location' ? `/locations/${entry.id}` : `/items/${entry.id}`)}
                className="w-full p-3 flex items-center gap-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                {entry.type === 'location' ? (
                  <MapPinIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                ) : (
                  <CubeIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{entry.name}</p>
                  <p className="text-xs font-mono truncate" style={{ color: 'var(--text-secondary)' }}>{entry.code}</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                  {formatTimeAgo(entry.timestamp)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
