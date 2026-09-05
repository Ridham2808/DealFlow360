'use client';

import React from 'react';

export default function AuthLayout({ children }) {
  return (
    <div className="h-screen w-full bg-[#080808] flex overflow-hidden">

      {/* ── LEFT PANEL — branding ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[54%] flex-col justify-between p-14 border-r border-[#131313] relative overflow-hidden flex-shrink-0">

        {/* Subtle vignette — no grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 0% 0%, rgba(255,255,255,0.025) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ededeb] flex items-center justify-center flex-shrink-0 shadow-sm p-1.5 overflow-hidden">
            <img src="/logo.png" alt="DealFlow360 Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-[#c8c8c2]">
            DealFlow<span className="text-[#555]">360</span>
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 max-w-[440px]">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#3a3a3a] uppercase mb-5">
            Quote-to-Cash · B2B Sales Operations
          </p>
          <h2 className="text-[3rem] font-semibold leading-[1.08] tracking-[-0.02em] text-[#c8c8c2] mb-6">
            Close deals.<br />
            <span className="text-[#383838]">Not tickets.</span>
          </h2>
          <p className="text-[15px] text-[#484848] leading-[1.7] max-w-[360px]">
            One intelligent workspace for quotes, approvals,
            pricing rules, and revenue — built for serious B2B teams.
          </p>

          <div className="mt-10 space-y-3.5">
            {[
              'Full quote-to-cash automation',
              'Role-based multi-level approvals',
              'Intelligent pricing & discount engine',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3.5">
                <div className="w-5 h-5 rounded-full border border-[#252525] flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#b8b8b2]" />
                </div>
                <span className="text-[14px] text-[#444]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom social proof */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3.5">
            <div className="flex -space-x-2">
              {['A', 'R', 'M', 'S'].map((ch, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full bg-[#141414] border border-[#222] flex items-center justify-center text-[10px] font-semibold text-[#666]"
                >
                  {ch}
                </div>
              ))}
            </div>
            <p className="text-[12px] text-[#383838]">
              Trusted by sales teams across industries
            </p>
          </div>
          <div className="flex gap-3">
            {['SOC 2', 'GDPR', 'ISO 27001'].map((b) => (
              <span
                key={b}
                className="text-[10px] font-semibold tracking-wider text-[#2e2e2e] border border-[#1c1c1c] px-2.5 py-1 rounded"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-6 pb-0">
          <div className="w-8 h-8 rounded-lg bg-[#ededeb] flex items-center justify-center p-1.5 overflow-hidden">
            <img src="/logo.png" alt="DealFlow360 Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-[15px] font-semibold text-[#c8c8c2]">
            DealFlow<span className="text-[#555]">360</span>
          </span>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center px-8 py-10">
          <div className="w-full max-w-[480px]">
            {children}
          </div>
        </div>
      </div>

    </div>
  );
}
