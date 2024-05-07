// @ts-ignore
import * as d3 from "d3";

import { oneWay } from "ml-anova";
import { IAnovaResult } from "ml-anova/lib/utils";
// @ts-ignore

// @ts-ignore
import { Tukey } from "../node_modules/lib-r-math.js";

const { qtukey } = Tukey();

// @ts-ignore
import * as kde_pkg from "@uwdata/kde";

import {
  DataViewHierarchyNode,
  DataViewAxis,
  DataViewRow,
  MarkingOperation,
  DataView,
} from "spotfire-api";
import {
  Options,
  Data,
  RowData,
  StatisticsConfig,
  SumStatsSettings,
  SummaryStatistics,
} from "./definitions";
import { Log, LOG_CATEGORIES } from "./index";
import { SumStatsConfig } from "./sumstatsconfig";
import { log } from "console";

/**
 * Construct a data object suitable for consumption in d3.
 * The data object is built per trellis panel. If trellising is not enabled, there will be a single
 * Data object for the rendered visualization.
 * @param mod The Mod API object
 * @param dataView The mod's DataView
 */
export async function buildDataForTrellisPanel(
  trellisNode: DataViewHierarchyNode,
  dataView: DataView,
  config: Partial<Options>
): Promise<Data> {
  const startTime = Date.now();
  const startBuildData = performance.now();

  // Check if the dataView has expired. Throw error if it has. Check several times during building of data
  if (await dataView.hasExpired()) {
    throw new Error("DataView Has expired");
  }
  const nodeRows = trellisNode.rows();

  let rowData: Array<RowData> = new Array();

  const xAxis: DataViewAxis = await dataView.categoricalAxis("X");

  const xHierarchy = await dataView.hierarchy("X");
  const xHierarchyLeaves = (await xHierarchy!.root())!.leaves();
  const colorAxis = await dataView.categoricalAxis("Color");

  Log.green(LOG_CATEGORIES.DebugLatestMarking)(
    xHierarchyLeaves,
    await trellisNode.leaves(),
    nodeRows.length
  );
  const categories: string[] = [];

  if (!xAxis) {
    // category axis is empty
    const category = "(None)";
    categories.push(category);
    Log.green(LOG_CATEGORIES.Data)("X axis is empty");

    nodeRows!.forEach((row: DataViewRow) => {
      if (Date.now() - startTime > 10000) {
        throw new Error(
          "Error - data size is too big - check Count axis, or reduce amount of data"
        );
      }
      // Note - early versions of the code replaced empty values with zeros. This is not correct!
      const val = row.continuous<number>("Y").value();
      const count = row.continuous<number>("Count").value();
      if (val != null) {
        const rowItem: RowData = {
          category: category,
          y: val,
          trellis: trellisNode.formattedPath(),
          Color: row.color().hexCode,
          ColorValue:
            colorAxis != undefined
              ? row.categorical("Color").formattedValue()
              : "(None)",
          Marked: row.isMarked(),
          id: row.elementId(true),
          markingGroupId: 0,
          row: row,
        };
        for (let i = 0; i < count; i++) {
          if (Date.now() - startTime > 6000) {
            Log.red(LOG_CATEGORIES.DebugDataBailout)(
              "Throwing error during data iteration"
            );
            throw new Error(
              "Error - data size is too big - check Count axis, or reduce amount of data"
            );
          }
          rowData.push(rowItem);
        }
      }
    });
  } else {
    xHierarchyLeaves?.forEach((xLeaf: DataViewHierarchyNode) => {
      const category = xLeaf.formattedPath();
      Log.red(LOG_CATEGORIES.DebugXaxisFiltering)(
        "trellis",
        trellisNode.formattedValue(),
        "category",
        category
      );

      const categoryRows = trellisNode
        .rows()
        .filter(
          (r: DataViewRow) => r.categorical("X").formattedValue() == category
        );

      Log.red(LOG_CATEGORIES.DebugShowAllXValues)(
        "Category:",
        category,
        categoryRows
      );

      // no data for this category axis value - add an empty data point
      if (
        (categoryRows.length == 0 && !config.xAxisFiltered.value()) ||
        categoryRows.length > 0
      ) {
        categories.push(category);
      }

      categoryRows!.forEach((row, index) => {
        if (index % 10 == 0) {
          Log.green(LOG_CATEGORIES.DebugBigData)(
            "row index",
            index,
            (Date.now() - startTime) / 1000
          );
        }
        if (Date.now() - startTime > 3000) {
          Log.red(LOG_CATEGORIES.DebugDataBailout)(
            "Throwing error during data iteration"
          );
          throw new Error(
            "Error - data size is too big - check Count axis, or reduce amount of data"
          );
        }
        // Note - early versions of the code replaced empty values with zeros. This is not correct!
        const val = row.continuous<number>("Y").value();
        const count = row.continuous<number>("Count").value();
        if (val != null) {
          const rowItem: RowData = {
            category: category,
            y: val,
            trellis: trellisNode.formattedPath(),
            Color: row.color().hexCode,
            ColorValue:
              colorAxis != undefined
                ? row.categorical("Color").formattedValue()
                : "(None)",
            Marked: row.isMarked(),
            id: row.elementId(true),
            markingGroupId: 0,
            row: row,
          };
          for (let i = 0; i < count; i++) {
            if (Date.now() - startTime > 6000) {
              Log.red(LOG_CATEGORIES.DebugDataBailout)(
                "Throwing error during data iteration"
              );
              throw new Error(
                "Error - data size is too big - check Count axis, or reduce amount of data"
              );
            }
            Log.red(LOG_CATEGORIES.BoxPlotColorBy)(row.color().hexCode);
            rowData.push(rowItem);
          }
        }
      });
    });
  }
  Log.green(LOG_CATEGORIES.DebugBigData)(
    "Reading data took: " +
      (performance.now() - startBuildData) / 1000 +
      " seconds"
  );

  // If log Y axis, filter out all negative values
  if (config.yAxisScaleType.value() == "log") {
    Log.red(LOG_CATEGORIES.DebugLogYAxis)(
      "rowData not filtered",
      rowData,
      config.yAxisScaleType.value()
    );
    rowData = rowData.filter((r: any) => r.y > 0);
    Log.red(LOG_CATEGORIES.DebugLogYAxis)("rowData filtered", rowData);
  }

  const sortedRowDataGroupedByCat: Map<string, RowData[]> = new d3.rollup(
    rowData,
    (d: any) => d.sort((a: any, b: any) => d3.ascending(a.y, b.y)),
    (k: any) => k.category
  );

  Log.red(LOG_CATEGORIES.SumStatsPerformance)(
    "dataPointsGroupedByCat",
    sortedRowDataGroupedByCat
  );

  Log.red(LOG_CATEGORIES.DebugShowAllXValues)("Categories:", categories);

  const startSumStats = performance.now();
  const sumStats = buildSumStats(
    config,
    sortedRowDataGroupedByCat,
    trellisNode.formattedPath()
  );
  Log.green(LOG_CATEGORIES.SumStatsPerformance)(
    "Building all sumStats took: " +
      (performance.now() - startBuildData) / 1000 +
      " seconds"
  );

  // Get mins and maxes of any enabled reference or trend lines
  const referenceAndTrendLinesMinMaxAll: any[] = [];
  categories.forEach((category: string) => {
    Log.red(LOG_CATEGORIES.DebugLatestMarking)("sumstats", sumStats, category);
    if (sumStats.get(category)) {
      referenceAndTrendLinesMinMaxAll.push(
        getReferenceAndTrendLinesMinMax(sumStats.get(category), config)
      );
    }
  });

  Log.red(LOG_CATEGORIES.DebugShowAllXValues)(
    "referenceAndTrendLinesMinMaxAll",
    referenceAndTrendLinesMinMaxAll
  );

  // Check if the dataView has expired. Throw error if it has. Check several times during building of data
  if (await dataView.hasExpired()) throw new Error("DataView Has expired");

  let maxKdeValue: number = 0;

  const densitiesAll = [];

  // Are there any marked rows (in all the data?)
  const isAnyMarkedRecords = rowData.some((r: any) => r.Marked);

  // Determine min, max for axis values, combining reference line data and actual data
  const minRefTrendLines = d3.min(
    referenceAndTrendLinesMinMaxAll.map((entry: any) => entry.min)
  );
  const maxRefTrendLines = d3.max(
    referenceAndTrendLinesMinMaxAll.map((entry: any) => entry.max)
  );

  let minY = Math.min(
    minRefTrendLines ? minRefTrendLines : rowData[0]?.y,
    d3.min(rowData.map((d: any) => d?.y))
  );
  let maxY = Math.max(
    maxRefTrendLines ? maxRefTrendLines : rowData[0]?.y,
    d3.max(rowData.map((d: any) => d?.y))
  );

  Log.blue(LOG_CATEGORIES.DebugLogYAxis)("minY, maxY", minY, maxY);

  const densitiesSplitByMarking: any = [];

  // Calculate densities if violin is enabled
  if (config.includeViolin.value()) {
    // Group the data manually into bins of marked/not marked
    for (let [category, categoryRowData] of sortedRowDataGroupedByCat) {
      // Are there any marked rows (in this category?)
      const isAnyMarkedRecordsInThisCategory = categoryRowData.some(
        (r: any) => r.Marked
      );

      if (config.yAxisScaleType.value() == "log") {
        categoryRowData = categoryRowData.filter((r: RowData) => r.y > 0);
      }

      let markingGroupId = 0;

      let previousElement = categoryRowData[0];
      categoryRowData.forEach((element: RowData) => {
        if (element.Marked != previousElement.Marked) {
          markingGroupId++;
        }
        //Log.blue(LOG_CATEGORIES.DebugSingleRowMarking)("element", element, previousElement, markingGroupId, element.Marked, previousElement.Marked);
        element.markingGroupId = markingGroupId;
        previousElement = element;
      });

      const categorySumStats = sumStats.get(category);
      Log.green(LOG_CATEGORIES.InnovativeLogTicks)(
        "categorySumStats",
        categorySumStats.max
      );
      const bandwidth =
        (categorySumStats.max - categorySumStats.min) *
        config.violinBandwidth.value();

      Log.green(LOG_CATEGORIES.InnovativeLogTicks)("bandWidth", bandwidth);

      // Calculate the densities - note - in the result, x is the y axis in the plot; y is the width of the violin at
      // that point.
      let densityPointsSorted = Array.from(
        kde_pkg
          .density1d(
            categoryRowData.map((d: any) => d.y),
            {
              size: config.violinSmoothness.value(),
              bandwidth: bandwidth,
              extent:
                config.violinLimitToExtents.value() ||
                config.yAxisScaleType.value() == "symlog"
                  ? [categorySumStats.min, categorySumStats.max]
                  : null,
            }
          )
          .points()
      )
        .filter((p: any) => !isNaN(p.y))
        .sort((a: any, b: any) => d3.ascending(a.x, b.x));

      Log.green(LOG_CATEGORIES.CalculateSlopeAtZero)(densityPointsSorted);

      // Calculate the slope at closest value zero
      // Closest value to zero      
      const zeroCrossingValue = d3.min(
        densityPointsSorted.map((p: any) => Math.abs(p.x))
      );
      const zeroCrossingIndex = densityPointsSorted.findIndex((p : any) => Math.abs(p.x) == zeroCrossingValue);
      Log.blue(LOG_CATEGORIES.CalculateSlopeAtZero)(zeroCrossingValue, "Index", zeroCrossingIndex);

      const slope =
        (densityPointsSorted[zeroCrossingIndex + 1].x -
          densityPointsSorted[zeroCrossingIndex].x) /
        (densityPointsSorted[zeroCrossingIndex + 1].y -
          densityPointsSorted[zeroCrossingIndex].y);   

      sumStats.get(category).slopeAtZero = slope;
      Log.blue(LOG_CATEGORIES.CalculateSlopeAtZero)("Slope", slope);

      // Now need a data structure where data points are grouped by marking
      const pointsGroupedByMarking = d3.rollup(
        categoryRowData,
        (d: any) => d,
        (d: any) => d.markingGroupId
      );
      Log.blue(LOG_CATEGORIES.ColorViolin)(
        "dataPointsGroupedByMarking",
        pointsGroupedByMarking
      );

      // Thresholds is the thresholds of each block (group) of marked/unmarked data
      const thresholds: any = [];
      for (const [, filteredPoints] of pointsGroupedByMarking) {
        const threshold: any = {
          min: d3.min(filteredPoints.map((d: any) => d.y)),
          max: d3.max(filteredPoints.map((d: any) => d.y)),
          marked: filteredPoints.some((d: any) => d.Marked),
        };
        thresholds.push(threshold);
      }

      Log.blue(LOG_CATEGORIES.InnovativeLogTicks)(
        "densityPointsSorted",
        densityPointsSorted
      );

      // Filter out any points <= 0, if scale is log
      if (config.yAxisScaleType.value() == "log") {
        densityPointsSorted = densityPointsSorted.filter((p: any) => p.x > 0);
      }

      densitiesAll.push({
        category: category,
        trellis: trellisNode.formattedPath(),
        densityPoints: densityPointsSorted,
      });

      Log.green(LOG_CATEGORIES.ColorViolin)(
        "thresholds",
        category,
        thresholds,
        minY
      );

      thresholds.forEach((threshold: any) => {
        let min = threshold.min;
        let max = threshold.max;

        if (min == max) {
          // The threshold covers a single row of data
          // Adjust the thresholds slightly so we capture some marked stuff
          const adjustmentFactor = (maxY - minY) / 200;
          Log.red(LOG_CATEGORIES.DebugSingleRowMarking)(
            "adjustmentFactor",
            adjustmentFactor
          );
          min = min - adjustmentFactor;
          max = max + adjustmentFactor;
        }

        const filteredPoints = isAnyMarkedRecordsInThisCategory
          ? densityPointsSorted.filter((p: any) => p.x >= min && p.x <= max)
          : densityPointsSorted;

        if (filteredPoints.length > 0) {
          // if (i == thresholds.length - 1) {
          //     // Extend the density points to cover to the extent of the marked/not marked data - to thresholds
          //     // that matches the y value of the marked data.

          //     const firstItem =
          //     {
          //         x: threshold.min,
          //         y: (points[0] as any).y
          //     };
          //     points = [firstItem, ...points]; // prepend the first item

          //     points.push(
          //         {
          //             category: threshold.max,
          //             y: (points[points.length - 1] as any).y
          //         }
          //     )
          // }

          Log.green(LOG_CATEGORIES.Stats)(
            "augmented, filtered points",
            filteredPoints
          );

          maxKdeValue = Math.max(
            maxKdeValue,
            d3.max(filteredPoints.map((p: any) => p.y))
          );

          densitiesSplitByMarking.push({
            category: category,
            color: config.useFixedViolinColor.value()
              ? config.violinColor.value()
              : sortedRowDataGroupedByCat
                  .get(category)
                  .find((r: RowData) => r.y > min)?.Color,
            trellis: trellisNode.formattedPath(),
            densityPoints: filteredPoints,
            Marked: threshold.marked,
            IsGap: false,
            count: sortedRowDataGroupedByCat.get(category).filter((d: any) => {
              return d.y >= threshold.min && d.y <= threshold.max;
            }).length,
          });
          Log.blue(LOG_CATEGORIES.DebugLogYAxis)(
            "densitiesSplitByMarking",
            densitiesSplitByMarking
          );
        }
      });

      // Now fill in the "gaps", where there are no data points for parts of the violin
      if (isAnyMarkedRecordsInThisCategory) {
        // bottom (min):
        // Find the first point that's just greater than thresholds[0].min
        const maxIndex =
          Math.min(
            densityPointsSorted.findIndex((p: any) => p.x > thresholds[0]?.min),
            densityPointsSorted.length - 1
          ) + 1;

        const gapPoints = densityPointsSorted.filter(
          (p: any, i: number) => i < maxIndex
        );

        if (gapPoints.length > 0) {
          densitiesSplitByMarking.push({
            category: category,
            trellis: trellisNode.formattedPath(),
            densityPoints: gapPoints,
            Marked: false,
            IsGap: true,
          });
          Log.red(LOG_CATEGORIES.ColorViolin)(
            "last",
            densitiesSplitByMarking[densitiesSplitByMarking.length - 1]
          );
        }

        thresholds.forEach((threshold: any, i: number) => {
          const densityPointsReversed =
            Array.from(densityPointsSorted).reverse();

          // Get index of densityPoint that's just greater than min of next threshold
          let maxIndex = Math.min(
            densityPointsSorted.findIndex(
              (p: any) => p.x > thresholds[i + 1]?.min
            ),
            densityPointsSorted.length - 1
          );

          //Log.blue(LOG_CATEGORIES.DebugLogYAxis)(
          //  "thresholds maxIndex", maxIndex, densityPointsSorted);

          if (maxIndex == undefined) {
            maxIndex = (densityPointsSorted.length - 1) as number;
          }

          // Get index of densityPoint that's just less than max of this threshold
          const minIndex =
            densityPointsSorted.length -
            densityPointsReversed.findIndex((p: any) => p.x < threshold.max) -
            1;

          const gapPoints = densityPointsSorted.filter(
            (p: any, i: number) => i >= minIndex && i <= maxIndex //p.x >= threshold.max && p.x <= thresholds[i + 1]?.min
          );

          densitiesSplitByMarking.push({
            category: category,
            trellis: trellisNode.formattedPath(),
            densityPoints: gapPoints,
            Marked: false,
            IsGap: true,
          });

          Log.blue(LOG_CATEGORIES.DebugLogYAxis)(
            "Adding from thresholds",
            minIndex,
            maxIndex,
            threshold.max,
            thresholds[i + 1]?.min,
            densityPointsSorted[minIndex],
            densityPointsSorted[maxIndex],
            gapPoints,
            densityPointsSorted
          );
        });

        // top (max):
        densitiesSplitByMarking.push({
          category: category,
          trellis: trellisNode.formattedPath(),
          densityPoints: densityPointsSorted.filter(
            (p: any) => p.x > thresholds[thresholds.length - 1].max
          ),
          Marked: false,
          IsGap: true,
        });
      }
    }
  }

  // calculations for Tukey Kramer comparison circles
  // df - degrees of freedom
  // k - number of populations
  // alpha -  (the Type I error rate, or the probability of rejecting a true null hypothesis)
  const comparisonCirclesData: Map<any, any> = new Map();
  let comparisonCirclesStats: any;

  // Check if the dataView has expired. Throw error if it has. Check several times during building of data
  if (await dataView.hasExpired()) throw new Error("DataView Has expired");

  if (config.comparisonCirclesEnabled.value()) {
    let sumAll: number = 0;

    let df: number = 0;
    let k: number = 0;

    // degrees of freedom, k
    sumStats.forEach((element: any) => {
      const count = element.count;
      if (count > 1 && !isNaN(element.stdDev)) {
        sumAll += count * element.stdDev * element.stdDev;
        df += count - 1;
        k++;
      }
    });

    let qTukey: number = 0;

    // studentized range (q) distribution
    if (k >= 2 && df >= 3 && df > k) {
      // Not sure why dividing by SQRT2, but this matches Spotfire implementation
      qTukey =
        qtukey(1 - config.comparisonCirclesAlpha.value(), k, df) / Math.SQRT2;
    }

    let stdErr: number = 0;
    if (df != 0) {
      stdErr = sumAll / df;
    }

    Log.green(LOG_CATEGORIES.ComparisonCircles)(
      "df, k, sumAll, qTukey, stdErr",
      df,
      k,
      sumAll,
      qTukey,
      stdErr
    );

    for (const [key, element] of sumStats.entries()) {
      Log.green(LOG_CATEGORIES.ComparisonCircles)(element);
      const radius = qTukey * Math.sqrt(stdErr / element.count);
      const y0 = element.avg;
      Log.green(LOG_CATEGORIES.ComparisonCircles)(key, y0, radius);
      comparisonCirclesData.set(key, {
        radius: radius,
        y0: y0,
        significantlyDifferent: false,
      });
    }

    comparisonCirclesStats = {
      alpha: config.comparisonCirclesAlpha.value(),
      rootMse: Math.sqrt(stdErr),
      q: Math.SQRT2 * qTukey,
    };

    Log.green(LOG_CATEGORIES.ComparisonCircles)(
      "comparisonCirclesStats",
      comparisonCirclesStats
    );
  }

  // Check if the dataView has expired. Throw error if it has. Check several times during building of data
  if (await dataView.hasExpired()) throw new Error("DataView Has expired");
  /* Calculate P-value */
  let pValue: any;
  if (config.showPvalue.value()) {
    /* function for calculating p-value */
    function oneWayAnovaHelper(data: any[], classes: any[]): IAnovaResult {
      return oneWay(data, classes, { alpha: 0.05 });
    }

    const dataX = rowData.map((d) => d.category);
    const dataY = rowData.map((d) => d.y);
    let oneWayAnovaResult: IAnovaResult;
    Log.green(LOG_CATEGORIES.Stats)(dataX);
    Log.green(LOG_CATEGORIES.Stats)(dataX.length);
    if (dataX.length > 0) {
      const dataXSet = new Set(dataX);
      Log.green(LOG_CATEGORIES.Stats)(dataXSet);
      Log.green(LOG_CATEGORIES.Stats)(dataXSet.size);
      if (dataXSet.size > 1) {
        try {
          pValue = oneWayAnovaHelper(dataY, dataX).pValue;
        } catch (err) {
          Log.green(LOG_CATEGORIES.Stats)(
            "Error running oneWay - P-value will be NA. ",
            err
          );
          pValue = "NA";
        }

        Log.green(LOG_CATEGORIES.Stats)(
          oneWayAnovaResult,
          oneWayAnovaResult?.pValue
        );
      } else {
        Log.green(LOG_CATEGORIES.Stats)("dataXSet NA");
        pValue = "NA"; // The number of unique values in x is less than 1
      }
    } else {
      Log.green(LOG_CATEGORIES.Stats)("No data");
      pValue = "NA"; // No data found
    }
  }

  if (config.includeViolin.value()) {
    Log.green(LOG_CATEGORIES.DebugLatestMarking)("maxKdeValue", maxKdeValue);

    Log.blue(LOG_CATEGORIES.DebugLatestMarking)(
      "densities",
      densitiesAll,
      densitiesSplitByMarking,
      ...Array.from(densitiesSplitByMarking.values()).map(
        (d: any) => d.densityPoints
      )
    );

    // Adjust min/max to include the full extents of the violin data
    Array.from(densitiesAll.values())
      .map((d: any) => d.densityPoints)
      .forEach((element) => {
        Log.blue(LOG_CATEGORIES.DebugSingleRowMarking)(
          "densityPoints",
          element,
          d3.max(element.map((e: any) => e.x))
        );
        if (element.length != 0) {
          maxY = Math.max(maxY, d3.max(element.map((e: any) => e.x)));
          minY = Math.min(minY, d3.min(element.map((e: any) => e.x)));
        }
      });
  }

  Log.green(LOG_CATEGORIES.DebugLogYAxis)("minY, maxY", minY, maxY);

  return {
    clearMarking: () => {
      Log.green(LOG_CATEGORIES.General)("Clearing marking");
      dataView.clearMarking();
    },
    yDataDomain: {
      min: minY,
      max: maxY,
    },
    xScale: categories,
    rowData: rowData,
    densitiesSplitByMarking: densitiesSplitByMarking,
    densitiesAll: densitiesAll,
    rowDataGroupedByCat: sortedRowDataGroupedByCat,
    sumStats: sumStats,
    categories: categories,
    isAnyMarkedRecords: isAnyMarkedRecords,
    maxKdeValue: maxKdeValue,
    comparisonCirclesData: comparisonCirclesData,
    comparisonCirclesStats: comparisonCirclesStats,
    pValue: pValue,
    mark: async (rows: DataViewRow[], markingOperation: MarkingOperation) => {
      // Mark distinct rows
      rows = [...new Set(rows)] as DataViewRow[];
      Log.green(LOG_CATEGORIES.General)(
        dataView,
        rows,
        markingOperation,
        await dataView.hasExpired()
      );
      if (await dataView.hasExpired()) throw "Error - dataView has expired!";
      dataView.mark(rows, markingOperation);
    },
  };
}

