import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { transformCoordinates, getMapImageUrl } from '../lib/coordinateTransform';
import type { KillEvent } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { OverlayCanvas, OverlayElement } from './OverlayCanvas';

/**
 * Heatmap Component - D3.js SVG-Based Visualization
 *
 * Ported from reference codebase with Tauri-specific adaptations
 */

interface HeatmapProps {
  killEvents: KillEvent[];
  mapName: string;
  bandwidth?: number;
  opacity?: number;
  showMode: 'kills' | 'deaths' | 'both';
  styleMode: 'heatmap' | 'points';
  colorLow?: string;
  colorHigh?: string;
  colorKillsLow?: string;
  colorKillsHigh?: string;
  colorDeathsLow?: string;
  colorDeathsHigh?: string;
  colorKillerDot?: string;
  colorVictimDot?: string;
  playerMap?: Map<string, { name: string; agent: string; team: string }>;
  showArrows?: boolean;
  showContext?: boolean;
  independentKillsDeaths?: boolean;
  // Overlay props for interactive elements
  overlayElements?: OverlayElement[];
  onElementsChange?: (elements: OverlayElement[]) => void;
  selectedTool?: string;
  onSelectionChange?: (id: string | null) => void;
  selectedElementId: string | null;
}

interface TooltipData {
  killerName: string;
  killerAgent: string;
  killerTeam: string;
  victimName: string;
  victimAgent: string;
  victimTeam: string;
  weapon: string;
  round: number;
  timeMs: number;
  x: number;
  y: number;
  isKillerDot: boolean; // Track which dot was hovered
}


