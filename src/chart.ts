/**
 * Generates a visual representation of power consumption data using D3.js.
 * Creates a square-based chart where each square represents a unit of power consumption.
 * Handles layout, labeling, and styling of the visualization including truncation of long device names.
 */

import * as d3 from 'd3';
import { DataPoint } from './types';

export interface ChartOptions {
    squareSize: number;
    svgWidth: number;
    squareDistance: number;
    labelToSquareDistance: number;
    margin: { top: number; right: number; bottom: number; left: number };
    squaresPerRow: number;
}

export function generateChart(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    data: DataPoint[],
    options: ChartOptions
) {
    // Clear existing SVG content
    svg.selectAll("*").remove();

    const { svgWidth, squareDistance, labelToSquareDistance, margin, squaresPerRow } = options;
    const width = svgWidth - margin.left - margin.right;
    const maxLabelWidth = margin.left - labelToSquareDistance;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    let currentY = 0;

    data.forEach((d) => {
        const numRows = Math.ceil(d.amount / squaresPerRow);
        const rowHeight = numRows * (options.squareSize + squareDistance);

        // Create a temporary text element to measure the text length
        const tempText = g.append("text")
            .attr("class", "text-label")
            .attr("x", -labelToSquareDistance)
            .attr("y", currentY + options.squareSize / 2)
            .attr("dy", ".35em")  // Adjust vertical positioning
            .attr("text-anchor", "end")
            .text(d.name);

        // Measure the text length
        const ellipsis = '…';
        const ellipsisLength = tempText.text(ellipsis).node().getComputedTextLength();
        tempText.text(d.name);

        // Truncate the text if it exceeds the maximum width
        let truncatedText = d.name;
        let textLength = tempText.node().getComputedTextLength();
        while (truncatedText.length > 0 && textLength + ellipsisLength > maxLabelWidth) {
            truncatedText = truncatedText.slice(0, -1);
            tempText.text(truncatedText);
            textLength = tempText.node().getComputedTextLength();
        }
        let displayName = (truncatedText === d.name) ? d.name : truncatedText + ellipsis;

        // Remove the temporary text element
        tempText.remove();

        // Label positioning
        g.append("text")
            .attr("x", -labelToSquareDistance)
            .attr("y", currentY + options.squareSize / 2)
            .attr("dy", ".35em")  // Adjust vertical positioning
            .attr("text-anchor", "end")
            .attr("class", "text-label")  // Use the CSS class for text labels
            .text(displayName);

        // Squares positioning
        for (let j = 0; j < d.amount; j++) {
            g.append("rect")
                .attr("x", (j % squaresPerRow) * (options.squareSize + squareDistance))
                .attr("y", currentY + Math.floor(j / squaresPerRow) * (options.squareSize + squareDistance))
                .attr("width", options.squareSize)
                .attr("height", options.squareSize)
                .attr("rx", 2)  // Add rounded corners
                .attr("ry", 2)  // Add rounded corners
                .attr("fill", d.colorFill)  // Use colorFill for fill
                .attr("stroke", d.colorBorder);  // Use colorBorder for stroke
        }

        // Update currentY for the next row
        currentY += rowHeight + squareDistance;
    });

    // Update the viewBox attribute based on the content size
    const contentHeight = currentY + margin.top + margin.bottom;
    svg.attr("viewBox", `0 0 ${width + margin.left + margin.right} ${contentHeight}`);
}
