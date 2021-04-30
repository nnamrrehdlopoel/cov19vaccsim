import { Component } from '@angular/core';
import * as d3 from 'd3';

import { ChartBase } from './chart-base/chart-base.directive';

export interface PredictionLineChartConfig {
    yAxisLabel: string;
    fillOpacity?: number;
}

export interface PredictionLineChartData {
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

interface PartitionMinMax {
    label?: string;
    min: number;
    max: number;
    fillColor: string;
    labelBBox?: any;
}

interface DummyChartCoords {
    margin: { top: number, right: number, bottom: number, left: number };
    rightBarWidth: number;
    rightBarGap: number;
    rightBarX: number;
    yScale: d3.ScaleLinear<number, number>;
    xScale: d3.ScaleTime<number, number>;
    minValue: number;
}

type SvgGroup = d3.Selection<SVGGElement, unknown, null, undefined>;

@Component({
    selector: 'app-prediction-line-chart',
    templateUrl: 'chart-base/chart-base.directive.html',
    styleUrls: ['chart-base/chart-base.directive.scss'],
})
export class PredictionLineChartComponent extends ChartBase<PredictionLineChartConfig, PredictionLineChartData> {

    private defs: SvgGroup;
    private xAxis: SvgGroup;
    private yAxis: SvgGroup;
    private lines: SvgGroup;
    private fills: SvgGroup;
    private xGrid: SvgGroup;
    private yGrid: SvgGroup;
    private yGridMinor: SvgGroup;
    private rightBar: SvgGroup;
    private rightBarBoxes: SvgGroup;
    private rightBarLabels: SvgGroup;
    private legend: SvgGroup;

    initialChartConfig(): PredictionLineChartConfig {
        return {
            yAxisLabel: 'yAxisLabel',
            fillOpacity: 0.5,
        };
    }

    initializeChart(): void {
        this.defs = this.svg.append('defs');
        this.defineStripedMaskPattern();

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
        if (this.data.partitions) {
            this.renderRightBar(coords, this.data.partitions);
        }
        this.renderLegend(this.data.series);
    }

    private defineStripedMaskPattern(): void {
        const stripeWidth = 2.5;
        this.defs.append('pattern')
            .attr('id', 'stripes')
            .attr('width', 2 * stripeWidth)
            .attr('height', 2 * stripeWidth)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('stroke', 'white')
            .attr('stroke-linecap', 'square')
            .attr('stroke-width', stripeWidth * 0.8)
            .call(el => {
                el.append('line')
                    .attr('x1', 0)
                    .attr('y1', stripeWidth)
                    .attr('x2', stripeWidth)
                    .attr('y2', 0);
                el.append('line')
                    .attr('x1', stripeWidth)
                    .attr('y1', 2 * stripeWidth)
                    .attr('x2', 2 * stripeWidth)
                    .attr('y2', stripeWidth);
            });
        this.defs.append('mask')
            .attr('id', 'stripes-mask')
            .call(el => {
                el.append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', '100%')
                    .attr('height', '100%')
                    .style('fill', 'url(#stripes)');
            });
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
            .attr('opacity', s => s.fillOpacity ?? this.config.fillOpacity)
            .style('mask', s => (s.fillStriped ?? false) ? 'url(#stripes-mask)' : '')
            .attr('d', (d) => lineGenerator(d.data));
    }

