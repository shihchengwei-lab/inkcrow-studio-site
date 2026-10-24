"use client";
import { useEffect, useRef, useState } from "react";
import Immersion from "./Immersion";
import WaterInk from "./WaterInk";
import StudioLogo from "./StudioLogo";
import ButterflyArtwork from "./ButterflyArtwork";
import PartridgeArtwork from "./PartridgeArtwork";

export default function Home() {
  const [audioOn, setAudioOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // 竹雞鳥叫：間歇模式、每 8-15s 觸發一次、每次走 5s envelope
  // 不對稱三角音量：peak @ distance=400、內 200、外 4000
  useEffect(() => {
    if (!audioOn || !audioRef.current) return;
    const partridgeEl = document.querySelector<HTMLElement>(".partridge-deco");
    if (!partridgeEl) return;
    const audio = audioRef.current;

    let timeoutId: number | null = null;
    let cancelled = false;
    const BASE_VOLUME = 0.05;
    const PEAK_DISTANCE = 400;
    const INNER_WIDTH = 200;
    const OUTER_WIDTH = 4000;
    const FADE_IN_MS = 500;
    const FADE_OUT_MS = 600;
    const PLAY_DURATION_MS = 5000; // 切在第 5 聲後、避開最後 0.5s 的半聲

    const playCall = () => {
      if (cancelled) return;
      const rect = partridgeEl.getBoundingClientRect();
      const partridgeCenterY = rect.top + rect.height / 2;
      const viewportCenterY = window.innerHeight / 2;
      const distance = Math.abs(partridgeCenterY - viewportCenterY);
      let peakVol: number;
      if (distance < PEAK_DISTANCE - INNER_WIDTH) {
        peakVol = 0;
      } else if (distance < PEAK_DISTANCE) {
        peakVol = BASE_VOLUME * (distance - (PEAK_DISTANCE - INNER_WIDTH)) / INNER_WIDTH;
      } else {
        peakVol = Math.max(0, BASE_VOLUME * (1 - (distance - PEAK_DISTANCE) / OUTER_WIDTH));
      }

      if (peakVol >= 0.005) {
        audio.volume = 0;
        audio.currentTime = 0;
        audio.play().catch(() => {
          /* play 失敗就忽略 */
        });

        // Volume envelope: fade-in → hold → fade-out → pause
        const start = performance.now();
        const tick = () => {
          if (cancelled) return;
          const t = performance.now() - start;
          if (t >= PLAY_DURATION_MS) {
            audio.pause();
            audio.volume = 0;
            return;
          }
          let factor: number;
          if (t < FADE_IN_MS) {
            factor = t / FADE_IN_MS;
          } else if (t < PLAY_DURATION_MS - FADE_OUT_MS) {
            factor = 1;
          } else {
            factor = (PLAY_DURATION_MS - t) / FADE_OUT_MS;
          }
          audio.volume = peakVol * Math.max(0, Math.min(1, factor));
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }

      const gap = 8000 + Math.random() * 7000;
      timeoutId = window.setTimeout(playCall, gap);
    };

    audio.loop = false;
    const firstGap = 8000 + Math.random() * 7000;
    timeoutId = window.setTimeout(playCall, firstGap);

    return () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      audio.pause();
    };
  }, [audioOn]);

  const toggleAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/assets/partridge_call.mp3");
      audioRef.current.preload = "auto";
    }
    // 第一次開啟時、在 user gesture 同步中 prime audio（iOS 友善）
    // 不在這裡 pause、留給 useEffect 接手 loop 播放、避免 race condition
    if (!audioOn) {
      audioRef.current.volume = 0;
      audioRef.current.play().catch(() => {
        /* prime 失敗也繼續 */
      });
    }
    setAudioOn((v) => !v);
  };

  return (
    <div className="home-page">
      <WaterInk />
      {/* 墨暈標題用的濾鏡：每個字一組，才能各自暈開 */}
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute" }}
      >
        <defs>
          {[0, 1].map((i) => (
            <filter
              key={i}
              id={`ink-bleed-${i}`}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur id={`ink-blur-${i}`} stdDeviation="0" />
              <feColorMatrix
                id={`ink-mat-${i}`}
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
              />
            </filter>
          ))}
        </defs>
      </svg>
      <Immersion />
      <section className="hero container">
        <div className="hero-text">
          <div className="eyebrow hero-eyebrow">
            Inkcrow Studio · Independent · Taipei
          </div>
          <h1 className="hero-title">
            <span className="ink-char">墨</span>
            <span className="ink-char">鴉</span>
          </h1>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/work_hero.webp"
            alt="願行 — 神明陪你日常行走"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/col_2_companion.webp"
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
          <PartridgeArtwork />
        </div>
      </section>

      <button
        type="button"
        onClick={toggleAudio}
        className="audio-toggle"
        aria-label={audioOn ? "關閉鳥叫" : "開啟鳥叫"}
      >
        {audioOn ? "🔊 鳥叫 開" : "🔇 鳥叫 關"}
      </button>

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
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div>&copy; 2026 INKCROW STUDIO</div>
            <div>Taipei, Taiwan</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
