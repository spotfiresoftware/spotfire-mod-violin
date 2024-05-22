/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

import {
  getBorderColor,
  getComparisonCircleHighlightedColor,
  getComplementaryColor,
  getContrastingColor,
  Log,
  LOG_CATEGORIES,
} from "./index";
// @ts-ignore
import * as d3 from "d3";
import { D3_SELECTION, Data, Options } from "./definitions";
import { Tooltip } from "spotfire-api";

export function renderComparisonCircles(
  config: Partial<Options>,
  trellisIndex: number,
  mainVisualg: D3_SELECTION,
  containerg: D3_SELECTION,
  xScale: d3.scaleBand,
  yScale: d3.scale,
  tooltip: Tooltip,
  heightAvailable: number,
  plotData: Data,
  backgroundColor: string,
  state: any
) {
  containerg
    .append("clipPath")
    .attr("id", "comparison-clip-" + trellisIndex)
    .append("rect")
    .attr("y", xScale("Comparison"))
    .attr("height", xScale.bandwidth)
    .attr("width", Math.abs(yScale(plotData.yDataDomain.max) - yScale(plotData.yDataDomain.min)) + 10)
    .attr("fill", "none");

  // To "cover up" any gridlines
  containerg
    .append("rect")
    .attr("y", xScale("Comparison"))
    .attr("height", xScale.bandwidth)
    .attr("width", Math.abs(yScale(plotData.yDataDomain.max) - yScale(plotData.yDataDomain.min)) + 10)
    .attr("fill", backgroundColor);

  containerg
    .selectAll(".comparison-circle")
    .data(plotData.comparisonCirclesData)
    .enter()
    .append("g")
    .append("circle")
    .attr("clip-path", "url(#comparison-clip-" + trellisIndex + ")")
    .attr("cy", xScale("Comparison") + xScale.bandwidth() / 2)
    .attr("cx", (d: any) => yScale(d[1].y0))
    .attr("r", (d: any) =>
      Math.abs(yScale(d[1].y0) - yScale(d[1].y0 - d[1].radius))
    )
    .classed("comparison-circle", true)
    //.classed("markable", true)
    .on("mouseover", function (event: d3.event, d: any) {
      Log.green(LOG_CATEGORIES.Rendering)("mouseover");
      tooltip.show(d[0] + "\n" + "Avg: " + config.FormatNumber(d[1].y0));
      d3.select(event.currentTarget)
        .classed("comparison-circle-highlighted", true)
        .attr(
          "style",
          "stroke:" + getComparisonCircleHighlightedColor(backgroundColor)
        );

      const minY = 
        plotData.rowDataGroupedByCat.get(d[0])[0].y;
      
      const maxY =
        plotData.rowDataGroupedByCat.get(d[0])[plotData.rowDataGroupedByCat.get(d[0]).length - 1].y;
      
      // draw a rect around the box area
      Log.green(LOG_CATEGORIES.ShowHighlightRect)(
        d,
        xScale(d[0]),
        plotData.rowDataGroupedByCat.get(d[0])
      );
      mainVisualg
        .append("rect")
        .attr("id", "highlightRect")
        .attr("y", xScale(d[0]))
        .attr("x", yScale(minY))
        .attr("width", Math.abs(yScale(minY) - yScale(maxY)))
        .attr("style", "opacity:0.9")
        .attr("stroke", getComparisonCircleHighlightedColor(backgroundColor))
        .classed("comparison-circle-highlighted", true)
        .attr("height", xScale.bandwidth() + 1);
      highlightComparisonCircles(
        mainVisualg,
        xScale,
        heightAvailable,
        d[0],
        plotData.comparisonCirclesData,
        backgroundColor
      );
    })
    .on("mouseout", (event: MouseEvent) => {
      d3.select("#highlightRect").remove();
      Log.green(LOG_CATEGORIES.Rendering)("mouseout");
      d3.select(event.currentTarget).attr("style", "");
      highlightMarkedComparisonCircles(
        mainVisualg,
        xScale,
        heightAvailable,
        config,
        plotData,
        backgroundColor
      );
      tooltip.hide();
    })
    .on("click", (event: MouseEvent, d: any) => {
      Log.green(LOG_CATEGORIES.Rendering)("click");
      event.stopPropagation();
      state.disableAnimation = true;
      plotData.mark(
        plotData.rowDataGroupedByCat.get(d[0]).map((p: any) => p.row),
        event.ctrlKey ? "ToggleOrAdd" : "Replace"
      );
    });
  highlightMarkedComparisonCircles(
    mainVisualg,
    xScale,
    heightAvailable,
    config,
    plotData,
    backgroundColor
  );
}

