/**
 * Implements a custom Home Assistant card that visualizes power consumption using a square-based chart.
 * Manages the lifecycle of power data collection, processing, and visualization updates.
 * Handles configuration options and real-time updates of power consumption data.
 */

import { html, LitElement, nothing } from "lit";
import { state } from "lit/decorators/state";
import * as d3 from 'd3';

import { HomeAssistant, LovelaceCardConfig } from "custom-card-helpers";

import { getTotalCurrentPowerConsumption, loadEnergyConfiguration, loadPowerMeters, debug_sensor_mappings } from "./power-meters";
import { styles } from './styles';
import { DebugSetting, EnergyToPowerSensorLookups, PowerMeter, PowerMeterReading } from "./types";
import { generateChart } from './chart';
import { calculatePowerData } from './power-data';

interface Config extends LovelaceCardConfig {
  header: string;
  includeUntracked?: boolean;
  squareSize?: number;
  squaresPerRow?: number;
  width?: number;
  minimalPowerDisplayed?: number;
  updateFrequency?: number;  // in seconds
  energyToPowerSensorLookups?: string[];
  debug?: string;
}

export class EnergyPowerDevicesGraphCard extends LitElement {
    static styles = styles;

    // internal reactive states
    @state() private _header: string | typeof nothing = nothing;
    @state() private consumption: PowerMeter[] = [];
    @state() private totalLoad: PowerMeterReading = 0.0;

    // Chart specific properties
    private readonly DEFAULT_SVG_WIDTH = 486;   // FIXME: figure out the correct HA card width, or make it automagically flow to the correct width
    private readonly DEFAULT_SQUARE_SIZE = 18;
    private readonly DEFAULT_SQUARES_PER_ROW = 10;
    private readonly DEFAULT_INCLUDE_UNTRACKED = true;
    private readonly DEFAULT_MINIMAL_POWER_DISPLAYED = 2;
    private readonly DEFAULT_UPDATE_FREQUENCY = 10;  // in seconds
    private readonly DEFAULT_ENERGY_TO_POWER_SENSOR_LOOKUPS: EnergyToPowerSensorLookups = [
        { energySensorSearchSubstring: "_energy", powerSensorReplacementSubstring: "_power" }
    ];

    // Configuration fields
    private includeUntracked!: boolean;
    private squareSize!: number;
    private squaresPerRow!: number;
    private width!: number;
    private minimalPowerDisplayed!: number;
    private updateFrequency!: number;
    private energyToPowerSensorLookups!: EnergyToPowerSensorLookups;
    private debug: DebugSetting = 'false';

    // private properties
    private _hass!: HomeAssistant;
    private _timerInterval!: number;
    private _needsReconfiguration = false;
    private _powerSources!: any;
    private _powerConsumers!: any;

    // lifecycle interface
    async setConfig(config: Config) {
        this._header = config.header === "" ? nothing : config.header;
        this.includeUntracked = config.includeUntracked ?? this.DEFAULT_INCLUDE_UNTRACKED;
        this.squareSize = config.squareSize ?? this.DEFAULT_SQUARE_SIZE;
        this.squaresPerRow = config.squaresPerRow ?? this.DEFAULT_SQUARES_PER_ROW;
        this.width = config.width ?? this.DEFAULT_SVG_WIDTH;
        this.minimalPowerDisplayed = config.minimalPowerDisplayed ?? this.DEFAULT_MINIMAL_POWER_DISPLAYED;
        this.updateFrequency = config.updateFrequency ?? this.DEFAULT_UPDATE_FREQUENCY;
        this.debug = String(config.debug) ?? 'false';
        this.energyToPowerSensorLookups = (config.energyToPowerSensorLookups ?? this.DEFAULT_ENERGY_TO_POWER_SENSOR_LOOKUPS)
                                                .map(entry => {
                                                    const [energySensorSearchSubstring, powerSensorReplacementSubstring]: [string, string] = entry.split('->');
                                                    return {
                                                        energySensorSearchSubstring: energySensorSearchSubstring.trim(),
                                                        powerSensorReplacementSubstring: powerSensorReplacementSubstring.trim()
                                                    };
                                                });

        this._needsReconfiguration = true;
        this.initializeIfReady();
    }

    set hass(hass: HomeAssistant) {
        this._hass = hass;
        this.initializeIfReady();
    }

    static getStubConfig() {
        return {
            header: "Power consumption",
            energyToPowerSensorLookups: [
                "_total_energy -> _power_consumption",
                "_accumulated_consumption -> _power",
                "_energy -> _power",
            ],
            width: 486,
            minimalPowerDisplayed: 2,
            includeUntracked: true,
            updateFrequency: 10,
            debug: 'true',
        };
    }

    private initializeIfReady() {
        if (this._needsReconfiguration && this._hass) {
            this._needsReconfiguration = false;
            setTimeout(() => { this.initializeConfiguration(); }, 0);
        }
    }

    async initializeConfiguration() {
        console.log('Initializing configuration');

        [this._powerSources, this._powerConsumers] = await loadEnergyConfiguration(this._hass, this.energyToPowerSensorLookups, this.debug);

        this.refreshMeters();
        this._timerInterval = setInterval(() => {this.refreshMeters()}, this.updateFrequency * 1000);
    }

    private updateChart() {
        if (!this._hass || !this.shadowRoot || !this.consumption.length || !this.totalLoad) {
            return;
        }

        const svgElement = this.shadowRoot.querySelector('svg');
        if (!svgElement) {
            return;
        }

        const data = calculatePowerData(
            this.consumption,
            this.totalLoad,
            getComputedStyle(this),
            this._hass.localize,
            this.minimalPowerDisplayed,
            this.includeUntracked
        );

        const svg = d3.select(svgElement);
        generateChart(svg, data, {
            squareSize: this.squareSize,
            svgWidth: this.width,
            squareDistance: 5,
            labelToSquareDistance: 20,
            margin: { top: 14, right: 10, bottom: 30, left: 160 },
            squaresPerRow: this.squaresPerRow
        });
    }

    updated(changedProperties: Map<string, any>) {
        if ((changedProperties.has('consumption') && this.consumption.length) ||
            (changedProperties.has('totalLoad') && this.totalLoad)) {
            this.updateChart();
        }
    }

    refreshMeters() {
        if(this._powerConsumers) {
            this.consumption = loadPowerMeters(this._hass, this._powerConsumers);
            this.totalLoad = getTotalCurrentPowerConsumption(this._hass, this._powerSources);
        }
    }

    renderDebugInfo() {
        return html`
            <div class="debug-info">
            <h3>Debug information</h3>
            <ul style="font-family: 'Courier New', Courier, monospace;">
            ${debug_sensor_mappings.map(([energySensor, powerSensor]) => html`
                <li>
                ${energySensor} -> ${powerSensor ? powerSensor : html`<span style="color: red;">?</span>`}
                </li>
            `)}
            </ul>
            </div>
        `;
    }

    render() {
        const debug_info = String(this.debug) === 'true' ? this.renderDebugInfo() : nothing;
        return html`
            <ha-card header="${this._header}">
                <div class="card-content">
                    <svg id="chart" width="${this.width}"></svg>
                    ${debug_info}
                </div>
            </ha-card>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        clearInterval(this._timerInterval);
    }
}
