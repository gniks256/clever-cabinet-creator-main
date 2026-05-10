export type CellFill = "open" | "shelf" | "drawer" | "rod";

export type WoodTexture = "oak" | "walnut" | "white" | "black";

export type DoorType = "left" | "right" | "double";
export type DoorInstallation = "overlay" | "inset";

export type AssemblyType = "sides-overlap" | "top-bottom-overlap";
export type BackPanelType = "none" | "hdf-overlap" | "hdf-groove" | "ldsp-inner";
export type DrawerExtensionType = "roller" | "ball-bearing" | "tandembox" | "hidden-sync";
export type HingeType = "standard" | "soft-close" | "push-to-open";
export type BaseType = "none" | "plinth" | "legs-round" | "legs-square";

export interface PanelSettings {
  isVisible: boolean;
  thickness?: number; // mm
  frontOverhang?: number; // mm
  sideOverhang?: number; // mm
}

export interface ZoneSection {
  id: string;
  fill: CellFill | "hidden";
  drawerExtension?: DrawerExtensionType;
  shelfPosition?: number;
}

export interface Zone {
  id: string;
  height: number; // mm
  fill: CellFill | "hidden";
  colSpan?: number; // 1 by default
  isLocked?: boolean;
  drawerExtension?: DrawerExtensionType; 
  shelfPosition?: number; // 0.1 to 0.9, default 0.5
  sectionsCount?: number; // 1 by default
  sections?: ZoneSection[];
  shelvesCount?: number; // 1 by default (horizontal sections)
  door?: {
    type: DoorType;
    installation: DoorInstallation;
    hingeType?: HingeType;
    isOpen?: boolean;
  };
}

export interface DoorGroup {
  id: string;
  startZoneIdx: number;
  endZoneIdx: number;
  type: DoorType;
  installation: DoorInstallation;
  hingeType?: HingeType;
  isOpen?: boolean;
}

export interface Column {
  id: string;
  width: number; // mm
  zones: Zone[];
  isLocked?: boolean;
  doors?: DoorGroup[];
}

export interface CabinetConfig {
  height: number; // mm
  width: number; // mm
  depth: number; // mm
  columns: Column[];
  texture: WoodTexture;
  globalThickness: number; // default 16
  assemblyType: AssemblyType;
  outerPanels: {
    top: PanelSettings;
    bottom: PanelSettings;
    left: PanelSettings;
    right: PanelSettings;
  };
  backPanel: {
    type: BackPanelType;
    grooveInset: number; // mm
  };
  base: {
    type: BaseType;
    height: number; // mm
    legsCountX?: number; // min 2
  };
}

export interface SelectedCell {
  colId: string;
  zoneId: string;
  sectionIdx?: number;
}

export const EDGE_BAND_OUTER = 2; // mm
export const EDGE_BAND_INNER = 0.4; // mm
export const DRAWER_GUIDE_GAP = 26; // mm (13mm each side)
export const GRID_SNAP = 32; // mm

export const TEXTURE_COLORS: Record<WoodTexture, string> = {
  oak: "var(--texture-oak)",
  walnut: "var(--texture-walnut)",
  white: "var(--texture-white)",
  black: "var(--texture-black)",
};

export const TEXTURE_LABELS: Record<WoodTexture, string> = {
  oak: "Дуб",
  walnut: "Орех",
  white: "Белый",
  black: "Чёрный",
};

export function getTopThickness(config: CabinetConfig) {
  return config.outerPanels.top.isVisible
    ? config.outerPanels.top.thickness || config.globalThickness
    : 0;
}
export function getBottomThickness(config: CabinetConfig) {
  return config.outerPanels.bottom.isVisible
    ? config.outerPanels.bottom.thickness || config.globalThickness
    : 0;
}
export function getLeftThickness(config: CabinetConfig) {
  return config.outerPanels.left.isVisible
    ? config.outerPanels.left.thickness || config.globalThickness
    : 0;
}
export function getRightThickness(config: CabinetConfig) {
  return config.outerPanels.right.isVisible
    ? config.outerPanels.right.thickness || config.globalThickness
    : 0;
}

export function getInnerWidth(config: CabinetConfig): number {
  return config.width - getLeftThickness(config) - getRightThickness(config);
}

export function getInnerHeight(config: CabinetConfig): number {
  const baseH = config.base?.type !== "none" ? config.base?.height || 0 : 0;
  return config.height - getTopThickness(config) - getBottomThickness(config) - baseH;
}

