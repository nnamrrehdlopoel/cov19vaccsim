import { Component } from '@angular/core';
import * as d3 from 'd3';

import { ChartBase } from './chart-base/chart-base.directive';

export interface DummyChartConfig {
    // nothing so far
}

export interface DummyChartData {
    vacStart: Date;
    vacData: number[];  // daily vaccination numbers, starting from day vacStart
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
    private xGrid: d3.Selection<SVGGElement, unknown, null, undefined>;
    private yGrid: d3.Selection<SVGGElement, unknown, null, undefined>;

    initialChartConfig(): DummyChartConfig {
        return {};
    }

    initializeChart(): void {
        this.xAxis = this.svg.append('g').classed('x-axis', true);
        this.yAxis = this.svg.append('g').classed('y-axis', true);
        this.lines = this.svg.append('g').classed('lines', true);
        this.xGrid = this.svg.append('g').classed('grid', true);
        this.yGrid = this.svg.append('g').classed('grid', true);
    }

    updateChart(): void {
        const margin = {top: 20, right: 40, bottom: 50, left: 80};
        const vacData = this.data.vacData;
        const dataMax = d3.max(vacData);
        const dataMin = d3.min(vacData);
        const x = d3 // temp linear scale for x axis
            .scaleLinear()
            .domain([0, vacData.length - 1])
            .range([
                margin.left,
                this.chartSize.width - margin.right,
            ]);
        const y = d3
            .scaleLinear()
            .domain([dataMin, dataMax])
            .range([this.chartSize.height - margin.bottom, margin.top]);

        const endDate = new Date(this.data.vacStart); // add days
        endDate.setDate(endDate.getDate() + (this.data.vacData.length - 1));

        const xTime = d3
            .scaleTime()
            .domain([
                this.data.vacStart,
                endDate,
            ]).range([
                margin.left,
                this.chartSize.width - margin.right,
            ]).nice();

        const lineGenerator: d3.Line<number> = d3
            .line<number>()
            .defined((d) => d != null)
            .x((d, i) => x(i))
            .y((d) => y(d));

        this.lines
            .selectAll('path')
            .data([vacData])
            .join('path')
            .attr('fill', 'none')
            .attr('stroke', 'black')
            .attr('stroke-width', '2')
            .attr('d', (d) => lineGenerator(d));

        this.yAxis
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(y));

        this.yGrid
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3
                .axisLeft(y)
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
                //.tickSize(-this.chartSize.height)
                .tickFormat(date => date.toLocaleString('default', {
                    month: 'long',
                }))
            );
    }

}
