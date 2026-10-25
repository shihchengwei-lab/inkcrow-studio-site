import LegalDocument from "../LegalDocument";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "願行 — 隱私權政策",
  description: "願行隱私權政策（Privacy Policy）",
};

export default function PrivacyPage() {
  return <LegalDocument document="privacy" />;
}
