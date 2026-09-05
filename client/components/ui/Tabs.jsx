'use client';

import React from 'react';

/**
 * DealFlow360 Custom Tabs Component
 */
export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  size = 'md',
  className = '',
}) {
  const sizeStyles = {
    sm: 'text-xs py-1.5 px-3', // compact
    md: 'text-sm py-2 px-4',
  };

  return (
    <div className={`flex border-b border-slate-200 gap-2 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`font-medium transition-all duration-150 border-b-2 -mb-px flex items-center gap-2 ${
              sizeStyles[size] || sizeStyles.md
            } ${
              isActive
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
