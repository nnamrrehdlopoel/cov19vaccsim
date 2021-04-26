import { Component } from '@angular/core';
import * as d3 from 'd3';

import { ChartBase } from './chart-base/chart-base.directive';

export interface DummyChartConfig {
    yAxisLabel: string;
    fillOpacity: number;
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
    legendLabel?: string;
}

export interface DataPoint {
    value: number;
    date: Date;
}

export interface DataPartition {
    title?: string;
    size: number;
    fillColor: string;
}

interface PartitionMinMax {
    title?: string;
    min: number;
    max: number;
    fillColor: string;
    labelBBox?: any;
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
    private yGridMinor: d3.Selection<SVGGElement, unknown, null, undefined>;
    private rightBar: d3.Selection<SVGGElement, unknown, null, undefined>;
    private rightBarBoxes: d3.Selection<SVGGElement, unknown, null, undefined>;
    private rightBarLabels: d3.Selection<SVGGElement, unknown, null, undefined>;
    private legend: d3.Selection<SVGGElement, unknown, null, undefined>;

    initialChartConfig(): DummyChartConfig {
        return {
            yAxisLabel: 'yAxisLabel',
            fillOpacity: 0.5,
        };
    }

    initializeChart(): void {
        this.fills = this.svg.append('g').classed('fills', true);
        this.lines = this.svg.append('g').classed('lines', true);
        this.xGrid = this.svg.append('g').classed('grid', true);
        this.yGrid = this.svg.append('g').classed('grid', true);
        this.yGridMinor = this.svg.append('g').classed('grid-minor', true);
        this.rightBar = this.svg.append('g').classed('right-bar', true);
        this.rightBarBoxes = this.rightBar.append('g').classed('boxes', true);
        this.rightBarLabels = this.rightBar.append('g').classed('labels', true);
        this.xAxis = this.svg.append('g').classed('x-axis', true);
        this.yAxis = this.svg.append('g').classed('y-axis', true);
        this.legend = this.svg.append('g').classed('legend', true);
    }

    updateChart(): void {
        const coords = this.getCoords();
        this.renderAreas(coords, this.data.series);
        this.renderAxis(coords);
        if(this.data.partitions){
            this.renderRightBar(coords, this.data.partitions);
        }
        this.renderLegend(coords, this.data.series);
    }

    private getCoords(): DummyChartCoords {
        const margin = {top: 10, right: 2, bottom: 30, left: 2};

        // dynamic rightBarWidth to maintain a nice aspect ratio of the bar
        // while also not using too much screen estate
        const rightBarWidth = Math.min(this.chartSize.width / 10, this.chartSize.height / 8);
        const rightBarGap = 0;
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
            .attr('opacity', this.config.fillOpacity)
            .attr('d', (d) => lineGenerator(d.data));
    }

    private renderAxis(coords: DummyChartCoords): void {
        this.yAxis
            .attr('transform', `translate(${coords.margin.left}, 0)`)

            .call(d3
                .axisLeft(coords.yScale)
                .ticks(5)
                .tickFormat(d3.format('.2s'))
                .tickSize(-5)
                .tickSizeOuter(0)
            ); // .tickPadding(-30));

        this.yGrid
            .attr('transform', `translate(${coords.margin.left}, 0)`)
            .call(d3
                .axisLeft(coords.yScale)
                .ticks(5)
                .tickSize(-(this.chartSize.width - coords.margin.left - coords.margin.right - coords.rightBarWidth))
                .tickSizeOuter(0)
                .tickFormat(_ => '')
            );
        this.yGridMinor
            .attr('transform', `translate(${coords.margin.left}, 0)`)
            .call(d3
                .axisLeft(coords.yScale)
                .tickSize(-(this.chartSize.width - coords.margin.left - coords.margin.right - coords.rightBarWidth))
                .tickSizeOuter(0)
                .tickFormat(_ => '')
            );

        this.xAxis
            .attr('transform', `translate(0, ${this.chartSize.height - coords.margin.bottom})`)
            .call(
                d3
                    .axisBottom<Date>(coords.xScale)
                    .ticks(d3.timeMonday)
                    .tickSize(-5)
                    .tickSizeOuter(0)
                    .tickPadding(5)
                    .tickFormat(date => date.toLocaleString('default', {
                        day: 'numeric'
                    }))
            )
            .attr('font-size', '9');

        this.xGrid
            .attr('transform', `translate(0, ${this.chartSize.height - coords.margin.bottom})`)
            .call(d3
                .axisBottom<Date>(coords.xScale)
                .ticks(d3.timeMonth)
                .tickSize(-(this.chartSize.height - coords.margin.top - coords.margin.bottom))
                .tickSizeOuter(0)
                .tickPadding(15)
                //.tickSize(-this.chartSize.height)
                .tickFormat(date => date.toLocaleString('default', {
                    month: 'long',
                }))
            );

        this.xGrid.selectAll('.domain').remove();

        // Month labels alignment
        this.xGrid
            .selectAll('text')
            .attr('dx', 5)
            .attr('text-anchor', 'start');

        // y axis: change number positioning
        this.yAxis
            .selectAll('text')
            .attr('dx', 7)
            .attr('dy', -4)
            .attr('text-anchor', 'start');

        // y label
        this.yAxis
            .selectAll('text.axis-label')
            .data([this.config.yAxisLabel])
            .join('text')
            .classed('axis-label', true)
            .attr('x', 6)
            .attr('y', 10)
            .attr('dx', 0)
            .attr('dy', 0)
            .attr('fill', 'black')
            .attr('text-anchor', 'start')
            .attr('font-weight', 'bold')
            .text(d => d);

    }

