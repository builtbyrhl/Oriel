export default function ShimmerCard() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-white/[0.02]">
      <div
        className="aspect-[2/3] w-full"
        style={{
          background:
            "linear-gradient(110deg, rgba(255,255,255,0.02) 8%, rgba(255,255,255,0.07) 18%, rgba(255,255,255,0.02) 33%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.6s linear infinite",
        }}
      />
      <div className="space-y-2 p-4">
        <div className="h-3 w-3/4 rounded-full bg-white/[0.05]" />
        <div className="h-2 w-1/2 rounded-full bg-white/[0.04]" />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
