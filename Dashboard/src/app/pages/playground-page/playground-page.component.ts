import {Component, OnInit} from '@angular/core';
import {DataPoint, DataSeries, DummyChartData} from '../../components/d3-charts/dummy-chart.component';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {CsvexportService} from '../../services/csvexport.service';
import {getWeekdayInYearWeek, getYearWeekOfDate, YearWeek} from '../../simulation/calendarweek/calendarweek';
import * as cw from '../../simulation/calendarweek/calendarweek';
import * as d3 from 'd3';
import * as wu from 'wu';
import {
    DeliveriesData,
    PopulationData,
    VaccinationsData,
    ZilabImpfsimlieferungenDataRow, zilabImpfsimVerteilungszenarien
} from '../../simulation/data-interfaces/raw-data.interfaces';
import {DataloaderService} from '../../services/dataloader.service';
import {ISimulationResults} from '../../simulation/data-interfaces/simulation-data.interfaces';
import {BasicSimulation} from '../../simulation/simulation';
import {KeyValue} from "@angular/common";
import {sum} from "../../simulation/vaccine-map-helper";

@Component({
    selector: 'app-playground-page',
    templateUrl: './playground-page.component.html',
    styleUrls: ['./playground-page.component.scss']
})
export class PlaygroundPageComponent implements OnInit {

    constructor(
        private http: HttpClient,
        public dataloader: DataloaderService,
        private route: ActivatedRoute,
        private csv: CsvexportService) {
    }

    simulation = new BasicSimulation(this.dataloader);

    populationPartitionPalette = [
        '#a2d9ac',
        '#69b164',
        '#468b43',
        '#186a10',
        '#12520d',
        '#0c3d07',
    ];
    populationPartitionPaletteLarge = [
        '#e9fcec',
        '#c2eac8',
        ...this.populationPartitionPalette,
        '#0a2f05',
        '#061d02',
    ];
    populationPartitionSpecialColors = {
        unwilling: '#ddd',
        contraindicated: '#aaa',
    };

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
    data2: DummyChartData = this.data;
    data3: DummyChartData = this.data;
    simulationStartWeek: YearWeek = cw.yws([2021, 5]);
    availableDeliveryScenarios = zilabImpfsimVerteilungszenarien;

    displayPartitioning = Object.keys(this.simulation.partitionings)[0];

    simulationResults: ISimulationResults;

    ngOnInit(): void {
        window.scrollTo(0, 0);
        this.dataloader.loadData().subscribe(value => {
            this.simulation.prepareData();
            this.simulationStartWeek = getYearWeekOfDate(this.dataloader.lastRefreshVaccinations);
            this.simulation.params.fractionWilling = 1 - this.simulation.willingness.getUnwillingFraction();
            this.runSimulation();
        });
    }

    runSimulation(): void {
        this.simulation.simulationStartWeek = this.simulationStartWeek;
        this.simulationResults = this.simulation.runSimulation();
        this.buildChart1();
        this.buildChart2()
        this.buildChart3()
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
            legendLabel: 'vacAtLeastOnce'
        };
        const vacFully: DataSeries = {
            data: [],
            fillColor: '#2d876a',
            strokeColor: '#265538',
            legendLabel: 'vacFully'
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

            const parts = [];
            let colorI = 0;
            const partitions = this.simulation.partitionings[this.displayPartitioning].partitions;
            const palette = partitions.filter(p => !(p.id in this.populationPartitionSpecialColors)).length > this.populationPartitionPalette.length ?
                this.populationPartitionPaletteLarge
                : this.populationPartitionPalette;
            for (const p of partitions) {
                let c;
                if (p.id in this.populationPartitionSpecialColors){
                    c = this.populationPartitionSpecialColors[p.id];
                }
                else{
                    c = palette[colorI++];
                }
                parts.unshift({
                    title: p.description,
                    size: p.size,
                    fillColor: c
                });
            }
            newData.partitions = parts;
        }

        newData.series = [
            vacFully,
            vacAtLeastOnce,
            vacFullySim,
            vacAtLeastOnceSim
        ];

