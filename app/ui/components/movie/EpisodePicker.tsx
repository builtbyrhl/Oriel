"use client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function EpisodePicker({ open, onClose }: Props) {
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

        <p className="text-sm text-white/50">
          Episode browser coming in Sprint 2.
        </p>

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
