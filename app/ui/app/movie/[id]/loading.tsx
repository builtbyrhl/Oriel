export default function LoadingMovie() {
  return (
    <main className="min-h-screen bg-[#050505] animate-pulse">

      {/* Hero */}
      <div className="relative h-[72vh] overflow-hidden">

        <div className="absolute inset-0 bg-neutral-800" />

        <div className="relative mx-auto flex h-full max-w-7xl items-end justify-between px-6 pb-16">

          <div className="max-w-3xl">

            <div className="mb-8 h-10 w-28 rounded-full bg-white/10" />

            <div className="h-16 w-[420px] rounded-xl bg-white/10" />

            <div className="mt-8 h-5 w-[520px] rounded bg-white/10" />
            <div className="mt-3 h-5 w-[470px] rounded bg-white/10" />
            <div className="mt-3 h-5 w-[390px] rounded bg-white/10" />

            <div className="mt-8 flex gap-3">
              <div className="h-10 w-20 rounded-full bg-white/10" />
              <div className="h-10 w-24 rounded-full bg-white/10" />
              <div className="h-10 w-28 rounded-full bg-white/10" />
            </div>

          </div>

          <div className="hidden h-14 w-14 rounded-full bg-white/10 md:block" />

        </div>

      </div>

      {/* Content */}

      <section className="mx-auto max-w-7xl space-y-14 px-6 py-12">

        <div>
          <div className="mb-4 h-4 w-28 rounded bg-white/10" />
          <div className="h-5 w-full max-w-3xl rounded bg-white/10" />
          <div className="mt-3 h-5 w-5/6 rounded bg-white/10" />
          <div className="mt-3 h-5 w-4/6 rounded bg-white/10" />
        </div>

        <div className="flex gap-6 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-36 shrink-0"
            >
              <div className="aspect-[2/3] rounded-[32px] bg-white/10" />
              <div className="mt-3 h-4 rounded bg-white/10" />
              <div className="mt-2 h-3 w-2/3 rounded bg-white/10" />
            </div>
          ))}
        </div>

      </section>

    </main>
  );
}
