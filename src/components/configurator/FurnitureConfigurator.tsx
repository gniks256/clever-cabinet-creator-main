import { useState, useCallback, useEffect, useRef } from "react";
import { CabinetSVG } from "./CabinetSVG";
import { ConfigSidebar } from "./ConfigSidebar";
import { BOMTable } from "./BOMTable";
import type {
  CabinetConfig,
  CellFill,
  SelectedCell,
  DoorType,
  DoorInstallation,
  DrawerExtensionType,
} from "./types";
import {
  createDefaultColumns,
  getInnerHeight,
  getInnerWidth,
  getTopThickness,
  getBottomThickness,
  MIN_SECTION_WIDTH,
  MIN_ZONE_HEIGHT,
} from "./types";
import type { Zone } from "./types";
import { useCabinetStore } from "../../store/cabinetStore";

export function FurnitureConfigurator() {
  const config = useCabinetStore((state) => state.config);
  const setConfig = useCabinetStore((state) => state.setConfig);
  const selected = useCabinetStore((state) => state.selected);
  const setSelected = useCabinetStore((state) => state.setSelected);
  const undo = useCabinetStore((state) => state.undo);
  const redo = useCabinetStore((state) => state.redo);
  const saveHistory = useCabinetStore((state) => state.saveHistory);

  const [hoveringDelete, setHoveringDelete] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const isDraggingPan = useRef(false);
  const isSpaceDownRef = useRef(false);
  const startPanPos = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync for event listeners
  useEffect(() => {
    isSpaceDownRef.current = isSpaceDown;
  }, [isSpaceDown]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // Stop browser native pinch-to-zoom
        const delta = -e.deltaY * 0.01;
        setZoom((prev) => Math.min(4, Math.max(0.2, prev + delta)));
      } else {
        // Trackpad 2D panning (if no space bar pressed)
        if (!isSpaceDownRef.current) {
          e.preventDefault(); // Prevent page scroll while over canvas
          setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveHistory();
    }, 400);
    return () => clearTimeout(timer);
  }, [config, saveHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      if (e.code === "Space") {
        e.preventDefault(); // Stop page scrolling
        setIsSpaceDown(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpaceDown(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [undo, redo]);

  const handleConfigChange = useCallback(
    (newConfig: CabinetConfig) => {
      const finalConfig = { ...newConfig };

      const innerWChanged = getInnerWidth(newConfig) !== getInnerWidth(config);
      const innerHChanged = getInnerHeight(newConfig) !== getInnerHeight(config);
      const thicknessChanged = newConfig.globalThickness !== config.globalThickness;

      if (thicknessChanged) {
        // Recalculate columns/zones when thickness changes to maintain external dimensions.
        const oldInnerW = getInnerWidth(config);
        const newInnerW = getInnerWidth(newConfig);
        const deltaW = newInnerW - oldInnerW;

        const oldInnerH = getInnerHeight(config);
        const newInnerH = getInnerHeight(newConfig);
        const deltaH = newInnerH - oldInnerH;

        const thickDiff = newConfig.globalThickness - config.globalThickness;
        const unlockedCols = config.columns.filter((c) => !c.isLocked);

        finalConfig.columns = config.columns.map((col) => {
          let newColW = col.width;
          if (!col.isLocked && unlockedCols.length > 0) {
            const sharedDeltaW = deltaW / unlockedCols.length;
            const dividerSpaceChange = (config.columns.length - 1) * thickDiff;
            newColW = col.width + sharedDeltaW - dividerSpaceChange / unlockedCols.length;
          }

          const visibleZones = col.zones.filter((z) => z.fill !== "hidden");
          const unlockedZones = visibleZones.filter((z) => !z.isLocked);
          const newZones = col.zones.map((zone) => {
            if (zone.isLocked || zone.fill === "hidden" || unlockedZones.length === 0) return zone;
            const sharedDeltaH = deltaH / unlockedZones.length;
            const dividerSpaceChange = (visibleZones.length - 1) * thickDiff;
            return {
              ...zone,
              height: zone.height + sharedDeltaH - dividerSpaceChange / unlockedZones.length,
            };
          });

          return { ...col, width: Math.max(MIN_SECTION_WIDTH, newColW), zones: newZones };
        });
      } else if (newConfig.width !== config.width || innerWChanged) {
        const oldInnerW = getInnerWidth(config);
        const newInnerW = getInnerWidth(newConfig);
        const deltaW = newInnerW - oldInnerW;
        const unlockedCols = config.columns.filter((c) => !c.isLocked);
        if (unlockedCols.length > 0) {
          const totalUnlockedW = unlockedCols.reduce((sum, c) => sum + c.width, 0);
          let distributedW = 0;
          let processedUnlocked = 0;
          finalConfig.columns = config.columns.map((col) => {
            if (col.isLocked) return col;
            processedUnlocked++;
            if (processedUnlocked === unlockedCols.length) {
              return { ...col, width: col.width + (deltaW - distributedW) };
            }
            const share = Math.round(deltaW * (col.width / totalUnlockedW));
            distributedW += share;
            return { ...col, width: col.width + share };
          });
        }
      } else if (newConfig.height !== config.height || innerHChanged) {
        const oldInnerH = getInnerHeight(config);
        const newInnerH = getInnerHeight(newConfig);
        const deltaH = newInnerH - oldInnerH;
        finalConfig.columns = config.columns.map((col) => {
          const unlockedZones = col.zones.filter((z) => !z.isLocked && z.fill !== "hidden");
          if (unlockedZones.length === 0) return col;
          const totalUnlockedH = unlockedZones.reduce((sum, z) => sum + z.height, 0);
          let distributedH = 0;
          let processedUnlocked = 0;
          const newZones = col.zones.map((zone) => {
            if (zone.isLocked || zone.fill === "hidden") return zone;
            processedUnlocked++;
            if (processedUnlocked === unlockedZones.length) {
              return { ...zone, height: zone.height + (deltaH - distributedH) };
            }
            const share = Math.round(deltaH * (zone.height / totalUnlockedH));
            distributedH += share;
            return { ...zone, height: zone.height + share };
          });
          return { ...col, zones: newZones };
        });
      }
      setConfig(finalConfig);
    },
    [config, setConfig],
  );

  const toggleLockColumn = useCallback(
    (colId: string) => {
      const newCols = config.columns.map((col) =>
        col.id === colId ? { ...col, isLocked: !col.isLocked } : col,
      );
      setConfig({ ...config, columns: newCols });
    },
    [config, setConfig],
  );

  const toggleLockZone = useCallback(
    (colId: string, zoneId: string) => {
      const newCols = config.columns.map((col) => {
        if (col.id !== colId) return col;
        return {
          ...col,
          zones: col.zones.map((z) => (z.id === zoneId ? { ...z, isLocked: !z.isLocked } : z)),
        };
      });
      setConfig({ ...config, columns: newCols });
    },
    [config, setConfig],
  );

  const performMerge = useCallback(
    (targetFill: CellFill, keepSelection: boolean) => {
      if (selected.length < 2) return;
      const selection = selected.map((s) => {
        const colIdx = config.columns.findIndex((c) => c.id === s.colId);
        const zoneIdx = config.columns[colIdx].zones.findIndex((z) => z.id === s.zoneId);
        return { colIdx, zoneIdx, ...s };
      });
      const colIndices = selection.map((s) => s.colIdx);
      const minColIdx = Math.min(...colIndices);
      const maxColIdx = Math.max(...colIndices);
      const boundsPerCol: Record<number, { min: number; max: number }> = {};
      selection.forEach((s) => {
        if (!boundsPerCol[s.colIdx]) {
          boundsPerCol[s.colIdx] = { min: s.zoneIdx, max: s.zoneIdx };
        } else {
          boundsPerCol[s.colIdx].min = Math.min(boundsPerCol[s.colIdx].min, s.zoneIdx);
          boundsPerCol[s.colIdx].max = Math.max(boundsPerCol[s.colIdx].max, s.zoneIdx);
        }
      });
      const newCols = config.columns.map((col, cIdx) => {
        const bounds = boundsPerCol[cIdx];
        if (!bounds) return col;

        const shiftAmount = bounds.max - bounds.min;
        const newDoors = (col.doors || [])
          .map((door) => {
            const { startZoneIdx, endZoneIdx } = door;
            if (endZoneIdx < bounds.min) {
              return door;
            }
            if (startZoneIdx > bounds.max) {
              return {
                ...door,
                startZoneIdx: startZoneIdx - shiftAmount,
                endZoneIdx: endZoneIdx - shiftAmount,
              };
            }
            return null;
          })
          .filter((door): door is NonNullable<typeof door> => door !== null);

        if (cIdx === minColIdx) {
          const zonesToMerge = col.zones.slice(bounds.min, bounds.max + 1);
          const totalHeight =
            zonesToMerge.reduce((sum, z) => sum + z.height, 0) +
            (zonesToMerge.length - 1) * config.globalThickness;
          const mergedZone: Zone = {
            ...zonesToMerge[0],
            height: totalHeight,
            fill: targetFill,
            colSpan: maxColIdx - minColIdx + 1,
            door: undefined,
          };
          return {
            ...col,
            zones: [
              ...col.zones.slice(0, bounds.min),
              mergedZone,
              ...col.zones.slice(bounds.max + 1),
            ],
            doors: newDoors,
          };
        } else {
          const zonesToMerge = col.zones.slice(bounds.min, bounds.max + 1);
          const totalHeight =
            zonesToMerge.reduce((sum, z) => sum + z.height, 0) +
            (zonesToMerge.length - 1) * config.globalThickness;
          const hiddenZone: Zone = {
            id: `hidden-${Math.random().toString(36).substr(2, 9)}`,
            height: totalHeight,
            fill: "hidden",
          };
          return {
            ...col,
            zones: [
              ...col.zones.slice(0, bounds.min),
              hiddenZone,
              ...col.zones.slice(bounds.max + 1),
            ],
            doors: newDoors,
          };
        }
      });
      setConfig({ ...config, columns: newCols });
      if (keepSelection) {
        setSelected([
          {
            colId: newCols[minColIdx].id,
            zoneId: newCols[minColIdx].zones[boundsPerCol[minColIdx].min].id,
          },
        ]);
      } else {
        setSelected([]);
      }
    },
    [config, selected, setConfig, setSelected],
  );

  const handleCellFillChange = useCallback(
    (fill: CellFill) => {
      if (selected.length === 0) return;
      if (selected.length > 1 && fill !== "open") {
        performMerge(fill, true);
        return;
      }
      const newCols = config.columns.map((col) => {
        const selectedIndicesInCol = col.zones
          .map((zone, idx) => {
            const isSelected = selected.some((s) => s.colId === col.id && s.zoneId === zone.id);
            return isSelected ? idx : -1;
          })
          .filter((idx) => idx !== -1);

        if (selectedIndicesInCol.length === 0) return col;

        let updatedDoors = col.doors || [];
        if (fill === "drawer") {
          updatedDoors = updatedDoors.filter((door) => {
            const overlaps = selectedIndicesInCol.some(
              (idx) => idx >= door.startZoneIdx && idx <= door.endZoneIdx,
            );
            return !overlaps;
          });
        }

        const updatedZones = col.zones.map((zone, idx) => {
          const isSelected = selectedIndicesInCol.includes(idx);
          if (isSelected) {
            const selItem = selected.find((s) => s.colId === col.id && s.zoneId === zone.id);
            if (
              selItem &&
              selItem.sectionIdx !== undefined &&
              zone.sections &&
              zone.sections[selItem.sectionIdx]
            ) {
              const newSections = [...zone.sections];
              newSections[selItem.sectionIdx] = { ...newSections[selItem.sectionIdx], fill };
              return { ...zone, sections: newSections };
            }
            const updatedZone = { ...zone, fill };
            if (fill === "open" || fill === "drawer") {
              updatedZone.door = undefined;
            }
            return updatedZone;
          }
          return zone;
        });

        return {
          ...col,
          zones: updatedZones,
          doors: updatedDoors,
        };
      });
      setConfig({ ...config, columns: newCols });
    },
    [config, selected, performMerge, setConfig],
  );

  const handleDoorChange = useCallback(
    (type: DoorType | null, installation: DoorInstallation = "overlay") => {
      if (selected.length === 0) return;
      const colId = selected[0].colId;
      const colIdx = config.columns.findIndex((c) => c.id === colId);
      if (colIdx === -1) return;

      const indices = selected
        .filter((s) => s.colId === colId)
        .map((s) => config.columns[colIdx].zones.findIndex((z) => z.id === s.zoneId))
        .filter((i) => i !== -1);

      if (indices.length === 0) return;
      const minIdx = Math.min(...indices);
      const maxIdx = Math.max(...indices);

      const newCols = [...config.columns];
      const col = { ...newCols[colIdx] };
      let doors = [...(col.doors || [])];

      if (!type) {
        doors = doors.filter((d) => !(minIdx <= d.endZoneIdx && maxIdx >= d.startZoneIdx));
      } else {
        const existingIdx = doors.findIndex(
          (d) => minIdx <= d.endZoneIdx && maxIdx >= d.startZoneIdx,
        );
        if (existingIdx !== -1) {
          doors[existingIdx] = { ...doors[existingIdx], type, installation };
        } else {
          doors.push({
            id: `door-${Math.random().toString(36).substr(2, 9)}`,
            startZoneIdx: minIdx,
            endZoneIdx: maxIdx,
            type,
            installation,
            hingeType: "standard",
            isOpen: false,
          });
        }
        // Change fill to "open" for any drawer zones within the door's bounds
        col.zones = col.zones.map((z, idx) => {
          if (idx >= minIdx && idx <= maxIdx && z.fill === "drawer") {
            return { ...z, fill: "open" };
          }
          return z;
        });
      }
      col.doors = doors;
      newCols[colIdx] = col;
      setConfig({ ...config, columns: newCols });
    },
    [config, selected, setConfig],
  );

  const mergeSelectedCells = useCallback(() => {
    performMerge("open", false);
  }, [performMerge]);

  const deleteColumn = useCallback(() => {
    if (selected.length === 0 || config.columns.length <= 1) return;
    const targetColId = selected[0].colId;
    const remainingCols = config.columns.filter((c) => c.id !== targetColId);
    const innerW = getInnerWidth(config);
    const newWidth =
      (innerW - (remainingCols.length - 1) * config.globalThickness) / remainingCols.length;
    setConfig({
      ...config,
      columns: remainingCols.map((c) => ({ ...c, width: newWidth })),
    });
    setSelected([]);
  }, [config, selected, setConfig, setSelected]);

  const splitZone = useCallback(
    (colId: string, zoneId: string) => {
      const newCols = config.columns.map((col) => {
        if (col.id !== colId) return col;
        const zoneIdx = col.zones.findIndex((z) => z.id === zoneId);
        if (zoneIdx === -1) return col;
        const targetZone = col.zones[zoneIdx];
        const newHeight = (targetZone.height - config.globalThickness) / 2;
        if (newHeight < MIN_ZONE_HEIGHT) return col;
        const zone1: Zone = {
          id: `zone-${Math.random().toString(36).substr(2, 9)}`,
          height: newHeight,
          fill: "open",
        };
        const zone2: Zone = {
          id: `zone-${Math.random().toString(36).substr(2, 9)}`,
          height: newHeight,
          fill: "open",
        };
        const newZones = [
          ...col.zones.slice(0, zoneIdx),
          zone1,
          zone2,
          ...col.zones.slice(zoneIdx + 1),
        ];

        const newDoors = (col.doors || []).map((door) => {
          let { startZoneIdx, endZoneIdx } = door;
          if (zoneIdx < startZoneIdx) {
            startZoneIdx++;
            endZoneIdx++;
          } else if (zoneIdx >= startZoneIdx && zoneIdx <= endZoneIdx) {
            endZoneIdx++;
          }
          return { ...door, startZoneIdx, endZoneIdx };
        });

        return { ...col, zones: newZones, doors: newDoors };
      });
      setConfig({ ...config, columns: newCols });
      setSelected([]);
    },
    [config, setConfig, setSelected],
  );

  const setRowSegments = useCallback(
    (colId: string, count: number) => {
      let firstNewZoneId = "";
      const newCols = config.columns.map((col) => {
        if (col.id !== colId) return col;
        const innerH = getInnerHeight(config);
        const zoneH = (innerH - (count - 1) * config.globalThickness) / count;
        const newZones: Zone[] = Array.from({ length: count }, (_, i) => {
          const id = `zone-${Math.random().toString(36).substr(2, 9)}`;
          if (i === 0) firstNewZoneId = id;
          return { id, height: zoneH, fill: "open" };
        });
        return { ...col, zones: newZones, doors: [] };
      });
      setConfig({ ...config, columns: newCols });
      if (firstNewZoneId) setSelected([{ colId, zoneId: firstNewZoneId }]);
    },
    [config, setConfig, setSelected],
  );

  const setAllRowSegments = useCallback(
    (count: number) => {
      const innerH = getInnerHeight(config);
      const zoneH = (innerH - (count - 1) * config.globalThickness) / count;
      const newCols = config.columns.map((col) => ({
        ...col,
        zones: Array.from({ length: count }, () => ({
          id: `zone-${Math.random().toString(36).substr(2, 9)}`,
          height: zoneH,
          fill: "open" as const,
        })),
        doors: [],
      }));
      setConfig({ ...config, columns: newCols });
      setSelected([]);
    },
    [config, setConfig, setSelected],
  );

  const handleDrawerExtensionChange = useCallback(
    (colId: string, zoneId: string, ext: DrawerExtensionType) => {
      const newCols = config.columns.map((col) => ({
        ...col,
        zones: col.zones.map((z) => {
          const selItem = selected.find((s) => s.colId === col.id && s.zoneId === z.id);
          if (
            selItem &&
            selItem.sectionIdx !== undefined &&
            z.sections &&
            z.sections[selItem.sectionIdx]
          ) {
            const newSections = [...z.sections];
            newSections[selItem.sectionIdx] = {
              ...newSections[selItem.sectionIdx],
              drawerExtension: ext,
            };
            return { ...z, sections: newSections };
          }
          if (col.id === colId && z.id === zoneId) {
            return { ...z, drawerExtension: ext };
          }
          return z;
        }),
      }));
      setConfig({ ...config, columns: newCols });
    },
    [config, selected, setConfig],
  );

  const setShelvesCount = useCallback(
    (colId: string, zoneId: string, count: number) => {
      const newCols = config.columns.map((col) => {
        if (col.id !== colId) return col;
        return {
          ...col,
          zones: col.zones.map((z) => (z.id === zoneId ? { ...z, shelvesCount: count } : z)),
        };
      });
      setConfig({ ...config, columns: newCols });
    },
    [config, setConfig],
  );

  const handleShelfPositionChange = useCallback(
    (colId: string, zoneId: string, pos: number) => {
      const newCols = config.columns.map((col) => ({
        ...col,
        zones: col.zones.map((z) => {
          const selItem = selected.find((s) => s.colId === col.id && s.zoneId === z.id);
          if (
            selItem &&
            selItem.sectionIdx !== undefined &&
            z.sections &&
            z.sections[selItem.sectionIdx]
          ) {
            const newSections = [...z.sections];
            newSections[selItem.sectionIdx] = {
              ...newSections[selItem.sectionIdx],
              shelfPosition: pos,
            };
            return { ...z, sections: newSections };
          }
          if (col.id === colId && z.id === zoneId) {
            return { ...z, shelfPosition: pos };
          }
          return z;
        }),
      }));
      setConfig({ ...config, columns: newCols });
    },
    [config, selected, setConfig],
  );

  const handleSectionsCountChange = useCallback(
    (colId: string, zoneId: string, count: number) => {
      const newCols = config.columns.map((col) => ({
        ...col,
        zones: col.zones.map((z) => {
          if (col.id === colId && z.id === zoneId) {
            const currentSections = z.sections || [];
            const newSections = [];
            for (let i = 0; i < count; i++) {
              newSections.push(
                currentSections[i] || {
                  id: `sec-${Math.random().toString(36).substr(2, 9)}`,
                  fill: "open",
                },
              );
            }
            return { ...z, sectionsCount: count, sections: newSections };
          }
          return z;
        }),
      }));
      setConfig({ ...config, columns: newCols });
    },
    [config, setConfig],
  );

  const handleHingeChange = useCallback(
    (colId: string, doorId: string, hinge: import("./types").HingeType) => {
      const newCols = config.columns.map((col) => {
        if (col.id === colId && col.doors) {
          return {
            ...col,
            doors: col.doors.map((d) => (d.id === doorId ? { ...d, hingeType: hinge } : d)),
          };
        }
        return col;
      });
      setConfig({ ...config, columns: newCols });
    },
    [config, setConfig],
  );

  const handleDoorToggleOpen = useCallback(
    (colId: string, doorId: string) => {
      const newCols = config.columns.map((col) => {
        if (col.id === colId && col.doors) {
          return {
            ...col,
            doors: col.doors.map((d) => (d.id === doorId ? { ...d, isOpen: !d.isOpen } : d)),
          };
        }
        return col;
      });
      setConfig({ ...config, columns: newCols });
    },
    [config, setConfig],
  );

  const toggleSelectCell = useCallback(
    (colId: string, zoneId: string, multi: boolean, sectionIdx?: number) => {
      setSelected((prev) => {
        const isAlreadySelected = prev.some(
          (s) => s.colId === colId && s.zoneId === zoneId && s.sectionIdx === sectionIdx,
        );
        if (multi) {
          if (isAlreadySelected)
            return prev.filter(
              (s) => !(s.colId === colId && s.zoneId === zoneId && s.sectionIdx === sectionIdx),
            );
          return [...prev, { colId, zoneId, sectionIdx }];
        }
        return [{ colId, zoneId, sectionIdx }];
      });
    },
    [setSelected],
  );

  const handleSelectMultipleCells = useCallback(
    (newlySelected: SelectedCell[], additive: boolean) => {
      setSelected((prev) => {
        if (!additive) return newlySelected;
        const updated = [...prev];
        newlySelected.forEach((ns) => {
          if (!updated.some((u) => u.colId === ns.colId && u.zoneId === ns.zoneId)) {
            updated.push(ns);
          }
        });
        return updated;
      });
    },
    [setSelected],
  );

  const handleClearSelection = useCallback(() => {
    setSelected([]);
  }, [setSelected]);

  const handleZoom = (delta: number) => setZoom((prev) => Math.min(3, Math.max(0.5, prev + delta)));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePanDown = (e: React.MouseEvent) => {
    if (zoom > 1 && (isSpaceDown || e.button === 1 || e.button === 2)) {
      e.stopPropagation();
      isDraggingPan.current = true;
      startPanPos.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (isDraggingPan.current) {
      setPan({
        x: e.clientX - startPanPos.current.x,
        y: e.clientY - startPanPos.current.y,
      });
    }
  };

  const handlePanUp = () => {
    isDraggingPan.current = false;
  };

  return (
    <div className="h-screen flex flex-col text-ink bg-[#FDFCFB] overflow-hidden font-sans">
      {/* Header / Top Bar (Optional, can be added later) */}

      <main className="flex-1 flex overflow-hidden">
        {/* LEFT — Canvas & BOM */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar bg-[#F6F4F0]">
          <div className="p-6 lg:p-10 space-y-8 max-w-[1200px] mx-auto w-full">
            {/* Canvas - Sticky at top of the scrollable area if needed, 
                but for a true "configurator" feel, we can keep it as is 
                if we want the BOM to scroll. 
                User said "окно просмотра слева не съезжало".
                Let's make the canvas container STICKY within the scroll area.
            */}
            <div className="sticky top-0 z-20 pt-2 pb-4 bg-[#F6F4F0]">
              <div
                className="relative w-full rounded-[32px] overflow-hidden min-h-[600px] lg:h-[calc(100vh-300px)] border border-[#E5E0D8] shadow-sm transition-all duration-500"
                style={{ backgroundColor: "#FDFCFB" }}
              >
                {/* Grid Background */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(140, 132, 122, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(140, 132, 122, 0.05) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                    backgroundPosition: "center center",
                  }}
                />

                {/* 3D Content */}
                <div
                  ref={canvasRef}
                  className={`absolute inset-0 flex items-center justify-center p-8 transition-transform ease-out ${isDraggingPan.current ? "duration-0" : "duration-500"} ${zoom > 1 && isSpaceDown ? "cursor-grab active:cursor-grabbing" : ""}`}
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  }}
                  onMouseDown={handlePanDown}
                  onMouseMove={handlePanMove}
                  onMouseUp={handlePanUp}
                  onMouseLeave={handlePanUp}
                  onContextMenu={(e) => {
                    if (zoom > 1) e.preventDefault();
                  }}
                >
                  <CabinetSVG
                    config={config}
                    selected={selected}
                    onSelectCell={toggleSelectCell}
                    onSelectMultipleCells={handleSelectMultipleCells}
                    onClearSelection={handleClearSelection}
                    onCellFillChange={handleCellFillChange}
                    onConfigChange={setConfig}
                    hoveringDelete={hoveringDelete}
                  />
                </div>

                {/* Zoom Controls */}
                <div className="absolute bottom-8 right-8 flex items-center gap-3 z-20 pointer-events-auto">
                  {pan.x !== 0 || pan.y !== 0 ? (
                    <button
                      onClick={() => setPan({ x: 0, y: 0 })}
                      className="w-12 h-12 flex items-center justify-center bg-white border border-[#E5E0D8] rounded-full text-[#8C847A] shadow-md hover:text-accent hover:border-accent/40 transition-all active:scale-90"
                      title="Центрировать"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                        <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                        <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                        <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                      </svg>
                    </button>
                  ) : null}
                  <div className="flex bg-white border border-[#E5E0D8] rounded-full shadow-md overflow-hidden">
                    <button
                      onClick={() => handleZoom(-0.2)}
                      className="w-12 h-12 flex items-center justify-center text-[#8C847A] hover:bg-black/5 transition-colors active:scale-95 border-r border-[#E5E0D8]"
                    >
                      <span className="text-xl font-bold">−</span>
                    </button>
                    <button
                      onClick={resetZoom}
                      className="px-5 h-12 flex items-center justify-center font-mono text-[12px] font-bold text-[#8C847A] hover:bg-black/5 transition-colors"
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                    <button
                      onClick={() => handleZoom(0.2)}
                      className="w-12 h-12 flex items-center justify-center text-[#8C847A] hover:bg-black/5 transition-colors active:scale-95 border-l border-[#E5E0D8]"
                    >
                      <span className="text-xl font-bold">+</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Legends */}
                <div className="absolute bottom-8 left-8 flex flex-col gap-1.5 z-10 pointer-events-none">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#8C847A] font-bold opacity-60">
                    МАСШТАБ 1:20
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-white/80 backdrop-blur-md rounded-lg border border-black/5 text-[12px] text-[#2A2624] font-mono font-bold shadow-sm">
                      {config.width}×{config.height}×{config.depth}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOM Table */}
            <div className="pb-12">
              <div className="surface-card overflow-hidden shadow-sm border border-[#E5E0D8]">
                <BOMTable config={config} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — ConfigSidebar (Fixed Width, Independent Scroll) */}
        <aside className="w-[400px] flex flex-col bg-white border-l border-[#E5E0D8] shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-30">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
            <ConfigSidebar
              config={config}
              selected={selected.length > 0 ? selected[0] : null}
              multiSelected={selected}
              onChange={handleConfigChange}
              onCellFillChange={handleCellFillChange}
              onDeleteDivider={mergeSelectedCells}
              onDeleteColumn={deleteColumn}
              onSplitZone={splitZone}
              onSetRowSegments={setRowSegments}
              onSetAllRowSegments={setAllRowSegments}
              onDoorChange={handleDoorChange}
              onDrawerExtensionChange={handleDrawerExtensionChange}
              onShelfPositionChange={handleShelfPositionChange}
              onSectionsCountChange={handleSectionsCountChange}
              onShelvesCountChange={setShelvesCount}
              onHingeChange={handleHingeChange}
              onDoorToggleOpen={handleDoorToggleOpen}
              onToggleLockColumn={toggleLockColumn}
              onToggleLockZone={toggleLockZone}
              onClearSelection={() => setSelected([])}
              setHoveringDelete={setHoveringDelete}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
