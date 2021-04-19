import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import * as d3 from 'd3';
import {
    DeliveriesData,
    PopulationData,
    VaccinationsData,
    ZislabImpfsimlieferungenDataRow
} from '../simulation/data-interfaces';

@Injectable({
    providedIn: 'root'
})
export class DataloaderService {

    constructor(
        private http: HttpClient) {
    }

    lastRefreshVaccinations: Date;
    lastRefreshDeliveries: Date;
    lastRefreshCapacity: Date;

    vaccinations: d3.DSVParsedArray<VaccinationsData>;
    deliveries: d3.DSVParsedArray<DeliveriesData>;
    zislabImpfsimLieferungenData: ZislabImpfsimlieferungenDataRow[];
    population: PopulationData;
    priorities: any;
    vaccineUsage: any;
    vaccinationWillingness: any;

    loadData(): void {
        if (!this.vaccinations) {
            this.http.get('https://impfdashboard.de/static/data/germany_vaccinations_timeseries_v2.tsv', {responseType: 'text'})
                .subscribe(data => {
                    this.vaccinations = d3.tsvParse<VaccinationsData, string>(data, d3.autoType);
                    this.lastRefreshVaccinations = this.vaccinations[this.vaccinations.length - 1].date;
                    // this.simulationStartWeek = cw.getYearWeekOfDate(this.lastRefreshVaccinations);
                    console.log(this.vaccinations, 'Impfdashboard.de Vaccinations Data');
                });
        }
        if (!this.deliveries) {
            this.http.get('https://impfdashboard.de/static/data/germany_deliveries_timeseries_v2.tsv', {responseType: 'text'})
                .subscribe(data => {
                    this.deliveries = d3.tsvParse<DeliveriesData, string>(data, d3.autoType);
                    this.lastRefreshDeliveries = this.deliveries[this.deliveries.length - 1].date;
                    console.log(this.deliveries, 'Impfdashboard.de Deliveries Data');
                });
        }
        if (!this.vaccinationWillingness) {
            this.http.get('data/cosmo-impfbereitschaft.json')
                .subscribe(data => {
                    this.vaccinationWillingness = data;
                    console.log(this.vaccinationWillingness, 'Vaccination Willingness Data');
                });
        }
        if (!this.population) {
            this.http.get<PopulationData>('data/population_deutschland_2019.json')
                .subscribe(data => {
                    this.population = data;
                    console.log(this.population, 'Population Data');
                });
        }
        if (!this.priorities) {
            this.http.get('data/prioritaetsgruppen_deutschland.json')
                .subscribe(data => {
                    this.priorities = data;
                    console.log(this.priorities, 'Priority Data');
                });
        }
        if (!this.vaccineUsage) {
            this.http.get('data/impfstoffeinsatz_deutschland.json')
                .subscribe(data => {
                    this.vaccineUsage = data;
                    console.log(this.vaccineUsage, 'Vaccine Usage Data');
                });
        }
        if (!this.zislabImpfsimLieferungenData) {
            this.http.get<ZislabImpfsimlieferungenDataRow[]>('https://raw.githubusercontent.com/zidatalab/covid19dashboard/master/data/tabledata/impfsim_lieferungen.json')
                .subscribe(data => {
                    this.zislabImpfsimLieferungenData = data;
                    console.log(this.zislabImpfsimLieferungenData, 'ZisLab Vaccine Delivery Data');
                });
        }
    }

}