/**
 *  Get min/max for all enabled reference/trend lines for this xValue/category
 * */
function getReferenceAndTrendLinesMinMax(
  sumStatsEntry: any,
  config: Partial<Options>
) {
  let max: number;
  let min: number;

  Array.from(config.GetStatisticsConfigItems().values())
    .filter((l: StatisticsConfig) => l.refEnabled === true)
    .forEach((referenceLineSetting: StatisticsConfig) => {
      const referenceLine = SumStatsConfig.find(
        (config: SumStatsSettings) => config.name == referenceLineSetting.name
      );

      max = max
        ? Math.max(sumStatsEntry[referenceLine.property], max)
        : sumStatsEntry[referenceLine.property];
      min = min
        ? Math.min(sumStatsEntry[referenceLine.property], min)
        : sumStatsEntry[referenceLine.property];

      Log.green(LOG_CATEGORIES.DebugBigData)(
        "sumStatsEntry",
        sumStatsEntry,
        referenceLine.property,
        config.FormatNumber(min),
        config.FormatNumber(max)
      );
    });

  Array.from(config.GetStatisticsConfigItems().values())
    .filter((l: StatisticsConfig) => l.trendEnabled === true)
    .forEach((trendLineSetting: StatisticsConfig) => {
      const trendLine = SumStatsConfig.find(
        (config: SumStatsSettings) => config.name == trendLineSetting.name
      );
      max = max
        ? Math.max(sumStatsEntry[trendLine.property], max)
        : sumStatsEntry[trendLine.property];
      min = min
        ? Math.min(sumStatsEntry[trendLine.property], min)
        : sumStatsEntry[trendLine.property];
    });
  Log.green(LOG_CATEGORIES.DebugBigData)(
    "Overall min max",
    config.FormatNumber(min),
    config.FormatNumber(max)
  );
  return { min: min, max: max };
}