export function Heatmap({
  killEvents,
  mapName,
  bandwidth: customBandwidth,
  opacity: customOpacity = 0.7,
  showMode,
  styleMode,
  colorLow = "#0a244d",
  colorHigh = "#FF4655",
  colorKillsLow = "#0a244d",
  colorKillsHigh = "#FF4655",
  colorDeathsLow = "#0a244d",
  colorDeathsHigh = "#4455FF",
  colorKillerDot = "#FF4655",
  colorVictimDot = "#4455FF",
  playerMap,
  showArrows = true,
  showContext = false,
  independentKillsDeaths = false,
  overlayElements = [],
  onElementsChange,
  selectedTool = 'select',
  onSelectionChange,
  selectedElementId
}: HeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 1024;
  const height = 1024;
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Debounce colors to prevent lag during color picker dragging
  const debouncedColorLow = useDebounce(colorLow, 100);
  const debouncedColorHigh = useDebounce(colorHigh, 100);
  const debouncedColorKillsLow = useDebounce(colorKillsLow, 100);
  const debouncedColorKillsHigh = useDebounce(colorKillsHigh, 100);
  const debouncedColorDeathsLow = useDebounce(colorDeathsLow, 100);
  const debouncedColorDeathsHigh = useDebounce(colorDeathsHigh, 100);
  const debouncedColorKillerDot = useDebounce(colorKillerDot, 100);
  const debouncedColorVictimDot = useDebounce(colorVictimDot, 100);

  // Cache expensive contour calculations
  const contourData = useMemo(() => {
    if (!killEvents || killEvents.length === 0 || styleMode !== 'heatmap') {
      return null;
    }

    const collectDataPoints = (useKillerLoc: boolean) => {
      const points: { x: number; y: number }[] = [];
      
      killEvents.forEach(event => {
        const location = useKillerLoc ? event.killer_location : event.victim_location;
        if (!location || !location.x || !location.y) return;

        const transformed = transformCoordinates(location.x, location.y, mapName);
        if (transformed) {
          points.push({
            x: transformed.x * 1024,
            y: transformed.y * 1024,
          });
        }
      });
      
      return points;
    };

    const x = d3.scaleLinear().domain([0, 1024]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1024]).range([0, height]);

    const calculateBandwidth = (points: any[]) => {
      if (customBandwidth !== undefined) return customBandwidth;
      if (points.length === 0) return 15;
      
      const xSpread = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
      const ySpread = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
      return Math.max(15, ((xSpread + ySpread) / 2) * 0.03);
    };

    if (showMode === 'both') {
      const killsPoints = collectDataPoints(true);
      const deathsPoints = collectDataPoints(false);
      
      if (killsPoints.length === 0 && deathsPoints.length === 0) {
        return { type: 'empty' as const };
      }

      const killsData = killsPoints.length > 0 ? {
        bandwidth: calculateBandwidth(killsPoints),
        contour: d3.contourDensity<any>()
          .x(d => x(d.x)).y(d => y(d.y))
          .size([width, height])
          .bandwidth(calculateBandwidth(killsPoints))(killsPoints)
      } : null;

      const deathsData = deathsPoints.length > 0 ? {
        bandwidth: calculateBandwidth(deathsPoints),
        contour: d3.contourDensity<any>()
          .x(d => x(d.x)).y(d => y(d.y))
          .size([width, height])
          .bandwidth(calculateBandwidth(deathsPoints))(deathsPoints)
      } : null;

      return { type: 'both' as const, kills: killsData, deaths: deathsData };
    } else {
      const useKillerLoc = showMode === 'kills';
      const dataPoints = collectDataPoints(useKillerLoc);

      if (dataPoints.length === 0) {
        return { type: 'empty' as const };
      }

      const bandwidth = calculateBandwidth(dataPoints);
      const contour = d3.contourDensity<any>()
        .x(d => x(d.x)).y(d => y(d.y))
        .size([width, height])
        .bandwidth(bandwidth)(dataPoints);

      return { type: 'single' as const, contour, bandwidth };
    }
  }, [killEvents, mapName, showMode, customBandwidth]); // Only recalc on these changes

  // Main rendering effect - now only recolors, doesn't recalculate
  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const svg = d3.select(svgRef.current);

    // Clear previous visualizations but preserve map image
    svg.selectAll("g.heatmap-layer").remove();
    svg.selectAll("g.points-layer").remove();
    svg.selectAll("text.no-data").remove();
    svg.selectAll("g.text-overlays").remove();

    // Ensure map image exists (it might have been cleared)
    const existingImage = svg.select("image");
    if (existingImage.empty()) {
      const imageUrl = getMapImageUrl(mapName);
      svg.append("image")
        .attr("xlink:href", imageUrl)
        .attr("width", width)
        .attr("height", height)
        .attr("opacity", 0.8);
    }

    // If no kill events, show no data message
    if (!killEvents || killEvents.length === 0) {
      showNoDataMessage(svg);
      return;
    }

    if (styleMode === 'heatmap') {
      renderHeatmap(svg);
    } else {
      renderPoints(svg);
    }

  }, [killEvents, mapName, showMode, styleMode, customBandwidth, customOpacity,
      debouncedColorLow, debouncedColorHigh, debouncedColorKillsLow, debouncedColorKillsHigh,
      debouncedColorDeathsLow, debouncedColorDeathsHigh, debouncedColorKillerDot,
      debouncedColorVictimDot, showArrows, showContext, contourData, independentKillsDeaths]);

  // Render heatmap visualization (optimized - uses cached contour data)
  const renderHeatmap = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    if (!contourData) return;
    
    if (contourData.type === 'empty') {
      showNoDataMessage(svg);
      return;
    }

    if (contourData.type === 'both') {
      // Render kills heatmap
      if (contourData.kills) {
        const colorScale = d3.scaleSequential()
          .domain([0, d3.max(contourData.kills.contour, d => d.value) || 1])
          .interpolator(d3.interpolateRgb(debouncedColorKillsLow, debouncedColorKillsHigh));

        svg.append("g")
          .attr("class", "heatmap-layer kills-layer")
          .selectAll("path")
          .data(contourData.kills.contour)
          .join("path")
          .attr("d", d3.geoPath())
          .attr("fill", d => colorScale(d.value))
          .attr("stroke", "none")
          .attr("opacity", customOpacity);
      }

      // Render deaths heatmap
      if (contourData.deaths) {
        const colorScale = d3.scaleSequential()
          .domain([0, d3.max(contourData.deaths.contour, d => d.value) || 1])
          .interpolator(d3.interpolateRgb(debouncedColorDeathsLow, debouncedColorDeathsHigh));

        svg.append("g")
          .attr("class", "heatmap-layer deaths-layer")
          .selectAll("path")
          .data(contourData.deaths.contour)
          .join("path")
          .attr("d", d3.geoPath())
          .attr("fill", d => colorScale(d.value))
          .attr("stroke", "none")
          .attr("opacity", customOpacity * 0.7);
      }
    } else if (contourData.type === 'single') {
      // Determine which colors to use based on mode and independence setting
      let low, high;
      if (independentKillsDeaths) {
        // Use mode-specific colors when independent
        if (showMode === 'kills') {
          low = debouncedColorKillsLow;
          high = debouncedColorKillsHigh;
        } else {
          low = debouncedColorDeathsLow;
          high = debouncedColorDeathsHigh;
        }
      } else {
        // Use shared colors when linked
        low = debouncedColorLow;
        high = debouncedColorHigh;
      }

      const colorScale = d3.scaleSequential()
        .domain([0, d3.max(contourData.contour, d => d.value) || 1])
        .interpolator(d3.interpolateRgb(low, high));

      svg.append("g")
        .attr("class", "heatmap-layer")
        .selectAll("path")
        .data(contourData.contour)
        .join("path")
        .attr("d", d3.geoPath())
        .attr("fill", d => colorScale(d.value))
        .attr("stroke", "none")
        .attr("opacity", customOpacity);
    }
  };

  // Render points visualization
  const renderPoints = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    const pointsGroup = svg.append("g").attr("class", "points-layer");
    
    svg.select("defs").remove();
    const defs = svg.append("defs");
    
    let eventIndex = 0;

    killEvents.forEach((event) => {
      if (!event.killer_location?.x || !event.victim_location?.x) return;

      const killerTransformed = transformCoordinates(event.killer_location.x, event.killer_location.y, mapName);
      const victimTransformed = transformCoordinates(event.victim_location.x, event.victim_location.y, mapName);

      if (!killerTransformed || !victimTransformed) return;

      const killerX = killerTransformed.x * 1024;
      const killerY = killerTransformed.y * 1024;
      const victimX = victimTransformed.x * 1024;
      const victimY = victimTransformed.y * 1024;

      let showKiller = showMode === 'kills' || showMode === 'both';
      let showVictim = showMode === 'deaths' || showMode === 'both';
      
      if (showContext) {
        if (showMode === 'kills') showVictim = true;
        else if (showMode === 'deaths') showKiller = true;
      }

      const currentEventIndex = eventIndex;
      eventIndex++;

      const killerData = playerMap?.get(event.killer_puuid);
      const victimData = playerMap?.get(event.victim_puuid);
      
      const killerName = killerData?.name || 'Unknown';
      const victimName = victimData?.name || 'Unknown';
      const killerAgent = killerData?.agent || 'Unknown';
      const victimAgent = victimData?.agent || 'Unknown';
      const killerTeam = killerData?.team || 'Unknown';
      const victimTeam = victimData?.team || 'Unknown';

      const shouldShowArrow = showMode === 'both' || showContext;
      
      if (shouldShowArrow) {
        const arrowId = `arrow-gradient-${currentEventIndex}`;
        const arrowheadId = `arrowhead-${currentEventIndex}`;
        
        defs.append("linearGradient")
          .attr("id", arrowId)
          .attr("x1", "0%").attr("y1", "0%")
          .attr("x2", "100%").attr("y2", "0%")
          .selectAll("stop")
          .data([
            { offset: "0%", color: debouncedColorKillerDot },
            { offset: "100%", color: debouncedColorVictimDot }
          ])
          .join("stop")
          .attr("offset", d => d.offset)
          .attr("stop-color", d => d.color);

        defs.append("marker")
          .attr("id", arrowheadId)
          .attr("markerWidth", 10)
          .attr("markerHeight", 10)
          .attr("refX", 8)
          .attr("refY", 3)
          .attr("orient", "auto")
          .append("polygon")
          .attr("points", "0 0, 10 3, 0 6")
          .attr("fill", debouncedColorVictimDot);

        pointsGroup.append("line")
          .attr("class", `arrow arrow-${currentEventIndex}`)
          .attr("x1", killerX)
          .attr("y1", killerY)
          .attr("x2", victimX)
          .attr("y2", victimY)
          .attr("stroke", `url(#${arrowId})`)
          .attr("stroke-width", 2)
          .attr("opacity", showArrows ? 0.6 : 0)
          .attr("marker-end", `url(#${arrowheadId})`);
      }

      const showKillerDotInitially = showKiller;
      const showVictimDotInitially = showVictim;

      if (showKiller) {
        pointsGroup.append("circle")
          .attr("class", `killer-dot killer-dot-${currentEventIndex}`)
          .attr("cx", killerX)
          .attr("cy", killerY)
          .attr("r", 5)
          .attr("fill", debouncedColorKillerDot)
          .attr("stroke", "#000")
          .attr("stroke-width", 1)
          .attr("opacity", showKillerDotInitially ? 0.8 : 0)
          .style("cursor", "pointer")
          .on("mouseover", function() {
            d3.select(this)
              .attr("r", 8)
              .attr("stroke-width", 3)
              .attr("stroke", "#FFD700")
              .attr("opacity", 0.8);
            
            svg.selectAll(`.victim-dot-${currentEventIndex}`)
              .attr("r", 8)
              .attr("stroke-width", 3)
              .attr("stroke", "#FFD700")
              .attr("opacity", 0.8);
            
            svg.selectAll(`.arrow-${currentEventIndex}`)
              .attr("stroke-width", 4)
              .attr("opacity", 1);

            setTooltip({
              killerName, killerAgent, killerTeam,
              victimName, victimAgent, victimTeam,
              weapon: event.weapon || 'Unknown',
              round: event.round_num,
              timeMs: event.round_time_millis,
              x: killerX, y: killerY,
              isKillerDot: true
            });
          })
          .on("mouseout", function() {
            d3.select(this)
              .attr("r", 5)
              .attr("stroke-width", 1)
              .attr("stroke", "#000")
              .attr("opacity", showKillerDotInitially ? 0.8 : 0);
            
            svg.selectAll(`.victim-dot-${currentEventIndex}`)
              .attr("r", 5)
              .attr("stroke-width", 1)
              .attr("stroke", "#000")
              .attr("opacity", showVictimDotInitially ? 0.8 : 0);
            
            svg.selectAll(`.arrow-${currentEventIndex}`)
              .attr("stroke-width", 2)
              .attr("opacity", showArrows ? 0.6 : 0);

            setTooltip(null);
          });
      }

      if (showVictim) {
        pointsGroup.append("circle")
          .attr("class", `victim-dot victim-dot-${currentEventIndex}`)
          .attr("cx", victimX)
          .attr("cy", victimY)
          .attr("r", 5)
          .attr("fill", debouncedColorVictimDot)
          .attr("stroke", "#000")
          .attr("stroke-width", 1)
          .attr("opacity", showVictimDotInitially ? 0.8 : 0)
          .style("cursor", "pointer")
          .on("mouseover", function() {
            d3.select(this)
              .attr("r", 8)
              .attr("stroke-width", 3)
              .attr("stroke", "#FFD700")
              .attr("opacity", 0.8);
            
            svg.selectAll(`.killer-dot-${currentEventIndex}`)
              .attr("r", 8)
              .attr("stroke-width", 3)
              .attr("stroke", "#FFD700")
              .attr("opacity", 0.8);
            
            svg.selectAll(`.arrow-${currentEventIndex}`)
              .attr("stroke-width", 4)
              .attr("opacity", 1);

            setTooltip({
              killerName, killerAgent, killerTeam,
              victimName, victimAgent, victimTeam,
              weapon: event.weapon || 'Unknown',
              round: event.round_num,
              timeMs: event.round_time_millis,
              x: victimX, y: victimY,
              isKillerDot: false
            });
          })
          .on("mouseout", function() {
            d3.select(this)
              .attr("r", 5)
              .attr("stroke-width", 1)
              .attr("stroke", "#000")
              .attr("opacity", showVictimDotInitially ? 0.8 : 0);
            
            svg.selectAll(`.killer-dot-${currentEventIndex}`)
              .attr("r", 5)
              .attr("stroke-width", 1)
              .attr("stroke", "#000")
              .attr("opacity", showKillerDotInitially ? 0.8 : 0);
            
            svg.selectAll(`.arrow-${currentEventIndex}`)
              .attr("stroke-width", 2)
              .attr("opacity", showArrows ? 0.6 : 0);

            setTooltip(null);
          });
      }
    });
  };


  const showNoDataMessage = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    svg.append("text")
      .attr("class", "no-data")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#e0e0e0")
      .attr("font-size", "20px")
      .text("No position data available for this view");
  };


  // Render legend
  const renderLegend = () => {
    if (styleMode === 'points') {
      return (
        <div className="heatmap-legend">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(showMode === 'kills' || showMode === 'both' || (showContext && showMode === 'deaths')) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: colorKillerDot, border: '1px solid #000' }}></div>
                <span>Killer</span>
              </div>
            )}
            {(showMode === 'deaths' || showMode === 'both' || (showContext && showMode === 'kills')) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: colorVictimDot, border: '1px solid #000' }}></div>
                <span>Victim</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (showMode === 'both') {
      return (
        <div className="heatmap-legend">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ minWidth: '45px' }}>Kills:</span>
              <div style={{
                width: '100px', height: '10px',
                background: `linear-gradient(to right, ${colorKillsLow}, ${colorKillsHigh})`,
                borderRadius: '2px'
              }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ minWidth: '45px' }}>Deaths:</span>
              <div style={{
                width: '100px', height: '10px',
                background: `linear-gradient(to right, ${colorDeathsLow}, ${colorDeathsHigh})`,
                borderRadius: '2px'
              }}></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="heatmap-legend">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Intensity:</span>
          <div style={{
            width: '100px', height: '10px',
            background: `linear-gradient(to right, ${colorLow}, ${colorHigh})`,
            borderRadius: '2px'
          }}></div>
          <span style={{ fontSize: '10px' }}>Low → High</span>
        </div>
      </div>
    );
  };

  return (
    <div className="heatmap-container">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="heatmap-svg"
      />

      {renderLegend()}

      {tooltip && (
        <div 
          className="heatmap-tooltip"
          style={{
            left: tooltip.x < width / 2 ? tooltip.x + 15 : tooltip.x - 220,
            top: tooltip.y < height / 2 ? tooltip.y + 15 : tooltip.y - 120,
            borderColor: tooltip.isKillerDot ? colorKillerDot : colorVictimDot,
            boxShadow: `0 8px 24px rgba(0, 0, 0, 0.8), 0 0 20px ${tooltip.isKillerDot ? colorKillerDot : colorVictimDot}66`
          }}
        >
          <div className="tooltip-section">
            <div className="tooltip-killer" style={{ color: colorKillerDot }}>
              KILLER: {tooltip.killerName}
            </div>
            <div className="tooltip-details">
              {tooltip.killerAgent} • {tooltip.killerTeam}
            </div>
          </div>
          
          <div className="tooltip-section">
            <div className="tooltip-victim" style={{ color: colorVictimDot }}>
              VICTIM: {tooltip.victimName}
            </div>
            <div className="tooltip-details">
              {tooltip.victimAgent} • {tooltip.victimTeam}
            </div>
          </div>

          <div className="tooltip-stats">
            <div>
              <span>Weapon:</span> {tooltip.weapon}
            </div>
            <div>
              <span>Round:</span> {tooltip.round + 1}
            </div>
            <div>
              <span>Time:</span> {Math.floor(tooltip.timeMs / 1000)}s
            </div>
          </div>
        </div>
      )}

      {/* Overlay Canvas for interactive elements */}
      <OverlayCanvas
        width={width}
        height={height}
        elements={overlayElements}
        onElementsChange={onElementsChange || (() => {})}
        selectedTool={selectedTool}
        onSelectionChange={onSelectionChange || (() => {})}
        selectedElementId={selectedElementId}
      />
    </div>
  );
}
