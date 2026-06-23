import React from 'react';
import logoUrl from '../../assets/trueears-logo.ico';

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Trueears brand mark for welcome/brand screens. Sourced from the app icon so the
 * UI stays in sync with the installed-app/taskbar icon. To rebrand, replace
 * src/assets/trueears-logo.ico (ideally swap to an SVG/high-res PNG import here).
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ className, alt = 'Trueears' }) => (
  <img src={logoUrl} alt={alt} className={className} draggable={false} />
);
