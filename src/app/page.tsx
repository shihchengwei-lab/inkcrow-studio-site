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
import HomeCopy from "./HomeCopy";
import WhaleSea from "./WhaleSea";

export default function Home() {
  const partridgeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const setScrollY = () => {
      document.body.style.setProperty("--scroll-y", `${motion.matches ? 0 : window.scrollY}px`);
    };
    const motionChanged = () => {
      setScrollY();
      if (motion.matches) animations.forEach((animation) => animation.cancel());
    };
    window.addEventListener("scroll", setScrollY, { passive: true });
    motion.addEventListener("change", motionChanged);
    setScrollY();

    const items = document.querySelectorAll<HTMLElement>(".fade-up");
    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              observer?.unobserve(entry.target);
              if (motion.matches) return;
              // 正文始終可見；有限動畫只暫時覆蓋樣式，完成或取消即恢復正文。
              const animation = entry.target.animate([
                { opacity: 0, transform: "translateY(24px)" },
                { opacity: 1, transform: "translateY(0)" },
              ], {
                duration: 700, easing: "ease-out", fill: "backwards",
                delay: Number(getComputedStyle(entry.target).getPropertyValue("--fade-delay")) || 0,
              });
              animations.add(animation);
              animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
      );
      items.forEach((el) => observer!.observe(el));
    }

    return () => {
      window.removeEventListener("scroll", setScrollY);
      motion.removeEventListener("change", motionChanged);
      document.body.style.removeProperty("--scroll-y");
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return (
    <div className="home-page">
      <WhaleSea />
      <WaterInk />
      <Immersion />
      <section className="hero container">
        <div className="hero-text">
          <div className="eyebrow hero-eyebrow">
            Inkcrow Studio · Independent · Taipei
          </div>
          <InkTitle text="墨鴉" />
          <div className="hero-title-en">Inkcrow Studio</div>
          <HomeCopy kind="hero-tagline" text="獨立工作室、做一點自己想玩的遊戲。" />
          <a href="#work" className="hero-chip">
            現役作品 · 願行
          </a>
        </div>
        <div className="hero-visual">
          <StudioLogo />
        </div>
      </section>

      <section className="studio fade-up">
        <div className="container studio-layout">
          <div className="studio-left">
            <HomeCopy kind="studio-quote" text="做自己想玩的遊戲。" />
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
            <HomeCopy kind="body" text="墨鴉是一間獨立工作室。沒有大團隊、不追求量產。" />
            <HomeCopy kind="body" text="我們做自己想玩的遊戲、做完、拿出來給世界看。如果剛好有人也喜歡、那是兩件好事。" />
            <HomeCopy kind="body" text="目前以個人開發者身份營運。作品以軟體與互動體驗為主。" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/cedar_corner.webp"
              alt=""
              className="inline-deco"
              aria-hidden="true"
            />
          </div>
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
            <HomeCopy kind="work-tagline" text="用走路累積願力、與民間信仰的神明同行。每一步、都是一次安靜的回禮。" />
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
            <HomeCopy kind="body" text="每天走的路、都化成一點點願力。日復一日、像在心裡蓋一座屬於自己的小神壇。" />
          </div>
          <div className="work-col fade-up">
            <div className="work-col-visual">
              <CharacterReveal scene="field" />
            </div>
            <div className="work-col-en">companions</div>
            <h3>神明同行</h3>
            <HomeCopy kind="body" text="媽祖、保生大帝、月老、玄壇真君......民間信仰的神明、在路上陪你走。每一位、都有自己的脾性與故事。" />
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
              <HomeCopy kind="body" text="獨立工作室、做一點自己想玩的遊戲。目前以個人開發者身份營運。" />
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