        this.data = newData;
    }


    buildChart2(): void {
        const newData: DummyChartData = {
            yMin: 0,
            yMax: 10_000_000,
            series: [],
            partitions: [],
        };

        const vacDeliveries: DataSeries = {
            data: [],
            fillColor: '#b8ad69',
            strokeColor: '#827a46',
        };
        const vacDeliveriesSim: DataSeries = {
            data: [],
            fillColor: '#b8ad69',
            strokeColor: '#827a46',
            strokeDasharray: '5, 5'
        };
        const vacFirstDoses: DataSeries = {
            data: [],
            fillColor: '#69b8b4',
            strokeColor: '#46827f',
        };
        const vacSecondDoses: DataSeries = {
            data: [],
            fillColor: '#2d876a',
            strokeColor: '#265538',
        };
        const vacFirstDosesSim: DataSeries = {
            data: [],
            fillColor: '#69b8b4',
            strokeColor: '#46827f',
            strokeDasharray: '5, 5'
        };
        const vacSecondDosesSim: DataSeries = {
            data: [],
            fillColor: '#2d876a',
            strokeColor: '#265538',
            strokeDasharray: '5, 5'
        };

        /*if (this.dataloader.vaccinations) {
            for (const vacDay of this.dataloader.vaccinations) {
                vacFirstDoses.data.push({
                    date: vacDay.date,
                    value: vacDay.dosen_erst_differenz_zum_vortag * 7
                });
                vacSecondDoses.data.push({
                    date: vacDay.date,
                    value: vacDay.dosen_zweit_differenz_zum_vortag * 7
                });
            }
        }*/
        if (this.simulation.weeklyDeliveries) {
            for (const [week, del] of this.simulation.weeklyDeliveries.entries()) {
                vacDeliveries.data.push({
                    date: getWeekdayInYearWeek(week, 8),
                    value: wu(del.dosesByVaccine.values()).reduce(sum)
                });
            }
        }
        if (this.simulation.weeklyVaccinations) {
            for (const [yWeek, data] of this.simulation.weeklyVaccinations.entries()) {
                const date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacFirstDoses.data.push({
                    date,
                    value: data.partiallyImmunized
                });
                vacSecondDoses.data.push({
                    date,
                    value: data.vaccineDoses
                });
            }
            // remove last week because it is not complete yet
            vacFirstDoses.data.pop();
            vacSecondDoses.data.pop();
        }

        if (this.simulationResults) {
            // Attach line to week before
            let date = cw.getWeekdayInYearWeek(this.simulationStartWeek, 1);
            let dataAttach = this.simulation.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek));
            vacFirstDosesSim.data.push({
                date,
                value: dataAttach.partiallyImmunized
            });
            vacSecondDosesSim.data.push({
                date,
                value: dataAttach.vaccineDoses
            });
            vacDeliveriesSim.data.push({
                date,
                value: wu(this.simulation.weeklyDeliveries.get(cw.weekBefore(this.simulationStartWeek)).dosesByVaccine.values()).reduce(sum)
            });
            for (const [yWeek, data] of this.simulationResults.weeklyData.entries()) {
                // Plotpunkt immer am Montag nach der Woche, also wenn Woche vorbei
                date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacFirstDosesSim.data.push({
                    date,
                    value: data.partiallyImmunized
                });
                vacSecondDosesSim.data.push({
                    date,
                    value: data.vaccineDoses
                });
                vacDeliveriesSim.data.push({
                    date,
                    value: wu(this.simulation.weeklyDeliveriesScenario.get(yWeek).dosesByVaccine.values()).reduce(sum)
                });
            }
        }


        newData.series = [
            vacDeliveries,
            vacDeliveriesSim,
            vacSecondDoses,
            vacFirstDoses,
            vacSecondDosesSim,
            vacFirstDosesSim,
        ];

        this.data2 = newData;
    }

    buildChart3(): void {
        const newData: DummyChartData = {
            yMin: 0,
            yMax: this.dataloader.population ? this.dataloader.population.data.total * 2 : 10000000,
            series: [],
            partitions: [],
        };

        const vacDeliveries: DataSeries = {
            data: [],
            fillColor: '#b8ad69',
            strokeColor: '#827a46',
        };
        const vacDoses: DataSeries = {
            data: [],
            fillColor: '#2d876a',
            strokeColor: '#265538',
        };
        const vacDeliveriesSim: DataSeries = {
            data: [],
            fillColor: '#b8ad69',
            strokeColor: '#827a46',
            strokeDasharray: '5, 5'
        };
        const vacDosesSim: DataSeries = {
            data: [],
            fillColor: '#2d876a',
            strokeColor: '#265538',
            strokeDasharray: '5, 5'
        };

        if (this.simulation.weeklyDeliveries) {
            for (const [week, del] of this.simulation.weeklyDeliveries.entries()) {
                vacDeliveries.data.push({
                    date: getWeekdayInYearWeek(week, 8),
                    value: wu(del.cumDosesByVaccine.values()).reduce(sum)
                });
            }
        }
        if (this.dataloader.vaccinations) {
            for (const vacDay of this.dataloader.vaccinations) {
                vacDoses.data.push({
                    date: vacDay.date,
                    value: vacDay.dosen_kumulativ
                });
            }
        }

        if (this.simulationResults) {
            // Attach line to week before
            let date = cw.getWeekdayInYearWeek(this.simulationStartWeek, 1);
            const dateWeek = date;
            let dataAttach = this.simulation.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek));
            // If Sim start is the current week, attach line directly to week in progress
            if (this.simulationStartWeek === cw.getYearWeekOfDate(this.dataloader.lastRefreshVaccinations)){
                date = this.dataloader.lastRefreshVaccinations;
                dataAttach = this.simulation.weeklyVaccinations.get(this.simulationStartWeek);
            }
            vacDosesSim.data.push({
                date,
                value: dataAttach.cumVaccineDoses
            });
            vacDeliveriesSim.data.push({
                date: dateWeek,
                value: wu(this.simulation.weeklyDeliveries.get(cw.weekBefore(this.simulationStartWeek)).cumDosesByVaccine.values()).reduce(sum)
            });
            for (const [yWeek, data] of this.simulationResults.weeklyData.entries()) {
                // Plotpunkt immer am Montag nach der Woche, also wenn Woche vorbei
                date = cw.getWeekdayInYearWeek(yWeek, 8);
                vacDosesSim.data.push({
                    date,
                    value: data.cumVaccineDoses
                });
                vacDeliveriesSim.data.push({
                    date,
                    value: wu(this.simulation.weeklyDeliveriesScenario.get(yWeek).cumDosesByVaccine.values()).reduce(sum)
                });
            }
        }

        newData.series = [
            vacDeliveries,
            vacDeliveriesSim,
            vacDoses,
            vacDosesSim
        ];

        this.data3 = newData;
    }

    // Preserve original property order
    originalOrder = (a: KeyValue<any, any>, b: KeyValue<any, any>): number => {
        return 0;
    }

    resetWillingness(){
        this.simulation.params.fractionWilling = 1 - this.simulation.willingness.getUnwillingFraction();
        this.runSimulation();
    }
}
