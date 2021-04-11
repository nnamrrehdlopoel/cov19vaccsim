import { Component } from '@angular/core';
import { DummyChartData } from '../../components/d3-charts/dummy-chart.component';

@Component({
    selector: 'app-playground-page',
    templateUrl: './playground-page.component.html',
    styleUrls: ['./playground-page.component.scss']
})
export class PlaygroundPageComponent {
    data: DummyChartData = {
        vacData: [1, 2, 3, 4, 1, 2, 5, 2, 3, 4],
        vacStart: new Date(2021, 0, 1),
    };
}
