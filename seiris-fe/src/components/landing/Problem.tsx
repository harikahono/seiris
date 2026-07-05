// src/components/landing/Problem.tsx

import { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 4;
const ROTATE_INTERVAL = 6000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProblemCard {
  quote: string;
  name: string;
  role: string;
  seed: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const problems: ProblemCard[] = [
  {
    quote: "We split 50/50 on day one. A year later he quit to work at a bank, but still owns half the company. We can't raise funds now.",
    name: "Former CEO",
    role: "Failed SaaS Startup",
    seed: "ceo-saas",
  },
  {
    quote: "Everything was a handshake deal. When revenue started flowing in, suddenly everyone had 'amnesia' about the initial split.",
    name: "Operations Lead",
    role: "E-commerce Platform",
    seed: "ops-ecom",
  },
  {
    quote: "An advisor took 5% for two email intros. They ghosted us after month two. That 5% is now dead equity sitting on our cap table.",
    name: "Co-Founder",
    role: "Fintech Startup",
    seed: "cofounder-ft",
  },
  {
    quote: "Nobody tracked who paid for servers or marketing. When it was time to reimburse from our first profit, it was total chaos.",
    name: "CTO",
    role: "AI Dev Agency",
    seed: "cto-ai",
  },
  {
    quote: "One co-founder believed their 'idea' was worth 80% of the equity, while we did 100% of the late-night coding and execution.",
    name: "Lead Developer",
    role: "Mobile App Startup",
    seed: "lead-dev",
  },
  {
    quote: "Five of us started it, but only two actually put in the work. The other three just sat there waiting for the company to get acquired.",
    name: "The Hustler",
    role: "Marketplace App",
    seed: "hustler-mkpl",
  },
  {
    quote: "VCs walked away from our seed round because our cap table was toxic. Too many early inactive founders held majority voting rights.",
    name: "CEO",
    role: "HealthTech Startup",
    seed: "ceo-health",
  },
  {
    quote: "Sales claimed crazy numbers without transparent invoices. Revenue distribution became a warzone instead of a celebration.",
    name: "CFO",
    role: "B2B Software",
    seed: "cfoo-b2b",
  },
];

// ─── Card config ──────────────────────────────────────────────────────────────

const CARD_CONFIG = [
  { position: 'lg:absolute lg:top-[5%] lg:left-[2%] xl:left-[4%]',   isRight: false },
  { position: 'lg:absolute lg:top-[5%] lg:right-[2%] xl:right-[4%]', isRight: true  },
  { position: 'lg:absolute lg:bottom-[5%] lg:left-[2%] xl:left-[4%]',   isRight: false },
  { position: 'lg:absolute lg:bottom-[5%] lg:right-[2%] xl:right-[4%]', isRight: true  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDiceBearUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}&backgroundColor=0a0a0a`;
}

// ─── Problem ──────────────────────────────────────────────────────────────────

export function Problem() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + BATCH_SIZE) % problems.length);
        setIsAnimating(false);
      }, 500);
    }, ROTATE_INTERVAL);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const activeCards = Array.from({ length: BATCH_SIZE }).map((_, i) =>
    problems[(currentIndex + i) % problems.length],
  );

  return (
    <section
      id="tentang"
      className="lg:mx-auto bg-gradient-to-br from-white/5 via-transparent to-white/5 max-w-7xl rounded-3xl mt-24 mb-24 p-4 md:p-10 relative overflow-hidden border border-white/10"
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        aria-hidden
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 100%)',
        }}
      />

      {/* Center glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-[#E07820]/10 blur-[100px] rounded-full pointer-events-none z-0"
        aria-hidden
      />

      <div className="min-h-[1100px] lg:min-h-[900px] flex flex-col lg:block w-full relative items-center justify-center py-12">

        {/* Center Content */}
        <div className="z-20 flex flex-col lg:absolute lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 text-center max-w-3xl mb-16 px-6 relative items-center">
          <h2 className="flex flex-col gap-4">
            <span className="text-4xl md:text-5xl lg:text-6xl leading-[1.1] text-white font-bold tracking-tight">
              Brilliant ideas. <br />
              <span className="text-[#E07820]">Broken partnerships.</span>
            </span>
            <span className="block text-gray-400 text-lg max-w-2xl mx-auto mt-4">
              90% of startups fail. A massive chunk dies not because of the product,
              but because co-founders fight over unfair equity distributions.
              Don't let this be your story.
            </span>
          </h2>
          <button
            onClick={() => document.getElementById('cara-kerja')?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-10 group flex items-center gap-2 px-8 py-4 border border-white/15 text-white text-sm font-medium rounded-full hover:bg-white/5 hover:border-[#E07820]/50 transition-all"
          >
            <span>See How SEIRIS Fixes This</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-[#E07820]" />
          </button>
        </div>

        {/* Floating Cards */}
        {activeCards.map((card, index) => {
          const { position, isRight } = CARD_CONFIG[index];

          return (
            <div
              key={`${currentIndex}-${index}`}
              className={`z-10 w-full max-w-sm relative mx-auto lg:mx-0 mb-12 lg:mb-0 group transition-all duration-500 ease-in-out ${position} ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            >
              {/* Quote bubble */}
              <div className="transition-all duration-300 group-hover:border-[#E07820]/40 group-hover:-translate-y-1 bg-[#050505] border border-white/10 rounded-[24px] mb-6 p-8 relative shadow-2xl">
                {/* Bubble tail — kiri untuk card kiri, kanan untuk card kanan */}
                <div className={`absolute -bottom-3 w-6 h-6 bg-[#050505] border-r border-b border-white/10 rotate-45 transform transition-colors duration-300 group-hover:border-[#E07820]/40 ${isRight ? 'right-8' : 'left-8'}`} />
                <p className={`text-gray-300 text-base leading-relaxed relative z-10 italic ${isRight ? 'text-right' : 'text-left'}`}>
                  "{card.quote}"
                </p>
              </div>

              {/* Author — reverse row untuk card kanan */}
              <div className={`flex items-center gap-4 ${isRight ? 'flex-row-reverse pr-4' : 'pl-4'}`}>
                <div className="p-0.5 rounded-full bg-gradient-to-br from-white/20 to-transparent flex-shrink-0">
                  <img
                    src={getDiceBearUrl(card.seed)}
                    alt={card.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#050505] bg-[#111]"
                    loading="lazy"
                    width={48}
                    height={48}
                  />
                </div>
                <div className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}>
                  <span className="text-white font-medium text-sm">{card.name}</span>
                  <span className="text-[#E07820] text-xs">{card.role}</span>
                </div>
              </div>
            </div>
          );
        })}

      </div>
    </section>
  );
}