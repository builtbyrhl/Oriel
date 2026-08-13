type Props = {
  eyebrow: string;
  title: string;
  description: string;
};

/**
 * Shared reserved-section shell for the discovery page. Dashed boundary marks
 * the space as intentionally unbuilt — future curated visual sections and the
 * trading-style recommendation stream will land here.
 */
export default function ReservedSection({
  eyebrow,
  title,
  description,
}: Props) {
  return (
    <section className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/30">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-extralight tracking-tight text-white/70">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-light text-white/35">
        {description}
      </p>
    </section>
  );
}
