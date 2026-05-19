import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { DottedBackground } from "@/components/ui/Dot";
import "@/styles/hero.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=150%",
        scrub: 1,
        pin: true,
        anticipatePin: 1,
      }
    });

    // Teks ditarik ke atas dan pudar
    tl.to(titleRef.current, {
      y: -150,
      opacity: 0,
      ease: "power1.inOut",
    }, 0);

    // Animasi Tablet (TIDAK DISENTUH)
    tl.fromTo(
      cardRef.current,
      {
        rotateX: 60,
        scale: 0.8,
        y: -30
      },
      {
        rotateX: 0,
        scale: 1,
        y: -100,
        ease: "power1.inOut",
      },
      0
    );

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="hero-section">

      {/* Background layer — absolute, tidak affect layout apapun */}
      <div className="hero-bg-layer">
        <DottedBackground
          dotColor="rgba(224, 120, 32, 0.5)"   // orange accent SEIRIS
          backgroundColor="#0a0a0a"   
          enableVignette={true}
          vignetteColor="rgba(0,0,0,0.9)"
          enableInnerGlow={true}
          innerGlowColor="rgba(0,0,0,0.8)"
          dotSize={2}
          dotSpacing={20}
        />
      </div>

      <div className="hero-wrapper">
        {/* Title */}
        <div ref={titleRef} className="hero-title-container">
          <h1 className="hero-title">
            Your 50/50 Split <br />
            <span className="hero-title-accent">Is Already Wrong.</span>
          </h1>
          <p className="hero-subtitle">
              Static equity deals destroy startups — and friendships. SEIRIS tracks every hour, money, and resource your team contributes in real-time, so every founder gets exactly what they've earned. Powered by the Slicing Pie model.
          </p>
        </div>

        {/* Card 3D (TIDAK DISENTUH) */}
        <div ref={cardRef} className="hero-card">
          <div className="hero-card-inner">
            <div className="hero-placeholder">
              <div className="hero-placeholder-header">
                <div className="dot red"></div>
                <div className="dot yellow"></div>
                <div className="dot green"></div>
              </div>
              <div className="hero-placeholder-content">
                <p className="hero-placeholder-text">SEIRIS Dashboard Preview</p>
                <div className="dummy-chart"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}