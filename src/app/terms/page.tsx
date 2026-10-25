import LegalDocument from "../LegalDocument";
import { pageMetadata } from "../site-metadata";

export const metadata = pageMetadata({
  path: "/terms/",
  title: "願行 — 服務條款",
  description: "願行服務條款（Terms of Service）",
});

export default function TermsPage() {
  return <LegalDocument document="terms" />;
}
