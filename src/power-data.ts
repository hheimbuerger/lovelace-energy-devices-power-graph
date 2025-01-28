/**
 * Power data calculation module for the energy devices power graph.
 * Processes and formats power consumption data for visualization, including
 * handling of untracked consumption and color assignments for different power sources.
 */

import { sum } from "./utils";
import { getGraphColorByIndex } from './frontend-source-snapshot/colors';
import { DataPoint, PowerMeter } from "./types";

// Identify the system color for the untracked consumption
// FIXME: I believe this should work, but somewhere in the DOM (at the <hui-view>.undefined, to be exact), the correct '--state-unavailable-color' of '#bdbdbd' gets overwritten with `#626569'.
// let unavailableColor = getEnergyColor(style, false, true, true, '--state-unavailable-color');
// I've given up, and now I'm just hardcoding the color.
const UNAVAILABLE_COLOR = '#bdbdbd';

// We're using this to label the untracked power consumption, even though it's actually written and used to display
// untracked energy, not untracked power (in English, "untracked consumption" works okay, but that might not hold
// true for other languages). I couldn't find a better alternative in the existing labels, though.
const UNTRACKED_CONSUMPTION_LABEL = 'ui.panel.lovelace.cards.energy.energy_devices_detail_graph.untracked_consumption';

export function calculatePowerData(
    consumption: PowerMeter[],
    totalLoad: number,
    style: CSSStyleDeclaration,
    localize: (key: string) => string,
    minimalPowerDisplayed: number,
    includeUntracked: boolean = true
): DataPoint[] {
    const totalKnownLoad = sum(consumption.map(c => c.power));
    const sanitizedTotalLoad = Math.max(totalKnownLoad, totalLoad);
    const unknownLoad = sanitizedTotalLoad - totalKnownLoad;

    // Map colors first, then filter
    const filteredConsumption = consumption
        .map((consumer, idx) => ({
            name: consumer.name,
            amount: consumer.power,
            colorFill: getGraphColorByIndex(idx, style) + '7F',  // Add transparency
            colorBorder: getGraphColorByIndex(idx, style)  // Full opacity
        }))
        .filter(consumer => consumer.amount >= minimalPowerDisplayed);

    // Add untracked consumption if enabled
    const untrackedConsumption: DataPoint | null = includeUntracked ? {
        name: localize(UNTRACKED_CONSUMPTION_LABEL),
        amount: unknownLoad,
        colorFill: UNAVAILABLE_COLOR + '7F',
        colorBorder: UNAVAILABLE_COLOR
    } : null;

    // Combine, process and sort the data
    return [
        ...filteredConsumption,
        ...(untrackedConsumption ? [untrackedConsumption] : [])
    ]
    .map((item) => ({
        name: item.name,
        amount: Math.max(Math.floor(item.amount / 10), 1),
        colorFill: item.colorFill,
        colorBorder: item.colorBorder
    }))
    .sort((a, b) => b.amount - a.amount);
}
