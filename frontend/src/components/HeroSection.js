import React from 'react';

const HeroSection = () => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1>AppleVerse 2.0</h1>
        <p className="tagline">Discover the World of Apples</p>
        <p className="subtitle">
          <span style={{ color: 'white' }}>Lets you explore and manage apple varieties worldwide with ease. Featuring smart dashboards, bulk uploads, and interactive Google Maps, it makes discovering and tracking apples intuitive and fun. Experience a seamless, modern interface designed for effortless exploration.</span>
        </p>
      </div>
      <div className="hero-image">
        <img
          src="https://bdc2020.o0bc.com/wp-content/uploads/2023/09/Apple-Picking-6512e580ccd91-768x432.jpeg?width=900"
          alt="Apple Variety Showcase"
          style={{
            width: '70%',
            borderRadius: '12px',
          }}
        />
      </div>
    </section>
  );
};

export default HeroSection;