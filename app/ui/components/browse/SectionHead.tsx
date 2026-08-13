type Props = {
  eyebrow: string;
  title: string;
  sub?: string;
};

/**
 * Editorial section header used across the discovery page: tiny tracked
 * eyebrow with a rule, a serif display title, and a quiet sub-note on the
 * right. Keeps every section reading as part of one premium system.
 */
export default function SectionHead({ eyebrow, title, sub }: Props) {
  return (
    <div className="mb-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.3em] text-[#b5aa9a]">
            {eyebrow}
            <span className="h-px w-8 bg-[#817767]" />
          </p>
          <h2 className="mt-3 font-serif text-3xl font-normal leading-tight tracking-tight text-[#f3f0e9] md:text-5xl">
            {title}
          </h2>
        </div>

        {sub && (
          <p className="max-w-md text-xs leading-relaxed text-white/40 md:pb-1 md:text-right">
            {sub}
          </p>
        )}
      </div>

      <div className="mt-8 h-px bg-white/10" />
    </div>
  );
}
