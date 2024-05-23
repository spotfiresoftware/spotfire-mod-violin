/*
* Copyright © 2024. Cloud Software Group, Inc.
* This file is subject to the license terms contained
* in the license file that is distributed with this file.
*/

import { 
    DataViewHierarchyNode, 
    DataViewRow, 
    MarkingOperation, 
    Mod, 
    ModProperty, 
    Size 
} from "spotfire-api";

// @ts-ignore
import * as d3 from "d3";
export type D3_SELECTION = d3.Selection<SVGGElement, unknown, HTMLElement, any>;

export interface TrellisZoomConfig {
    trellisName: any,
    minZoom: number,
    maxZoom: number,
    minZoomUnset: boolean,
    maxZoomUnset: boolean
}

export interface RenderState {
    preventRender: boolean;
    disableAnimation: boolean;
}

export interface RenderedPanel {
    name: String,
    boundingClientRect: DOMRect,
    getBoundingClientRect(): DOMRect,
    svgLeft: number,
    svgTop: number,
    mark(x: number, y: number, width: number, height: number, ctrlKey: boolean): void
}

export interface RowData {
    category: string;
    y: number;
    trellis: string;
    Color: string;
    ColorValue: string;
    Marked: boolean;
    id: string;
    markingGroupId: number;
    row: DataViewRow;
}

export interface SummaryStatistics {
    trellis: string;
      count: number;
      avg: number;
      sum: number;
      stdDev: number;
      //density: density;
      q1: number;
      median: number;
      q3: number;
      interQuartileRange: number;
      min: number;
      max: number;
      uav: number;
      lav: number;
      lif: number;
      uif: number;
      outlierCount: number;
      outlierPct: number;
      lof: number;
      uof: number;
      confidenceIntervalLower: number;
      confidenceIntervalUpper: number;
      closestValueToZero: number;
}

export enum SumStatReferenceType {
    Point,
    Line
}

export interface SumStatsSettings {
    name: string,
    property: string,
    format?: string,
    type: SumStatReferenceType,
    size(xBandwidth: number): number,
    path(xBandwidth: number): number,
    labelHorizOffset(xBandwidth: number): number,
    labelVerticalOffset: number,
    verticalOffset(xBandwidth: number): number,
    dashArray: number,
    rotation: number
}

export interface StatisticsConfig {
    name: string,
    refEnabled: boolean,
    trendEnabled: boolean,
    tableEnabled: boolean,
    color: string,
    dashArray: string
}

export interface Data {
    yDataDomain: { min: number; max: number };
    xScale: string[];
    clearMarking(): void;
    rowData: RowData[];
    rowDataGroupedByCat: Map<string, RowData[]>;
    densitiesSplitByMarkingAndCategory: any[];
    densitiesAll: any[];
    sumStats: Map<any, any>;
    categories: string[];
    isAnyMarkedRecords: boolean;
    maxKdeValue: number;
    comparisonCirclesData: Map<any, any>;
    comparisonCirclesStats: any;
    pValue: any;
    mark(rows: DataViewRow[], mode?: MarkingOperation): void;
}

export interface TrellisRenderingInfo {
    node: DataViewHierarchyNode,
    data: Data,
    containerSize: Size,
    container: d3.D3_SELECTION,
    trellisIndex: number,
    trellisName: string,
    trellisRowIndex: number
}

export interface Options {

    // Whether to show only "filtered" x axis values - i.e. only those with values
    xAxisFiltered: ModProperty<boolean>;

    //** y-axis types include linear and log */
    yAxisLog: ModProperty<boolean>;

    // y-axis scale type - linear/log/symlog
    yAxisScaleType: ModProperty<string>;

    symLogWarningDismissed: ModProperty<boolean>;

    includeViolin: ModProperty<boolean>;
    /** To do: would color the violing area instead of individual points*/
    colorForViolin: boolean;
    violinBandwidth?: ModProperty<number>;
    violinSmoothness?: ModProperty<number>;
    /** Places a box plot on top of violin*/
    includeBoxplot: ModProperty<boolean>;
    /** option of showing gridlines */
    includeYAxisGrid: ModProperty<boolean>;
    //**resolution for violin */

    // todo remove
    resolution?: ModProperty<number>;

    yZoomMin?: ModProperty<number>;
    yZoomMax?: ModProperty<number>;

    yZoomMinUnset?: ModProperty<boolean>;
    yZoomMaxUnset?: ModProperty<boolean>;

    orderBy?: ModProperty<string>;

    // Y axis formatting
    yAxisFormatType: ModProperty<string>;
    yAxisDecimals: ModProperty<number>;
    yAxisCurrencySymbol: ModProperty<string>;
    yAxisUseThousandsSeparator: ModProperty<boolean>;
    yAxisUseShortNumberFormat: ModProperty<boolean>;

    yScalePerTrellisPanel: ModProperty<boolean>;

    showZoomSliders? : ModProperty<boolean>;
    trellisIndividualZoomSettings?: ModProperty<string>;

    boxPlotColor: ModProperty<string>;

    violinColor: ModProperty<string>;

    boxWidth: ModProperty<number>;

    showPvalue: ModProperty<boolean>;

    circleSize: ModProperty<number>;

    maxColumnsPerPage: ModProperty<number>;

    maxRowsPerPage: ModProperty<number>;

    comparisonCirclesEnabled: ModProperty<boolean>;
    comparisonCirclesAlpha: ModProperty<number>;

    statisticsConfig: ModProperty<string>;

    areColorAndXAxesMatching : boolean;

    summaryTableFontScalingFactor: ModProperty<number>;

    violinLimitToExtents: ModProperty<boolean>;

    useFixedViolinColor: ModProperty<boolean>;

    useFixedBoxColor: ModProperty<boolean>;

    drawViolinUnderBox: ModProperty<boolean>;

    violinOpacity: number;
    boxOpacity: number;

    show95pctConfidenceInterval: ModProperty<boolean>;

    GetStatisticsConfigItems(): Map<string, StatisticsConfig>;

    SetStatisticsConfigItem(statisticsConfigItem: StatisticsConfig) : void;

    GetStatisticsConfigItem(name: string) : StatisticsConfig;

    FormatNumber(number: number): string;

    IsStatisticsConfigItemEnabled(name: string) : boolean;

    GetTrellisZoomConfigs(): TrellisZoomConfig[];

    ResetGlobalZoom(): void;

}