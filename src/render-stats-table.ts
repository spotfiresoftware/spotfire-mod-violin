import f from "./d3-jetpack-modules/d3-jetpack-f";
import {
    getBorderColor,
    getComplementaryColor,
    Log, 
    LOG_CATEGORIES
} from "./index";
// @ts-ignore
import * as d3 from "d3";
import { GeneralStylingInfo, ScaleStylingInfo, Tooltip } from "spotfire-api";
import { Data, Options, StatisticsConfig, SumStatsSettings } from "./definitions";
import { SumStatsConfig } from "./sumstatsconfig";
type D3_SELECTION = d3.Selection<SVGGElement, unknown, HTMLElement, any>;

/**
 * Render the stats table
 */
export function renderStatisticsTable(
    config: Partial<Options>,
    styling: {
        generalStylingInfo: GeneralStylingInfo;
        scales: ScaleStylingInfo;
    },
    container: D3_SELECTION,
    margin: any,
    fontClass: string,
    plotData: Data,
    orderedCategories: string[],
    bandwidth: number,
    tooltip: Tooltip
) {

    Log.red(LOG_CATEGORIES.DebugShowingStatsTable)("in renderstatisticstable");
    const tableContainer: D3_SELECTION = container.append("div")
        .classed("table-container", true);

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
        .style("border", styling.generalStylingInfo.font.color)
        .classed("summary-table1", true);
    
        
    Log.blue(LOG_CATEGORIES.DebugShowingStatsTable)("sumstats", plotData.sumStats);
    Array.from(config.GetStatisticsConfigItems().values()).filter((statisticsConfig: StatisticsConfig) => statisticsConfig.tableEnabled).forEach((entry: StatisticsConfig) => {
        // Now iterate over the orderedCategories, getting the value for each metric
        const configProperty = SumStatsConfig.find((e: SumStatsSettings) => e.name === entry.name);
        if (configProperty != undefined) {
            const statisticsValues = [];
            statisticsValues.push(entry.name);

            const propertyName = SumStatsConfig.find((e: SumStatsSettings) => e.name === entry.name)!.property;
            Log.blue(LOG_CATEGORIES.DebugLogYAxis)("orderedCategories", orderedCategories);
            orderedCategories.forEach((category:string, i:number) => {
                Log.red(LOG_CATEGORIES.DebugShowingStatsTable)("category", category);
                // Avoid "Comparison" category if comparison circles are enabled
                if (!config.comparisonCirclesEnabled.value() || i < orderedCategories.length - 1) {
                    const sumStats = plotData.sumStats.get(category);
                    Log.green(LOG_CATEGORIES.DebugComparisonCirclesInTable)("category", category, i);
                    if (sumStats) {
                        Log.green(LOG_CATEGORIES.DebugComparisonCirclesInTable)(entry.name, propertyName, category, sumStats["max"]);
                        statisticsValues.push(sumStats[propertyName]);
                    } else {
                        statisticsValues.push("");
                    }
                }            
            });
            Log.red(LOG_CATEGORIES.DebugShowAllXValues)("statisticsValues", statisticsValues);
            tableData.push(statisticsValues);
        }
    });
    Log.red(LOG_CATEGORIES.DebugShowingStatsTable)(tableData);

    // - 1 makes the cell sizes fit exactly (each cell has a border of 1px on both sides, and shares
    // its borders with one other cell)
    const cellWidth = bandwidth - 1.1;
    const leftMostColumnWidth = margin.left;

    const headerColumns : string[] = ["", ...orderedCategories];

    Log.green(LOG_CATEGORIES.DebugComparisonCirclesInTable)("tableData", tableData);

    let fontSizePx = 10;
    switch(fontClass) {
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

    // create table header
    table
        .append("thead")
        .append("tr")
        .selectAll("th")
        .data(headerColumns)
        .enter()
        .append("th")
        .classed("summary-header", ((d:any) => {return d != ""}))        
        .style("border-color", getBorderColor(styling.generalStylingInfo.backgroundColor))
        .style("background-color", ((d: any) => d == "" ? "" : getComplementaryColor(styling.generalStylingInfo.backgroundColor)))
        .append("div")
        .classed("summary-div", true)
        .attr("style", (d: any, i: number) =>
            "width:" + (i == 0 ? leftMostColumnWidth : cellWidth) + "px"
        )
        .style("text-align", "center")
        .style("font-size", fontSizePx + "px")
        .style("font-family", styling.generalStylingInfo.font.fontFamily)
        .style("font-weight", styling.generalStylingInfo.font.fontWeight)
        .style("color", styling.generalStylingInfo.font.color)
        .text((d:any) => d)
        .on("mouseover", ((event: Event) => {
            tooltip.show(d3.select(event.currentTarget).node().outerText);
        }))
        .on("mouseout", () => tooltip.hide());


    Log.green(LOG_CATEGORIES.Rendering)("bandwidth, cellWidth", bandwidth, cellWidth);

    Log.red(LOG_CATEGORIES.DebugShowAllXValues)("orderedCategories", orderedCategories, tableData);

    // create table body
    table
        .append("tbody")
        .selectAll("tr")
        .data(tableData)
        .enter()
        .append("tr")
        .selectAll("td")
        .data(function (row: any) {
            Log.green(LOG_CATEGORIES.DebugShowingStatsTable)("table row", row);
            return row.map(function (c: any) {
                const format = SumStatsConfig.find((d: SumStatsSettings) => d.name == row[0])?.format;
                return [c, format]; // explicit formatting
            });
        })
        .enter()
        .append("td")
        .attr("class", function (d: any, i: number) {
            if (i == 0) { // this is the header column
                return "py-0 summary-header"
            }
            else {
                return "py-0 summary-value";
            }
        })
        .style("border-color", getBorderColor(styling.generalStylingInfo.backgroundColor))
        .style("background-color", ((d: any, i: number) => i == 0 ? getComplementaryColor(styling.generalStylingInfo.backgroundColor) : ""))
        .append("div")        
        .classed("summary-div", true)
        .classed("summary-div-sortable", (d: any, i: number) => i == 0)        
        .attr("class", (d: any, i: number) => {
            Log.green(LOG_CATEGORIES.Rendering)(d);
            if (i == 0) {
                let orderBy = "unordered";
                const orderBySettings = config.orderBy.value()! != "" ? config.orderBy.value()!.split(">") : [""];
                if (config.orderBy.value()! != "" && d[0] == orderBySettings[0]) {
                    orderBy = orderBySettings[1];
                    Log.green(LOG_CATEGORIES.Rendering)(orderBy);
                }
                return "sortable " + orderBy + "";
            }
        })
        .classed("summary-div", true)        
        .attr("style", (d: any, i: number) => "width:" + (i == 0 ? leftMostColumnWidth : cellWidth) + "px")
        // Font class is inherited from the table element
        .style("font-size", fontSizePx + "px")
        .style("font-family", styling.generalStylingInfo.font.fontFamily)
        .style("font-weight", styling.generalStylingInfo.font.fontWeight)
        .style("color", styling.generalStylingInfo.font.color)
        .html(function (c: any, i: number) {
            Log.green(LOG_CATEGORIES.Rendering)("rowColumn", i, c[0], c[1]);
            if (i == 0) {
                let orderBy = "unordered";
                const orderBySettings = config.orderBy.value()! != "" ? config.orderBy.value()!.split(">") : [""];
                if (config.orderBy.value()! != "" && c[0] == orderBySettings[0]) {
                    orderBy = orderBySettings[1];
                    Log.green(LOG_CATEGORIES.Rendering)(orderBy);
                    if (orderBy == "ordered-left") {
                        return c[0] + "⮜";
                    }
                    if (orderBy == "ordered-right") {
                        return c[0] + "⮞";
                    }
                    return c[0];
                }
            }
            // [0] is the data
            // [1] is the format string                
            if (typeof c[0] == "string") return c[0];
            if (isNaN(c[0])) return "";
            if (c[1] != undefined) return d3.format(c[1])(c[0]); // for Count
            else return config.FormatNumber(c[0]);
        })
        .on("mouseover", ((event: Event) => {
            tooltip.show(d3.select(event.currentTarget).node().outerText);
        }))
        .on("mouseout", () => tooltip.hide())
        .on("click", (event: d3.Event) => {

            Log.green(LOG_CATEGORIES.Rendering)(event.target.classList, config.orderBy.value());
            //TODO: !set back to unordered!
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
                Log.green(LOG_CATEGORIES.Rendering)("setting config to", event.target.textContent.replace("⮜", "").replace("⮞", "") + ">" + orderingClass);

                config.orderBy.set(event.target.textContent.replace("⮜", "").replace("⮞", "") + ">" + orderingClass);
            }
        });

    if (config.comparisonCirclesEnabled.value()) {
        // Add comparison circles metrics
        let rowIndex = 0;
        const rows = tableContainer.selectAll("table");
        const rowCount = rows.size();
        tableContainer.selectAll("tr").each(function (this: SVGTextElement) {
            const tr = d3.select(this);
            if (rowIndex == 1) {
                tr.append("td")
                    .classed("summary-value-comparison-circles", true)
                    .attr("rowspan", rowCount - 1)
                    .style("border-color", getBorderColor(styling.generalStylingInfo.backgroundColor))
                    .append("div")
                    .classed("summary-div", true)
                    .attr("style", () => "width:" + cellWidth + "px")
                    .html(
                        "α: " +
                        config.FormatNumber(plotData.comparisonCirclesStats.alpha) +
                        "<br/>" +
                        "RMSE: " +
                        config.FormatNumber(plotData.comparisonCirclesStats.rootMse) +
                        "<br/>" +
                        "√2q*: " +
                        config.FormatNumber(plotData.comparisonCirclesStats.q))
                    .on("mouseover", ((event: Event) => {
                        tooltip.show(d3.select(event.currentTarget).node().outerText);
                    }))
                    .on("mouseout", () => tooltip.hide())
                    .style("font-size", fontSizePx + "px")
                    .style("font-family", styling.generalStylingInfo.font.fontFamily)
                    .style("font-weight", styling.generalStylingInfo.font.fontWeight)
                    .style("color", styling.generalStylingInfo.font.color);
            }
            rowIndex++;
        });
    }

    // return the container for the table so we can determine its size when rendered
    return tableContainer;
}