export function PillToggle({
  label,
  count,
  selected,
  onToggle,
}: {
  label: string;
  count: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
        selected
          ? "bg-teal-600 border-teal-600 text-white"
          : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
      }`}
    >
      {label}
      <span
        className={`text-xs rounded-full px-1.5 py-0.5 ${
          selected
            ? "bg-teal-500 text-teal-100"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) {
    if (next.size > 1) next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}
