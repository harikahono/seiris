import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import logo from "@/assets/logo.png";
import "@/styles/navbar.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
}

export function Navbar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useGSAP(() => {
    try {
      if (!gsap.parseEase("main")) {
        CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");
      }
    } catch (e) {
      console.warn("CustomEase fallback", e);
    }
  }, { scope: containerRef });

  useGSAP(() => {
    const tl = gsap.timeline();

    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
      tl.set(".nav-overlay-wrapper", { display: "block" })
        .set(".menu-content", { xPercent: 0 })
        .fromTo(".nav-logo-btn", { rotate: 0 }, { rotate: 180, duration: 0.6, ease: "back.out(1.5)" }, "<")
        .fromTo(".overlay", { autoAlpha: 0 }, { autoAlpha: 1 }, "<")
        .fromTo(".backdrop-layer", { xPercent: 101 }, { xPercent: 0, stagger: 0.12, duration: 0.6, ease: "main" }, "<")
        .fromTo(".nav-link", { yPercent: 140, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.05, ease: "power2.out" }, "<+=0.4");
    } else {
      document.body.style.overflow = "";
      tl.to(".overlay", { autoAlpha: 0, duration: 0.4 })
        .to(".menu-content", { xPercent: 120, duration: 0.6, ease: "power2.inOut" }, "<")
        .to(".nav-logo-btn", { rotate: 0, duration: 0.6, ease: "power2.inOut" }, "<")
        .set(".nav-overlay-wrapper", { display: "none" });
    }
  }, { dependencies: [isMenuOpen], scope: containerRef });

  return (
    <div ref={containerRef}>
      <div className="site-header-wrapper">
        <header className="header container mx-auto">
          <nav className="nav-row">
            <div className="nav-row__right">
              <button role="button" className="nav-logo-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <img src={logo} alt="SEIRIS" className="nav-logo-img" />
              </button>
            </div>
          </nav>
        </header>
      </div>

      <section className="fullscreen-menu-container">
        <div className="nav-overlay-wrapper">
          <div className="overlay" onClick={() => setIsMenuOpen(false)}></div>
          <nav className="menu-content">
            <div className="menu-bg">
              <div className="backdrop-layer first"></div>
              <div className="backdrop-layer second"></div>
              <div className="backdrop-layer"></div>
            </div>

            <div className="menu-content-wrapper">
              <ul className="menu-list">
                <li className="menu-list-item">
                  <a href="#problem" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                    <p className="nav-link-text">The Reality</p>
                    <div className="nav-link-hover-bg"></div>
                  </a>
                </li>
                <li className="menu-list-item">
                  <a href="#cara-kerja" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                    <p className="nav-link-text">How It Works</p>
                    <div className="nav-link-hover-bg"></div>
                  </a>
                </li>
                <li className="menu-list-item">
                  <a href="#fitur" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                    <p className="nav-link-text">Features</p>
                    <div className="nav-link-hover-bg"></div>
                  </a>
                </li>
                <li className="menu-list-item">
                  <Link to="/login" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                    <p className="nav-link-text">Login</p>
                    <div className="nav-link-hover-bg"></div>
                  </Link>
                </li>
                <li className="menu-list-item">
                  <Link to="/register" className="nav-link cta-link" onClick={() => setIsMenuOpen(false)}>
                    <p className="nav-link-text">Register Now</p>
                    <div className="nav-link-hover-bg"></div>
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </section>
    </div>
  );
}