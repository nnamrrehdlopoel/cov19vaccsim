import {YearWeek} from '../calendarweek/calendarweek';


export interface ISimulationResults {
    weeklyData: Map<YearWeek, IVaccinationWeek>;
}

export type WeeklyVaccinationData = Map<YearWeek, IVaccinationWeek>;
export interface IVaccinationWeek {
    vaccineDoses: number;
    partiallyImmunized: number;
    fullyImmunized: number;
    cumVaccineDoses: number;
    cumPartiallyImmunized: number;
    cumFullyImmunized: number;
    dosesByVaccine?: Map<string, number>;
    cumDosesByVaccine?: Map<string, number>;
}

export type WeeklyDeliveryData = Map<YearWeek, Map<string, number>>;
