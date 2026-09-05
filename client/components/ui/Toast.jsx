'use client';

import React from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * DealFlow360 Custom Toast Component
 */
export function Toast({
  message,
  variant = 'primary',
  onClose,
  className = '',
}) {
  const icons = {
    primary: <Info className="w-4 h-4 text-blue-500" />,
    success: <CheckCircle className="w-4 h-4 text-emerald-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    danger: <AlertCircle className="w-4 h-4 text-rose-500" />,
  };

  const borderStyles = {
    primary: 'border-l-4 border-l-blue-600',
    success: 'border-l-4 border-l-emerald-600',
    warning: 'border-l-4 border-l-amber-500',
    danger: 'border-l-4 border-l-rose-600',
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border border-slate-200 p-3.5 flex items-center gap-3 text-xs font-medium text-slate-800 transition-all ${
        borderStyles[variant] || borderStyles.primary
      } ${className}`}
    >
      {icons[variant] || icons.primary}
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default Toast;
