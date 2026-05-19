import { Navbar } from "./components/ui/Navbar";
import { Hero } from "./components/landing/Hero";
import { XCircle, PieChart, CheckCircle, Receipt, Lock } from "lucide-react";

function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      {/* Hero with 3D Scroll Animation */}
      <Hero />

      {/* Problem Section */}
      <section id="tentang" className="py-24 px-4 bg-[#111111] border-t border-gray-800/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-5xl font-bold text-white mb-4 text-center">
            Masalah yang Sering Terjadi
          </h2>
          <p className="text-gray-500 text-center mb-16 max-w-2xl mx-auto">
            Startup mahasiswa sering menghadapi 3 masalah krusial dalam pembagian equity
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-[#0a0a0a] border border-red-900/20 rounded-2xl shadow-xl transform transition-all hover:-translate-y-2 hover:border-red-900/40">
              <XCircle className="w-12 h-12 text-red-500 mb-6" strokeWidth={1.5} />
              <h3 className="text-xl font-bold text-gray-100 mb-3">Equity Tidak Adil</h3>
              <p className="text-gray-500 leading-relaxed">
                Pembagian equal split tidak mencerminkan kontribusi nyata setiap anggota tim.
              </p>
            </div>
            <div className="p-8 bg-[#0a0a0a] border border-red-900/20 rounded-2xl shadow-xl transform transition-all hover:-translate-y-2 hover:border-red-900/40">
              <XCircle className="w-12 h-12 text-red-500 mb-6" strokeWidth={1.5} />
              <h3 className="text-xl font-bold text-gray-100 mb-3">Kontribusi Tidak Tercatat</h3>
              <p className="text-gray-500 leading-relaxed">
                Tidak ada sistem pencatatan kontribusi sejak hari pertama startup berdiri.
              </p>
            </div>
            <div className="p-8 bg-[#0a0a0a] border border-red-900/20 rounded-2xl shadow-xl transform transition-all hover:-translate-y-2 hover:border-red-900/40">
              <XCircle className="w-12 h-12 text-red-500 mb-6" strokeWidth={1.5} />
              <h3 className="text-xl font-bold text-gray-100 mb-3">Revenue Tidak Transparan</h3>
              <p className="text-gray-500 leading-relaxed">
                Markup revenue oleh PM/Sales tidak dapat diverifikasi oleh anggota tim lain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="cara-kerja" className="py-24 px-4 bg-[#0a0a0a]">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-5xl font-bold text-white mb-4 text-center">
            Cara Kerja SEIRIS
          </h2>
          <p className="text-gray-500 text-center mb-16 max-w-2xl mx-auto">
            Tiga langkah sederhana untuk mengelola equity secara adil dan transparan
          </p>
          <div className="space-y-6">
            <div className="flex gap-6 items-start p-8 rounded-2xl bg-[#111111] border border-gray-800/50 hover:border-[#e07820]/30 transition-all group">
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-[#e07820] to-[#c96a1b] text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-100 mb-3">Catat Kontribusi</h3>
                <p className="text-gray-500 leading-relaxed">
                  Setiap anggota tim mencatat kontribusi mereka: <span className="text-[#e07820] font-medium">TIME, CASH, IDEA, NETWORK, FACILITY, REVENUE</span>. 
                  Sistem mencatat semua kontribusi sejak hari pertama.
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start p-8 rounded-2xl bg-[#111111] border border-gray-800/50 hover:border-[#e07820]/30 transition-all group">
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-[#e07820] to-[#c96a1b] text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-100 mb-3">Tim Vote Approval</h3>
                <p className="text-gray-500 leading-relaxed">
                  Kontribusi subjektif seperti <span className="text-[#e07820] font-medium">IDEA dan NETWORK</span> memerlukan voting approval dari anggota tim 
                  dengan threshold <span className="text-[#e07820] font-medium">75%</span> untuk mencegah abuse.
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start p-8 rounded-2xl bg-[#111111] border border-gray-800/50 hover:border-[#e07820]/30 transition-all group">
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-[#e07820] to-[#c96a1b] text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-100 mb-3">Equity Auto-Calculate</h3>
                <p className="text-gray-500 leading-relaxed">
                  Sistem menghitung equity secara <span className="text-[#e07820] font-medium">realtime</span> berdasarkan algoritma Slicing Pie. 
                  Setiap perubahan kontribusi langsung update equity breakdown.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="py-24 px-4 bg-[#111111] border-t border-gray-800/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-5xl font-bold text-white mb-4 text-center">
            Fitur Utama
          </h2>
          <p className="text-gray-500 text-center mb-16 max-w-2xl mx-auto">
            Semua yang dibutuhkan untuk mengelola equity startup secara profesional
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 border-2 border-gray-800 rounded-2xl hover:border-[#e07820] hover:bg-[#0a0a0a] transition-all bg-[#0f0f0f] group">
              <PieChart className="w-12 h-12 text-gray-600 mb-6 group-hover:text-[#e07820] group-hover:scale-110 transition-all" strokeWidth={1.5} />
              <h3 className="text-2xl font-bold text-gray-100 mb-3">Dashboard Equity Realtime</h3>
              <p className="text-gray-500 leading-relaxed">
                Visualisasi pie chart dan breakdown detail kontribusi setiap anggota. Data update otomatis setiap ada perubahan.
              </p>
            </div>
            <div className="p-8 border-2 border-gray-800 rounded-2xl hover:border-[#e07820] hover:bg-[#0a0a0a] transition-all bg-[#0f0f0f] group">
              <CheckCircle className="w-12 h-12 text-gray-600 mb-6 group-hover:text-[#e07820] group-hover:scale-110 transition-all" strokeWidth={1.5} />
              <h3 className="text-2xl font-bold text-gray-100 mb-3">Approval System</h3>
              <p className="text-gray-500 leading-relaxed">
                Sistem voting demokratis untuk kontribusi subjektif. Notifikasi realtime via email dan in-app.
              </p>
            </div>
            <div className="p-8 border-2 border-gray-800 rounded-2xl hover:border-[#e07820] hover:bg-[#0a0a0a] transition-all bg-[#0f0f0f] group">
              <Receipt className="w-12 h-12 text-gray-600 mb-6 group-hover:text-[#e07820] group-hover:scale-110 transition-all" strokeWidth={1.5} />
              <h3 className="text-2xl font-bold text-gray-100 mb-3">Revenue Transparency</h3>
              <p className="text-gray-500 leading-relaxed">
                Upload invoice wajib untuk setiap revenue yang dicatat. Mencegah markup tidak transparan oleh PM/Sales.
              </p>
            </div>
            <div className="p-8 border-2 border-gray-800 rounded-2xl hover:border-[#e07820] hover:bg-[#0a0a0a] transition-all bg-[#0f0f0f] group">
              <Lock className="w-12 h-12 text-gray-600 mb-6 group-hover:text-[#e07820] group-hover:scale-110 transition-all" strokeWidth={1.5} />
              <h3 className="text-2xl font-bold text-gray-100 mb-3">Freeze Equity</h3>
              <p className="text-gray-500 leading-relaxed">
                Bekukan equity saat pre-funding untuk referensi pembagian saham legal. Export ke PDF untuk dokumentasi resmi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="register" className="py-32 px-4 bg-gradient-to-br from-[#e07820] via-[#d97420] to-[#c96a1b] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Mulai Kelola Equity Tim Kamu
          </h2>
          <p className="text-xl text-white/90 mb-12 leading-relaxed">
            Gratis untuk tim startup mahasiswa. Tanpa kartu kredit, tanpa commitment. 
            Mulai catat kontribusi hari ini.
          </p>
          <button className="px-10 py-5 bg-white text-[#e07820] font-bold text-lg rounded-2xl shadow-2xl hover:bg-gray-50 hover:scale-105 transition-all inline-flex items-center gap-3 group">
            Daftar Sekarang
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
          <p className="mt-8 text-white/70 text-sm">
            ✓ Setup 5 menit  ✓ No credit card  ✓ Gratis selamanya
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-[#0a0a0a] text-gray-500 border-t border-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">SEIRIS</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Smart Equity Management untuk tim startup mahasiswa berbasis model Slicing Pie.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#tentang" className="hover:text-[#e07820] transition-colors">Tentang SEIRIS</a></li>
                <li><a href="#cara-kerja" className="hover:text-[#e07820] transition-colors">Cara Kerja</a></li>
                <li><a href="#fitur" className="hover:text-[#e07820] transition-colors">Fitur</a></li>
                <li><a href="#register" className="hover:text-[#e07820] transition-colors">Daftar</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <p className="text-sm text-gray-600 mb-2">Institut Teknologi Indonesia</p>
              <p className="text-sm text-gray-600">Serpong, Tangerang Selatan</p>
            </div>
          </div>
          <div className="border-t border-gray-900 pt-8 text-center text-sm">
            <p>© 2026 SEIRIS • Institut Teknologi Indonesia • All rights reserved</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;