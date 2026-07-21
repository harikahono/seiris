import { useEffect, useRef } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import '@/styles/cta.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerticalMarqueeProps {
  children: ReactNode;
  speed?: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const marqueeItems = [
  'Unfair equal splits',
  'Unrecognized contributions',
  'Disputed equity shares',
  'Teams broken over money',
  'Equity based on feelings',
  'Cap table drama',
];

// ─── VerticalMarquee ──────────────────────────────────────────────────────────
// Infinite scroll vertikal — duplikat children untuk seamless loop

function VerticalMarquee({ children, speed = 20 }: VerticalMarqueeProps) {
  return (
    <div
      className="cta-marquee-track"
      style={{ '--marquee-duration': `${speed}s` } as CSSProperties}
    >
      {/* Original */}
      <div className="cta-marquee-reel">
        {children}
      </div>
      {/* Duplikat — seamless loop */}
      <div className="cta-marquee-reel" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

export function CTA() {
  const marqueeRef = useRef<HTMLDivElement>(null);

  // Opacity falloff: item di tengah paling terang, makin jauh makin fade
  useEffect(() => {
    const container = marqueeRef.current;
    if (!container) return;

    const update = () => {
      const items = container.querySelectorAll<HTMLElement>('.cta-marquee-item');
      const rect = container.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;

      items.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenterY = itemRect.top + itemRect.height / 2;
        const dist = Math.abs(centerY - itemCenterY);
        const maxDist = rect.height / 2;
        const normalized = Math.min(dist / maxDist, 1);
        item.style.opacity = (1 - normalized * 0.82).toString();
      });
    };

    let raf: number;
    const loop = () => { update(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section id="register" className="cta-section">

      {/* Orange ambient glow — background accent */}
      <div className="cta-glow cta-glow--left"  aria-hidden />
      <div className="cta-glow cta-glow--right" aria-hidden />

      <div className="cta-container">
        <div className="cta-grid">

          {/* ── Kiri: Vertical Marquee ── */}
          <div ref={marqueeRef} className="cta-marquee-wrapper">
            <div className="cta-marquee-inner">
              <VerticalMarquee speed={15}>
                {marqueeItems.map((item, i) => (
                  <div key={i} className="cta-marquee-item">
                    {item}
                  </div>
                ))}
              </VerticalMarquee>

              {/* Vignette top */}
              <div className="cta-vignette cta-vignette--top" />
              {/* Vignette bottom */}
              <div className="cta-vignette cta-vignette--bottom" />
            </div>
          </div>

          {/* ── Kanan: Copy ── */}
          <div className="cta-content">
            <h2 className="cta-title">
              Stop Drama Equity.<br />
              <span className="cta-title--accent">Mulai dari Sekarang.</span>
            </h2>

            <p className="cta-subtitle">
              Untuk Anda — {' '}
              <span className="cta-subtitle--highlight">founder, developer, designer, siapapun</span>{' '}
              yang ingin membangun startup di atas fondasi yang jujur.
              Sebelum konflik equity sempat dimulai.
            </p>

            <div className="cta-actions">
              <Link to="/register" className="cta-btn-primary">
                Daftar Gratis Sekarang
                <span className="cta-btn-arrow">→</span>
              </Link>
            </div>

            <p className="cta-trust">
              <span>✓ Setup 5 menit</span>
              <span>✓ Tanpa kartu kredit</span>
              <span>✓ Gratis selamanya</span>
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}