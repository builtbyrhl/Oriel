"use client";

type Props = {
  onClick?: () => void;
};

export default function WatchButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-medium text-black transition hover:scale-[1.02] active:scale-[0.98]"
    >
      ▶ Watch
    </button>
  );
}
