import {YearWeek} from './calendarweek/calendarweek';
import {DataloaderService} from '../services/dataloader.service';
import {normalizeVaccineName, vaccineNames} from './data-interfaces/vaccine-names';


export class VaccineUsage {
    constructor(
        private dataloader: DataloaderService) {
    }

    /**
     * Makes sure all internal variables is calculated.
     * Call once the dataloader passed in the constructor has finished loading
     */
    calculateData(): void {
        if (!this.dataloader.allLoaded()){
            return;
        }
    }

    getVaccineIntervalWeeks(week: YearWeek, vName: string): number {
        // TODO: currently static
        const vacSpecialIntervals = {
            az: 12,
            'j&j': 0
        };
        return (vName in vacSpecialIntervals) ? vacSpecialIntervals[vName] : 6;
    }

    isVaccineUsed(week: YearWeek, vName: string): boolean {
        // TODO: currently static
        return true;
    }

    getVaccinesPriorityList(): string[] {
        return Object.keys(vaccineNames);
    }
}
