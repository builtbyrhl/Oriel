"use client";

type Props = {
  src: string;
  title?: string;
};

export default function VideoPlayer({
  src,
  title = "Oriel Player",
}: Props) {
  return (
    <div
      className="absolute inset-0 bg-black animate-[fadeIn_.45s_ease]"
      style={{
        animationFillMode: "both",
      }}
    >
      <iframe
        src={src}
        title={title}
        className="h-full w-full border-0"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
