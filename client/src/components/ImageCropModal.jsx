import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

function ImageCropModal({ image, onCancel, onComplete }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    try {
      const croppedImage = await getCroppedImg(
        image,
        croppedAreaPixels,
        rotation
      );
      onComplete(croppedImage);
    } catch (e) {
      console.error('Error cropping image:', e);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            <i className="fas fa-crop" style={{ marginRight: '0.5rem' }}></i>
            Adjust Your Image
          </h3>
          <button onClick={onCancel} style={styles.closeButton}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div style={styles.cropContainer}>
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
          />
        </div>

        <div style={styles.controls}>
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>
              <i className="fas fa-search-plus" style={{ marginRight: '0.5rem' }}></i>
              Zoom
            </label>
            <div style={styles.sliderContainer}>
              <span style={styles.sliderValue}>-</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>+</span>
            </div>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>
              <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i>
              Rotate
            </label>
            <div style={styles.sliderContainer}>
              <span style={styles.sliderValue}>0°</span>
              <input
                type="range"
                value={rotation}
                min={0}
                max={360}
                step={1}
                onChange={(e) => setRotation(Number(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>360°</span>
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={onCancel} style={styles.cancelButton}>
            <i className="fas fa-times" style={{ marginRight: '0.5rem' }}></i>
            Cancel
          </button>
          <button onClick={createCroppedImage} style={styles.applyButton}>
            <i className="fas fa-check" style={{ marginRight: '0.5rem' }}></i>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to create cropped image
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-safeArea / 2, -safeArea / 2);

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: '#6B7280',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '6px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropContainer: {
    position: 'relative',
    width: '100%',
    height: '400px',
    backgroundColor: '#000',
  },
  controls: {
    padding: '1.5rem',
    borderTop: '1px solid #E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  controlLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  sliderValue: {
    fontSize: '0.75rem',
    color: '#6B7280',
    fontWeight: '600',
    minWidth: '30px',
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    background: 'linear-gradient(to right, #667eea, #764ba2)',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    padding: '1.5rem',
    borderTop: '1px solid #E5E7EB',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  applyButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
};

export default ImageCropModal;
