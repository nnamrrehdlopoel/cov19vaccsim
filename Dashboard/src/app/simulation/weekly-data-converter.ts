import * as d3 from 'd3';
import {DeliveriesData, VaccinationsData, ZislabImpfsimlieferungenDataRow} from './data-interfaces/raw-data.interfaces';
import {
    IVaccinationWeek,
    WeeklyDeliveryData,
    WeeklyVaccinationData
} from './data-interfaces/simulation-data.interfaces';
import {getYearWeekOfDate, YearWeek, yws} from './calendarweek/calendarweek';
import {normalizeVaccineName} from './data-interfaces/vaccine-names';


export function calculateWeeklyDeliveries(deliveries: d3.DSVParsedArray<DeliveriesData>): WeeklyDeliveryData {
    const weeklyDeliveries: WeeklyDeliveryData = new Map();

    // accumulate historical deliveries
    for (const delivery of deliveries) {
        const yWeek = getYearWeekOfDate(delivery.date);
        const vName = normalizeVaccineName(delivery.impfstoff);

        // tslint:disable-next-line:no-unused-expression
        weeklyDeliveries.has(yWeek) || weeklyDeliveries.set(yWeek, new Map());
        const r = weeklyDeliveries.get(yWeek);
        r.set(vName, (r.get(vName) || 0) + delivery.dosen);
    }

    // this.weeklyDeliveriesScenario = weeklyDeliveries;
    console.log(weeklyDeliveries, 'Weekly Vaccine Delivery Data');
    return weeklyDeliveries;
}

export function calculateWeeklyVaccinations(vaccinations: d3.DSVParsedArray<VaccinationsData>): WeeklyVaccinationData {
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

    // assumes vaccinations are ordered
    for (const vaccDay of vaccinations) {
        const yWeek = getYearWeekOfDate(vaccDay.date);

        // new week has started => calculate differences
        if (!weeklyVacc.has(yWeek)) {
            if (lastWeek) {
                currWeek.vaccineDoses = currWeek.cumVaccineDoses - lastWeek.cumVaccineDoses;
                currWeek.partiallyImmunized = currWeek.cumPartiallyImmunized - lastWeek.cumPartiallyImmunized;
                currWeek.fullyImmunized = currWeek.cumFullyImmunized - lastWeek.cumFullyImmunized;
                for (const [vacc, doses] of currWeek.cumDosesByVaccine.entries()) {
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

        weekData.cumDosesByVaccine.set(normalizeVaccineName('biontech'), vaccDay.dosen_biontech_kumulativ);
        weekData.cumDosesByVaccine.set(normalizeVaccineName('astrazeneca'), vaccDay.dosen_astrazeneca_kumulativ);
        weekData.cumDosesByVaccine.set(normalizeVaccineName('moderna'), vaccDay.dosen_moderna_kumulativ);
    }

    // this.weeklyVaccinations = weeklyVacc;

    console.log(weeklyVacc, 'Weekly Vaccination Data');
    return weeklyVacc;
}


export function extractDeliveriesInfo(
        zislabImpfsimLieferungenData: ZislabImpfsimlieferungenDataRow[],
        verteilungszenario: string): WeeklyDeliveryData {

    const transformedData: WeeklyDeliveryData = new Map();
    for (const row of zislabImpfsimLieferungenData) {
        if (row.Verteilungsszenario === verteilungszenario && row.Bundesland === 'Gesamt') {
            const vName = normalizeVaccineName(row.hersteller);
            const yWeek: YearWeek = yws([2021, row.kw]);

            // tslint:disable-next-line:no-unused-expression
            transformedData.has(yWeek) || transformedData.set(yWeek, new Map());
            const r = transformedData.get(yWeek);
            r.set(vName, (r.get(vName) || 0) + row.dosen_kw);
        }
    }

    // this.plannedDeliveries = transformedData;
    console.log(transformedData, 'Vaccine Delivery Plan Data');

    return transformedData;
}

export function mergeWeeklyDeliveryScenario(historical: WeeklyDeliveryData, planned: WeeklyDeliveryData): WeeklyDeliveryData {
    const weeklyDeliveries: WeeklyDeliveryData = new Map(historical);

    // merge planned deliveries into array without overwriting
    for (const [yWeek, data] of planned.entries()){
        if (!weeklyDeliveries.has(yWeek)){
            weeklyDeliveries.set(yWeek, data);
        }
    }

    console.log(weeklyDeliveries, 'Weekly Vaccine Delivery Scenario Data');
    return weeklyDeliveries;
}
