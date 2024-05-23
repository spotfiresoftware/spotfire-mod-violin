/*
* Copyright © 2024. Cloud Software Group, Inc.
* This file is subject to the license terms contained
* in the license file that is distributed with this file.
*/

// @ts-ignore
import * as d3 from "d3";
import { Data, Options, RenderState, RowData } from "./definitions";
import { LOG_CATEGORIES, Log, getBoxBorderColor, violinWidthPadding } from "./index";
import { Tooltip, DataViewRow, GeneralStylingInfo } from "spotfire-api";
import {
  highlightComparisonCircles,
  highlightMarkedComparisonCircles,
} from "./render-comparison-circles";

/**
 *  Render violin
 */
export function renderViolin(
  plotData: Data,
  orderedCategories: string[],
  xScale: d3.scaleBand,
  yScale: d3.scale,
  margin: any,
  g: any,
  tooltip: Tooltip,
  xAxisSpotfire: Spotfire.Axis,
  state: RenderState,
  animationSpeed: number,
  heightAvailable: number,
  config: Partial<Options>,
  generalStylingInfo: GeneralStylingInfo
) {
  
  const curveType = d3.curveLinear;

  Log.green(LOG_CATEGORIES.ViolinIndividualScales)(
    "plotData.densitiesAll",
    plotData.densitiesAll
  );
  Log.green(LOG_CATEGORIES.ViolinIndividualScales)(
    "plotData.densitiesSplitByMarking",
    plotData.densitiesSplitByMarkingAndCategory
  );

  orderedCategories.forEach((category: string, violinIndex: number) => {
    const densitiesAll = plotData.densitiesAll.filter(
      (d: any) => d.category == category
    );
    const densitiesSplitByMarking = plotData.densitiesSplitByMarkingAndCategory.filter(
      (d: any) => d.category == category
    );
    Log.green(LOG_CATEGORIES.ViolinIndividualScales)(
      "densitiesAll for",
      category,
      densitiesAll,
      "[0]",
      densitiesAll[0]
    );
    Log.green(LOG_CATEGORIES.ViolinIndividualScales)(
      "densitiesSplitByMarking for",
      category,
      densitiesSplitByMarking
    );

    // densitiesAll is an array with 1 element only at this stage
    const maxKdeValue =
      densitiesAll.length > 0
        ? d3.max(densitiesAll[0].densityPoints.map((p: any) => p.y))
        : 0;

    /**
     * violinXscale is used for the correct placing of violin area
     */
    const violinXscale = d3
      .scaleLinear()
      .range([1, xScale.bandwidth() - violinWidthPadding.violinX])
      .domain([-maxKdeValue, maxKdeValue]);

    Log.red(LOG_CATEGORIES.DebugYNaN)(
      category,
      maxKdeValue,
      densitiesAll,
      densitiesAll.length
    );

    /**
     * Add the violin to the svg
     */

    // Segments for the violin - marked/unmarked
    g.selectAll(".violin-path-" + violinIndex)
      // This is all violins that will be displayed, including category
      .data(densitiesSplitByMarking.sort((a:any, b:any) => b.IsGap - a.IsGap))
      .enter()
      .append("g")
      .attr("transform", function (d: any) {
        Log.green(LOG_CATEGORIES.ViolinIndividualScales)("violin d", d);
        return (
          "translate(0, " + 
          ((xScale(d.category) ? xScale(d.category) : 0) +
            violinWidthPadding.violinX / 2) +
          ")"
        );
      })
      .style("stroke", (d: any) =>
        d.IsGap ? "darkgray" : getBoxBorderColor(d.color)
      )
      .style("opacity", config.violinOpacity)
      .style("fill", function (d: any) {
        Log.blue(LOG_CATEGORIES.ColorViolin)("isGap", d, d.IsGap);
        return d.IsGap
          ? "url(#no-data)"
          : config.areColorAndXAxesMatching
          ? d.color
          : config.violinColor.value(); // config.violinColor.value();
      })
      .classed("not-marked", (d: any) => {
        if (!plotData.isAnyMarkedRecords) {
          return false;
        }
        return config.useFixedViolinColor.value() && !d.Marked;
      })
      .append("path")
      .classed("violin-path", true)
      .classed("violin-gap", (d: any) => d.IsGap)
      .datum((d: any) => {
        Log.green(LOG_CATEGORIES.DebugLogYAxis)("violin datum", d);
        // point is a density point; y is the density, x is the value (plot's y value) being reported
        // ... so swap them round
        const datum = d.densityPoints.map(function (point: any) {
          return {
            rows: d.rows,
            isGap: d.IsGap,
            violinX: point.y,
            violinY: point.x,
            trellis: d.trellis,
            category: d.category,
            sumStats: plotData.sumStats.get(d.category),
            count: d.count,
          };
        });
        Log.green(LOG_CATEGORIES.DebugLatestMarking)("datum", datum);
        return datum.sort(
          (a: any, b: any) =>
            a.violinY - b.violinY || yScale(a.violinY) - yScale(b.violinY)
        );
      }) // So now we are working bin per bin
      .attr(
        "d",
        d3
          .area()
          .defined((d: any, i: number) => true) //{Log.green(LOG_CATEGORIES.DebugCustomSymLog)(d, yScale(d.violinY)); return true || d.violinY > 1 || d.violinY < -1;}) //&& !isNaN(Math.log(Math.abs(d.violinY)));})
          .y0(function (d: any) {
            return violinXscale(-d.violinX) as number;
          })
          .y1(function (d: any) {
            Log.green(LOG_CATEGORIES.Rendering)(d);
            Log.green(LOG_CATEGORIES.Rendering)(d[1]);
            return violinXscale(d.violinX) as number;
          })
          .x(function (d: any) {
            //if (isNaN(yScale(d.violinY))) {
            //  return 0;
            //}
            Log.green(LOG_CATEGORIES.Rendering)(yScale(d[0]));
            return yScale(d.violinY) as number;
          })
          .curve(curveType)
      )
      .classed("markable", true)
      .on("mouseover", function (event: d3.event, d: any) {
        if (event.currentTarget.classList.contains("violin-gap")) {
          tooltip.show(
            "No data\n" +
              (xAxisSpotfire.parts[0]?.displayName
                ? xAxisSpotfire.parts[0]?.displayName + ": "
                : "") +
              d[0].category +
              "i:" +
              d.i +
              "\nY min: " +
              config.FormatNumber(d3.min(d.map((p: any) => p.violinY))) +
              "\nY max: " +
              config.FormatNumber(d3.max(d.map((p: any) => p.violinY)))
          );
        } else {
          Log.green(LOG_CATEGORIES.DebugLatestMarking)(
            "datum in mouseover",
            d[0]
          );

          tooltip.show(
            (xAxisSpotfire.parts[0]?.displayName
              ? xAxisSpotfire.parts[0]?.displayName + ": "
              : "") +
              d[0].category +
              "\ny: " +
              config.FormatNumber(yScale.invert(event.y - margin.top)) +
              "\nDensity: " +
              config.FormatNumber(violinXscale.invert(event.x)) +
              "\nY min: " +
              config.FormatNumber(d3.min(d.map((p: any) => p.violinY))) +
              "\nY max: " +
              config.FormatNumber(d3.max(d.map((p: any) => p.violinY))) +
              "\nCount: " +
              d[0].count
          );
        }
        Log.green(LOG_CATEGORIES.Rendering)(event.currentTarget);
        d3.select(event.currentTarget).classed("area-highlighted", true);
        if (config.comparisonCirclesEnabled.value()) {
          highlightComparisonCircles(
            g,
            xScale,
            heightAvailable,
            d[0].category,
            plotData.comparisonCirclesData,
            generalStylingInfo.backgroundColor
          );
        }
      })
      .on("mousemove", function (event: d3.event, d: any) {
        if (event.currentTarget.classList.contains("violin-gap")) {
          tooltip.show(
            "No data\n" +
              (xAxisSpotfire.parts[0]?.displayName
                ? xAxisSpotfire.parts[0]?.displayName + ": "
                : "") +
              d[0].category +
              "\nY min: " +
              config.FormatNumber(d3.min(d.map((p: any) => p.violinY))) +
              "\nY max: " +
              config.FormatNumber(d3.max(d.map((p: any) => p.violinY)))
          );
        } else {
          tooltip.show(
            (xAxisSpotfire.parts[0]?.displayName
              ? xAxisSpotfire.parts[0]?.displayName + ": "
              : "") +
              d[0].category +
              "\ny: " +
              config.FormatNumber(yScale.invert(event.y - margin.top)) +              
              "\nDensity: " +
              d3.format(".2e")(violinXscale.invert(event.x)) +
              "\nY min: " +
              config.FormatNumber(d3.min(d.map((p: any) => p.violinY))) +
              "\nY max: " +
              config.FormatNumber(d3.max(d.map((p: any) => p.violinY))) +              
              "\nCount: " +
              d[0].count
          );
        }
        Log.green(LOG_CATEGORIES.Rendering)(event.currentTarget);
        d3.select(event.currentTarget).classed("area-highlighted", true);
        if (config.comparisonCirclesEnabled.value()) {
          highlightComparisonCircles(
            g,
            xScale,
            heightAvailable,
            d[0].category,
            plotData.comparisonCirclesData,
            generalStylingInfo.backgroundColor
          );
        }
      })
      .on("mouseout", (event: d3.event) => {
        tooltip.hide();
        d3.select(event.currentTarget).classed("area-highlighted", false);
        highlightMarkedComparisonCircles(
          g,
          xScale,
          heightAvailable,
          config,
          plotData,
          generalStylingInfo.backgroundColor
        );
      })
      .on("click", (event: MouseEvent, d: any) => {
        Log.green(LOG_CATEGORIES.DebugLatestMarking)("clicked violin", d[0].rows);
        if (d[0].isGap || d[1].isGap) return; // Don't attempt to do anything if the user clicks a gap!
        const dataPoints = plotData.rowData.filter((r: any) => {
          if (d[0].category == "(None)") return true;
          return r.row.categorical("X").formattedValue() === d[0].category;
        });
        state.disableAnimation = true;

        plotData.mark(
          d[0].rows.map((r:RowData) => r.row) as DataViewRow[],
          event.ctrlKey ? "ToggleOrAdd" : "Replace"
        );
      });

    Log.green(LOG_CATEGORIES.Rendering)(plotData.densitiesAll);
    // Now add a second set of paths for the violins - these will be invisible, but are used to make
    // the marking code a lot easier!
    g.selectAll(".violin-path-markable-" + violinIndex)
      .data(densitiesAll)
      .enter() // So now we are working group per group
      .append("g")
      .attr("transform", function (d: any) {
        Log.green(LOG_CATEGORIES.Rendering)(
          "test data",
          d,
          d.category,
          xScale(d.category)
        );
        return (
          "translate(0, " +
          ((xScale(d.category) ? xScale(d.category) : 0) +
            violinWidthPadding.violinX / 2) +
          ")"
        );
      }) // Translation on the right to be at the group position
      .style("fill", "none")
      .append("path")
      .classed("violin-path-markable", true)
      .datum((d: any) => {
        const datum = d.densityPoints.map(function (point: any) {
          return {
            violinX: point.y,
            violinY: point.x,
            trellis: d.trellis,
            category: d.category,
            sumStats: plotData.sumStats.get(d.category),
          };
        });
        Log.green(LOG_CATEGORIES.Rendering)("datum", datum);
        return datum;
      }) // So now we are working bin per bin
      .classed("markable", true)
      .attr(
        "d",
        d3
          .area()
          .y0(function (d: any) {
            if (isNaN(violinXscale(-d.violinX))) {
              Log.green(LOG_CATEGORIES.DebugYNaN)(
                d.category,
                d.violinX,
                violinXscale(-d.violinX),
                maxKdeValue
              );
            }
            return violinXscale(-d.violinX) as number;
          })
          .y1(function (d: any) {
            return violinXscale(d.violinX) as number;
          })
          .x(function (d: any) {
            if (isNaN(yScale(d.violinY))) {
              return 0;
            }
            Log.green(LOG_CATEGORIES.Rendering)(yScale(d[0]));
            return yScale(d.violinY) as number;
          })
          .curve(curveType)
      );
  });
}
