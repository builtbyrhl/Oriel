"use client";

interface VideoPlayerProps {
  src: string;
  title?: string;
}

export default function VideoPlayer({ src, title }: VideoPlayerProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <iframe
        src={src}
        title={title ?? "Player"}
        className="h-full w-full border-0"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="origin"
      />
    </div>
  );
}
