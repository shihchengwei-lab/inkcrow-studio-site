import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "墨鴉工作室 — 願行 Pilgrimage on Foot",
  description:
    "墨鴉是一間獨立工作室，做一點自己想玩的遊戲。現役作品「願行」，用走路累積願力，與民間信仰的神明同行。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        {/* 首頁進場揭幕每個瀏覽分頁只播一次：在畫面繪製前先看這個分頁播過沒有，
            播過就在 <html> 加 data-intro-seen，由 CSS 把揭幕隱藏。條款頁不算播過。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(location.pathname!=="/")return;if(sessionStorage.getItem("intro-seen"))document.documentElement.setAttribute("data-intro-seen","");else sessionStorage.setItem("intro-seen","1")}catch(e){}})()`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=Noto+Serif+TC:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
