"use client";

type Props = {
  onClick: () => void;
};

export default function TrailerButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm text-white backdrop-blur-xl transition hover:bg-white/20"
    >
      Trailer
    </button>
  );
}
