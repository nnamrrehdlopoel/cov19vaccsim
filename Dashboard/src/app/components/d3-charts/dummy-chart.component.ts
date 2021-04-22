import { Component } from '@angular/core';
import * as d3 from 'd3';

import { ChartBase } from './chart-base/chart-base.directive';

export interface DummyChartConfig {
    // nothing so far
}

export interface DummyChartData {
    yMin: number;
    yMax: number;
    series: DataSeries[];
    partitions: DataPartition[];
}

export interface DataSeries {
    data: DataPoint[];
    strokeColor: string;
    strokeDasharray?: string;
    fillColor: string;
}

export interface DataPoint {
    value: number;
    date: Date;
}

export interface DataPartition {
    size: number;
    fillColor: string;
}

interface PartitionMinMax {
    min: number;
    max: number;
    fillColor: string;
}

interface DummyChartCoords {
    margin: {top: number, right: number, bottom: number, left: number};
    rightBarWidth: number;
    rightBarGap: number;
    rightBarX: number;
    yScale: d3.ScaleLinear<number, number>;
    xScale: d3.ScaleTime<number, number>;
    minValue: number;
}

@Component({
    selector: 'app-dummy-chart',
    templateUrl: 'chart-base/chart-base.directive.html',
    styleUrls: ['chart-base/chart-base.directive.scss'],
})
export class DummyChartComponent extends ChartBase<DummyChartConfig, DummyChartData> {

    private xAxis: d3.Selection<SVGGElement, unknown, null, undefined>;
    private yAxis: d3.Selection<SVGGElement, unknown, null, undefined>;
    private lines: d3.Selection<SVGGElement, unknown, null, undefined>;
    private fills: d3.Selection<SVGGElement, unknown, null, undefined>;
    private xGrid: d3.Selection<SVGGElement, unknown, null, undefined>;
    private yGrid: d3.Selection<SVGGElement, unknown, null, undefined>;
    private rightBar: d3.Selection<SVGGElement, unknown, null, undefined>;

    initialChartConfig(): DummyChartConfig {
        return {};
    }

    initializeChart(): void {
        this.xAxis = this.svg.append('g').classed('x-axis', true);
        this.yAxis = this.svg.append('g').classed('y-axis', true);
        this.fills = this.svg.append('g').classed('fills', true);
        this.lines = this.svg.append('g').classed('lines', true);
        this.xGrid = this.svg.append('g').classed('grid', true);
        this.yGrid = this.svg.append('g').classed('grid', true);
        this.rightBar = this.svg.append('g').classed('right-bar', true);
    }

    updateChart(): void {
        const coords = this.getCoords();
        this.renderAreas(coords, this.data.series);
        this.renderAxis(coords);
        this.renderRightBar(coords, this.data.partitions);
    }

    private getCoords(): DummyChartCoords {
        const margin = {top: 20, right: 2, bottom: 50, left: 2};
        const rightBarWidth = 80;
        const rightBarGap = 20;
        const series = this.data.series;
        const rightBarX = this.chartSize.width - margin.right - rightBarWidth;
        const minValue = d3.min(series.map(s => d3.min(s.data.map(point => point.value))));
        const maxDate = d3.max(series.map(s => d3.max(s.data.map(point => point.date))));
        const minDate = d3.min(series.map(s => d3.min(s.data.map(point => point.date))));

        const yScale = d3
            .scaleLinear()
            .domain([this.data.yMin, this.data.yMax])
            .range([this.chartSize.height - margin.bottom, margin.top]);

        const xScale = d3
            .scaleTime()
            .domain([minDate, maxDate])
            .range([margin.left, rightBarX - rightBarGap]);

        return {
            margin,
            rightBarWidth,
            rightBarGap,
            rightBarX,
            xScale,
            yScale,
            minValue,
        };
    }

    private renderAreas(coords: DummyChartCoords, series: DataSeries[]): void {
        const lineGenerator: d3.Line<DataPoint> = d3
            .line<DataPoint>()
            .defined((d) => d != null && d.value != null)
            .x((d) => coords.xScale(d.date))
            .y((d) => coords.yScale(d.value));

        this.lines
            .selectAll('path')
            .data(series)
            .join('path')
            .attr('fill', 'none')
            .attr('stroke', s => s.strokeColor)
            .attr('stroke-width', '2')
            .attr('stroke-dasharray', s => s.strokeDasharray || null)
            .attr('d', (d) => lineGenerator(d.data));

        this.fills
            .selectAll('path')
            .data(series.map(s => this.addFirstAndLastMinPoints(s, coords.minValue)))
            .join('path')
            .attr('fill', s => s.fillColor)
            .attr('stroke', 'none')
            .attr('opacity', 0.5)
            .attr('d', (d) => lineGenerator(d.data));
    }

    private renderAxis(coords: DummyChartCoords): void {
        this.yAxis
            .attr('transform', `translate(${coords.margin.left}, 0)`)

            .call(d3
                .axisLeft(coords.yScale)
                .tickFormat(d3.format('.0s'))
                .tickSize(-5)
            ); // .tickPadding(-30));

        this.yGrid
            .attr('transform', `translate(${coords.margin.left}, 0)`)
            .call(d3
                .axisLeft(coords.yScale)
                .ticks(5)
                .tickSize(-(this.chartSize.width - coords.margin.left - coords.margin.right - coords.rightBarWidth))
                .tickFormat(_ => '')
            );

        this.xAxis
            .attr('transform', `translate(0, ${this.chartSize.height - coords.margin.bottom})`)
            .call(
                d3
                    .axisBottom<Date>(coords.xScale)
                    .ticks(d3.timeMonday)
                    .tickFormat(date => date.toLocaleString('default', {
                        day: 'numeric'
                    }))
            );

        this.xGrid
            .attr('transform', `translate(0, ${this.chartSize.height - coords.margin.bottom + 30})`)
            .call(d3
                .axisBottom<Date>(coords.xScale)
                .ticks(d3.timeMonth)
                .tickSizeOuter(0)
                //.tickSize(-this.chartSize.height)
                .tickFormat(date => date.toLocaleString('default', {
                    month: 'long',
                }))
            );

        // y axis: change number positioning
        this.yAxis
            .selectAll('text')
            .attr('dx', 7)
            .attr('dy', -4)
            .attr('text-anchor', 'start');

    }

    private renderRightBar(coords: DummyChartCoords, partitions: DataPartition[]): void {
        this.rightBar
            .selectAll('rect')
            .data(this.mapPartitions(partitions))
            .join('rect')
            .attr('x', coords.rightBarX)
            .attr('y', p => coords.yScale(p.max))
            .attr('width', coords.rightBarWidth)
            .attr('height', p => coords.yScale(p.min) - coords.yScale(p.max))
            .attr('fill', p => p.fillColor);
    }

    /**
     * Pad data series with an additional first and last data point.
     * The point values are set to minValue.
     * Useful if you want to create a fill that goes all the way down to the axis.
     */
    private addFirstAndLastMinPoints(s: DataSeries, minValue: number): DataSeries {
        if (!s || !s.data || s.data.length === 0) {
            return s;
        }
        return {
            ...s,
            data: [
                { ...s.data[0], value: minValue },
                ...s.data,
                { ...s.data[s.data.length - 1], value: minValue },
            ]
        };
    }

    private mapPartitions(partitions: DataPartition[]): PartitionMinMax[] {
        const result: PartitionMinMax[] = [];
        let min = 0;
        for (const p of partitions) {
            const max = min + p.size;
            result.push({
                min,
                max,
                fillColor: p.fillColor,
            });
            min = max;
        }
        return result;
    }

}
