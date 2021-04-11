import { Component } from '@angular/core';
import * as d3 from 'd3';

import { ChartBase } from './chart-base/chart-base.directive';

export interface DummyChartConfig {
    // nothing so far
}

export interface DummyChartDataElement {
    value: number;
}

@Component({
    selector: 'app-dummy-chart',
    templateUrl: 'chart-base/chart-base.directive.html',
    styleUrls: ['chart-base/chart-base.directive.scss'],
})
export class DummyChartComponent extends ChartBase<DummyChartConfig, number[]> {

    private xAxis: d3.Selection<SVGGElement, unknown, null, undefined>;
    private yAxis: d3.Selection<SVGGElement, unknown, null, undefined>;
    private lines: d3.Selection<SVGGElement, unknown, null, undefined>;

    initialChartConfig(): DummyChartConfig {
        return {};
    }

    initializeChart(): void {
        this.xAxis = this.svg.append('g').classed('x-axis', true);
        this.yAxis = this.svg.append('g').classed('y-axis', true);
        this.lines = this.svg.append('g').classed('lines', true);
    }

    updateChart(): void {
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const dataMax = d3.max(this.data);
        const dataMin = d3.min(this.data);
        const x = d3
            .scaleLinear()
            .domain([0, this.data.length - 1])
            .range([
                margin.left,
                this.chartSize.width - margin.right,
            ]);
        const y = d3
            .scaleLinear()
            .domain([dataMin, dataMax])
            .range([this.chartSize.height - margin.bottom, margin.top]);

        const lineGenerator: d3.Line<number> = d3
            .line<number>()
            .defined((d) => d != null)
            .x((d, i) => x(i))
            .y((d) => y(d));

        this.lines
            .selectAll('path')
            .data([this.data])
            .join('path')
            .attr('fill', 'none')
            .attr('stroke', 'black')
            .attr('stroke-width', '2')
            .attr('d', (d) => lineGenerator(d));
    }

}
