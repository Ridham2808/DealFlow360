'use client';

import React from 'react';

/**
 * DealFlow360 Custom Skeleton Component
 */
export function Skeleton({ className = '', variant = 'default', ...props }) {
  const variantStyles = {
    default: 'rounded-md',
    circle: 'rounded-full',
    card: 'rounded-xl',
  };

  return (
    <div
      className={`animate-pulse bg-slate-200/80 ${
        variantStyles[variant] || variantStyles.default
      } ${className}`}
      {...props}
    />
  );
}

export default Skeleton;
