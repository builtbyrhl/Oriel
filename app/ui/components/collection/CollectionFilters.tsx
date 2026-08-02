"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const filters = [
  {
    id: "recent",
    label: "Recent",
  },
  {
    id: "name",
    label: "A–Z",
  },
  {
    id: "rating",
    label: "Rating",
  },
];

export default function CollectionFilters({
  value,
  onChange,
}: Props) {
  return (
    <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-xl">

      {filters.map((filter) => (

        <button
          key={filter.id}
          onClick={() => onChange(filter.id)}
          className={`rounded-full px-5 py-2 text-sm transition ${
            value === filter.id
              ? "bg-white text-black"
              : "text-white/60 hover:text-white"
          }`}
        >
          {filter.label}
        </button>

      ))}

    </div>
  );
}
