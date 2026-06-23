import { useState, useRef, useEffect, useCallback } from 'react';

interface SpinViewerProps {
  images: string[];
}

export default function SpinViewer({ images }: SpinViewerProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const autoPlayRef = useRef<number | null>(null);
  const preloadedImages = useRef<HTMLImageElement[]>([]);

  const totalFrames = images.length;

  // Preload all images
  useEffect(() => {
    let loadedCount = 0;
    const imgs: HTMLImageElement[] = [];

    images.forEach((src, i) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        setLoadProgress(Math.round((loadedCount / totalFrames) * 100));
        if (loadedCount === totalFrames) {
          setLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        setLoadProgress(Math.round((loadedCount / totalFrames) * 100));
        if (loadedCount === totalFrames) {
          setLoaded(true);
        }
      };
      img.src = src;
      imgs[i] = img;
    });

    preloadedImages.current = imgs;
  }, [images, totalFrames]);

  // Auto-play
  useEffect(() => {
    if (autoPlay && loaded) {
      autoPlayRef.current = window.setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % totalFrames);
      }, 100);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlay, loaded, totalFrames]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    lastX.current = e.clientX;
    setAutoPlay(false);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - lastX.current;
      const sensitivity = 5; // pixels per frame
      if (Math.abs(delta) >= sensitivity) {
        const frameDelta = Math.sign(delta);
        setCurrentFrame((prev) => (prev + frameDelta + totalFrames) % totalFrames);
        lastX.current = e.clientX;
      }
    },
    [totalFrames]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  if (!loaded) {
    return (
      <div
        className="rounded-xl flex flex-col items-center justify-center gap-3"
        style={{ height: '400px', backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="w-48 rounded-full overflow-hidden" style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)' }}>
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{ width: `${loadProgress}%`, backgroundColor: 'var(--accent)' }}
          />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading frames... {loadProgress}%
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden relative select-none"
      style={{
        height: '400px',
        backgroundColor: 'var(--bg-primary)',
        cursor: isDragging.current ? 'grabbing' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={images[currentFrame]}
        alt={`Frame ${currentFrame + 1}`}
        className="w-full h-full object-contain"
        draggable={false}
      />

      {/* Controls overlay */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-lg"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAutoPlay(!autoPlay);
          }}
          className="text-white text-sm font-medium hover:opacity-80"
        >
          {autoPlay ? 'Pause' : 'Auto'}
        </button>
        <span className="text-white/70 text-xs">
          {currentFrame + 1} / {totalFrames}
        </span>
      </div>

      {/* Drag hint */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md text-xs pointer-events-none"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.7)' }}
      >
        Drag to rotate
      </div>
    </div>
  );
}
