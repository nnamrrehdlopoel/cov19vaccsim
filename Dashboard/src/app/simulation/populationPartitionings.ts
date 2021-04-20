import {ISimulationParameters} from './simulation';
import {DataloaderService} from '../services/dataloader.service';


export const sum = (x: number, y: number): number => x + y;

export interface PopulationPartition {
    id: string;
    description: string;
    size: number;
}

// tslint:disable-next-line:no-empty-interface
export interface PopulationPartitioner {}


export class VaccinationWillingnessPartitioner implements PopulationPartitioner {
    constructor(
        private dataloader: DataloaderService) {
    }

    getUnwillingFraction(): number {
        const cosmoData = this.dataloader.vaccinationWillingness.data['2021-04-06'].prozente;

        return cosmoData['2'] + cosmoData['1'];
    }

    getUnwillingPartition(): PopulationPartition[] {
        const population = this.dataloader.population.data.total;

        return [{
            id: 'unwilling',
            description: 'Impfunwillige ()',
            size: population * this.getUnwillingFraction()
        }];
    }

    addUnwillingPartition(partitions: PopulationPartition[]): PopulationPartition[] {
        const population = this.dataloader.population.data.total;
        const restPopulation = population - partitions.map(x => x.size).reduce(sum, 0);

        return [
            ...partitions,
            {
                id: 'unwilling',
                description: 'Impfunwillig (1,2)',
                size: restPopulation * this.getUnwillingFraction()
            }];
    }

    addWillingnessPartitions(partitions: PopulationPartition[], excludingUnwilling = true): PopulationPartition[] {
        if (!excludingUnwilling){
            partitions = this.addUnwillingPartition(partitions);
        }

        const population = this.dataloader.population.data.total;
        const restPopulation = population - partitions.map(x => x.size).reduce(sum, 0);

        // partition based on the latest data of COSMO
        const cosmoData = this.dataloader.vaccinationWillingness.data['2021-04-06'].prozente;

        const factor =  1 / (1 - this.getUnwillingFraction());

        return [
            ...partitions,
            {
                id: 'willing_3',
                description: 'Eher impfunwillig (3,4)',
                size: restPopulation * (cosmoData['4'] + cosmoData['3']) * factor,
            },
            {
                id: 'willing_2',
                description: 'Eher impfwillig (5,6)',
                size: restPopulation * (cosmoData['6'] + cosmoData['5']) * factor,
            },
            {
                id: 'willing',
                description: 'Impfwillig (7)',
                size: restPopulation * (cosmoData['7']) * factor,
            }];
    }

    /*partitionPopulation(){
        // partition based on the latest data of COSMO
        const cosmoData = this.dataloader.vaccinationWillingness.data['2021-04-06'].prozente;

        const population = this.dataloader.population.data.total;

        return {
            impfbereit: cosmoData['7'] + cosmoData['6'],
            'eher impfbereit': cosmoData['5'] + cosmoData['4'],
            'eher nicht impfbereit': cosmoData['3'],
            'nicht impfbereit': cosmoData['2'] + cosmoData['1'],
        };
    }*/
}


export class PriorityPartitioner implements PopulationPartitioner {
    constructor(
        private dataloader: DataloaderService) {
    }

    addPriorityPartitions(partitions: PopulationPartition[], priorityType): PopulationPartition[] {
        const population = this.dataloader.population.data.total;
        const restPopulation = population - partitions.map(x => x.size).reduce(sum, 0);

        // partition based on the latest data of COSMO
        const prioGroups = this.dataloader.priorities.data[priorityType].gruppen;

        // TODO: implement

        return [
            ...partitions];
    }
}

export class AgePartitioner implements PopulationPartitioner {
    constructor(private params: ISimulationParameters) {
    }
}
