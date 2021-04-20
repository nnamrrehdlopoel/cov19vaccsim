import {VaccineNumbers} from './data-interfaces/simulation-data.interfaces';


export const sum = (x: number, y: number): number => x + y;
export const sub = (x: number, y: number): number => x - y;


/**
 * Vaccine Number Math
 * Applies some math function on all the vaccines given in a using the numbers in b.
 * vaccines not existing in b are assumes as 0
 * @param a the first list of vaccine numbers
 * @param fun the function applied
 * @param b the second list of vaccine numbers or a number to assume for all
 */
export function vNM(a: VaccineNumbers, b: VaccineNumbers | number, fun: (a: number, b: number) => number): VaccineNumbers {
    const newNumbers = new Map();
    for (const [vName, num] of a.entries()){
        const bn = typeof b === 'number' ? b : b.get(vName) || 0;
        newNumbers.set(vName, fun(num, bn));
    }
    return newNumbers;
}
/**
 * Infix version of Vaccine Number Math
 * Applies some math function on all the vaccines given in a using the numbers in b.
 * vaccines not existing in b are assumes as 0
 * @param a the first list of vaccine numbers
 * @param fun the function applied
 * @param b the second list of vaccine numbers
 * @see vNM
 */
export function v(a: VaccineNumbers, fun: (a: number, b: number) => number, b: VaccineNumbers | number ): VaccineNumbers {
    return vNM(a, b, fun);
}
