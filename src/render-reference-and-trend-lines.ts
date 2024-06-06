/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

import { GeneralStylingInfo, ScaleStylingInfo, Tooltip } from "spotfire-api";

// @ts-ignore
import * as d3 from "d3";

import {
  D3_SELECTION,
  Data,
  Options,
  StatisticsConfig,
  SumStatsSettings,
} from "./definitions";
import { Log, LOG_CATEGORIES } from "./log";
import { SumStatsConfig } from "./sumstatsconfig";

export function renderReferenceLinesAndPoints(
  g: D3_SELECTION,
  config: Partial<Options>,
  plotData: Data,
  margin: any,
  xScale: d3.scale,
  yScale: d3.scale,
  fontClass: string,
  styling: {
    generalStylingInfo: GeneralStylingInfo;
    scales: ScaleStylingInfo;
  },
  tooltip: Tooltip
) {
  const statisticsConfig: Map<string, StatisticsConfig> =
    config.GetStatisticsConfigItems();

  g.selectAll(".reference-line").remove();
  Log.green(LOG_CATEGORIES.ReferenceLines)(xScale);
  Array.from(statisticsConfig.values())
    .filter((l: StatisticsConfig) => l.refEnabled === true)
    .forEach((r: StatisticsConfig) => {
      const sumStatsSetting: SumStatsSettings = SumStatsConfig.find(
        (e: SumStatsSettings) => e.name === r.name
      );

      Log.green(LOG_CATEGORIES.ReferenceLines)(
        "Drawing reference line for:" + sumStatsSetting.property
      );
      Log.green(LOG_CATEGORIES.ReferenceLines)(sumStatsSetting);
      const dashArray = r.dashArray.split(" ");
      let newDasharray: string = "";
      dashArray.forEach((d: any) => {
        newDasharray += Number(d) * 10 + " ";
      });
      g.selectAll(".reference-line-" + r.name)
        .data(
          new Map(
            [...plotData.sumStats].filter(
              ([, v]) => v[sumStatsSetting.property] != undefined
            )
          )
        )
        .enter()
        .append("path")
        .attr("d", sumStatsSetting.path(xScale.bandwidth()))
        .classed("reference-line", true)
        .classed("reference-line-" + r.name, true)
        .attr("stroke-dasharray", newDasharray)
        .attr("transform", (d: any) => {
          const xTranslate =
            (config.isVertical ? margin.left : margin.top) +
            (xScale(d[0]) ? xScale(d[0]) : 0) +
            xScale.bandwidth() / 2;
          const yTranslate =
            yScale(d[1][sumStatsSetting.property]) +
            // Vertical offset works the other way round for horizontal
            (config.isVertical ? 1 : -1) *
              sumStatsSetting.verticalOffset(xScale.bandwidth());
          const rotation =
            sumStatsSetting.rotation + (config.isVertical ? 0 : 90);
          Log.green(LOG_CATEGORIES.ReferenceLines)(d[0], xScale(d[0]));
          return (
            "translate(" +
            (config.isVertical ? xTranslate : yTranslate) +
            "," +
            (config.isVertical ? yTranslate : xTranslate) +
            ") rotate(" +
            +rotation +
            ")"
          );
        })
        .attr("stroke", r.color)
        .attr("fill", r.color)
        //.attr("x1", (d: any) => x(d[0]) + x.bandwidth() / 3)
        //.attr("x2", (d: any) => x(d[0]) + x.bandwidth() / 3 + 100)
        .attr("y1", (d: any) => {
          return yScale(d[1][sumStatsSetting.property]);
        })
        .attr("y2", (d: any) => yScale(d[1][sumStatsSetting.property]))
        .on("mouseover", function (event: d3.event, d: any) {
          Log.green(LOG_CATEGORIES.Rendering)(d, event.target);
          tooltip.show(
            d[0] +
              "\n" +
              sumStatsSetting.name +
              ": " +
              config.FormatNumber(d[1][sumStatsSetting.property])
          );
        })
        .on("mouseout", () => tooltip.hide());

      g.selectAll(".reference-linelabel")
        .data(
          new Map(
            [...plotData.sumStats].filter(
              ([, v]) => v[sumStatsSetting.property] != undefined
            )
          )
        )
        .enter()
        .append("text")
        .attr("transform", function (d: any) {
          const xTranslate =
            (config.isVertical ? margin.left : margin.top) +
            (xScale(d[0]) ? xScale(d[0]) : 0) +
            sumStatsSetting.labelHorizOffset(xScale.bandwidth());
          const yTranslate =
            yScale(d[1][sumStatsSetting.property]) +
            // Vertical offset works the other way round for horizontal
            (config.isVertical ? 1 : -1) * sumStatsSetting.labelVerticalOffset;
          return (
            "translate(" +
            (config.isVertical ? xTranslate : yTranslate) +
            "," +
            (config.isVertical ? yTranslate : xTranslate) +
            ")"
          );
        })
        .classed(fontClass, true)
        .attr("font-family", styling.scales.font.fontFamily)
        .attr("fill", styling.scales.font.color)
        .attr("font-weight", styling.scales.font.fontWeight)
        .style("font-size", styling.scales.font.fontSize + "px")
        .text(() => sumStatsSetting.name);
    });
}

