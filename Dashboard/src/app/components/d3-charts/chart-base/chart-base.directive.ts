import {
    AfterViewInit,
    Directive,
    ElementRef,
    Input,
    NgZone,
    OnDestroy,
    ViewChild,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as d3 from 'd3';

import { ResizeEvent, responsiveSvg } from './resize-utils';


/**
 * Base class for responsive D3 charts.
 * Contains some reusable logic and Angular boilerplate code.
 *
 * If you override ngAfterViewInit or ngOnDestroy in the subclass,
 * make sure to call the original functions in the parent class (this one).
 */
@Directive({ selector: 'chart-base' })
export abstract class ChartBase<ChartConfig extends object, ChartData>
    implements AfterViewInit, OnDestroy {
    @ViewChild('chartContainer') chartContainerRef: ElementRef<HTMLElement> | undefined;

    // generic config

    @Input() set config(newConfig: ChartConfig) {
        this._config = { ...this._config, ...newConfig };
        this.internalUpdate();
    }
    get config(): ChartConfig {
        return this._config;
    }
    private _config: ChartConfig = this.initialChartConfig();

    // generic data

    @Input() set data(d: ChartData | undefined) {
        this._data = d;
        this.internalUpdate();
    }
    get data(): ChartData | undefined {
        return this._data;
    }
    private _data: ChartData | undefined;

    // utilities

    protected updateTransitionDuration: number = 750;
    protected destroyed$: Subject<void> = new Subject();
    protected chartSize: ResizeEvent | null = null;
    protected svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;

    constructor(protected ngZone: NgZone) {}

    /**
     * Subclasses define the initial chart config in this function.
     */
    abstract initialChartConfig(): ChartConfig;

    /**
     * Subclasses update the chart with this function.
     * Update is triggered every time when the chart size, the data or the config change.
     * The following properties are initialized: this.svg, this.chartSize, this.data, this.config
     */
    abstract updateChart(): void;

    /**
     * Subclasses can optionally override this function to initialize the SVG chart.
     * The following properties are initialized: this.svg, this.config
     */
    initializeChart(): void {}

    /**
     * Subclasses can optionally override this function to do some cleanup before the SVG is automatically destroyed.
     * The following properties are initialized: this.svg, this.config
     */
    destroyChart(): void {}

    ngAfterViewInit(): void {
        if (!this.chartContainerRef) {
            throw new Error('Chart container reference is not defined');
        }
        this.svg = d3.select(this.chartContainerRef.nativeElement).append('svg');
        this.initializeChart();
        responsiveSvg(this.chartContainerRef.nativeElement, this.svg, this.ngZone)
            .pipe(takeUntil(this.destroyed$))
            .subscribe((newSize) => {
                this.chartSize = newSize;
                this.internalUpdate();
            });
    }

    ngOnDestroy(): void {
        this.destroyChart();
        if (this.chartContainerRef) {
            d3.select(this.chartContainerRef.nativeElement).select('svg').remove();
        }
        this.destroyed$.next();
        this.destroyed$.complete();
    }

    private internalUpdate() {
        if (!this.svg || !this.chartSize || !this.data) {
            return;
        }
        this.updateChart();
    }
}
