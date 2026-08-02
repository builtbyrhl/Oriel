type Props = {
  title: string;
};

export default function SectionHeading({ title }: Props) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-2xl font-light tracking-wide text-white">
        {title}
      </h2>

      <button className="text-sm text-white/60 transition hover:text-white">
        View All
      </button>
    </div>
  );
}
