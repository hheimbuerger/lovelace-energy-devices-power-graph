export interface DataPoint {
    name: string;
    amount: number;
    colorFill: string;
    colorBorder: string;
}

export type FlowFromGridSourceType = {
    // NOTE: incomplete definition
    stat_energy_from: string,
}

export type EnergySourceGrid = {
    // NOTE: incomplete definition
    type: "grid",
    flow_from: FlowFromGridSourceType[],
}

export type EnergySourceSolar = {
    // NOTE: incomplete definition
    type: "solar",
    stat_energy_from: string,
}

export type EnergySourceBattery = {
    // NOTE: incomplete definition
    type: "battery",
    stat_energy_from: string,
}

// Entries from the section "Electricity Grid" on the Energy Configuration screen
export type EnergySource = EnergySourceGrid | EnergySourceSolar | EnergySourceBattery;

// Entries from the section "Individual devices" on the Energy Configuration screen
export type DeviceConsumption = {
    // NOTE: incomplete definition
    name: string,               // name as given in the
    stat_consumption: string,   // sensor
}

export type EnergyPreferences = {
    energy_sources: EnergySource[],
    device_consumption: DeviceConsumption[],
};

export type PowerSensor = string;

export type PowerConsumer = {
    name: string,
    sensor: string,
}

export type PowerMeterReading = number;

export type PowerMeter = {
    name: string,
    power: PowerMeterReading,
}

export type EnergyToPowerSensorLookup = {
    energySensorSearchSubstring: string,
    powerSensorReplacementSubstring: string,
}

export type EnergyToPowerSensorLookups = EnergyToPowerSensorLookup[];

export type DebugSetting = 'true' | 'false' | 'console-only';
