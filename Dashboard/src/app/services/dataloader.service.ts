import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import * as d3 from 'd3';
import {
    CosmoWillingnessData,
    DeliveriesData,
    PopulationData, PriorityGroupsData,
    VaccinationsData, VaccineUsageData,
    ZislabImpfsimlieferungenDataRow
} from '../simulation/data-interfaces/raw-data.interfaces';
import {Observable} from 'rxjs';
import {filter} from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class DataloaderService {

    constructor(
        private http: HttpClient) {
    }

    lastRefreshVaccinations: Date;
    lastRefreshDeliveries: Date;

    vaccinations: d3.DSVParsedArray<VaccinationsData>;
    deliveries: d3.DSVParsedArray<DeliveriesData>;
    zislabImpfsimLieferungenData: ZislabImpfsimlieferungenDataRow[];
    population: PopulationData;
    priorities: PriorityGroupsData;
    vaccineUsage: VaccineUsageData;
    vaccinationWillingness: CosmoWillingnessData;

    loadData(): Observable<any> {
        return new Observable<any>((obs) => {
            if (!this.vaccinations) {
                this.http.get('https://impfdashboard.de/static/data/germany_vaccinations_timeseries_v2.tsv', {responseType: 'text'})
                    .subscribe(data => {
                        this.vaccinations = d3.tsvParse<VaccinationsData, string>(data, d3.autoType);
                        this.lastRefreshVaccinations = this.vaccinations[this.vaccinations.length - 1].date;
                        // this.simulationStartWeek = cw.getYearWeekOfDate(this.lastRefreshVaccinations);
                        console.log(this.vaccinations, 'Impfdashboard.de Vaccinations Data');
                        obs.next();
                    });
            }
            if (!this.deliveries) {
                this.http.get('https://impfdashboard.de/static/data/germany_deliveries_timeseries_v2.tsv', {responseType: 'text'})
                    .subscribe(data => {
                        this.deliveries = d3.tsvParse<DeliveriesData, string>(data, d3.autoType);
                        this.lastRefreshDeliveries = this.deliveries[this.deliveries.length - 1].date;
                        console.log(this.deliveries, 'Impfdashboard.de Deliveries Data');
                        obs.next();
                    });
            }
            if (!this.vaccinationWillingness) {
                this.http.get<CosmoWillingnessData>('data/cosmo-impfbereitschaft.json')
                    .subscribe(data => {
                        this.vaccinationWillingness = data;
                        console.log(this.vaccinationWillingness, 'Vaccination Willingness Data');
                        obs.next();
                    });
            }
            if (!this.population) {
                this.http.get<PopulationData>('data/population_deutschland_2019.json')
                    .subscribe(data => {
                        this.population = data;
                        console.log(this.population, 'Population Data');
                        obs.next();
                    });
            }
            if (!this.priorities) {
                this.http.get<PriorityGroupsData>('data/prioritaetsgruppen_deutschland.json')
                    .subscribe(data => {
                        this.priorities = data;
                        console.log(this.priorities, 'Priority Data');
                        obs.next();
                    });
            }
            if (!this.vaccineUsage) {
                this.http.get<VaccineUsageData>('data/impfstoffeinsatz_deutschland.json')
                    .subscribe(data => {
                        this.vaccineUsage = data;
                        console.log(this.vaccineUsage, 'Vaccine Usage Data');
                        obs.next();
                    });
            }
            if (!this.zislabImpfsimLieferungenData) {
                this.http.get<ZislabImpfsimlieferungenDataRow[]>('https://raw.githubusercontent.com/zidatalab/covid19dashboard/master/data/tabledata/impfsim_lieferungen.json')
                    .subscribe(data => {
                        this.zislabImpfsimLieferungenData = data;
                        console.log(this.zislabImpfsimLieferungenData, 'ZisLab Vaccine Delivery Data');
                        obs.next();
                    });
            }
            obs.next();
        }).pipe(filter(value => this.allLoaded()));
    }

    allLoaded(): boolean {
        return !!this.vaccinations
            && !!this.deliveries
            && !!this.zislabImpfsimLieferungenData
            && !!this.vaccinationWillingness
            && !!this.vaccineUsage
            && !!this.population
            && !!this.priorities;
    }

}
