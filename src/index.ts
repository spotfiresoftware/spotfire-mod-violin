import { render } from "./render";

import {
  addTrellisSettings,
  createSettingsPopout,
  removeTrellisSettings,
} from "./settings";
import {
  DataView,
  DataViewHierarchyNode,
  ModProperty,
  Size,
  DataViewHierarchy,
  PopoutComponentEvent,
  Mod,
} from "spotfire-api";

// @ts-ignore
import * as d3 from "d3";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";

import { addHandlersSelection } from "./ui-input.js";

import {
  RenderState,
  Options,
  RenderedPanel,
  StatisticsConfig,
  TrellisRenderingInfo,
  D3_SELECTION,
} from "./definitions";
import { buildData } from "./data-manipulation";
import { clearWarning, createWarning } from "./warning";

const Spotfire = window.Spotfire;

export const MOD_CONTAINER: D3_SELECTION = d3.select("#mod-container");

let previousYAxisExpression: string = "";
let previousCountAxisExpression: string = "";

let statisticsConfigCache: Map<string, StatisticsConfig>;

/**
 * Use any of these categories to differentiate between sets of log messages. Add a new one
 * at any time to debug a particular piece of functionality.
 */
export enum LOG_CATEGORIES {
  None,
  Data,
  General,
  Settings,
  Stats,
  Coloring,
  Marking,
  ViolinMarking,
  Rendering,
  ComparisonCircles,
  ReferenceLines,
  ShowHideZoomSliders,
  DebugViolinXPos,
  DebugAnimation,
  DebugCtrlKey,
  AggregationWarning,
  ShowHighlightRect,
  DebugShowingMenu,
  DebugStatisticsSettings,
  DebugShowAllXValues,
  DebugComparisonCirclesInTable,
  DebugShowingStatsTable,
  DebugWebPlayerIssue,
  DebugLayout,
  DebugResize,
  DebugFirefoxMarking,
  DebugDataBailout,
  DebugLatestMarking,
  DebugMarkingOffset,
  DebugZoomReset,
  DebugSingleRowMarking,
  DebugLogYAxis,
  DebugYScaleTicks,
  DebugMedian
}

/**
 * Set this array to any number of categories, or None to hide all logging
 */
const CURRENT_LOG_CATEGORIES: LOG_CATEGORIES[] = [LOG_CATEGORIES.DebugLogYAxis];

/**
 * Log helper - pass the log category as the first argument, then any number of args as you would with console.log
 * Useful for debugging various parts/functions of the code by enabling/disabling various log categories (CURRENT_LOG_CATEGORIES)
 * @param category
 * @param args
 */
export class Log {
  static green(category: LOG_CATEGORIES): (...args: any) => void {
    if (CURRENT_LOG_CATEGORIES.find((c) => c == LOG_CATEGORIES.None)) {
      return function () {}; // Don't log
    }
    if (CURRENT_LOG_CATEGORIES.find((c) => c == category)) {
      return console.log.bind(
        console,
        `%c${LOG_CATEGORIES[category]}`,
        `background: #FFFFF; color: #31A821`
      );
    } else {
      return function () {};
    }
  }

  static red(category: LOG_CATEGORIES): (...args: any) => void {
    if (CURRENT_LOG_CATEGORIES.find((c) => c == LOG_CATEGORIES.None)) {
      return function () {}; // Don't log
    }
    if (CURRENT_LOG_CATEGORIES.find((c) => c == category)) {
      return console.log.bind(
        console,
        `%c${LOG_CATEGORIES[category]}`,
        `background: #FFFFF; color: #DA5555`
      );
    } else {
      return function () {};
    }
  }

  static blue(category: LOG_CATEGORIES): (...args: any) => void {
    if (CURRENT_LOG_CATEGORIES.find((c) => c == LOG_CATEGORIES.None)) {
      return function () {}; // Don't log
    }
    if (CURRENT_LOG_CATEGORIES.find((c) => c == category)) {
      return console.log.bind(
        console,
        `%c${LOG_CATEGORIES[category]}`,
        `background: #FFFFF; color: #5560DA`
      );
    } else {
      return function () {};
    }
  }
}

let wasTrellis: boolean = false; // Was the previous render trellis?
let trellisPanelZoomedTitle = "";
let previousTrellisRowsPerPage = 0;
let previousTrellisColumnsPerPage = 0;
let previousTrellisPanelCount = 0;
let isInteractive = true; // Easy way to track if the view is "interactive", i.e. not being exported

/**
 * Create a persistent state used by the rendering code
 */
const state: RenderState = { preventRender: false, disableAnimation: false };

export function setTrellisPanelZoomedTitle(title: string) {
  trellisPanelZoomedTitle = title;
}

/**
 * Adjust color to be lighter or darker
 * @param hexCode - the color to adjust
 * @param amount - positive values lighten the color, negative darken it
 * @returns
 */
export function adjustColor(hexCode: String, amount: number): string {
  const color = parseInt(hexCode.replace("#", ""), 16);
  const r = (color & 0xff0000) / 0x10 ** 4;
  const g = (color & 0x00ff00) / 0x10 ** 2;
  const b = color & 0x0000ff;

  const newR = Math.max(0, Math.min(r + amount, 0xff));
  const newG = Math.max(0, Math.min(g + amount, 0xff));
  const newB = Math.max(0, Math.min(b + amount, 0xff));

  return (
    "#" +
    newR.toString(16).padStart(2, "0") +
    newG.toString(16).padStart(2, "0") +
    newB.toString(16).padStart(2, "0")
  );
}

export function GenerateRoundedRectSvg(
  width: number,
  height: number,
  tl: number,
  tr: number,
  br: number,
  bl: number
) {
  const top = width - tl - tr;
  const right = height - tr - br;
  const bottom = width - br - bl;
  const left = height - bl - tl;
  return `
    M${tl - 7},-7
    h${top}
    a${tr},${tr} 0 0 1 ${tr},${tr}
    v${right}
    a${br},${br} 0 0 1 -${br},${br}
    h-${bottom}
    a${bl},${bl} 0 0 1 -${bl},-${bl}
    v-${left}
    a${tl},${tl} 0 0 1 ${tl},-${tl}
    z
`;
}

/**
 * Given a background color, determine a suitable background color for table headers
 * @param backgroundColor - the background color
 */
export function getComplementaryColor(backgroundColor: String) {
  const color = parseInt(backgroundColor.replace("#", ""));
  if (color < 0x7fffff) {
    // lighten
    Log.green(LOG_CATEGORIES.Coloring)(
      "adjust lighter",
      backgroundColor,
      adjustColor(backgroundColor, 0x10)
    );
    return adjustColor(backgroundColor, 0x10);
  } else {
    // darken
    Log.green(LOG_CATEGORIES.Coloring)(
      "adjust darker",
      backgroundColor,
      adjustColor(backgroundColor, -0x3f)
    );
    return adjustColor(backgroundColor, -0x09);
  }
}

/**
 * Given a background color, determine a suitable color for highlighted comparison circles
 * @param backgroundColor - the background color
 */
export function getComparisonCircleHighlightedColor(backgroundColor: String) {
  const color = parseInt(backgroundColor.replace("#", ""));
  if (color < 0x7fffff) {
    // lighten
    Log.green(LOG_CATEGORIES.Coloring)(
      "adjust lighter",
      backgroundColor,
      adjustColor(backgroundColor, 0x10)
    );
    return adjustColor(backgroundColor, 0xff);
  } else {
    // darken
    Log.green(LOG_CATEGORIES.Coloring)(
      "adjust darker",
      backgroundColor,
      adjustColor(backgroundColor, -0x3f)
    );
    return adjustColor(backgroundColor, -0xff);
  }
}

