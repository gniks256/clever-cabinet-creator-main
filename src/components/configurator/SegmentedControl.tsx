import { motion } from "framer-motion";

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);

  return (
    <div className="relative flex rounded-lg bg-muted p-0.5">
      {/* Sliding indicator */}
      <motion.div
        className="absolute top-0.5 bottom-0.5 rounded-md bg-card shadow-sm"
        style={{ width: `${100 / options.length}%` }}
        animate={{ left: `${(activeIndex / options.length) * 100}%` }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative z-10 flex-1 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
