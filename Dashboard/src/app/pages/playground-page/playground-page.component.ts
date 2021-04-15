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
        private csv: CsvexportService) { }

    lastRefreshVaccinations: Date;
    lastRefreshDeliveries: Date;
    lastRefreshCapacity: Date;

    params = {
        liefermenge: 1,
        verteilungszenario: '',
        ruecklage: false,
        addweekstoabstand: 0,
        impfstoffart: 'alle',
        anteil_impfbereit: 0.66,
    };
    verteilungszenarien = [];

    data: DummyChartData = {
        vacData: [1, 2, 3, 4, 1, 2, 5, 2, 3, 4],
        vacStart: new Date(2021, 0, 1),
    };
    vaccinations: d3.DSVParsedArray<VaccinationsData>;
    deliveries: d3.DSVParsedArray<DeliveriesData>;
    population: any;
    priorities: any;
    vaccineUsage: any;
    vaccinationWillingness: any;

    ngOnInit(): void {
        window.scrollTo(0, 0);
        this.loadData();
    }

    loadData(): void {
        this.http.get('https://impfdashboard.de/static/data/germany_vaccinations_timeseries_v2.tsv', {responseType: 'text'})
            .subscribe(data => {
                this.vaccinations = d3.tsvParse<VaccinationsData, string>(data, d3.autoType);
                this.data.vacStart = this.vaccinations[0].date;
                this.data.vacData = this.vaccinations.map(x => x.dosen_kumulativ);
                this.lastRefreshVaccinations = this.vaccinations[this.vaccinations.length - 1].date;
                // TODO: update chart?
                console.log(this.vaccinations);
            });
        this.http.get('https://impfdashboard.de/static/data/germany_deliveries_timeseries_v2.tsv', {responseType: 'text'})
            .subscribe(data => {
                this.deliveries = d3.tsvParse<DeliveriesData, string>(data, d3.autoType);
                this.lastRefreshDeliveries = this.deliveries[this.deliveries.length - 1].date;
                console.log(this.deliveries);
            });
        this.http.get('data/cosmo-impfbereitschaft.json')
            .subscribe(data => {
                this.vaccinationWillingness = data;
                console.log(this.vaccinationWillingness);
            });
        this.http.get('data/population_deutschland_2019.json')
            .subscribe(data => {
                this.population = data;
                console.log(this.population);
            });
        this.http.get('data/prioritaetsgruppen_deutschland.json')
            .subscribe(data => {
                this.priorities = data;
                console.log(this.priorities);
            });
        this.http.get('data/impfstoffeinsatz_deutschland.json')
            .subscribe(data => {
                this.vaccineUsage = data;
                console.log(this.vaccineUsage);
            });
    }

    restartModel(): void {

    }
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