/**
 * Given a background color, determine a suitable color for table borders
 * @param backgroundColor - the background color
 */
export function getBorderColor(backgroundColor: String) {
  const color = parseInt(backgroundColor.replace("#", ""));
  if (color < 0x7fffff) {
    // lighten
    Log.green(LOG_CATEGORIES.Coloring)(
      "adjust lighter",
      backgroundColor,
      adjustColor(backgroundColor, 0x10)
    );
    return adjustColor(backgroundColor, 0x20);
  } else {
    // darken
    Log.green(LOG_CATEGORIES.Coloring)(
      "adjust darker",
      backgroundColor,
      adjustColor(backgroundColor, -0x3f)
    );
    return adjustColor(backgroundColor, -0x20);
  }
}

/**
 * Given a background color, determine a suitable color for table borders
 * @param backgroundColor - the background color
 */
export function getMarkerHighlightColor(backgroundColor: String) {
  const color = parseInt(backgroundColor.replace("#", ""));
  if (color < 0x7fffff) {
    // Return black
    return "#FFFFFF";
  } else {
    // return white
    return "#000000";
  }
}

/**
 * Given a background color, determine a suitable contrasting color
 * @param backgroundColor - the background color
 */
export function getContrastingColor(backgroundColor: String): string {
  const color = parseInt(backgroundColor.replace("#", ""));
  if (color < 0x7fffff) {
    // lighten
    Log.green(LOG_CATEGORIES.Coloring)(
      "adjust lighter",
      backgroundColor,
      adjustColor(backgroundColor, 0x10)
    );
    return adjustColor(backgroundColor, 0x70);
  } else {
    // darken
    Log.green(LOG_CATEGORIES.Coloring)(
      "adjust darker",
      backgroundColor,
      adjustColor(backgroundColor, -0x3f)
    );
    return adjustColor(backgroundColor, -0x70);
  }
}

