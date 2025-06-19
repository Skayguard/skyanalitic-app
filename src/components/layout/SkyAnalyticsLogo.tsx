
// src/components/layout/SkyAnalyticsLogo.tsx
import React from 'react';

const SkyAnalyticsLogo = ({ className }: { className?: string }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className || "h-8 w-8 text-primary"} // Default class
  >
    {/* Abstract representation of data/analytics */}
    <path d="M20 70C20 60 25 50 35 50C45 50 50 60 50 70V80H20V70Z" stroke="currentColor" strokeWidth="5" />
    <path d="M50 70C50 60 55 50 65 50C75 50 80 60 80 70V80H50V70Z" stroke="currentColor" strokeWidth="5" />
    <path d="M35 45C35 35 40 25 50 25C60 25 65 35 65 45V55H35V45Z" stroke="currentColor" strokeWidth="5" />

    {/* Subtle "S" curve or upward trend */}
    <path d="M20 30C30 20 40 20 50 30C60 40 70 40 80 30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default SkyAnalyticsLogo;
