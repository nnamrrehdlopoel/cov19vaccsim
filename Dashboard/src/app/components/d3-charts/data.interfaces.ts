/**
 * Data series: array of (date x numeric value)
 */
export interface DataSeries {
    data: DataPoint[];
    strokeColor: string;
    strokeDasharray?: string;
    fillColor: string;
    fillOpacity?: number;
    fillStriped?: boolean;
    label?: string;
}

export interface DataPoint {
    value: number;
    date: Date;
}

export interface DataPartition {
    label?: string;
    size: number;
    fillColor: string;
}
