import type { Metadata } from "next";

const SITE_URL = "https://inkcrow-studio.com";
const SHARE_IMAGE = {
  url: new URL("/assets/social-cover.webp", SITE_URL).href,
  width: 1200,
  height: 630,
  type: "image/webp",
  alt: "墨鴉工作室 Inkcrow Studio — 獨立工作室、做一點自己想玩的遊戲。",
};

export function pageMetadata({ path, title, description }: {
  path: "/" | "/privacy/" | "/terms/";
  title: string;
  description: string;
}): Metadata {
  const url = new URL(path, SITE_URL).href;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "zh_TW",
      siteName: "Inkcrow Studio",
      url,
      title,
      description,
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: SHARE_IMAGE.url, alt: SHARE_IMAGE.alt }],
    },
  };
}
