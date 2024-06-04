/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

import {
  Log,
  LOG_CATEGORIES
} from "./log";
// @ts-ignore
import * as d3 from "d3";
import { GeneralStylingInfo, ScaleStylingInfo, Tooltip } from "spotfire-api";
import {
  Data,
  Options,
  StatisticsConfig,
  SumStatsSettings,
  TableContainerSpecs,
} from "./definitions";
import { SumStatsConfig } from "./sumstatsconfig";
import { getBorderColor, getComplementaryColor } from "./utility-functions";
type D3_SELECTION = d3.Selection<SVGGElement, unknown, HTMLElement, any>;

let rowHeight = Infinity;

/**
 * Render the stats table
 */
export function renderStatisticsTableHorizontal(
  config: Partial<Options>,
  isTrellis: boolean,
  styling: {
    generalStylingInfo: GeneralStylingInfo;
    scales: ScaleStylingInfo;
  },
  tableContainer: D3_SELECTION,
  margin: any,
  fontClass: string,
  plotData: Data,
  orderedCategories: string[],
  tooltip: Tooltip
): TableContainerSpecs {
  Log.red(LOG_CATEGORIES.DebugShowingStatsTable)("in renderstatisticstable");
  Log.green(LOG_CATEGORIES.Rendering)("orderedCategories", orderedCategories);

  const tableData: any = [];

  const table = tableContainer
    .append("table")
    //.attr("style", "width:" + (width-100) + "px")
    //.classed("table", true)
    //.classed("table-sm", true) // reduces padding
    //.classed("w-auto", true)
    //.classed("overflow-hidden", true)
    .classed(fontClass, true)
    .classed("summary-table1", true);

  const enabledSummaryStats = [
    "", // This creates an "empty" cell above the column showing the categories
    ...Array.from(config.GetStatisticsConfigItems().values()).filter(
      (statisticsConfig: StatisticsConfig) => statisticsConfig.tableEnabled
    ),
  ];

  Log.red(LOG_CATEGORIES.ShowHideZoomSliders)(
    "enabledSummaryStats",
    enabledSummaryStats
  );

  const categoryStatisticsMap = new Map<string, Map<string, number>>();
  orderedCategories.forEach((category: string, i: number) => {
    const statisticsValuesMap = new Map<string, number>();
    Array.from(config.GetStatisticsConfigItems().values())
      .filter(
        (statisticsConfig: StatisticsConfig) => statisticsConfig.tableEnabled
      )
      .forEach((entry: StatisticsConfig) => {
        // Now iterate over the orderedCategories, getting the value for each metric
        const configProperty = SumStatsConfig.find(
          (e: SumStatsSettings) => e.name === entry.name
        );
        if (configProperty != undefined) {
          const propertyName = SumStatsConfig.find(
            (e: SumStatsSettings) => e.name === entry.name
          )!.property;
          Log.blue(LOG_CATEGORIES.DebugLogYAxis)(
            "orderedCategories",
            orderedCategories
          );

          Log.red(LOG_CATEGORIES.DebugShowingStatsTable)("category", category);
          // Avoid "Comparison" category if comparison circles are enabled
          if (
            !config.comparisonCirclesEnabled.value() ||
            i < orderedCategories.length - 1
          ) {
            const sumStats = plotData.sumStats.get(category);
            Log.green(LOG_CATEGORIES.DebugComparisonCirclesInTable)(
              "category",
              category,
              i
            );
            if (sumStats) {
              Log.green(LOG_CATEGORIES.DebugComparisonCirclesInTable)(
                entry.name,
                propertyName,
                category,
                sumStats["max"]
              );
              statisticsValuesMap.set(entry.name, sumStats[propertyName]);
            }
          }
        }
      });

    categoryStatisticsMap.set(category, statisticsValuesMap);
  });

  const headerColumns: string[] = [...orderedCategories];

  Log.green(LOG_CATEGORIES.Horizontal)(
    "categoryStatisticsMap",
    categoryStatisticsMap
  );

  let fontSizePx = 10;
  switch (fontClass) {
    case "smaller-font":
      fontSizePx = 9;
      break;
    case "small-font":
      fontSizePx = 12;
      break;
    case "medium-font":
      fontSizePx = styling.generalStylingInfo.font.fontSize;
      break;
  }

  fontSizePx *= config.summaryTableFontScalingFactor.value();

  Log.red(LOG_CATEGORIES.Horizontal)("headerColumns", headerColumns);
  Log.red(LOG_CATEGORIES.Horizontal)("tableData", tableData);

  // create table header
  const statsTableHeaderRow = table
    .append("thead")
    .append("tr")
    .classed("statistics-table-entry", true);

  Log.red(LOG_CATEGORIES.Horizontal)(
    "statsTableHeaderRow",
    statsTableHeaderRow
  );

  /*if (enabledSummaryStats.length = 0){
    enabledSummaryStats.push({
      name: ""
    })
  }*/

  const statsHeaders = statsTableHeaderRow
    .selectAll("tr")
    .data(enabledSummaryStats)
    .enter()
    .append("th")
    .classed("summary-header", (d: any) => {
      return d != "";
    })
    .classed("summary-header-horizontal", (d: any) => {
      return d != "";
    })
    .style(
      "border-color",
      getBorderColor(styling.generalStylingInfo.backgroundColor)
    )
    .style("background-color", (d: any) =>
      d == ""
        ? ""
        : getComplementaryColor(styling.generalStylingInfo.backgroundColor)
    )
    .append("div")
    .attr("class", (d: any, i: number) => {
      Log.green(LOG_CATEGORIES.Rendering)(d);
      let orderBy = "unordered";
      const orderBySettings =
        config.orderBy.value()! != ""
          ? config.orderBy.value()!.split(">")
          : [""];
      if (config.orderBy.value()! != "" && d.name == orderBySettings[0]) {
        orderBy = orderBySettings[1];
        Log.green(LOG_CATEGORIES.Rendering)(orderBy);
      }
      return "sortable " + orderBy + "";
    })
    // Make sure any additional classes are set after the main class!
    .classed("statistics-table-name-vertical", true)
    .classed("summary-div-sortable", true)
    .style("min-height", config.showZoomSliders.value() && !isTrellis ? "30px": "")
    .style("font-size", fontSizePx + "px")
    .style("font-family", styling.generalStylingInfo.font.fontFamily)
    .style("font-weight", styling.generalStylingInfo.font.fontWeight)
    .style("color", styling.generalStylingInfo.font.color)
    .html(function (d: any, i: number) {
      let orderBy = "unordered";
      const orderBySettings =
        config.orderBy.value()! != ""
          ? config.orderBy.value()!.split(">")
          : [""];

      Log.green(LOG_CATEGORIES.Horizontal)(
        "orderBy",
        config.orderBy.value(),
        d.name
      );
      if (config.orderBy.value()! != "" && d.name == orderBySettings[0]) {
        orderBy = orderBySettings[1];
        Log.green(LOG_CATEGORIES.Horizontal)("orderBy", orderBy);
        if (orderBy == "ordered-left") {
          return "⮜" + d.name;
        }
        if (orderBy == "ordered-right") {
          return "⮞" + d.name;
        }
      }
      return d.name;
    })
    .on("mouseover", (event: Event) => {
      tooltip.show(d3.select(event.currentTarget).node().outerText);
    })
    .on("mouseout", () => tooltip.hide())
    .on("click", (event: d3.Event) => {
      Log.green(LOG_CATEGORIES.Horizontal)(
        event.target.classList,
        config.orderBy.value()
      );
      if (event.target.classList.contains("sortable")) {
        let orderingClass = "";
        if (event.target.classList.contains("unordered")) {
          orderingClass = "ordered-left";
        }
        if (event.target.classList.contains("ordered-left")) {
          orderingClass = "ordered-right";
        }
        if (event.target.classList.contains("ordered-right")) {
          orderingClass = "unordered";
        }
        Log.green(LOG_CATEGORIES.Horizontal)(
          "setting config to",
          event.target.textContent.replace("⮜", "").replace("⮞", "") +
            ">" +
            orderingClass
        );

        config.orderBy.set(
          event.target.textContent.replace("⮜", "").replace("⮞", "") +
            ">" +
            orderingClass
        );
      }
    });

  //const rowData = Array.from(d[1], ([key, value]) => ({ key, value }));
  const entryRows = table
    .append("tbody")
    .selectAll("tr")
    .data(categoryStatisticsMap)
    .enter()
    .append("tr")
    .classed("statistics-table-entry-row", true)
    .classed("comparison-circles-stats-row", (d: any) => d[0] == "Comparison");

  // categories
  entryRows
    .append("td")
    .style(
      "border-color",
      getBorderColor(styling.generalStylingInfo.backgroundColor)
    )
    .style("background-color", (d: any) =>
      d == ""
        ? ""
        : getComplementaryColor(styling.generalStylingInfo.backgroundColor)
    )
    .classed("summary-header-right-align", (d: any) => {
      return d != "";
    })
    .append("div")
    .classed("summary-div", true)
    .style("font-size", fontSizePx + "px")
    .style("font-family", styling.generalStylingInfo.font.fontFamily)
    .style("font-weight", styling.generalStylingInfo.font.fontWeight)
    .style("color", styling.generalStylingInfo.font.color)    
    .text((d: any) => {
      return d[0];
    })
    .on("mouseover", function (this: HTMLElement, event: Event) {
      tooltip.show(d3.select(event.currentTarget).node().outerText);
      d3.select(this.parentElement.parentElement)
        .selectAll("div")
        .each(function (this: HTMLElement, d: any) {
          Log.blue(LOG_CATEGORIES.Horizontal)("this", d3.select(this));
          d3.select(this).classed("summary-div-expanded", true);
          d3.select(this).classed("summary-div", false);
        });
    })
    .on("mouseout", function (this: HTMLElement) {
      d3.select(this.parentElement.parentElement)
        .selectAll("div")
        .each(function (this: HTMLElement, d: any) {
          Log.blue(LOG_CATEGORIES.Horizontal)("this", d3.select(this));
          d3.select(this).classed("summary-div-expanded", false);
          d3.select(this).classed("summary-div", true);
        });
      tooltip.hide();
    });

  // stats values
  entryRows
    .selectAll("tr.entry")
    .data((d: any) => {
      Log.green(LOG_CATEGORIES.Horizontal)(
        "statsEntry datum",
        d,
        Array.from(d[1].values())
      );
      return Array.from(d[1].values());
    })
    .enter()
    .append("td")
    .classed("py-0 summary-value", true)
    .style(
      "border-color",
      getBorderColor(styling.generalStylingInfo.backgroundColor)
    )
    .append("div")
    .classed("summary-div", true)
    .style("font-size", fontSizePx + "px")
    .style("font-family", styling.generalStylingInfo.font.fontFamily)
    .style("font-weight", styling.generalStylingInfo.font.fontWeight)
    .style("color", styling.generalStylingInfo.font.color)
    .text((d: any) => {
      //Log.green(LOG_CATEGORIES.Horizontal)("entryRow", d);
      if (typeof d == "string") return d;
      if (isNaN(d)) return "";
      if (Math.floor(d) === d) return d; // for Count
      return config.FormatNumber(d);
    })
    .on("mouseover", function (this: HTMLElement, event: Event) {
      tooltip.show(d3.select(event.currentTarget).node().outerText);
      rowHeight = Math.min(
        rowHeight,
        d3.select(this).node().getBoundingClientRect().height
      );

      Log.red(LOG_CATEGORIES.Horizontal)(
        "parentElement",
        d3.select(this.parentElement.parentElement),
        d3.select(this.parentElement.parentElement).selectAll("div")
      );
      d3.select(this.parentElement.parentElement)
        .selectAll("div")
        .each(function (this: HTMLElement, d: any) {
          Log.blue(LOG_CATEGORIES.Horizontal)("this", d3.select(this));
          d3.select(this).classed("summary-div-expanded", true);
          d3.select(this).classed("summary-div", false);
        });
      //d3.select(this).style("height", "");
    })
    .on("mouseout", function (this: HTMLElement) {
      d3.select(this.parentElement.parentElement)
        .selectAll("div")
        .each(function (this: HTMLElement, d: any) {
          Log.blue(LOG_CATEGORIES.Horizontal)("this", d3.select(this));
          d3.select(this).classed("summary-div-expanded", false);
          d3.select(this).classed("summary-div", true);
        });
      tooltip.hide();
    });

  if (
    config.comparisonCirclesEnabled.value() &&
    enabledSummaryStats.length > 0
  ) {
    // Add comparison circles metrics
    tableContainer
      .select(".comparison-circles-stats-row")
      .append("td")
      .classed("summary-value-comparison-circles", true)
      .attr("colspan", enabledSummaryStats.length - 1)
      .style(
        "border-color",
        getBorderColor(styling.generalStylingInfo.backgroundColor)
      )
      .append("div")
      .classed("summary-div", true)
      .html(
        "α: " +
          config.FormatNumber(plotData.comparisonCirclesStats.alpha) +
          "<br/>" +
          "RMSE: " +
          config.FormatNumber(plotData.comparisonCirclesStats.rootMse) +
          "<br/>" +
          "√2q*: " +
          config.FormatNumber(plotData.comparisonCirclesStats.q)
      )
      .on("mouseover", (event: Event) => {
        tooltip.show(d3.select(event.currentTarget).node().outerText);
      })
      .on("mouseout", () => tooltip.hide())
      .style("font-size", fontSizePx + "px")
      .style("font-family", styling.generalStylingInfo.font.fontFamily)
      .style("font-weight", styling.generalStylingInfo.font.fontWeight)
      .style("color", styling.generalStylingInfo.font.color);
  }

  // return the container for the table so we can determine its size when rendered
  return {
    headerRowHeight: statsTableHeaderRow.node().getBoundingClientRect().height,
    tableContainer: tableContainer,
  };
}
