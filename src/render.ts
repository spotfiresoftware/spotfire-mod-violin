/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

// @ts-ignore
import * as d3 from "d3";

<<<<<<< HEAD
import { scaleAsinh } from "./asinhScale";

import {
  Size,
  Tooltip,
  DataViewRow,
  ContextMenu,
  GeneralStylingInfo,
  ScaleStylingInfo,
} from "spotfire-api";

import {
  setTrellisPanelZoomedTitle,
  LOG_CATEGORIES,
  Log,
  GenerateRoundedRectSvg,
  getContrastingColor,
=======
import {
  Size,
  Tooltip,
  DataViewRow,
  ContextMenu,
  GeneralStylingInfo,
  ScaleStylingInfo,
} from "spotfire-api";

import {
  setTrellisPanelZoomedTitle,
  MOD_CONTAINER,
  windowScrollYTracker,
  violinWidthPadding,
>>>>>>> 7df09fe71b6c7cca30c104321bcf5cd7cc99ea5f
} from "./index";

import { LOG_CATEGORIES, Log } from "./log";

// @ts-ignore
import { ShapeInfo, Intersection } from "kld-intersections";
import { renderStatisticsTable } from "./render-stats-table";
import { SumStatsConfig } from "./sumstatsconfig";
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
<<<<<<< HEAD
=======
  TableContainerSpecs,
  YScaleSpecs,
>>>>>>> 7df09fe71b6c7cca30c104321bcf5cd7cc99ea5f
} from "./definitions";
import { renderBoxplot } from "./render-box-plot";
import { renderViolin } from "./render-violin-plot";
import { renderComparisonCircles } from "./render-comparison-circles";
import { renderStatisticsTableHorizontal } from "./render-stats-table-horizontal";
import { renderContinuousAxis, renderGridLines } from "./continuousAxis";
import { createZoomSlider } from "./zoom-sliders";
import { calculateMinMaxZoom, getContrastingColor } from "./utility-functions";
import {
  renderReferenceLinesAndPoints,
  renderTrendLines,
} from "./render-reference-and-trend-lines";

/*
 * Adapted from:
 * https://stackoverflow.com/questions/34893707/is-there-a-polyfill-for-getintersectionlist-getenclosurelist-checkintersection
 * For Firefox support for checkIntersection methods used for box plot (points) marking
 */
const checkIntersectionPolyfill = function (element: any, rect: any) {
  // @ts-ignore
  var root = this.ownerSVGElement || this;

  // Get the bounding boxes of the two elements
  var bbox1 = element.getBBox();
  var bbox2 = rect;

  // Check if the two bounding boxes intersect
  if (
    bbox1.x + bbox1.width > bbox2.x &&
    bbox1.y + bbox1.height > bbox2.y &&
    bbox2.x + bbox2.width > bbox1.x &&
    bbox2.y + bbox2.height > bbox1.y
  ) {
    // Check if the two elements actually intersect
    var intersection = root.createSVGRect();
    intersection.x = Math.max(bbox1.x, bbox2.x);
    intersection.y = Math.max(bbox1.y, bbox2.y);
    intersection.width =
      Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width) - intersection.x;
    intersection.height =
      Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height) - intersection.y;
    return intersection.width > 0 && intersection.height > 0;
  } else {
    return false;
  }
};

// @ts-ignore
if (!SVGElement.prototype.checkIntersection) {
  // @ts-ignore
  SVGElement.prototype.checkIntersection = checkIntersectionPolyfill;
}

const SHALL_SCROLL_Y_AXIS = false;

/**
 * Renders an instance of the Violin mod; this is called once if not trellised, or once per trellis panel
 *
 * @param {RenderState} state
 * @param {Spotfire.DataView} dataView - dataView
 * @param {Spotfire.Size} containerSize - windowSize
 * @param {Partial<Options>} config - config
 * @param {Object} styling - styling
 * @param {Tooltip} tooltip - tooltip
 * @param {any} popoutClosedEventEmitter - popoutClosedEventEmitter
 */
