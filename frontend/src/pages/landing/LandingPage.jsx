import React from 'react';
import LandingNav from './components/LandingNav.jsx';
import HeroSection from './components/HeroSection.jsx';
import FeaturesSection from './components/FeaturesSection.jsx';
import PricingSection from './components/PricingSection.jsx';
import TestimonialsSection from './components/TestimonialsSection.jsx';
import LandingFooter from './components/LandingFooter.jsx';

export default function LandingPage() {
  return (
    <div style={{ background: '#0f1117', minHeight: '100vh', color: '#f9fafb' }}>
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <LandingFooter />
    </div>
  );
}
