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
  getContrastingColor,
  getMarkerHighlightColor,
} from "./index";

export function renderBoxplot(
  styling: {
    generalStylingInfo: GeneralStylingInfo;
    scales: ScaleStylingInfo;
  },
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
  /**
   * Add box plot if option is selected
   */
  Log.green(LOG_CATEGORIES.Data)(plotData.rowData, xScale);
  const boxWidth = xScale.bandwidth() / (10 - config.boxWidth.value() + 1);
  const verticalLinesX = xScale.bandwidth() / 2 - boxWidth / 5 / 2 + 0.5;
  const linesWidth = boxWidth / 5;

  const boxplot = g
    .selectAll("boxplot")
    // "Filter" the sumStats maps to exclude empty values
    .data(plotData.rowDataGroupedByCat)
    // todo - IMPORTANT - filter for q1 != undefined.
    /*  [...plotData.sumStats].filter((s: any) => {
        return s[1].q1 != undefined;
      })
    )*/
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
    if (!config.areColorAndXAxesMatching)
      return (
        plotData.isAnyMarkedRecords &&
        !d.dataPoints.some((p: RowData) => p?.Marked)
      );
    if (config.areColorAndXAxesMatching && !config.useFixedBoxColor.value())
      return false;
    return !d.dataPoints?.some((p: RowData) => p?.Marked);
  }

  if (config.show95pctConfidenceInterval.value()) {
    // Confidence intervals
    boxplot
      .append("rect")
      .datum((d: any) => {
        Log.green(LOG_CATEGORIES.ConfidenceIntervals)(
          "datum, sumStats",
          d,
          plotData.sumStats.get(d[0])
        );
        return {
          category: d[0],
          confidenceIntervalLower: plotData.sumStats.get(d[0])
            .confidenceIntervalLower,
          confidenceIntervalUpper: plotData.sumStats.get(d[0])
            .confidenceIntervalUpper,
        };
      })
      .attr("x", verticalLinesX + boxWidth / 2 + linesWidth / 2)
      .attr("y", function (d: any) {
        return yScale(d.confidenceIntervalUpper) as number;
      })
      .attr("height", (d: any) =>
        !isNaN(
          yScale(d.confidenceIntervalLower) - yScale(d.confidenceIntervalUpper)
        )
          ? yScale(d.confidenceIntervalLower) -
            yScale(d.confidenceIntervalUpper)
          : 0
      )
      .attr("width", Math.max(linesWidth / 2, 4))
      .attr("stroke", (d: any) => getContrastingColor(styling.generalStylingInfo.backgroundColor))
      .attr("fill", (d: any) => getContrastingColor(styling.generalStylingInfo.backgroundColor))
      .style("opacity", config.boxOpacity)
      .classed("not-marked", (d: any) => notMarked(d))
      .on("mouseover", function (event: d3.event, d: any) {
        tooltip.show(
          d.category +
            (d.count == 0 ? "\nNo Data" : "") +
            "\n95% Confidence Interval:" +
            "\n" +
            "L95 " +
            config.FormatNumber(d.confidenceIntervalLower) +
            "\nU95: " +
            config.FormatNumber(d.confidenceIntervalUpper)
        );
      });
  }

  // Q3 to UAV (Upper Adjacent Value) - top vertical line
  boxplot
    .append("rect")
    .datum((d: any) => {
      Log.green(LOG_CATEGORIES.DebugBigData)("datum, plotData", d, plotData);
      const now = performance.now();
      const dataPoints = d[1].filter(
        (r: RowData) =>
          r.y <= plotData.sumStats.get(d[0]).uav &&
          r.y > plotData.sumStats.get(d[0]).q3
      );
      Log.green(LOG_CATEGORIES.DebugBigData)(
        "top vertical line filtering",
        performance.now() - now
      );

      let colorDataPoint = dataPoints.find((d: RowData) => d?.Marked);
      if (colorDataPoint == undefined) {
        colorDataPoint = dataPoints[0];
      }

      return {
        category: d[0],
        dataPoints: dataPoints,
        color:
          !config.areColorAndXAxesMatching || config.useFixedBoxColor.value()
            ? config.boxPlotColor.value()
            : colorDataPoint
            ? colorDataPoint.Color
            : "url(#no_data)",
        uav: plotData.sumStats.get(d[0])?.uav,
        q3: plotData.sumStats.get(d[0])?.q3,
        count: dataPoints.length,
      };
    })
    .classed("markable", true)
    .attr("x", verticalLinesX)
    .attr("y", function (d: any) {
      Log.green(LOG_CATEGORIES.DebugBigData)("d for Q3 to UAV", d);
      return yScale(d.uav) as number;
    })
    .attr("height", (d: any) => yScale(d.q3) - yScale(d.uav))
    .attr("width", linesWidth)
    .attr("stroke", (d: any) => getBoxBorderColor(d.color))
    .attr("fill", (d: any) => d.color)
    .style("opacity", config.boxOpacity)
    .classed("not-marked", (d: any) => notMarked(d))
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(
        d.category +
          (d.count == 0 ? "\nNo Data" : "") +
          "\nQ3 to UAV" +
          "\nQ3: " +
          config.FormatNumber(d.q3) +
          "\nUAV: " +
          config.FormatNumber(d.uav) +
          "\nCount: " +
          d.count
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
        .attr("y", yScale(d.uav))
        .attr("height", Math.max(0, yScale(d.q3) - yScale(d.uav)))
        .attr("width", linesWidth);
    })
    .on("mouseout", () => {
      tooltip.hide();
      d3.select("#box-plot-highlight-rect").remove();
    })
    .on("click", (event: MouseEvent, d: any) => {
      state.disableAnimation = true;
      plotData.mark(
        d.dataPoints.map((r: RowData) => r.row) as DataViewRow[],
        event.ctrlKey ? "ToggleOrAdd" : "Replace"
      );
    });

  //- top horizontal line (UAV)
  boxplot
    .append("rect")
    .datum((d: any) => {
      const dataPoints = [
        d[1].find((r: any) => r.y == plotData.sumStats.get(d[0]).uav),
      ];

      let colorDataPoint = dataPoints.find((d: RowData) => d?.Marked);
      if (colorDataPoint == undefined) {
        colorDataPoint = dataPoints[0];
      }

      return {
        category: d[0],
        dataPoints: dataPoints,
        color:
          !config.areColorAndXAxesMatching || config.useFixedBoxColor.value()
            ? config.boxPlotColor.value()
            : colorDataPoint
            ? colorDataPoint.Color
            : "url(#no-data)",
        uav: plotData.sumStats.get(d[0]).uav,
      };
    })
    .classed("markable", true)
    .attr("x", xScale.bandwidth() / 2 - boxWidth / 2)
    .attr("y", function (d: any) {
      return (yScale(d.uav) - 2) as number;
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
        d.category + "\nUAV" + "\nUAV: " + config.FormatNumber(d.uav)
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
        .attr("y", yScale(d.uav) - 2)
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
      const now = performance.now();

      const dataPoints = d[1].filter(
        (r: any) =>
          r.y >= plotData.sumStats.get(d[0]).lav &&
          r.y < plotData.sumStats.get(d[0]).q1
      );

      let colorDataPoint = dataPoints.find((d: RowData) => d?.Marked);
      if (colorDataPoint == undefined) {
        colorDataPoint = dataPoints[0];
      }

      Log.green(LOG_CATEGORIES.DebugBigData)(
        "bottom vertical line filtering",
        performance.now() - now
      );

      return {
        category: d[0],
        dataPoints: dataPoints,
        color:
          !config.areColorAndXAxesMatching || config.useFixedBoxColor.value()
            ? config.boxPlotColor.value()
            : colorDataPoint
            ? colorDataPoint.Color
            : "url(#no-data)",
        q1: plotData.sumStats.get(d[0]).q1,
        lav: plotData.sumStats.get(d[0]).lav,
        count: dataPoints.length,
      };
    })
    .classed("markable", true)
    .attr("x", verticalLinesX)
    .attr("y", (d: any) => yScale(d.q1))
    .attr("height", (d: any) => yScale(d.lav) - yScale(d.q1))
    .attr("width", linesWidth)
    .attr("stroke", (d: any) => getBoxBorderColor(d.color))
    .attr("fill", (d: any) => d.color)
    .style("opacity", config.boxOpacity)
    .classed("not-marked", (d: any) => notMarked(d))
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(
        d.category +
          (d.dataPoints.length == 0 ? "\nNo Data" : "") +
          "\nLAV to Q1" +
          "\nLAV: " +
          config.FormatNumber(d.lav) +
          "\nQ1: " +
          config.FormatNumber(d.q1) +
          "\nCount: " +
          d.count
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
        .attr("y", yScale(d.q1))
        .attr("height", Math.max(0, yScale(d.lav) - yScale(d.q1)))
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
      return yScale(d.q1) as number;
    })
    .attr("y2", function (d: any) {
      return yScale(d.lav) as number;
    });

  //bottom horizontal line
  boxplot
    .append("rect")
    .datum((d: any) => {
      const dataPoints = [
        d[1].find((r: any) => r.y == plotData.sumStats.get(d[0]).lav),
      ];

      let colorDataPoint = dataPoints.find((d: RowData) => d?.Marked);
      if (colorDataPoint == undefined) {
        colorDataPoint = dataPoints[0];
      }

      return {
        category: d[0],
        dataPoints: dataPoints,
        color:
          !config.areColorAndXAxesMatching || config.useFixedBoxColor.value()
            ? config.boxPlotColor.value()
            : colorDataPoint
            ? colorDataPoint.Color
            : "url(#no-data)",
        lav: plotData.sumStats.get(d[0]).lav,
      };
    })
    .classed("markable", true)
    .attr("x", xScale.bandwidth() / 2 - boxWidth / 2)

    .attr("y", function (d: any) {
      return (yScale(d.lav) - 2) as number;
    })

    .attr("height", 4)
    .attr("width", boxWidth)
    .attr("stroke", (d: any) => getBoxBorderColor(d.color))
    .attr("fill", (d: any) => d.color)
    .style("opacity", config.boxOpacity)
    .classed("not-marked", (d: any) => notMarked(d))
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(
        d.category + "\nLAV" + "\nLAV: " + config.FormatNumber(d.lav)
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
        .attr("y", yScale(d.lav) - 2)
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
      const dataPoints = d[1].filter(
        (r: any) =>
          r.y >= plotData.sumStats.get(d[0]).median &&
          r.y <= plotData.sumStats.get(d[0]).q3
      );

      let colorDataPoint = dataPoints.find((d: RowData) => d?.Marked);
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
            : "url(#no-data)",
        median: plotData.sumStats.get(d[0]).median,
        q3: plotData.sumStats.get(d[0]).q3,
        count: dataPoints.length,
      };
    })
    .classed("markable", true)
    .attr("x", xScale.bandwidth() / 2)
    .attr("y", function (d: any) {
      Log.blue(LOG_CATEGORIES.DebugSingleRowMarking)(
        "d",
        d,
        d.q3,
        "yScale",
        yScale(d.q3)
      );
      return yScale(d.q3) as number;
    })
    .attr("height", function (d: any) {
      return Math.max(0, yScale(d.median) - yScale(d.q3)) as number;
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
          (d.count == 0 ? "\nNo Data" : "") +
          "\nQ3: " +
          config.FormatNumber(d.q3) +
          "\nMedian: " +
          config.FormatNumber(d.median) +
          "\nCount: " +
          d.count
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
        .attr("y", yScale(d.q3))
        .attr("height", Math.max(0, yScale(d.median) - yScale(d.q3)))
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

      const dataPoints = d[1].filter(
        (r: any) =>
          r.y >= plotData.sumStats.get(d[0]).q1 &&
          r.y < plotData.sumStats.get(d[0]).median
      );

      let colorDataPoint = dataPoints.find((d: RowData) => d?.Marked);
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
            : "url(#no-data)",
        q1: plotData.sumStats.get(d[0]).q1,
        median: plotData.sumStats.get(d[0]).median,
        count: dataPoints.length,
      };
    })
    .classed("markable", true)
    .attr("x", xScale.bandwidth() / 2)
    .attr("y", function (d: any) {
      return yScale(d.median) as any;
    })
    .attr("height", function (d: any) {
      return Math.max(0, yScale(d.q1) - yScale(d.median)) as number;
    })
    .attr("width", 0)
    .style("fill", (d: any) => d.color)
    .style("opacity", config.boxOpacity)
    .attr("stroke", (d: any) => getBoxBorderColor(d.color))
    .classed("not-marked", (d: any) => notMarked(d))
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(
        d.category +
          (d.count == 0 ? "\nNo Data" : "") +
          "\nQ1: " +
          config.FormatNumber(d.q1) +
          "\nMedian: " +
          config.FormatNumber(d.median) +
          "\nCount: " +
          d.count
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
        .attr("y", yScale(d.median))
        .attr("height", Math.max(0, yScale(d.q1) - yScale(d.median)))
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
        median: plotData.sumStats.get(d[0]).median,
      };
    })
    .classed("markable", false)
    .classed("median-line", true)
    .style("opacity", 1)
    .attr("x1", xScale.bandwidth() / 2 - boxWidth / 2)
    .attr("x2", xScale.bandwidth() / 2 + boxWidth / 2)
    .attr("y1", function (d: any) {
      //Log.green(LOG_CATEGORIES.DebugMedian)(d, d.median, yScale(d.median));
      return yScale(d.median) as number;
    })
    .attr("y2", function (d: any) {
      return yScale(d.median) as number;
    })
    .attr("stroke", styling.generalStylingInfo.backgroundColor)
    .on("mouseover", function (event: d3.event, d: any) {
      tooltip.show(d.category + "\nMedian: " + config.FormatNumber(d.median));
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
        .attr("y", yScale(d.median) - 2)
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

  g.selectAll("outliers")
    .data(plotData.rowDataGroupedByCat)
    .enter()
    .append("g")
    .attr("transform", function (d: any) {
      return "translate(" + xScale(d[0]) + " ,0)";
    })
    .selectAll("circlegroups")
    .data((d: any) => {
      // d is an array. [0] = category, [1] = array of RowData
      const dataPoints = d[1].filter((p: RowData) => {
        return (
          p.y > plotData.sumStats.get(d[0]).uav ||
          p.y < plotData.sumStats.get(d[0]).lav
        );
      });

      // Group and count - one point for all y values that are the same;
      const rolledUp = new d3.rollup(
        dataPoints,
        (v: any) => d3.count(v, (d: any) => d.y),
        (d: any) => d.y,
        (c: any) => c.Color,
        (cv: any) => cv.ColorValue,
        (r: any) => r.row
      );

      Log.red(LOG_CATEGORIES.DebugBigData)("rolledUp", rolledUp);

      const points: any[] = [];

      // Transform the rolled up data into a structure that's easy to consume below
      // todo: simplify/tidy!
      rolledUp.forEach((key: any, yValue: any) => {
        key.forEach((key2: any, colorHexCode: any) => {
          const color =
            config.useFixedBoxColor.value() && config.areColorAndXAxesMatching
              ? config.boxPlotColor.value()
              : colorHexCode;
          key2.forEach((key3: any, colorValue: any) => {
            key3.forEach((count: any, row: any) => {
              points.push({
                category: d[0],
                y: yValue,
                color: color,
                ColorValue: colorValue,
                count: count,
                row: row,
              });
            });
          });
        });
      });

      Log.green(LOG_CATEGORIES.DebugBigData)("points", points);
      return points;
    })
    .enter()
    .append("circle")
    .classed("markable-points", true)
    .classed("not-marked", (d: any) => notMarked(d, true))
    .attr("cx", function () {
      return xScale.bandwidth() / 2;
    })
    .attr("cy", function (d: any) {
      Log.red(LOG_CATEGORIES.DebugBigData)("cy d", d);

      return yScale(d.y) as number;
    })
    .attr("r", pointRadius)
    .style("fill", (d: any) => d.color)
    .attr("stroke", (d: any) => getBoxBorderColor(d.color))
    .attr("stroke-width", "0.5px")
    .on("mouseover", function (event: MouseEvent, d: any) {
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
      tooltip.show(
        d.category +
          "\n" +
          "y: " +
          config.FormatNumber(d.y) +
          "\n" +
          "Color: " +
          d.ColorValue +
          "\n" +
          "Count:" +
          d.count
      );
      d3.select(event.currentTarget).classed("area-highlighted", true);
    })
    .on("mouseout", function (event: MouseEvent) {
      tooltip.hide();
      d3.selectAll(".point-highlighted").remove();
      d3.select(event.currentTarget).classed("area-highlighted", false);
    })
    .on("click", function (event: MouseEvent, d: RowData) {
      state.disableAnimation = true;
      plotData.mark([d.row], event.ctrlKey ? "ToggleOrAdd" : "Replace");
    });
}
