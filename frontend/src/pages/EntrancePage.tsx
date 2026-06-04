import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './EntrancePage.css';

const EntrancePage: React.FC = () => {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 500);
    const timer2 = setTimeout(() => setPhase(2), 2000);
    const timer3 = setTimeout(() => {
      setShowContent(true);
      navigate('/landing');
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [navigate]);

  return (
    <div className="entrance-page">
      {/* Animated Background */}
      <div className="entrance-background">
        <div className="entrance-blur"></div>
      </div>

      {/* Entrance Content */}
      <div className="entrance-content">
        {/* Scanning Effect */}
        <div className={`entrance-scanner ${phase >= 1 ? 'active' : ''}`}>
          <div className="scanner-lines">
            <div className="scan-line"></div>
            <div className="scan-line"></div>
            <div className="scan-line"></div>
          </div>
          <div className="scanner-border"></div>
        </div>

        {/* Center Icon */}
        <div className={`entrance-icon ${phase >= 1 ? 'scanning' : ''}`}>
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="60"
              cy="60"
              r="55"
              stroke="url(#gradient)"
              strokeWidth="2"
              className="pulse-circle"
            />
            <circle
              cx="60"
              cy="60"
              r="40"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <path
              d="M 60 30 L 60 90 M 30 60 L 90 60"
              stroke="url(#gradient)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="60" cy="60" r="8" fill="url(#gradient)" />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Status Text */}
        <div className={`entrance-status ${phase >= 1 ? 'visible' : ''}`}>
          <p className="status-text">
            {phase === 0 && 'Initializing...'}
            {phase === 1 && 'Scanning...'}
            {phase >= 2 && 'Access Granted'}
          </p>
          {phase >= 2 && (
            <div className="success-indicator">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          )}
        </div>

        {/* Loading Bars */}
        <div className={`entrance-loader ${phase >= 1 ? 'active' : ''}`}>
          <div className="loader-bar bar-1"></div>
          <div className="loader-bar bar-2"></div>
          <div className="loader-bar bar-3"></div>
        </div>
      </div>

      {/* Particles */}
      <div className="entrance-particles">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default EntrancePage;
