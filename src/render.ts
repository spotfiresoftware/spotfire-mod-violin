/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

// @ts-ignore
import * as d3 from "d3";

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
  TableContainerSpecs,
  YScaleSpecs,
} from "./definitions";
import { renderBoxplot } from "./render-box-plot";
import { renderViolin } from "./render-violin-plot";
import { renderComparisonCircles } from "./render-comparison-circles";
import { renderStatisticsTableHorizontal } from "./render-stats-table-horizontal";
import { renderContinuousAxis, renderGridLines } from "./continuousAxis";
import { createZoomSlider } from "./zoom-sliders";
import { calculateMinMaxZoom, getContrastingColor } from "./utility-functions";

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
  calculatedLeftMargin: number,
  config: Partial<Options>,
  styling: {
    generalStylingInfo: GeneralStylingInfo;
    scales: ScaleStylingInfo;
  },
  tooltip: Tooltip,
  container: D3_SELECTION,
  contextMenu: ContextMenu,
  isTrellis: boolean = false,
  trellisIndex: number = -1,
  trellisName: string = "",
  trellisRowIndex: number = 0
): Promise<RenderedPanel> {
  if (state.preventRender) {
    Log.green(LOG_CATEGORIES.Rendering)("State prevents render");
    // Early return if the state currently disallows rendering.
    return;
  }

  Log.red(LOG_CATEGORIES.ShowHideZoomSliders)("container", container);

  // Clear the container
  container.selectAll("*").remove();

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
  const isTrellisWithIndividualYscale =
    isTrellis && config.yScalePerTrellisPanel.value();

  // const animationSpeed = state.disableAnimation ? 0 : 500;
  const animationSpeed = 0; // consider doing something more clever with animation in v2.0?

  Log.green(LOG_CATEGORIES.DebugAnimation)(animationSpeed);

  Log.green(LOG_CATEGORIES.Rendering)(plotData);

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
    right: 15,
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

  const { minZoom, maxZoom }: { minZoom: number; maxZoom: number } =
    calculateMinMaxZoom(
      isTrellisWithIndividualYscale,
      config,
      trellisName,
      plotData
    );

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
    ? svgWidth - margin.left
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
    : containerHeight;// - tableContainerSpecs.headerRowHeight;


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

    // Set the height of the table entry rows
    tableContainerSpecs.tableContainer
      .selectAll("td.summary-value")
      .style("height", bandwidth - 1 + "px");

    tableContainerSpecs.tableContainer
      .selectAll("td.summary-header-right-align")
      .style("height", bandwidth - 1 + "px");

    tableContainerSpecs.tableContainer
      .selectAll("div.summary-div")
      .style("height", bandwidth - 1 + "px");

    tableContainerSpecs.tableContainer
      .selectAll("div.summary-div")
      .style("height", bandwidth - 1 + "px");

    // And move the linear portion indicator in the case of symlog:
    g.select(".symlog-linear-portion-indicator")
      .attr("y1", plotHeight)
      .attr("y2", plotHeight);
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
    if (false) {
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
    );
    //tableContainer.attr("style", "top:" + heightAvailable + "px");
    Log.green(LOG_CATEGORIES.Rendering)(tableContainer.node());

    /**
     * Set the width and height of svg and g, and translate as required
     */
    svg.attr(
      "style",
      "width:" + svgWidth + "px; " + "height:" + svgHeight + "px;"
    );

    /*g.attr(
      "style",
      "width:" + plotWidth + "px; " + "height:" + plotHeight + "px;"
    );

    g.attr("transform", "translate(" + margin.left + "," + (config.isVertical? margin.top : 0) + ")");
    */
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
      tooltip
    );
  }

  // WARNING: verticalSlider.height() is buggy! Don't use it.

  let sliderSvg: d3.D3_SELECTION;

  if (config.showZoomSliders.value() && isTrellisWithIndividualYscale) {
    // Trellis - individual zoom sliders

    /*const zoomSliderContainer = container
      .append("div")
      .classed("trellis-panel-zoom-slider-container", true)
      .style("background-color", styling.generalStylingInfo.backgroundColor);
    if (!config.isVertical) {
      zoomSliderContainer
        //.style("left", (config.isVertical ? 10 : 20) + "px")
        .style("left", statisticsTableWidth + "px")
        .style("height", "30px")
        .style("width", containerWidth + "px");
    }*/

    sliderSvg = svg
      .append("g")
      .attr("transform", "translate(" + (config.isVertical ? 10 : -10) + ",-5)")
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("id", "slider-container" + trellisIndex)
      .style("height", (config.isVertical ? svgHeight : 30) + "px")
      .style("width", (config.isVertical ? 30 : svgWidth) + "px");
      
      
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
      .attr("transform", "translate(20, " + margin.top + ")")
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
              .x((d: any) =>
                config.isVertical
                  ? margin.left + xScale(d.x) + xScale.bandwidth() / 2
                  : yScale(d.y)
              )
              .y((d: any) =>
                config.isVertical
                  ? yScale(d.y)
                  : xScale(d.x) + xScale.bandwidth() / 2
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
                  : xScale(d.x) + xScale.bandwidth() / 2
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

  /**
   * Render violin
   */
  if (config.includeViolin.value() && config.drawViolinUnderBox.value()) {
    renderViolin(
      plotData,
      orderedCategories,
      xScale,
      yScale,
      svgLeft,
      svgTop,
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
      svgLeft,
      svgTop,
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
            (config.isVertical ? margin.left : 0) +
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
            (config.isVertical ? margin.left : 0) +
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
    const DEBUG_VIOLIN_MARKING = true;

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
          : Math.floor(selectionRectY1 / xScale.bandwidth());

        // band0 is the start of the current x-axis band in the violin chart
        // margin.left is zero for horizontal chart
        const band0 = xScale.bandwidth() * violinCategoricalIndex + margin.left;

        // The end x axis band for this violin - todo tweak for horizontal violin. It's not margin.top!
        const band1 =
          xScale.bandwidth() * (violinCategoricalIndex + 1) + margin.left;

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