export function highlightMarkedComparisonCircles(
  g: D3_SELECTION,
  xScale: d3.scaleBand,
  heightAvailable: number,
  config: Partial<Options>,
  plotData: Data,
  backgroundColor: string
) {
  if (!config.comparisonCirclesEnabled.value()) return; // Don't do anything if comparison circles are not enabled
  // Now work out what data is marked, and highlight the appropriate circles
  const markedCategories = [];
  for (const [category, value] of plotData.rowDataGroupedByCat) {
    if (value.some((p: any) => p.Marked)) markedCategories.push(category);
  }

  // Does not make sense to highlight a comparison circle if anything other than a single category is marked
  if (markedCategories.length == 1) {
    highlightComparisonCircles(
      g,
      xScale,
      heightAvailable,
      markedCategories[0],
      plotData.comparisonCirclesData,
      backgroundColor
    );
  } else {
    highlightComparisonCircles(
      g,
      xScale,
      heightAvailable,
      null,
      plotData.comparisonCirclesData,
      backgroundColor
    );
  }
}

export function highlightComparisonCircles(
  g: D3_SELECTION,
  xScale: d3.scaleBand,
  heightAvailable: number,
  xValueHighlighted: any,
  comparisonCirclesData: any,
  backgroundColor: string
) {
  Log.green(LOG_CATEGORIES.Rendering)("in highlight");
  const d = comparisonCirclesData.get(xValueHighlighted);
  d3.selectAll(".comparison-line").remove();
  d3.selectAll(".comparison-tick").remove();
  g.selectAll(".comparison-circle").classed("comparison-circle", true);
  g.selectAll(".comparison-circle").classed(
    "comparison-circle-highlighted",
    false
  );
  g.selectAll(".comparison-circle").classed(
    "comparison-circle-significantly-different",
    false
  );
  if (xValueHighlighted == null) return; // Nothing highlighted
  // highlight the significant differences
  const r1 = d.radius;
  const y1 = d.y0;
  g.selectAll(".comparison-circle").each(function (
    this: SVGCircleElement,
    c: any,
    j: any
  ) {
    /** Now determine if circles are significantly different and highlight accordingly
     * Note - there is some significant code that's not required right now but could be extended
     * further - it would be nice to be able to show just _how_ different they are.
     * */
    if (c) {
      Log.green(LOG_CATEGORIES.Rendering)(this, c, j, comparisonCirclesData);
      const circle2Data = comparisonCirclesData.get(c[0]);

      if (c != d) {
        const r2 = c[1].radius;
        const y2 = c[1].y0;
        Log.green(LOG_CATEGORIES.Rendering)(
          r1,
          r2,
          y1,
          y2,
          y1 - y2,
          Math.sqrt(r1 * r1 + r2 * r2)
        );
        circle2Data.diffMean = Math.abs(y1 - y2);
        circle2Data.pythagorus = Math.sqrt(r1 * r1 + r2 * r2);
        circle2Data.overallDiff = circle2Data.pythagorus - circle2Data.diffMean;
      } else {
        circle2Data.diffMean = 0;
        circle2Data.pythagorus = 0;
        circle2Data.overallDiff = 0;
      }
      circle2Data.isSignificantlyDifferent =
        circle2Data.diffMean > circle2Data.pythagorus;
    }
  });

  //const maxDiff = d3.max(Array.from(comparisonCirclesData.entries()).map((c: any) => c[1].overallDiff));
  //const minDiff = d3.min(Array.from(comparisonCirclesData.entries()).map((c: any) => c[1].overallDiff));

  g.selectAll(".comparison-circle").classed(
    "comparison-circle-significantly-different",
    (c: any) => {
      Log.green(LOG_CATEGORIES.Rendering)(c[1].diffMean, c[1].pythagorus);
      if (!c) return false;
      return c[1].isSignificantlyDifferent;
    }
  );

  g.selectAll(".comparison-circle").classed(
    "comparison-circle-highlighted",
    (c: any) => {
      Log.green(LOG_CATEGORIES.Rendering)(c[1].diffMean, c[1].pythagorus);
      if (!c) return false;
      Log.green(LOG_CATEGORIES.Rendering)(c);
      return c[0] == xValueHighlighted;
    }
  );

  const line = d3.line()([
    [xScale.bandwidth() / 2, heightAvailable + 5],
    [xScale("Comparison") - xScale.bandwidth() / 2, heightAvailable + 5],
  ]);

  let circleIdx = 0;
  Array.from(comparisonCirclesData.entries()).forEach((c: any) => {
    if (c[0] != xValueHighlighted) {
      const tick = d3.line()([
        [0, xScale(c[0]) + xScale.bandwidth() / 2],
        [10, xScale(c[0]) + xScale.bandwidth() / 2,],
      ]);

      g.append("path")
        .attr("d", tick)
        .attr("class", "comparison-tick")
        .classed("comparison-circle", true)
        .classed(
          "comparison-circle-significantly-different",
          c[1].isSignificantlyDifferent
        )
        .attr("shape-rendering", "crispEdges")
        .attr("stroke", "red")
        .attr("stroke-width", "1px");
    } else {
      g.append("circle")
        .attr("cy", xScale(c[0]) + xScale.bandwidth() / 2)
        .attr("cx", (Math.min(xScale.bandwidth() / 4, 10)))
        .attr("r", Math.min(xScale.bandwidth() / 4, 10))
        .attr("class", "comparison-tick")
        .attr("shape-rendering", "crispEdges")
        .attr("stroke", getComparisonCircleHighlightedColor(backgroundColor))
        .attr("fill", "none")
        .attr("stroke-width", "1px");
    }
    circleIdx++;
  });
}
