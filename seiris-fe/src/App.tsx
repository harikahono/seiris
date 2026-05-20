import { Navbar } from "./components/ui/Navbar";
import { Hero } from "./components/landing/Hero";
import { Problem } from "./components/landing/Problem";
import { How } from "./components/landing/How";
import { Features } from "./components/landing/Features";
import { CTA } from "./components/landing/CTA";
import { Footer } from "./components/landing/Footer";

function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <Hero />
      <Problem />  {/* <-- TARUH DI SINI */}
      <How />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}

export default App;