Spotfire.initialize(async (mod) => {
  const context = mod.getRenderContext();
  Log.green(LOG_CATEGORIES.ShowHideZoomSliders)(
    "is interactive in init",
    context.interactive
  );
  isInteractive = context.interactive;
  Log.green(LOG_CATEGORIES.General)(MOD_CONTAINER);
  const spotfireMod = mod;
  /**
   * Create reader function which is actually a one time listener for the provided values.
   */
  const reader = mod.createReader(
    mod.visualization.data(),
    mod.windowSize(),
    mod.visualization.axis("X"),
    mod.property<boolean>("xAxisFiltered"),
    mod.property<string>("yAxisLog"),
    mod.property<string>("yAxisScaleType"),
    mod.property<boolean>("colorForViolin"),
    mod.property<boolean>("includeViolin"),
    mod.property<number>("violinBandwidth"),
    mod.property<number>("violinSmoothness"),
    mod.property<boolean>("includeBoxplot"),
    mod.property<boolean>("includeYAxisGrid"),
    mod.property<number>("yZoomMin"),
    mod.property<number>("yZoomMax"),
    mod.property<boolean>("yZoomMinUnset"),
    mod.property<boolean>("yZoomMaxUnset"),
    mod.property<string>("orderBy"),
    mod.property<number>("yAxisDecimals"),
    mod.property<boolean>("yAxisUseThousandsSeparator"),
    mod.property<boolean>("yAxisUseShortNumberFormat"),
    mod.property<number>("maxRowsPerPage"),
    mod.property<number>("maxColumnsPerPage"),
    mod.property<boolean>("showZoomSliders"),
    mod.property<string>("trellisIndividualZoomSettings"),
    mod.property<string>("boxPlotColor"),
    mod.property<string>("violinColor"),
    mod.property<string>("boxWidth"),
    mod.property<boolean>("showPvalue"),
    mod.property<number>("circleSize"),
    mod.property<boolean>("comparisonCirclesEnabled"),
    mod.property<number>("comparisonCirclesAlpha"),
    mod.property<string>("statisticsConfig"),
    mod.property<boolean>("individualZoomSlider"),
    mod.property<boolean>("ignoreAggregatedYAxisWarning"),
    mod.property<boolean>("ignoreIncorrectCountExpression"),
    mod.property<boolean>("reloadTrigger")
  );

  /**
   * Creates a function that is part of the main read-render loop.
   * It checks for valid data and will print errors in case of bad data or bad renders.
   * It calls the listener (reader) created earlier and adds itself as a callback to complete the loop.
   */
  reader.subscribe(generalErrorHandler(mod)(onChange));

  /**
   * The function that is part of the main read-render loop.
   * It checks for valid data and will print errors in case of bad data or bad renders.
   * It calls the listener (reader) created earlier and adds itself as a callback to complete the loop.
   * @param {Spotfire.DataView} dataView
   * @param {Spotfire.Size} windowSize
   * @param {Spotfire.Axis} xAxisSpotfire
   * @param {ModProperty<string>} yAxisLog
   * @param {ModProperty<string>} yAxisScaleType
   * @param {ModProperty<boolean>} colorForViolin
   * @param {ModProperty<boolean>} includeBoxplot
   * @param {ModProperty<boolean>} includeYAxisGrid
   * @param {ModProperty<double>} yZoomMin
   * @param {ModProperty<double>} yZoomMax
   * @param {ModProperty<double>} yZoomMinUnset
   * @param {ModProperty<double>} yZoomMaxUnset
   * @param {ModProperty<string>} orderBy
   * @param {ModProperty<double>} yAxisDecimals
   * @param {ModProperty<boolean>} yAxisUseThousandsSeparator
   * @param {ModProperty<boolean>} yAxisUseShortNumberFormat
   * @param {ModProperty<number>} maxColumnsPerPage
   * @param {ModProperty<number>} maxRowsPerPage
   * @param {ModProperty<boolean>} showZoomSliders
   * @param {ModProperty<string>} trellisIndividualZoomSettings
   * @param {ModProperty<string>} boxPlotColor
   * @param {ModProperty<string>} violinColor
   * @param {ModProperty<number>} boxWidth
   * @param {ModProperty<number>} circleSize
   * @param {ModProperty<string>} statisticsConfig
   * @param {ModProperty<boolean>} individualZoomSlider
   * @param {ModProperty<boolean>} ignoreAggregatedYAxisWarning
   * @param {ModProperty<boolean>} ignoreIncorrectCountExpression
   * @param {ModProperty<boolean>} reloadTrigger
   */
  async function onChange(
    dataView: DataView,
    windowSize: Spotfire.Size,
    xAxisSpotfire: Spotfire.Axis,
    xAxisFiltered: ModProperty<boolean>,
    yAxisLog: ModProperty<boolean>,
    yAxisScaleType: ModProperty<string>,
    colorForViolin: ModProperty<boolean>,
    includeViolin: ModProperty<boolean>,
    violinBandwidth: ModProperty<number>,
    violinSmoothness: ModProperty<number>,
    includeBoxplot: ModProperty<boolean>,
    includeYAxisGrid: ModProperty<boolean>,
    // resolution: ModProperty<number>,
    yZoomMin: ModProperty<number>,
    yZoomMax: ModProperty<number>,
    yZoomMinUnset: ModProperty<boolean>,
    yZoomMaxUnset: ModProperty<boolean>,
    orderBy: ModProperty<string>,
    yAxisDecimals: ModProperty<number>,
    yAxisUseThousandsSeparator: ModProperty<boolean>,
    yAxisUseShortNumberFormat: ModProperty<boolean>,
    maxColumnsPerPage: ModProperty<number>,
    maxRowsPerPage: ModProperty<number>,
    showZoomSliders: ModProperty<boolean>,
    trellisIndividualZoomSettings: ModProperty<string>,
    boxPlotColor: ModProperty<string>,
    violinColor: ModProperty<string>,
    boxWidth: ModProperty<number>,
    showPvalue: ModProperty<boolean>,
    circleSize: ModProperty<number>,
    comparisonCirclesEnabled: ModProperty<boolean>,
    comparisonCirclesAlpha: ModProperty<number>,
    statisticsConfig: ModProperty<string>,
    individualZoomSlider: ModProperty<boolean>,
    ignoreAggregatedYAxisWarning: ModProperty<boolean>,
    ignoreIncorrectCountExpression: ModProperty<boolean>,
    reloadTrigger: ModProperty<number>
  ) {
    Log.red(LOG_CATEGORIES.DebugLogYAxis)("OnChange", yAxisLog.value());
    // Reload trigger is set in warning.ts - to trigger a reload
    Log.green(LOG_CATEGORIES.DebugLogYAxis)("reloadTrigger", reloadTrigger.value());
    Log.green(LOG_CATEGORIES.ShowHideZoomSliders)(
      "is interactive in onchange",
      context.interactive
    );
    mod.controls.progress.show();
    scrollY = window.scrollY;
    Log.green(LOG_CATEGORIES.General)("ui_y", window.scrollY);

    Log.green(LOG_CATEGORIES.General)("boxPlotColor", boxPlotColor.value());
    const config: Options = {
      xAxisFiltered: xAxisFiltered,
      yAxisLog: yAxisLog,
      yAxisScaleType: yAxisScaleType,
      includeViolin: includeViolin,
      colorForViolin: colorForViolin.value()!,
      violinBandwidth: violinBandwidth,
      violinSmoothness: violinSmoothness,
      includeBoxplot: includeBoxplot,
      includeYAxisGrid: includeYAxisGrid,
      yZoomMin: yZoomMin,
      yZoomMax: yZoomMax,
      yZoomMinUnset: yZoomMinUnset,
      yZoomMaxUnset: yZoomMaxUnset,
      orderBy: orderBy,
      yAxisDecimals: yAxisDecimals,
      yAxisUseThousandsSeparator: yAxisUseThousandsSeparator,
      yAxisUseShortNumberFormat: yAxisUseShortNumberFormat,
      showZoomSliders: showZoomSliders,
      trellisIndividualZoomSettings: trellisIndividualZoomSettings,
      boxPlotColor: boxPlotColor,
      violinColor: violinColor,
      boxWidth: boxWidth,
      showPvalue: showPvalue,
      maxColumnsPerPage: maxColumnsPerPage,
      maxRowsPerPage: maxRowsPerPage,
      circleSize: circleSize,
      comparisonCirclesEnabled: comparisonCirclesEnabled,
      comparisonCirclesAlpha: comparisonCirclesAlpha,
      statisticsConfig: statisticsConfig,
      individualZoomSlider: individualZoomSlider,
      //statisticsConfigCache: statisticsConfig.value() == "" ? new Map<string, StatisticsConfig>() : new Map(JSON.parse(statisticsConfig.value())),
      GetStatisticsConfigItems(): Map<string, StatisticsConfig> {
        if (
          !statisticsConfigCache ||
          (statisticsConfig.value() == "" && statisticsConfigCache.size == 0)
        ) {
          statisticsConfigCache =
            statisticsConfig.value() == ""
              ? new Map<string, StatisticsConfig>()
              : new Map(JSON.parse(statisticsConfig.value()));

          if (statisticsConfigCache?.size == 0) {
            Log.green(LOG_CATEGORIES.DebugStatisticsSettings)(
              "creating new stats config cache",
              statisticsConfigCache
            );
            statisticsConfigCache = new Map([
              [
                "Count",
                {
                  name: "Count",
                  color: "#000000",
                  tableEnabled: true,
                  refEnabled: false,
                  trendEnabled: false,
                  dashArray: "1",
                },
              ],
              [
                "Median",
                {
                  name: "Median",
                  color: "#000000",
                  tableEnabled: true,
                  refEnabled: false,
                  trendEnabled: false,
                  dashArray: "1",
                },
              ],
              [
                "Outliers",
                {
                  name: "Outliers",
                  color: "#000000",
                  tableEnabled: true,
                  refEnabled: false,
                  trendEnabled: false,
                  dashArray: "1",
                },
              ],
            ]);
          }
        }

        return statisticsConfigCache;
      },
      SetStatisticsConfigItem(statisticsConfigItem: StatisticsConfig) {
        //const item = this.GetStatisticsConfigItems().get(statisticsConfigItem.name);
        Log.blue(LOG_CATEGORIES.DebugStatisticsSettings)(
          "cache",
          statisticsConfigCache
        );
        this.GetStatisticsConfigItems().set(
          statisticsConfigItem.name,
          statisticsConfigItem
        );
        Log.red(LOG_CATEGORIES.DebugStatisticsSettings)(
          "setting stats config",
          JSON.stringify(Array.from(statisticsConfigCache.entries()))
        );
        statisticsConfig.set(
          JSON.stringify(Array.from(this.GetStatisticsConfigItems().entries()))
        );
      },
      GetStatisticsConfigItem(name: string): StatisticsConfig {
        const item = this.GetStatisticsConfigItems().get(name);

        if (item) {
          Log.green(LOG_CATEGORIES.DebugStatisticsSettings)("got config", item);
          return item;
        }

        //Log.blue(LOG_CATEGORIES.DebugStatisticsSettings)("not got config", item, statisticsConfigCache);
        return {
          name: name,
          color: "#000000",
          tableEnabled: false,
          trendEnabled: false,
          refEnabled: false,
          dashArray: "1",
        };
      },
      IsStatisticsConfigItemEnabled(name: string): boolean {
        return (
          this.GetStatisticsConfigItem(name).refEnabled ||
          this.GetStatisticsConfigItem(name).trendEnabled ||
          this.GetStatisticsConfigItem(name).tableEnabled ||

          // All the below are required if box plot is shown
          name == "Q1" && config.includeBoxplot.value() ||
          name == "Q3" && config.includeBoxplot.value() ||
          name == "LAV" && config.includeBoxplot.value() ||
          name == "UAV" && config.includeBoxplot.value() ||
          name == "Median" && config.includeBoxplot.value() ||
          name == "Count" && config.comparisonCirclesEnabled.value() ||
          name == "StdDev" && config.comparisonCirclesEnabled.value() ||
          name == "Avg" && config.comparisonCirclesEnabled.value()
        );
      },
      GetYAxisFormatString() {
        return (
          (config.yAxisUseThousandsSeparator.value() ? "," : "") +
          "." +
          config.yAxisDecimals.value() +
          (config.yAxisUseShortNumberFormat.value() ? "s" : "f")
        );
      },
    };

    mod.controls.errorOverlay.hide();

    Log.red(LOG_CATEGORIES.DebugResize)("windowSize", windowSize);

    Log.red(LOG_CATEGORIES.DebugWebPlayerIssue)("config", config);

    // Check that a y-axis expression is present
    if ((await dataView.continuousAxis("Y")) == null) {
      MOD_CONTAINER.selectAll("*").remove();
      mod.controls.errorOverlay.show(
        "Error: Please specify an expression for the Y axis",
        "yAxisMissingExpr"
      );
      mod.controls.progress.hide();
      return;
    } else {
      mod.controls.errorOverlay.hide("yAxisMissingExpr");
    }

    // Check if aggregation is being used on Y axis and warn against it
    const yAxisExpression = (await mod.visualization.axis("Y")).expression;
    Log.blue(LOG_CATEGORIES.AggregationWarning)(
      (await mod.visualization.axis("Y")).expression,
      yAxisExpression.match(`[a-zA-Z]+(\(\[.+\]\))`)
    );

    const aggregatedExpressionMatch = yAxisExpression.match(
      "[a-zA-Z]+(\\(\\[.+\\]\\))"
    );
    if (previousYAxisExpression == "") {
      previousYAxisExpression = yAxisExpression;
    }

    if (
      aggregatedExpressionMatch != null &&
      (previousYAxisExpression != yAxisExpression ||
        ignoreAggregatedYAxisWarning.value() == false)
    ) {
      createWarning(
        reloadTrigger,
        context.styling.general.font,
        context.styling.general.backgroundColor,
        "The Y axis expression is aggregated, which may affect the accuracy of calculations.",
        "Remove aggregation",
        async () => {
          (await mod.visualization.axis("Y")).setExpression(
            aggregatedExpressionMatch[1]
          );
        },
        ignoreAggregatedYAxisWarning
      );
      MOD_CONTAINER.selectAll("*").remove();
      d3.select("#global-zoom-container").selectAll("*").remove();
      mod.controls.progress.hide();
      previousYAxisExpression = yAxisExpression;
      return;
    } else {
      clearWarning(MOD_CONTAINER);
    }

    previousYAxisExpression = yAxisExpression;

    // Check if count axis expression is correct, and give a warning if not
    const countAxisExpression = (await mod.visualization.axis("Count"))
      .expression;
    if ((await dataView.continuousAxis("Count")) == null) {
      MOD_CONTAINER.selectAll("*").remove();
      mod.controls.errorOverlay.show(
        "Error: Please specify an expression for the Count axis - usually count().",
        "countAxisMissingExpr"
      );
      mod.controls.progress.hide();
      return;
    } else {
      mod.controls.errorOverlay.hide("countAxisMissingExpr");
    }

    if (previousCountAxisExpression == "") {
      previousCountAxisExpression = countAxisExpression;
    }

    if (
      countAxisExpression.toLowerCase() != "count()" &&
      (previousCountAxisExpression != countAxisExpression ||
        ignoreIncorrectCountExpression.value() == false)
    ) {
      createWarning(
        reloadTrigger,
        context.styling.general.font,
        context.styling.general.backgroundColor,
        'The Count axis expression is not set to "count()".<br/>' +
          "This is necessary for counting the number of rows for each distinct value in the data.<br/>" +
          "If you are confident that there is only one row per distinct value, <BR>and the underlying dataset does not support the count() function,<br/>" +
          'please use "1" as the expression.',
        'Use "count()"',
        async () => {
          (await mod.visualization.axis("Count")).setExpression("count()");
        },
        ignoreIncorrectCountExpression
      );
      MOD_CONTAINER.selectAll("*").remove();
      d3.select("#global-zoom-container").selectAll("*").remove();
      mod.controls.progress.hide();
      previousCountAxisExpression = countAxisExpression;
      return;
    } else {
      clearWarning(MOD_CONTAINER);
    }

    previousCountAxisExpression = countAxisExpression;

    // Check DataView size and error if too large
    const xLimit = 100;
    const trellisLimit = 200;
    const xCount = (await dataView.hierarchy("X")).leafCount;
    const trellisCount: number = (await dataView.hierarchy("Trellis"))
      .leafCount;
    if (xCount > xLimit || trellisCount > trellisLimit) {
      MOD_CONTAINER.selectAll("*").remove();
      mod.controls.progress.hide();
      mod.controls.errorOverlay.show(
        "The resulting data view exceeded the size limit.",
        "dataViewSize1"
      );
      if (xCount > xLimit) {
        mod.controls.errorOverlay.show(
          `Maximum allowed X axis values is ${xLimit}. Try aggregating the expression further.`,
          "dataViewSize2"
        );
      } else {
        mod.controls.errorOverlay.hide("dataViewSize2");
      }

      if (trellisCount > trellisLimit) {
        mod.controls.errorOverlay.show(
          `Maximum allowed trellis axis values is ${trellisLimit}.`,
          "dataViewSize3"
        );
      } else {
        mod.controls.errorOverlay.hide("dataViewSize3");
      }

      return;
    } else {
      mod.controls.errorOverlay.hide("dataViewSize1");
      mod.controls.errorOverlay.hide("dataViewSize2");
      mod.controls.errorOverlay.hide("dataViewSize3");
    }

    /* Experimenting with getting column formatting, but it doesn't appear to be possible via the API
        const mainTable = await mod.visualization.mainTable();

        const props = await (await mainTable.column("total_bags")).properties();
        Log.green(LOG_CATEGORIES.General)(await mainTable.column("total_bags"), props);

        */

    Log.green(LOG_CATEGORIES.General)(
      "checking raw property in onchange",
      statisticsConfig.value()
    );

    d3.select("#dropdown-menu-link").on("click", function () {
      Log.green(LOG_CATEGORIES.General)("click");
      d3.select(".dropdown-container");
      //.attr("height", "100%");
    });

    /**
     * Set up the various containers
     */
    MOD_CONTAINER.style.height = windowSize.height.toString() + "px";
    MOD_CONTAINER.style(
      "background-color",
      context.styling.general.backgroundColor
    );

    d3.select(".dropdown-container")
      .style("background-color", context.styling.general.backgroundColor)
      .attr("height", "10px");

    const rootContainer = MOD_CONTAINER.select("#root-container").empty()
      ? MOD_CONTAINER.append("div")
          .attr("id", "root-container")
          .attr("data-bs-spy", "scroll")
          .classed("container-fluid", true)
          //.classed("h-100", true)
          //.classed("container-offset-right", true)
          .style("background-color", context.styling.general.backgroundColor)

          /* .attr("scrollTop", 100)
                .on("mousewheel", function (event: WheelEvent) {
                    Log.green(LOG_CATEGORIES.General)("mousewheel", event);
                    scrollOffset += event.deltaY;
                })*/
          .on("scroll", () => Log.green(LOG_CATEGORIES.General)("scroll"))
          .on("mousedown", (e: MouseEvent) =>
            Log.green(LOG_CATEGORIES.General)(
              "ui marking root container mousedown",
              e,
              e.y
            )
          )
          .on("activate.bs.scrollspy", () =>
            Log.green(LOG_CATEGORIES.General)("scrollspy")
          )
      : MOD_CONTAINER.select("#root-container").classed(
          "container-fluid",
          true
        );
    //.classed("container-offset-right", true);

    d3.select("#gear-icon").style("fill", context.styling.general.font.color);

    function CountChildren(
      node: DataViewHierarchyNode,
      toLevel: number,
      currentLevel: number = -1 // -1 is the root node
    ): number {
      function RecursiveTrellisCount(
        node: DataViewHierarchyNode,
        toLevel: number,
        currentLevel: number = 0
      ): number {
        let count = 0;
        Log.green(LOG_CATEGORIES.General)(
          "count currentLevel, children",
          currentLevel,
          node.children
        );
        if (node.children && currentLevel < toLevel - 1) {
          Log.green(LOG_CATEGORIES.General)(
            `Count Looping foreach node recursively on ${node.children.length} nodes.`
          );
          node.children.forEach(
            (node) =>
              (count += RecursiveTrellisCount(node, toLevel, currentLevel + 1))
          );
          Log.green(LOG_CATEGORIES.General)("count", count);
          return count;
        } else {
          Log.green(LOG_CATEGORIES.General)("end count", node);
          return 1;
        }
      }
      return RecursiveTrellisCount(node, toLevel, currentLevel);

      // Call the the recursive method with root container.
    }

    const trellisAxisHierarchy = await dataView.hierarchy("Trellis");
    Log.green(LOG_CATEGORIES.Data)("trellisAxisHierarchy");
    const isTrellis = !trellisAxisHierarchy.isEmpty;

    // Editing or viewing mode?
    if (mod.getRenderContext().isEditing) {
      d3.select("#settings-menu").selectAll("*").remove();
      d3.selectAll(".dropdown-container").style("visibility", "visible");
      createSettingsPopout(
        config,
        isTrellis,
        document.getElementById("settings-menu")
      );
    } else {
      d3.selectAll(".dropdown-container").style("visibility", "hidden");
    }

    Log.green(LOG_CATEGORIES.ShowHideZoomSliders)(
      "is interactive",
      isInteractive
    );

    let globalZoomSliderContainer: HTMLElement = d3
      .select("#global-zoom-container")
      .style("background-color", context.styling.general.backgroundColor);

    if (isTrellis) {
      if (!wasTrellis) {
        rootContainer.selectAll("*").remove();
      }
      wasTrellis = true;
      globalZoomSliderContainer.remove();
      if (
        isInteractive &&
        config.showZoomSliders.value() &&
        !config.individualZoomSlider.value()
      ) {
        d3.select("#trellis-zoom-container").select("*").remove();
        globalZoomSliderContainer = d3
          .select("#trellis-zoom-container")
          .append("div")
          .attr("id", "global-zoom-container")
          .style("background-color", context.styling.general.backgroundColor);
        /*d3.select("#trellis-zoom-container")
                .classed("global-zoom-container", true);*/
      }
    } else {
      wasTrellis = false;
      // Remove root container contents
      // todo - don't remove and redraw everything!
      rootContainer.selectAll("*").remove();
      d3.select("#trellis-zoom-container").selectAll("*").remove();
      if (isTrellis) {
        globalZoomSliderContainer = MOD_CONTAINER.append("div")
          .attr("id", "global-zoom-container")
          .style("background-color", context.styling.general.backgroundColor);
      } else if (config.showZoomSliders.value() && isInteractive) {
        globalZoomSliderContainer = rootContainer
          .append("div")
          .attr("id", "global-zoom-container")
          .style("background-color", context.styling.general.backgroundColor);
        MOD_CONTAINER.style("height", windowSize.height + "px");
      }
    }
    const renderedPanels: RenderedPanel[] = [];

    /**
     * Trellised renderer
     * @param node
     * @param toLevel
     * @param currentLevel
     */
    async function TrellisedRender(
      rootContainer: d3.D3_SELECTION,
      globalZoomSliderContainer: d3.D3_SELECTION,
      trellisAxisHierarchy: DataViewHierarchy
    ) {
      Log.green(LOG_CATEGORIES.DebugLogYAxis)("entering trellis render");

      const node = await trellisAxisHierarchy.root();
      Log.green(LOG_CATEGORIES.General)(node.formattedPath());

      // Take zoom slider into consideration
      // 10 is scrollbar width
      const rootContainerWidth = config.showZoomSliders.value()
        ? windowSize.width -
          globalZoomSliderContainer.node()?.getBoundingClientRect().width -
          8
        : windowSize.width - 8;

      Log.green(LOG_CATEGORIES.General)(rootContainer);
      rootContainer
        .classed(
          "root-container-trellis-with-global-zoom-slider",
          !config.individualZoomSlider.value()
        )
        .classed(
          "root-container-trellis-with-individual-zoom-slider",
          config.individualZoomSlider.value()
        )
        .attr(
          "style",
          "width:" +
            rootContainerWidth +
            "px; " +
            "height:" +
            windowSize.height +
            "px; " +
            "left: " +
            (config.individualZoomSlider.value() ||
            !config.showZoomSliders.value()
              ? "0px"
              : globalZoomSliderContainer.node().getBoundingClientRect().width +
                "px")
        );

      let panelIndex = 0;
      const trellisPanelCount = CountChildren(node, Infinity); // Infinity - haha - hopefully never get there!
      Log.green(LOG_CATEGORIES.General)("trellisPanelCount", trellisPanelCount);

      let rowsPerPage = config.maxRowsPerPage.value();
      let columnsPerPage = config.maxColumnsPerPage.value();
      // Determine how many rows/columns we need - just like Spotfire!
      if (
        trellisPanelCount <=
        config.maxRowsPerPage.value() * config.maxColumnsPerPage.value()
      ) {
        const factor = Math.sqrt(
          trellisPanelCount / (rowsPerPage * columnsPerPage)
        );
        Log.green(LOG_CATEGORIES.General)(
          "factor",
          factor,
          "rows * cols",
          rowsPerPage * columnsPerPage,
          Math.ceil(rowsPerPage * factor)
        );
        rowsPerPage = Math.min(rowsPerPage, Math.ceil(rowsPerPage * factor));
        columnsPerPage = Math.ceil(trellisPanelCount / rowsPerPage);
      }

      // Tweak number of rows/columns
      if (rowsPerPage * (columnsPerPage - 1) >= trellisPanelCount)
        columnsPerPage--;
      if ((rowsPerPage - 1) * columnsPerPage >= trellisPanelCount)
        rowsPerPage--;

      // Just remove everything if the layout has changed
      if (
        rowsPerPage != previousTrellisRowsPerPage ||
        columnsPerPage != previousTrellisColumnsPerPage
      ) {
        rootContainer.selectAll("*").remove();
      }

      previousTrellisColumnsPerPage = columnsPerPage;
      previousTrellisRowsPerPage = rowsPerPage;

      const panelHeight = windowSize.height / rowsPerPage;
      let panelWidth = rootContainerWidth / columnsPerPage;

      // Adjust mod container height so we don't get scrollbars (occurs infrequently)
      MOD_CONTAINER.attr(
        "height",
        Math.ceil(panelHeight * (trellisPanelCount / columnsPerPage))
      );

      // Adjust panelWidth for individual zoom slider
      panelWidth = config.individualZoomSlider.value()
        ? panelWidth - 5
        : panelWidth - 4;

      Log.green(LOG_CATEGORIES.General)(
        "rows/cols per page",
        rowsPerPage,
        columnsPerPage,
        windowSize,
        rootContainerWidth,
        "panelWidth, panelHeight",
        panelWidth,
        panelHeight
      );

      // If not individual zoom slider or is not trellis
      //if (!config.individualZoomSlider.value() || !isTrellis) // todo - check!
      //    rowWidth -= 40; // takes into consideration the margin used by the zoom bar

      let currentRow: d3.D3_SELECTION;

      // Using Bootstrap's row class - the single "row" can contain all trellis panels;
      // they are broken into new lines by using a DIV of class w-100 when a line break
      // is required
      currentRow = d3.select("#row-0").empty()
        ? rootContainer
            .append("div")
            .attr("id", "row-0")
            .classed("row", true)
            .classed("no-gutters", true)
            .classed("gx-1", true) //gutter
            .classed("gy-1", true)
        : d3.select("#row-0");

      Log.green(LOG_CATEGORIES.General)(panelHeight);
      Log.green(LOG_CATEGORIES.General)(currentRow.style.height);

      const trellisRenderingInfo: Array<Partial<TrellisRenderingInfo>> =
        new Array();

      const colClassNumber = Math.floor(12 / columnsPerPage);

      function getOrCreateContainers(
        currentRow: d3.D3_SELECTION,
        panelIndex: number,
        node: DataViewHierarchyNode,
        rowHeight: number
      ): {
        bodyContent: d3.D3_SELECTION;
        bodyHeight: number;
        bodyContainer: d3.D3_SELECTION;
        titleContainer: d3.D3_SELECTION;
      } {
        const subContainer = currentRow
          .select("#trellis-sub-container-" + panelIndex)
          .empty()
          ? currentRow
              .append("div")
              .attr(
                "style",
                "background-color: " +
                  context.styling.general.backgroundColor +
                  ";"
              )
          : d3.select("#trellis-sub-container-" + panelIndex);

        subContainer
          .attr("id", "trellis-sub-container-" + panelIndex)
          .classed("col-sm-" + colClassNumber, true)
          .classed("col-md-" + colClassNumber, true)
          .classed("col-lg-" + colClassNumber, true)
          .classed("col-xl-" + colClassNumber, true);

        let bodyHeight = rowHeight;

        if (node) {
          const titleContainer = subContainer
            .select("#trellis-title-container-" + panelIndex)
            .empty()
            ? subContainer
                .insert("div", "div") // insert before all other divs to make sure it's always at the top
                .attr("id", "trellis-title-container-" + panelIndex)
                .style("border-style", "solid")
                .style("border-width", "1px")
                .style(
                  "border-color",
                  getBorderColor(context.styling.general.backgroundColor)
                )
            : d3.select("#trellis-title-container-" + panelIndex);

          titleContainer.selectAll("*").remove();

          const titleText = titleContainer
            .append("div")
            .classed("trellis-header", true)
            .classed("text-center", true)
            .classed("align-middle", true)
            .style("color", context.styling.general.font.color)
            .style("background-color", () =>
              getComplementaryColor(context.styling.general.backgroundColor)
            )
            .style("border-style", "solid")
            .style("border-width", "1px")
            .style(
              "border-color",
              getBorderColor(context.styling.general.backgroundColor)
            )
            .style(
              "background-color",
              getComplementaryColor(context.styling.general.backgroundColor)
            )
            .style("font-family", context.styling.general.font.fontFamily)
            .style("font-weight", context.styling.general.font.fontWeight)
            .style("font-size", context.styling.general.font.fontSize + "px")

            .text(node.formattedPath());

          bodyHeight =
            rowHeight - titleText.node().getBoundingClientRect().height;

          Log.green(LOG_CATEGORIES.General)(bodyHeight);

          const bodyContainer = subContainer
            .select("#trellis-body-container-" + panelIndex)
            .empty()
            ? subContainer
                .append("div")
                .attr("id", "trellis-body-container-" + panelIndex)
                .style("border-style", "solid")
                .style("border-width", "1px")
                .style(
                  "border-color",
                  getBorderColor(context.styling.general.backgroundColor)
                )
                .style(
                  "background-color",
                  getComplementaryColor(context.styling.general.backgroundColor)
                )
            : d3.select("#trellis-body-container-" + panelIndex);

          const bodyContent = bodyContainer
            .select("#trellis-body-content-" + panelIndex)
            .empty()
            ? bodyContainer
                .append("div")
                .attr("id", "trellis-body-content-" + panelIndex)
                .classed("px-0", true) // 0 padding
                .classed("h-100", true)
                .classed("gx-1", true)
                .classed("gy-1", true)
            : d3.select("#trellis-body-content-" + panelIndex);
          return { bodyContent, bodyHeight, bodyContainer, titleContainer };
        }
      }

      async function RecursiveTrellisedRender(
        node: DataViewHierarchyNode,
        toLevel: number,
        currentLevel: number = 0,
        container: any
      ) {
        if (node.children && currentLevel < toLevel) {
          Log.green(LOG_CATEGORIES.General)(
            `Looping foreach node recursively on ${node.children.length} nodes.`
          );
          const nextLevel = currentLevel++;
          node.children.forEach((node) =>
            RecursiveTrellisedRender(node, toLevel, nextLevel, currentRow)
          );
        } else {
          const columnIndex = panelIndex % columnsPerPage;
          const rowIndex = Math.floor(panelIndex / columnsPerPage);
          if (columnIndex == 0) {
            currentRow.select(".w-100").empty()
              ? currentRow.append("DIV").classed("w-100", true)
              : currentRow.select(".w-100");
          }
          Log.green(LOG_CATEGORIES.General)(
            `PanelIndex ${panelIndex} `,
            "rowIndex",
            rowIndex,
            "columnIndex",
            columnIndex
          );

          const { bodyContent, bodyHeight, bodyContainer } =
            getOrCreateContainers(currentRow, panelIndex, node, panelHeight);

          Log.green(LOG_CATEGORIES.General)(
            "Zoomed panel title",
            trellisPanelZoomedTitle
          );
          Log.green(LOG_CATEGORIES.General)("incrementing panel index");
          panelIndex++;

          const renderedPanelWidth = bodyContainer
            .node()
            .getBoundingClientRect().width as number;

          // If we've come here as a result of a zoom slider change, then just re-render this panel only
          if (
            trellisPanelZoomedTitle == "" ||
            trellisPanelZoomedTitle == node.formattedPath()
          ) {
            Log.green(LOG_CATEGORIES.General)(
              "rendering - Will render panel",
              panelIndex - 1,
              node.formattedPath()
            );
            bodyContent.selectAll("*").remove();

            const renderingInfo: Partial<TrellisRenderingInfo> = {
              node: node,
              container: bodyContent,
              containerSize: { height: panelHeight, width: renderedPanelWidth },
              trellisIndex: panelIndex, // todo - check -1??????
              trellisName: node.formattedPath(),
              trellisRowIndex: rowIndex,
            };
            Log.green(LOG_CATEGORIES.General)("pushing", node.formattedValue());
            trellisRenderingInfo.push(renderingInfo);
          }
        }
      }

      RecursiveTrellisedRender(node, Infinity, 0, null);

      // Remove contents of any panels that were rendered last time that are no longer needed
      let removePanelIndex = panelIndex;
      while (removePanelIndex < previousTrellisPanelCount) {
        Log.green(LOG_CATEGORIES.General)(
          "previous now panel panelIndex",
          removePanelIndex
        );

        d3.select("#trellis-sub-container-" + removePanelIndex)
          .selectAll("*")
          .remove();
        removePanelIndex++;
      }

      previousTrellisPanelCount = trellisPanelCount;

      // Add "empty" panels with no border to make the layout work
      Log.green(LOG_CATEGORIES.General)(panelIndex, columnsPerPage);
      while (panelIndex % columnsPerPage > 0) {
        Log.green(LOG_CATEGORIES.General)(
          "creating additional container to fill the row. PanelIndex",
          panelIndex
        );
        getOrCreateContainers(currentRow, panelIndex, null, panelHeight);
        panelIndex++;
      }

      Log.green(LOG_CATEGORIES.General)("after recursive rendering");
      Log.green(LOG_CATEGORIES.General)(
        "trellisRenderingInfo",
        trellisRenderingInfo,
        trellisRenderingInfo.length
      );

      // Now get the data, and work out the y data domain min/max, if shared y axis
      let minYDataDomain: number;
      let maxYDataDomain: number;
      for (const renderingInfo of trellisRenderingInfo) {
        Log.green(LOG_CATEGORIES.General)(renderingInfo);

        await buildData(renderingInfo.node, dataView, config)
          .then(async (data) => {
            Log.red(LOG_CATEGORIES.DebugDataBailout)("Got data", data);
            renderingInfo.data = data;
            if (renderingInfo.data == undefined) {
              // something's gone wrong with the data building
              // most likely to do with dataView expiring. For now, bail out.
              // A refresh of the dataView should sort things out (e.g. changing a filter)
              return;
            }
            if (!config.individualZoomSlider.value()) {
              minYDataDomain = minYDataDomain
                ? Math.min(minYDataDomain, renderingInfo.data.yDataDomain.min)
                : renderingInfo.data.yDataDomain.min;
              maxYDataDomain = maxYDataDomain
                ? Math.max(maxYDataDomain, renderingInfo.data.yDataDomain.max)
                : renderingInfo.data.yDataDomain.max;
            }
            Log.green(LOG_CATEGORIES.General)(
              "min/max",
              minYDataDomain,
              maxYDataDomain,
              renderingInfo.data.yDataDomain,
              renderingInfo.trellisName
            );
          })
          .catch((error: Error) => {
            Log.red(LOG_CATEGORIES.DebugLogYAxis)(
              "Caught error in buildData",
              error
            );
            MOD_CONTAINER.selectAll("*").remove();

            //mod.controls.errorOverlay.show((error as string));
            throw error;
            //mod.controls.progress.show();
          });
      }

      // Just need to set isAnyMarkedRecords to true for all renderingInfo.data if _any_ have
      // any marked records
      trellisRenderingInfo.map(
        (renderingInfo: Partial<TrellisRenderingInfo>) => {
          if (renderingInfo.data) {
            renderingInfo.data.isAnyMarkedRecords = trellisRenderingInfo.some(
              (renderingInfo: Partial<TrellisRenderingInfo>) =>
                renderingInfo.data?.isAnyMarkedRecords == true
            );
          }
        }
      );

      // Now do the actual rendering
      for (let i = 0; i < trellisRenderingInfo.length; i++) {
        const renderingInfo = trellisRenderingInfo[i];
        Log.green(LOG_CATEGORIES.General)("will render", renderingInfo);
        if (!config.individualZoomSlider.value()) {
          renderingInfo.data.yDataDomain.min = minYDataDomain;
          renderingInfo.data.yDataDomain.max = maxYDataDomain;
        }

        const maxAsString = d3.format(config.GetYAxisFormatString())(
          renderingInfo.data.yDataDomain.max
        );
        const minAsString = d3.format(config.GetYAxisFormatString())(
          renderingInfo.data.yDataDomain.min
        );

        const maxStringLength = Math.max(
          maxAsString.length,
          minAsString.length
        );

        const calculatedLeftMargin =
          (config.individualZoomSlider.value() ? 70 : 40) +
          20 * (maxStringLength / 4);

        Log.red(LOG_CATEGORIES.DebugMarkingOffset)(
          "calculated left margin",
          calculatedLeftMargin
        );

        renderedPanels.push(
          await render(
            spotfireMod,
            state,
            renderingInfo.data,
            xAxisSpotfire,
            renderingInfo.containerSize,
            windowSize,
            calculatedLeftMargin,
            config,
            {
              generalStylingInfo: context.styling.general,
              scales: context.styling.scales,
            },
            mod.controls.tooltip,
            renderingInfo.container,
            mod.controls.contextMenu,
            globalZoomSliderContainer,
            true,
            renderingInfo.trellisIndex,
            renderingInfo.trellisName,
            renderingInfo.trellisRowIndex
          )
        );
      }

      Log.green(LOG_CATEGORIES.General)("Done RecursiveTrellisedRender");
      // Reset trellisPanelZoomedIndex
      setTrellisPanelZoomedTitle("");
    }

    Log.red(LOG_CATEGORIES.DebugLogYAxis)("About to build data");
    if (!isTrellis) {
      buildData(await trellisAxisHierarchy.root(), dataView, config)
        .then(async (data) => {
          Log.red(LOG_CATEGORIES.DebugLogYAxis)("Got data");
          if (data == undefined) {
            // something's gone wrong with the data building
            // most likely to do with dataView expiring. For now, bail out.
            // A refresh of the dataView should sort things out (e.g. changing a filter)
            Log.red(LOG_CATEGORIES.DebugLatestMarking)(
              "Error - data is undefined"
            );
            return;
          }

          Log.green(LOG_CATEGORIES.DebugWebPlayerIssue)("data", data);

          const maxAsString = d3.format(config.GetYAxisFormatString())(
            data.yDataDomain.max
          );
          const minAsString = d3.format(config.GetYAxisFormatString())(
            data.yDataDomain.min
          );

          const maxStringLength = Math.max(
            maxAsString.length,
            minAsString.length
          );

          const calculatedLeftMargin = 80 + 20 * (maxStringLength / 4);
          Log.red(LOG_CATEGORIES.DebugMarkingOffset)(
            "calculated left margin",
            calculatedLeftMargin
          );
          const zoommargin =
            !config.individualZoomSlider.value() || !isTrellis ? 40 : 0;
          const containerSize: Size = {
            height: windowSize.height,
            width: windowSize.width - zoommargin,
          };
          rootContainer
            .attr("style", "width:" + windowSize.width + "px;")
            .attr("style", "height:" + windowSize.height + "px;")
            .classed("root-container-trellis-with-global-zoom-slider", false);

          renderedPanels.push(
            await render(
              spotfireMod,
              state,
              data,
              xAxisSpotfire,
              containerSize,
              windowSize,
              calculatedLeftMargin,
              config,
              {
                generalStylingInfo: context.styling.general,
                scales: context.styling.scales,
              },
              mod.controls.tooltip,
              rootContainer,
              mod.controls.contextMenu,
              globalZoomSliderContainer
            )
          );
        })
        .catch((error: Error) => {
          Log.red(LOG_CATEGORIES.DebugLogYAxis)(
            "Caught error in buildData",
            error
          );
          if (error.message == "DataView Has expired") {
            mod.controls.progress.show();
            // nothing else
          } else {
            mod.controls.progress.hide();
            MOD_CONTAINER.selectAll("*").remove();
            mod.controls.errorOverlay.show(error.message);
            throw error;
          }
        });
    } else {
      Log.green(LOG_CATEGORIES.General)("Rendering trellising with root node");
      try {
        // todo: should we await here or not?       
        TrellisedRender(
          rootContainer,
          globalZoomSliderContainer,
          trellisAxisHierarchy
        ).catch((error: Error) => {
          Log.red(LOG_CATEGORIES.DebugDataBailout)(
            "Caught error from TrellisedRender",
            error
          );

          MOD_CONTAINER.selectAll("*").remove();

          if (error.message == "DataView Has expired") {
            mod.controls.progress.show();
            // nothing else
          } else {
            mod.controls.progress.hide();
            MOD_CONTAINER.selectAll("*").remove();
            mod.controls.errorOverlay.show(error.message);
            throw error.message;
          }
        });
      } catch (error) {
        Log.red(LOG_CATEGORIES.DebugDataBailout)(
          "Caught error from TrellisedRender outside of await block:",
          error
        );
        throw error;
      }
    }

    /**
     * This will add rectangle selection elements to DOM.
     * The callback will check the selection bounding box
     */
    addHandlersSelection((result: any) => {
      if (result.dragSelectActive) return;
      if (result.shouldClearMarking) {
        Log.green(LOG_CATEGORIES.General)("Clearing marking");
        state.disableAnimation = true;
        dataView.clearMarking();
      }
      //const selectionBBox = result.selectionDiv.getBoundingClientRect();
      const selectionBBox: DOMRect =
        result.selectionDiv?.getBoundingClientRect();
      Log.green(LOG_CATEGORIES.General)(
        "index marking result y",
        result.y,
        "bottom",
        result.bottom,
        "height",
        result.height,
        selectionBBox
      );
      renderedPanels.forEach((panel) => {
        // Indexing all the possible conditions to determine the boolean logic below. There are 16 possible conditions to check
        // But not all are required below
        /**
         * All the possible conditions are listed here with their numbers
         */
        /* Log.green(LOG_CATEGORIES.General)("index marking panel", result.y, scrollY, result.scrollY, panel.name, panel.getBoundingClientRect().top, panel.getBoundingClientRect().bottom);
                Log.green(LOG_CATEGORIES.General)("index marking 1", result.y > panel.getBoundingClientRect().top);
                Log.green(LOG_CATEGORIES.General)("index marking 2", result.y < panel.getBoundingClientRect().top);
                Log.green(LOG_CATEGORIES.General)("index marking 3", result.y > panel.getBoundingClientRect().bottom);
                Log.green(LOG_CATEGORIES.General)("index marking 4", result.y < panel.getBoundingClientRect().bottom);
                Log.green(LOG_CATEGORIES.General)("index marking 5", result.bottom > panel.getBoundingClientRect().top);
                Log.green(LOG_CATEGORIES.General)("index marking 6", result.bottom < panel.getBoundingClientRect().top);
                Log.green(LOG_CATEGORIES.General)("index marking 7", result.bottom > panel.getBoundingClientRect().bottom);
                Log.green(LOG_CATEGORIES.General)("index marking 8", result.bottom < panel.getBoundingClientRect().bottom);
                Log.green(LOG_CATEGORIES.General)("index marking 9", result.x < panel.getBoundingClientRect().x);
                Log.green(LOG_CATEGORIES.General)("index marking 10", result.x > panel.getBoundingClientRect().x);
                Log.green(LOG_CATEGORIES.General)("index marking 11", result.right < panel.getBoundingClientRect().right);
                Log.green(LOG_CATEGORIES.General)("index marking 12", result.right > panel.getBoundingClientRect().right);
                Log.green(LOG_CATEGORIES.General)("index marking 13", result.x < panel.getBoundingClientRect().right);
                Log.green(LOG_CATEGORIES.General)("index marking 14", result.x > panel.getBoundingClientRect().right);
                Log.green(LOG_CATEGORIES.General)("index marking 15", result.right < panel.getBoundingClientRect().x);
                Log.green(LOG_CATEGORIES.General)("index marking 16", result.right > panel.getBoundingClientRect().x);*/

        // Determine which panels are in scope for marking and mark as appropriate
        if (
          // Todo: consider optimising this boolean logic, however, once it's been optimised, it's very difficult to debug

          // X
          ((result.x > panel.getBoundingClientRect().x &&
            result.right < panel.getBoundingClientRect().right &&
            result.x < panel.getBoundingClientRect().right) || // 10, 11, 13
            (result.x > panel.getBoundingClientRect().x &&
              result.right > panel.getBoundingClientRect().right &&
              result.x < panel.getBoundingClientRect().right) || // 10, 12, 13
            (result.x < panel.getBoundingClientRect().x &&
              result.right < panel.getBoundingClientRect().right &&
              result.x < panel.getBoundingClientRect().right &&
              result.right > panel.getBoundingClientRect().x) || // 9, 11, 13, 16
            (result.x < panel.getBoundingClientRect().x &&
              result.right > panel.getBoundingClientRect().right &&
              result.x < panel.getBoundingClientRect().right &&
              result.right > panel.getBoundingClientRect().x)) && // 9, 12, 13, 16
          // Y
          ((result.y > panel.getBoundingClientRect().top &&
            result.y < panel.getBoundingClientRect().bottom &&
            result.bottom > panel.getBoundingClientRect().top) ||
            (result.y < panel.getBoundingClientRect().top &&
              result.y < panel.getBoundingClientRect().bottom &&
              result.bottom > panel.getBoundingClientRect().top &&
              result.bottom < panel.getBoundingClientRect().bottom) ||
            (result.y < panel.getBoundingClientRect().top &&
              result.y < panel.getBoundingClientRect().bottom &&
              result.bottom > panel.getBoundingClientRect().top &&
              result.bottom > panel.getBoundingClientRect().bottom))
        ) {
          Log.green(LOG_CATEGORIES.General)(
            "index marking in scope",
            panel.name
          );

          // Now need to calculate the x, y, width and height of the marking rect relative to the panel
          const clamp = (value: number, min: number, max: number) =>
            Math.min(Math.max(min, value), max);

          const x = clamp(
            result.x - panel.getBoundingClientRect().x,
            0,
            panel.getBoundingClientRect().width
          );
          const y = clamp(
            result.y - panel.getBoundingClientRect().y,
            0,
            panel.getBoundingClientRect().bottom
          );
          const width = clamp(
            result.width,
            0,
            panel.getBoundingClientRect().width
          );
          const height = clamp(
            result.height,
            0,
            panel.getBoundingClientRect().height
          );

          panel.mark(x, y, width, height, result.ctrlKey);
        }
      });
    });

    mod.controls.progress.hide();

    window.setTimeout(() => {
      context.signalRenderComplete();
      state.disableAnimation = false;
    }, 1000);
  }
});

