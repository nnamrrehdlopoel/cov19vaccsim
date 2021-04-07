import * as d3 from 'd3';
import { Observable } from 'rxjs';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { NgZone } from '@angular/core';

export interface ResizeEvent {
    width: number;
    height: number;
    // could add more properties here if needed
    // see what is possible here: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
}

/**
 * Emits every time the specified element is resized.
 * Also immediately emits when first attached.
 *
 * If the browser does not support the ResizeObserver API, fallback to polling with an interval.
 *
 * NgZone required for correct change detection.
 * Using Resize Observer & D3 sometimes results in code running outside of the Angular zone.
 */
export function fromResize(element: HTMLElement, ngZone: NgZone): Observable<ResizeEvent> {
    const initialSize = {
        width: element.offsetWidth,
        height: element.offsetHeight,
    };
    return new Observable((subscriber) => {
        subscriber.next(initialSize);
        // ngZone.run
        //  - make sure to stay in the angular zone
        //  - fixes following bug: after resizing the window, click events on the D3 graph do not trigger change detection
        const resizeObserver = new ResizeObserver(() =>
            ngZone.run(() => {
                subscriber.next({
                    width: element.offsetWidth,
                    height: element.offsetHeight,
                });
            })
        );
        resizeObserver.observe(element);
        return () => {
            resizeObserver.disconnect();
        };
    });
}

/**
 * Automagically updates the viewbox and the style of your favorite SVG when its container is resized.
 * The SVG will span the full width and height of the container.
 *
 * The returned observable emits once when attached and every time when the container size changes.
 * To prevent too many fast emits during resizing, there is a debounce in between.
 *
 * NgZone required for correct change detection.
 * Using Resize Observer & D3 sometimes results in code running outside of the Angular zone.
 */
export function responsiveSvg(
    resizableWrapper: HTMLElement,
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    ngZone: NgZone,
    debounceMs: number = 100
): Observable<ResizeEvent> {
    let width: number;
    let height: number;

    return fromResize(resizableWrapper, ngZone).pipe(
        filter((size) => size.height !== height || size.width !== width),
        debounceTime(debounceMs),
        tap((changedSize) => {
            width = changedSize.width;
            height = changedSize.height;
            svg.attr('viewBox', `0 0 ${width} ${height}`).attr(
                'style',
                `min-width: ${width}px; max-width: ${width}px; min-height: ${height}px; max-height: ${height}px;`
            );
        })
    );
}
