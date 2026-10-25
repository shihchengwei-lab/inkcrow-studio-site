import LegalDocument from "../LegalDocument";
import { pageMetadata } from "../site-metadata";

export const metadata = pageMetadata({
  path: "/privacy/",
  title: "願行 — 隱私權政策",
  description: "願行隱私權政策（Privacy Policy）",
});

export default function PrivacyPage() {
  return <LegalDocument document="privacy" />;
}
