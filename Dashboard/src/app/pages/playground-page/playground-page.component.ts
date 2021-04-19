import {Component, OnInit} from '@angular/core';
import {DataPoint, DataSeries, DummyChartData} from '../../components/d3-charts/dummy-chart.component';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {CsvexportService} from '../../services/csvexport.service';
import {getYearWeekOfDate, YearWeek} from '../../simulation/calendarweek/calendarweek';
import * as cw from '../../simulation/calendarweek/calendarweek';
import * as d3 from 'd3';
import * as wu from 'wu';
import {
    DeliveriesData,
    PopulationData,
    VaccinationsData,
    ZislabImpfsimlieferungenDataRow, zislabImpfsimVerteilungszenarien
} from '../../simulation/data-interfaces/raw-data.interfaces';
import {DataloaderService} from '../../services/dataloader.service';
import {ISimulationResults} from '../../simulation/data-interfaces/simulation-data.interfaces';
import {BasicSimulation} from '../../simulation/simulation';

@Component({
    selector: 'app-playground-page',
    templateUrl: './playground-page.component.html',
    styleUrls: ['./playground-page.component.scss']
})
export class PlaygroundPageComponent implements OnInit {

    constructor(
        private http: HttpClient,
        private dataloader: DataloaderService,
        private route: ActivatedRoute,
        private csv: CsvexportService) {
    }

    simulation = new BasicSimulation(this.dataloader);

    data: DummyChartData = {
        yMin: 0,
        yMax: 10,
        series: [
            // one series = one line + fill below
            {
                data: [
                    {value: 5, date: new Date(2021, 0, 1)},
                    {value: 6, date: new Date(2021, 0, 2)},
                    {value: 2, date: new Date(2021, 0, 3)},
                    {value: 7, date: new Date(2021, 0, 6)},
                ],
                fillColor: '#ff4848',
                strokeColor: '#ff0000',
            },
            {
                data: [
                    {value: 8, date: new Date(2021, 0, 4)},
                    {value: 4, date: new Date(2021, 0, 5)},
                    {value: 3, date: new Date(2021, 0, 6)},
                    {value: 5, date: new Date(2021, 0, 7)},
                ],
                fillColor: '#487cff',
                strokeColor: '#0000ff',
            },
            {
                data: [
                    {value: 3, date: new Date(2021, 0, 1)},
                    {value: 10, date: new Date(2021, 0, 5)},
                    {value: 3, date: new Date(2021, 0, 9)},
                ],
                fillColor: '#46bf3d',
                strokeColor: '#39a401',
                strokeDasharray: '5, 5'
            },
        ],
        partitions: []
    };
    simulationStartWeek: YearWeek = cw.yws([2021, 10]);
    availableDeliveryScenarios = zislabImpfsimVerteilungszenarien;

    simulationResults: ISimulationResults;

    ngOnInit(): void {
        window.scrollTo(0, 0);
        this.dataloader.loadData().subscribe(value => {
            this.simulationStartWeek = getYearWeekOfDate(this.dataloader.lastRefreshVaccinations);
            this.runSimulation();
        });
    }

    runSimulation(): void {
        this.simulation.simulationStartWeek = this.simulationStartWeek;
        this.simulationResults = this.simulation.runSimulation();
        this.buildChart1();
    }


    buildChart1(): void {
        const newData: DummyChartData = {
            yMin: 0,
            yMax: this.dataloader.population ? this.dataloader.population.data.total : 10000000,
            series: [],
            partitions: [
                { size: 10_000_000, fillColor: 'red' },
                { size: 20_000_000, fillColor: 'green' },
                { size: 35_000_000, fillColor: 'blue' },
            ],
        };

        const vacAtLeastOnce: DataSeries = {
            data: [],
            fillColor: '#69b8b4',
            strokeColor: '#46827f',
        };
        const vacFully: DataSeries = {
            data: [],
            fillColor: '#2d876a',
            strokeColor: '#265538',
        };
        const vacAtLeastOnceSim: DataSeries = {
            data: [],
            fillColor: '#69b8b4',
            strokeColor: '#46827f',
            strokeDasharray: '5, 5'
        };
        const vacFullySim: DataSeries = {
            data: [],
            fillColor: '#2d876a',
            strokeColor: '#265538',
            strokeDasharray: '5, 5'
        };

        if (this.dataloader.vaccinations) {
            for (const vacDay of this.dataloader.vaccinations) {
                vacAtLeastOnce.data.push({
                    date: vacDay.date,
                    value: vacDay.personen_erst_kumulativ
                });
                vacFully.data.push({
                    date: vacDay.date,
                    value: vacDay.personen_voll_kumulativ
                });
            }
        }

        if (this.simulationResults) {
            // Attach line to week before
            let date = cw.getWeekdayInYearWeek(this.simulationStartWeek, 1);
            let dataAttach = this.simulation.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek));
            // If Sim start is the current week, attach line directly to week in progress
            if (this.simulationStartWeek === cw.getYearWeekOfDate(this.dataloader.lastRefreshVaccinations)){
                date = this.dataloader.lastRefreshVaccinations;
                dataAttach = this.simulation.weeklyVaccinations.get(this.simulationStartWeek);
            }
            vacAtLeastOnceSim.data.push({
                date,
                value: dataAttach.cumPartiallyImmunized
            });
            vacFullySim.data.push({
                date,
                value: dataAttach.cumFullyImmunized
            });
            for (const [yWeek, data] of this.simulationResults.weeklyData.entries()) {
                // Plotpunkt immer am Montag nach der Woche, also wenn Woche vorbei
                date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacAtLeastOnceSim.data.push({
                    date,
                    value: data.cumPartiallyImmunized
                });
                vacFullySim.data.push({
                    date,
                    value: data.cumFullyImmunized
                });
            }
        }

        newData.series = [
            vacFully,
            vacAtLeastOnce,
            vacFullySim,
            vacAtLeastOnceSim
        ];

        this.data = newData;
    }
}
