import React from "react";
import { motion } from "framer-motion";
import type { CabinetConfig } from "./types";
import { generateBOM } from "./types";

interface Props {
  config: CabinetConfig;
}

export function BOMTable({ config }: Props) {
  const bom = React.useMemo(() => generateBOM(config), [config]);
  const totalParts = React.useMemo(() => bom.reduce((sum, item) => sum + item.quantity, 0), [bom]);

  return (
    <div className="bg-transparent overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 flex items-start justify-between border-b border-hairline bg-surface/50">
        <div>
          <div className="label-eyebrow mb-1">Bill of Materials</div>
          <div className="font-display text-[24px] font-semibold tracking-[-0.02em]">
            Деталировка
          </div>
          <div className="text-[11px] text-ink-mute mt-1 font-medium">
            ЛДСП {config.globalThickness} мм · {totalParts} элементов
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-[11px] font-semibold rounded-full bg-surface-elevated text-ink-soft border border-hairline hover:text-ink transition-colors">
            Кромка ПВХ
          </button>
          <button className="px-3 py-1.5 text-[11px] font-semibold rounded-full bg-surface-elevated text-ink border border-hairline hover:bg-black/5 transition-colors">
            Экспорт CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[500px] overflow-y-auto relative scrollbar-hide">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-surface/90 backdrop-blur-md">
            <tr className="text-[9px] uppercase tracking-[0.15em] text-ink-mute font-mono">
              <th className="text-left font-semibold px-6 py-3 border-b border-hairline">
                Наименование
              </th>
              <th className="text-center font-semibold px-4 py-3 border-b border-hairline">
                Длина
              </th>
              <th className="text-center font-semibold px-4 py-3 border-b border-hairline">
                Ширина
              </th>
              <th className="text-center font-semibold px-4 py-3 border-b border-hairline">
                Толщ.
              </th>
              <th className="text-center font-semibold px-4 py-3 border-b border-hairline">
                Кромка
              </th>
              <th className="text-right font-semibold px-6 py-3 border-b border-hairline">
                Кол-во
              </th>
            </tr>
          </thead>
          <tbody className="">
            {Object.entries(
              bom.reduce(
                (acc, item) => {
                  const g = item.group;
                  if (!acc[g]) acc[g] = [];
                  acc[g].push(item);
                  return acc;
                },
                {} as Record<string, typeof bom>,
              ),
            ).map(([group, items], gIdx) => (
              <React.Fragment key={group}>
                {group !== "Основное" && (
                  <tr className="sticky top-[37px] z-5">
                    <td
                      colSpan={6}
                      className="px-6 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-accent border-b border-hairline bg-surface/80 backdrop-blur-md"
                    >
                      {group}
                    </td>
                  </tr>
                )}
                {items.map((item, index) => (
                  <motion.tr
                    key={`${item.name}-${index}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: gIdx * 0.05 + index * 0.01 }}
                    className="group border-t border-hairline hover:bg-black/[0.02] transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-0.5 h-6 rounded-full bg-gradient-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div>
                          <div className="text-[13px] font-medium text-ink">{item.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center num-display text-[13px] text-ink/80 font-medium">
                      {item.length}
                    </td>
                    <td className="px-4 py-3 text-center num-display text-[13px] text-ink/80 font-medium">
                      {item.width}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="num-display text-[13px] text-accent font-semibold">
                        {item.thickness}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="pill bg-surface-elevated font-mono text-[9px] text-ink-soft border border-hairline">
                        {item.edgeBand === 0 ? "—" : item.edgeBand === 2 ? "2.0 мм" : "0.4 мм"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent text-white text-[11px] font-bold num-display shadow-sm shadow-accent">
                        {item.quantity}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
