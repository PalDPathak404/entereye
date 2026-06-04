import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Eye, Zap } from 'lucide-react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsLoaded(true);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="landing-page">
      {/* Animated Background */}
      <div className="background-container">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="noise-overlay"></div>
      </div>

      {/* Animated Grid */}
      <div className="grid-background" style={{
        backgroundPosition: `${mousePosition.x * 0.5}% ${mousePosition.y * 0.5}%`,
      }}></div>

      {/* Stars */}
      <div className="stars-container">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.5 + 0.3,
            }}
          ></div>
        ))}
      </div>

      {/* Main Content */}
      <div className={`content-wrapper ${isLoaded ? 'loaded' : ''}`}>
        <div className="hero-section">
          {/* Logo/Title Animation */}
          <div className="logo-container">
            <div className="logo-wrapper">
              <div className="logo-glow"></div>
              <div className="logo-icon">
                <Eye size={80} />
              </div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="main-title">
            <span className="title-word">Entry</span>
            <span className="title-word accent">Eye</span>
          </h1>

          {/* Subheading */}
          <p className="subtitle">
            Intelligent Facial Recognition Attendance System
          </p>

          {/* Description */}
          <p className="description">
            Experience the future of attendance tracking with cutting-edge facial recognition
            technology. Secure, fast, and built for modern education.
          </p>

          {/* Features */}
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Eye size={24} />
              </div>
              <h3>Real-time Detection</h3>
              <p>Instant facial recognition</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Zap size={24} />
              </div>
              <h3>Lightning Fast</h3>
              <p>Process in milliseconds</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Eye size={24} />
              </div>
              <h3>Highly Accurate</h3>
              <p>99.9% precision</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
            >
              <span>Enter System</span>
              <ChevronRight size={20} />
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/register')}
            >
              <span>Create Account</span>
            </button>
          </div>

          {/* Floating Elements */}
          <div className="floating-elements">
            <div className="float-element element-1"></div>
            <div className="float-element element-2"></div>
            <div className="float-element element-3"></div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="scroll-indicator">
        <div className="scroll-dot"></div>
        <span>Scroll to explore</span>
      </div>
    </div>
  );
};

export default LandingPage;
