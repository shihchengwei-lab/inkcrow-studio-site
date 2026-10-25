import LegalDocument from "../LegalDocument";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "願行 — 服務條款",
  description: "願行服務條款（Terms of Service）",
};

export default function TermsPage() {
  return <LegalDocument document="terms" />;
}
