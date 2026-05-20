// src/components/landing/Features.tsx

import { useState } from 'react';
import { PieChart, CheckCircle, Receipt, Lock } from 'lucide-react';
import '@/styles/features.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Feature {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  featured?: boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const features: Feature[] = [
  {
    id: 1,
    title: 'Real-Time Equity Dashboard',
    subtitle: 'Dynamic pie charts and detailed contribution breakdowns. Data syncs instantly with every logged effort.',
    icon: <PieChart className="feature-item-icon-svg" strokeWidth={1.5} />,
    featured: true,
  },
  {
    id: 2,
    title: 'Smart Approval System',
    subtitle: 'Democratic voting for subjective contributions. Real-time alerts keep everyone on the same page.',
    icon: <CheckCircle className="feature-item-icon-svg" strokeWidth={1.5} />,
  },
  {
    id: 3,
    title: 'Absolute Transparency',
    subtitle: 'Mandatory invoice uploads for revenue tracking. Eliminate hidden markups and build trust within the team.',
    icon: <Receipt className="feature-item-icon-svg" strokeWidth={1.5} />,
  },
  {
    id: 4,
    title: 'Legal Equity Freezing',
    subtitle: 'Lock in your cap table before funding rounds. Export official PDFs for investors and legal compliance.',
    icon: <Lock className="feature-item-icon-svg" strokeWidth={1.5} />,
  },
];

// ─── Features ─────────────────────────────────────────────────────────────────

export function Features() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <section id="fitur" className="features-section">
      <div className="features-container">

        {/* Header */}
        <div className="features-header">
          <h2 className="features-title">Core Features</h2>
          <p className="features-subtitle">
            Everything you need to manage startup equity professionally and transparently.
          </p>
        </div>

        {/* List */}
        <div className="features-list">
          {features.map((feature) => {
            const isHovered = hoveredId === feature.id;

            return (
              <div
                key={feature.id}
                className="feature-item-wrapper"
                onMouseEnter={() => setHoveredId(feature.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className={`feature-item ${isHovered ? 'feature-item--hovered' : ''} ${feature.featured ? 'feature-item--featured' : ''}`}>

                  {/* Corner brackets */}
                  {isHovered && (
                    <>
                      <div className="feature-bracket feature-bracket--tl">
                        <div className="feature-bracket-h" />
                        <div className="feature-bracket-v" />
                      </div>
                      <div className="feature-bracket feature-bracket--br">
                        <div className="feature-bracket-h" />
                        <div className="feature-bracket-v" />
                      </div>
                    </>
                  )}

                  {/* Content */}
                  <div className="feature-item-content">
                    <div className="feature-item-text">
                      <h3 className={`feature-item-title ${feature.featured ? 'feature-item-title--featured' : ''} ${isHovered ? 'feature-item-title--hovered' : ''}`}>
                        {feature.title}
                      </h3>
                      <div className={`feature-item-subtitle-wrapper ${isHovered ? 'is-open' : ''}`}>
                        <p className="feature-item-subtitle">
                          {feature.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className={`feature-item-icon ${isHovered ? 'feature-item-icon--visible' : ''}`}>
                      {feature.icon}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}