

export const zislabImpfsimVerteilungszenarien = ['Gleichverteilung', 'Linearer Anstieg der Produktion in Q2'];

/**
 * Interface of Vaccinations Delivery Data from zis data lab
 */
export interface ZislabImpfsimlieferungenDataRow {
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


/**
 * Interface of Vaccinations Data from impfdashboard.de
 */
export interface VaccinationsData {
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

/**
 * Interface of Deliveries Data from impfdashboard.de
 */
export interface DeliveriesData {
    date: Date;
    dosen: number;
    impfstoff: string;
    region: string;
}


/**
 * Interface of Population Data from data folder
 */
export interface PopulationData {
    description: string;
    source: string | string[];
    data: {
        total: number;
        by_age: {
            [age: string]: number
        }
    };
}

/**
 * Interface of Vaccination Willingness Data from data folder
 */
export interface CosmoWillingnessData {
    description: string;
    source: string | string[];
    detail: string;
    data: {
        [date: string]: {
            'prozente': {
                '7': number;
                '6': number;
                '5': number;
                '4': number;
                '3': number;
                '2': number;
                '1': number;
            },
            'mittel_nach_alter': {
                '18-29': number;
                '30-49': number;
                '50-64': number;
                '65-74': number;
            }
        }
    };
}


export interface PriorityGroup {
    description: string;
    source: string | string[];
    'gruppen': {
        [group: string]: number
    };
    'impfbereitschaft': {
        description: string;
        source: string | string[];
        'gruppen': {
            [group: string]: number
        }
    };
}

/**
 * Interface of Priority Group Data from data folder
 */
export interface PriorityGroupsData {
    description: string;
    source: string | string[];
    data: {
        [grouping: string]: PriorityGroup
    };
}

/**
 * Interface of Vaccine Usage Data from data folder
 */
export interface VaccineUsageData {
    description: string;
    source: string | string[];
    data: {
        [vaccine: string]: {
            [date: string]: {
                ages: string;
                '2nd_dose_weeks': string;
                description: string;
                source: string | string[];
            }
        }
    };
}