    private renderAxis(coords: DummyChartCoords): void {
        this.yGrid
            .attr('transform', `translate(${coords.margin.left}, 0)`)
            .call(d3
                .axisLeft(coords.yScale)
                .ticks(5)
                .tickSize(-(this.chartSize.width - coords.margin.left - coords.margin.right - coords.rightBarWidth))
                .tickSizeOuter(0)
                .tickFormat(d3.format('.2s'))
            );
        this.yGrid.selectAll('.domain').remove();
        // y axis: change number positioning
        this.yGrid
            .selectAll('text')
            .attr('dx', 7)
            .attr('dy', -4)
            .attr('text-anchor', 'start');

        this.yGridMinor
            .attr('transform', `translate(${coords.margin.left}, 0)`)
            .call(d3
                .axisLeft(coords.yScale)
                .tickSize(-(this.chartSize.width - coords.margin.left - coords.margin.right - coords.rightBarWidth))
                .tickSizeOuter(0)
                .tickFormat(_ => '')
            );
        this.yGridMinor.selectAll('.domain').remove();


        // Not enough space => shorten labels
        const smallXAxis = this.chartSize.width < 550;

        this.xAxis
            .attr('transform', `translate(0, ${this.chartSize.height - coords.margin.bottom})`)
            .call(
                d3
                    .axisBottom<Date>(coords.xScale)
                    .ticks(d3.timeMonday)
                    .tickSize(-5)
                    .tickSizeOuter(0)
                    .tickPadding(5)
                    .tickFormat(date => smallXAxis ? '' : date.toLocaleString('default', {
                        day: 'numeric',
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
                .tickPadding(smallXAxis ? 5 : 15)
                .tickFormat(date => date.toLocaleString('default', {
                    month: smallXAxis ? 'short' : 'long',
                }))
            );

        this.xGrid.selectAll('.domain').remove();

        // Month labels alignment
        this.xGrid
            .selectAll('text')
            .attr('dx', 5)
            .attr('text-anchor', 'start');

        // y label
        this.yAxis
            .selectAll('text.axis-label')
            .data([this.config.yAxisLabel])
            .join('text')
            .classed('axis-label', true)
            .attr('x', 35)
            .attr('y', 15)
            .attr('dx', 0)
            .attr('dy', 0)
            .attr('fill', 'black')
            .attr('text-anchor', 'start')
            .attr('font-weight', 'bold')
            .text(d => d);

    }

    private renderLegend(series: DataSeries[]): void {
        const labeledSeries = series.filter(s => !!s.label);
        const padding = 10;

        // legend in general (position, visibility)
        this.legend
            .attr('transform', 'translate(35, 35)')
            .attr('opacity', labeledSeries.length > 0 ? 1 : 0);

        // 0.5 movements are to make sure that the border lies exactly on a pixel and can be rendered nicely

        // background box
        this.legend
            .selectAll('rect.legend-background')
            .data([0])
            .join('rect')
            .classed('legend-background', true)
            .attr('x', -0.5)
            .attr('y', -0.5)
            .attr('width', 200)
            .attr('height', labeledSeries.length * 20 + padding + padding - 8)
            .attr('rx', 3)
            .attr('fill', 'white')
            .attr('stroke', '#777')
            .attr('stroke-width', 1);

        let maxTextWidth = -1;
        // legend entries
        this.legend
            .selectAll('g.legend-entry')
            .data(labeledSeries)
            .join(enter => {
                const lGroup = enter.append('g');
                lGroup
                    .classed('legend-entry', true)
                    .attr('transform', (d, i) => `translate(${padding}, ${i * 20 + padding})`);
                lGroup
                    .append('rect')
                    .attr('x', d => d.fillOpacity === 0 ? 0 : -0.5)
                    .attr('y', d => d.fillOpacity === 0 ? 0 : -0.5)
                    .attr('width', d => d.fillOpacity === 0 ? 9 : 10)
                    .attr('height', d => d.fillOpacity === 0 ? 9 : 10)
                    .attr('fill', d => d.fillColor)
                    .attr('stroke', d => d.strokeColor)
                    .attr('stroke-width', d => d.fillOpacity === 0 ? 2 : 1)
                    .attr('fill-opacity', d => d.fillOpacity ?? this.config.fillOpacity);
                // todo set font size etc
                const textEls = lGroup
                    .append('text')
                    .attr('x', 15)
                    .attr('y', 10)
                    .attr('fill', 'black')
                    .attr('font-size', '14')
                    .text(d => d.label).nodes();
                for (const el of textEls) {
                    maxTextWidth = Math.max(maxTextWidth, el.getBBox().width + 15);
                }
                return lGroup;
            }, update => {
                update.select('rect')
                    .attr('fill', d => d.fillColor)
                    .attr('stroke', d => d.strokeColor);
                const textEls = update.select('text')
                    .text(d => d.label).nodes();
                for (const el of textEls) {
                    // @ts-ignore
                    maxTextWidth = Math.max(maxTextWidth, el.getBBox().width + 15);
                }
                return update;
            }, exit => {
                exit.remove();
            });
        if (maxTextWidth > 0) {
            this.legend
                .selectAll('rect.legend-background')
                .attr('width', maxTextWidth + padding * 2);
        }
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
            .join(enter => {
                // group with rect behind a text
                const g = enter.append('g');
                const rect = g.append('rect');
                const text = g.append('text');
                let bBoxes = [];
                // create labels and save their bounding boxes
                text
                    .attr('x', coords.rightBarX)
                    .attr('y', p => coords.yScale((p.max + p.min) / 2))
                    .attr('dy', '0.3em')
                    .attr('dx', coords.rightBarWidth / 2 - 3)
                    .attr('text-anchor', 'end')
                    .text(p => p.max - p.min > 5 ? p.label : '')
                    .call(textSelection => {
                        // save bounding boxes for rects
                        bBoxes = textSelection.nodes().map(textNode => textNode.getBBox());
                    });
                // position label backgrounds
                rect
                    .attr('x', (d, i) => bBoxes[i].x - 3)
                    .attr('y', (d, i) => bBoxes[i].y)
                    .attr('width', (d, i) => bBoxes[i].width + 6)
                    .attr('height', (d, i) => bBoxes[i].height)
                    .style('fill', 'white')
                    .attr('opacity', 0.8)
                    .attr('rx', 2)
                    .attr('ry', 2);
                return g;
            });

        // No gap => draw line instead
        if (mappedParts.length && coords.rightBarGap <= 0) {
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
                {...s.data[0], value: minValue},
                ...s.data,
                {...s.data[s.data.length - 1], value: minValue},
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
                label: p.label
            });
            min = max;
        }
        return result;
    }

}
