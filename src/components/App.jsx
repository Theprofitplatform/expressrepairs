import React from 'react';
import { Icon } from './icons.jsx';
import { SITE } from '../data/site.js';
import { Nav, Hero, RepairServices, Plans, Accessories } from './sections.jsx';
import { BrandsStrip, WhyUs, Testimonials, Warranty, FAQ, Store, Contact, Footer } from './sections2.jsx';

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <RepairServices />
      <Plans />
      <Accessories />
      <BrandsStrip />
      <WhyUs />
      <Testimonials />
      <Warranty />
      <FAQ />
      <Store />
      <Contact />
      <Footer />
      <a href={SITE.phoneHref} className="mobile-call-cta">
        <Icon.Phone size={16} /> Call {SITE.phone}
      </a>
    </>
  );
}
