export default function AmbientBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 0%, #161b2c 0%, #0c0f1a 35%, #050608 70%, #000000 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.8) 0.6px, transparent 0.6px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div
        className="absolute -top-32 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(212,175,55,0.06) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 h-[500px] w-[700px] translate-x-1/3 translate-y-1/3 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(80,120,200,0.05) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
    </div>
  );
}
