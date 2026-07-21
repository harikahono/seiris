import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import '@/styles/how.css';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const steps = [
  {
    num: '01',
    title: 'Catat Kontribusi',
    desc: 'Setiap anggota tim mencatat kontribusinya: waktu, dana, ide, relasi, fasilitas, atau penjualan. Semua tersimpan rapi sejak hari pertama.',
  },
  {
    num: '02',
    title: 'Vote Persetujuan Tim',
    desc: 'Kontribusi subjektif seperti ide dan relasi memerlukan persetujuan tim. Ambang batas 75% menjaga keadilan dan mencegah penyalahgunaan cap table.',
  },
  {
    num: '03',
    title: 'Equity Terupdate Otomatis',
    desc: 'Sistem menghitung equity secara dinamis berdasarkan algoritma Slicing Pie. Setiap kontribusi yang disetujui langsung mengubah porsi equity.',
  },
];

export function How() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Animasi fade-up untuk setiap langkah saat di-scroll
    const stepElements = gsap.utils.toArray('.hiw-step') as HTMLElement[];
    
    stepElements.forEach((step) => {
      gsap.fromTo(
        step,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: step,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // Efek rotasi pelan pada grafik SVG
    gsap.to('.hiw-graphic-svg', {
      rotate: 360,
      duration: 120,
      repeat: -1,
      ease: 'none',
    });
  }, { scope: containerRef });

  return (
    <section id="cara-kerja" className="hiw-section" ref={containerRef}>
      <div className="hiw-container">
        
        {/* Kolom Kiri - Sticky */}
        <div className="hiw-sticky-col">
          <div className="hiw-sticky-content">
            <h2 className="hiw-title">
              Bagi equity secara adil <br />
              <span className="hiw-title-accent">dalam tiga langkah sederhana</span>
            </h2>
            <p className="hiw-subtitle">
              Tidak perlu dokumen hukum yang rumit. Atur cap table startup Anda secara dinamis dalam hitungan menit.
            </p>
          </div>

          {/* Grafik Abstrak Lingkaran */}
          <div className="hiw-graphic">
            <svg className="hiw-graphic-svg" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="400" r="350" stroke="#E07820" strokeWidth="1" strokeOpacity="0.6"/>
              <circle cx="100" cy="400" r="280" stroke="#333333" strokeWidth="1" />
              <circle cx="100" cy="400" r="200" stroke="#E07820" strokeWidth="1" strokeOpacity="0.4"/>
              <circle cx="100" cy="400" r="120" stroke="#333333" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Kolom Kanan - Scrollable */}
        <div className="hiw-steps-col">
          {steps.map((step, index) => (
            <div key={index} className="hiw-step">
              <span className="hiw-step-num">{step.num}</span>
              <h3 className="hiw-step-title">{step.title}</h3>
              <p className="hiw-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}