export async function render(
  this: any,
  spotfireMod: Spotfire.Mod,
  state: RenderState,
  plotData: Data,
  xAxisSpotfire: Spotfire.Axis,
  containerSize: Size,
<<<<<<< HEAD
  windowSize: Size,
=======
>>>>>>> 7df09fe71b6c7cca30c104321bcf5cd7cc99ea5f
  calculatedLeftMargin: number,
  config: Partial<Options>,
  styling: {
    generalStylingInfo: GeneralStylingInfo;
    scales: ScaleStylingInfo;
  },
  tooltip: Tooltip,
  container: D3_SELECTION,
  contextMenu: ContextMenu,
<<<<<<< HEAD
  globalZoomSliderContainer: D3_SELECTION,
  isTrellis: boolean = false,
  trellisIndex: number = -1,
  trellisName: string = "",
  trellisRowIndex: number = 0
=======
  isTrellis: boolean = false,
  trellisIndex: number = -1,
  trellisName: string = "",
  trellisRowIndex: number = 0,
  panelHeight: number = 0
>>>>>>> 7df09fe71b6c7cca30c104321bcf5cd7cc99ea5f
): Promise<RenderedPanel> {
  if (state.preventRender) {
    Log.green(LOG_CATEGORIES.Rendering)("State prevents render");
    // Early return if the state currently disallows rendering.
    return;
  }

<<<<<<< HEAD
=======
  Log.red(LOG_CATEGORIES.ShowHideZoomSliders)("container", container);

  // Clear the container
  container.selectAll("*").remove();

>>>>>>> 7df09fe71b6c7cca30c104321bcf5cd7cc99ea5f
  Log.green(LOG_CATEGORIES.Rendering)("In Render");

  Log.green(LOG_CATEGORIES.Rendering)(
    "Plotdata min/max",
    plotData.yDataDomain.min,
    plotData.yDataDomain.max
  );

  container.style(
    "background-color",
    styling.generalStylingInfo.backgroundColor
  );

  // IMPORTANT - use these to determine if is individual zoom slider!
  // - it's so easy to forget to check both conditions and get into a nasty mess...
<<<<<<< HEAD
  const isTrellisWithIndividualZoom =
    isTrellis &&
    config.showZoomSliders.value() &&
    config.yScalePerTrellisPanel.value();

  const isTrellisWithIndividualYscale =
    isTrellis && config.yScalePerTrellisPanel.value();

  //d3.select("#mod-container")
  const svg = container
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("classed", "main-svg-container");

  const patternSize = 2;


  const noDataPattern = svg
    .append("pattern")
    .attr("id", "no-data")
    .attr("x", 1)
    .attr("y", 1)
    .attr("width", patternSize * 2)
    .attr("height", patternSize * 2)
    .attr("patternUnits", "userSpaceOnUse");

  noDataPattern
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", patternSize)
    .attr("height", patternSize)
    .style(
      "fill",
      getContrastingColor(styling.generalStylingInfo.backgroundColor)
    );
  noDataPattern

    .append("rect")
    .attr("x", patternSize)
    .attr("y", patternSize)
    .attr("width", patternSize)
    .attr("height", patternSize)
    .style(
      "fill",
      getContrastingColor(styling.generalStylingInfo.backgroundColor)
    );

  const linearPortionPattern = svg
    .append("pattern")
    .attr("id", "linear-portion")
    .attr("x", 1)
    .attr("y", 1)
    .attr("width", patternSize * 2)
    .attr("height", patternSize * 2)
    .attr("patternUnits", "userSpaceOnUse");
  linearPortionPattern
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", patternSize)
    .attr("height", patternSize)
    .style("fill", "red");
  linearPortionPattern
    .append("rect")
    .attr("x", patternSize)
    .attr("y", patternSize)
    .attr("width", patternSize)
    .attr("height", patternSize)
    .style("fill", "red");


=======
  const isTrellisWithIndividualYscale =
    isTrellis && config.yScalePerTrellisPanel.value();

>>>>>>> 7df09fe71b6c7cca30c104321bcf5cd7cc99ea5f
  // const animationSpeed = state.disableAnimation ? 0 : 500;
  const animationSpeed = 0; // consider doing something more clever with animation in v2.0?

  Log.green(LOG_CATEGORIES.DebugAnimation)(animationSpeed);

  Log.green(LOG_CATEGORIES.Rendering)(plotData);

<<<<<<< HEAD
  /**
   * Calculating the position and size of the chart
   */

=======
>>>>>>> 7df09fe71b6c7cca30c104321bcf5cd7cc99ea5f
  // Display warning if symlog y axis
  d3.select(".warning-icon")
    .attr(
      "style",
      "visibility:" +
        (config.yAxisScaleType.value() == "symlog" &&
        config.symLogWarningDismissed.value() == false
          ? "visible;"
          : "hidden;")
    )
    .on("click", () => {
      d3.select(".warning-info-popup").attr("style", "visibility:visible");
    });
<<<<<<< HEAD

  Log.blue(LOG_CATEGORIES.PopupWarning)(
    d3.select(".warning-info-popup"),
    d3.select(".warning-info-popup").select("a")
  );
  d3.select(".warning-info-popup")
    .select("a")
    .on("click", (event: MouseEvent) => {
      Log.blue(LOG_CATEGORIES.PopupWarning)("clicked");
      event.stopPropagation();
      config.symLogWarningDismissed.set(true);
    });

  const margin = {
    top: 20,
    bottom: isTrellis ? 40 : 15,
    left: calculatedLeftMargin,
  };
  const padding = { violinX: 20, betweenPlotAndTable: 20 };
  const width = containerSize.width - margin.left;
  const height = containerSize.height;

  let fontClass = "regularfont";

  if (height < 360 || width < 360) {
    fontClass = "smaller-font";
  } else if (height < 500 || width < 500) {
    fontClass = "small-font";
  } else {
    fontClass = "medium-font";
  }

  Log.green(LOG_CATEGORIES.Rendering)(container.node().getBoundingClientRect());

  Log.green(LOG_CATEGORIES.Rendering)(
    "Show chart size:",
    containerSize,
    width,
    height
  );

  // Remove everything from the container;
  container.selectAll(".summary-table1").remove();
  //container.selectAll("#zoom-slider").remove();

  const g = svg
    .append("g")
    // .attr("id", "dragcont")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  /**
   * Order categories, build plotData.sumStats (summary statistics)
   */
  let orderedCategories = plotData.categories;
  Log.red(LOG_CATEGORIES.DebugXaxisFiltering)(
    "orderedCategories before sort:",
    orderedCategories,
    "trellis",
    trellisName
  );

  let tempOrderedCategories: any = [];
  Log.green(LOG_CATEGORIES.Rendering)("orderBy", config.orderBy.value());
  if (config.orderBy.value()! != "") {
    //plotData.sumStats
    const orderBySettings = config.orderBy.value()!.split(">");
    // [0] is the name of the property to sort on
    // [1] is the sort direction - one of left, right, unordered
    // Get the property to sort on
    const propertyToSortSettings = SumStatsConfig.find(
      (s: SumStatsSettings) => s.name == orderBySettings[0]
    );

    // Only sort if that property is enabled in the table
    if (
      !Array.from(config.GetStatisticsConfigItems().values()).some(
        (m: StatisticsConfig) =>
          m.tableEnabled && m.name == propertyToSortSettings.name
      )
    ) {
      orderBySettings[1] = "unordered";
    }

    plotData.sumStats.forEach((el: any, i: number) => {
      tempOrderedCategories.push({ key: i, value: el });
    });

    Log.green(LOG_CATEGORIES.DebugXaxisFiltering)(
      "tempOrderedCategories",
      tempOrderedCategories
    );

    if (orderBySettings[1] == "ordered-right") {
      tempOrderedCategories = tempOrderedCategories.sort((a: any, b: any) =>
        d3.descending(
          a.value[propertyToSortSettings.property],
          b.value[propertyToSortSettings.property]
        )
      );
      plotData.sumStats = new Map(
        Array.from(plotData.sumStats).sort((a, b) =>
          d3.descending(
            a[1][propertyToSortSettings.property],
            b[1][propertyToSortSettings.property]
          )
        )
      );
    }
    if (orderBySettings[1] == "ordered-left") {
      tempOrderedCategories = tempOrderedCategories.sort((a: any, b: any) =>
        d3.ascending(
          a.value[propertyToSortSettings.property],
          b.value[propertyToSortSettings.property]
        )
      );
      plotData.sumStats = new Map(
        Array.from(plotData.sumStats).sort((a, b) =>
          // a[0], b[0] is the key of the map
          d3.ascending(
            a[1][propertyToSortSettings.property],
            b[1][propertyToSortSettings.property]
          )
        )
      );
    }

    const allCategoriesCopy = [...orderedCategories];
    orderedCategories = [];
    tempOrderedCategories.forEach((el: any) => {
      orderedCategories.push(el.key);
    });

    // Now copy across any categories missing from tempOrderedCategories
    allCategoriesCopy.forEach((category) => {
      if (!orderedCategories.find((c: any) => c == category)) {
        orderedCategories.push(category);
      }
    });
  }

  // x-axis item for comparison circles
  if (config.comparisonCirclesEnabled.value()) {
    orderedCategories.push("Comparison");
  }

  // Draw x axis
  Log.red(LOG_CATEGORIES.DebugXaxisFiltering)(
    "orderedCategories before xScale:",
    orderedCategories,
    "trellis",
    trellisName
  );
  const xScale = d3
    .scaleBand()
    .range([0, width])
    .domain(orderedCategories) //earlier we extracted the unique categories into an array
    .paddingInner(0) // This is important: it is the space between 2 groups. 0 means no padding. 1 is the maximum.
    // Originally, the padding was set to 0.2 but this led to problems aligning the summary table cells accurately,
    // Therefore, padding has been set to 0... This also reduces the space consumed. Violins touching each other is
    // not a huge issue in my opinion (A. Berridge)
    .paddingOuter(0)
    .align(0);

  //summary columns

  // Render the summary statistics table
  const tableContainer: D3_SELECTION = renderStatisticsTable(
    config,
    styling,
    container,
    margin,
    fontClass,
    plotData,
    orderedCategories,
    xScale.bandwidth(),
    tooltip
  );

  Log.green(LOG_CATEGORIES.Rendering)(
    tableContainer.node().getBoundingClientRect()
  );
  const heightAvailable = Math.max(
    0,
    height -
      tableContainer.node().getBoundingClientRect().height -
      margin.top -
      margin.bottom
  );

  Log.green(LOG_CATEGORIES.Rendering)(
    "height, heightAvailable",
    height,
    heightAvailable,
    "containerSize",
    containerSize,
    tableContainer.node().getBoundingClientRect(),
    tableContainer.node().clientHeight
  );
  //tableContainer.attr("style", "top:" + heightAvailable + "px");
  Log.green(LOG_CATEGORIES.Rendering)(tableContainer.node());

  /**
   * Set the width and height of svg and translate it
   */
  svg.attr(
    "style",
    "width:" +
      (width + margin.left) +
      "px; " +
      "height:" +
      (heightAvailable + 30) +
      "px;"
  );

  const xAxis = d3.axisBottom(xScale);

  // Render the x axis
  g.append("g")
    .attr("class", "x-axis")
    //.attr("transform", "translate(0," + heightAvailable + ")")
    .attr("font-family", styling.scales.font.fontFamily)
    .attr("fill", styling.scales.font.color)
    .attr("font-weight", styling.scales.font.fontWeight)
    .style("font-size", styling.scales.font.fontSize + "px")
    .call(xAxis);

  /**
   * Draw y axis
   */
  let minZoom: number;
  let maxZoom: number;

  if (isTrellisWithIndividualYscale) {
    Log.green(LOG_CATEGORIES.Rendering)(
      config.trellisIndividualZoomSettings.value()
    );
    if (
      config.showZoomSliders.value() &&
      config.trellisIndividualZoomSettings.value() != ""
    ) {
      const trellisZoomConfigs = config.GetTrellisZoomConfigs();
      Log.green(LOG_CATEGORIES.Rendering)(trellisZoomConfigs, trellisName);
      const trellisZoomConfig = trellisZoomConfigs.find(
        (d: TrellisZoomConfig) => d.trellisName == trellisName
      );

      if (trellisZoomConfig != undefined) {
        Log.green(LOG_CATEGORIES.Rendering)("found zoom", trellisZoomConfig);
        if (trellisZoomConfig.minZoomUnset) {
          minZoom = plotData.yDataDomain.min;
        } else {
          minZoom = trellisZoomConfig.minZoom; //- tempminZoom * 0.05;
        }
        if (trellisZoomConfig.maxZoomUnset) {
          maxZoom = plotData.yDataDomain.max;
        } else {
          maxZoom = trellisZoomConfig.maxZoom;
        }
      } else {
        minZoom = plotData.yDataDomain.min;
        maxZoom = plotData.yDataDomain.max;
      }
    } else {
      minZoom = plotData.yDataDomain.min;
      maxZoom = plotData.yDataDomain.max;
    }
  } else {
    Log.green(LOG_CATEGORIES.DebugResetGlobalZoom)(
      "Getting min/max zoom from config if set",
      config.yZoomMaxUnset.value()
    );
    minZoom = config.yZoomMinUnset.value()
      ? plotData.yDataDomain.min
      : config.yZoomMin.value();
    maxZoom = config.yZoomMaxUnset.value()
      ? plotData.yDataDomain.max
      : config.yZoomMax.value();
  }

  Log.green(LOG_CATEGORIES.Rendering)(
    "config zoom",
    config.yZoomMin.value(),
    config.yZoomMax.value(),
    config.yZoomMinUnset.value(),
    config.yZoomMaxUnset.value()
  );
  Log.green(LOG_CATEGORIES.DebugLogYAxis)("minZoom, maxZoom", minZoom, maxZoom);

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
        .range([heightAvailable - padding.betweenPlotAndTable, 0]);
    } else {
      Log.red(LOG_CATEGORIES.AsinhScale)("LinearPortion", linearPortion);

      yScale = scaleAsinh()
        .domain([minZoom, maxZoom]) //y domain using our min and max values calculated earlier
        .range([heightAvailable - padding.betweenPlotAndTable, 0])
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
=======

  Log.blue(LOG_CATEGORIES.PopupWarning)(
    d3.select(".warning-info-popup"),
    d3.select(".warning-info-popup").select("a")
  );
  d3.select(".warning-info-popup")
    .select("a")
    .on("click", (event: MouseEvent) => {
      Log.blue(LOG_CATEGORIES.PopupWarning)("clicked");
      event.stopPropagation();
      config.symLogWarningDismissed.set(true);
    });

  const margin = {
    top: isTrellis ? 10 : 20,
    bottom: isTrellis ? 10 : 15,
    left: config.isVertical ? calculatedLeftMargin : 0,
    right: 8,
  };

  const padding = { violinX: 20, betweenPlotAndTable: 10 };
  const containerWidth = containerSize.width;
  const containerHeight = containerSize.height;

  let fontClass = "regularfont";

  if (containerHeight < 360 || containerWidth < 360) {
    fontClass = "smaller-font";
  } else if (containerHeight < 500 || containerWidth < 500) {
    fontClass = "small-font";
  } else {
    fontClass = "medium-font";
  }

  Log.green(LOG_CATEGORIES.Rendering)(container.node().getBoundingClientRect());

  Log.green(LOG_CATEGORIES.LayoutOptimization)(
    "Show chart size:",
    containerSize,
    containerWidth,
    containerHeight
  );

  let tableContainer: D3_SELECTION;

  let svg: D3_SELECTION;

  // Horizontal, table container must be rendered before SVG
  // Vertical, SVG must be rendered before table
  if (config.isVertical) {
    svg = container
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("classed", "main-svg-container");

    tableContainer = container
      .append("div")
      .classed("table-container-horizontal", false);
  } else {
    tableContainer = container
      .append("div")
      .classed("table-container-horizontal", true);
    svg = container
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("classed", "main-svg-container")
      .attr("width", "0px")
      .attr("height", "0px");
  }

  const g = svg.append("g");

  const patternSize = 2;

  const noDataPattern = svg
    .append("pattern")
    .attr("id", "no-data")
    .attr("x", 1)
    .attr("y", 1)
    .attr("width", patternSize * 2)
    .attr("height", patternSize * 2)
    .attr("patternUnits", "userSpaceOnUse");
  noDataPattern
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", patternSize)
    .attr("height", patternSize)
    .style(
      "fill",
      getContrastingColor(styling.generalStylingInfo.backgroundColor)
    );
  noDataPattern
    .append("rect")
    .attr("x", patternSize)
    .attr("y", patternSize)
    .attr("width", patternSize)
    .attr("height", patternSize)
    .style(
      "fill",
      getContrastingColor(styling.generalStylingInfo.backgroundColor)
    );

  const linearPortionPattern = svg
    .append("pattern")
    .attr("id", "linear-portion")
    .attr("x", 1)
    .attr("y", 1)
    .attr("width", patternSize * 2)
    .attr("height", patternSize * 2)
    .attr("patternUnits", "userSpaceOnUse");
  linearPortionPattern
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", patternSize)
    .attr("height", patternSize)
    .style("fill", "red");
  linearPortionPattern
    .append("rect")
    .attr("x", patternSize)
    .attr("y", patternSize)
    .attr("width", patternSize)
    .attr("height", patternSize)
    .style("fill", "red");

  // Remove everything from the container;
  container.selectAll(".summary-table1").remove();
  //container.selectAll("#zoom-slider").remove();

  /**
   * Order categories, build plotData.sumStats (summary statistics)
   */
  let orderedCategories = plotData.categories;
  Log.red(LOG_CATEGORIES.DebugXaxisFiltering)(
    "orderedCategories before sort:",
    orderedCategories,
    "trellis",
    trellisName
  );

  let tempOrderedCategories: any = [];
  Log.green(LOG_CATEGORIES.Rendering)("orderBy", config.orderBy.value());
  if (config.orderBy.value()! != "") {
    //plotData.sumStats
    const orderBySettings = config.orderBy.value()!.split(">");
    // [0] is the name of the property to sort on
    // [1] is the sort direction - one of left, right, unordered
    // Get the property to sort on
    const propertyToSortSettings = SumStatsConfig.find(
      (s: SumStatsSettings) => s.name == orderBySettings[0]
    );

    // Only sort if that property is enabled in the table
    if (
      !Array.from(config.GetStatisticsConfigItems().values()).some(
        (m: StatisticsConfig) =>
          m.tableEnabled && m.name == propertyToSortSettings.name
      )
    ) {
      orderBySettings[1] = "unordered";
>>>>>>> 7df09fe71b6c7cca30c104321bcf5cd7cc99ea5f
    }
  } else {
    Log.green(LOG_CATEGORIES.DebugResetGlobalZoom)(
      "Getting min/max zoom from config if set",
      config.yZoomMaxUnset.value()
    );
    minZoom = config.yZoomMinUnset.value()
      ? plotData.yDataDomain.min
      : config.yZoomMin.value();
    maxZoom = config.yZoomMaxUnset.value()
      ? plotData.yDataDomain.max
      : config.yZoomMax.value();
  }

  Log.green(LOG_CATEGORIES.Rendering)(
    "config zoom",
    config.yZoomMin.value(),
    config.yZoomMax.value(),
    config.yZoomMinUnset.value(),
    config.yZoomMaxUnset.value()
  );
  Log.green(LOG_CATEGORIES.DebugLogYAxis)("minZoom, maxZoom", minZoom, maxZoom);

  let yScale = d3.scale;
  let ticks: number[];
  let allTicks: number[];

  // Symmetrical log
  if (config.yAxisScaleType.value() == "symlog") {
    yScale = d3
      .scaleSymlog()
      .domain([minZoom, maxZoom]) //y domain using our min and max values calculated earlier
      .range([heightAvailable - padding.betweenPlotAndTable, 0])
      .constant(1);
  }

  // Log
  if (config.yAxisScaleType.value() == "log") {
    yScale = d3
      .scaleLog()
      .domain([minZoom, maxZoom]) //y domain using our min and max values calculated earlier
      .range([heightAvailable - padding.betweenPlotAndTable, 0]);

    // Add a warning to the chart
    svg.append;
  }

  // Keep track of the power labels so we can avoid hiding them later (for symlog scale)
  const powerLabels: string[] = [];
  // Settings common to both symmetrical log and log
  if (
    config.yAxisScaleType.value() == "symlog" ||
    config.yAxisScaleType.value() == "log"
  ) {
    let modulus =
      20 - Math.floor((heightAvailable - padding.betweenPlotAndTable) / 40);
    Log.blue(LOG_CATEGORIES.DebugYScaleTicks)(
      "modulus",
      modulus,
      yScale.ticks()
    );

<<<<<<< HEAD
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
      .range([heightAvailable - padding.betweenPlotAndTable, 0]); //.nice();
    ticks = yScale.ticks((heightAvailable - padding.betweenPlotAndTable) / 40);
    allTicks = ticks;
  }

  const yAxis = d3
    .axisLeft()
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
      .attr("x2", width)
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
      .attr("x2", width)
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
  Log.green(LOG_CATEGORIES.Rendering)(
    "slider",
    yScale(2.0),
    plotData.yDataDomain.min,
    plotData.yDataDomain.max,
    yScale(plotData.yDataDomain.min),
    yScale(plotData.yDataDomain.max)
  );

  const tickSelection = yAxisRendered.selectAll("g.tick");
  //const boundingBoxes:any[] = [];

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

  while (
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
=======
    plotData.sumStats.forEach((el: any, i: number) => {
      tempOrderedCategories.push({ key: i, value: el });
    });

    Log.green(LOG_CATEGORIES.DebugXaxisFiltering)(
      "tempOrderedCategories",
      tempOrderedCategories
    );

    if (orderBySettings[1] == "ordered-right") {
      tempOrderedCategories = tempOrderedCategories.sort((a: any, b: any) =>
        d3.descending(
          a.value[propertyToSortSettings.property],
          b.value[propertyToSortSettings.property]
        )
      );
      plotData.sumStats = new Map(
        Array.from(plotData.sumStats).sort((a, b) =>
          d3.descending(
            a[1][propertyToSortSettings.property],
            b[1][propertyToSortSettings.property]
          )
        )
      );
    }
    if (orderBySettings[1] == "ordered-left") {
      tempOrderedCategories = tempOrderedCategories.sort((a: any, b: any) =>
        d3.ascending(
          a.value[propertyToSortSettings.property],
          b.value[propertyToSortSettings.property]
        )
      );
      plotData.sumStats = new Map(
        Array.from(plotData.sumStats).sort((a, b) =>
          // a[0], b[0] is the key of the map
          d3.ascending(
            a[1][propertyToSortSettings.property],
            b[1][propertyToSortSettings.property]
          )
        )
      );
    }

    const allCategoriesCopy = [...orderedCategories];
    orderedCategories = [];
    tempOrderedCategories.forEach((el: any) => {
      orderedCategories.push(el.key);
    });

    // Now copy across any categories missing from tempOrderedCategories
    allCategoriesCopy.forEach((category) => {
      if (!orderedCategories.find((c: any) => c == category)) {
        orderedCategories.push(category);
      }
    });
  }

  // x-axis item for comparison circles
  if (config.comparisonCirclesEnabled.value()) {
    orderedCategories.push("Comparison");
  }

  const { minZoom, maxZoom }: { minZoom: number; maxZoom: number } =
    calculateMinMaxZoom(
      isTrellisWithIndividualYscale,
      config,
      trellisName,
      plotData
>>>>>>> 7df09fe71b6c7cca30c104321bcf5cd7cc99ea5f
    );
  }

  /**
   * Zoom slider
   */
  const verticalSlider = sliderLeft(
    yScale.copy().domain([plotData.yDataDomain.min, plotData.yDataDomain.max])
  )
    //.min(plotData.yDataDomain.min)
    //.max(plotData.yDataDomain.max)
    //.height(heightAvailable - padding.betweenPlotAndTable - 30)
    //.step((plotData.yDataDomain.max - plotData.yDataDomain.min) / yAxis.ticks())
    //.ticks(1)
    .default([minZoom, maxZoom])
    .on("end ", (val: any) => {
      state.disableAnimation = true;
      if (isTrellisWithIndividualZoom) {
        // Keep track of individual zoomed panel so as not to re-render everything
        setTrellisPanelZoomedTitle(trellisName);
        // Current settings
        const trellisZoomConfigs = config.GetTrellisZoomConfigs();
        Log.green(LOG_CATEGORIES.DebugIndividualYScales)(
          "trellisZoomConfigs",
          trellisZoomConfigs
        );

<<<<<<< HEAD
        const trellisZoomConfig = trellisZoomConfigs?.find(
          (d: TrellisZoomConfig) => {
            Log.green(LOG_CATEGORIES.Rendering)(d);
            return d.trellisName == trellisName;
          }
        );

        Log.green(LOG_CATEGORIES.Rendering)(
          "trellisZoomConfig",
          trellisZoomConfig
        );

        if (trellisZoomConfig != undefined) {
          Log.red(LOG_CATEGORIES.DebugIndividualYScales)(
            "Before setting",
            JSON.stringify(trellisZoomConfigs)
          );
          if (val[0] != plotData.yDataDomain.min) {
            trellisZoomConfig.minZoom = val[0];
            trellisZoomConfig.minZoomUnset = false;
          } else {
            trellisZoomConfig.minZoomUnset = true;
          }
          if (val[1] != plotData.yDataDomain.max) {
            trellisZoomConfig.maxZoom = val[1];
            trellisZoomConfig.maxZoomUnset = false;
          } else {
            trellisZoomConfig.maxZoomUnset = true;
          }
          Log.red(LOG_CATEGORIES.DebugIndividualYScales)(
            "After setting",
            JSON.stringify(trellisZoomConfigs)
          );
          // This will trigger a render, but not in time to stop code execution from continuing below
          config.trellisIndividualZoomSettings.set(
            JSON.stringify(trellisZoomConfigs)
          );
        } else {
          // create and setup config for this panel
          trellisZoomConfigs.push(<TrellisZoomConfig>{
            trellisName: trellisName,
            minZoom: val[0],
            maxZoom: val[1],
            minZoomUnset: val[0] == plotData.yDataDomain.min,
            maxZoomUnset: val[1] == plotData.yDataDomain.max,
          });
          Log.green(LOG_CATEGORIES.Rendering)(trellisZoomConfigs);
          Log.green(LOG_CATEGORIES.Rendering)(
            JSON.stringify(trellisZoomConfigs)
          );
          config.trellisIndividualZoomSettings.set(
            JSON.stringify(trellisZoomConfigs)
          );
        }
      } else {
        Log.green(LOG_CATEGORIES.DebugZoomReset)(
          "setting zoom",
          val,
          config.yZoomMin.value(),
          config.yZoomMax.value()
        );
        if (val[0] != plotData.yDataDomain.min) {
          config.yZoomMin.set(val[0]);
          config.yZoomMinUnset.set(false);
        } else {
          config.yZoomMinUnset.set(true);
        }
        if (val[1] != plotData.yDataDomain.max) {
          config.yZoomMax.set(val[1]);
          config.yZoomMaxUnset.set(false);
        } else {
          config.yZoomMaxUnset.set(true);
        }
      }
    });

  verticalSlider.handle(GenerateRoundedRectSvg(14, 14, 3, 3, 3, 3));

  // WARNING: verticalSlider.height() is buggy! Don't use it.

  let sliderSvg: d3.D3_SELECTION;
  if (!isTrellis) {
    Log.green(LOG_CATEGORIES.Rendering)(globalZoomSliderContainer);
    // WARNING: .height()
    globalZoomSliderContainer.selectAll("*").remove();
    Log.green(LOG_CATEGORIES.Rendering)(
      "appending sliderSvg to ",
      svg,
      " for ",
      trellisName
    );
    sliderSvg = globalZoomSliderContainer
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("id", "slider-container" + trellisIndex)
      .attr("height", heightAvailable)
      .attr("width", 20);
    sliderSvg
      .append("g")
      .attr("class", "vertical-zoom-slider")
      .attr("transform", "translate(10, " + margin.top / 2 + ")")
      .call(verticalSlider);
  } else if (config.showZoomSliders.value() && !isTrellisWithIndividualYscale) {
    // Show global zoom slider - zoom sliders are enabled, and a single y scale is selected
    verticalSlider.height(windowSize.height - margin.bottom - margin.top - 10);
    globalZoomSliderContainer.selectAll("*").remove();
    Log.green(LOG_CATEGORIES.Rendering)(
      "appending sliderSvg to ",
      svg,
      " for ",
      trellisName
    );
    sliderSvg = globalZoomSliderContainer
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("id", "slider-container" + trellisIndex)
      .attr("height", windowSize.height - 10)
      .attr("width", 20);
    sliderSvg
      .append("g")
      .attr("class", "vertical-zoom-slider")
      .attr("transform", "translate(10, " + margin.top + ")")
      .call(verticalSlider);
  } else if (config.showZoomSliders.value() && isTrellisWithIndividualYscale) {
    // Trellis - individual zoom sliders
    sliderSvg = svg
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("id", "slider-container" + trellisIndex)
      .attr("height", containerSize.height);
    sliderSvg.selectAll("*").remove();

    sliderSvg
      .append("g")
      .attr("class", "vertical-zoom-slider")
      .attr("transform", "translate(20, " + margin.top + ")")
      .call(verticalSlider);
  }

  // Reset zoom
  sliderSvg?.on("contextmenu", function (event: PointerEvent) {
    event.preventDefault(); // Prevents browser native context menu from being shown.
    event.stopPropagation(); // Prevents default mod context menu to be shown.
    contextMenu
      .show(event.clientX, event.clientY, [
        {
          text: "Reset Zoom",
          enabled: true,
        },
      ])
      .then(() => {
        if (isTrellis && config.yScalePerTrellisPanel.value()) {
          const trellisZoomConfigs = config.GetTrellisZoomConfigs();

          Log.blue(LOG_CATEGORIES.DebugIndividualYScales)(trellisZoomConfigs);

          let trellisZoomConfig = trellisZoomConfigs.find(
            (zc: TrellisZoomConfig) => zc.trellisName == trellisName
          );

          if (trellisZoomConfig != undefined) {
            trellisZoomConfig.minZoomUnset = true;
            trellisZoomConfig.maxZoomUnset = true;
          }

          // Keep track of the panel we are resetting
          setTrellisPanelZoomedTitle(trellisName);

          // Persist the individual zoom settings
          config.trellisIndividualZoomSettings.set(
            JSON.stringify(trellisZoomConfigs)
          );
        } else {
          Log.green(LOG_CATEGORIES.DebugResetGlobalZoom)("Resetting");
          config.ResetGlobalZoom();
        }
      });
  });

  /**
   * Trend lines
   */
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
              .x((d: any) => xScale(d.x) + xScale.bandwidth() / 2)
              .y((d: any) => yScale(d.y))
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
              .x((d: any) => xScale(d.x) + xScale.bandwidth() / 2)
              .y((d: any) => yScale(d.y))
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

  /**
   * Render violin
   */
  if (config.includeViolin.value() && config.drawViolinUnderBox.value()) {
    renderViolin(
      plotData,
      orderedCategories,
      xScale,
      yScale,
      height,
      margin,
      g,
      tooltip,
      xAxisSpotfire,
      state,
      animationSpeed,
      heightAvailable,
      config,
      styling.generalStylingInfo
    );
  }

  /**
   * Render comparison circles if enabled
   */
  if (config.comparisonCirclesEnabled.value()) {
    renderComparisonCircles(
      config,
      trellisIndex,
      g,
      xScale,
      yScale,
      tooltip,
      heightAvailable,
      plotData,
      styling.generalStylingInfo.backgroundColor,
      state
    );
  }

  /**
   * Render box plot if option is selected
   */
  if (config.includeBoxplot.value()) {
    const start = performance.now();
    renderBoxplot(
      styling,
      plotData,
      xScale,
      yScale,
      height,
      g,
      tooltip,
      xAxisSpotfire,
      state,
      animationSpeed,
      config
    );
    
    Log.green(LOG_CATEGORIES.DebugBigData)(
      "Box plot rendering took: " + (performance.now() - start) + " ms"
    );
  }

  /**
   * Render violin, if it's enabled, and should be drawn over the box
   */
  if (config.includeViolin.value() && !config.drawViolinUnderBox.value()) {
    renderViolin(
      plotData,
      orderedCategories,
      xScale,
      yScale,
      height,
      margin,
      g,
      tooltip,
      xAxisSpotfire,
      state,
      animationSpeed,
      heightAvailable,
      config,
      styling.generalStylingInfo
    );
  }

  /**
   * Add reference lines/points if any are enabled
   */
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
          Log.green(LOG_CATEGORIES.ReferenceLines)(d[0], xScale(d[0]));
          return (
            "translate(" +
            ((xScale(d[0]) ? xScale(d[0]) : 0) + xScale.bandwidth() / 2) +
            "," +
            (yScale(d[1][sumStatsSetting.property]) +
              sumStatsSetting.verticalOffset(xScale.bandwidth())) +
            ") rotate(" +
            sumStatsSetting.rotation +
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
          return (
            "translate(" +
            ((xScale(d[0]) ? xScale(d[0]) : 0) +
              sumStatsSetting.labelHorizOffset(xScale.bandwidth())) +
            "," +
            (yScale(d[1][sumStatsSetting.property]) +
              sumStatsSetting.labelVerticalOffset) +
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

  //** Display p-value results from the one-way ANOVA test

  // Add p-value text
  if (config.showPvalue.value()) {
    Log.green(LOG_CATEGORIES.Rendering)(plotData.pValue);
    if (plotData.pValue === "NA") {
      Log.green(LOG_CATEGORIES.Rendering)("ANOVA NA");
      svg
        .append("text")
        .classed(fontClass, true)
        .style("font-family", styling.generalStylingInfo.font.fontFamily)
        .style("fill", styling.generalStylingInfo.font.color)
        .text("One-way ANOVA test is not applicable.")
        .attr("x", margin.left + 10)
        .attr("y", heightAvailable);
    } else {
      svg
        .append("text")
        .classed(fontClass, true)
        .style("font-family", styling.generalStylingInfo.font.fontFamily)
        // SVG text elements use fill to set the color of the text
        .style("fill", styling.generalStylingInfo.font.color)
        .text("P-value:" + plotData.pValue.toFixed(6) + " (one-way ANOVA)")
        .attr("x", margin.left + 10)
        .attr("y", heightAvailable);
    }
  }

  const renderedPanel: RenderedPanel = {
    name: trellisName,
    boundingClientRect: container.node().getBoundingClientRect(),
    getBoundingClientRect() {
      return container.node().getBoundingClientRect();
    },
    mark(x, y, width, height, ctrlKey) {
      Log.green(LOG_CATEGORIES.Marking)(
        "Render Marking panel",
        trellisName,
        x,
        y,
        width,
        height
      );
      rectMark(trellisName, x, y, width, height, ctrlKey);
    },
  };

  return renderedPanel;

  /**
   *
   *
   *  Rectangular marking
   *
   *
   */

  /**
   * Marking violins/box elements/points
   */
  function rectMark(
    trellisName: string,
    selectionBoxX: number,
    selectionBoxY: number,
    selectionBoxWidth: number,
    selectionBoxHeight: number,
    ctrlKey: boolean
  ) {
    svg.selectAll(".test_points").remove();
    svg.selectAll(".test_rect").remove();
    svg.selectAll(".rect-corner").remove();
    svg.selectAll(".rect-shapeinfo").remove();

    const violinMarkables: any = [];

    // set this to true to enable drawing of rects and circles to aid with debugging violin marking
    const DEBUG_VIOLIN_MARKING = false;

    // Adjust selectionBoxX slightly for non-trellis - not sure why this adjustment is necessary, but it works
    // for now.
    if (!isTrellis) {
      selectionBoxX -= 12;
    }

    Log.blue(LOG_CATEGORIES.DebugViolinIndividualScalesMarking)(
      d3.selectAll(".violin-path-markable")
=======
  Log.green(LOG_CATEGORIES.Rendering)(
    "config zoom",
    config.yZoomMin.value(),
    config.yZoomMax.value(),
    config.yZoomMinUnset.value(),
    config.yZoomMaxUnset.value()
  );
  Log.green(LOG_CATEGORIES.DebugLogYAxis)("minZoom, maxZoom", minZoom, maxZoom);

  // @todo - simplify these variables. There are too many, and it's difficult to
  // understand their meanings, whether they are are all required, and it's difficult
  // to make sure they are all specified when switching between horizontal and vertical
  let tableContainerSpecs: TableContainerSpecs;

  let xScale: d3.scale;

  // Render the summary statistics table at this point if plot is horizontal, as we need various sizing
  // from it in order to construct the continuous axis, etc.
  if (!config.isVertical) {
    tableContainerSpecs = renderStatisticsTableHorizontal(
      config,
      isTrellis,
      styling,
      tableContainer,
      margin,
      fontClass,
      plotData,
      orderedCategories,
      tooltip
    );
  }

  const svgWidth = config.isVertical
    ? containerWidth 
    : containerWidth -
      tableContainerSpecs.tableContainer.node().getBoundingClientRect().width -
      padding.betweenPlotAndTable;

  let xAxis: D3_SELECTION;

  const plotWidth = config.isVertical
    ? svgWidth - margin.left - margin.right
    : svgWidth - margin.top - margin.bottom;

  if (config.isVertical) {
    xScale = d3
      .scaleBand()
      .range([0, plotWidth]) // @todo: see if we can calculate the bandwidth?
      .domain(orderedCategories) //earlier we extracted the unique categories into an array
      .paddingInner(0) // This is important: it is the space between 2 groups. 0 means no padding. 1 is the maximum.
      // Originally, the padding was set to 0.2 but this led to problems aligning the summary table cells accurately,
      // Therefore, padding has been set to 0... This also reduces the space consumed. Violins touching each other is
      // not a huge issue in my opinion (A. Berridge)
      .paddingOuter(0)
      .align(0);

    tableContainerSpecs = renderStatisticsTable(
      config,
      styling,
      container,
      margin,
      fontClass,
      plotData,
      orderedCategories,
      xScale.bandwidth(),
      tooltip
    );
  }

  // statisticsTableWidth is Only used for horizontal
  const statisticsTableWidth = tableContainerSpecs?.tableContainer
    .node()
    .getBoundingClientRect().width;

  const svgTop = config.isVertical ? 0 : 0;
  const svgLeft = config.isVertical
    ? 0
    : padding.betweenPlotAndTable + statisticsTableWidth;

  const svgHeight = config.isVertical
    ? containerHeight -
      tableContainerSpecs.tableContainer.node().getBoundingClientRect().height
    : containerHeight; // - tableContainerSpecs.headerRowHeight;

  // Adjust the top margin for the table header (horizontal mode)
  if (!config.isVertical) {
    margin.top = tableContainerSpecs.headerRowHeight;
  }

  const verticalPlotHeight = svgHeight - margin.top - margin.bottom;

  Log.green(LOG_CATEGORIES.LayoutOptimization)(
    "containerHeight",
    containerHeight,
    "verticalPlotHeight",
    verticalPlotHeight,
    "svgHeight",
    svgHeight
  );

  Log.green(LOG_CATEGORIES.ShowHideZoomSliders)(
    "svgHeight",
    svgHeight,
    svg,
    svg.node()
  );

  // Render the continuous axis
  const yScaleSpecs = renderContinuousAxis(
    g,
    config,
    minZoom,
    maxZoom,
    plotData,
    config.isVertical ? verticalPlotHeight : plotWidth,
    margin,
    padding,
    styling,
    tooltip
  );

  const yAxisRendered = yScaleSpecs.yAxisRendered;
  const yScale = yScaleSpecs.yScale;

  const yAxisBoundingBox = yScaleSpecs.yAxisRendered.node().getBBox();

  const plotHeight = config.isVertical
    ? verticalPlotHeight
    : containerHeight -
      tableContainerSpecs.headerRowHeight -
      yAxisBoundingBox.height;

  const bandwidth = config.isVertical
    ? plotWidth / orderedCategories.length
    : plotHeight / orderedCategories.length;

  if (!config.isVertical) {
    Log.blue(LOG_CATEGORIES.Horizontal)("bandwidth", bandwidth);

    const summaryCellHeight = Math.max(0, bandwidth - 1);

    // Set the height of the table entry rows
    tableContainerSpecs.tableContainer
      .selectAll("td.summary-value")
      .style("height", summaryCellHeight + "px");

    tableContainerSpecs.tableContainer
      .selectAll("td.summary-header-right-align")
      .style("height", summaryCellHeight+ "px");

    tableContainerSpecs.tableContainer
      .selectAll("div.summary-div")
      .style("height", summaryCellHeight + "px");

    tableContainerSpecs.tableContainer
      .selectAll("div.summary-div")
      .style("height", summaryCellHeight + "px");

    // And move the linear portion indicator in the case of symlog:
    g.select(".symlog-linear-portion-indicator")
      .attr("y1", plotHeight + margin.top)
      .attr("y2", plotHeight + margin.top);
  }

  // Now move the rendered continuous axis to its correct place
  yAxisRendered.attr(
    "transform",
    "translate(" +
      (config.isVertical ? margin.left : 0) +
      ", " +
      (config.isVertical ? 0 : margin.top + plotHeight) +
      ")"
  );

  const statisticsTableHeight = tableContainerSpecs.tableContainer
    .node()
    .getBoundingClientRect().height;

  // Move the svg to the correct place
  svg.attr(
    "transform",
    "translate(" +
      (config.isVertical ? svgLeft : padding.betweenPlotAndTable) +
      ", " +
      svgTop +
      ")"
  );

  /**
   * Set the width and height of svg
   */
  svg.attr("width", svgWidth).attr("height", svgHeight);

  Log.green(LOG_CATEGORIES.LayoutOptimization)(
    "statisticsTableHeight",
    statisticsTableHeight
  );

  Log.blue(LOG_CATEGORIES.Horizontal)(
    "yAxisBoundingBox",
    yAxisBoundingBox,
    yScale(1.5)
  );

  Log.green(LOG_CATEGORIES.LayoutOptimization)(
    "height, heightAvailable",
    containerHeight,
    svgWidth,
    "containerSize",
    containerSize,
    tableContainerSpecs.tableContainer.node().getBoundingClientRect(),
    tableContainerSpecs.tableContainer.node().clientHeight
  );

  if (!config.isVertical) {
    const minBandwidth = 40;

    //tableContainer.attr("style", "top:" + heightAvailable + "px");
    Log.green(LOG_CATEGORIES.Rendering)(
      tableContainerSpecs.tableContainer.node()
    );

    // Event handler for when the mod is scrolled
    // - could be used to move the continuous axis with the scroll event
    // so that it's always visible (if we supported scrolling a horizontal violin
    // plot - but right now we don't
    if (SHALL_SCROLL_Y_AXIS) {
      windowScrollYTracker.eventHandlers.push(() => {
        Log.red(LOG_CATEGORIES.Horizontal)(
          "Moving y axis",
          plotHeight,
          windowScrollYTracker.value,
          plotHeight + windowScrollYTracker.value
        );
        const calculatedPosition = plotHeight + windowScrollYTracker.value;

        const bandwidthRemainder = calculatedPosition % bandwidth;

        yAxisRendered
          .transition()
          .duration(600)
          .attr(
            "transform",
            "translate(" +
              0 +
              ", " +
              (calculatedPosition + bandwidthRemainder + bandwidth / 2) +
              ")"
          );
      });
    }

    xScale = d3
      .scaleBand()
      .range([0, bandwidth * orderedCategories.length]) // Do not change this to anything related to height (for horizontal)
      .domain(orderedCategories) //earlier we extracted the unique categories into an array
      .paddingInner(0) // This is important: it is the space between 2 groups. 0 means no padding. 1 is the maximum.
      // Originally, the padding was set to 0.2 but this led to problems aligning the summary table cells accurately,
      // Therefore, padding has been set to 0... This also reduces the space consumed. Violins touching each other is
      // not a huge issue in my opinion (A. Berridge)
      .paddingOuter(0)
      .align(0);

    xAxis = d3.axisLeft(xScale);

    // Render the x axis
    g.append("g")
      .attr("class", "x-axis")
      //.attr("transform", "translate(0," + heightAvailable + ")")
      .attr("font-family", styling.scales.font.fontFamily)
      .attr("fill", styling.scales.font.color)
      .attr("font-weight", styling.scales.font.fontWeight)
      .style("font-size", styling.scales.font.fontSize + "px")
      .call(xAxis);

    Log.green(LOG_CATEGORIES.Rendering)(
      "slider",
      yScale(2.0),
      plotData.yDataDomain.min,
      plotData.yDataDomain.max,
      yScale(plotData.yDataDomain.min),
      yScale(plotData.yDataDomain.max)
    );

    tableContainer = tableContainerSpecs.tableContainer;

    Log.green(LOG_CATEGORIES.Rendering)(
      "height, heightAvailable",
      containerHeight,
      plotHeight,
      "containerSize",
      containerSize,
      tableContainer.node().getBoundingClientRect(),
      tableContainer.node().clientHeight
>>>>>>> 7df09fe71b6c7cca30c104321bcf5cd7cc99ea5f
    );
    //tableContainer.attr("style", "top:" + heightAvailable + "px");
    Log.green(LOG_CATEGORIES.Rendering)(tableContainer.node());

    /**
<<<<<<< HEAD
     *
     * Violin marking
     *
     * */
    // Filter to paths for this trellis panel
    d3.selectAll(".violin-path-markable")
      .filter((d: any) => d.some((v: any) => v.trellis == trellisName))
      .each(function (d: d3.path, i: number, g: NodeList) {
        // If xScale.domain()
        const violinXindex =
          xScale.domain()[0] == "" ? 0 : xScale.domain().indexOf(d[0].category);

        //if (violinXindex > 0) return; // todo - remove. Just for debugging

        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinMark",
          d,
          violinXindex,
          xScale.domain()
        );

        // Compute intersection between violin path and marking rectangle
        const path = ShapeInfo.path((g[i] as SVGPathElement).getAttribute("d"));

        /**
         * The logic is quite complicated. Basic premise is to construct a rect
         * that starts at the edge of the x band where we've selected. This is to capture any sticking out bits
         * that we may miss using intersections alone. Need graphics to explain this properly!
         * LHS of violin - extend rect to left-most edge of section of x band
         * RHS - mirror to LHS and use the same logic
         */

        const selectionBoxStartXIndex = Math.floor(
          (selectionBoxX - margin.left) / xScale.bandwidth()
        );
        const selectionBoxEndXIndex = Math.floor(
          (selectionBoxX + selectionBoxWidth - margin.left - 20) /
            xScale.bandwidth()
        );

        // x0 is the left of the current x-axis band in the violin chart
        const bandX0 = xScale.bandwidth() * violinXindex + margin.left;

        // The right hand edge of the x axis band for this violin
        const bandX1 = xScale.bandwidth() * (violinXindex + 1) + margin.left;

        // Does drawing start on the left hand side of the violin?
        const isLhs = selectionBoxX < bandX0 + xScale.bandwidth() / 2;

        const selectionBoxX1 = selectionBoxX + selectionBoxWidth;

        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinMark bboxX1 > bandX1",
          selectionBoxX1 > bandX1,
          selectionBoxX,
          selectionBoxX1,
          bandX1
        );

        var intersectionRectWidth: number;

        // VIOLIN PADDING is causing the issue! Need to take this into account and tidy up the logic here.

        if (isLhs) {
          // is marking rectangle to left hand side of violin?
          intersectionRectWidth = selectionBoxX1 - bandX0 - padding.violinX / 2;
        } else {
          intersectionRectWidth = bandX1 - selectionBoxX - padding.violinX / 2;
        }

        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinMark",
          "violinXindex",
          "violinXindex",
          violinXindex,
          "selectionBoxStartIndex",
          selectionBoxStartXIndex,
          "selectionBoxEndXIndex",
          selectionBoxEndXIndex
        );
        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinMark",
          "isLhs",
          isLhs,
          "selectionBoxX",
          selectionBoxX,
          "bbox.width",
          selectionBoxWidth,
          "x0",
          bandX0,
          "width",
          intersectionRectWidth,
          "bandX1",
          bandX1,
          selectionBoxX - margin.left + selectionBoxWidth,
          "margin.left",
          margin.left
        );

        if (
          violinXindex >= selectionBoxStartXIndex &&
          violinXindex <= selectionBoxEndXIndex
        ) {
          let selectionTop = selectionBoxY;
          let rectHeight = selectionBoxHeight;
          // Need to take the tops and bottoms of the violins into consideration
          // - e.g. if the user starts the marking rectangle above or below the top/bottom
          // of the violin, there will be no intersections there.

          // Determine if top of marking rectangle is above min
          Log.green(LOG_CATEGORIES.ViolinMarking)(
            "violinMark invert(selectionBoxY)",
            yScale.invert(selectionBoxY),
            "max",
            d3.max(d.map((v: any) => v.violinY)),
            "yScale(max)",
            yScale(d3.max(d.map((v: any) => v.violinY)))
          );
          if (
            yScale.invert(selectionBoxY - margin.top) >
              d3.max(d.map((v: any) => v.violinY)) &&
            yScale.invert(selectionBoxY + selectionBoxHeight - margin.top) <
              d3.max(d.map((v: any) => v.violinY))
          ) {
            selectionTop =
              yScale(d3.max(d.map((v: any) => v.violinY))) + margin.top + 1;
            Log.green(LOG_CATEGORIES.ViolinMarking)(
              "violinMark adjusted selectionTop",
              selectionTop
            );
            rectHeight = rectHeight - (selectionTop - selectionBoxY);
          }

          // Now bottom
          if (
            yScale.invert(selectionBoxY + selectionBoxHeight) <
              d3.min(d.map((v: any) => v.violinY)) &&
            yScale.invert(selectionBoxY) > d3.min(d.map((v: any) => v.violinY))
          ) {
            rectHeight =
              yScale(d3.min(d.map((v: any) => v.violinY))) -
              selectionTop +
              margin.top -
              1;
            Log.green(LOG_CATEGORIES.Rendering)(
              "violinMark adjusted rectHeight",
              rectHeight
            );
          }

          Log.green(LOG_CATEGORIES.ViolinMarking)(
            "violinMark selectionBoxY",
            selectionBoxY,
            "selectionBoxHeight",
            selectionBoxHeight,
            "rectHeight",
            rectHeight
          );

          // ShapeInfo is relative to each of the bands of the violin chart. (one per categorical x axis value)
          const interseectionRect = ShapeInfo.rectangle({
            left: 0,
            top: selectionTop - margin.top,
            width: intersectionRectWidth,
            height: rectHeight,
          });

          Log.green(LOG_CATEGORIES.ViolinMarking)(
            "violinMark rect",
            interseectionRect,
            "x0",
            interseectionRect.args[0].x,
            "x1",
            interseectionRect.args[1].x,
            "width",
            interseectionRect.args[1].x - interseectionRect.args[0].x
          );

          if (DEBUG_VIOLIN_MARKING)
            svg
              .append("rect")
              .classed("rect-shapeinfo", true)
              .attr("x", bandX0 + padding.violinX / 2)
              .attr("y", selectionTop)
              .attr("fill", "none")
              .attr("stroke", "black")
              .attr("width", intersectionRectWidth)
              .attr("height", rectHeight);

          const intersections = Intersection.intersect(path, interseectionRect);
          if (intersections.status == "Intersection") {
            Log.green(LOG_CATEGORIES.DebugFirefoxMarking)(
              "violinMark intersections",
              intersections
            );
            // Useful for debugging intersection - draws circles at the computed intersection points
            if (DEBUG_VIOLIN_MARKING)
              svg
                .selectAll(".test_points")
                .data(intersections.points)
                .enter()
                .append("circle")
                .classed("test_points", true)
                .attr(
                  "cx",
                  (d: any) =>
                    padding.violinX / 2 +
                    margin.left +
                    d.x +
                    xScale.bandwidth() * violinXindex
                )
                .attr("cy", (d: any) => d.y + margin.top)
                .attr("r", 5 + 2 * violinXindex)
                .attr("fill", "red");

            // Pairs of points
            const category = d[0].category;
            for (let j = 0; j < intersections.points.length; j += 2) {
              // Guard against j + 1 running off the end of the array
              if (j + 1 < intersections.points.length) {
                violinMarkables.push({
                  category: category,
                  testX1:
                    intersections.points[j].x +
                    padding.violinX / 2 +
                    margin.left +
                    xScale.bandwidth() * violinXindex,
                  testX2:
                    intersections.points[j + 1].x +
                    margin.left +
                    +padding.violinX / 2 +
                    xScale.bandwidth() * violinXindex,
                  testY1: intersections.points[j].y + margin.top,
                  testY2: intersections.points[j + 1].y + margin.top,
                  y1: yScale.invert(intersections.points[j].y),
                  y2: yScale.invert(intersections.points[j + 1].y),
                });
              }
            }

            Log.green(LOG_CATEGORIES.ViolinMarking)(
              "violinMarkables",
              violinMarkables
            );
          }
        }
      });

    if (DEBUG_VIOLIN_MARKING)
      svg
        .selectAll("test_rect")
        .data(violinMarkables)
        .enter()
        .append("rect")
        .classed("test_rect", true)
        .attr("x", (d: any) => Math.min(d.testX1, d.testX2))
        .attr("y", (d: any) => Math.min(d.testY1, d.testY2))
        .attr("width", (d: any) => Math.abs(d.testX1 - d.testX2))
        .attr("height", (d: any) => Math.abs(d.testY2 - d.testY1))
        .attr("stroke", "red")
        .attr("fill", "none");

    //if (DEBUG_VIOLIN_MARKING) return; // Don't mark

    function rect(x: number, y: number, w: number, h: number) {
      return (
        "M" + [x, y] + " l" + [w, 0] + " l" + [0, h] + " l" + [-w, 0] + "z"
      );
    }

    // create an SVG rect for computing bounds
    const markingPath = svg
      .append("path")
      .attr(
        "d",
        rect(
          selectionBoxX,
          selectionBoxY,
          selectionBoxWidth,
          selectionBoxHeight
        )
      )
      // Use visible when debugging marking - it renders a nice black rect that indicates the area of the marking rect
      // .attr("visibility", "visible")
      .attr("visibility", "hidden")
      .attr("fill", "lightgray");

    const svgNode = svg.node();

    // Marking Points
    const markedPoints = d3
      .selectAll(".markable-points")
      .filter(function (d: any, i: number, g: NodeList) {
        if (isTrellis) {
          return (
            d.trellis == trellisName &&
            svgNode.checkIntersection(g[i], markingPath.node().getBBox())
          );
        } else {
          return svgNode.checkIntersection(g[i], markingPath.node().getBBox());
        }
      });

    Log.blue(LOG_CATEGORIES.DebugMarkingOffset)(
      selectionBoxX,
      selectionBoxY,
      selectionBoxWidth,
      selectionBoxHeight
    );
    // Marked box segments. Only allow box segment marking if violin is not shown
    let markedBoxSegments: d3.D3_SELECTION;

    if (!config.includeViolin.value()) {
      markedBoxSegments = d3
        .selectAll(".markable")
        .filter(function (d: any, i: number, g: NodeList) {
          Log.blue(LOG_CATEGORIES.DebugMarkingOffset)(d, i, g);
          if (isTrellis) {
            return (
              d.stats.trellis == trellisName &&
              svgNode.checkIntersection(g[i], markingPath.node().getBBox())
            );
          } else {
            return svgNode.checkIntersection(
              g[i],
              markingPath.node().getBBox()
            );
          }
        });
    }

    Log.green(LOG_CATEGORIES.Rendering)(
      "markedBoxSegments",
      markedBoxSegments?.data()
    );
    Log.green(LOG_CATEGORIES.Rendering)(
      violinMarkables?.length,
      markedPoints?.data().length,
      config.includeViolin.value() || markedBoxSegments?.data().length == 0
    );

    if (
      violinMarkables.length == 0 &&
      markedPoints?.data().length == 0 &&
      (config.includeViolin.value() || markedBoxSegments?.data().length == 0)
    ) {
      state.disableAnimation = true;
      plotData.clearMarking();
      return;
    }
    state.disableAnimation = true;
    spotfireMod.transaction(() => {
      plotData.mark(
        markedPoints.data().map((d: any) => d.row),
        ctrlKey ? "ToggleOrAdd" : "Replace"
      );
      markedBoxSegments?.data().forEach((element: any) => {
        plotData.mark(
          element.dataPoints.map((p: any) => p.row),
          ctrlKey ? "ToggleOrAdd" : "Replace"
        );
      });
      let violinRowsMarkedCount = 0;
      violinMarkables.forEach((element: any) => {
        const minY = Math.min(element.y1, element.y2);
        const maxY = Math.max(element.y1, element.y2);
        const rowsToMark: DataViewRow[] = plotData.rowData
          .filter(
            (p) => p.y >= minY && p.y <= maxY && p.category == element.category
          )
          .map((r) => r.row);

        violinRowsMarkedCount += rowsToMark.length;
        Log.green(LOG_CATEGORIES.Rendering)(
          "violinMarkables",
          rowsToMark,
          minY,
          maxY,
          plotData.rowData.filter((p) => p.category == element.category)
        );
        plotData.mark(rowsToMark, ctrlKey ? "ToggleOrAdd" : "Replace");
=======
     * Set the width and height of svg and g, and translate as required
     */
    svg.attr(
      "style",
      "width:" + svgWidth + "px; " + "height:" + svgHeight + "px;"
    );

    xAxis = d3.axisBottom(xScale);

    // Render the x axis
    g.append("g")
      .attr("class", "x-axis")
      //.attr("transform", "translate(0," + heightAvailable + ")")
      .attr("font-family", styling.scales.font.fontFamily)
      .attr("fill", styling.scales.font.color)
      .attr("font-weight", styling.scales.font.fontWeight)
      .style("font-size", styling.scales.font.fontSize + "px")
      .call(xAxis);
  }

  Log.green(LOG_CATEGORIES.Horizontal)(
    "plotWidth",
    plotWidth,
    "plotHeight",
    plotHeight
  );

  if (config.includeYAxisGrid.value() && styling.scales.line.stroke != "none") {
    renderGridLines(
      g,
      config,
      margin,
      config.isVertical ? plotWidth : plotHeight,
      styling,
      yScale,
      yScaleSpecs.ticks,
      tooltip
    );
  }

  // WARNING: verticalSlider.height() is buggy! Don't use it.

  let sliderSvg: d3.D3_SELECTION;

  if (config.showZoomSliders.value() && isTrellisWithIndividualYscale) {
    // Trellis - individual zoom sliders
    sliderSvg = svg
      .append("g")
      .attr(
        "transform",
        "translate(" +
          (config.isVertical ? 10 : -22) +
          "," +
          (config.isVertical
            ? 0
            : (-1 * Math.max(tableContainerSpecs.headerRowHeight, 45)) / 2) +
          ")"
      )
      .append("svg")
      //.attr("transform", "translate(" + (config.isVertical ? 10 : -10) + ",-5)")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("id", "slider-container" + trellisIndex)
      .attr(
        "height",
        (config.isVertical
          ? svgHeight
          : Math.max(tableContainerSpecs.headerRowHeight, 45)) + "px"
      )
      .attr("width", (config.isVertical ? 30 : svgWidth + 10) + "px");

    //.classed("trellis-panel-zoom-slider-container", true);
    sliderSvg.selectAll("*").remove();

    Log.green(LOG_CATEGORIES.ShowHideZoomSliders)(
      "sliderSvg",
      sliderSvg,
      sliderSvg.node()
    );

    sliderSvg
      .append("g")
      .attr("class", "vertical-zoom-slider")
      .attr("transform", "translate(20, " + (config.isVertical ? 10 : 35) + ")")
      .call(
        createZoomSlider(
          yScale,
          plotData,
          config,
          minZoom,
          maxZoom,
          isTrellisWithIndividualYscale,
          trellisName,
          true,
          yScale.range()[0],
          //config.isVertical ? svgHeight : svgWidth,
          yScale.range()[1],
          setTrellisPanelZoomedTitle
        )
      );
  }

  Log.red(LOG_CATEGORIES.LayoutOptimization)("panelheight", panelHeight, trellisRowIndex, svg.node().getBoundingClientRect().y, (window.scrollY || document.documentElement.scrollTop));
  /**
   * Render violin
   */
  if (config.includeViolin.value() && config.drawViolinUnderBox.value()) {
    renderViolin(
      plotData,
      orderedCategories,
      xScale,
      yScale,
      margin,
      g,
      tooltip,
      xAxisSpotfire,
      state,
      animationSpeed,
      svgWidth,
      config,
      styling.generalStylingInfo
    );
  }

  /**
   * Render comparison circles if enabled
   */
  if (config.comparisonCirclesEnabled.value()) {
    renderComparisonCircles(
      config,
      margin,
      trellisIndex,
      g,
      g,
      xScale,
      yScale,
      tooltip,
      plotHeight,
      plotData,
      styling.generalStylingInfo.backgroundColor,
      state
    );
  }

  /**
   * Render box plot if option is selected
   */
  if (config.includeBoxplot.value()) {
    const start = performance.now();
    renderBoxplot(
      margin,
      styling,
      plotData,
      xScale,
      yScale,
      svgWidth,
      g,
      tooltip,
      xAxisSpotfire,
      state,
      animationSpeed,
      config
    );
    Log.green(LOG_CATEGORIES.DebugBigData)(
      "Box plot rendering took: " + (performance.now() - start) + " ms"
    );
  }

  /**
   * Render violin, if it's enabled, and should be drawn over the box
   */
  if (config.includeViolin.value() && !config.drawViolinUnderBox.value()) {
    renderViolin(
      plotData,
      orderedCategories,
      xScale,
      yScale,
      margin,
      g,
      tooltip,
      xAxisSpotfire,
      state,
      animationSpeed,
      plotHeight,
      config,
      styling.generalStylingInfo
    );
  }

  /**
   * Add reference lines/points if any are enabled
   */
  renderReferenceLinesAndPoints(
    g,
    config,
    plotData,
    margin,
    xScale,
    yScale,
    fontClass,
    styling,
    tooltip
  );

  /**
   * Render trend lines if any are enabled
   */
  renderTrendLines(g, config, plotData, margin, xScale, yScale, tooltip);

  //** Display p-value results from the one-way ANOVA test

  // Add p-value text
  if (config.showPvalue.value()) {
    Log.green(LOG_CATEGORIES.Rendering)(plotData.pValue);
    if (plotData.pValue === "NA") {
      Log.green(LOG_CATEGORIES.Rendering)("ANOVA NA");
      svg
        .append("text")
        .classed(fontClass, true)
        .style("font-family", styling.generalStylingInfo.font.fontFamily)
        .style("fill", styling.generalStylingInfo.font.color)
        .text("One-way ANOVA test is not applicable.")
        .attr("x", config.isVertical ? margin.left + 10 : 0)
        .attr("y", config.isVertical ? plotHeight : plotHeight - margin.bottom);
    } else {
      svg
        .append("text")
        .classed(fontClass, true)
        .style("font-family", styling.generalStylingInfo.font.fontFamily)
        // SVG text elements use fill to set the color of the text
        .style("fill", styling.generalStylingInfo.font.color)
        .text("P-value:" + plotData.pValue.toFixed(6) + " (one-way ANOVA)")
        .attr("x", config.isVertical ? margin.left + 10 : 0)
        .attr("y", config.isVertical ? plotHeight : plotHeight - margin.bottom);
    }
  }

  const renderedPanel: RenderedPanel = {
    name: trellisName,
    boundingClientRect: container.node().getBoundingClientRect(),
    getBoundingClientRect() {
      return container.node().getBoundingClientRect();
    },
    svgLeft: svgLeft,
    svgTop: svgTop,
    svgWidth: svgWidth,
    svgHeight: svgHeight,
    yScale: yScale,
    plotData: plotData,
    mark(x, y, width, height, ctrlKey) {
      Log.green(LOG_CATEGORIES.ViolinMarking)(
        "Render Marking panel",
        trellisName,
        x,
        y,
        width,
        height,
        "svgLeft, svgTop",
        svgLeft,
        svgTop
      );
      rectMark(trellisName, x, y, width, height, ctrlKey);
    },
  };

  return renderedPanel;

  /**
   *
   *
   *  Rectangular marking
   *
   *
   */

  /**
   * Marking violins/box elements/points
   */
  function rectMark(
    trellisName: string,
    selectionRectX: number, // The y coordinate of the selection box, relative to the SVG
    selectionRectY: number, // The y coordinate of the selection box, relative to the SVG
    selectionRectWidth: number,
    selectionRectHeight: number,
    ctrlKey: boolean
  ) {
    svg.selectAll(".test_points").remove();
    svg.selectAll(".test_rect").remove();
    svg.selectAll(".rect-corner").remove();
    svg.selectAll(".rect-shapeinfo").remove();

    // Calculate X1 (right) and Y1 (bottom) of selection rect
    const selectionRectX1 = selectionRectX + selectionRectWidth;
    const selectionRectY1 = selectionRectY + selectionRectHeight;

    const violinMarkables: any = [];

    // set this to true to enable drawing of rects and circles to aid with debugging violin marking
    const DEBUG_VIOLIN_MARKING = false;

    Log.green(LOG_CATEGORIES.ViolinMarking)(
      "svg bbox",
      svg.node().getBoundingClientRect(),
      "trellisName",
      trellisName,
      d3.selectAll(".violin-path-markable")
    );

    Log.blue(LOG_CATEGORIES.DebugViolinIndividualScalesMarking)(
      d3.selectAll(".violin-path-markable")
    );

    /**
     *
     * Violin marking
     *
     * */
    // Filter to paths for this trellis panel
    d3.selectAll(".violin-path-markable")
      .filter((d: any) => d.some((v: any) => v.trellis == trellisName))
      .each(function (d: d3.path, i: number, g: NodeList) {
        // If xScale.domain()
        const violinCategoricalIndex =
          xScale.domain()[0] == "" ? 0 : xScale.domain().indexOf(d[0].category);

        //if (violinXindex > 0) return; // todo - remove. Just for debugging

        // Compute intersection between violin path and marking rectangle
        const path = ShapeInfo.path((g[i] as SVGPathElement).getAttribute("d"));

        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinMark",
          d,
          violinCategoricalIndex,
          xScale.domain(),
          "ShapeInfo path",
          path
        );

        /**
         * The logic is quite complicated. Basic premise is to construct a rect
         * that starts at the edge of the categorical band where we've selected. This is to capture any sticking out bits
         * that we may miss using intersections alone. Need graphics to explain this properly!
         * LHS of violin - extend rect to left-most edge of section of x band
         * RHS - mirror to LHS and use the same logic
         */

        /**
         * In vertical mode, the intersection box must be extended to the horizontal edge of the band.
         * In horizontal mode, the intersection box must be extended to the vertical edge of the band
         */

        const selectionRectStartCategoricalIndex = config.isVertical
          ? Math.floor((selectionRectX - margin.left) / xScale.bandwidth())
          : Math.floor(selectionRectY / xScale.bandwidth());
        const selectionRectEndCategoricalIndex = config.isVertical
          ? // @todo - remove the "magic" - 20
            Math.floor(
              (selectionRectX + selectionRectWidth - margin.left - 20) /
                xScale.bandwidth()
            )
          : Math.floor((selectionRectY1 - margin.top) / xScale.bandwidth());

        // band0 is the start of the current x-axis band in the violin chart
        // margin.left is zero for horizontal chart
        const band0 =
          xScale.bandwidth() * violinCategoricalIndex +
          (config.isVertical ? margin.left : margin.top);

        // The end x axis band for this violin - todo tweak for horizontal violin. It's not margin.top!
        const band1 =
          xScale.bandwidth() * (violinCategoricalIndex + 1) +
          (config.isVertical ? margin.left : margin.top);

        // Does drawing start on the left hand side of the violin? (vertical mode)
        // Horizontal mode - lhs = above
        const isLhs = config.isVertical
          ? selectionRectX < band0 + xScale.bandwidth() / 2
          : selectionRectY < band0 + xScale.bandwidth() / 2;

        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "selectionRectStartCategoricalIndex",
          selectionRectStartCategoricalIndex,
          "selectionRectEndCategoricalIndex",
          selectionRectEndCategoricalIndex,
          "violinMark bboxX1 > bandX1",
          selectionRectY1 > band1,
          isLhs,
          "band0",
          band0,
          "selectionRect x, y, height",
          selectionRectX,
          selectionRectY,
          selectionRectHeight,
          "intersectionRect y1",
          selectionRectY1,
          band1
        );

        var intersectionRectHeight: number;
        var intersectionRectWidth: number;

        // Violin width padding is required as the violin path doesn't go to the edges
        // - need to use half of the value of the padding, as padding affects the violin width
        if (isLhs) {
          // is marking rectangle to left hand side of violin?
          intersectionRectHeight = config.isVertical
            ? selectionRectHeight
            : Math.abs(selectionRectY1 - band0) -
              violinWidthPadding.violinX / 2;

          intersectionRectWidth = config.isVertical
            ? selectionRectX1 - band0 - padding.violinX / 2
            : selectionRectWidth;
        } else {
          intersectionRectHeight = config.isVertical
            ? selectionRectHeight
            : Math.abs(band1 - selectionRectY);

          intersectionRectWidth = config.isVertical
            ? band1 - selectionRectX - padding.violinX / 2
            : selectionRectWidth;
        }

        if (DEBUG_VIOLIN_MARKING) {
          // Draw the selection box - to make sure its x and y, etc., are relative to the SVG
          svg
            .append("rect")
            .classed("rect-shapeinfo", true)
            .attr("y", selectionRectY)
            .attr("x", selectionRectX)
            .attr("fill", "none")
            .attr("stroke", "purple")
            .attr("width", selectionRectWidth)
            .attr("height", selectionRectHeight);
          // This is currently correct for vertical and horizontal
        }

        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinCategoricalIndex",
          violinCategoricalIndex,
          "selectionRectStartIndex",
          selectionRectStartCategoricalIndex,
          "selectionRectEndXIndex",
          selectionRectEndCategoricalIndex
        );
        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinMark",
          "isLhs",
          isLhs,
          "selectionRectX",
          selectionRectX,
          "bbox.width",
          selectionRectWidth,
          "x0",
          band0,
          "width",
          intersectionRectHeight,
          "bandX1",
          band1,
          selectionRectX - margin.left + selectionRectWidth,
          "margin.left",
          margin.left
        );

        if (
          violinCategoricalIndex >= selectionRectStartCategoricalIndex &&
          violinCategoricalIndex <= selectionRectEndCategoricalIndex
        ) {
          if (DEBUG_VIOLIN_MARKING) {
            // Draw the intersection box - this is the one that we will use to calculate the
            // intersections
            svg
              .append("rect")
              .classed("rect-shapeinfo", true)
              .attr(
                config.isVertical ? "x" : "y",
                band0 + violinWidthPadding.violinX / 2
              )
              .attr(
                config.isVertical ? "y" : "x",
                config.isVertical ? selectionRectY : selectionRectX
              )
              .attr("fill", "none")
              .attr("stroke", "aqua")
              .attr("width", intersectionRectWidth)
              .attr("height", intersectionRectHeight);
          }

          // Need to take the tops and bottoms of the violins into consideration
          // - e.g. if the user starts the marking rectangle above or below the top/bottom
          // of the violin, there will be no intersections there.
          // @todo - check if this still holds

          // Determine if top of marking rectangle is above min (vertical mode)
          // Or is to the right of min (horizontal mode)
          Log.green(LOG_CATEGORIES.ViolinMarking)(
            "violinMark invert(selectionRectY)",
            yScale.invert(selectionRectX),
            "max",
            d3.max(d.map((v: any) => v.violinY)),
            "yScale(max)",
            yScale(d3.max(d.map((v: any) => v.violinY)))
          );
          /*if (
            yScale.invert(selectionRectY) >
              d3.max(d.map((v: any) => v.violinY)) &&
            yScale.invert(selectionRectY + selectionRectHeight - margin.top) <
              d3.max(d.map((v: any) => v.violinY))
          ) {
            selectionTop =
              yScale(d3.max(d.map((v: any) => v.violinY))) + margin.top + 1;
            Log.green(LOG_CATEGORIES.ViolinMarking)(
              "violinMark adjusted selectionTop",
              selectionTop
            );
            selectionRectHeight =
              selectionRectHeight - (selectionTop - selectionRectY);
          }

          // Now bottom
          if (
            yScale.invert(selectionRectY + selectionRectHeight) <
              d3.min(d.map((v: any) => v.violinY)) &&
            yScale.invert(selectionRectY) > d3.min(d.map((v: any) => v.violinY))
          ) {
            selectionRectHeight =
              yScale(d3.min(d.map((v: any) => v.violinY))) -
              selectionTop +
              margin.top -
              1;
            Log.green(LOG_CATEGORIES.Rendering)(
              "violinMark adjusted selectionRectHeight",
              selectionRectHeight
            );
          }*/

          Log.green(LOG_CATEGORIES.ViolinMarking)(
            "violinMark selectionRectY",
            selectionRectY,
            "selectionRectHeight",
            selectionRectHeight,
            "selectionRectHeight",
            selectionRectHeight
          );

          // ShapeInfo is relative to each of the bands of the violin chart. (one per categorical x axis value)
          const intersectionRect = ShapeInfo.rectangle({
            left: config.isVertical ? 0 : selectionRectX,
            top: config.isVertical ? selectionRectY : 0,
            width: intersectionRectWidth,
            height: intersectionRectHeight,
          });

          Log.green(LOG_CATEGORIES.ViolinMarking)(
            "violinMark rect",
            intersectionRect,
            "x0",
            intersectionRect.args[0].x,
            "x1",
            intersectionRect.args[1].x,
            "width",
            intersectionRect.args[1].x - intersectionRect.args[0].x
          );

          const intersections = Intersection.intersect(path, intersectionRect);
          if (intersections.status == "Intersection") {
            Log.green(LOG_CATEGORIES.ViolinMarking)(
              "violinMark intersections",
              intersections
            );
            // Useful for debugging intersection - draws circles at the computed intersection points
            // IMPORTANT NOTE: right now, this only shows points for the first violin that has
            // been marked. This is not an indication that marking multiple violins is not working!
            if (DEBUG_VIOLIN_MARKING)
              svg
                .selectAll(".test_points")
                .data(intersections.points)
                .enter()
                .append("circle")
                .classed("test_points", true)
                .attr("cx", (d: any) =>
                  config.isVertical
                    ? padding.violinX / 2 +
                      margin.left +
                      d.x +
                      xScale.bandwidth() * violinCategoricalIndex
                    : d.x
                )
                .attr("cy", (d: any) =>
                  config.isVertical
                    ? d.y
                    : d.y +
                      margin.top +
                      xScale.bandwidth() * violinCategoricalIndex +
                      violinWidthPadding.violinX / 2
                )
                .attr("r", 5 + 2 * violinCategoricalIndex)
                .attr("fill", "red");

            // Pairs of points
            const category = d[0].category;
            for (let j = 0; j < intersections.points.length; j += 2) {
              // Guard against j + 1 running off the end of the array
              if (j + 1 < intersections.points.length) {
                // Note for tomorrow - look into svgLeft, and +12 for this: +12 seems to make it better, but I'm not sure it's "correct"
                Log.blue(LOG_CATEGORIES.ViolinMarking)(
                  "yScale.invert(intersections.points[j].x)",
                  yScale.invert(intersections.points[j].x + 12)
                );
                Log.blue(LOG_CATEGORIES.ViolinMarking)(
                  "yScale.invert(intersections.points[j + 1].x)",
                  yScale.invert(intersections.points[j + 1].x + 12)
                );
                violinMarkables.push({
                  category: category,
                  // testX1, testX2, testY1, testY2 aren't actually required for marking. They're
                  // just to help with development and future debugging.
                  // - not properly fixed during development of the horizontal violin feature
                  testX1:
                    intersections.points[j].x +
                    padding.violinX / 2 +
                    margin.left +
                    xScale.bandwidth() * violinCategoricalIndex,
                  testX2:
                    intersections.points[j + 1].x +
                    margin.left +
                    +padding.violinX / 2 +
                    xScale.bandwidth() * violinCategoricalIndex,
                  testY1: intersections.points[j].x,
                  testY2: intersections.points[j + 1].x,
                  y1: yScale.invert(
                    config.isVertical
                      ? intersections.points[j].y
                      : intersections.points[j].x
                  ),
                  y2: yScale.invert(
                    config.isVertical
                      ? intersections.points[j + 1].y
                      : intersections.points[j + 1].x
                  ),
                });
              }
            }

            Log.green(LOG_CATEGORIES.ViolinMarking)(
              "violinMarkables",
              violinMarkables
            );
          }
        }
      });

    if (DEBUG_VIOLIN_MARKING)
      svg
        .selectAll("test_rect")
        .data(violinMarkables)
        .enter()
        .append("rect")
        .classed("test_rect", true)
        .attr("x", (d: any) => Math.min(d.testX1, d.testX2))
        .attr("y", (d: any) => Math.min(d.y1, d.y2))
        .attr("height", (d: any) => Math.abs(d.testX1 - d.testX2))
        .attr("width", (d: any) => Math.abs(d.y1 - d.y2))
        .attr("stroke", "red")
        .attr("fill", "none");

    //if (DEBUG_VIOLIN_MARKING) return; // Don't mark

    function rect(x: number, y: number, w: number, h: number) {
      return (
        "M" + [x, y] + " l" + [w, 0] + " l" + [0, h] + " l" + [-w, 0] + "z"
      );
    }

    // create an SVG rect for computing bounds for marking points
    const markingPath = svg
      .append("path")
      .attr(
        "d",
        rect(
          selectionRectX,
          selectionRectY,
          selectionRectWidth,
          selectionRectHeight
        )
      )
      .classed("test_rect", true)
      // Use visible when debugging marking - it renders a nice gray rect that indicates the area of the marking rect
      .attr("visibility", DEBUG_VIOLIN_MARKING ? "visible" : "hidden")
      .attr("style", "opacity: 0.5")
      .attr("fill", "lightgray");

    const svgNode = svg.node();

    // Marking Points
    const markedPoints = d3
      .selectAll(".markable-points")
      .filter(function (d: any, i: number, g: NodeList) {
        if (isTrellis) {
          return (
            d.trellis == trellisName &&
            svgNode.checkIntersection(g[i], markingPath.node().getBBox())
          );
        } else {
          return svgNode.checkIntersection(g[i], markingPath.node().getBBox());
        }
      });

    Log.blue(LOG_CATEGORIES.DebugMarkingOffset)(
      selectionRectX,
      selectionRectY,
      selectionRectWidth,
      selectionRectHeight
    );
    // Marked box segments. Only allow box segment marking if violin is not shown
    let markedBoxSegments: d3.D3_SELECTION;

    if (!config.includeViolin.value()) {
      markedBoxSegments = d3
        .selectAll(".markable")
        .filter(function (d: any, i: number, g: NodeList) {
          Log.blue(LOG_CATEGORIES.DebugMarkingOffset)(d, i, g);
          if (isTrellis) {
            return (
              d.stats.trellis == trellisName &&
              svgNode.checkIntersection(g[i], markingPath.node().getBBox())
            );
          } else {
            return svgNode.checkIntersection(
              g[i],
              markingPath.node().getBBox()
            );
          }
        });
    }

    Log.green(LOG_CATEGORIES.Rendering)(
      "markedBoxSegments",
      markedBoxSegments?.data()
    );
    Log.green(LOG_CATEGORIES.Rendering)(
      violinMarkables?.length,
      markedPoints?.data().length,
      config.includeViolin.value() || markedBoxSegments?.data().length == 0
    );

    if (
      violinMarkables.length == 0 &&
      markedPoints?.data().length == 0 &&
      (config.includeViolin.value() || markedBoxSegments?.data().length == 0)
    ) {
      state.disableAnimation = true;
      plotData.clearMarking();
      return;
    }
    state.disableAnimation = true;
    spotfireMod.transaction(() => {
      plotData.mark(
        markedPoints.data().map((d: any) => d.row),
        ctrlKey ? "ToggleOrAdd" : "Replace"
      );
      markedBoxSegments?.data().forEach((element: any) => {
        plotData.mark(
          element.dataPoints.map((p: any) => p.row),
          ctrlKey ? "ToggleOrAdd" : "Replace"
        );
      });
      let violinRowsMarkedCount = 0;
      violinMarkables.forEach((element: any) => {
        const minY = Math.min(element.y1, element.y2);
        const maxY = Math.max(element.y1, element.y2);
        const rowsToMark: DataViewRow[] = plotData.rowData
          .filter(
            (p) => p.y >= minY && p.y <= maxY && p.category == element.category
          )
          .map((r) => r.row);

        violinRowsMarkedCount += rowsToMark.length;
        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinMarkables",
          rowsToMark,
          minY,
          maxY,
          plotData.rowData.filter((p) => p.category == element.category)
        );
        if (true || !DEBUG_VIOLIN_MARKING) {
          Log.blue(LOG_CATEGORIES.ViolinMarking)("Will mark", rowsToMark);
          plotData.mark(rowsToMark, ctrlKey ? "ToggleOrAdd" : "Replace");
        }
>>>>>>> 7df09fe71b6c7cca30c104321bcf5cd7cc99ea5f
      });

      // It is possible the user tried to mark regions of the violin with no data; so clear marking if this is the case (e.g. above max/below min)
      if (
        violinRowsMarkedCount == 0 &&
        markedPoints?.data().length == 0 &&
        (config.includeViolin.value() || markedBoxSegments?.data().length == 0)
      ) {
        plotData.clearMarking();
      }
    });
  }
}
