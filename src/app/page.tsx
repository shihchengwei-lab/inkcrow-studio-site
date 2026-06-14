"use client";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const setScrollY = () => {
      document.body.style.setProperty("--scroll-y", `${window.scrollY}px`);
    };
    window.addEventListener("scroll", setScrollY, { passive: true });
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
      observer?.disconnect();
    };
  }, []);

  return (
    <>
      <section className="hero container">
        <div className="hero-text">
          <div className="eyebrow hero-eyebrow">
            Inkcrow Studio · Independent · Taipei
          </div>
          <h1 className="hero-title">墨鴉</h1>
          <div className="hero-title-en">Inkcrow Studio</div>
          <p className="hero-tagline">獨立工作室、做一點自己想玩的遊戲。</p>
          <a href="#work" className="hero-chip">
            現役作品 · 願行
          </a>
        </div>
        <div className="hero-visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-mark.png"
            alt="墨鴉工作室 標記"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      </section>

      <section className="studio container fade-up">
        <div className="studio-left">
          <p className="studio-quote">做自己想玩的遊戲。</p>
          <span className="rule-heavy"></span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/hibiscus_corner.png"
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
            src="/assets/cedar_corner.png"
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/butterfly_corner.png"
            alt=""
            className="inline-deco"
            aria-hidden="true"
          />
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/work_hero.png"
            alt="願行 — 神明陪你日常行走"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <div className="work-cols">
          <div className="work-col fade-up">
            <div className="work-col-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/col_1_wish_strip.png"
                alt="累積願力 — 線香香爐"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div className="work-col-en">accumulation</div>
            <h3>累積願力</h3>
            <p>
              每天走的路、都化成一點點願力。日復一日、像在心裡蓋一座屬於自己的小神壇。
            </p>
          </div>
          <div className="work-col fade-up">
            <div className="work-col-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/col_2_companion.png"
                alt="神明同行 — 歸安陪女玩家走田野"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
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
            src="/assets/barbet_corner.png"
            alt=""
            className="inline-deco"
            aria-hidden="true"
          />
          <a href="#">Available on Google Play →</a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/partridge_corner.png"
            alt=""
            className="inline-deco"
            aria-hidden="true"
          />
        </div>
      </section>

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
            <div className="footer-col">
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
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div>&copy; 2026 INKCROW STUDIO</div>
            <div>Taipei, Taiwan</div>
          </div>
        </div>
      </footer>
    </>
  );
}
