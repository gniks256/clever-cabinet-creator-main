import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { CabinetConfig, SelectedCell, CellFill } from "./types";
import {
  getInnerHeight,
  getTopThickness,
  getBottomThickness,
  getLeftThickness,
  getRightThickness,
  MIN_SECTION_WIDTH,
  MIN_ZONE_HEIGHT,
} from "./types";

interface Props {
  config: CabinetConfig;
  selected: SelectedCell[];
  onSelectCell: (colId: string, zoneId: string, multi: boolean, sectionIdx?: number) => void;
  onSelectMultipleCells: (cells: SelectedCell[], multi: boolean) => void;
  onClearSelection: () => void;
  onCellFillChange: (fill: CellFill) => void;
  onConfigChange?: (config: CabinetConfig) => void;
  hoveringDelete?: boolean;
}

export function CabinetSVG({
  config,
  selected,
  onSelectCell,
  onSelectMultipleCells,
  onClearSelection,
  onConfigChange,
  hoveringDelete,
}: Props) {
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);
  const [dragDivider, setDragDivider] = useState<{
    type: "v" | "h";
    colIdx: number;
    zoneIdx?: number;
    startVal1: number;
    startVal2: number;
    startMouse: number;
  } | null>(null);
  const [localConfig, setLocalConfig] = useState<CabinetConfig | null>(null);

  const svgRef = useCallback((node: SVGSVGElement | null) => {
    if (node) setSvgElement(node);
  }, []);

  const activeConfig = localConfig || config;
  const { width, height, depth, columns } = activeConfig;
  // Increase padding so outer dimensions fit
  const padding = 45;
  const depthOffset = Math.min(depth * 0.15, 60);
  const scale = 0.3; // increase scale slightly if possible, or keep as is. Let's make it bigger.

  const baseH = (activeConfig.base?.type !== "none" ? activeConfig.base?.height || 0 : 0) * scale;
  const totalH = height * scale;
  const cabinetW = width * scale;
  const cabinetH = totalH - baseH;
  const paddingBottom = padding + 30; // Extra room for bottom dimension text
  const svgW = cabinetW + depthOffset + padding * 2;
  const svgH = cabinetH + depthOffset + padding + paddingBottom;
  const ox = padding;
  const oy = padding + depthOffset;
  const innerH = getInnerHeight(config);

  const woodColors: Record<
    string,
    { front: string; topL: string; topD: string; sideL: string; sideD: string; stroke: string }
  > = {
    white: {
      front: "#F4F3F0",
      topL: "#FCFBF9",
      topD: "#E8E6E1",
      sideL: "#E8E6E1",
      sideD: "#D8D6D0",
      stroke: "#BDBAB5",
    },
    oak: {
      front: "#DAB699",
      topL: "#E6C5A9",
      topD: "#C9A183",
      sideL: "#C9A183",
      sideD: "#A67F61",
      stroke: "#8A644D",
    },
    walnut: {
      front: "#63402E",
      topL: "#754F3A",
      topD: "#523323",
      sideL: "#523323",
      sideD: "#3B2215",
      stroke: "#2C170E",
    },
    black: {
      front: "#2B2826",
      topL: "#353230",
      topD: "#1F1D1C",
      sideL: "#1F1D1C",
      sideD: "#12100F",
      stroke: "#000000",
    },
  };

  const wC = woodColors[config.texture] || woodColors.white;
  const fillFront = wC.front;
  const strokeColor = wC.stroke;
  const accentColor = "hsl(var(--accent))";
  const selectionColor = "hsl(var(--accent) / 0.15)";
  const selectionStroke = "hsl(var(--accent))";

  const topT = getTopThickness(activeConfig) * scale;
  const botT = getBottomThickness(activeConfig) * scale;
  const leftT = getLeftThickness(activeConfig) * scale;
  const rightT = getRightThickness(activeConfig) * scale;
  const boardT = activeConfig.globalThickness * scale;
  const isSidesOverlap = activeConfig.assemblyType === "sides-overlap";

  const getSVGCoords = (e: React.MouseEvent) => {
    if (!svgElement) return { x: 0, y: 0 };
    const pt = svgElement.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const coords = getSVGCoords(e);
    setSelectionBox({ startX: coords.x, startY: coords.y, currX: coords.x, currY: coords.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getSVGCoords(e);

    if (dragDivider) {
      if (dragDivider.type === "v") {
        const delta = (coords.x - dragDivider.startMouse) / scale;
        let newW1 = dragDivider.startVal1 + delta;
        let newW2 = dragDivider.startVal2 - delta;
        const minW = MIN_SECTION_WIDTH;
        if (newW1 < minW) {
          newW1 = minW;
          newW2 = dragDivider.startVal1 + dragDivider.startVal2 - minW;
        } else if (newW2 < minW) {
          newW2 = minW;
          newW1 = dragDivider.startVal1 + dragDivider.startVal2 - minW;
        }

        setLocalConfig((prev) => {
          if (!prev) return prev;
          const newCols = [...prev.columns];
          newCols[dragDivider.colIdx] = {
            ...newCols[dragDivider.colIdx],
            width: Math.round(newW1),
          };
          newCols[dragDivider.colIdx + 1] = {
            ...newCols[dragDivider.colIdx + 1],
            width: Math.round(newW2),
          };
          return { ...prev, columns: newCols };
        });
      } else if (dragDivider.type === "h") {
        let delta = (coords.y - dragDivider.startMouse) / scale;

        let snapped = false;
        let snapDelta = 0;
        for (let c = 0; c < columns.length; c++) {
          if (c === dragDivider.colIdx) continue;
          let yAcc = oy + topT;
          for (const z of columns[c].zones) {
            yAcc += z.height * scale;
            if (Math.abs(yAcc - coords.y) < 8) {
              snapDelta = (yAcc - dragDivider.startMouse) / scale;
              snapped = true;
              break;
            }
            yAcc += boardT;
          }
          if (snapped) break;
        }
        if (snapped) delta = snapDelta;

        let newH1 = dragDivider.startVal1 + delta;
        let newH2 = dragDivider.startVal2 - delta;
        const minH = MIN_ZONE_HEIGHT;
        if (newH1 < minH) {
          newH1 = minH;
          newH2 = dragDivider.startVal1 + dragDivider.startVal2 - minH;
        } else if (newH2 < minH) {
          newH2 = minH;
          newH1 = dragDivider.startVal1 + dragDivider.startVal2 - minH;
        }

        setLocalConfig((prev) => {
          if (!prev) return prev;
          const newCols = [...prev.columns];
          const newZones = [...newCols[dragDivider.colIdx].zones];
          newZones[dragDivider.zoneIdx!] = {
            ...newZones[dragDivider.zoneIdx!],
            height: Math.round(newH1),
          };
          newZones[dragDivider.zoneIdx! + 1] = {
            ...newZones[dragDivider.zoneIdx! + 1],
            height: Math.round(newH2),
          };
          newCols[dragDivider.colIdx] = { ...newCols[dragDivider.colIdx], zones: newZones };
          return { ...prev, columns: newCols };
        });
      }
      return;
    }

    if (selectionBox) {
      setSelectionBox((prev) => (prev ? { ...prev, currX: coords.x, currY: coords.y } : null));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragDivider) {
      if (localConfig && onConfigChange) {
        onConfigChange(localConfig);
      }
      setDragDivider(null);
      setLocalConfig(null);
      return;
    }

    if (!selectionBox) return;
    e.stopPropagation();

    const selX = Math.min(selectionBox.startX, selectionBox.currX);
    const selY = Math.min(selectionBox.startY, selectionBox.currY);
    const selW = Math.abs(selectionBox.currX - selectionBox.startX);
    const selH = Math.abs(selectionBox.currY - selectionBox.startY);

    if (selW < 3 && selH < 3) {
      onClearSelection();
      setSelectionBox(null);
      return;
    }

    const newlySelected: SelectedCell[] = [];
    const isMulti = e.shiftKey;

    let colX = ox + leftT;
    columns.forEach((col, cIdx) => {
      let zoneY = oy + topT;
      col.zones.forEach((zone) => {
        const zH = zone.height * scale;
        if (zone.fill !== "hidden") {
          const span = zone.colSpan || 1;
          let actualW = col.width;
          for (let s = 1; s < span; s++) {
            actualW += (columns[cIdx + s]?.width || 0) + config.globalThickness;
          }
          const wScale = actualW * scale;

          const xOverlap = Math.max(0, Math.min(selX + selW, colX + wScale) - Math.max(selX, colX));
          const yOverlap = Math.max(0, Math.min(selY + selH, zoneY + zH) - Math.max(selY, zoneY));

          if (xOverlap > 0 && yOverlap > 0) {
            newlySelected.push({ colId: col.id, zoneId: zone.id });
          }
        }
        zoneY += zH + boardT;
      });
      colX += col.width * scale + boardT;
    });

    if (newlySelected.length > 0) {
      onSelectMultipleCells(newlySelected, isMulti);
    } else if (!isMulti) {
      onClearSelection();
    }
    setSelectionBox(null);
  };

  const handleCellClick = (e: React.MouseEvent, colId: string, zoneId: string, sectionIdx?: number) => {
    e.stopPropagation();
    onSelectCell(colId, zoneId, e.shiftKey || e.metaKey || e.ctrlKey, sectionIdx);
  };

  let currentX = ox + leftT;
  const dividers: React.ReactNode[] = [];
  for (let i = 0; i < columns.length - 1; i++) {
    const divX = currentX + columns[i].width * scale;
    const gaps: { start: number; end: number }[] = [];
    columns.forEach((col, cIdx) => {
      let cy = oy + topT;
      col.zones.forEach((z) => {
        const zh = z.height * scale;
        if (z.colSpan && z.colSpan > 1 && cIdx <= i && cIdx + z.colSpan - 1 > i) {
          gaps.push({ start: cy - topT / 2, end: cy + zh + topT / 2 });
        }
        cy += zh + boardT;
      });
    });
    const segments: { y: number; h: number }[] = [];
    let lastY = oy + topT;
    const endY = oy + topT + innerH * scale;
    gaps
      .sort((a, b) => a.start - b.start)
      .forEach((g) => {
        if (g.start > lastY) segments.push({ y: lastY, h: g.start - lastY });
        lastY = Math.max(lastY, g.end);
      });
    if (lastY < endY) segments.push({ y: lastY, h: endY - lastY });
    const isDragging = dragDivider?.type === "v" && dragDivider.colIdx === i;
    dividers.push(
      <g key={`vdiv-${i}`}>
        {segments.map((s, si) => (
          <g key={si}>
            <path d={`M${divX + boardT},${s.y} L${divX + boardT + depthOffset},${s.y - depthOffset} L${divX + boardT + depthOffset},${s.y + s.h - depthOffset} L${divX + boardT},${s.y + s.h} Z`} fill="url(#gradSide)" opacity={0.4} />
            <rect
              x={divX}
              y={s.y}
              width={boardT}
              height={s.h}
              fill={isDragging ? accentColor : fillFront}
              stroke={strokeColor}
              strokeWidth={0.5}
              className="transition-colors duration-75"
            />
          </g>
        ))}
        <rect
          x={divX - 8}
          y={oy}
          width={boardT + 16}
          height={innerH * scale}
          fill="transparent"
          cursor="col-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDragDivider({
              type: "v",
              colIdx: i,
              startVal1: columns[i].width,
              startVal2: columns[i + 1].width,
              startMouse: getSVGCoords(e).x,
            });
            setLocalConfig(config);
          }}
        />
      </g>,
    );
    currentX += columns[i].width * scale + boardT;
  }

  let drawX = ox + leftT;
  const colData = columns.map((c) => {
    const x = drawX;
    drawX += c.width * scale + boardT;
    return { ...c, x };
  });

  const tSideO = (config.outerPanels.top.sideOverhang || 0) * scale;
  const topPath = `M${ox - tSideO},${oy} L${ox - tSideO + depthOffset},${oy - depthOffset} L${ox + depthOffset + cabinetW + tSideO},${oy - depthOffset} L${ox + cabinetW + tSideO},${oy} Z`;
  const rightPath = `M${ox + cabinetW + tSideO},${oy} L${ox + cabinetW + tSideO + depthOffset},${oy - depthOffset} L${ox + cabinetW + depthOffset},${oy - depthOffset + cabinetH} L${ox + cabinetW},${oy + cabinetH} Z`;

  return (
    <div className="relative w-full h-full select-none flex items-center justify-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-full drop-shadow-sm"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setSelectionBox(null)}
      >
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" />
          </filter>
          <linearGradient id="gradTop" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={wC.topL} />
            <stop offset="100%" stopColor={wC.topD} />
          </linearGradient>
          <linearGradient id="gradSide" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={wC.sideL} />
            <stop offset="100%" stopColor={wC.sideD} />
          </linearGradient>
          <linearGradient id="facadeSheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="49%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.07)" />
          </linearGradient>
          <linearGradient id="innerShadow" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={config.texture === "black" ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)"}
            />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>

        {/* 1. Floor Shadow */}
        <ellipse
          cx={ox + cabinetW / 2 + depthOffset / 2}
          cy={oy + totalH + 15}
          rx={cabinetW / 2 + 10}
          ry={10}
          fill="rgba(80, 70, 60, 0.25)"
          filter="url(#shadow)"
        />

        {/* 1.5 Back Legs */}
        {config.base && (config.base.type === "legs-round" || config.base.type === "legs-square") && (() => {
          const legsCount = config.base.legsCountX ?? (Math.ceil(width / 600) + 1);
          const spacing = (cabinetW - 40 * scale) / Math.max(1, legsCount - 1);
          const legs = [];
          const isRound = config.base.type === "legs-round";
          const legW = 30 * scale;
          const backZOffset = depthOffset - 20 * (depthOffset / depth);
          for (let i = 0; i < legsCount; i++) {
            const cx = ox + 20 * scale + i * spacing + backZOffset;
            const cy = oy + cabinetH - backZOffset;
            if (isRound) {
              legs.push(
                <rect key={`back-leg-${i}`} x={cx - legW/2} y={cy} width={legW} height={baseH} rx={legW/2} fill="#8A8A8A" stroke="#505050" strokeWidth={0.5} />
              );
            } else {
              legs.push(
                <rect key={`back-leg-${i}`} x={cx - legW/2} y={cy} width={legW} height={baseH} fill="#8A8A8A" stroke="#505050" strokeWidth={0.5} />
              );
            }
          }
          return legs;
        })()}

        {/* 3. Inner Box and Back Panel */}
        <g>
          {/* Inner Left Wall */}
          {config.outerPanels.left.isVisible && (
            <path d={`M${ox + leftT},${oy + topT} L${ox + leftT + depthOffset},${oy + topT - depthOffset} L${ox + leftT + depthOffset},${oy + topT + innerH * scale - depthOffset} L${ox + leftT},${oy + topT + innerH * scale} Z`} fill="url(#gradSide)" opacity={0.6} />
          )}
          {/* Inner Bottom Wall */}
          {config.outerPanels.bottom.isVisible && (
            <path d={`M${ox + leftT},${oy + topT + innerH * scale} L${ox + leftT + depthOffset},${oy + topT + innerH * scale - depthOffset} L${ox + cabinetW - rightT + depthOffset},${oy + topT + innerH * scale - depthOffset} L${ox + cabinetW - rightT},${oy + topT + innerH * scale} Z`} fill="url(#gradTop)" opacity={0.4} />
          )}
          
          {config.backPanel.type !== "none" && (
            <g>
              <rect
                x={ox + leftT + depthOffset}
                y={oy + topT - depthOffset}
                width={cabinetW - leftT - rightT}
                height={innerH * scale}
                fill={fillFront}
                opacity={config.texture === "black" ? 1 : 0.85}
              />
              <rect
                x={ox + leftT + depthOffset}
                y={oy + topT - depthOffset}
                width={cabinetW - leftT - rightT}
                height={innerH * scale}
                fill="url(#innerShadow)"
              />
            </g>
          )}
        </g>
        {/* Base / Legs / Plinth */}
        {config.base && config.base.type !== "none" && (
          <g>
            {config.base.type === "plinth" && (() => {
              const pIndent = 20 * scale;
              const pZIndent = 20 * (depthOffset / depth);
              const pRX = ox + cabinetW - pIndent;
              const pY = oy + cabinetH;
              const pdX = depthOffset - pZIndent;
              const pdY = depthOffset - pZIndent;
              const rightSidePath = `M${pRX},${pY} L${pRX + pdX},${pY - pdY} L${pRX + pdX},${pY + baseH - pdY} L${pRX},${pY + baseH} Z`;
              
              return (
                <g>
                  {/* Front Face */}
                  <rect 
                    x={ox + pIndent} 
                    y={pY} 
                    width={cabinetW - pIndent * 2} 
                    height={baseH} 
                    fill={wC.sideD}
                    stroke={strokeColor} 
                    strokeWidth={0.5} 
                  />
                  {/* Right Side Face */}
                  <path 
                    d={rightSidePath} 
                    fill={wC.sideD}
                    stroke={strokeColor} 
                    strokeWidth={0.5} 
                  />
                </g>
              );
            })()}
            {(config.base.type === "legs-round" || config.base.type === "legs-square") &&
              (() => {
                const legsCount = config.base.legsCountX ?? (Math.ceil(width / 600) + 1);
                const spacing = (cabinetW - 40 * scale) / Math.max(1, legsCount - 1);
                const legs = [];
                const isRound = config.base.type === "legs-round";
                const legW = 30 * scale;
                for (let i = 0; i < legsCount; i++) {
                  const cx = ox + 20 * scale + i * spacing;
                  if (isRound) {
                    legs.push(
                      <rect
                        key={`leg-${i}`}
                        x={cx - legW / 2}
                        y={oy + cabinetH}
                        width={legW}
                        height={baseH}
                        rx={legW / 2}
                        fill="#A0A0A0"
                        stroke="#606060"
                        strokeWidth={0.5}
                      />,
                    );
                  } else {
                    legs.push(
                      <rect
                        key={`leg-${i}`}
                        x={cx - legW / 2}
                        y={oy + cabinetH}
                        width={legW}
                        height={baseH}
                        fill="#A0A0A0"
                        stroke="#606060"
                        strokeWidth={0.5}
                      />,
                    );
                  }
                }
                return legs;
              })()}
          </g>
        )}

        {/* 2. 3D Top extrusion (angled roof face) */}
        {config.outerPanels.top.isVisible && (
          <path d={topPath} fill="url(#gradTop)" stroke={strokeColor} strokeWidth={0.8} />
        )}
        {/* 2b. 3D Right side extrusion */}
        {config.outerPanels.right.isVisible && (
          <path d={rightPath} fill="url(#gradSide)" stroke={strokeColor} strokeWidth={0.8} />
        )}

        {dividers}

        {colData.map((col, cIdx) => {
          let drawY = oy + topT;
          return (
            <g key={col.id}>
              {col.zones.map((zone, zi) => {
                const zH = zone.height * scale;
                const zY = drawY;
                drawY += zH + boardT;
                if (zone.fill === "hidden") return null;
                const span = zone.colSpan || 1;
                let actualW = col.width;
                for (let s = 1; s < span; s++)
                  actualW += (columns[cIdx + s]?.width || 0) + config.globalThickness;
                const wScale = actualW * scale;
                const isSelected = selected.some((s) => s.colId === col.id && s.zoneId === zone.id && s.sectionIdx === undefined);

                return (
                  <g key={zone.id}>
                    {/* Zone background (if not split into selectable sections) */}
                    {!(zone.sections && zone.sections.length > 1) && (
                      <motion.rect
                        x={col.x}
                        y={zY}
                        width={wScale}
                        height={zH}
                        fill={isSelected ? selectionColor : "transparent"}
                        className="cursor-pointer"
                        onClick={(e) => handleCellClick(e, col.id, zone.id)}
                        whileHover={{
                          fill: isSelected ? "hsl(var(--accent) / 0.25)" : "hsl(var(--accent) / 0.1)",
                        }}
                      />
                    )}

                    {/* Internal Horizontal Shelves (from counter) */}
                    {zone.shelvesCount && zone.shelvesCount > 1 && !zone.sections && (
                      (() => {
                        const count = zone.shelvesCount;
                        const shelfNodes = [];
                        const spacing = (zH - (count - 1) * boardT) / count;
                        for (let i = 1; i < count; i++) {
                          const sY = zY + i * spacing + (i - 1) * boardT;
                          shelfNodes.push(
                            <g key={`hz-shelf-${i}`}>
                              <path d={`M${col.x},${sY} L${col.x + depthOffset},${sY - depthOffset} L${col.x + wScale + depthOffset},${sY - depthOffset} L${col.x + wScale},${sY} Z`} fill="url(#gradTop)" opacity={0.6} />
                              <rect x={col.x} y={sY} width={wScale} height={boardT} fill={fillFront} stroke={strokeColor} strokeWidth={0.6} />
                            </g>
                          );
                        }
                        return shelfNodes;
                      })()
                    )}

                    {isSelected && !(zone.sections && zone.sections.length > 1) && (
                      <rect
                        x={col.x + 0.5}
                        y={zY + 0.5}
                        width={wScale - 1}
                        height={zH - 1}
                        fill="none"
                        stroke={selectionStroke}
                        strokeWidth={2}
                        pointerEvents="none"
                      />
                    )}

                    {/* Inner Cell Dimensions Labels */}
                    {zH > 40 * scale && (
                      <g pointerEvents="none" opacity={0.6}>
                        <text
                          x={col.x + wScale / 2}
                          y={zY + zH - 6}
                          fontSize={8}
                          fill="#000000"
                          textAnchor="middle"
                          fontFamily="JetBrains Mono, monospace"
                          className="tabular-nums font-medium"
                        >
                          {Math.round(actualW)}
                        </text>
                        <text
                          x={col.x + 6}
                          y={zY + zH / 2}
                          fontSize={8}
                          fill="#000000"
                          textAnchor="start"
                          dominantBaseline="middle"
                          fontFamily="JetBrains Mono, monospace"
                          transform={`rotate(-90, ${col.x + 6}, ${zY + zH / 2})`}
                          className="tabular-nums font-medium"
                        >
                          {Math.round(zone.height)}
                        </text>
                      </g>
                    )}

                    {/* Inner zone shading to show depth */}
                    <rect
                      x={col.x}
                      y={zY}
                      width={wScale}
                      height={zH}
                      fill="rgba(0,0,0,0.03)"
                      pointerEvents="none"
                    />

                    {/* Draw internal dividers and section fills */}
                    {zone.sections && zone.sections.length > 1 ? (
                      (() => {
                        const count = zone.sections.length;
                        const secW = (wScale - (count - 1) * boardT) / count;
                        const sectionsNodes = [];
                        
                        for (let i = 0; i < count; i++) {
                           const secX = col.x + i * secW + i * boardT;
                           const sec = zone.sections[i];
                           const isSecSelected = selected.some((s) => s.colId === col.id && s.zoneId === zone.id && s.sectionIdx === i);

                           sectionsNodes.push(
                             <g key={`sec-${i}`}>
                               <motion.rect
                                  x={secX}
                                  y={zY}
                                  width={secW}
                                  height={zH}
                                  fill={isSecSelected ? selectionColor : "transparent"}
                                  className="cursor-pointer"
                                  onClick={(e) => handleCellClick(e, col.id, zone.id, i)}
                                  whileHover={{
                                    fill: isSecSelected ? "hsl(var(--accent) / 0.25)" : "hsl(var(--accent) / 0.1)",
                                  }}
                                />
                                {isSecSelected && (
                                  <rect
                                    x={secX + 0.5}
                                    y={zY + 0.5}
                                    width={secW - 1}
                                    height={zH - 1}
                                    fill="none"
                                    stroke={selectionStroke}
                                    strokeWidth={2}
                                    pointerEvents="none"
                                  />
                                )}
                                {/* Section fill */}
                                {sec.fill === "shelf" && (
                                  <g>
                                    <path d={`M${secX},${zY + zH * (sec.shelfPosition ?? 0.5) - boardT / 2} L${secX + depthOffset},${zY + zH * (sec.shelfPosition ?? 0.5) - boardT / 2 - depthOffset} L${secX + secW + depthOffset},${zY + zH * (sec.shelfPosition ?? 0.5) - boardT / 2 - depthOffset} L${secX + secW},${zY + zH * (sec.shelfPosition ?? 0.5) - boardT / 2} Z`} fill="url(#gradTop)" opacity={0.6} />
                                    <rect x={secX} y={zY + zH * (sec.shelfPosition ?? 0.5) - boardT / 2} width={secW} height={boardT} fill={fillFront} stroke={strokeColor} strokeWidth={0.6} />
                                  </g>
                                )}
                                {sec.fill === "drawer" && (
                                  <g>
                                    {/* 3D Drawer box placeholder inside */}
                                    <path d={`M${secX + 2},${zY + zH - 2} L${secX + 2 + depthOffset},${zY + zH - 2 - depthOffset} L${secX + secW - 2 + depthOffset},${zY + zH - 2 - depthOffset} L${secX + secW - 2},${zY + zH - 2} Z`} fill="#E0DCD3" opacity={0.8} />
                                    <path d={`M${secX + 2 + depthOffset},${zY + 2 - depthOffset} L${secX + 2 + depthOffset},${zY + zH - 2 - depthOffset} L${secX + secW - 2 + depthOffset},${zY + zH - 2 - depthOffset} L${secX + secW - 2 + depthOffset},${zY + 2 - depthOffset} Z`} fill="#D5D0C5" opacity={0.8} />
                                    {/* Front facade */}
                                    <rect x={secX + 2} y={zY + 2} width={secW - 4} height={zH - 4} fill={fillFront} stroke={strokeColor} strokeWidth={0.8} />
                                    <line x1={secX + 2} y1={zY + 2} x2={secX + secW - 2} y2={zY + 2} stroke="#FFFFFF" strokeWidth={1} opacity={0.5} />
                                    <rect x={secX + secW / 2 - 20} y={zY + zH / 2 - 2} width={40} height={4} rx={2} fill="#A0A0A0" />
                                  </g>
                                )}
                                {/* Section internal shelves */}
                                {zone.shelvesCount && zone.shelvesCount > 1 && (
                                  (() => {
                                    const count = zone.shelvesCount;
                                    const shelfNodes = [];
                                    const spacing = (zH - (count - 1) * boardT) / count;
                                    for (let i = 1; i < count; i++) {
                                      const sY = zY + i * spacing + (i - 1) * boardT;
                                      shelfNodes.push(
                                        <g key={`sec-hz-shelf-${i}`}>
                                          <path d={`M${secX},${sY} L${secX + depthOffset},${sY - depthOffset} L${secX + secW + depthOffset},${sY - depthOffset} L${secX + secW},${sY} Z`} fill="url(#gradTop)" opacity={0.6} />
                                          <rect x={secX} y={sY} width={secW} height={boardT} fill={fillFront} stroke={strokeColor} strokeWidth={0.6} />
                                        </g>
                                      );
                                    }
                                    return shelfNodes;
                                  })()
                                )}
                             </g>
                           );

                           // Draw vertical divider AFTER this section (except for the last one)
                           if (i < count - 1) {
                              const divX = secX + secW;
                              sectionsNodes.push(
                                <g key={`vdiv-${i}`} pointerEvents="none">
                                  <path d={`M${divX},${zY} L${divX + depthOffset},${zY - depthOffset} L${divX + depthOffset},${zY + zH - depthOffset} L${divX},${zY + zH} Z`} fill="url(#gradSide)" opacity={0.6} />
                                  <rect x={divX} y={zY} width={boardT} height={zH} fill={fillFront} stroke={strokeColor} strokeWidth={0.6} />
                                </g>
                              );
                           }
                        }
                        return sectionsNodes;
                      })()
                    ) : (
                      <g pointerEvents="none">
                        {zone.fill === "shelf" && (
                          <g>
                            <path d={`M${col.x},${zY + zH * (zone.shelfPosition ?? 0.5) - boardT / 2} L${col.x + depthOffset},${zY + zH * (zone.shelfPosition ?? 0.5) - boardT / 2 - depthOffset} L${col.x + wScale + depthOffset},${zY + zH * (zone.shelfPosition ?? 0.5) - boardT / 2 - depthOffset} L${col.x + wScale},${zY + zH * (zone.shelfPosition ?? 0.5) - boardT / 2} Z`} fill="url(#gradTop)" opacity={0.6} />
                            <rect
                              x={col.x}
                              y={zY + zH * (zone.shelfPosition ?? 0.5) - boardT / 2}
                              width={wScale}
                              height={boardT}
                              fill={fillFront}
                              stroke={strokeColor}
                              strokeWidth={0.6}
                            />
                          </g>
                        )}
                    {zone.fill === "drawer" &&
                      (() => {
                        const guideGap = (zone.drawerExtension === "roller" ? 12.5 : 13) * scale;
                        const boxMat = config.globalThickness * scale;
                        const boxH = zH - 44 * scale;
                        const boxY = zY + 20 * scale;
                        const outerX = col.x + guideGap;
                        const outerW = wScale - 2 * guideGap;
                        const innerX = outerX + boxMat;
                        const innerW = outerW - 2 * boxMat;
                        const innerY = boxY;
                        const innerH = boxH - boxMat;
                        const handleW = 24 * scale;
                        const handleY = zY + 12 * scale;
                        const gap = 1;

                        return (
                          <g pointerEvents="none">
                            {/* Inner Drawer Mechanism */}
                            <rect
                              x={col.x + 1}
                              y={zY + 1}
                              width={wScale - 2}
                              height={zH - 2}
                              fill="transparent"
                              stroke={strokeColor}
                              strokeWidth={0.5}
                              strokeDasharray="3 3"
                              opacity={0.3}
                            />
                            <rect
                              x={innerX}
                              y={innerY}
                              width={innerW}
                              height={innerH}
                              fill="rgba(80,70,60,0.05)"
                            />
                            <rect
                              x={outerX}
                              y={boxY}
                              width={boxMat}
                              height={boxH}
                              fill={fillFront}
                              stroke={strokeColor}
                              strokeWidth={0.5}
                            />
                            <rect
                              x={outerX + outerW - boxMat}
                              y={boxY}
                              width={boxMat}
                              height={boxH}
                              fill={fillFront}
                              stroke={strokeColor}
                              strokeWidth={0.5}
                            />
                            <rect
                              x={outerX}
                              y={boxY + boxH - boxMat}
                              width={outerW}
                              height={boxMat}
                              fill={fillFront}
                              stroke={strokeColor}
                              strokeWidth={0.5}
                            />
                            <rect
                              x={innerX}
                              y={innerY}
                              width={innerW}
                              height={boxMat * 0.6}
                              fill={fillFront}
                              stroke={strokeColor}
                              strokeWidth={0.4}
                              opacity={0.6}
                            />
                            <line
                              x1={col.x + wScale * 0.35}
                              y1={zY + zH / 2}
                              x2={col.x + wScale * 0.65}
                              y2={zY + zH / 2}
                              stroke={strokeColor}
                              strokeWidth={1}
                              strokeLinecap="round"
                              opacity={0.5}
                            />

                            {/* Solid Facade with slight transparency */}
                            <rect
                              x={col.x + gap}
                              y={zY + gap}
                              width={wScale - 2 * gap}
                              height={zH - 2 * gap}
                              fill={fillFront}
                              opacity={0.8}
                            />
                            <rect
                              x={col.x + gap}
                              y={zY + gap}
                              width={wScale - 2 * gap}
                              height={zH - 2 * gap}
                              fill="url(#facadeSheen)"
                              stroke={strokeColor}
                              strokeWidth={0.8}
                            />

                            {/* Drawer Handle */}
                            <line
                              x1={col.x + wScale / 2 - handleW / 2}
                              y1={handleY}
                              x2={col.x + wScale / 2 + handleW / 2}
                              y2={handleY}
                              stroke={strokeColor}
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              opacity={0.9}
                            />
                            <line
                              x1={col.x + wScale / 2 - handleW / 2}
                              y1={handleY - 0.5}
                              x2={col.x + wScale / 2 + handleW / 2}
                              y2={handleY - 0.5}
                              stroke="rgba(255,255,255,0.3)"
                              strokeWidth={1}
                              strokeLinecap="round"
                            />
                          </g>
                        );
                      })()}
                    {zone.fill === "rod" &&
                      (() => {
                        const rodY = zY + 60 * scale;
                        const rodX1 = col.x + 4 * scale;
                        const rodX2 = col.x + wScale - 4 * scale;
                        return (
                          <g pointerEvents="none">
                            {/* Flanges */}
                            <ellipse
                              cx={rodX1}
                              cy={rodY}
                              rx={4 * scale}
                              ry={12 * scale}
                              fill={strokeColor}
                              opacity={0.6}
                            />
                            <ellipse
                              cx={rodX2}
                              cy={rodY}
                              rx={4 * scale}
                              ry={12 * scale}
                              fill={strokeColor}
                              opacity={0.6}
                            />

                            {/* Main Rod */}
                            <line
                              x1={rodX1}
                              y1={rodY}
                              x2={rodX2}
                              y2={rodY}
                              stroke={strokeColor}
                              strokeWidth={5}
                              strokeLinecap="round"
                              opacity={0.8}
                            />

                            {/* Gloss highlight texturing */}
                            <line
                              x1={rodX1}
                              y1={rodY - 0.8}
                              x2={rodX2}
                              y2={rodY - 0.8}
                              stroke="rgba(255,255,255,0.6)"
                              strokeWidth={1.5}
                              strokeLinecap="round"
                            />
                            <line
                              x1={rodX1}
                              y1={rodY + 1}
                              x2={rodX2}
                              y2={rodY + 1}
                              stroke="rgba(0,0,0,0.2)"
                              strokeWidth={1.5}
                              strokeLinecap="round"
                            />
                          </g>
                        );
                      })()}
                  </g>
                )}
                    {zi < col.zones.length - 1 &&
                      (() => {
                        const isDragging =
                          dragDivider?.type === "h" &&
                          dragDivider.colIdx === cIdx &&
                          dragDivider.zoneIdx === zi;
                        return (
                          <g>
                            <path d={`M${col.x},${zY + zH} L${col.x + depthOffset},${zY + zH - depthOffset} L${col.x + wScale + depthOffset},${zY + zH - depthOffset} L${col.x + wScale},${zY + zH} Z`} fill="url(#gradTop)" opacity={0.6} />
                            <rect
                              x={col.x}
                              y={zY + zH}
                              width={wScale}
                              height={boardT}
                              fill={isDragging ? accentColor : fillFront}
                              stroke={strokeColor}
                              strokeWidth={0.5}
                              className="transition-colors duration-75"
                            />
                            <rect
                              x={col.x}
                              y={zY + zH - 4}
                              width={wScale}
                              height={boardT + 8}
                              fill="transparent"
                              cursor="row-resize"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDragDivider({
                                  type: "h",
                                  colIdx: cIdx,
                                  zoneIdx: zi,
                                  startVal1: zone.height,
                                  startVal2: col.zones[zi + 1].height,
                                  startMouse: getSVGCoords(e).y,
                                });
                                setLocalConfig(config);
                              }}
                            />
                          </g>
                        );
                      })()}
                    {/* Legacy zone.door removed to use col.doors array */}
                  </g>
                );
              })}

              {col.doors && col.doors.map((door) => {
                let startY = oy + topT;
                for (let i = 0; i < door.startZoneIdx; i++) {
                   if (col.zones[i]) startY += col.zones[i].height * scale + boardT;
                }
                let zH = 0;
                for (let i = door.startZoneIdx; i <= door.endZoneIdx; i++) {
                   if (col.zones[i]) zH += col.zones[i].height * scale;
                }
                zH += (door.endZoneIdx - door.startZoneIdx) * boardT;
                const zY = startY;
                const wScale = col.width * scale;

                return (
                  <g key={door.id} pointerEvents="none">
                    {!door.isOpen && (
                      <g>
                        {/* Solid Door Facade with slight transparency */}
                        <rect
                          x={col.x + 1}
                          y={zY + 1}
                          width={wScale - 2}
                          height={zH - 2}
                          fill={fillFront}
                          opacity={0.8}
                        />
                        <rect
                          x={col.x + 1}
                          y={zY + 1}
                          width={wScale - 2}
                          height={zH - 2}
                          fill="url(#facadeSheen)"
                          stroke={strokeColor}
                          strokeWidth={0.8}
                        />

                        {/* Door split line for double doors */}
                        {door.type === "double" && (
                          <line
                            x1={col.x + wScale / 2}
                            y1={zY + 1}
                            x2={col.x + wScale / 2}
                            y2={zY + zH - 1}
                            stroke={strokeColor}
                            strokeWidth={0.8}
                            opacity={0.5}
                          />
                        )}

                        {/* Smooth handles */}
                        {door.type === "left" && (
                          <g>
                            <line
                              x1={col.x + wScale - 15 * scale}
                              y1={zY + zH / 2 - 20 * scale}
                              x2={col.x + wScale - 15 * scale}
                              y2={zY + zH / 2 + 20 * scale}
                              stroke={strokeColor}
                              strokeWidth={3}
                              strokeLinecap="round"
                              opacity={0.9}
                            />
                            <line
                              x1={col.x + wScale - 15 * scale - 0.5}
                              y1={zY + zH / 2 - 20 * scale}
                              x2={col.x + wScale - 15 * scale - 0.5}
                              y2={zY + zH / 2 + 20 * scale}
                              stroke="rgba(255,255,255,0.3)"
                              strokeWidth={1}
                              strokeLinecap="round"
                            />
                          </g>
                        )}
                        {door.type === "right" && (
                          <g>
                            <line
                              x1={col.x + 15 * scale}
                              y1={zY + zH / 2 - 20 * scale}
                              x2={col.x + 15 * scale}
                              y2={zY + zH / 2 + 20 * scale}
                              stroke={strokeColor}
                              strokeWidth={3}
                              strokeLinecap="round"
                              opacity={0.9}
                            />
                            <line
                              x1={col.x + 15 * scale - 0.5}
                              y1={zY + zH / 2 - 20 * scale}
                              x2={col.x + 15 * scale - 0.5}
                              y2={zY + zH / 2 + 20 * scale}
                              stroke="rgba(255,255,255,0.3)"
                              strokeWidth={1}
                              strokeLinecap="round"
                            />
                          </g>
                        )}
                        {door.type === "double" && (
                          <g>
                            <line
                              x1={col.x + wScale / 2 - 8 * scale}
                              y1={zY + zH / 2 - 20 * scale}
                              x2={col.x + wScale / 2 - 8 * scale}
                              y2={zY + zH / 2 + 20 * scale}
                              stroke={strokeColor}
                              strokeWidth={3}
                              strokeLinecap="round"
                              opacity={0.9}
                            />
                            <line
                              x1={col.x + wScale / 2 - 8 * scale - 0.5}
                              y1={zY + zH / 2 - 20 * scale}
                              x2={col.x + wScale / 2 - 8 * scale - 0.5}
                              y2={zY + zH / 2 + 20 * scale}
                              stroke="rgba(255,255,255,0.3)"
                              strokeWidth={1}
                              strokeLinecap="round"
                            />
                            <line
                              x1={col.x + wScale / 2 + 8 * scale}
                              y1={zY + zH / 2 - 20 * scale}
                              x2={col.x + wScale / 2 + 8 * scale}
                              y2={zY + zH / 2 + 20 * scale}
                              stroke={strokeColor}
                              strokeWidth={3}
                              strokeLinecap="round"
                              opacity={0.9}
                            />
                            <line
                              x1={col.x + wScale / 2 + 8 * scale - 0.5}
                              y1={zY + zH / 2 - 20 * scale}
                              x2={col.x + wScale / 2 + 8 * scale - 0.5}
                              y2={zY + zH / 2 + 20 * scale}
                              stroke="rgba(255,255,255,0.3)"
                              strokeWidth={1}
                              strokeLinecap="round"
                            />
                          </g>
                        )}
                      </g>
                    )}

                    {door.isOpen && (() => {
                      const dw = door.type === "double" ? wScale / 2 : wScale;
                      const dx = dw * 0.8;
                      const dy = dw * 0.25;
                      return (
                        <g opacity={0.65}>
                          {/* Draw wireframe opening to indicate it's open, plus transparent polygons */}
                          {(door.type === "left" || door.type === "double") && (
                            <path
                              d={`M${col.x},${zY} L${col.x - dx},${zY + dy} L${col.x - dx},${zY + zH + dy} L${col.x},${zY + zH} Z`}
                              fill={fillFront}
                              stroke={strokeColor}
                              strokeWidth={1}
                            />
                          )}
                          {(door.type === "right" || door.type === "double") && (
                            <path
                              d={`M${col.x + wScale},${zY} L${col.x + wScale + dx},${zY + dy} L${col.x + wScale + dx},${zY + zH + dy} L${col.x + wScale},${zY + zH} Z`}
                              fill={fillFront}
                              stroke={strokeColor}
                              strokeWidth={1}
                            />
                          )}
                          {/* Light dashed outline in original position to show where door closes */}
                          <rect
                             x={col.x}
                             y={zY}
                             width={wScale}
                             height={zH}
                             fill="transparent"
                             stroke={strokeColor}
                             strokeDasharray="4 4"
                             strokeWidth={1}
                             opacity={0.4}
                          />
                        </g>
                      );
                    })()}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Outer Frame (Front) - Drawn last to cover internal polygon overlaps perfectly */}
        {config.outerPanels.top.isVisible && (
          <rect
            x={isSidesOverlap ? ox + leftT - tSideO : ox - tSideO}
            y={oy}
            width={(isSidesOverlap ? cabinetW - leftT - rightT : cabinetW) + tSideO * 2}
            height={topT}
            fill={fillFront}
            stroke={strokeColor}
            strokeWidth={0.8}
          />
        )}
        {config.outerPanels.bottom.isVisible && (
          <rect
            x={isSidesOverlap ? ox + leftT : ox}
            y={oy + cabinetH - botT}
            width={isSidesOverlap ? cabinetW - leftT - rightT : cabinetW}
            height={botT}
            fill={fillFront}
            stroke={strokeColor}
            strokeWidth={0.8}
          />
        )}
        {config.outerPanels.left.isVisible && (
          <rect
            x={ox}
            y={isSidesOverlap ? oy : oy + topT}
            width={leftT}
            height={isSidesOverlap ? cabinetH : cabinetH - topT - botT}
            fill={fillFront}
            stroke={strokeColor}
            strokeWidth={0.8}
          />
        )}
        {config.outerPanels.right.isVisible && (
          <rect
            x={ox + cabinetW - rightT}
            y={isSidesOverlap ? oy : oy + topT}
            width={rightT}
            height={isSidesOverlap ? cabinetH : cabinetH - topT - botT}
            fill={fillFront}
            stroke={strokeColor}
            strokeWidth={0.8}
          />
        )}

        {/* Outside Dimensions lines and text (like the standard Lovable screenshot) */}
        <g pointerEvents="none" stroke={strokeColor} strokeWidth={0.8} opacity={0.6}>
          {/* Bottom width */}
          <line x1={ox} y1={oy + totalH + 35} x2={ox + cabinetW} y2={oy + totalH + 35} />
          <line x1={ox} y1={oy + totalH + 30} x2={ox} y2={oy + totalH + 40} />
          <line x1={ox + cabinetW} y1={oy + totalH + 30} x2={ox + cabinetW} y2={oy + totalH + 40} />
          <text
            x={ox + cabinetW / 2}
            y={oy + totalH + 50}
            fontSize={10}
            fill="#000000"
            className="tabular-nums font-medium"
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
          >
            {width} mm
          </text>

          {/* Right height */}
          <line
            x1={ox + cabinetW + depthOffset + 15}
            y1={oy - depthOffset}
            x2={ox + cabinetW + depthOffset + 15}
            y2={oy - depthOffset + totalH}
          />
          <line
            x1={ox + cabinetW + depthOffset + 10}
            y1={oy - depthOffset}
            x2={ox + cabinetW + depthOffset + 20}
            y2={oy - depthOffset}
          />
          <line
            x1={ox + cabinetW + depthOffset + 10}
            y1={oy - depthOffset + totalH}
            x2={ox + cabinetW + depthOffset + 20}
            y2={oy - depthOffset + totalH}
          />
          <text
            x={ox + cabinetW + depthOffset + 25}
            y={oy - depthOffset + totalH / 2}
            fontSize={10}
            fill="#000000"
            className="tabular-nums font-medium"
            dominantBaseline="middle"
            fontFamily="JetBrains Mono, monospace"
          >
            {height} mm
          </text>

          {/* Top Depth */}
          <line x1={ox - 25} y1={oy} x2={ox + depthOffset - 25} y2={oy - depthOffset} />
          <line x1={ox - 30} y1={oy - 2} x2={ox - 20} y2={oy + 2} />
          <line
            x1={ox + depthOffset - 30}
            y1={oy - depthOffset - 2}
            x2={ox + depthOffset - 20}
            y2={oy - depthOffset + 2}
          />
          <text
            x={ox + depthOffset / 2 - 35}
            y={oy - depthOffset / 2 - 5}
            fontSize={10}
            fill="#000000"
            className="tabular-nums font-medium"
            textAnchor="end"
            dominantBaseline="middle"
            fontFamily="JetBrains Mono, monospace"
          >
            {depth} mm
          </text>
        </g>

        {selectionBox && (
          <rect
            x={Math.min(selectionBox.startX, selectionBox.currX)}
            y={Math.min(selectionBox.startY, selectionBox.currY)}
            width={Math.abs(selectionBox.currX - selectionBox.startX)}
            height={Math.abs(selectionBox.currY - selectionBox.startY)}
            fill={accentColor}
            fillOpacity={0.15}
            stroke={accentColor}
            strokeWidth={1}
            strokeDasharray="4 4"
            pointerEvents="none"
          />
        )}
      </svg>
      {hoveringDelete && selected.length > 1 && (
        <div className="absolute inset-0 pointer-events-none bg-destructive/5" />
      )}
    </div>
  );
}
