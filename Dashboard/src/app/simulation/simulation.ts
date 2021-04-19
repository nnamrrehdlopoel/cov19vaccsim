import {YearWeek} from './calendarweek/calendarweek';
import * as cw from './calendarweek/calendarweek';
import * as wu from 'wu';
import {zislabImpfsimVerteilungszenarien} from './data-interfaces/raw-data.interfaces';
import {
    ISimulationResults, IVaccinationWeek,
    WeeklyDeliveryData,
    WeeklyVaccinationData
} from './data-interfaces/simulation-data.interfaces';
import {DataloaderService} from '../services/dataloader.service';
import {
    calculateWeeklyDeliveries,
    calculateWeeklyVaccinations,
    extractDeliveriesInfo,
    mergeWeeklyDeliveryScenario
} from './weekly-data-converter';


export interface ISimulationParameters {
    considerContraindicated: boolean;
    considerNotWilling: boolean;
    deliveryAmountFactor: number;
    deliveryScenario: string;
    keep2ndDosesBack: boolean;
    extraIntervalWeeks: number;
    fractionWilling: number;
}



export interface VaccinationSimulation {
    params: ISimulationParameters;
    runSimulation(): ISimulationResults;
}

export class BasicSimulation implements VaccinationSimulation {

    constructor(
        private dataloader: DataloaderService) {
    }


    weeklyVaccinations: WeeklyVaccinationData;
    weeklyDeliveries: WeeklyDeliveryData;
    plannedDeliveries: WeeklyDeliveryData;
    weeklyDeliveriesScenario: WeeklyDeliveryData;
    private currentDeliveryScenario: string;


    params: ISimulationParameters = {
        considerContraindicated: true,
        considerNotWilling: true,
        deliveryAmountFactor: 1,
        deliveryScenario: zislabImpfsimVerteilungszenarien[1],
        keep2ndDosesBack: false,
        extraIntervalWeeks: 0,
        fractionWilling: 0.80,
    };

    simulationStartWeek: YearWeek = cw.yws([2021, 10]);

    private ensureWeeklyData(): boolean {
        if (!this.dataloader.allLoaded()) {
            console.warn('Cannot run simulation, some data is still missing');
            return false;
        }
        if (!this.weeklyVaccinations){
            this.weeklyVaccinations = calculateWeeklyVaccinations(this.dataloader.vaccinations);
        }
        if (!this.weeklyDeliveries){
            this.weeklyDeliveries = calculateWeeklyDeliveries(this.dataloader.deliveries);
        }
        if (!this.plannedDeliveries || this.params.deliveryScenario !== this.currentDeliveryScenario){
            this.plannedDeliveries = extractDeliveriesInfo(this.dataloader.zislabImpfsimLieferungenData, this.params.deliveryScenario);
            this.weeklyDeliveriesScenario = mergeWeeklyDeliveryScenario(this.weeklyDeliveries, this.plannedDeliveries);
        }
        return true;
    }

    runSimulation(): ISimulationResults {
        if (!this.ensureWeeklyData()){
            return null;
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

        const numContraindicated = wu(Object.entries(this.dataloader.population.data.by_age))
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
            vaccineStockPile += wu(delayedDeliveryData.values()).reduce(sum) * this.params.deliveryAmountFactor;

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
            let availablePeople = this.dataloader.population.data.total;
            if (this.params.considerContraindicated) {
                availablePeople -= numContraindicated;
            }
            if (this.params.considerNotWilling) {
                availablePeople *= this.params.fractionWilling;
            }
            availablePeople -= cumPartiallyImmunized;
            let availableVaccineStockPile = vaccineStockPile;
            if (this.params.keep2ndDosesBack){
                availableVaccineStockPile -= waitingFor2ndDose.reduce(sum);
            }
            const given1stShots = Math.max(0, Math.min(availableVaccineStockPile, availablePeople));
            vaccineStockPile -= given1stShots;

            // 2st shots go on waiting list to get their 2nd in a few weeks
            const pplSplit = Math.floor(given1stShots * 0.7);
            waitingFor2ndDose[5 + this.params.extraIntervalWeeks] += pplSplit;
            waitingFor2ndDose[10 + this.params.extraIntervalWeeks] += given1stShots - pplSplit;

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

        // this.simulationResults = results;

        console.log(results, 'Simulation Results');
        return results;
    }
}
