'use client';

import React from 'react';

/**
 * DealFlow360 Custom Badge Component
 * Variants: primary, outline, ghost, warning, success, danger, neutral
 * Sizes: sm (compact), md
 */
export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors select-none';

  const variantStyles = {
    primary: 'bg-blue-50 text-blue-700 border border-blue-200/60',
    outline: 'border border-slate-300 text-slate-700 bg-white',
    ghost: 'bg-slate-100 text-slate-700',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200/60',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-semibold', // compact
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${
        sizeStyles[size] || sizeStyles.md
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
