/**
 * Manages the interface between Home Assistant's energy configuration and power sensor data.
 * Provides functionality to map energy sensors to power sensors using configurable conversion rules.
 * Handles loading and processing of energy preferences and power meter readings from Home Assistant.
 */

import { HomeAssistant } from "custom-card-helpers";
import { sum } from "./utils";
import { DebugSetting, EnergyPreferences, EnergyToPowerSensorLookups, PowerConsumer, PowerMeter, PowerSensor } from "./types";

export var debug_sensor_mappings: (string | null)[][] = [];

export async function getEnergyPreferences(hass: HomeAssistant) {
    return await hass.callWS<EnergyPreferences>({
        type: "energy/get_prefs",
    });
}

export function guessPowerSensorHeuristically(hass: HomeAssistant, energySensor: string, lookups: EnergyToPowerSensorLookups, debug: DebugSetting): string | null {
    for (const { energySensorSearchSubstring, powerSensorReplacementSubstring } of lookups) {
        let potentialPowerSensor = energySensor.replace(energySensorSearchSubstring, powerSensorReplacementSubstring);
        if (potentialPowerSensor in hass.states &&
            hass.states[potentialPowerSensor].attributes.unit_of_measurement === 'W'
        ) {
            if (debug === 'true') {
                debug_sensor_mappings.push([energySensor, potentialPowerSensor]);
            }
            if (debug !== 'false') {
                console.log(`Mapped energy sensor "${energySensor}" to power sensor "${potentialPowerSensor}"`);
            }
            return potentialPowerSensor;
        }
    }
    if (debug === 'true') debug_sensor_mappings.push([energySensor, null]);
    if (debug !== 'false') console.warn(`Could not map energy sensor "${energySensor}" to any power sensor`);
    return null;
}

export async function loadEnergyConfiguration(hass: HomeAssistant, lookups: EnergyToPowerSensorLookups, debug: DebugSetting): Promise<[PowerSensor[], PowerConsumer[]]> {
    var energyPreferences = await getEnergyPreferences(hass);

    debug_sensor_mappings = [];

    var powerSources = energyPreferences.energy_sources.flatMap((source) => {
        let energySensor;
        if (source.type == 'grid') {
            energySensor = source.flow_from[0].stat_energy_from;   // FIXME: no idea why flow_from is an array and what it means if there's multiple entries!
        } else if (source.type === 'solar' || source.type === 'battery') {
            energySensor = source.stat_energy_from;
        } else {
            throw new Error('unsupported power source type: ' + source.type);
        }
        const powerSensor = guessPowerSensorHeuristically(hass, energySensor, lookups, debug);
        if (powerSensor) {
            return powerSensor;
        } else {
            console.warn('Could not guess power sensor from energy sensor: ' + source);
            return [];
        }
    });

    var powerConsumers = energyPreferences.device_consumption.flatMap(({name, stat_consumption}) => {
        const energySensor = stat_consumption;
        const powerConsumer = guessPowerSensorHeuristically(hass, energySensor, lookups, debug);
        if (powerConsumer) {
            return [{name: name, sensor: powerConsumer}];
        } else {
            console.warn('Could not guess power sensor from energy sensor: ' + name);
            return [];
        }

    });

    // console.timeEnd('loadEnergyConfiguration()');
    return [powerSources, powerConsumers];
}

export function getTotalCurrentPowerConsumption(hass: HomeAssistant, powerSensors: PowerSensor[]): number {
    // TODO: this kinda relies on the assumption that production power sensors (e.g. solar) return negative values, but I'm not convinced that this is consistently the case
    // TODO: also, will this handle power drawn from batteries correctly?
    // TODO: also, what if the we're putting power back into the grid, will the negative values from the mains sensor result in the correct result?
    return sum(powerSensors.map(sensor => Number(hass.states[sensor].state) || 0));
}

export function loadPowerMeters(hass: HomeAssistant, consumers: PowerConsumer[]): PowerMeter[] {
    // console.time('loadPowerMeters()');
    let meters = consumers.map((consumer) => ({
        name: consumer.name,
        power: Number(hass.states[consumer.sensor].state) || 0,   // the state is NaN if a meter is currently unavailable
    }));
    // console.timeEnd('loadPowerMeters()');
    return meters;
}
