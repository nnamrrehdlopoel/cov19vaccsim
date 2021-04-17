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
    }

    updateChart(): void {
        const margin = {top: 20, right: 10, bottom: 50, left: 30};
        const series = this.data.series;
        const maxValue = d3.max(series.map(s => d3.max(s.data.map(point => point.value))));
        const minValue = d3.min(series.map(s => d3.min(s.data.map(point => point.value))));
        const maxDate = d3.max(series.map(s => d3.max(s.data.map(point => point.date))));
        const minDate = d3.min(series.map(s => d3.min(s.data.map(point => point.date))));

        const yValue = d3
            .scaleLinear()
            .domain([this.data.yMin, this.data.yMax])
            .range([this.chartSize.height - margin.bottom, margin.top]);

        const xTime = d3
            .scaleTime()
            .domain([minDate, maxDate])
            .range([margin.left, this.chartSize.width - margin.right]);
            //.nice();

        const lineGenerator: d3.Line<DataPoint> = d3
            .line<DataPoint>()
            .defined((d) => d != null && d.value != null)
            .x((d) => xTime(d.date))
            .y((d) => yValue(d.value));

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
            .data(series.map(s => this.addFirstAndLastMinPoints(s, minValue)))
            .join('path')
            .attr('fill', s => s.fillColor)
            .attr('stroke', 'none')
            .attr('opacity', 0.5)
            .attr('d', (d) => lineGenerator(d.data));

        this.yAxis
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(yValue).tickFormat(d3.format('.0s'))); // .tickPadding(-30));

        this.yGrid
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3
                .axisLeft(yValue)
                .ticks(5)
                .tickSize(-this.chartSize.width)
                .tickFormat(_ => '')
            );

        this.xAxis
            .attr('transform', `translate(0, ${this.chartSize.height - margin.bottom})`)
            .call(
                d3
                    .axisBottom<Date>(xTime)
                    .ticks(d3.timeMonday)
                    .tickFormat(date => date.toLocaleString('default', {
                        day: 'numeric'
                    }))
            );

        this.xGrid
            .attr('transform', `translate(0, ${this.chartSize.height - margin.bottom + 30})`)
            .call(d3
                .axisBottom<Date>(xTime)
                .ticks(d3.timeMonth)
                .tickSizeOuter(0)
                //.tickSize(-this.chartSize.height)
                .tickFormat(date => date.toLocaleString('default', {
                    month: 'long',
                }))
            );
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

}
