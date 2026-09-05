'use client';

import React from 'react';
import { AlertOctagon, RotateCw } from 'lucide-react';
import { Button } from './Button';

/**
 * DealFlow360 Custom ErrorState Component
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section.',
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 rounded-xl border border-rose-200 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-rose-900 mb-1">{title}</h3>
      <p className="text-xs text-rose-600 max-w-sm mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-rose-300 text-rose-700 hover:bg-rose-50"
        >
          <RotateCw className="w-3.5 h-3.5 mr-1" />
          Try Again
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
