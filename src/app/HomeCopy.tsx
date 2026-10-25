type HomeCopyProps = {
  kind: "body" | "hero-tagline" | "work-tagline" | "studio-quote";
  text: string;
};

// 文案只接受純文字；句號分行與用途樣式由這裡統一產生。
export default function HomeCopy({ kind, text }: HomeCopyProps) {
  const className = kind === "body"
    ? "home-copy"
    : `home-copy home-copy--display ${kind}`;
  const sentences = (text.match(/[^。]*。|[^。]+$/g) ?? []).filter(sentence => sentence.trim());

  return (
    <p className={className}>
      {sentences.map((sentence, index) => (
        <span className="home-copy-sentence" key={index}>{sentence}</span>
      ))}
    </p>
  );
}
