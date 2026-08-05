"use client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function EpisodePicker({
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl bg-zinc-950 border border-white/10 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

        <h2 className="text-lg font-medium mb-4">
          Choose Episode
        </h2>

        <div className="space-y-2">

          <button className="w-full rounded-xl border border-white/10 p-4 text-left hover:bg-white/5">
            Season 1
          </button>

          <button className="w-full rounded-xl border border-white/10 p-4 text-left hover:bg-white/5">
            Season 2
          </button>

          <button className="w-full rounded-xl border border-white/10 p-4 text-left hover:bg-white/5">
            Season 3
          </button>

        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-white/10 p-4"
        >
          Close
        </button>
      </div>
    </div>
  );
}
