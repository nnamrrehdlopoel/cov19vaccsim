import {Component, OnInit} from '@angular/core';
import { DummyChartData } from '../../components/d3-charts/dummy-chart.component';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {CsvexportService} from '../../services/csvexport.service';
import * as d3 from 'd3';

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
            'astra'
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
    };
    vaccinations: d3.DSVParsedArray<VaccinationsData>;
    deliveries: d3.DSVParsedArray<DeliveriesData>;
    zislabImpfsimLieferungenData: ZislabImpfsimlieferungenDataRow[];
    plannedDeliveries: WeeklyDeliveryData = new Map();
    weeklyDeliveriesScenario: WeeklyDeliveryData = new Map();
    population: any;
    priorities: any;
    vaccineUsage: any;
    vaccinationWillingness: any;



    params = {
        liefermenge: 1,
        verteilungszenario: this.zislabImpfsimVerteilungszenarien[1],
        ruecklage: false,
        addweekstoabstand: 0,
        impfstoffart: 'alle',
        anteil_impfbereit: 0.66,
    };

    ngOnInit(): void {
        window.scrollTo(0, 0);
        this.loadData();
    }

    loadData(): void {
        this.http.get('https://impfdashboard.de/static/data/germany_vaccinations_timeseries_v2.tsv', {responseType: 'text'})
            .subscribe(data => {
                this.vaccinations = d3.tsvParse<VaccinationsData, string>(data, d3.autoType);
                // todo transform data into new format
                // this.data.vacStart = this.vaccinations[0].date;
                // this.data.vacData = this.vaccinations.map(x => x.dosen_kumulativ);
                this.lastRefreshVaccinations = this.vaccinations[this.vaccinations.length - 1].date;
                // TODO: update chart?
                console.log(this.vaccinations, 'Impfdashboard.de Vaccinations Data');
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
            });
        this.http.get('data/population_deutschland_2019.json')
            .subscribe(data => {
                this.population = data;
                console.log(this.population, 'Population Data');
            });
        this.http.get('data/prioritaetsgruppen_deutschland.json')
            .subscribe(data => {
                this.priorities = data;
                console.log(this.priorities, 'Priority Data');
            });
        this.http.get('data/impfstoffeinsatz_deutschland.json')
            .subscribe(data => {
                this.vaccineUsage = data;
                console.log(this.vaccineUsage, 'Vaccine Usage Data');
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
            if (row.Verteilungsszenario === this.params.verteilungszenario) {
                const vName = this.normalizeVaccineName(row.hersteller);
                const yWeek: YearWeek = [2021, row.kw];

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
                const yWeek = this.getWeekNumber(delivery.date);
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
        console.log(this.weeklyDeliveriesScenario, 'Weekly Vaccine Delivery Data');
        this.restartSimulation();
    }

    normalizeVaccineName(name: string): string {
        if (this.vaccineNameTranslationTable.has(name)){
            return this.vaccineNameTranslationTable.get(name);
        }
        console.warn('Unknown Vaccine Name!', name);
        return name;
    }

    restartSimulation(): void {

    }

    /**
     * Returns Year and Week in Year for a given date
     * Source: https://stackoverflow.com/a/6117889
     */
    getWeekNumber(d: Date): YearWeek {
        // Copy date so don't modify original
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        // Get first day of year
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        // Calculate full weeks to nearest Thursday
        // @ts-ignore
        const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1) / 7);
        // Return array of year and week number
        return [d.getUTCFullYear(), weekNo];
    }
}


interface ZislabImpfsimlieferungenDataRow {
    Bundesland: string;
    Verteilungsszenario: string;
    abstand: number;
    anwendungen: number;
    dosen_kw: number;
    dosen_verabreicht_erst: number;
    dosen_verabreicht_zweit: number;
    hersteller: string;
    kw: number;
    population: number;
    prioritaet: number;
    ruecklage: number;
    ueber18: number;
    warteschlange_zweit_kw: number;
    zugelassen: number;
}


interface VaccinationsData {
    date: Date;
    dosen_kumulativ: number;
    dosen_astrazeneca_kumulativ: number;
    dosen_biontech_kumulativ: number;
    dosen_differenz_zum_vortag: number;
    dosen_erst_differenz_zum_vortag: number;
    dosen_moderna_kumulativ: number;
    dosen_zweit_differenz_zum_vortag: number;
    impf_quote_erst: number;
    impf_quote_voll: number;
    indikation_alter_dosen: number;
    indikation_alter_erst: number;
    indikation_alter_voll: number;
    indikation_beruf_dosen: number;
    indikation_beruf_erst: number;
    indikation_beruf_voll: number;
    indikation_medizinisch_dosen: number;
    indikation_medizinisch_erst: number;
    indikation_medizinisch_voll: number;
    indikation_pflegeheim_dosen: number;
    indikation_pflegeheim_erst: number;
    indikation_pflegeheim_voll: number;
    personen_erst_kumulativ: number;
    personen_voll_kumulativ: number;
}

interface DeliveriesData {
    date: Date;
    dosen: number;
    impfstoff: string;
    region: string;
}

type YearWeek = [
    year: number,
    week: number
];

type WeeklyDeliveryData = Map<YearWeek, Map<string, number>>;
