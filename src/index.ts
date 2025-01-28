/**
 * Entry point module for the energy devices power graph custom card.
 * Registers the custom element and card configuration with Home Assistant.
 */

import { EnergyPowerDevicesGraphCard } from "./card";
// import { EnergyPowerDevicesGraphCardEditor } from "./editor";

declare global {
  interface Window {
    customCards: Array<Object>;
  }
}

customElements.define("energy-devices-power-graph", EnergyPowerDevicesGraphCard);
// customElements.define(
//   "energy-devices-power-graph-editor",
//   EnergyPowerDevicesGraphCardEditor
// );

window.customCards = window.customCards || [];
window.customCards.push({
  type: "energy-devices-power-graph",
  name: "Devices power graph",
  description: "Shows the current power usage per device. (Power sensors are heuristically identified from HA's energy sensor configuration.)",
});
