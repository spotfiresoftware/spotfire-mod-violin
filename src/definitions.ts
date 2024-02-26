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
    mark(x: number, y: number, width: number, height: number, ctrlKey: boolean): void
}

export interface RowData {
    category: string;
    y: number;
    trellis: string;
    Color: string;
    Marked: boolean;
    id: string;
    markingGroupId: number;
    row: DataViewRow;
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
    dataPoints: RowData[];
    dataPointsGroupedByCat: Map<any, any>;
    densitiesSplitByMarking: any[];
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

    individualZoomSlider: ModProperty<boolean>;

    GetStatisticsConfigItems(): Map<string, StatisticsConfig>;

    SetStatisticsConfigItem(statisticsConfigItem: StatisticsConfig) : void;

    GetStatisticsConfigItem(name: string) : StatisticsConfig;

    GetYAxisFormatString(): string;

    IsStatisticsConfigItemEnabled(name: string) : boolean;

}