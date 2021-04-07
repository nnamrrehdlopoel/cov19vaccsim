import { Component } from '@angular/core';
import { ChartBase } from './chart-base/chart-base.directive';

export interface DummyChartConfig {
    // nothing so far
}

export interface DummyChartDataElement {
    value: number
}

@Component({
    selector: 'app-dummy-chart',
    templateUrl: 'chart-base/chart-base.directive.html',
    styleUrls: ['chart-base/chart-base.directive.scss'],
})
export class DummyChartComponent extends ChartBase<DummyChartConfig, DummyChartDataElement[]> {

    initialChartConfig(): DummyChartConfig {
        return {};
    }

    initializeChart() {
    }

    updateChart(): void {
    }

}
