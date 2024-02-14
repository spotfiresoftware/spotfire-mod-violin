// @ts-ignore
import * as d3 from "d3";
import { Data, Options, RenderState } from "./definitions";
import {
    LOG_CATEGORIES,
    Log
} from "./index";
import {
    Tooltip,
    DataViewRow,
    GeneralStylingInfo,
} from "spotfire-api";
import {
    highlightComparisonCircles,
    highlightMarkedComparisonCircles
} from "./render-comparison-circles";

/**
 *  Render violin
 */
export function renderViolin(plotData: Data, xScale: d3.scaleBand, yScale: d3.scale, height: number, g: any, tooltip: Tooltip,
    xAxisSpotfire: Spotfire.Axis, state: RenderState, animationSpeed: number, heightAvailable: number, config: Partial<Options>, generalStylingInfo: GeneralStylingInfo) {

    const padding = { violinX: 20 };
    const isScaleLog = config.yAxisLog.value();
    const curveType = d3.curveLinear;
    const LOG_Y_MIN = 0;
    /**
     * violinXscale is used for the correct placing of violin area
     */
    const violinXscale = d3.scaleLinear().range([1, xScale.bandwidth() - padding.violinX]).domain([-plotData.maxKdeValue, plotData.maxKdeValue]);

    Log.green(LOG_CATEGORIES.DebugSingleRowMarking)("plotData.densitiesAll", plotData.densitiesAll);
    Log.green(LOG_CATEGORIES.DebugSingleRowMarking)("plotData.densitiesSplitByMarking", plotData.densitiesSplitByMarking);

    /**
     * Add the violin to the svg
     */

    // Segments for the violin - marked/unmarked        
    g.selectAll(".violin-path")
        .data(plotData.densitiesSplitByMarking)
        .enter() // So now we are working group per group
        .append("g")
        .attr("transform", function (d: any) {
            Log.green(LOG_CATEGORIES.DebugViolinXPos)("test data", d, d.x, xScale(d.x));
            return "translate(" + ((xScale(d.x) ? xScale(d.x) : 0) + padding.violinX / 2) + " ,0)";
        })
        .style("stroke", config.violinColor.value())
        .style("fill", function (d: any) {
            return d.IsGap ? "darkgray" : config.violinColor.value(); /*ColorsDict[d.key]*/
        })
        // .style("fill", "none")
        .classed("not-marked", ((d: any) => {
            if (!plotData.isAnyMarkedRecords) {
                return false;
            }
            return (!d.Marked);
        }))
        .append("path")
        .classed("violin-path", true)
        .classed("violin-gap", ((d: any) => d.IsGap))
        .datum((d: any) => {
            Log.green(LOG_CATEGORIES.DebugLatestMarking)("violin datum", d);
            // point is a density point; y is the density, x is the value (plot's y value) being reported
            // ... so swap them round
            const datum = d.densityPoints.map(function (point: any) {
                return { violinX: point.y, violinY: point.x, trellis: d.trellis, category: d.x, sumStats: plotData.sumStats.get(d.x), count:d.count}
            }).filter((p: any) => !isScaleLog || p.violinY > LOG_Y_MIN);
            Log.green(LOG_CATEGORIES.Rendering)("datum", datum);
            return datum;
        }) // So now we are working bin per bin
        // This is before the animation to expand the violins to their eventual sizes
        .attr(
            "d",
            d3
                .area()
                .x0(function () {
                    return violinXscale(0) as number;
                })
                .x1(function () {
                    return violinXscale(0) as number;
                })
                .y(function (d: any) {
                    if (isNaN(yScale(d.violinY))) return 0;
                    Log.green(LOG_CATEGORIES.Rendering)("yval", yScale(d.violinY), d.violinY);
                    return yScale(d.violinY) as number;
                })
                .curve(curveType)
        )
        .classed("markable", true)
        .on("mouseover", function (event: d3.event, d: any) {
            if (event.currentTarget.classList.contains("violin-gap")) {
                tooltip.show(
                    "No data\n" +
                    xAxisSpotfire.parts[0]?.displayName + ": " + d[0].category +
                    "\nY min: " + d3.min(d.map((p: any) => p.violinY)) +
                    "\nY max: " + d3.max(d.map((p: any) => p.violinY)));
            } else {
                Log.green(LOG_CATEGORIES.DebugLatestMarking)("datum in mouseover", d[0]);

                tooltip.show(
                    xAxisSpotfire.parts[0]?.displayName + ": " + d[0].category +
                    "\ny: " + d3.format(config.GetYAxisFormatString())(yScale.invert(event.y)) +
                    "\nMin: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.min) +
                    "\nMax: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.max) +
                    "\nUAV: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.uav) +
                    "\nQ3: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.q3) +
                    "\nMedian: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.median) +
                    "\nQ1: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.q1) +
                    "\nLAV: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.lav) +
                    "\nCount: " + d[0].count);
            }
            Log.green(LOG_CATEGORIES.Rendering)(event.currentTarget);
            d3.select(event.currentTarget).classed("area-highlighted", true);
            if (config.comparisonCirclesEnabled.value()) {
                highlightComparisonCircles(g, xScale, heightAvailable, d[0].category,
                plotData.comparisonCirclesData, generalStylingInfo.backgroundColor);
            }
        })
        .on("mousemove",  function (event: d3.event, d: any) {
            if (event.currentTarget.classList.contains("violin-gap")) {
                tooltip.show(
                    "No data\n" +
                    xAxisSpotfire.parts[0]?.displayName + ": " + d[0].category +
                    "\nY min: " + d3.min(d.map((p: any) => p.violinY)) +
                    "\nY max: " + d3.max(d.map((p: any) => p.violinY)));
            } else {
                tooltip.show(
                    xAxisSpotfire.parts[0]?.displayName + ": " + d[0].category +
                    "\ny: " + d3.format(config.GetYAxisFormatString())(yScale.invert(event.y)) +
                    "\nMin: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.min) +
                    "\nMax: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.max) +
                    "\nUAV: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.uav) +
                    "\nQ3: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.q3) +
                    "\nMedian: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.median) +
                    "\nQ1: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.q1) +
                    "\nLAV: " + d3.format(config.GetYAxisFormatString())(d[0].sumStats.lav) +
                    "\nCount: " + d[0].count);
            }
            Log.green(LOG_CATEGORIES.Rendering)(event.currentTarget);
            d3.select(event.currentTarget).classed("area-highlighted", true);
            if (config.comparisonCirclesEnabled.value()) {
                highlightComparisonCircles(g, xScale, heightAvailable, d[0].category,
                plotData.comparisonCirclesData, generalStylingInfo.backgroundColor);
            }
        })
        .on("mouseout", (event: d3.event) => {
            tooltip.hide();
            d3.select(event.currentTarget).classed("area-highlighted", false);
            highlightMarkedComparisonCircles(g, xScale, heightAvailable, config, plotData, generalStylingInfo.backgroundColor);
        })
        .on("click", (event: MouseEvent, d: any) => {
            const dataPoints = plotData.dataPoints.filter((r: any) => {
                if (d[0].category == "(None)") return true;
                return r.row.categorical("X").formattedValue() === d[0].category;
            });
            state.disableAnimation = true;
            Log.green(LOG_CATEGORIES.Rendering)("clicked violin", dataPoints);
            plotData.mark(dataPoints.map((r: any) => r.row) as DataViewRow[], event.ctrlKey ? "ToggleOrAdd" : "Replace");
        })
        .transition()
        .duration(animationSpeed * 2)
        .attr(
            "d",
            d3
                .area()
                .x0(function (d: any) {
                    return violinXscale(-d.violinX) as number;
                })
                .x1(function (d: any) {
                    Log.green(LOG_CATEGORIES.Rendering)(d);
                    Log.green(LOG_CATEGORIES.Rendering)(d[1]);
                    return violinXscale(d.violinX) as number;
                })
                .y(function (d: any) {
                    if (isNaN(yScale(d.violinY))) {
                        return 0;
                    }
                    Log.green(LOG_CATEGORIES.Rendering)(yScale(d[0]));
                    return yScale(d.violinY) as number;
                })
                .curve(curveType)
        );

    Log.green(LOG_CATEGORIES.Rendering)(plotData.densitiesAll);
    // Now add a second set of paths for the violins - these will be invisible, but are used to make
    // the marking code a lot easier!
    g.selectAll(".violin-path-markable")
        .data(plotData.densitiesAll)
        .enter() // So now we are working group per group
        .append("g")
        .attr("transform", function (d: any) {
            Log.green(LOG_CATEGORIES.Rendering)("test data", d, d.x, xScale(d.x));
            return "translate(" + ((xScale(d.x) ? xScale(d.x) : 0) + padding.violinX / 2) + " ,0)";
        }) // Translation on the right to be at the group position        
        .style("fill", "none")
        .append("path")
        .classed("violin-path-markable", true)
        .datum((d: any) => {
            const datum = d.densityPoints.map(function (point: any) {
                return { violinX: point.y, violinY: point.x, trellis: d.trellis, category: d.x, sumStats: plotData.sumStats.get(d.x) }
            }).filter((p: any) => !isScaleLog || p.violinY > LOG_Y_MIN);
            Log.green(LOG_CATEGORIES.Rendering)("datum", datum);
            return datum;
        }) // So now we are working bin per bin        
        .classed("markable", true)
        .attr(
            "d",
            d3
                .area()
                .x0(function (d: any) {
                    return violinXscale(-d.violinX) as number;
                })
                .x1(function (d: any) {
                    Log.green(LOG_CATEGORIES.Rendering)(d);
                    Log.green(LOG_CATEGORIES.Rendering)(d[1]);
                    return violinXscale(d.violinX) as number;
                })
                .y(function (d: any) {
                    if (isNaN(yScale(d.violinY))) {
                        return 0;
                    }
                    Log.green(LOG_CATEGORIES.Rendering)(yScale(d[0]));
                    return yScale(d.violinY) as number;
                })
                .curve(curveType)
        );
}