export function getColumnWidths(config: CabinetConfig): number[] {
  return config.columns.map((c) => c.width);
}

export function createDefaultColumns(
  count: number,
  totalWidth: number,
  totalHeight: number,
  leftT: number,
  rightT: number,
  topT: number,
  bottomT: number,
  defaultT: number,
): Column[] {
  const innerW = totalWidth - leftT - rightT;
  const innerH = totalHeight - topT - bottomT;
  const colW = (innerW - (count - 1) * defaultT) / count;

  return Array.from({ length: count }, (_, i) => ({
    id: `col-${Math.random().toString(36).substr(2, 9)}`,
    width: colW,
    zones: [
      {
        id: `zone-${Math.random().toString(36).substr(2, 9)}`,
        height: innerH,
        fill: "open",
      },
    ],
  }));
}

/** Snap a value to nearest multiple of GRID_SNAP */
export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SNAP) * GRID_SNAP;
}

export const MIN_SECTION_WIDTH = 250; // mm
export const MIN_ZONE_HEIGHT = 50; // mm

export interface BOMItem {
  group: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  edgeBand: number; // mm
  quantity: number;
}

/** Generate Bill of Materials */
export function generateBOM(config: CabinetConfig): BOMItem[] {
  const items: BOMItem[] = [];
  const innerH = getInnerHeight(config);
  const innerW = getInnerWidth(config);

  const topT = getTopThickness(config);
  const bottomT = getBottomThickness(config);
  const leftT = getLeftThickness(config);
  const rightT = getRightThickness(config);
  const gT = config.globalThickness;

  const isSidesOverlap = config.assemblyType === "sides-overlap";

  const GROUP_CABINET = "Корпус";
  const GROUP_SHELVES = "Полки";
  const GROUP_HARDWARE = "Наполнение";
  const GROUP_FACADES = "Фасады";

  // 1. Outer Panels
  if (config.outerPanels.top.isVisible) {
    const oFront = config.outerPanels.top.frontOverhang || 0;
    const oSide = config.outerPanels.top.sideOverhang || 0;
    let l = isSidesOverlap ? config.width - leftT - rightT : config.width;
    l += oSide * 2;
    items.push({
      group: GROUP_CABINET,
      name: "Крыша (Верхний горизонт)",
      length: l,
      width: config.depth + oFront,
      thickness: topT,
      edgeBand: EDGE_BAND_OUTER,
      quantity: 1,
    });
  }

  if (config.outerPanels.bottom.isVisible) {
    const l = isSidesOverlap ? config.width - leftT - rightT : config.width;
    items.push({
      group: GROUP_CABINET,
      name: "Дно (Нижний горизонт)",
      length: l,
      width: config.depth,
      thickness: bottomT,
      edgeBand: EDGE_BAND_OUTER,
      quantity: 1,
    });
  }

  if (config.outerPanels.left.isVisible) {
    const h = isSidesOverlap ? config.height : config.height - topT - bottomT;
    items.push({
      group: GROUP_CABINET,
      name: "Боковина левая",
      length: h,
      width: config.depth,
      thickness: leftT,
      edgeBand: EDGE_BAND_OUTER,
      quantity: 1,
    });
  }

  if (config.outerPanels.right.isVisible) {
    const h = isSidesOverlap ? config.height : config.height - topT - bottomT;
    items.push({
      group: GROUP_CABINET,
      name: "Боковина правая",
      length: h,
      width: config.depth,
      thickness: rightT,
      edgeBand: EDGE_BAND_OUTER,
      quantity: 1,
    });
  }

  // Back panel
  if (config.backPanel.type !== "none") {
    if (config.backPanel.type === "hdf-overlap") {
      items.push({
        group: GROUP_CABINET,
        name: "Задняя стенка (ХДФ накладная)",
        length: config.height - (config.base?.type !== "none" ? config.base.height : 0),
        width: config.width,
        thickness: 3,
        edgeBand: 0,
        quantity: 1,
      });
    } else if (config.backPanel.type === "hdf-groove") {
      items.push({
        group: GROUP_CABINET,
        name: "Задняя стенка (ХДФ в паз)",
        length: config.height - (config.base?.type !== "none" ? config.base.height : 0) - 10,
        width: config.width - 10,
        thickness: 3,
        edgeBand: 0,
        quantity: 1,
      });
    } else if (config.backPanel.type === "ldsp-inner") {
      items.push({
        group: GROUP_CABINET,
        name: "Задняя стенка (ЛДСП вкладная)",
        length: innerH,
        width: innerW,
        thickness: gT,
        edgeBand: 0,
        quantity: 1,
      });
    }
  }

  // Base (Plinth / Legs)
  if (config.base && config.base.type !== "none") {
    if (config.base.type === "plinth") {
      items.push({
        group: GROUP_CABINET,
        name: "Цоколь (фронтальный/задний)",
        length: config.width,
        width: config.base.height,
        thickness: gT,
        edgeBand: EDGE_BAND_OUTER,
        quantity: 2,
      });
      items.push({
        group: GROUP_CABINET,
        name: "Цоколь (боковой)",
        length: config.depth - 40,
        width: config.base.height,
        thickness: gT,
        edgeBand: EDGE_BAND_OUTER,
        quantity: 2,
      });
      // Plastic supports for plinth usually used
      const frontLegs = config.base.legsCountX ?? (Math.ceil(config.width / 600) + 1);
      const totalLegs = frontLegs * 2;
      items.push({
        group: GROUP_HARDWARE,
        name: `Опора цокольная H=${config.base.height}`,
        length: 0,
        width: 0,
        thickness: 0,
        edgeBand: 0,
        quantity: totalLegs,
      });
    } else if (config.base.type === "legs-round" || config.base.type === "legs-square") {
      const frontLegs = config.base.legsCountX ?? (Math.ceil(config.width / 600) + 1);
      const totalLegs = frontLegs * 2;
      const legName =
        config.base.type === "legs-round"
          ? `Ножка круглая H=${config.base.height}`
          : `Ножка квадратная H=${config.base.height}`;
      items.push({
        group: GROUP_HARDWARE,
        name: legName,
        length: 0,
        width: 0,
        thickness: 0,
        edgeBand: 0,
        quantity: totalLegs,
      });
    }
  }

  // 3. Vertical dividers
  if (config.columns.length > 1) {
    for (let i = 0; i < config.columns.length - 1; i++) {
      let totalInterruptedH = 0;
      config.columns.forEach((col, cIdx) => {
        col.zones.forEach((zone) => {
          if (zone.colSpan && zone.colSpan > 1 && cIdx <= i && cIdx + zone.colSpan - 1 > i) {
            totalInterruptedH += zone.height + gT;
          }
        });
      });

      const dividerH = innerH - totalInterruptedH;
      if (dividerH > 0) {
        items.push({
          group: GROUP_CABINET,
          name: "Перегородка",
          length: Math.round(dividerH),
          width: config.depth,
          thickness: gT,
          edgeBand: EDGE_BAND_INNER,
          quantity: 1,
        });
      }
    }
  }

  // Zones (shelves, drawers, doors)
  let drawerCounter = 0;
  config.columns.forEach((col, cIdx) => {
    col.zones.forEach((zone, zi) => {
      if (zone.fill === "hidden") return;

      const span = zone.colSpan || 1;
      let actualW = col.width;

      if (span > 1) {
        for (let s = 1; s < span; s++) {
          actualW += (config.columns[cIdx + s]?.width || 0) + gT;
        }
      }

      const sectionsToProcess = (zone.sections && zone.sections.length > 1) 
        ? zone.sections 
        : [{ fill: zone.fill, drawerExtension: zone.drawerExtension }];
      
      const secW = (zone.sections && zone.sections.length > 1) 
        ? (actualW - (zone.sections.length - 1) * gT) / zone.sections.length 
        : actualW;

      sectionsToProcess.forEach((sec) => {
        if (sec.fill === "shelf") {
          items.push({
            group: GROUP_SHELVES,
            name: span > 1 ? "Полка вкладная (широкая)" : "Полка вкладная",
            length: secW,
            width: config.depth - 2,
            thickness: gT,
            edgeBand: EDGE_BAND_INNER,
            quantity: 1,
          });
        }

        if (sec.fill === "drawer") {
          drawerCounter++;
          const g = `Ящик ${drawerCounter}`;
          const ext = sec.drawerExtension || "ball-bearing";

          const boxT = gT;
          const nominalDepth = Math.floor((config.depth - 20) / 50) * 50; 
          const boxDepth = nominalDepth;
          const fascadeH = zone.height - 4;
          const boxH = Math.round(fascadeH - 40);

          items.push({
            group: g,
            name: "Фасад ящика",
            length: Math.round(secW - 4),
            width: fascadeH,
            thickness: gT,
            edgeBand: EDGE_BAND_OUTER,
            quantity: 1,
          });

          if (ext === "tandembox") {
            const bottomW = Math.round(secW - 75);
            const bottomL = Math.round(boxDepth - 24);
            const backW = Math.round(secW - 87);

            items.push({
              group: g,
              name: "Дно ящика (ЛДСП для Тандембокса)",
              length: bottomL,
              width: bottomW,
              thickness: 16,
              edgeBand: 0,
              quantity: 1,
            });
            items.push({
              group: g,
              name: "Задняя стенка (ЛДСП для Тандембокса)",
              length: backW,
              width: boxH,
              thickness: 16,
              edgeBand: 0,
              quantity: 1,
            });
            items.push({
              group: GROUP_HARDWARE,
              name: "Комплект Тандембокс",
              length: nominalDepth,
              width: 0,
              thickness: 0,
              edgeBand: 0,
              quantity: 1,
            });
          } else {
            let guideGap = 13;
            if (ext === "roller") guideGap = 12.5;
            if (ext === "hidden-sync") guideGap = 7;

            const frontBackLen = Math.round(secW - 2 * guideGap - 2 * boxT);
            const sideLen = Math.round(boxDepth);

            items.push({
              group: g,
              name: "Царга (Боковина ящика)",
              length: sideLen,
              width: boxH,
              thickness: boxT,
              edgeBand: 0,
              quantity: 2,
            });
            items.push({
              group: g,
              name: "Стенка ящика (Перед/Зад)",
              length: frontBackLen,
              width: boxH,
              thickness: boxT,
              edgeBand: 0,
              quantity: 2,
            });
            items.push({
              group: g,
              name: "Дно ящика (ХДФ 3мм)",
              length: frontBackLen + 2 * boxT,
              width: sideLen,
              thickness: 3,
              edgeBand: 0,
              quantity: 1,
            });

            const hardwareName =
              ext === "hidden-sync"
                ? "Направляющие скрытого монтажа"
                : ext === "roller"
                  ? "Направляющие роликовые"
                  : "Направляющие шариковые";
            
            items.push({
              group: GROUP_HARDWARE,
              name: hardwareName,
              length: nominalDepth,
              width: 0,
              thickness: 0,
              edgeBand: 0,
              quantity: 1,
            });
          }
        }
      });

      if (zone.sections && zone.sections.length > 1) {
         items.push({
          group: GROUP_CABINET,
          name: "Перегородка вертикальная (внутренняя)",
          length: Math.round(zone.height),
          width: config.depth,
          thickness: gT,
          edgeBand: EDGE_BAND_INNER,
          quantity: zone.sections.length - 1,
        });
      }

      if (zone.shelvesCount && zone.shelvesCount > 1) {
        const hCount = zone.shelvesCount - 1;
        if (zone.sections && zone.sections.length > 1) {
          const vCount = zone.sections.length;
          const secW = (actualW - (vCount - 1) * gT) / vCount;
          items.push({
            group: GROUP_SHELVES,
            name: "Полка вкладная",
            length: Math.round(secW),
            width: config.depth - 20,
            thickness: gT,
            edgeBand: EDGE_BAND_INNER,
            quantity: hCount * vCount,
          });
        } else {
          items.push({
            group: GROUP_SHELVES,
            name: "Полка вкладная",
            length: Math.round(actualW),
            width: config.depth - 20,
            thickness: gT,
            edgeBand: EDGE_BAND_INNER,
            quantity: hCount,
          });
        }
      }

      if (zone.fill === "rod") {
        items.push({
          group: GROUP_HARDWARE,
          name: "Штанга",
          length: actualW - 10,
          width: 30,
          thickness: 0,
          edgeBand: 0,
          quantity: 1,
        });
      }

      // Horizontal dividers (shelves between zones)
      if (zi < col.zones.length - 1) {
        const nextZone = col.zones[zi + 1];
        if (nextZone.fill !== "hidden") {
          items.push({
            group: GROUP_CABINET,
            name: "Полка-перегородка (горизонт)",
            length: Math.round(actualW),
            width: config.depth,
            thickness: gT,
            edgeBand: EDGE_BAND_INNER,
            quantity: 1,
          });
        }
      }

      // Handle old zone.door for backwards compatibility, though we'll use col.doors mostly
      if (zone.door) {
        const isOverlay = zone.door.installation === "overlay";
        const isDouble = zone.door.type === "double";

        let dW = isOverlay ? actualW + gT : actualW - 4;
        const dH = isOverlay ? zone.height + gT : zone.height - 4;

        if (isDouble) dW = (dW - 2) / 2;

        items.push({
          group: GROUP_FACADES,
          name: `Дверь (${zone.door.type}, ${zone.door.installation})`,
          length: Math.round(dH),
          width: Math.round(dW),
          thickness: 18,
          edgeBand: 2,
          quantity: isDouble ? 2 : 1,
        });

        // Расчет количества петель: 2 петли на дверь до 1м, 3 на дверь до 1.5м, 4 выше
        const hingesPerDoor = dH < 1000 ? 2 : dH < 1600 ? 3 : 4;
        const totalHinges = hingesPerDoor * (isDouble ? 2 : 1);
        const hingeName =
          zone.door.hingeType === "soft-close"
            ? "Петля с доводчиком"
            : zone.door.hingeType === "push-to-open"
              ? "Петля Push-to-open"
              : "Петля стандартная";

        items.push({
          group: GROUP_HARDWARE,
          name: hingeName,
          length: 0,
          width: 0,
          thickness: 0,
          edgeBand: 0,
          quantity: totalHinges,
        });
      }
    });

    if (col.doors) {
      col.doors.forEach((door) => {
        let actualW = col.width; // for simplicity assume single column width. If doors span columns we need complex logic, but doorGroup is per column.
        let dH = 0;
        for (let i = door.startZoneIdx; i <= door.endZoneIdx; i++) {
           const z = col.zones[i];
           if (z) dH += z.height;
        }
        dH += (door.endZoneIdx - door.startZoneIdx) * gT;

        const isOverlay = door.installation === "overlay";
        const isDouble = door.type === "double";

        let dW = isOverlay ? actualW + gT : actualW - 4;
        dH = isOverlay ? dH + gT : dH - 4;

        if (isDouble) dW = (dW - 2) / 2;

        items.push({
          group: GROUP_FACADES,
          name: `Дверь (${door.type}, ${door.installation})`,
          length: Math.round(dH),
          width: Math.round(dW),
          thickness: 18,
          edgeBand: 2,
          quantity: isDouble ? 2 : 1,
        });

        const hingesPerDoor = dH < 1000 ? 2 : dH < 1600 ? 3 : 4;
        const totalHinges = hingesPerDoor * (isDouble ? 2 : 1);
        const hingeName =
          door.hingeType === "soft-close"
            ? "Петля с доводчиком"
            : door.hingeType === "push-to-open"
              ? "Петля Push-to-open"
              : "Петля стандартная";

        items.push({
          group: GROUP_HARDWARE,
          name: hingeName,
          length: 0,
          width: 0,
          thickness: 0,
          edgeBand: 0,
          quantity: totalHinges,
        });
      });
    }
  });

  // Final aggregation
  const aggregated: BOMItem[] = [];
  items.forEach((item) => {
    const l = Math.round(item.length);
    const w = Math.round(item.width);
    const existing = aggregated.find(
      (a) =>
        a.group === item.group &&
        a.name === item.name &&
        a.length === l &&
        a.width === w &&
        a.thickness === item.thickness &&
        a.edgeBand === item.edgeBand,
    );
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      aggregated.push({ ...item, length: l, width: w });
    }
  });

  return aggregated;
}

