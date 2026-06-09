import React, { useState, useMemo } from "react";
import {
  Minus,
  Plus,
  Trash2,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  MousePointerClick,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import type {
  CabinetConfig,
  CellFill,
  SelectedCell,
  WoodTexture,
  DoorType,
  DoorInstallation,
} from "./types";
import {
  TEXTURE_LABELS,
  calculatePrice,
  MIN_SECTION_WIDTH,
  MIN_ZONE_HEIGHT,
  createDefaultColumns,
  getInnerHeight,
  getInnerWidth,
} from "./types";
import type { AssemblyType, BackPanelType, DrawerExtensionType, HingeType } from "./types";

interface Props {
  config: CabinetConfig;
  selected: SelectedCell | null;
  multiSelected: SelectedCell[];
  onChange: (config: CabinetConfig) => void;
  onCellFillChange: (fill: CellFill) => void;
  onDeleteDivider: () => void;
  onDeleteColumn: () => void;
  onSplitZone: (colId: string, zoneId: string) => void;
  onSetRowSegments: (colId: string, count: number) => void;
  onSetAllRowSegments: (count: number) => void;
  onDoorChange: (type: DoorType | null, installation: DoorInstallation) => void;
  onDrawerExtensionChange: (colId: string, zoneId: string, ext: DrawerExtensionType) => void;
  onShelfPositionChange: (colId: string, zoneId: string, pos: number) => void;
  onSectionsCountChange: (colId: string, zoneId: string, count: number) => void;
  onShelvesCountChange: (colId: string, zoneId: string, count: number) => void;
  onHingeChange: (colId: string, doorId: string, hinge: HingeType) => void;
  onDoorToggleOpen: (colId: string, doorId: string) => void;
  onToggleLockColumn: (colId: string) => void;
  onToggleLockZone: (colId: string, zoneId: string) => void;
  onClearSelection: () => void;
  setHoveringDelete: (h: boolean) => void;
}

const TEXTURES: WoodTexture[] = ["oak", "walnut", "white", "black"];
const MATERIAL_SWATCHES: Record<WoodTexture, string> = {
  oak: "linear-gradient(135deg, hsl(34 45% 70%), hsl(28 38% 50%))",
  walnut: "linear-gradient(135deg, hsl(22 32% 32%), hsl(18 28% 18%))",
  white: "linear-gradient(135deg, hsl(210 20% 95%), hsl(215 15% 78%))",
  black: "linear-gradient(135deg, hsl(220 14% 16%), hsl(220 18% 8%))",
};

export function ConfigSidebar({
  config,
  selected,
  multiSelected,
  onChange,
  onCellFillChange,
  onDeleteDivider,
  onDeleteColumn,
  onSplitZone,
  onSetRowSegments,
  onSetAllRowSegments,
  onDoorChange,
  onDrawerExtensionChange,
  onShelfPositionChange,
  onSectionsCountChange,
  onShelvesCountChange,
  onHingeChange,
  onDoorToggleOpen,
  onToggleLockColumn,
  onToggleLockZone,
  onClearSelection,
  setHoveringDelete,
}: Props) {
  const gT = config.globalThickness;
  const col = selected ? config.columns.find((c) => c.id === selected.colId) : null;
  const selectedZoneIdx =
    col && selected ? col.zones.findIndex((z) => z.id === selected.zoneId) : -1;
  const selectedZone = col && selectedZoneIdx !== -1 ? col.zones[selectedZoneIdx] : null;
  const selectedSection =
    selectedZone && selected?.sectionIdx !== undefined
      ? selectedZone.sections?.[selected.sectionIdx]
      : undefined;
  const selectedCellFill = selectedSection?.fill ?? selectedZone?.fill ?? null;
  const selectedDrawerExtension = selectedSection?.drawerExtension ?? selectedZone?.drawerExtension;
  const selectedShelfPosition =
    selectedSection?.shelfPosition ?? selectedZone?.shelfPosition ?? 0.5;
  const activeDoor =
    col?.doors?.find((d) => selectedZoneIdx >= d.startZoneIdx && selectedZoneIdx <= d.endZoneIdx) ||
    null;
  const selectedDoor = activeDoor;
  const isMulti = multiSelected.length > 1;
  const hasNarrowSection = config.columns.some((c) => c.width < MIN_SECTION_WIDTH);
  const price = useMemo(() => calculatePrice(config), [config]);

  const warnings = useMemo(() => {
    const list: string[] = [];
    config.columns.forEach((col, cIdx) => {
      col.zones.forEach((zone) => {
        if (zone.fill === "shelf" || zone.fill === "drawer" || zone.fill === "rod") {
          const span = zone.colSpan || 1;
          let actualW = col.width;
          for (let s = 1; s < span; s++) {
            actualW += (config.columns[cIdx + s]?.width || 0) + config.globalThickness;
          }
          if (actualW > 1000) {
            const fillName =
              zone.fill === "shelf" ? "полки" : zone.fill === "drawer" ? "ящика" : "штанги";
            list.push(
              `Ширина ${fillName} превышает 1000 мм (${Math.round(actualW)} мм). Возможно провисание.`,
            );
          }
        }
      });
    });
    return Array.from(new Set(list));
  }, [config]);

  const update = (patch: Partial<CabinetConfig>) => onChange({ ...config, ...patch });

  const handleExactZoneHeight = (val: number) => {
    if (!col || !selectedZone) return;
    const diff = val - selectedZone.height;
    const otherZones = col.zones.filter((z) => z.id !== selectedZone.id);
    const minH = MIN_ZONE_HEIGHT;
    const avail = otherZones.reduce((acc, z) => acc + (z.height - minH), 0);
    if (diff > avail) return;
    let rem = diff;
    const nextZones = col.zones.map((z) => {
      if (z.id === selectedZone.id) return { ...z, height: val, isLocked: true };
      const shr = Math.min(rem, z.height - minH);
      rem -= shr;
      return { ...z, height: z.height - shr };
    });
    update({
      columns: config.columns.map((c) => (c.id === col.id ? { ...c, zones: nextZones } : c)),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="mb-2">
        <div className="label-eyebrow mb-1">Конфигуратор</div>
        <div className="font-display text-[22px] font-semibold tracking-tight">Параметры</div>
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5 mb-1">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex gap-2 items-start text-amber-800 text-[11px] leading-tight font-medium"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ ГАБАРИТЫ И ПРЕСЕТЫ ═══ */}
      <CollapsibleGroup title="Габариты и пресеты" defaultOpen>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Пустой", cols: 1, rows: 1 },
            { label: "Сетка 2×2", cols: 2, rows: 2 },
            { label: "Сетка 3×4", cols: 3, rows: 4 },
          ].map(({ label, cols, rows }) => {
            const isActive =
              config.columns.length === cols && config.columns[0]?.zones.length === rows;
            return (
              <button
                key={label}
                onClick={() => {
                  const newCols = createDefaultColumns(
                    cols,
                    config.width,
                    config.height,
                    gT,
                    gT,
                    gT,
                    gT,
                    gT,
                  );
                  if (rows > 1) {
                    const h = (getInnerHeight(config) - (rows - 1) * gT) / rows;
                    newCols.forEach((c) => {
                      c.zones = Array(rows)
                        .fill(0)
                        .map(() => ({
                          id: `z-${Math.random().toString(36).slice(2)}`,
                          height: h,
                          fill: "open" as const,
                        }));
                    });
                  }
                  onClearSelection();
                  update({ columns: newCols });
                }}
                className={`px-3 py-2.5 rounded-[12px] text-xs font-mono font-medium transition-all ${
                  isActive
                    ? "bg-[#EAE6DF] text-ink shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]"
                    : "bg-[#F3F1EC] text-ink-soft hover:bg-[#EAE6DF] hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="space-y-3 pt-1.5">
          <DimSlider
            label="Высота"
            value={config.height}
            min={400}
            max={2700}
            step={1}
            unit="мм"
            onChange={(v) => update({ height: v })}
          />
          <DimSlider
            label="Ширина"
            value={config.width}
            min={300}
            max={2400}
            step={1}
            unit="мм"
            onChange={(v) => update({ width: v })}
          />
          <DimSlider
            label="Глубина"
            value={config.depth}
            min={200}
            max={800}
            step={1}
            unit="мм"
            onChange={(v) => update({ depth: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Counter
            label="По ширине"
            value={config.columns.length}
            min={1}
            max={5}
            onChange={(v) => {
              const currentCols = config.columns;
              let newCols = [...currentCols];
              if (v > currentCols.length) {
                const templateZones = currentCols[0]?.zones || [];
                for (let i = currentCols.length; i < v; i++) {
                  newCols.push({
                    id: `col-${Math.random().toString(36).slice(2)}`,
                    width: 100,
                    isLocked: false,
                    zones: templateZones.map((z) => ({
                      id: `zone-${Math.random().toString(36).substr(2, 9)}`,
                      height: z.height,
                      fill: "open" as const,
                    })),
                  });
                }
              } else if (v < currentCols.length) {
                newCols = currentCols.slice(0, v);
              }
              const innerW = getInnerWidth(config);
              const colW = (innerW - (v - 1) * gT) / v;
              newCols = newCols.map((c) => ({ ...c, width: colW, isLocked: false }));
              onChange({ ...config, columns: newCols });
              onClearSelection();
            }}
            warning={!selected && hasNarrowSection ? `Мин. ${MIN_SECTION_WIDTH}мм` : undefined}
          />
          <Counter
            label="По высоте"
            value={config.columns[0]?.zones.length ?? 1}
            min={1}
            max={10}
            onChange={(v) => onSetAllRowSegments(v)}
          />
        </div>
      </CollapsibleGroup>

      {/* ═══ МАТЕРИАЛ И КОНСТРУКЦИЯ ═══ */}
      <CollapsibleGroup title="Материал и конструкция">
        <div className="grid grid-cols-4 gap-2">
          {TEXTURES.map((t) => (
            <button
              key={t}
              onClick={() => update({ texture: t })}
              className="group flex flex-col items-center gap-2"
            >
              <div
                className={`relative w-full aspect-[5/4] rounded-[14px] border-2 transition-all duration-300 overflow-hidden ${
                  config.texture === t
                    ? "border-accent shadow-accent scale-[1.04]"
                    : "border-hairline-strong hover:border-ink-soft"
                }`}
                style={{ background: MATERIAL_SWATCHES[t] }}
              >
                {config.texture === t && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-[9px] font-bold">
                    ✓
                  </div>
                )}
              </div>
              <span
                className={`text-[11px] font-medium transition-colors ${config.texture === t ? "text-ink" : "text-ink-soft"}`}
              >
                {TEXTURE_LABELS[t]}
              </span>
            </button>
          ))}
        </div>
        <Section eyebrow="Толщина ЛДСП">
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[#F3F1EC] rounded-xl px-4 py-2 cursor-default">
              <span className="text-sm text-ink-soft font-medium">Толщина ЛДСП</span>
              <div className="flex items-baseline gap-1">
                <span className="num-display text-sm font-bold text-ink">{gT}</span>
                <span className="text-[10px] uppercase font-mono text-ink-soft">мм</span>
              </div>
            </div>
            <Segmented<number>
              options={[
                { value: 16, label: "16" },
                { value: 18, label: "18" },
                { value: 22, label: "22" },
                { value: 25, label: "25" },
              ]}
              value={gT}
              onChange={(v) => update({ globalThickness: v })}
            />
          </div>
        </Section>
        <Section eyebrow="Тип сборки">
          <Segmented<AssemblyType>
            options={[
              { value: "top-bottom-overlap", label: "Горизонты накладные" },
              { value: "sides-overlap", label: "Боковины накладные" },
            ]}
            value={config.assemblyType}
            onChange={(v) => update({ assemblyType: v })}
          />
        </Section>
      </CollapsibleGroup>

      {/* ═══ КОРПУС ═══ */}
      <CollapsibleGroup title="Корпус">
        <Section eyebrow="Внешние панели">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Toggle
              label="Крыша"
              active={config.outerPanels.top.isVisible}
              onChange={(v) =>
                update({
                  outerPanels: {
                    ...config.outerPanels,
                    top: { ...config.outerPanels.top, isVisible: v },
                  },
                })
              }
            />
            <Toggle
              label="Боковина Л"
              active={config.outerPanels.left.isVisible}
              onChange={(v) =>
                update({
                  outerPanels: {
                    ...config.outerPanels,
                    left: { ...config.outerPanels.left, isVisible: v },
                  },
                })
              }
            />
            <Toggle
              label="Дно"
              active={config.outerPanels.bottom.isVisible}
              onChange={(v) =>
                update({
                  outerPanels: {
                    ...config.outerPanels,
                    bottom: { ...config.outerPanels.bottom, isVisible: v },
                  },
                })
              }
            />
            <Toggle
              label="Боковина П"
              active={config.outerPanels.right.isVisible}
              onChange={(v) =>
                update({
                  outerPanels: {
                    ...config.outerPanels,
                    right: { ...config.outerPanels.right, isVisible: v },
                  },
                })
              }
            />
          </div>
        </Section>
        <Section eyebrow="Опора / Цоколь">
          <div className="space-y-3">
            <Segmented<import("./types").BaseType>
              options={[
                { value: "none", label: "Нет" },
                { value: "plinth", label: "Цоколь" },
                { value: "legs-round", label: "Круглые" },
                { value: "legs-square", label: "Квадр." },
              ]}
              value={config.base?.type ?? "none"}
              onChange={(v) => update({ base: { ...config.base, type: v } })}
            />
            {config.base?.type !== "none" && (
              <DimSlider
                label="Высота опоры"
                value={config.base?.height ?? 100}
                min={50}
                max={200}
                step={10}
                unit="мм"
                onChange={(v) => update({ base: { ...config.base, height: v } })}
              />
            )}
            {(config.base?.type === "legs-round" || config.base?.type === "legs-square") && (
              <Counter
                label="Ножек по ширине (спереди и сзади)"
                value={config.base.legsCountX ?? Math.ceil(config.width / 600) + 1}
                min={2}
                max={10}
                onChange={(v) => update({ base: { ...config.base, legsCountX: v } })}
              />
            )}
          </div>
        </Section>
        <Section eyebrow="Задняя стенка">
          <Segmented<BackPanelType>
            options={[
              { value: "none", label: "Нет" },
              { value: "hdf-overlap", label: "ХДФ накл." },
              { value: "hdf-groove", label: "ХДФ паз" },
              { value: "ldsp-inner", label: "ЛДСП" },
            ]}
            value={config.backPanel.type}
            onChange={(v) => update({ backPanel: { ...config.backPanel, type: v } })}
          />
        </Section>
      </CollapsibleGroup>

      {/* ═══ SELECTED CELL ═══ */}
      {!selected ? (
        <div className="py-8 text-center rounded-xl border border-dashed border-hairline">
          <MousePointerClick size={18} className="mx-auto text-ink-mute mb-2" />
          <p className="text-[11px] text-ink-mute uppercase tracking-widest font-mono">
            Выберите ячейку
          </p>
        </div>
      ) : (
        <CollapsibleGroup title="Выбранная ячейка" defaultOpen>
          <Section eyebrow="Наполнение">
            <Segmented<CellFill>
              options={[
                { value: "open", label: "Пусто" },
                { value: "shelf", label: "Полка" },
                { value: "drawer", label: "Ящик" },
                { value: "rod", label: "Штанга" },
              ]}
              value={selectedCellFill as CellFill}
              onChange={onCellFillChange}
            />
            {selected.sectionIdx === undefined && (
              <div className="pt-4 grid grid-cols-2 gap-3">
                <Counter
                  label="Секций по ширине"
                  value={selectedZone?.sectionsCount ?? 1}
                  min={1}
                  max={6}
                  onChange={(v) => onSectionsCountChange(selected.colId, selected.zoneId, v)}
                />
                <Counter
                  label="Секций по высоте"
                  value={selectedZone?.shelvesCount ?? 1}
                  min={1}
                  max={6}
                  onChange={(v) => onShelvesCountChange(selected.colId, selected.zoneId, v)}
                />
              </div>
            )}
            {selectedCellFill === "drawer" && (
              <div className="pt-2">
                <p className="text-[10px] text-ink-mute font-mono mb-2 uppercase tracking-wider">
                  Направляющие
                </p>
                <Segmented<DrawerExtensionType>
                  options={[
                    { value: "ball-bearing", label: "Шарик." },
                    { value: "roller", label: "Ролик." },
                    { value: "tandembox", label: "TANDEM" },
                    { value: "hidden-sync", label: "Скрыт." },
                  ]}
                  value={selectedDrawerExtension ?? "ball-bearing"}
                  onChange={(v) => onDrawerExtensionChange(selected.colId, selected.zoneId, v)}
                />
              </div>
            )}
          </Section>

          {selectedCellFill !== "drawer" && (
            <Section eyebrow="Дверь / Фасад">
              <Segmented<DoorType | "none">
                options={[
                  { value: "none", label: "Нет" },
                  { value: "left", label: "Лев." },
                  { value: "right", label: "Прав." },
                  { value: "double", label: "×2" },
                ]}
                value={selectedDoor?.type ?? "none"}
                onChange={(v) =>
                  onDoorChange(v === "none" ? null : v, selectedDoor?.installation ?? "overlay")
                }
              />
              {selectedDoor && (
                <div className="pt-2">
                  <p className="text-[10px] text-ink-mute font-mono mb-2 uppercase tracking-wider">
                    Тип петель
                  </p>
                  <Segmented<import("./types").HingeType>
                    options={[
                      { value: "standard", label: "Стд" },
                      { value: "soft-close", label: "Soft" },
                      { value: "push-to-open", label: "P-t-O" },
                    ]}
                    value={selectedDoor.hingeType ?? "standard"}
                    onChange={(v) => {
                      if (activeDoor && selected) {
                        onHingeChange(selected.colId, activeDoor.id, v);
                      }
                    }}
                  />
                </div>
              )}
              {selectedDoor && activeDoor && (
                <div className="pt-2">
                  <Toggle
                    label="Дверь открыта"
                    active={activeDoor.isOpen || false}
                    onChange={() => onDoorToggleOpen(selected!.colId, activeDoor.id)}
                  />
                </div>
              )}
              {selectedCellFill === "shelf" && (
                <div className="pt-2">
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-[10px] text-ink-mute font-mono uppercase tracking-wider">
                      Положение полки
                    </p>
                    <span className="text-[10px] font-mono text-ink-mute">
                      {Math.round(selectedShelfPosition * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.01"
                    value={selectedZone?.shelfPosition ?? 0.5}
                    onChange={(e) =>
                      onShelfPositionChange(
                        selected!.colId,
                        selected!.zoneId,
                        parseFloat(e.target.value),
                      )
                    }
                    className="w-full slider-accent"
                  />
                </div>
              )}
            </Section>
          )}

          <div className="space-y-3 pt-2 border-t border-hairline">
            {!isMulti && (
              <>
                <NumInput
                  label="Высота ниши"
                  value={selectedZone!.height}
                  onChange={handleExactZoneHeight}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => col && onToggleLockZone(selected.colId, selected.zoneId)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-mono font-bold border transition-all ${
                      selectedZone?.isLocked
                        ? "bg-accent/15 border-accent/40 text-accent"
                        : "glass text-ink-soft hover:border-hairline-strong"
                    }`}
                  >
                    {selectedZone?.isLocked ? <LockIcon size={12} /> : <UnlockIcon size={12} />}
                    {selectedZone?.isLocked ? "Зафикс." : "Фиксир."}
                  </button>
                  <button
                    onClick={() => onSplitZone(selected.colId, selected.zoneId)}
                    className="flex items-center justify-center p-2.5 glass hover:bg-accent/5 text-ink-soft rounded-xl border border-hairline transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </>
            )}
            {isMulti && (
              <button
                onClick={onDeleteDivider}
                className="w-full py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-[10px] font-mono font-bold tracking-widest hover:bg-destructive/20 transition-all uppercase"
              >
                Объединить
              </button>
            )}
            <button
              onClick={onDeleteColumn}
              className="w-full py-2.5 text-[10px] font-mono uppercase tracking-[0.15em] text-ink-mute hover:text-destructive transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={12} />
              Удалить секцию
            </button>
          </div>
        </CollapsibleGroup>
      )}

      {/* ═══ PRICE ═══ */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 border border-accent/30"
        style={{ background: "linear-gradient(135deg, hsl(35 80% 55%), hsl(25 65% 38%))" }}
      >
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, hsl(40 85% 65% / 0.5), transparent 70%)" }}
        />
        <div className="relative">
          <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-white/70 mb-2">
            Итоговая оценка
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[40px] font-semibold tracking-[-0.04em] text-white leading-none">
              ${price.toFixed(2)}
            </span>
            <span className="font-serif-italic text-base text-white/70">usd</span>
          </div>
          <div className="text-[11px] text-white/60 mt-2 font-mono">Без сборки и доставки</div>
          <button className="mt-4 w-full py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white text-sm font-semibold hover:bg-white/30 transition-colors flex items-center justify-center gap-2 group border border-white/20">
            Оформить заказ
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="label-eyebrow uppercase tracking-[0.15em] text-[10px] text-ink-soft">
        {eyebrow}
      </div>
      {children}
    </div>
  );
}

