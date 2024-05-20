/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

// @ts-ignore
import * as d3 from "d3";

import {
  RenderState,
  Data,
  Options,
  D3_SELECTION,
  RenderedPanel,
  SumStatsSettings,
  StatisticsConfig,
  TrellisZoomConfig,
  SummaryStatistics,
} from "./definitions";

import { scaleAsinh } from "./asinhScale";

import {
  setTrellisPanelZoomedTitle,
  LOG_CATEGORIES,
  Log,
  GenerateRoundedRectSvg,
  getContrastingColor,
  MOD_CONTAINER,
} from "./index";
import { GeneralStylingInfo, ScaleStylingInfo, StylingInfo, Tooltip } from "spotfire-api";

export function renderContinuousAxis(
  g: D3_SELECTION,
  container: D3_SELECTION,
  config: Partial<Options>,
  minZoom: number,
  maxZoom: number,
  plotData: Data,
  widthAvailable: number,
  padding: any,
  styling: {
    generalStylingInfo: GeneralStylingInfo;
    scales: ScaleStylingInfo;
  },
  tooltip: Tooltip
): { yScale: d3.Scale; yAxisRendered: D3_SELECTION } {

  /**
   * Draw y axis
   */
  let yScale = d3.scale;
  let ticks: number[];
  let allTicks: number[];

  var sumStatsAsArray = [...plotData.sumStats.keys()].map((key: string) =>
    plotData.sumStats.get(key)
  );
  // linear portion of the symlog scale
  const linearPortion = Math.min(
    1,
    d3.mean(
      sumStatsAsArray.map((r: SummaryStatistics) => {
        Log.red(LOG_CATEGORIES.AsinhScale)(
          "ZeroCrossingValue",
          r.closestValueToZero
        );
        const pow = Math.log10(Math.abs(r.closestValueToZero));
        Log.red(LOG_CATEGORIES.AsinhScale)("Pow", pow);
        return Math.pow(10, pow);
      })
    )
  );

  // Symmetrical log
  if (config.yAxisScaleType.value() == "symlog") {
    // Log.blue(LOG_CATEGORIES.DebugCustomSymLog)("stats", ...plotData.sumStats.values());
    Log.blue(LOG_CATEGORIES.DebugCustomSymLog)("stats", sumStatsAsArray);

    // If domain is all positive, or all negative then we can use standard d3 log
    if (
      (false && plotData.yDataDomain.min > 0) ||
      (plotData.yDataDomain.min < 0 && plotData.yDataDomain.max < 0)
    ) {
      yScale = d3
        .scaleLog()
        .domain([minZoom, maxZoom]) //y domain using our min and max values calculated earlier
        .range([widthAvailable - padding.betweenPlotAndTable, 0]);
    } else {
      Log.red(LOG_CATEGORIES.AsinhScale)("LinearPortion", linearPortion);

      yScale = scaleAsinh()
        .domain([minZoom, maxZoom]) //y domain using our min and max values calculated earlier
        .range([0, widthAvailable - padding.betweenPlotAndTable])
        .linearPortion(Math.min(linearPortion, 1));
    }
  }

  // Log
  // if (config.yAxisScaleType.value() == "log") {
  //  yScale = log()
  //    .domain([minZoom, maxZoom]) //y domain using our min and max values calculated earlier
  //    .range([heightAvailable - padding.betweenPlotAndTable, 0]);

  // Add a warning to the chart
  //  svg.append;
  //}

  // Keep track of the power labels so we can avoid hiding them later (for symlog scale)
  const powerLabels: string[] = [];
  // Settings common to both symmetrical log and log
  if (
    config.yAxisScaleType.value() == "symlog" ||
    config.yAxisScaleType.value() == "log"
  ) {
    allTicks = yScale.ticks();
    //allTicks = allTicks.concat(minZoom);

    Log.green(LOG_CATEGORIES.DebugInnovativeLogticks)(
      "ticks",
      allTicks.map((t: number) => config.FormatNumber(t))
    );

    let minPower =
      allTicks[0] == 0
        ? 0
        : Math.sign(allTicks[0]) *
          Math.floor(Math.log10(Math.abs(allTicks[0])));
    let maxPower = Math.floor(
      Math.log10(Math.abs(allTicks[allTicks.length - 1]))
    );

    Log.green(LOG_CATEGORIES.DebugInnovativeLogticks)(
      "min, max",
      minPower,
      maxPower
    );

    if (minPower > maxPower) {
      const temp = minPower;
      minPower = maxPower;
      maxPower = temp;
    }

    // Negative
    for (let i = minPower; i < 0; i++) {
      powerLabels.push(config.FormatNumber(-1 * Math.pow(10, i)));
    }

    // Add the zero if we have a negative domain
    if (powerLabels.length > 0 || allTicks[0] == 0) {
      powerLabels.push(config.FormatNumber(0));
    }

    // Positive
    for (let i = 0; i <= maxPower; i++) {
      powerLabels.push(config.FormatNumber(Math.pow(10, i)));
    }
  }

  Log.green(LOG_CATEGORIES.DebugInnovativeLogticks)("powerLabels", powerLabels);

  if (config.yAxisScaleType.value() == "linear") {
    yScale = d3
      .scaleLinear()
      .domain([minZoom, maxZoom]) //y domain using our min and max values calculated earlier
      //.domain([0,50])
      .range([0, widthAvailable - padding.betweenPlotAndTable]); //.nice();
    ticks = yScale.ticks((widthAvailable - padding.betweenPlotAndTable) / 40);
    allTicks = ticks;
  }

  Log.green(LOG_CATEGORIES.Horizontal)("ticks", ticks);

  const yAxis = d3
    .axisBottom()
    .scale(yScale)
    .tickValues(ticks)
    .tickFormat((d: any) => config.FormatNumber(d));

  /**
   * Draw grid lines
   */
  if (config.includeYAxisGrid.value() && styling.scales.line.stroke != "none") {
    Log.green(LOG_CATEGORIES.DebugYScaleTicks)(ticks);
    g.selectAll("line.horizontalGrid")
      .data(config.yAxisScaleType.value() == "linear" ? ticks : allTicks)
      .enter()
      .append("line")
      .attr("class", "horizontal-grid")
      .attr("x1", 0)
      .attr("x2", widthAvailable)
      .attr("y1", (d: number) => yScale(d) + 0.5)
      .attr("y2", (d: number) => yScale(d) + 0.5)
      .attr("stroke", styling.scales.line.stroke)
      .attr("shape-rendering", "crispEdges");
    //.attr("stroke", styling.scales.line.stroke)

    g.selectAll("line.horizontal-grid-hover")
      .data(config.yAxisScaleType.value() == "linear" ? ticks : allTicks)
      .enter()
      .append("line")
      .attr("class", "horizontal-grid-hover")
      .attr("style", "opacity:0;")
      .attr("x1", 0)
      .attr("x2", widthAvailable)
      .attr("y1", (d: number) => yScale(d))
      .attr("y2", (d: number) => yScale(d))
      .attr("stroke", styling.scales.line.stroke)
      .attr("stroke-width", 5)
      .attr("shape-rendering", "crispEdges")
      //.attr("stroke", styling.scales.line.stroke)
      .on("mouseover", function (event: d3.event, d: any) {
        Log.green(LOG_CATEGORIES.DebugYScaleTicks)("mouseover", d);
        tooltip.show(config.FormatNumber(d));
      })
      .on("mouseover", function (event: d3.event, d: any) {
        tooltip.show(config.FormatNumber(d));
      })
      .on("mouseout", () => tooltip.hide());
  }

  // Styling of ticks and lines
  container.selectAll(".tick line").attr("stroke", styling.scales.tick.stroke);

  container.selectAll(".domain").attr("stroke", styling.scales.line.stroke);

  // Render y axis
  const yAxisRendered = g
    .append("g")
    .attr("class", "axis")    
    .style("font-family", styling.scales.font.fontFamily)
    .style("font-weight", styling.scales.font.fontWeight)
    .style("font-size", styling.scales.font.fontSize + "px")
    .style("color", styling.scales.font.color)
    .call(yAxis)
    .on("drag", () => {
      Log.green(LOG_CATEGORIES.Rendering)("drag");
    });

     // Symmetrical log - indicate the linear portion
  if (
    config.yAxisScaleType.value() == "symlog" &&
    plotData.yDataDomain.min <= 0 &&
    plotData.yDataDomain.max > 0
  ) {
    g.append("line")
      .style("stroke", "url(#linear-portion)")
      .style("stroke-width", 10)
      .attr("x1", 0)
      .attr("x2", 0)
      .attr(
        "y1",
        yScale(
          plotData.yDataDomain.min < -1 * linearPortion
            ? -1 * linearPortion
            : plotData.yDataDomain.min
        )
      )
      .attr(
        "y2",
        yScale(
          plotData.yDataDomain.max > linearPortion
            ? linearPortion
            : plotData.yDataDomain.max
        )
      )
      .on("mousemove", () => {
        tooltip.show(
          "Linear portion:\n" +
            config.FormatNumber(
              plotData.yDataDomain.min < 0
                ? -1 * linearPortion
                : plotData.yDataDomain.min
            ) +
            " to: " +
            config.FormatNumber(linearPortion)
        );
      })
      .on("mouseout", () => tooltip.hide());
  }

  const labels = yAxisRendered.selectAll("g.tick").selectAll("text"); //.append("text");
  //const boundingBoxes = ticks.map((l:any) => testers.text(l).node().getBBox());
  Log.red(LOG_CATEGORIES.InnovativeLogTicks)("testers", labels);

  interface AxisLabelRect {
    SvgTextElement: Node;
    BoundingClientRect: DOMRect;
  }

  labels.each((t: any, i: number, g: NodeList) => {
    Log.red(LOG_CATEGORIES.InnovativeLogTicks)(
      "t",
      (g.item(i) as HTMLElement).getBoundingClientRect()
    );
  });

  /**
   * Remove clashing labels; Returns true if a label was removed; false if no label was removed
   * @param axisLabelRects
   * @param powers
   * @param topToBottom
   * @returns
   */
  function removeLabelClashes(
    axisLabelRects: AxisLabelRect[],
    powers: string[],
    topToBottom: boolean,
    removePowers: boolean = false
  ): boolean {
    let labelsClash = false;
    for (let i = 0; i < axisLabelRects.length; i++) {
      const axisLabelRect = axisLabelRects[i];
      if (topToBottom) {
        const thisRectBottom =
          axisLabelRect.BoundingClientRect.top +
          axisLabelRect.BoundingClientRect.height;
        const nextRectTop = axisLabelRects[i + 1]?.BoundingClientRect.top;
        const nextLabelText = d3
          .select(axisLabelRects[i + 1]?.SvgTextElement)
          .node()?.innerHTML;
        const thisLabelText = d3
          .select(axisLabelRects[i]?.SvgTextElement)
          .node()?.innerHTML;
        Log.blue(LOG_CATEGORIES.InnovativeLogTicks)(
          "This Label Text",
          thisLabelText
        );
        Log.red(LOG_CATEGORIES.InnovativeLogTicks)(
          "Next Label Text",
          nextLabelText
        );
        if (
          nextLabelText != undefined &&
          nextRectTop <= thisRectBottom //&&
          //!(powers.includes(nextLabelText) || removePowers)
        ) {
          Log.red(LOG_CATEGORIES.InnovativeLogTicks)("Removing", nextLabelText);
          if (!powers.includes(nextLabelText) || removePowers) {
            d3.select(axisLabelRects[i + 1]?.SvgTextElement).remove();
          }
          labelsClash = true;
          break;
        }
      } else {
        const thisRectTop = axisLabelRect.BoundingClientRect.top;
        const nextRectBottom =
          axisLabelRects[i + 1]?.BoundingClientRect.top +
          axisLabelRects[i + 1]?.BoundingClientRect.height;
        const nextLabelText = d3
          .select(axisLabelRects[i + 1]?.SvgTextElement)
          .node()?.innerHTML;
        const thisLabelText = d3
          .select(axisLabelRects[i]?.SvgTextElement)
          .node()?.innerHTML;
        Log.green(LOG_CATEGORIES.InnovativeLogTicks)(
          "This Label Text",
          thisLabelText
        );
        Log.red(LOG_CATEGORIES.InnovativeLogTicks)(
          "Next Label Text",
          nextLabelText
        );
        if (
          nextLabelText != undefined &&
          nextRectBottom >= thisRectTop //&&
          //!(powers.includes(nextLabelText) || removePowers)
        ) {
          labelsClash = true;
          Log.red(LOG_CATEGORIES.InnovativeLogTicks)("Removing", nextLabelText);
          if (!powers.includes(nextLabelText) || removePowers) {
            d3.select(axisLabelRects[i + 1]?.SvgTextElement).remove();
          }
          break;
        }
      }
    }

    return labelsClash;
  }

  // Now remove clashing labels iteratively
  let bottomUpLabelsClash = true;
  let topDownLabelsClash = true;

  // Guard against too many iterations of the algorithm to remove clashing labels
  let iterations = 0;

  while ( false && 
    (bottomUpLabelsClash || topDownLabelsClash) &&
    iterations < allTicks.length * 6
  ) {
    Log.red(LOG_CATEGORIES.DebugInnovativeLogticks)(
      "Iterating",
      iterations % 2 == 0 ? "TopDown" : "BottomUp",
      bottomUpLabelsClash,
      topDownLabelsClash,
      iterations
    );
    const axisLabelRects: AxisLabelRect[] = [];

    yAxisRendered
      .selectAll("g.tick")
      .selectAll("text")
      .each((t: any, i: number, g: NodeList) => {
        //getAttribute("transform"));
        axisLabelRects.push({
          SvgTextElement: g.item(i),
          BoundingClientRect: (
            g.item(i) as HTMLElement
          ).getBoundingClientRect(),
        });
      });
    if (iterations % 2 == 0) {
      // Sort the rects from top to bottom
      axisLabelRects.sort(
        (r1: AxisLabelRect, r2: AxisLabelRect) =>
          r1.BoundingClientRect.top - r2.BoundingClientRect.top
      );
    } else {
      // Sort the rects from bottom to top
      axisLabelRects.sort(
        (r1: AxisLabelRect, r2: AxisLabelRect) =>
          r2.BoundingClientRect.top - r1.BoundingClientRect.top
      );
    }

    Log.red(LOG_CATEGORIES.InnovativeLogTicks)(
      "all axisLabelRects",
      axisLabelRects,
      "powerLabels",
      powerLabels
    );

    if (iterations % 2 == 0) {
      topDownLabelsClash = removeLabelClashes(
        axisLabelRects,
        powerLabels,
        true,
        iterations > allTicks.length * 3
      );
    } else {
      bottomUpLabelsClash = removeLabelClashes(
        axisLabelRects,
        powerLabels,
        false,
        iterations > allTicks.length * 3
      );
    }

    iterations++;
    Log.red(LOG_CATEGORIES.InnovativeLogTicks)(
      "Done iteration",
      iterations % 2 == 0 ? "TopDown" : "BottomUp",
      bottomUpLabelsClash,
      topDownLabelsClash,
      iterations
    );
  }

  return { yScale: yScale, yAxisRendered: yAxisRendered };
}
