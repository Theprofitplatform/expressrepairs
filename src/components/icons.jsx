import React from 'react';

// Inline SVG icons
export const Icon = {
  Phone: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Pin: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Clock: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Star: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" {...p}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Zap: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  ArrowRight: (p) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  ArrowLeft: (p) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  Check: (p) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Shield: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Tools: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
};

// Brand logos (simplified SVG marks)
export const BrandLogo = ({ id, size = 28 }) => {
  const s = size;
  switch (id) {
    case 'apple':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-label="Apple">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25"/>
        </svg>
      );
    case 'samsung':
      return (
        <svg width={s*2.4} height={s*0.7} viewBox="0 0 120 30" fill="currentColor" aria-label="Samsung" style={{flexShrink:0, maxWidth:'100%'}}>
          <text x="60" y="22" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="20" letterSpacing="-0.3">SAMSUNG</text>
        </svg>
      );
    case 'google':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" aria-label="Google">
          <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.9c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.09-1.93 3.24-4.76 3.24-8.09"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.16v2.84A11 11 0 0 0 12 23"/>
          <path fill="#FBBC05" d="M5.85 14.12a6.6 6.6 0 0 1 0-4.24V7.04H2.16a11 11 0 0 0 0 9.92z"/>
          <path fill="#EA4335" d="M12 5.35c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.06 14.97 1 12 1A11 11 0 0 0 2.16 7.04l3.69 2.84C6.71 7.28 9.14 5.35 12 5.35"/>
        </svg>
      );
    case 'huawei':
      return (
        <svg width={s*2.1} height={s*0.7} viewBox="0 0 100 30" fill="#cf0a2c" aria-label="Huawei" style={{flexShrink:0, maxWidth:'100%'}}>
          <text x="50" y="22" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="20" letterSpacing="0">HUAWEI</text>
        </svg>
      );
    case 'oppo':
      return (
        <svg width={s*1.8} height={s*0.7} viewBox="0 0 80 30" fill="#008060" aria-label="OPPO" style={{flexShrink:0, maxWidth:'100%'}}>
          <text x="40" y="22" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="20" letterSpacing="-0.3">OPPO</text>
        </svg>
      );
    case 'motorola':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-label="Motorola">
          <circle cx="12" cy="12" r="10"/>
          <path d="M4 16 L8 8 L12 14 L16 8 L20 16" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'other':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="Other phone">
          <rect x="6" y="2" width="12" height="20" rx="2.5"/>
          <line x1="10" y1="18.5" x2="14" y2="18.5"/>
        </svg>
      );
    default:
      return <span style={{fontSize:18, fontWeight:800}}>+</span>;
  }
};
