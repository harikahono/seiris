import { Navbar } from "./components/ui/Navbar";
import { XCircle, PieChart, CheckCircle, Receipt, Lock } from "lucide-react";

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-[#0a0a0a] to-[#111111]">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-6xl font-bold text-white mb-6 tracking-tight">
            SEIRIS
          </h1>
          <p className="text-2xl text-gray-300 mb-8">
            Smart Equity Management untuk Tim Startup Mahasiswa
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Kelola pembagian equity secara dinamis menggunakan model Slicing Pie. 
            Transparan, adil, dan otomatis.
          </p>
        </div>
      </section>

      {/* Problem Section */}
      <section id="tentang" className="py-20 px-4 bg-[#111111] border-t border-gray-900">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">
            Masalah yang Sering Terjadi
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-[#0a0a0a] border border-red-900/30 rounded-xl shadow-lg transform transition-transform hover:-translate-y-1">
              <XCircle className="w-10 h-10 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-100 mb-2">Equity Tidak Adil</h3>
              <p className="text-gray-500">
                Pembagian equal split tidak mencerminkan kontribusi nyata setiap anggota tim.
              </p>
            </div>
            <div className="p-6 bg-[#0a0a0a] border border-red-900/30 rounded-xl shadow-lg transform transition-transform hover:-translate-y-1">
              <XCircle className="w-10 h-10 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-100 mb-2">Kontribusi Tidak Tercatat</h3>
              <p className="text-gray-500">
                Tidak ada sistem pencatatan kontribusi sejak hari pertama.
              </p>
            </div>
            <div className="p-6 bg-[#0a0a0a] border border-red-900/30 rounded-xl shadow-lg transform transition-transform hover:-translate-y-1">
              <XCircle className="w-10 h-10 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-100 mb-2">Revenue Tidak Transparan</h3>
              <p className="text-gray-500">
                Markup revenue oleh PM/Sales tidak dapat diverifikasi oleh tim.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="cara-kerja" className="py-20 px-4 bg-[#0a0a0a]">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">
            Cara Kerja SEIRIS
          </h2>
          <div className="space-y-8">
            <div className="flex gap-6 items-start p-6 rounded-xl bg-[#111111] border border-gray-800">
              <div className="flex-shrink-0 w-12 h-12 bg-[#e07820] text-white rounded-full flex items-center justify-center text-xl font-bold shadow-md">
                1
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-100 mb-2">Catat Kontribusi</h3>
                <p className="text-gray-500">
                  Setiap anggota tim mencatat kontribusi mereka: TIME, CASH, IDEA, NETWORK, FACILITY, REVENUE.
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start p-6 rounded-xl bg-[#111111] border border-gray-800">
              <div className="flex-shrink-0 w-12 h-12 bg-[#e07820] text-white rounded-full flex items-center justify-center text-xl font-bold shadow-md">
                2
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-100 mb-2">Tim Vote Approval</h3>
                <p className="text-gray-500">
                  Kontribusi IDEA dan NETWORK memerlukan voting approval dari anggota tim (threshold 75%).
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start p-6 rounded-xl bg-[#111111] border border-gray-800">
              <div className="flex-shrink-0 w-12 h-12 bg-[#e07820] text-white rounded-full flex items-center justify-center text-xl font-bold shadow-md">
                3
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-100 mb-2">Equity Auto-Calculate</h3>
                <p className="text-gray-500">
                  Sistem menghitung equity secara realtime berdasarkan algoritma Slicing Pie. Transparan dan dapat diaudit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="py-20 px-4 bg-[#111111] border-t border-gray-900">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">
            Fitur Utama
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 border border-gray-800 rounded-xl hover:border-[#e07820] hover:bg-[#0a0a0a] transition-all bg-[#0f0f0f] group">
              <PieChart className="w-10 h-10 text-gray-600 mb-4 group-hover:text-[#e07820] transition-colors" />
              <h3 className="text-xl font-bold text-gray-100 mb-2">Dashboard Equity Realtime</h3>
              <p className="text-gray-500">
                Pie chart dan breakdown kontribusi setiap anggota, update otomatis.
              </p>
            </div>
            <div className="p-6 border border-gray-800 rounded-xl hover:border-[#e07820] hover:bg-[#0a0a0a] transition-all bg-[#0f0f0f] group">
              <CheckCircle className="w-10 h-10 text-gray-600 mb-4 group-hover:text-[#e07820] transition-colors" />
              <h3 className="text-xl font-bold text-gray-100 mb-2">Approval System</h3>
              <p className="text-gray-500">
                Voting approval untuk kontribusi subjektif dengan notifikasi realtime.
              </p>
            </div>
            <div className="p-6 border border-gray-800 rounded-xl hover:border-[#e07820] hover:bg-[#0a0a0a] transition-all bg-[#0f0f0f] group">
              <Receipt className="w-10 h-10 text-gray-600 mb-4 group-hover:text-[#e07820] transition-colors" />
              <h3 className="text-xl font-bold text-gray-100 mb-2">Revenue Transparency</h3>
              <p className="text-gray-500">
                Upload invoice wajib untuk mencegah markup tidak transparan.
              </p>
            </div>
            <div className="p-6 border border-gray-800 rounded-xl hover:border-[#e07820] hover:bg-[#0a0a0a] transition-all bg-[#0f0f0f] group">
              <Lock className="w-10 h-10 text-gray-600 mb-4 group-hover:text-[#e07820] transition-colors" />
              <h3 className="text-xl font-bold text-gray-100 mb-2">Freeze Equity</h3>
              <p className="text-gray-500">
                Bekukan equity saat pre-funding untuk referensi pembagian saham legal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="register" className="py-24 px-4 bg-[#e07820]">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Mulai Kelola Equity Tim Kamu
          </h2>
          <p className="text-xl text-white/90 mb-10">
            Gratis untuk tim startup mahasiswa. No credit card required.
          </p>
          <button className="px-8 py-4 bg-white text-[#e07820] font-bold text-lg rounded-xl shadow-xl hover:bg-gray-100 hover:scale-105 transition-all">
            Daftar Sekarang →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-[#0a0a0a] text-gray-600 text-center border-t border-gray-900">
        <p>© 2026 SEIRIS • Institut Teknologi Indonesia</p>
      </footer>
    </div>
  );
}

export default App;