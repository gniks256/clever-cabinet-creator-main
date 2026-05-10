import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CabinetConfig } from "./types";
import { generateBOM } from "./types";

interface Props {
  config: CabinetConfig;
}

export function BOMPanel({ config }: Props) {
  const [open, setOpen] = useState(false);
  const bom = generateBOM(config);

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        <span>Список деталей ({bom.reduce((s, i) => s + i.quantity, 0)} шт.)</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 max-h-60 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-1.5 font-medium">Деталь</th>
                    <th className="text-right py-1.5 font-medium">Размер, мм</th>
                    <th className="text-right py-1.5 font-medium">Кромка</th>
                    <th className="text-right py-1.5 font-medium">Кол-во</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.map((item, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5 text-foreground font-medium">{item.name}</td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                        {item.thickness > 0
                          ? `${item.length}×${item.width}×${item.thickness}`
                          : `${item.length}×ø30`}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                        {item.edgeBand > 0 ? `${item.edgeBand} мм` : "—"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums font-semibold text-foreground">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
