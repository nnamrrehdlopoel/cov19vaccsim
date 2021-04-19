import {Component, OnInit} from '@angular/core';
import {DataPoint, DataSeries, DummyChartData} from '../../components/d3-charts/dummy-chart.component';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {CsvexportService} from '../../services/csvexport.service';
import {YearWeek} from '../../services/calendarweek.service';
import * as cw from '../../services/calendarweek.service';
import * as d3 from 'd3';
import * as wu from 'wu';
import {
    DeliveriesData,
    PopulationData,
    VaccinationsData,
    ZislabImpfsimlieferungenDataRow
} from '../../simulation/data-interfaces';

@Component({
    selector: 'app-playground-page',
    templateUrl: './playground-page.component.html',
    styleUrls: ['./playground-page.component.scss']
})
export class PlaygroundPageComponent implements OnInit {

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private csv: CsvexportService) {

        for (const v of Object.keys(this.vaccineNames)) {
            this.vaccineNameTranslationTable.set(v, v);
            for (const name of this.vaccineNames[v]) {
                this.vaccineNameTranslationTable.set(name, v);
            }
        }
    }

    lastRefreshVaccinations: Date;
    lastRefreshDeliveries: Date;
    lastRefreshCapacity: Date;

    vaccineNames = {
        biontech: [
            'comirnaty',
            'BNT/Pfizer'
        ],
        moderna: [
            'Moderna'
        ],
        az: [
            'AZ',
            'astra',
            'astrazeneca'
        ],
        'j&j': [
            'J&J',
            'janssen'
        ],
        curevac: [
            'Curevac'
        ],
        sanofi: [
            'Sanofi/GSK'
        ]
    };
    vaccineNameTranslationTable: Map<string, string> = new Map([]);


    zislabImpfsimVerteilungszenarien = ['Gleichverteilung', 'Linearer Anstieg der Produktion in Q2'];

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
    vaccinations: d3.DSVParsedArray<VaccinationsData>;
    deliveries: d3.DSVParsedArray<DeliveriesData>;
    zislabImpfsimLieferungenData: ZislabImpfsimlieferungenDataRow[];
    weeklyVaccinations: WeeklyVaccinationData = new Map();
    plannedDeliveries: WeeklyDeliveryData = new Map();
    weeklyDeliveriesScenario: WeeklyDeliveryData = new Map();
    population: PopulationData;
    priorities: any;
    vaccineUsage: any;
    vaccinationWillingness: any;
    simulationStartWeek: YearWeek = cw.yws([2021, 1]);

    simulationResults: ISimulationResults;



    params = {
        considerContraindicated: true,
        considerNotWilling: true,
        liefermenge: 1,
        verteilungszenario: this.zislabImpfsimVerteilungszenarien[1],
        ruecklage: false,
        addweekstoabstand: 0,
        impfstoffart: 'alle',
        anteil_impfbereit: 0.80,
    };

    ngOnInit(): void {
        window.scrollTo(0, 0);
        this.loadData();
    }


    buildChart1(): void {
        const newData: DummyChartData = {
            yMin: 0,
            yMax: 10000000,
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


        if (this.population){
            newData.yMax = this.population.data.total;
        }

        if (this.vaccinations) {
            for (const vacDay of this.vaccinations) {
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
            let dataAttach = this.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek));
            // If Sim start is the current week, attach line directly to week in progress
            if (this.simulationStartWeek === cw.getYearWeekOfDate(this.lastRefreshVaccinations)){
                date = this.lastRefreshVaccinations;
                dataAttach = this.weeklyVaccinations.get(this.simulationStartWeek);
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

    loadData(): void {
        this.http.get('https://impfdashboard.de/static/data/germany_vaccinations_timeseries_v2.tsv', {responseType: 'text'})
            .subscribe(data => {
                this.vaccinations = d3.tsvParse<VaccinationsData, string>(data, d3.autoType);
                this.lastRefreshVaccinations = this.vaccinations[this.vaccinations.length - 1].date;
                this.simulationStartWeek = cw.getYearWeekOfDate(this.lastRefreshVaccinations);
                // TODO: update chart?
                console.log(this.vaccinations, 'Impfdashboard.de Vaccinations Data');
                this.calculateWeeklyVaccinations();
            });
        this.http.get('https://impfdashboard.de/static/data/germany_deliveries_timeseries_v2.tsv', {responseType: 'text'})
            .subscribe(data => {
                this.deliveries = d3.tsvParse<DeliveriesData, string>(data, d3.autoType);
                this.lastRefreshDeliveries = this.deliveries[this.deliveries.length - 1].date;
                console.log(this.deliveries, 'Impfdashboard.de Deliveries Data');
                this.calculateWeeklyDeliveries();
            });
        this.http.get('data/cosmo-impfbereitschaft.json')
            .subscribe(data => {
                this.vaccinationWillingness = data;
                console.log(this.vaccinationWillingness, 'Vaccination Willingness Data');
                this.runSimulation();
            });
        this.http.get<PopulationData>('data/population_deutschland_2019.json')
            .subscribe(data => {
                this.population = data;
                console.log(this.population, 'Population Data');
                this.runSimulation();
            });
        this.http.get('data/prioritaetsgruppen_deutschland.json')
            .subscribe(data => {
                this.priorities = data;
                console.log(this.priorities, 'Priority Data');
                this.runSimulation();
            });
        this.http.get('data/impfstoffeinsatz_deutschland.json')
            .subscribe(data => {
                this.vaccineUsage = data;
                console.log(this.vaccineUsage, 'Vaccine Usage Data');
                this.runSimulation();
            });
        this.http.get<ZislabImpfsimlieferungenDataRow[]>('https://raw.githubusercontent.com/zidatalab/covid19dashboard/master/data/tabledata/impfsim_lieferungen.json')
            .subscribe(data => {
                this.zislabImpfsimLieferungenData = data;
                console.log(this.zislabImpfsimLieferungenData, 'ZisLab Vaccine Delivery Data');
                this.extractDeliveriesInfo();
            });
    }


    extractDeliveriesInfo(): void {
        const transformedData: WeeklyDeliveryData = new Map();
        for (const row of this.zislabImpfsimLieferungenData){
            if (row.Verteilungsszenario === this.params.verteilungszenario && row.Bundesland === 'Gesamt') {
                const vName = this.normalizeVaccineName(row.hersteller);
                const yWeek: YearWeek = cw.yws([2021, row.kw]);

                // tslint:disable-next-line:no-unused-expression
                transformedData.has(yWeek) || transformedData.set(yWeek, new Map());
                const r = transformedData.get(yWeek);
                r.set(vName, (r.get(vName) || 0) + row.dosen_kw);
            }
        }

        this.plannedDeliveries = transformedData;
        console.log(this.plannedDeliveries, 'Vaccine Delivery Plan Data');
        this.calculateWeeklyDeliveries();
    }

    calculateWeeklyDeliveries(): void {
        const deliveries: WeeklyDeliveryData = new Map();

        // accumulate historical deliveries
        if (this.deliveries) {
            for (const delivery of this.deliveries) {
                const yWeek = cw.getYearWeekOfDate(delivery.date);
                const vName = this.normalizeVaccineName(delivery.impfstoff);

                // tslint:disable-next-line:no-unused-expression
                deliveries.has(yWeek) || deliveries.set(yWeek, new Map());
                const r = deliveries.get(yWeek);
                r.set(vName, (r.get(vName) || 0) + delivery.dosen);
            }
        }

        // merge planned deliveries into array without overwriting
        for (const [yWeek, data] of this.plannedDeliveries.entries()){
            if (!deliveries.has(yWeek)){
                deliveries.set(yWeek, data);
            }
        }

        this.weeklyDeliveriesScenario = deliveries;
        console.log(this.weeklyDeliveriesScenario, 'Weekly Vaccine Delivery Scenario Data');
        this.runSimulation();
    }

    calculateWeeklyVaccinations(): void {
        const weeklyVacc: WeeklyVaccinationData = new Map();

        // accumulate historical deliveries

        let lastWeek: IVaccinationWeek;
        let currWeek: IVaccinationWeek = {
            vaccineDoses: 0,
            partiallyImmunized: 0,
            fullyImmunized: 0,
            cumVaccineDoses: 0,
            cumPartiallyImmunized: 0,
            cumFullyImmunized: 0,
            dosesByVaccine: new Map(),
            cumDosesByVaccine: new Map()
        };

        if (this.vaccinations) {
            // assumes vaccinations are ordered
            for (const vaccDay of this.vaccinations) {
                const yWeek = cw.getYearWeekOfDate(vaccDay.date);

                // new week has started => calculate differences
                if (!weeklyVacc.has(yWeek)){
                    if (lastWeek) {
                        currWeek.vaccineDoses = currWeek.cumVaccineDoses - lastWeek.cumVaccineDoses;
                        currWeek.partiallyImmunized = currWeek.cumPartiallyImmunized - lastWeek.cumPartiallyImmunized;
                        currWeek.fullyImmunized = currWeek.cumFullyImmunized - lastWeek.cumFullyImmunized;
                        for (const [vacc, doses] of currWeek.cumDosesByVaccine.entries()){
                            currWeek.dosesByVaccine.set(vacc, doses - (lastWeek.cumDosesByVaccine.get(vacc) || 0));
                        }
                    }
                    const newWeek = {
                        vaccineDoses: 0,
                        partiallyImmunized: 0,
                        fullyImmunized: 0,
                        cumVaccineDoses: currWeek.cumVaccineDoses,
                        cumPartiallyImmunized: currWeek.cumPartiallyImmunized,
                        cumFullyImmunized: currWeek.cumFullyImmunized,
                        dosesByVaccine: new Map(),
                        cumDosesByVaccine: new Map(currWeek.cumDosesByVaccine)
                    };
                    lastWeek = currWeek;
                    currWeek = newWeek;
                    weeklyVacc.set(yWeek, newWeek);
                }

                // Set values in current week from array
                const weekData = weeklyVacc.get(yWeek);

                weekData.cumFullyImmunized = Math.max(weekData.cumFullyImmunized, vaccDay.personen_voll_kumulativ);
                weekData.cumPartiallyImmunized = Math.max(weekData.cumFullyImmunized, vaccDay.personen_erst_kumulativ);
                weekData.cumVaccineDoses = Math.max(weekData.cumFullyImmunized, vaccDay.dosen_kumulativ);

                weekData.cumDosesByVaccine.set(this.normalizeVaccineName('biontech'), vaccDay.dosen_biontech_kumulativ);
                weekData.cumDosesByVaccine.set(this.normalizeVaccineName('astrazeneca'), vaccDay.dosen_astrazeneca_kumulativ);
                weekData.cumDosesByVaccine.set(this.normalizeVaccineName('moderna'), vaccDay.dosen_moderna_kumulativ);
            }
        }

        this.weeklyVaccinations = weeklyVacc;
        console.log(this.weeklyVaccinations, 'Weekly Vaccination Data');
        this.runSimulation();
    }

    normalizeVaccineName(name: string): string {
        if (this.vaccineNameTranslationTable.has(name)){
            return this.vaccineNameTranslationTable.get(name);
        }
        console.warn('Unknown Vaccine Name!', name);
        return name;
    }

    runSimulation(): void {
        if (!this.vaccinations
            || !this.vaccinationWillingness
            || !this.vaccineUsage
            || !this.deliveries
            || this.plannedDeliveries.size === 0
            || this.weeklyDeliveriesScenario.size === 0) {
            console.warn('Cannot run simulation, some data is still missing');
            this.buildChart1();
            return;
        }
        console.log('### Running simulation ###');

        // Anfang: Berechnung der aktuellen Lagerbestände
        // (Nicht in der ersten banalen Version)

        let curWeek = this.simulationStartWeek;

        const results: ISimulationResults = {
            weeklyData: new Map()
        };

        const that = this;
        function getPartiallyImmunizedForWeek(week: YearWeek): number {
            if (week < that.simulationStartWeek){
                const data = that.weeklyVaccinations.get(week);
                return data ? data.partiallyImmunized : 0;
            }
            return results.weeklyData.get(week).partiallyImmunized;
        }

        const dataBeforeSim = this.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek));
        let cumPartiallyImmunized = dataBeforeSim.cumPartiallyImmunized;
        let cumFullyImmunized = dataBeforeSim.cumFullyImmunized;
        let cumVaccineDoses = dataBeforeSim.cumVaccineDoses;

        const sum = (x: number, y: number): number => x + y;
        const vaccineDeliveryDelayWeeks = 1;

        const cumulativeDeliveredVaccines = wu(this.weeklyDeliveriesScenario.entries())
            .filter(x => x[0] < cw.weekBefore(this.simulationStartWeek, vaccineDeliveryDelayWeeks))
            .map(x => wu(x[1].values()).reduce(sum))
            .reduce(sum);

        let vaccineStockPile = cumulativeDeliveredVaccines - dataBeforeSim.cumVaccineDoses;

        // Should be long enough
        const waitingFor2ndDose: number[] = new Array(100).fill(0);

        {
            // Distribute people that didn't get their 2nd shot yet onto the waiting list
            let pplNeeding2ndShot = dataBeforeSim.cumPartiallyImmunized - dataBeforeSim.cumFullyImmunized;
            console.log('People still needing 2nd shots', pplNeeding2ndShot);


            // Forward distribution approach
            let i = 0;
            while (pplNeeding2ndShot > 0 && i < 10) {
                const ppl6Weeks = i < 6 ?
                    this.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek,
                        6 - i)).partiallyImmunized : 0;
                const ppl10Weeks = i < 10 ?
                    this.weeklyVaccinations.get(cw.weekBefore(this.simulationStartWeek,
                        10 - i)).partiallyImmunized : 0;
                let ppl = ppl6Weeks * 0.6 + ppl10Weeks * 0.4;
                ppl = Math.min(pplNeeding2ndShot, ppl);
                waitingFor2ndDose[i] = ppl;
                pplNeeding2ndShot -= ppl;
                i++;
            }
            /* */

            /*
            // Backward distribution approach
            let wlWeek = this.weekBefore(this.simulationStartWeek);
            let i = 0;
            while (pplNeeding2ndShot > 0 && i < 6) {
                const ppl = Math.min(pplNeeding2ndShot,
                    this.weeklyVaccinations.get(wlWeek).partiallyImmunized);
                const pplSplit = Math.floor(ppl * 0.7);
                waitingFor2ndDose[5 - i] += pplSplit;
                waitingFor2ndDose[10 - i] += ppl - pplSplit;
                pplNeeding2ndShot -= ppl;
                i++;
                wlWeek = this.weekBefore(wlWeek);
            }
            /* */

            if (pplNeeding2ndShot > 0) {
                console.log('8 weeks not enough...', pplNeeding2ndShot);
                waitingFor2ndDose[0] += pplNeeding2ndShot;
            }
            console.log([...waitingFor2ndDose], 'waiting list at beginning of sim', waitingFor2ndDose.reduce(sum), pplNeeding2ndShot);
        }

        const numContraindicated = wu(Object.entries(this.population.data.by_age))
            .filter(x => parseInt(x[0], 10) < 18)
            .map(x => x[1])
            .reduce(sum);
        console.log('Contraindicated', numContraindicated);

        console.log('Vaccine Stockpile at beginning of sim', vaccineStockPile);
        // Simulate
        while (cw.ywt(curWeek)[0] < 2021 || cw.ywt(curWeek)[1] < 40){
            const delayedDeliveryData = this.weeklyDeliveriesScenario.get(cw.weekBefore(curWeek, vaccineDeliveryDelayWeeks));

            if (!delayedDeliveryData){
                console.warn('dafuq', cw.weekBefore(curWeek, vaccineDeliveryDelayWeeks));
            }

            // Add delayed delivery to available vaccines
            vaccineStockPile += wu(delayedDeliveryData.values()).reduce(sum) * this.params.liefermenge;

            // Give as many 2nd shots as needed
            const required2ndShots = waitingFor2ndDose.shift();
            const given2ndShots = Math.min(vaccineStockPile, required2ndShots);
            waitingFor2ndDose[0] += required2ndShots - given2ndShots; // push to next week if not enough vaccine available
            vaccineStockPile -= given2ndShots;

            /*console.log(this.population.data.total, this.params.anteil_impfbereit, cumPartiallyImmunized,
                (this.population.data.total * this.params.anteil_impfbereit),
                (this.population.data.total * this.params.anteil_impfbereit) - cumPartiallyImmunized,
                vaccineStockPile);*/

            // Give as many 1st shots as people or doses available
            let availablePeople = this.population.data.total;
            if (this.params.considerContraindicated) {
                availablePeople -= numContraindicated;
            }
            if (this.params.considerNotWilling) {
                availablePeople *= this.params.anteil_impfbereit;
            }
            availablePeople -= cumPartiallyImmunized;
            let availableVaccineStockPile = vaccineStockPile;
            if (this.params.ruecklage){
                availableVaccineStockPile -= waitingFor2ndDose.reduce(sum);
            }
            const given1stShots = Math.max(0, Math.min(availableVaccineStockPile, availablePeople));
            vaccineStockPile -= given1stShots;

            // 2st shots go on waiting list to get their 2nd in a few weeks
            const pplSplit = Math.floor(given1stShots * 0.7);
            waitingFor2ndDose[5 + this.params.addweekstoabstand] += pplSplit;
            waitingFor2ndDose[10 + this.params.addweekstoabstand] += given1stShots - pplSplit;

            cumPartiallyImmunized += given1stShots;
            cumFullyImmunized += given2ndShots;
            cumVaccineDoses += given1stShots + given2ndShots;

            const weekData: IVaccinationWeek = {
                vaccineDoses: given2ndShots + given1stShots,
                partiallyImmunized: given1stShots,
                fullyImmunized: given2ndShots,
                cumVaccineDoses,
                cumPartiallyImmunized,
                cumFullyImmunized,
            };
            results.weeklyData.set(curWeek, weekData);

            curWeek = cw.weekAfter(curWeek);
        }

        this.simulationResults = results;
        console.log(this.simulationResults, 'Simulation Results');
        this.buildChart1();
    }
}


interface ISimulationResults {
    weeklyData: Map<YearWeek, IVaccinationWeek>;
}

type WeeklyVaccinationData = Map<YearWeek, IVaccinationWeek>;
interface IVaccinationWeek {
    vaccineDoses: number;
    partiallyImmunized: number;
    fullyImmunized: number;
    cumVaccineDoses: number;
    cumPartiallyImmunized: number;
    cumFullyImmunized: number;
    dosesByVaccine?: Map<string, number>;
    cumDosesByVaccine?: Map<string, number>;
}

type WeeklyDeliveryData = Map<YearWeek, Map<string, number>>;