    private renderLegend(coords: DummyChartCoords, series: DataSeries[]): void {
        const labeledSeries = series.filter(s => !!s.legendLabel);

        // legend in general (position, visibility)
        this.legend
            .attr('transform', 'translate(40, 20)')
            .attr('opacity', labeledSeries.length > 0 ? 1 : 0);

        // background box, width currently hardcoded
        this.legend
            .selectAll('rect.legend-background')
            .data([0])
            .join('rect')
            .classed('legend-background', true)
            .attr('width', 200)
            .attr('height', labeledSeries.length * 20 + 15)
            .attr('rx', 3)
            .attr('fill', 'white')
            .attr('stroke', 'black')
            .attr('stroke-width', 1);

        // legend entries
        this.legend
            .selectAll('g.legend-entry')
            .data(labeledSeries)
            .join(enter => {
                const lGroup = enter.append('g');
                lGroup
                    .classed('legend-entry', true)
                    .attr('transform', (d, i) => `translate(5, ${i * 20 + 10})`);
                lGroup
                    .append('rect')
                    .attr('width', 10)
                    .attr('height', 10)
                    .attr('fill', d => d.fillColor)
                    .attr('opacity', this.config.fillOpacity);
                // todo set font size etc
                lGroup
                    .append('text')
                    .attr('x', 20)
                    .attr('y', 10)
                    .attr('fill', 'black')
                    .text( d => d.legendLabel);
                return lGroup;
            }, update => {
                return update;
            }, exit => {
                exit.remove();
            });
    }

    private renderRightBar(coords: DummyChartCoords, partitions: DataPartition[]): void {
        const mappedParts = this.mapPartitions(partitions);

        this.rightBarBoxes
            .selectAll('rect')
            .data(mappedParts)
            .join('rect')
            .attr('x', coords.rightBarX)
            .attr('y', p => coords.yScale(p.max))
            .attr('width', coords.rightBarWidth)
            .attr('height', p => coords.yScale(p.min) - coords.yScale(p.max))
            .attr('fill', p => p.fillColor);

        this.rightBarLabels.attr('font-size', '12');
        this.rightBarLabels
            .selectAll('g')
            .data(mappedParts)
            .join(el => el.append('g').call(el => {
                el.append('rect');
                el.append('text');
            })).each(function(p){
                d3.select(this).select('text')
                .attr('x', coords.rightBarX)
                .attr('y', coords.yScale((p.max+p.min)/2))
                .attr('dy', '0.3em')
                .attr('dx', coords.rightBarWidth/2 - 3)
                .attr('text-anchor', 'end')
                .text(p.max - p.min > 5 ? p.title : '')
                .call(function(el){
                    // @ts-ignore
                    p.labelBBox = el.node().getBBox();
                })
            })
            .each(function(p){
                d3.select(this).select('rect')
                    .attr("x", p.labelBBox.x - 3)
                    .attr("y", p.labelBBox.y)
                    .attr("width", p.labelBBox.width + 6)
                    .attr("height", p.labelBBox.height)
                    .style("fill", "white")
                    .attr('opacity', 0.8)
                    .attr('rx', 2)
                    .attr('ry', 2);
            })
            /*.each( p => {
                d3.select('g')
                    .insert('rect', 'text')
                    .attr("x", (d: PartitionMinMax) => d.labelBBox.x)
                    .attr("y", (d: PartitionMinMax) => d.labelBBox.y)
                    .attr("width", (d: PartitionMinMax) => d.labelBBox.width)
                    .attr("height", (d: PartitionMinMax) => d.labelBBox.height)
                    .style("fill", "yellow");
            });*/

        // console.log(mappedParts);

        // No gap => draw line instead
        if(mappedParts.length && coords.rightBarGap <= 0) {
            this.rightBar.selectAll('line')
                .data([0])
                .join(el => el.insert('line', 'g.labels'))
                .attr('transform', `translate(${coords.rightBarX}, ${coords.margin.top})`)
                .attr('y2', (this.chartSize.height - coords.margin.top - coords.margin.bottom))
                .attr('stroke', '#444')
                .attr('shape-rendering', 'crispEdges');
        }
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
                title: p.title
            });
            min = max;
        }
        return result;
    }

}
