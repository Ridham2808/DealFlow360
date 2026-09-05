'use client';

import React from 'react';

export function Card({ children, className = '', hoverable = false, ...props }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-sm transition-all duration-150 ${
        hoverable ? 'hover:shadow-md hover:border-slate-300' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-5 border-b border-slate-100 flex flex-col gap-1 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-base font-semibold text-slate-900 tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-xs text-slate-500 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