function CollapsibleGroup({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-hairline bg-surface overflow-hidden transition-shadow hover:shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer group transition-colors hover:bg-black/[0.02]"
      >
        <span className="text-[13px] font-semibold text-ink tracking-tight">{title}</span>
        <ChevronDown
          size={16}
          className={`text-ink-mute transition-transform duration-300 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
      <div
        className={`collapsible-content ${
          isOpen ? "collapsible-content--open" : "collapsible-content--closed"
        }`}
      >
        <div className="px-4 pb-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function DimSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-ink">{label}</span>
        <div className="flex items-baseline gap-1 bg-surface border border-transparent hover:border-hairline focus-within:border-accent/50 rounded-lg px-2 py-0.5 transition-colors">
          <input
            type="number"
            value={Math.round(value)}
            onChange={(e) => onChange(Number(e.target.value))}
            onBlur={(e) => {
              let val = Number(e.target.value);
              if (val < min) val = min;
              if (val > max) val = max;
              onChange(val);
            }}
            className="w-[52px] bg-transparent text-right num-display text-[15px] font-bold text-ink outline-none tracking-tight"
          />
          <span className="text-[10px] font-mono text-ink-mute uppercase">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full slider-accent"
      />
    </div>
  );
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
  warning,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  warning?: string;
}) {
  return (
    <div>
      <div className="label-eyebrow uppercase tracking-[0.1em] text-[10px] text-ink-soft mb-1.5">
        {label}
      </div>
      <div className="flex items-center justify-between gap-0 bg-[#F3F1EC] rounded-xl overflow-hidden h-8 px-1.5">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-full flex items-center justify-center hover:bg-black/5 transition-colors text-ink-soft rounded-lg"
        >
          <Minus size={13} strokeWidth={2.5} />
        </button>
        <span className="flex-1 flex items-center justify-center text-[13.5px] font-bold num-display">
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-full flex items-center justify-center hover:bg-black/5 transition-colors text-ink-soft rounded-lg"
        >
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </div>
      {warning && <p className="text-[10px] text-destructive mt-1 text-center">{warning}</p>}
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest font-mono text-ink-mute">{label}</p>
      <div className="relative">
        <input
          type="number"
          value={Math.round(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-background border border-hairline rounded-xl px-4 py-2.5 text-sm font-display font-medium focus:border-accent/50 outline-none transition-all num-display"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-ink-mute uppercase tracking-widest">
          мм
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  active,
  onChange,
}: {
  label: string;
  active: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-ink">{label}</span>
      <div className={`toggle-track ${active ? "active" : ""}`} onClick={() => onChange(!active)}>
        <div className="toggle-thumb" />
      </div>
    </label>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex p-1 bg-[#F3F1EC] rounded-xl gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
            value === opt.value
              ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
