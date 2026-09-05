'use client';

import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * DealFlow360 Custom Select Component
 */
export const Select = forwardRef(function Select(
  {
    label,
    options = [],
    error,
    helperText,
    size = 'md',
    disabled = false,
    className = '',
    id,
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 h-8',
    md: 'text-sm px-3.5 py-2 h-10',
    lg: 'text-base px-4 py-2.5 h-12',
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  const stateStyles = error
    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900'
    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/20 text-slate-900';

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`w-full appearance-none rounded-lg border bg-white pr-9 transition-colors duration-150 focus:outline-none focus:ring-4 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${currentSize} ${stateStyles} ${className}`}
          {...props}
        >
          {children ? (
            children
          ) : (
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          )}
        </select>
        <div className="absolute right-3 flex items-center pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});

export default Select;
