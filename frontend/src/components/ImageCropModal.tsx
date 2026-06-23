import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number;
  imageType?: string;
}

// Helper function to create cropped image
const createCroppedImage = async (
  image: HTMLImageElement,
  crop: PixelCrop,
  imageType: string = 'image/png'
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Calculate the scale between natural and displayed size
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    // Use PNG for transparency support, JPEG for photos
    const quality = imageType === 'image/jpeg' ? 0.95 : undefined;
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, imageType, quality);
  });
};

// Helper to create initial centered crop
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number | undefined
) {
  if (!aspect) {
    // Free aspect - create a default crop at 80% of the image
    return centerCrop(
      {
        unit: '%',
        width: 80,
        height: 80,
      },
      mediaWidth,
      mediaHeight
    );
  }

  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio,
  imageType = 'image/png',
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [selectedAspect, setSelectedAspect] = useState<number | undefined>(aspectRatio);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const aspectRatios = [
    { label: 'Free', value: undefined },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
    { label: '3:2', value: 3 / 2 },
  ];

  // Reset crop when aspect ratio changes
  useEffect(() => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, selectedAspect));
    }
  }, [selectedAspect]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, selectedAspect));
  };

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await createCroppedImage(imgRef.current, completedCrop, imageType);
      onCropComplete(croppedBlob);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        className="rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Crop Image
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Area */}
        <div
          className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={selectedAspect}
            className="max-h-[50vh]"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ maxHeight: '50vh', maxWidth: '100%' }}
            />
          </ReactCrop>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
          {/* Aspect Ratio Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aspect:</span>
            <div className="flex gap-2">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio.label}
                  onClick={() => setSelectedAspect(ratio.value)}
                  className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                  style={{
                    backgroundColor: selectedAspect === ratio.value
                      ? 'var(--accent)'
                      : 'var(--bg-secondary)',
                    color: selectedAspect === ratio.value
                      ? 'white'
                      : 'var(--text-secondary)',
                  }}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={isProcessing || !completedCrop}
            >
              {isProcessing ? 'Processing...' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
