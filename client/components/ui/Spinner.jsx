'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * DealFlow360 Custom Spinner Component
 */
export function Spinner({
  size = 'md',
  variant = 'primary',
  className = '',
}) {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const variantStyles = {
    primary: 'text-blue-600',
    white: 'text-white',
    neutral: 'text-slate-400',
    amber: 'text-amber-500',
    green: 'text-emerald-600',
    red: 'text-rose-600',
  };

  return (
    <Loader2
      className={`animate-spin ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
    />
  );
}

export default Spinner;
