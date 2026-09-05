'use client';

import React from 'react';
import { Info, AlertTriangle, CheckCircle, AlertCircle, X } from 'lucide-react';

/**
 * DealFlow360 Custom Banner Component
 * Variants: primary, warning, success, danger
 */
export function Banner({
  children,
  title,
  variant = 'primary',
  onClose,
  className = '',
  ...props
}) {
  const icons = {
    primary: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    danger: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
  };

  const variantStyles = {
    primary: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    danger: 'bg-rose-50 border-rose-200 text-rose-900',
  };

  return (
    <div
      className={`rounded-lg border p-4 flex items-start gap-3 text-sm ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {icons[variant] || icons.primary}
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-0.5">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default Banner;
