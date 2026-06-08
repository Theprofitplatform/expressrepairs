// App root — renders all sections

function App() {
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