/**
 * subscribe callback wrapper with general error handling, row count check and an early return when the data has become invalid while fetching it.
 *
 * The only requirement is that the dataview is the first argument.
 * @param mod - The mod API, used to show error messages.
 * @param rowLimit - Optional row limit.
 */
export function generalErrorHandler<
  T extends (dataView: Spotfire.DataView, ...args: any) => any
>(mod: Spotfire.Mod, rowLimit = 55000): (a: T) => T {
  return function (callback: T) {
    return async function callbackWrapper(
      dataView: Spotfire.DataView,
      ...args: any
    ) {
      try {
        const errors = await dataView.getErrors();
        if (errors.length > 0) {
          mod.controls.progress.hide();
          mod.controls.errorOverlay.show(errors, "DataView");
          return;
        }
        mod.controls.errorOverlay.hide("DataView");

        /**
         * User interaction while rows were fetched. Return early and respond to next subscribe callback.
         */
        const allRows = await dataView.allRows();
        if (allRows == null) {
          return;
        }

        await callback(dataView, ...args);

        mod.controls.errorOverlay.hide("General");
      } catch (e: any) {
        mod.controls.progress.hide();
        mod.controls.errorOverlay.show(
          e.message || e || "☹️ Something went wrong, check developer console",
          "General"
        );
        {
          throw e;
        }
      }
    } as T;
  };
}
