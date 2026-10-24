import React from 'react';

interface PlioouLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'horizontal';
  isDarkBg?: boolean;
}

export const PlioouLogo: React.FC<PlioouLogoProps> = ({
  className = 'h-12',
  variant = 'full',
  isDarkBg = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Colorful Mosaic 'P' Symbol */}
      <svg
        viewBox="0 0 160 160"
        className="h-full w-auto aspect-square shrink-0 filter drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Floating explosion pixels/polygons on the left */}
        <polygon points="12,20 22,12 28,24 18,32" fill="#22c55e" opacity="0.9" />
        <polygon points="32,8 40,2 48,10 38,16" fill="#10b981" opacity="0.95" />
        <polygon points="26,38 34,30 40,42 32,50" fill="#84cc16" opacity="0.9" />
        <polygon points="42,26 50,18 56,28 48,36" fill="#10b981" />
        <polygon points="16,56 24,48 30,58 22,66" fill="#84cc16" opacity="0.85" />
        <polygon points="38,62 48,54 54,66 44,74" fill="#a3e635" opacity="0.9" />
        <polygon points="32,82 42,76 46,88 36,94" fill="#eab308" opacity="0.85" />
        <polygon points="48,96 58,88 64,100 54,108" fill="#f97316" opacity="0.9" />

        {/* Mosaic P Main Structure */}
        {/* Top Loop Outer Diamonds */}
        <path d="M 60,18 L 82,10 L 102,22 L 80,30 Z" fill="#0284c7" />
        <path d="M 82,10 L 108,12 L 128,28 L 102,22 Z" fill="#0284c7" />
        <path d="M 108,12 L 132,20 L 148,42 L 128,28 Z" fill="#1d4ed8" />
        <path d="M 132,20 L 152,38 L 154,64 L 148,42 Z" fill="#2563eb" />
        <path d="M 152,38 L 156,66 L 142,88 L 154,64 Z" fill="#7c3aed" />
        <path d="M 154,64 L 142,88 L 122,102 L 126,76 Z" fill="#9333ea" />
        <path d="M 142,88 L 122,102 L 96,106 L 106,86 Z" fill="#c026d3" />

        {/* Top Loop Inner Grid */}
        <path d="M 60,18 L 80,30 L 76,54 L 56,42 Z" fill="#06b6d4" />
        <path d="M 80,30 L 102,22 L 104,46 L 82,52 Z" fill="#0284c7" />
        <path d="M 102,22 L 128,28 L 124,54 L 104,46 Z" fill="#1d4ed8" />
        <path d="M 128,28 L 148,42 L 138,68 L 124,54 Z" fill="#3b82f6" />
        <path d="M 148,42 L 154,64 L 126,76 L 138,68 Z" fill="#6366f1" />

        {/* P Inner Void Arc */}
        <path d="M 76,54 L 104,46 L 124,54 L 126,76 L 106,86 L 76,82 Z" fill={isDarkBg ? "#0f172a" : "#ffffff"} />

        {/* Stem Mosaic (Green -> Yellow -> Orange) */}
        <path d="M 56,42 L 76,54 L 76,82 L 56,70 Z" fill="#10b981" />
        <path d="M 56,70 L 76,82 L 76,108 L 56,96 Z" fill="#22c55e" />
        <path d="M 56,96 L 76,108 L 76,132 L 56,120 Z" fill="#84cc16" />
        <path d="M 56,120 L 76,132 L 86,146 L 68,148 Z" fill="#eab308" />
        <path d="M 68,148 L 86,146 L 104,142 L 82,154 Z" fill="#f97316" />
      </svg>

      {/* Typography */}
      {variant !== 'icon' && (
        <div className="flex flex-col justify-center">
          <span
            className={`font-black text-2xl tracking-tight leading-none ${
              isDarkBg ? 'text-white' : 'text-[#0f52ba]'
            }`}
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", letterSpacing: '-0.02em' }}
          >
            Plioou
          </span>
          <span
            className={`font-black text-[9px] tracking-[0.28em] uppercase leading-tight mt-1 ${
              isDarkBg ? 'text-slate-300' : 'text-slate-900'
            }`}
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            INFORMÁTICA
          </span>
        </div>
      )}
    </div>
  );
};
