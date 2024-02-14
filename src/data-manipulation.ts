// @ts-ignore
import * as d3 from "d3";

import { oneWay } from "ml-anova";
import { IAnoletesult } from "ml-anova/lib/utils";
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
} from "./definitions";
import { Log, LOG_CATEGORIES, LOG_Y_MIN } from "./index";
import { SumStatsConfig } from "./sumstatsconfig";
import { log } from "console";

/**
 * Construct a data format suitable for consumption in d3.
 * @param mod The Mod API object
 * @param dataView The mod's DataView
 */
export async function buildData(
  trellisNode: DataViewHierarchyNode,
  dataView: DataView,
  config: Partial<Options>
): Promise<Data> {
  const startTime = Date.now();

  // Check if the dataView has expired. Throw error if it has. Check several times during building of data
  if (await dataView.hasExpired()) {
    throw new Error("DataView Has expired");
  }
  const nodeRows = trellisNode.rows();

  let rowData: Array<RowData> = new Array();

  const xAxis: DataViewAxis = await dataView.categoricalAxis("X");

  const xHierarchy = await dataView.hierarchy("X");
  const xHierarchyLeaves = (await xHierarchy!.root())!.leaves();
  Log.green(LOG_CATEGORIES.DebugLatestMarking)(
    xHierarchyLeaves,
    await trellisNode.leaves(),
    nodeRows.length
  );
  const categories: string[] = [];
  if (!xAxis) {
    // x axis is empty
    const category = "(None)";
    categories.push(category);
    Log.green(LOG_CATEGORIES.Data)("X axis is empty");

    nodeRows!.forEach((row: DataViewRow) => {
      if (Date.now() - startTime > 10000) {
        throw "Error - data size is too big - check Count axis, or reduce amount of data";
      }
      // Note - early versions of the code replaced empty values with zeros. This is not correct!
      const val = row.continuous<number>("Y").value();
      const count = row.continuous<number>("Count").value();
      if (val != null) {
        for (let i = 0; i < count; i++) {
          if (Date.now() - startTime > 6000) {
            Log.red(LOG_CATEGORIES.DebugDataBailout)(
              "Throwing error during data iteration"
            );
            throw "Error - data size is too big - check Count axis, or reduce amount of data";
          }
          rowData.push({
            x: category,
            y: val,
            trellis: trellisNode.formattedPath(),
            Color: config.boxPlotColor.value(),
            Marked: row.isMarked(),
            id: row.elementId(true),
            markingGroupId: 0,
            row: row,
          });
        }
      }
    });
  } else {
    xHierarchyLeaves?.forEach((xLeaf: DataViewHierarchyNode) => {
      Log.red(LOG_CATEGORIES.DebugDataBailout)("x");

      const category = xLeaf.formattedPath();

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

      // no data for this x axis value - add an empty data point
      if (
        (categoryRows.length == 0 && !config.xAxisFiltered.value()) ||
        categoryRows.length > 0
      ) {
        categories.push(category);
      }

      categoryRows!.forEach((row) => {
        // Note - early versions of the code replaced empty values with zeros. This is not correct!
        const val = row.continuous<number>("Y").value();
        const count = row.continuous<number>("Count").value();
        if (val != null) {
          for (let i = 0; i < count; i++) {
            if (Date.now() - startTime > 6000) {
              Log.red(LOG_CATEGORIES.DebugDataBailout)(
                "Throwing error during data iteration"
              );
              throw "Error - data size is too big - check Count axis, or reduce amount of data";
            }
            rowData.push({
              x: category,
              y: val,
              trellis: trellisNode.formattedPath(),
              Color: config.boxPlotColor.value(),
              Marked: row.isMarked(),
              id: row.elementId(true),
              markingGroupId: 0,
              row: row,
            });
          }
        }
      });
    });
  }

  const sumStats = buildSumStats(config, rowData, trellisNode.formattedPath());

  // If log Y axis, filter out all negative values
  if (config.yAxisLog.value() == true) {
    Log.red(LOG_CATEGORIES.DebugLogYAxis)(
      "rowData not filtered",
      rowData,
      config.yAxisLog.value()
    );
    rowData = rowData.filter((r: any) => r.y > 0);
    Log.red(LOG_CATEGORIES.DebugLogYAxis)("rowData filtered", rowData);
  }

  // Get mins and maxes of any enabled reference or trend lines
  //const categories = [...new Set(rowData.map(item => item.x))];
  const referenceAndTrendLinesMinMaxAll: any[] = [];

  Log.red(LOG_CATEGORIES.DebugShowAllXValues)("Categories:", categories);

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

  const markedYValuesMap = d3.rollup(
    rowData,
    (d: any) => {
      return d.some((p: any) => p.Marked);
    },
    (p: any) => p.x,
    (p: any) => p.y
  );
  // Now convert entries to an array and sort them
  Log.green(LOG_CATEGORIES.Marking)(markedYValuesMap);
  // todo - optimise!
  const markedYValues = new Map<any, any>();

  for (const [key, value] of markedYValuesMap) {
    let yVals = [];
    for (const [y, Marked] of value) {
      yVals.push({ y, Marked });
    }
    yVals = yVals.sort((a: any, b: any) => d3.ascending(a.y, b.y));
    markedYValues.set(key, yVals);
  }

  const dataPointsGroupedByCat = new d3.rollup(
    rowData,
    (d: any) => d.sort((a: any, b: any) => d3.ascending(a.y, b.y)),
    (k: any) => k.x
  );

  Log.red(LOG_CATEGORIES.DebugSingleRowMarking)(
    "dataPointsGroupedByCat",
    dataPointsGroupedByCat
  );

  // Looking at grouping the data manually into bins of marked/not marked!
  for (const [, value] of dataPointsGroupedByCat) {
    let previousElement = value[0];
    let markingGroupId = 0;
    Log.red(LOG_CATEGORIES.DebugSingleRowMarking)("value", value);
    value.forEach((element: RowData) => {
      if (element.Marked != previousElement.Marked) {
        markingGroupId++;
      }
      //Log.blue(LOG_CATEGORIES.DebugSingleRowMarking)("element", element, previousElement, markingGroupId, element.Marked, previousElement.Marked);
      element.markingGroupId = markingGroupId;
      previousElement = element;
    });
  }

  // Check if the dataView has expired. Throw error if it has. Check several times during building of data
  if (await dataView.hasExpired()) throw new Error("DataView Has expired");

  let maxKdeValue: number = 0;
  const densitiesSplitByMarking = [];
  const densitiesAll = [];

  let isAnyMarkedRecords = false;

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

  // Are there any marked rows (in all the data?)
  if (rowData.some((r: any) => r.Marked)) {
    isAnyMarkedRecords = true;
  }
  const dataPointsGroupedByCatAndMarking = new Map<number, any>(); // todo - TYPES!
  const markingThresholds = new Map<number, any>();

  // Calculate densities if violin is enabled
  if (config.includeViolin.value()) {
    Log.green(LOG_CATEGORIES.DebugSingleRowMarking)(
      "dataPointsGroupedByCat",
      dataPointsGroupedByCat
    );

    for (const [key, value] of dataPointsGroupedByCat) {
      // Now need a data structure where data points are grouped by x, then marked values
      dataPointsGroupedByCatAndMarking.set(
        key,
        d3.rollup(
          value,
          (d: any) => d,
          (d: any) => d.markingGroupId
        )
      );
      const thresholds = [];
      const markingGroups = dataPointsGroupedByCatAndMarking.get(key);
      Log.green(LOG_CATEGORIES.DebugLatestMarking)(markingGroups);
      for (const [, points] of markingGroups) {
        const threshold: any = {
          min: d3.min(points.map((d: any) => d.y)),
          max: d3.max(points.map((d: any) => d.y)),
          marked: points.some((d: any) => d.Marked),
        };
        thresholds.push(threshold);
      }

      // Now set max of last threshold
      //thresholds[thresholds.length - 1].max = d3.max(
      //    markingGroups.get(thresholds.length - 1).map((d: any) => d.y)
      //);
      markingThresholds.set(key, thresholds);
    }

    Log.green(LOG_CATEGORIES.DebugSingleRowMarking)(markingThresholds);

    if (config.includeViolin.value()) {
      // Now calculate the densities
      for (const [category, points] of dataPointsGroupedByCat) {
        Log.blue(LOG_CATEGORIES.DebugLogYAxis)("points", points);
        let densityPointsSorted = Array.from(
          kde_pkg
            .density1d(
              points.map((d: any) => d.y),
              {
                size: config.violinSmoothness.value(),
                bandwidth: (maxY - minY) * config.violinBandwidth.value(),
              }
            )
            .points()
        ).sort((a: any, b: any) => d3.ascending(a.x, b.x));

        Log.blue(LOG_CATEGORIES.DebugLogYAxis)(
          "densityPointsSorted",
          densityPointsSorted
        );

        if (config.yAxisLog.value()) {
            densityPointsSorted = densityPointsSorted.filter((p:any) => p.x > 0);
        }

        densitiesAll.push({
          x: category,
          trellis: trellisNode.formattedPath(),
          densityPoints: densityPointsSorted,
        });

        const thresholds = markingThresholds.get(category);
        Log.green(LOG_CATEGORIES.DebugLatestMarking)(
          "thresholds",
          thresholds,
          minY
        );
        for (let i = 0; i < thresholds.length; i++) {
          const threshold = thresholds[i];
          Log.green(LOG_CATEGORIES.DebugSingleRowMarking)(
            "threshold",
            threshold,
            i,
            "zeroth densityPoint",
            (densityPointsSorted[0] as any).x
          );
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

          const filteredPoints = isAnyMarkedRecords
            ? densityPointsSorted.filter((p: any) => p.x >= min && p.x <= max)
            : densityPointsSorted;
          Log.green(LOG_CATEGORIES.DebugLatestMarking)(
            "Unfiltered points",
            densityPointsSorted,
            min,
            max,
            "thresholds",
            threshold.min,
            threshold.max,
            "filtered points",
            filteredPoints
          );
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
            //             x: threshold.max,
            //             y: (points[points.length - 1] as any).y
            //         }
            //     )
            // }

            Log.green(LOG_CATEGORIES.Stats)(
              "augmented, filtered points",
              filteredPoints
            );
            if (threshold.marked) isAnyMarkedRecords = true;
            maxKdeValue = Math.max(
              maxKdeValue,
              d3.max(filteredPoints.map((p: any) => p.y))
            );
            densitiesSplitByMarking.push({
              x: category,
              trellis: trellisNode.formattedPath(),
              densityPoints: filteredPoints,
              Marked: threshold.marked,
              IsGap: false,
              count: dataPointsGroupedByCat.get(category).filter((d: any) => {
                return d.y >= threshold.min && d.y <= threshold.max;
              }).length,
            });
          }
        }

        const categoryDensities = densitiesSplitByMarking.filter(
          (d: any) => d.x == category
        );
        Log.green(LOG_CATEGORIES.Stats)(
          categoryDensities,
          categoryDensities.length
        );
        const categoryDensitiesLength = categoryDensities.length;
        // Now fill in the "gaps", where there are no data points for parts of the violin
        for (let i = 1; i < categoryDensitiesLength; i++) {
          const previous = (categoryDensities[i - 1] as any)
            .densityPoints as any;
          const current = categoryDensities[i].densityPoints as any;

          const betweenDensities = densityPointsSorted.filter(
            (p: any) =>
              p.x >= (previous[previous.length - 1] as any).x &&
              p.x <= (current[0] as any).x
          );
          Log.green(LOG_CATEGORIES.Stats)(
            "i, previous, current",
            i,
            previous,
            current,
            betweenDensities
          );
          densitiesSplitByMarking.push({
            x: category,
            trellis: trellisNode.formattedPath(),
            densityPoints: betweenDensities,
            Marked: false,
            IsGap: true,
          });
        }

        if (isAnyMarkedRecords) {
          // Now add the bottom/top
          // bottom (min):
          densitiesSplitByMarking.push({
            x: category,
            trellis: trellisNode.formattedPath(),
            densityPoints: densityPointsSorted.filter(
              (p: any) => p.x < thresholds[0].min
            ),
            Marked: false,
            IsGap: true,
          });
          // top (max):
          densitiesSplitByMarking.push({
            x: category,
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

    let qTukey: number = NaN;

    // studentized range (q) distribution
    if (k >= 2 && df >= 3 && df > k) {
      // Not sure why dividing by SQRT2, but this matches Spotfire implementation
      qTukey =
        qtukey(1 - config.comparisonCirclesAlpha.value(), k, df) / Math.SQRT2;
    }

    let stdErr: number = NaN;
    if (df != 0) {
      stdErr = sumAll / df;
    }

    Log.green(LOG_CATEGORIES.ComparisonCircles)(df, sumAll, qTukey, stdErr);

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
      rootMse: stdErr,
      q: qTukey,
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
    function oneWayAnovaHelper(data: any[], classes: any[]): IAnoletesult {
      return oneWay(data, classes, { alpha: 0.05 });
    }

    const dataX = rowData.map((d) => d.x);
    const dataY = rowData.map((d) => d.y);
    let oneWayAnoletes: IAnoletesult;
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

        Log.green(LOG_CATEGORIES.Stats)(oneWayAnoletes, oneWayAnoletes?.pValue);
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
    Array.from(densitiesSplitByMarking.values())
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
    dataPoints: rowData,
    densitiesSplitByMarking: densitiesSplitByMarking,
    densitiesAll: densitiesAll,
    dataPointsGroupedByCat: dataPointsGroupedByCat,
    dataPointsGroupedByCatAndMarking: dataPointsGroupedByCatAndMarking,
    markingThresholds: markingThresholds,
    markedYValues: markedYValues,
    sumStats: sumStats,
    categories: categories,
    isAnyMarkedRecords: isAnyMarkedRecords,
    maxKdeValue: maxKdeValue,
    comparisonCirclesData: comparisonCirclesData,
    comparisonCirclesStats: comparisonCirclesStats,
    pValue: pValue,
    mark: async (rows: DataViewRow[], markingOperation: MarkingOperation) => {
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
      Log.green(LOG_CATEGORIES.DebugLatestMarking)(
        "sumStatsEntry",
        sumStatsEntry,
        referenceLine.property
      );
      max = max
        ? Math.max(sumStatsEntry[referenceLine.property], max)
        : sumStatsEntry[referenceLine.property];
      min = min
        ? Math.min(sumStatsEntry[referenceLine.property], max)
        : sumStatsEntry[referenceLine.property];
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
        ? Math.min(sumStatsEntry[trendLine.property], max)
        : sumStatsEntry[trendLine.property];
    });
  Log.green(LOG_CATEGORIES.DebugShowAllXValues)(min, max);
  return { min: min, max: max };
}

function buildSumStats(
  config: Partial<Options>,
  data: any,
  trellisName: string
) {
  /**
   * Grouping data by the categories and calculating metrics for box plot
   */
  const sumstat: Map<any, any> = new d3.rollup(
    data, // group function allows to group/nest the calculation per level of a factor
    (d: any) => {
      //calculate different metrics
      let count: number;
      if (config.IsStatisticsConfigItemEnabled("Count")) {
        Log.green(LOG_CATEGORIES.DebugLogYAxis)("Calculating count");
        count = d3.count(
          d.map(function (g: any) {
            //Log.green(LOG_CATEGORIES.DebugLogYAxis)(g, g.y);
            return (config.yAxisLog.value() && g.y > 0) ||
              !config.yAxisLog.value()
              ? (g.y as number)
              : NaN;
          })
        );
      }
      Log.blue(LOG_CATEGORIES.DebugLogYAxis)(config.GetStatisticsConfigItems());

      let countUndefined: number;
      if (config.IsStatisticsConfigItemEnabled("CountUndef")) {
        Log.green(LOG_CATEGORIES.DebugLogYAxis)("Calculating CountUndef");
        countUndefined = d3.count(
          d.map(function (g: any) {
            //Log.green(LOG_CATEGORIES.DebugLogYAxis)(g, g.y);
            return (config.yAxisLog.value() && g.y <= 0) ||
              !config.yAxisLog.value()
              ? 1
              : NaN;
          })
        );
      }

      let stdDev: number;
      if (config.IsStatisticsConfigItemEnabled("StdDev")) {
        stdDev = d3.deviation(
          d.map(function (g: any) {
            //if(DEBUG) Log.green(LOG_CATEGORIES.General)(g.y);
            return (config.yAxisLog.value() && g.y > 0) ||
              !config.yAxisLog.value()
              ? (g.y as number)
              : NaN;
          })
        );
      }

      let avg: number;
      if (config.IsStatisticsConfigItemEnabled("Avg")) {
        avg = d3.mean(
          d.map(function (g: any) {
            //if(DEBUG) Log.green(LOG_CATEGORIES.General)(g.y);
            return (config.yAxisLog.value() && g.y > 0) ||
              !config.yAxisLog.value()
              ? (g.y as number)
              : NaN;
          })
        );
      }

      let sum: number;
      if (config.IsStatisticsConfigItemEnabled("Sum")) {
        sum = d3.sum(
          d.map(function (g: any) {
            //if(DEBUG) Log.green(LOG_CATEGORIES.General)(g.y);
            return (config.yAxisLog.value() && g.y > 0) ||
              !config.yAxisLog.value()
              ? (g.y as number)
              : NaN;
          })
        );
      }

      let q1: number;
      if (config.IsStatisticsConfigItemEnabled("Q1")) {
        q1 = d3.quantile(
          d
            .map(function (g: any) {
              return (config.yAxisLog.value() && g.y > 0) ||
                !config.yAxisLog.value()
                ? (g.y as number)
                : NaN;
            })
            .sort(d3.ascending),
          0.25
        );
      }

      let median: number;
      if (config.IsStatisticsConfigItemEnabled("Median")) {
        median = d3.quantile(
          d
            .map(function (g: any) {
              return (config.yAxisLog.value() && g.y > 0) ||
                !config.yAxisLog.value()
                ? (g.y as number)
                : NaN;
            })
            .sort(d3.ascending),
          0.5
        );
      }

      let q3: number;
      if (config.IsStatisticsConfigItemEnabled("Q3")) {
        q3 = d3.quantile(
          d
            .map(function (g: any) {
              return (config.yAxisLog.value() && g.y > 0) ||
                !config.yAxisLog.value()
                ? (g.y as number)
                : NaN;
            })
            .sort(d3.ascending),
          0.75
        );
      }

      const interQuartileRange: number = q3! - q1!;

      const min: number = d3.min(
        d.map(function (g: any) {
          //if(DEBUG) Log.green(LOG_CATEGORIES.General)(g.y);
          return (config.yAxisLog.value() && g.y > 0) ||
            !config.yAxisLog.value()
            ? (g.y as number)
            : NaN;
        })
      );

      const uif = q3 + 1.5 * interQuartileRange;
      const lif = q1 - 1.5 * interQuartileRange;

      const uof = q3 + 3 * interQuartileRange;
      const lof = q1 - 3 * interQuartileRange;

      let max: number;
      if (config.IsStatisticsConfigItemEnabled("Max")) {
        max = d3.max(
          d.map(function (g: any) {
            //if(DEBUG) Log.green(LOG_CATEGORIES.General)(g.y);
            return (config.yAxisLog.value() && g.y > 0) ||
              !config.yAxisLog.value()
              ? (g.y as number)
              : NaN;
          })
        );
      }

      let lav: number;
      if (config.IsStatisticsConfigItemEnabled("LAV")) {
        lav = d3.min(
          d.map((g: any) => {
            if (config.yAxisLog.value() && g.y <= 0) return NaN;
            return g.y >= lif ? (g.y as number) : (max as number);
          })
        );

        // constrain lav to be <= Q1
        lav = lav > q1 ? q1 : lav;
      }

      let uav: number;
      if (config.IsStatisticsConfigItemEnabled("UAV")) {
        uav = d3.max(
          d.map((g: any) => {
            if (config.yAxisLog.value() && g.y <= 0) return NaN;
            return g.y <= uif ? (g.y as number) : NaN;
          })
        );
        // constrain uav to be >= Q3
        uav = uav < q3 ? q3 : uav;
      }

      let outlierCount: number;
      if (config.IsStatisticsConfigItemEnabled("Outliers")) {
        outlierCount = d3.count(
          d.map(function (g: any) {
            if (config.yAxisLog.value() && g.y <= 0) return NaN;
            return g.y > uav ? g.y : null || g.y < lav ? g.y : null;
          })
        );
      }

      Log.green(LOG_CATEGORIES.General)(outlierCount);

      return {
        trellis: trellisName,
        count: count,
        countUndefined: countUndefined,
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
      } as any;
    },
    (k: any) => k.x
  );

  //Log.green(LOG_CATEGORIES.DebugLogYAxis)(sumstat);

  return sumstat;
}
