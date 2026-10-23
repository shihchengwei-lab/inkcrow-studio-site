import type { Metadata, Viewport } from "next";
import "./globals.css";
import InkNavigation from "./InkNavigation";

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
        {/* 在畫面繪製前先判斷兩件事，結果寫成 <html> 的標記，由 CSS 與 Immersion 讀取：
            1. data-nav-in：這次是從站內連結的墨色轉場過來的（InkNavigation 留下點擊位置），
               新頁面要播「墨從該位置退去」，位置存成 --cx、--cy。
            2. data-intro-seen：首頁進場揭幕每個瀏覽分頁只播一次；從轉場進首頁也算看過。條款頁不算播過。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement,n=sessionStorage.getItem("ink-nav");if(n){sessionStorage.removeItem("ink-nav");var p=n.split(",");if(Date.now()-Number(p[2])<5000){d.setAttribute("data-nav-in","");d.style.setProperty("--cx",p[0]+"px");d.style.setProperty("--cy",p[1]+"px")}}if(location.pathname!=="/")return;if(d.hasAttribute("data-nav-in")||sessionStorage.getItem("intro-seen"))d.setAttribute("data-intro-seen","");sessionStorage.setItem("intro-seen","1")}catch(e){}})()`,
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
      <body>
        {children}
        <InkNavigation />
        {/* 換頁後墨退去的墨幕，平常隱藏，只有 data-nav-in 時顯示（見 globals.css） */}
        <div className="nav-cover" aria-hidden="true" />
      </body>
    </html>
  );
}
