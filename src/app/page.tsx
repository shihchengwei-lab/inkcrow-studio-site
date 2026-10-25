"use client";
import { useEffect, useRef } from "react";
import BirdSound from "./bird-sound/BirdSound";
import Immersion from "./Immersion";
import InkTitle from "./InkTitle";
import WaterInk from "./WaterInk";
import StudioLogo from "./StudioLogo";
import ButterflyArtwork from "./ButterflyArtwork";
import PartridgeArtwork from "./PartridgeArtwork";
import CharacterReveal from "./CharacterReveal";
import StampedColophon from "./StampedColophon";

export default function Home() {
  const partridgeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const setScrollY = () => {
      document.body.style.setProperty("--scroll-y", `${motion.matches ? 0 : window.scrollY}px`);
    };
    window.addEventListener("scroll", setScrollY, { passive: true });
    motion.addEventListener("change", setScrollY);
    setScrollY();

    const items = document.querySelectorAll<HTMLElement>(".fade-up");
    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in-view");
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
      );
      items.forEach((el) => observer!.observe(el));
    } else {
      items.forEach((el) => el.classList.add("in-view"));
    }

    return () => {
      window.removeEventListener("scroll", setScrollY);
      motion.removeEventListener("change", setScrollY);
      document.body.style.removeProperty("--scroll-y");
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="home-page">
      <WaterInk />
      <Immersion />
      <section className="hero container">
        <div className="hero-text">
          <div className="eyebrow hero-eyebrow">
            Inkcrow Studio · Independent · Taipei
          </div>
          <InkTitle text="墨鴉" />
          <div className="hero-title-en">Inkcrow Studio</div>
          <p className="hero-tagline">獨立工作室、做一點自己想玩的遊戲。</p>
          <a href="#work" className="hero-chip">
            現役作品 · 願行
          </a>
        </div>
        <div className="hero-visual">
          <StudioLogo />
        </div>
      </section>

      <section className="studio container fade-up">
        <div className="studio-left">
          <p className="studio-quote">做自己想玩的遊戲。</p>
          <span className="rule-heavy"></span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/hibiscus_corner.webp"
            alt=""
            className="inline-deco"
            aria-hidden="true"
          />
        </div>
        <div className="studio-right">
          <h2>About / 工作室</h2>
          <p>墨鴉是一間獨立工作室。沒有大團隊、不追求量產。</p>
          <p>
            我們做自己想玩的遊戲、做完、拿出來給世界看。如果剛好有人也喜歡、那是兩件好事。
          </p>
          <p>目前以個人開發者身份營運。作品以軟體與互動體驗為主。</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/cedar_corner.webp"
            alt=""
            className="inline-deco"
            aria-hidden="true"
          />
        </div>
      </section>

      <div className="container">
        <div className="section-divider">
          <span>Currently Shipping</span>
          <span>2026</span>
        </div>
      </div>

      <section className="work container" id="work">
        <div className="work-header fade-up">
          <ButterflyArtwork />
          <div className="work-meta">Work 01 / Pilgrimage on Foot</div>
          <div>
            <h2 className="work-title">願行</h2>
            <div className="work-subtitle">Pilgrimage on Foot</div>
            <p className="work-tagline">
              用走路累積願力、與民間信仰的神明同行。每一步、都是一次安靜的回禮。
            </p>
          </div>
        </div>

        <div className="work-hero-image fade-up">
          <CharacterReveal scene="street" />
        </div>

        <div className="work-cols">
          <div className="work-col fade-up">
            <div className="work-col-visual incense-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/col_1_wish_strip.webp"
                alt="累積願力 — 線香香爐"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <canvas className="smoke-canvas" aria-hidden="true" />
            </div>
            <div className="work-col-en">accumulation</div>
            <h3>累積願力</h3>
            <p>
              每天走的路、都化成一點點願力。日復一日、像在心裡蓋一座屬於自己的小神壇。
            </p>
          </div>
          <div className="work-col fade-up">
            <div className="work-col-visual">
              <CharacterReveal scene="field" />
            </div>
            <div className="work-col-en">companions</div>
            <h3>神明同行</h3>
            <p>
              媽祖、保生大帝、月老、玄壇真君......民間信仰的神明、在路上陪你走。每一位、都有自己的脾性與故事。
            </p>
          </div>
        </div>

        <div className="work-cta">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/barbet_corner.webp"
            alt=""
            className="inline-deco"
            aria-hidden="true"
          />
          <p className="work-cta-note">封閉測試中 · 兩步驟加入</p>
          <div className="work-cta-links">
            <a
              href="https://groups.google.com/g/yuan-xing-testers"
              target="_blank"
              rel="noopener noreferrer"
            >
              ① 加入測試群組 →
            </a>
            <a
              href="https://play.google.com/apps/testing/tw.yuanxing.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              ② 下載測試版 →
            </a>
          </div>
          <PartridgeArtwork elementRef={partridgeRef} />
        </div>
      </section>

      <BirdSound anchorRef={partridgeRef} />

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <h3>墨鴉工作室</h3>
              <div className="footer-brand-en">Inkcrow Studio</div>
              <p>
                獨立工作室、做一點自己想玩的遊戲。
                <br />
                目前以個人開發者身份營運。
              </p>
            </div>
            <div className="footer-col footer-contact">
              <h4>Contact</h4>
              <ul className="footer-list">
                <li>
                  <a href="mailto:support@inkcrow-studio.com">
                    support@
                    <br />
                    inkcrow-studio.com
                  </a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul className="footer-list">
                <li>
                  <a href="/privacy">隱私權政策</a>
                </li>
                <li>
                  <a href="/terms">服務條款</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Works</h4>
              <ul className="footer-list">
                <li>
                  <a href="#work">願行</a>
                </li>
                <li>
                  <a href="https://ebook-one-rho.vercel.app/">
                    書庫 <span aria-hidden="true">↗</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="studio-signature">
              <StampedColophon />
              <span>&copy; 2026 INKCROW STUDIO</span>
            </div>
            <div>Taipei, Taiwan</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
