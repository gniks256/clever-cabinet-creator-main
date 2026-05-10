import type { CellFill } from "./types";

interface Props {
  x: number;
  y: number;
  currentFill: CellFill;
  onSelect: (fill: CellFill) => void;
  onClose: () => void;
}

const OPTIONS: { value: CellFill; label: string; icon: string }[] = [
  { value: "shelf", label: "Полка", icon: "━" },
  { value: "drawer", label: "Ящик", icon: "☐" },
  { value: "rod", label: "Штанга", icon: "⊖" },
  { value: "open", label: "Очистить", icon: "✕" },
];

export function CellPopover({ x, y, currentFill, onSelect, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <rect
        x={0}
        y={0}
        width="100%"
        height="100%"
        fill="transparent"
        onClick={onClose}
        style={{ cursor: "default" }}
      />
      {/* Menu */}
      <foreignObject x={x} y={y} width={140} height={140}>
        <div className="bg-popover border border-border rounded-lg shadow-lg p-1 flex flex-col gap-0.5">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onSelect(opt.value);
                onClose();
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                currentFill === opt.value
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="w-4 text-center text-[11px]">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </foreignObject>
    </>
  );
}
