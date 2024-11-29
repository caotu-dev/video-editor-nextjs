import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface AudioGalleryProps {
  onAudioSelect: (file: File) => void;
  className?: string;
}

const AudioGallery: React.FC<AudioGalleryProps> = ({ 
  onAudioSelect,
  className = "" 
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      if (file.type.startsWith('audio/')) {
        onAudioSelect(file);
      }
    });
  }, [onAudioSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a']
    }
  });

  return (
    <div 
      {...getRootProps()} 
      className={`
        p-6 border-2 border-dashed rounded-lg
        ${isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300'}
        transition-colors duration-200 ease-in-out
        cursor-pointer hover:border-green-400
        ${className}
      `}
    >
      <input {...getInputProps()} />
      <div className="text-center">
        <p className="text-gray-600">
          {isDragActive
            ? "Drop your audio file here..."
            : "Drag 'n' drop audio file here, or click to select"
          }
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Supported formats: MP3, WAV, OGG, M4A
        </p>
      </div>
    </div>
  );
};

export default AudioGallery; 