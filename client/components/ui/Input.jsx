'use client';

import React, { forwardRef } from 'react';

/**
 * DealFlow360 Custom Input Component
 * Supports compact size, error states, and left/right icons
 */
export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    size = 'md',
    leftIcon,
    rightIcon,
    disabled = false,
    className = '',
    id,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 h-8', // compact/small
    md: 'text-sm px-3.5 py-2 h-10',
    lg: 'text-base px-4 py-2.5 h-12',
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  const stateStyles = error
    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900 placeholder-rose-300'
    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/20 text-slate-900 placeholder-slate-400';

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`w-full rounded-lg border bg-white transition-colors duration-150 focus:outline-none focus:ring-4 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
            leftIcon ? 'pl-9' : ''
          } ${rightIcon ? 'pr-9' : ''} ${currentSize} ${stateStyles} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center pointer-events-none text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});

export default Input;
