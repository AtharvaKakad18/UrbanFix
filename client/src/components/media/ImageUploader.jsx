import React, { useRef, useState } from 'react';
import { UploadCloud, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

export const ImageUploader = ({
  files = [],
  onChange,
  maxFiles = 3,
  className = '',
}) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFiles = (newFiles) => {
    setError(null);
    const validFiles = [];

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

    for (const file of newFiles) {
      if (!allowedTypes.includes(file.type)) {
        setError('Only photos (JPEG, PNG, WebP, HEIC) are accepted. Videos are strictly not supported.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`File '${file.name}' exceeds the 10MB limit.`);
        return;
      }
      validFiles.push(file);
    }

    const combined = [...files, ...validFiles].slice(0, maxFiles);
    onChange(combined);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index) => {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {files.length < maxFiles && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 bg-slate-50 dark:bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={handleChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center">
            <div className="p-3 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 rounded-2xl mb-3 ring-4 ring-brand-50/60 dark:ring-brand-950/20">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Click to upload or drag & drop photos
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Upload 1 to {maxFiles} images (JPEG, PNG, WebP up to 10MB each)
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((file, index) => {
            const previewUrl = typeof file === 'string' ? file : URL.createObjectURL(file);
            return (
              <div
                key={index}
                className="relative group rounded-xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-soft"
              >
                <img
                  src={previewUrl}
                  alt={`Upload preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/75 hover:bg-rose-600 text-white rounded-lg shadow-md transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/75 text-[10px] font-medium text-white">
                  Photo {index + 1}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