function buildSumStats(
  config: Partial<Options>,
  sortedRowDataGroupedByCat: Map<string, RowData[]>,
  trellisName: string
): Map<string, SummaryStatistics> {
  const startTime = performance.now();
  const sumstat: Map<string, SummaryStatistics> = new Map();

  /**
   * Grouping data by the categories and calculating metrics for box plot
   */
  for (let [category, rowData] of sortedRowDataGroupedByCat) {
    const yValues = rowData.map((r: RowData) => r.y);

    let now = performance.now();
    //calculate different metrics
    let count: number;
    if (config.IsStatisticsConfigItemEnabled("Count")) {
      Log.green(LOG_CATEGORIES.DebugLogYAxis)("Calculating count");
      count = d3.count(yValues);
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)(
      "count",
      performance.now() - now
    );
    now = performance.now();

    let stdDev: number;
    if (config.IsStatisticsConfigItemEnabled("StdDev")) {
      stdDev = d3.deviation(yValues);
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)(
      "stdDev",
      performance.now() - now
    );
    now = performance.now();

    let avg: number;
    if (config.IsStatisticsConfigItemEnabled("Avg")) {
      avg = d3.mean(yValues);
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)(
      "avg",
      performance.now() - now
    );
    now = performance.now();

    let sum: number;
    if (config.IsStatisticsConfigItemEnabled("Sum")) {
      sum = d3.sum(yValues);
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)(
      "sum",
      performance.now() - now
    );
    now = performance.now();

    // Function to manually calculate the quartiles - significantly outperforms d3.quartile
    function quartile_r7(values: number[], count: number, q: number) {
      var index = (count - 1) * q;
      var base = Math.floor(index);
      var rest = index - base;
      if (values[base + 1] !== undefined) {
        return values[base] + rest * (values[base + 1] - values[base]);
      } else {
        return values[base];
      }
    }

    // d3 Median, q1, q3 are slow with d3.quantile - with 5M records, switching to manual calculation
    // (typically) halves overall time to calculate sumstats
    let q1: number;
    if (config.IsStatisticsConfigItemEnabled("Q1")) {
      q1 = quartile_r7(
        yValues,
        count,
        //.sort(d3.ascending),
        0.25
      );
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)("q1", performance.now() - now);
    now = performance.now();

    let median: number;
    if (config.IsStatisticsConfigItemEnabled("Median")) {
      median =
        count % 2 == 1
          ? yValues[(count + 1) / 2 - 1]
          : d3.mean([yValues[count / 2 - 1], yValues[count / 2]]);
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)(
      "median",
      performance.now() - now
    );
    now = performance.now();

    let q3: number;
    if (config.IsStatisticsConfigItemEnabled("Q3")) {
      q3 = quartile_r7(
        yValues,
        count,
        //.sort(d3.ascending),
        0.75
      );
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)("q3", performance.now() - now);
    now = performance.now();

    const interQuartileRange: number = q3! - q1!;
    let min: number;
    if (config.IsStatisticsConfigItemEnabled("Min")) {
      // This is the first item in the array, as it's sorted
      min = yValues[0];
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)(
      "min",
      performance.now() - now
    );
    now = performance.now();

    const uif = q3 + 1.5 * interQuartileRange;
    const lif = q1 - 1.5 * interQuartileRange;

    const uof = q3 + 3 * interQuartileRange;
    const lof = q1 - 3 * interQuartileRange;

    let max: number;
    if (config.IsStatisticsConfigItemEnabled("Max")) {
      // This is the last item in the array, as it's sorted
      max = yValues[yValues.length - 1];
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)(
      "max",
      performance.now() - now
    );
    now = performance.now();

    let lav: number;
    // todo: check this!
    if (config.IsStatisticsConfigItemEnabled("LAV")) {
      lav = Math.min(
        yValues.find((y: number) => y >= lif),
        max
        //return g.y >= lif ? (g.y as number) : (max as number);
      );

      // constrain lav to be <= Q1
      lav = lav > q1 ? q1 : lav;
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)(
      "lav",
      performance.now() - now
    );
    now = performance.now();

    let uav: number;
    if (config.IsStatisticsConfigItemEnabled("UAV")) {
      uav = d3.max(yValues.filter((y) => y <= uif));
      // constrain uav to be >= Q3
      uav = uav < q3 ? q3 : uav;
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)(
      "uav",
      performance.now() - now
    );
    now = performance.now();

    // 95% confidence interval of the mean
    // 1.960 is the Confidence Level Z Value for 95%
    const confidenceIntervalUpper = avg + 1.96 * (stdDev / Math.sqrt(count));
    const confidenceIntervalLower = avg - 1.96 * (stdDev / Math.sqrt(count));

    // todo: check!
    let outlierCount: number;
    if (config.IsStatisticsConfigItemEnabled("Outliers")) {
      outlierCount = d3.count(
        yValues.filter((y: any) => (y > uav ? y : null || y < lav ? y : null))
      );
    }

    Log.blue(LOG_CATEGORIES.SumStatsPerformance)(
      "outliers",
      performance.now() - now
    );
    now = performance.now();

    Log.green(LOG_CATEGORIES.SumStatsPerformance)(
      "Build SumStats took " +
        (performance.now() - startTime) / 1000 +
        "seconds"
    );

    const stats = {
      trellis: trellisName,
      count: count,
      avg: avg,
      sum: sum,
      stdDev: stdDev,
      //density: density,
      q1: q1,
      median: median,
      q3: q3,
      interQuartileRange: interQuartileRange,
      min: min,
      max: max,
      uav: uav,
      lav: lav,
      lif: lif,
      uif: uif,
      outlierCount: outlierCount,
      outlierPct: outlierCount / count,
      lof: lof,
      uof: uof,
      confidenceIntervalLower: confidenceIntervalLower,
      confidenceIntervalUpper: confidenceIntervalUpper,
      slopeAtZero: 0,
    } as SummaryStatistics;

    Log.green(LOG_CATEGORIES.DebugBoxIssue)(stats);

    sumstat.set(category, stats);
  }

  return sumstat;
}
