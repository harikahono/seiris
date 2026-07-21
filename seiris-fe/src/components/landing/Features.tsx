// src/components/landing/Features.tsx

import { ChartPieSlice, CheckCircle, Receipt, Lock } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import "@/styles/features.css";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Feature {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  span: string; // CSS grid column span class
}

const features: Feature[] = [
  {
    id: 1,
    title: "Dashboard Equity Real-Time",
    subtitle:
      "Pantau perubahan equity setiap kali ada kontribusi baru. Grafik dan rincian diperbarui secara otomatis.",
    icon: <ChartPieSlice size={28} weight="duotone" />,
    span: "lg:col-span-2",
  },
  {
    id: 2,
    title: "Sistem Approval Cerdas",
    subtitle:
      "Kontribusi subjektif melalui voting tim dengan ambang batas 75%. Tidak ada lagi kontribusi fiktif.",
    icon: <CheckCircle size={28} weight="duotone" />,
    span: "lg:col-span-1",
  },
  {
    id: 3,
    title: "Transparansi Total",
    subtitle:
      "Setiap revenue dilengkapi bukti invoice. Tidak ada celah untuk mark-up atau klaim tanpa dasar.",
    icon: <Receipt size={28} weight="duotone" />,
    span: "lg:col-span-1",
  },
  {
    id: 4,
    title: "Freeze Equity untuk Keperluan Legal",
    subtitle:
      "Kunci cap table sebelum putaran fundraising. Export dokumen resmi untuk investor dan kebutuhan hukum.",
    icon: <Lock size={28} weight="duotone" />,
    span: "lg:col-span-2",
  },
];

// ─── Features ─────────────────────────────────────────────────────────────────

export function Features() {
  const reduce = useReducedMotion();

  return (
    <section id="fitur" className="features-section">
      <div className="features-container">
        {/* Header */}
        <motion.div
          className="features-header"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="features-title">Fitur Andalan</h2>
          <p className="features-subtitle">
            Semua yang Anda butuhkan untuk mengelola equity startup secara
            profesional dan transparan.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="features-grid">
          {features.map((feature, i) => (
            <motion.div
              key={feature.id}
              className={`feature-card ${feature.span}`}
              initial={reduce ? false : { opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.5,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="feature-card-icon">{feature.icon}</div>
              <div className="feature-card-body">
                <h3 className="feature-card-title">{feature.title}</h3>
                <p className="feature-card-desc">{feature.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
