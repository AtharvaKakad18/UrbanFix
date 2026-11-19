import React, { useState, useRef, useCallback } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

export const BeforeAfterSlider = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Before Fix',
  afterLabel = 'After Resolution',
  className = '',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = useCallback(
    (clientX) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percent);
    },
    []
  );

  const handleTouchMove = (e) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onTouchMove={handleTouchMove}
      className={`relative w-full aspect-video rounded-2xl overflow-hidden select-none cursor-ew-resize border border-slate-200 dark:border-slate-800 shadow-soft-lg ${className}`}
    >
      {/* After image (background full width) */}
      <img
        src={afterImage || beforeImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        draggable="false"
      />
      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-emerald-900/80 backdrop-blur-xs text-white text-xs font-semibold z-10">
        {afterLabel}
      </div>

      {/* Before image (clipped horizontally) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover max-w-none"
          style={{
            width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%',
          }}
          draggable="false"
        />
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-rose-900/80 backdrop-blur-xs text-white text-xs font-semibold z-10">
          {beforeLabel}
        </div>
      </div>

      {/* Divider line and handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-glow cursor-ew-resize z-20"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={() => setIsDragging(true)}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center">
          <ChevronsLeftRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
