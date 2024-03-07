//@ts-ignore
import * as d3 from "d3";

import {
  DataViewRow,
  GeneralStylingInfo,
  ScaleStylingInfo,
  Tooltip,
} from "spotfire-api";
import { Data, Options, RenderState, RowData } from "./definitions";
import {
  LOG_CATEGORIES,
  Log,
  getBoxBorderColor,
  getMarkerHighlightColor,
} from "./index";

export function renderBoxplot(
  styling: {
    generalStylingInfo: GeneralStylingInfo;
    scales: ScaleStylingInfo;
  },
  trellisName: string,
  rowsToBeMarked: DataViewRow[],
  plotData: Data,
  xScale: any,
  yScale: any,
  height: number,
  g: any,
  tooltip: Tooltip,
  xAxisSpotfire: Spotfire.Axis,
  state: RenderState,
  animationSpeed: number,
  config: Partial<Options>
) {
  const isScaleLog = config.yAxisLog.value();

  /**
   * Add box plot if option is selected
   */
  Log.green(LOG_CATEGORIES.Data)(plotData.dataPoints, xScale);
  const boxWidth = xScale.bandwidth() / (10 - config.boxWidth.value() + 1);
  const verticalLinesX = xScale.bandwidth() / 2 - boxWidth / 5 / 2 + 0.5;
  const linesWidth = boxWidth / 5;

  const boxplot = g
    .selectAll("boxplot")
    // "Filter" the sumStats maps to exclude empty values
    .data(
      [...plotData.sumStats].filter((s: any) => {
        return s[1].q1 != undefined;
      })
    )
    .enter() // So now we are working group per group
    .append("g")
    .attr("transform", function (d: any) {
      Log.green(LOG_CATEGORIES.Rendering)("boxd", d);
      return "translate(" + xScale(d[0]) + " ,0)";
    });

  function notMarked(d: any, isOutlier: boolean = false): boolean {
    // Straightforward cases
    if (!plotData.isAnyMarkedRecords) return false;        
    if (!config.areColorAndXAxesMatching && isOutlier) return false;
    if (!config.areColorAndXAxesMatching) return plotData.isAnyMarkedRecords && !d.dataPoints.some((p: RowData) => p.Marked);
    if (config.areColorAndXAxesMatching && !config.useFixedBoxColor.value()) return false;
    return !d.dataPoints?.some((p: RowData) => p.Marked);
  }

  // Q3 to UAV (Upper Adjacent Value) - top vertical line
  boxplot
    .append("rect")
    .datum((d: any) => {
      const dataPoints = plotData.dataPoints.filter(
        (r: RowData) =>
          r.y <= d[1].uav &&
          r.y > d[1].q3 &&
          r.category === d[0] &&
          r.trellis == d[1].trellis
      );
      
      let colorDataPoint = dataPoints.find((d:RowData) => d.Marked);
      if (colorDataPoint == undefined) {
        colorDataPoint = dataPoints[0];
      }

      return {
        category: d[0],
        dataPoints: dataPoints,
        stats: d[1],
        color:
          !config.areColorAndXAxesMatching || config.useFixedBoxColor.value()
            ? config.boxPlotColor.value()
            : colorDataPoint
            ? colorDataPoint.Color
            : "darkgray",
      };
    })
    .classed("markable", true)
    .attr("x", verticalLinesX)
    .attr("y", function (d: any) {
      return yScale(d.stats?.uav) as number;
    })
    .attr("height", (d: any) => yScale(d.stats?.q3) - yScale(d.stats?.uav))
    .attr("width", linesWidth)
    .attr("stroke", (d: any) => getBoxBorderColor(d.color))
    .attr("fill", (d: any) => d.color)
    .style("opacity", config.boxOpacity)
    .classed("not-marked", (d: any) => notMarked(d))
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(
        d.category +
          "\nQ3 to UAV" +
          "\nQ3: " +
          config.FormatNumber(d.stats.q3) +
          "\nUAV: " +
          config.FormatNumber(d.stats.uav) +
          "\nCount: " +
          d.dataPoints.length
      );
      // draw a rect around the box area
      g.append("rect")
        .attr("id", "box-plot-highlight-rect")
        .attr(
          "stroke",
          getMarkerHighlightColor(styling.generalStylingInfo.backgroundColor)
        )
        .attr(
          "x",
          (xScale(d.category) ? xScale(d.category) : 0) + verticalLinesX
        )
        .attr("y", yScale(d.stats.uav))
        .attr("height", Math.max(0, yScale(d.stats.q3) - yScale(d.stats.uav)))
        .attr("width", linesWidth);
    })
    .on("mouseout", () => {
      tooltip.hide();
      d3.select("#box-plot-highlight-rect").remove();
    })
    .on("click", (event: MouseEvent, d: any) => {
      state.disableAnimation = true;
      plotData.mark(
        d.dataPoints.map((r: any) => r.row) as DataViewRow[],
        event.ctrlKey ? "ToggleOrAdd" : "Replace"
      );
    });

  //- top horizontal line (UAV)
  boxplot
    .append("rect")
    .datum((d: any) => {
      const dataPoints = plotData.dataPoints.filter(
        (r: any) =>
          r.y == d[1].uav && r.category === d[0] && r.trellis == d[1].trellis
      );

      let colorDataPoint = dataPoints.find((d:RowData) => d.Marked);
      if (colorDataPoint == undefined) {
        colorDataPoint = dataPoints[0];
      }

      return {
        category: d[0],
        dataPoints: dataPoints,
        stats: d[1],
        color:
          !config.areColorAndXAxesMatching || config.useFixedBoxColor.value()
            ? config.boxPlotColor.value()
            : colorDataPoint
            ? colorDataPoint.Color
            : "darkgray",
      };
    })
    .classed("markable", true)
    .attr("x", xScale.bandwidth() / 2 - boxWidth / 2)
    .attr("y", function (d: any) {
      return (yScale(d.stats.uav) - 2) as number;
    })
    .attr("height", 4)
    .attr("width", boxWidth)
    .attr("stroke", (d: any) => getBoxBorderColor(d.color))
    .attr("fill", (d: any) => d.color)
    .style("opacity", config.boxOpacity)
    //.style("stroke-width", height < 600 ? 3 : 5)
    .classed("not-marked", (d: any) => notMarked(d))
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(
        d.category +
          "\nUAV" +
          "\nUAV: " +
          config.FormatNumber(d.stats.uav) +
          "\nCount: " +
          d.dataPoints.length
      );
      // draw a rect around the box area
      g.append("rect")
        .attr("id", "box-plot-highlight-rect")
        .attr(
          "stroke",
          getMarkerHighlightColor(styling.generalStylingInfo.backgroundColor)
        )
        .attr(
          "x",
          (xScale(d.category) ? xScale(d.category) : 0) +
            xScale.bandwidth() / 2 -
            boxWidth / 2
        )
        .attr("y", yScale(d.stats.uav) - 2)
        .attr("height", 4)
        .attr("width", boxWidth);
    })
    .on("mouseout", () => {
      tooltip.hide();
      d3.select("#box-plot-highlight-rect").remove();
    })
    .on("click", (event: MouseEvent, d: any) => {
      state.disableAnimation = true;
      plotData.mark(
        d.dataPoints.map((r: any) => r.row) as DataViewRow[],
        event.ctrlKey ? "ToggleOrAdd" : "Replace"
      );
    })
    .transition()
    .duration(animationSpeed)
    .attr("x1", xScale.bandwidth() / 2 - boxWidth / 2)
    .attr("x2", xScale.bandwidth() / 2 + boxWidth / 2);

  // LAV (Lower Adjacent Value) to Q1 - bottom vertical line
  boxplot
    .append("rect")
    .datum((d: any) => {
      const dataPoints = plotData.dataPoints.filter(
        (r: any) =>
          r.y >= d[1].lav &&
          r.y < d[1].q1 &&
          r.category === d[0] &&
          r.trellis == d[1].trellis
      );
      
      let colorDataPoint = dataPoints.find((d:RowData) => d.Marked);
      if (colorDataPoint == undefined) {
        colorDataPoint = dataPoints[0];
      }
      
      return {
        category: d[0],
        dataPoints: dataPoints,
        stats: d[1],
        color:
          !config.areColorAndXAxesMatching || config.useFixedBoxColor.value()
            ? config.boxPlotColor.value()
            : colorDataPoint
            ? colorDataPoint.Color
            : "darkgray",
      };
    })
    .classed("markable", true)
    .attr("x", verticalLinesX)
    .attr("y", (d: any) => yScale(d.stats?.q1))
    .attr("height", (d: any) => yScale(d.stats?.lav) - yScale(d.stats?.q1))
    .attr("width", linesWidth)
    .attr("stroke", (d: any) => getBoxBorderColor(d.color))
    .attr("fill", (d: any) => d.color)
    .style("opacity", config.boxOpacity)
    .classed("not-marked", (d: any) => notMarked(d))
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(
        d.category +
          "\nLAV to Q1" +
          "\nLAV: " +
          config.FormatNumber(d.stats.lav) +
          "\nQ1: " +
          config.FormatNumber(d.stats.q1) +
          "\nCount: " +
          d.dataPoints.length
      );
      //d3.select(event.currentTarget).classed("boxplot-highlighted", true);
      // draw a rect around the box area
      g.append("rect")
        .attr("id", "box-plot-highlight-rect")
        .attr(
          "stroke",
          getMarkerHighlightColor(styling.generalStylingInfo.backgroundColor)
        )

        .attr(
          "x",
          (xScale(d.category) ? xScale(d.category) : 0) + verticalLinesX
        )
        .attr("y", yScale(d.stats.q1))
        .attr("height", Math.max(0, yScale(d.stats.lav) - yScale(d.stats.q1)))
        .attr("width", linesWidth);
    })
    .on("mouseout", () => {
      tooltip.hide();
      d3.select("#box-plot-highlight-rect").remove();
    })
    .on("click", (event: MouseEvent, d: any) => {
      state.disableAnimation = true;
      plotData.mark(
        d.dataPoints.map((r: any) => r.row) as DataViewRow[],
        event.ctrlKey ? "ToggleOrAdd" : "Replace"
      );
    })
    .transition()
    .duration(animationSpeed)
    .attr("y1", function (d: any) {
      return yScale(d.stats.q1) as number;
    })
    .attr("y2", function (d: any) {
      return yScale(d.stats.lav) as number;
    });

  //bottom horizontal line
  boxplot
    .append("rect")
    .datum((d: any) => {
      const dataPoints = plotData.dataPoints.filter(
        (r: any) =>
          r.y == d[1].lav && r.category === d[0] && r.trellis == d[1].trellis
      );

      let colorDataPoint = dataPoints.find((d:RowData) => d.Marked);
      if (colorDataPoint == undefined) {
        colorDataPoint = dataPoints[0];
      }
      
      return {
        category: d[0],
        dataPoints: dataPoints,
        stats: d[1],
        color:
          !config.areColorAndXAxesMatching || config.useFixedBoxColor.value()
            ? config.boxPlotColor.value()
            : colorDataPoint
            ? colorDataPoint.Color
            : "darkgray",
      };
    })
    .classed("markable", true)
    .attr("x", xScale.bandwidth() / 2 - boxWidth / 2)

    .attr("y", function (d: any) {
      return (yScale(d.stats.lav) - 2) as number;
    })

    .attr("height", 4)
    .attr("width", boxWidth)
    .attr("stroke", (d: any) => getBoxBorderColor(d.color))
    .attr("fill", (d: any) => d.color)
    .style("opacity", config.boxOpacity)
    .classed("not-marked", (d: any) => notMarked(d))
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(
        d.category +
          "\nLAV" +
          "\nLAV: " +
          config.FormatNumber(d.stats.lav) +
          "\nCount: " +
          d.dataPoints.length
      );
      // draw a rect around the box area
      g.append("rect")
        .attr("id", "box-plot-highlight-rect")
        .attr(
          "stroke",
          getMarkerHighlightColor(styling.generalStylingInfo.backgroundColor)
        )

        .attr(
          "x",
          (xScale(d.category) ? xScale(d.category) : 0) +
            xScale.bandwidth() / 2 -
            boxWidth / 2
        )
        .attr("y", yScale(d.stats.lav) - 2)
        .attr("height", 4)
        .attr("width", boxWidth);
    })
    .on("mouseout", () => {
      tooltip.hide();
      d3.select("#box-plot-highlight-rect").remove();
    })
    .on("click", (event: MouseEvent, d: any) => {
      state.disableAnimation = true;
      plotData.mark(
        d.dataPoints.map((r: any) => r.row) as DataViewRow[],
        event.ctrlKey ? "ToggleOrAdd" : "Replace"
      );
    })
    .transition()
    .duration(animationSpeed)
    .attr("x1", xScale.bandwidth() / 2 - boxWidth / 2)
    .attr("x2", xScale.bandwidth() / 2 + boxWidth / 2);

  //top box
  boxplot
    .append("rect")
    .datum((d: any) => {
      const dataPoints = plotData.dataPoints.filter(
        (r: any) =>
          r.y >= d[1].median &&
          r.y <= d[1].q3 &&
          r.category === d[0] &&
          r.trellis == d[1].trellis
      );
      
      let colorDataPoint = dataPoints.find((d:RowData) => d.Marked);
      if (colorDataPoint == undefined) {
        colorDataPoint = dataPoints[0];
      }    

      return {
        category: d[0],
        dataPoints,
        color:
          !config.areColorAndXAxesMatching || config.useFixedBoxColor.value()
            ? config.boxPlotColor.value()
            : colorDataPoint
            ? colorDataPoint.Color
            : "darkgray",
        stats: d[1],
      };
    })
    .classed("markable", true)
    .attr("x", xScale.bandwidth() / 2)
    .attr("y", function (d: any) {
      Log.blue(LOG_CATEGORIES.DebugSingleRowMarking)(
        "d",
        d,
        d.stats.q3,
        "yScale",
        yScale(d.stats.q3)
      );
      return yScale(d.stats.q3) as number;
    })
    .attr("height", function (d: any) {
      return Math.max(0, yScale(d.stats.median) - yScale(d.stats.q3)) as number;
    })
    .attr("width", 0)
    .attr("stroke", (d: any) => getBoxBorderColor(d.color))
    .style("fill", (d: any) => {
      return d.color;
    })
    .style("opacity", config.boxOpacity)
    .classed("not-marked", (d: any) => notMarked(d))
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(
        d.category +
          "\nQ3: " +
          config.FormatNumber(d.stats.q3) +
          "\nMedian: " +
          config.FormatNumber(d.stats.median) +
          "\nCount: " +
          d.dataPoints.length
      );
      // draw a rect around the box area
      g.append("rect")
        .attr("id", "box-plot-highlight-rect")
        .attr(
          "stroke",
          getMarkerHighlightColor(styling.generalStylingInfo.backgroundColor)
        )

        .attr(
          "x",
          (xScale(d.category) ? xScale(d.category) : 0) +
            xScale.bandwidth() / 2 -
            boxWidth / 2
        )
        .attr("y", yScale(d.stats.q3))
        .attr(
          "height",
          Math.max(0, yScale(d.stats.median) - yScale(d.stats.q3))
        )
        .attr("width", boxWidth);
    })
    .on("mouseout", () => {
      tooltip.hide();
      d3.select("#box-plot-highlight-rect").remove();
    })
    .on("click", (event: MouseEvent, d: any) => {
      state.disableAnimation = true;
      plotData.mark(
        d.dataPoints.map((r: any) => r.row) as DataViewRow[],
        event.ctrlKey ? "ToggleOrAdd" : "Replace"
      );
    })
    .transition()
    .duration(animationSpeed)
    .attr("x", xScale.bandwidth() / 2 - boxWidth / 2)
    .attr("width", boxWidth);

  //bottom box
  boxplot
    .append("rect")
    .datum((d: any) => {
      Log.green(LOG_CATEGORIES.DebugMedian)(d);
      const dataPoints = plotData.dataPoints.filter(
        (r: any) =>
          r.y >= d[1].q1 &&
          r.row?.continuous("Y").value() < d[1].median &&
          r.category === d[0] &&
          r.trellis == d[1].trellis
      );
      
      let colorDataPoint = dataPoints.find((d:RowData) => d.Marked);
      if (colorDataPoint == undefined) {
        colorDataPoint = dataPoints[0];
      }

      return {
        category: d[0],
        dataPoints: dataPoints,
        stats: d[1],
        color:
          !config.areColorAndXAxesMatching || config.useFixedBoxColor.value()
            ? config.boxPlotColor.value()
            : colorDataPoint
            ? colorDataPoint.Color
            : "darkgray",
      };
    })
    .classed("markable", true)
    .attr("x", xScale.bandwidth() / 2)
    .attr("y", function (d: any) {
      return yScale(d.stats.median) as any;
    })
    .attr("height", function (d: any) {
      return Math.max(0, yScale(d.stats.q1) - yScale(d.stats.median)) as number;
    })
    .attr("width", 0)
    .style("fill", (d: any) => d.color)
    .style("opacity", config.boxOpacity)
    .attr("stroke", (d: any) => getBoxBorderColor(d.color))
    .classed("not-marked", (d: any) => notMarked(d))
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(
        d.category +
          "\nQ1: " +
          config.FormatNumber(d.stats.q1) +
          "\nMedian: " +
          config.FormatNumber(d.stats.median) +
          "\nCount: " +
          d.dataPoints.length
      );
      // draw a rect around the box area
      g.append("rect")
        .attr("id", "box-plot-highlight-rect")
        .attr(
          "stroke",
          getMarkerHighlightColor(styling.generalStylingInfo.backgroundColor)
        )

        .attr(
          "x",
          (xScale(d.category) ? xScale(d.category) : 0) +
            xScale.bandwidth() / 2 -
            boxWidth / 2
        )
        .attr("y", yScale(d.stats.median))
        .attr(
          "height",
          Math.max(0, yScale(d.stats.q1) - yScale(d.stats.median))
        )
        .attr("width", boxWidth);
    })
    .on("mouseout", () => {
      tooltip.hide();
      d3.select("#box-plot-highlight-rect").remove();
    })
    .on("click", (event: MouseEvent, d: any) => {
      state.disableAnimation = true;
      plotData.mark(
        d.dataPoints.map((r: any) => r.row) as DataViewRow[],
        event.ctrlKey ? "ToggleOrAdd" : "Replace"
      );
    })
    .transition()
    .duration(animationSpeed)
    .attr("x", xScale.bandwidth() / 2 - boxWidth / 2)
    .attr("width", boxWidth);

  // median
  boxplot
    .append("line")
    .datum((d: any) => {
      Log.green(LOG_CATEGORIES.DebugMedian)("Datum", d);
      return {
        category: d[0],
        dataPoints: plotData.dataPoints.filter(
          (r: any) =>
            r.y == d[1].median &&
            r.category === d[0] &&
            r.trellis == d[1].trellis
        ),
        stats: d[1],
      };
    })
    .classed("markable", false)
    .classed("median-line", true)
    .style("opacity", 1)
    .attr("x1", xScale.bandwidth() / 2 - boxWidth / 2)
    .attr("x2", xScale.bandwidth() / 2 + boxWidth / 2)
    .attr("y1", function (d: any) {
      //Log.green(LOG_CATEGORIES.DebugMedian)(d, d.median, yScale(d.median));
      return yScale(d.stats.median) as number;
    })
    .attr("y2", function (d: any) {
      return yScale(d.stats.median) as number;
    })
    .attr("stroke", styling.generalStylingInfo.backgroundColor)
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(
        d.category + "\nMedian: " + config.FormatNumber(d.stats.median)
      );
      // draw a rect around the median area
      g.append("rect")
        .attr("id", "box-plot-highlight-rect")
        .attr(
          "stroke",
          getMarkerHighlightColor(styling.generalStylingInfo.backgroundColor)
        )
        .attr(
          "x",
          (xScale(d.category) ? xScale(d.category) : 0) +
            xScale.bandwidth() / 2 -
            boxWidth / 2 -
            (height < 600 ? 2 : 5) / 2
        )
        .attr("y", yScale(d.stats.median) - 2)
        .attr("height", "4px")
        .attr("width", boxWidth + (height < 600 ? 2 : 5));
    })
    .on("mouseout", () => {
      tooltip.hide();
      d3.select("#box-plot-highlight-rect").remove();
    });

  /**Radius of individual data   point circles */
  const pointRadius = (height * config.circleSize.value()) / 1000;

  // We are only ever plotting outlier points.
  let maxPointsCount = 0;
  for (const [, value] of plotData.sumStats) {
    maxPointsCount = Math.max(maxPointsCount, value.outlierCount);
  }

  g.selectAll("indPoints")
    .data(plotData.dataPointsGroupedByCat)
    .enter()
    .append("g")
    .attr("transform", function (d: any) {
      return "translate(" + xScale(d[0]) + " ,0)";
    })
    .selectAll("circlegroups")
    .data((d: any) => {
      // d is an array. [0] = category, [1] = array of RowData
      return d[1].filter((p: RowData) => {
        return (
          (p.y > plotData.sumStats.get(d[0]).uav ||
            p.y < plotData.sumStats.get(d[0]).lav) &&
          p.trellis == trellisName
        );
      });
    })
    .enter()
    .append("circle")
    .classed("markable-points", true)
    .classed("not-marked", (d: any) => notMarked(d, true))
    .attr("cx", function () {
      return xScale.bandwidth() / 2;
    })
    .attr("cy", function (d: RowData) {
      Log.green(LOG_CATEGORIES.DebugLogYAxis)("cy", d, d.y, yScale(d.y));
      return yScale(d.y) as number;
    })
    .attr("r", pointRadius)
    .style("fill", (d: RowData) =>
      config.useFixedBoxColor.value() && config.areColorAndXAxesMatching
        ? config.boxPlotColor.value()
        : d.Color
    )
    .attr("stroke", (d: RowData) => getBoxBorderColor(d.Color))
    .attr("stroke-width", "0.5px")
    .on("mouseover", function (event: MouseEvent, d: RowData) {
      // A highlight circle is a black ring overlaid on a white ring
      // in light mode, and a white circle overlaid on a black ring in dark mode
      g.append("circle")
        .attr("transform", "translate(" + xScale(d.category) + " ,0)")
        .attr("id", "highlightcircle")
        .classed("point-highlighted", true)
        .attr("cx", xScale.bandwidth() / 2)
        .attr("cy", yScale(d.y))
        .attr("r", pointRadius + 3)
        .attr("stroke", styling.generalStylingInfo.backgroundColor)
        .attr("stroke-width", "3px");
      g.append("circle")
        .attr("transform", "translate(" + xScale(d.category) + " ,0)")
        .attr("id", "highlightcircle")
        .classed("point-highlighted", true)
        .attr("cx", xScale.bandwidth() / 2)
        .attr("cy", yScale(d.y))
        .attr("r", pointRadius + 3)
        .attr(
          "stroke",
          getMarkerHighlightColor(styling.generalStylingInfo.backgroundColor)
        ) // adjustColor(d.Color, -40));
        .attr("stroke-width", "1px");

      Log.red(LOG_CATEGORIES.ColorViolin)(d);
      tooltip.show(
        d.category +
          "\n" +
          "y: " +
          config.FormatNumber(d.y) +
          "\n" +
          "Color: " +
          d.ColorValue
      );
      d3.select(event.currentTarget).classed("area-highlighted", true);
    })
    .on("mouseout", function (event: MouseEvent) {
      tooltip.hide();
      d3.selectAll(".point-highlighted").remove();
      d3.select(event.currentTarget).classed("area-highlighted", false);
    })
    .on("change", function (event: any, d: RowData) {
      rowsToBeMarked.push(d.row);
      Log.green(LOG_CATEGORIES.Rendering)("added");
    })
    .on("click", function (event: MouseEvent, d: RowData) {
      state.disableAnimation = true;
      plotData.mark([d.row], event.ctrlKey ? "ToggleOrAdd" : "Replace");
    });
}