/**
 * Trend lines
 */
export function renderTrendLines(
  g: D3_SELECTION,
  config: Partial<Options>,
  plotData: Data,
  margin: any,
  xScale: d3.scale,
  yScale: d3.scale,
  tooltip: Tooltip
) {
  g.selectAll(".trend-line").remove();

  const statisticsConfig: Map<string, StatisticsConfig> =
    config.GetStatisticsConfigItems();

  // If no xScale domain we cannot render trend lines as there's nothing on the x-axis!
  if (xScale.domain()[0] != "") {
    Array.from(statisticsConfig.values())
      .filter((l: StatisticsConfig) => l.trendEnabled === true)
      .forEach((r: StatisticsConfig) => {
        const lineSettings = SumStatsConfig.find(
          (e: SumStatsSettings) => e.name === r.name
        );

        Log.green(LOG_CATEGORIES.Rendering)(
          "drawing trend line for: " + lineSettings.property,
          r
        );
        const dashArray = r.dashArray.split(" ");
        let newDasharray: string = "";
        dashArray.forEach((d: any) => {
          newDasharray += Number(d) * 10 + " ";
        });
        g.append("path")
          .datum(
            [...plotData.sumStats]
              .map((d: any) => {
                return {
                  x: d[0],
                  y: d[1][lineSettings.property],
                };
              })
              .filter((d: any) => d.y != null && !isNaN(d.y))
          )
          .attr("class", "trend-line")
          .attr("stroke", r.color)
          .attr("style", "stroke-dasharray: " + newDasharray)
          .attr(
            "d",
            d3
              .line()
              .curve(d3.curveCatmullRom)
              .x((d: any) =>
                config.isVertical
                  ? margin.left + xScale(d.x) + xScale.bandwidth() / 2
                  : yScale(d.y)
              )
              .y((d: any) =>
                config.isVertical
                  ? yScale(d.y)
                  : margin.top + xScale(d.x) + xScale.bandwidth() / 2
              )
          );
        // Add another, wider path that's easier to hover over, and make it transparent
        g.append("path")
          .datum(
            [...plotData.sumStats]
              .map((d: any) => {
                return {
                  x: d[0],
                  y: d[1][lineSettings.property],
                };
              })
              .filter((d: any) => d.y != null && !isNaN(d.y))
          )
          .attr(
            "d",
            d3
              .line()
              .curve(d3.curveCatmullRom)
              .x((d: any) =>
                config.isVertical
                  ? margin.left + xScale(d.x) + xScale.bandwidth() / 2
                  : yScale(d.y)
              )
              .y((d: any) =>
                config.isVertical
                  ? yScale(d.y)
                  : margin.top + xScale(d.x) + xScale.bandwidth() / 2
              )
          )
          .attr("stroke", "transparent")
          .attr("fill", "none")
          .attr("stroke-width", 10)
          .on("mousemove", (event: MouseEvent) => {
            tooltip.show(
              lineSettings.name +
                ": " +
                config.FormatNumber(yScale.invert(event.clientY - margin.top))
            );
          })
          .on("mouseout", () => tooltip.hide());
      });
  }
}