export function calculatePrice(config: CabinetConfig): number {
  const bom = generateBOM(config);
  let totalArea = 0;
  let hardwareCost = 0;

  for (const item of bom) {
    if (item.thickness > 0 && item.name !== "Штанга") {
      const areaM2 = (item.length / 1000) * (item.width / 1000) * item.quantity;
      totalArea += areaM2;
    }
    if (item.name === "Штанга") hardwareCost += 8 * item.quantity;
  }

  config.columns.forEach((col) => {
    col.zones.forEach((zone) => {
      if (zone.fill === "drawer") hardwareCost += 18;
      if (zone.door) hardwareCost += (zone.door.type === "double" ? 4 : 2) * 5;
    });
  });

  if (config.base && config.base.type !== "none") {
    const frontLegs = config.base.legsCountX ?? (Math.ceil(config.width / 600) + 1);
    const totalLegs = frontLegs * 2;
    if (config.base.type === "plinth") hardwareCost += totalLegs * 1.5;
    if (config.base.type === "legs-round") hardwareCost += totalLegs * 3;
    if (config.base.type === "legs-square") hardwareCost += totalLegs * 4.5;
  }

  const baseCost = totalArea * 15;
  const textureMult = config.texture === "walnut" ? 1.4 : config.texture === "oak" ? 1.2 : 1;
  return Math.round((baseCost * textureMult + hardwareCost) * 100) / 100;
}
