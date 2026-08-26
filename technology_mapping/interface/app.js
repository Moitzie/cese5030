/**
 * CMOS Technology Mapping - Main Application
 *
 * This script provides the main functionality for the interactive
 * technology mapping interface.
 */

// Global variables
let techLib = null;
let patternLib = null;
let graphs = {};
let currentGraph = null;
let currentGraphId = null;
let mapper = null;
let svg = null;
let zoomBehavior = null;
let currentZoom = 1.0;

// Cost weights
let costWeights = {
    area_weight: 0.5,
    delay_weight: 0.5,
    power_weight: 0.0
};

/**
 * Initialize the application
 */
async function initApp() {
    console.log("Initializing CMOS Technology Mapping Application...");

    // Load configuration
    await loadConfiguration();

    // Initialize D3.js
    initGraphVisualization();

    // Load graph data
    await loadGraphData();

    // Load technology library
    await loadTechnologyLibrary();

    // Load pattern library
    await loadPatternLibrary();

    // Initialize mapper
    initMapper();

    // Setup event listeners
    setupEventListeners();

    // Display library cells
    displayLibraryCells();

    console.log("Application initialized successfully!");
    updateStatus("Ready! Select a graph and click 'Perform Technology Mapping'", "success");
}

/**
 * Load application configuration
 */
async function loadConfiguration() {
    // Configuration can be loaded from a file or set defaults
    return Promise.resolve();
}

/**
 * Initialize D3.js graph visualization
 */
function initGraphVisualization() {
    const canvas = d3.select("#graph-canvas");

    svg = canvas.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .style("background", "#f8f9fa");

    // Add a group for the graph
    const g = svg.append("g")
        .attr("id", "graph-group");

    // Setup zoom behavior
    zoomBehavior = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", (event) => {
            currentZoom = event.transform.k;
            g.attr("transform", event.transform);
        });

    svg.call(zoomBehavior);

    // Add defs for markers (arrowheads)
    const defs = svg.append("defs");
    defs.append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 13)
        .attr("refY", 0)
        .attr("markerWidth", 13)
        .attr("markerHeight", 13)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#667eea");

    // Add defs for node types
    defs.append("marker")
        .attr("id", "arrowhead-white")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 13)
        .attr("refY", 0)
        .attr("markerWidth", 13)
        .attr("markerHeight", 13)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "white");
}

/**
 * Load graph data from files
 */
async function loadGraphData() {
    // Graph 1: Simple AND
    graphs.graph1 = {
        id: "graph1",
        name: "Simple AND Function",
        description: "Basic 2-input AND gate with inputs A and B",
        inputs: ["A", "B"],
        outputs: ["Y"],
        gates: [{ id: "g1", type: "AND", inputs: ["A", "B"], output: "Y" }],
        num_gates: 1,
        depth: 1
    };

    // Graph 2: AND-OR Network
    graphs.graph2 = {
        id: "graph2",
        name: "AND-OR Network",
        description: "AND gates feeding into OR gate",
        inputs: ["A", "B", "C", "D"],
        outputs: ["Y"],
        gates: [
            { id: "g1", type: "AND", inputs: ["A", "B"], output: "net1" },
            { id: "g2", type: "AND", inputs: ["C", "D"], output: "net2" },
            { id: "g3", type: "OR", inputs: ["net1", "net2"], output: "Y" }
        ],
        num_gates: 3,
        depth: 2
    };

    // Graph 3: Complex DAG
    graphs.graph3 = {
        id: "graph3",
        name: "Complex DAG",
        description: "Multi-level logic with fanout and reconvergence",
        inputs: ["A", "B", "C", "D"],
        outputs: ["Y", "Z"],
        gates: [
            { id: "g1", type: "AND", inputs: ["A", "B"], output: "net1" },
            { id: "g2", type: "AND", inputs: ["C", "D"], output: "net2" },
            { id: "g3", type: "OR", inputs: ["net1", "net2"], output: "net3" },
            { id: "g4", type: "AND", inputs: ["net3", "A"], output: "net4" },
            { id: "g5", type: "NOT", inputs: ["net4"], output: "Y" },
            { id: "g6", type: "AND", inputs: ["net1", "net2"], output: "Z" }
        ],
        num_gates: 6,
        depth: 4
    };

    // Graph 4: XOR Implementation
    graphs.graph4 = {
        id: "graph4",
        name: "XOR Implementation",
        description: "XOR gate using AND, OR, and NOT gates",
        inputs: ["A", "B"],
        outputs: ["Y"],
        gates: [
            { id: "g1", type: "NOT", inputs: ["A"], output: "notA" },
            { id: "g2", type: "NOT", inputs: ["B"], output: "notB" },
            { id: "g3", type: "AND", inputs: ["A", "notB"], output: "net1" },
            { id: "g4", type: "AND", inputs: ["notA", "B"], output: "net2" },
            { id: "g5", type: "OR", inputs: ["net1", "net2"], output: "Y" }
        ],
        num_gates: 5,
        depth: 3
    };

    // Graph 5: Half Adder
    graphs.graph5 = {
        id: "graph5",
        name: "Half Adder",
        description: "Half adder circuit with Sum and Carry outputs",
        inputs: ["A", "B"],
        outputs: ["Sum", "Carry"],
        gates: [
            { id: "g1", type: "AND", inputs: ["A", "B"], output: "Carry" },
            { id: "g2", type: "NOT", inputs: ["A"], output: "notA" },
            { id: "g3", type: "NOT", inputs: ["B"], output: "notB" },
            { id: "g4", type: "AND", inputs: ["A", "notB"], output: "net1" },
            { id: "g5", type: "AND", inputs: ["notA", "B"], output: "net2" },
            { id: "g6", type: "OR", inputs: ["net1", "net2"], output: "Sum" }
        ],
        num_gates: 6,
        depth: 3
    };

    // Display graph selector
    displayGraphSelector();
    console.log("Loaded", Object.keys(graphs).length, "graphs");
}

/**
 * Display graph selector cards
 */
function displayGraphSelector() {
    const selector = d3.select("#graph-selector");
    selector.selectAll("*").remove();

    for (const graphId in graphs) {
        const graph = graphs[graphId];
        const card = selector.append("div")
            .attr("class", "graph-card")
            .attr("data-graph-id", graphId)
            .on("click", function() { selectGraph(graphId); });

        card.append("h3").text(graph.name);
        card.append("p").text(graph.description).style("font-size", "0.85em");

        const preview = card.append("div")
            .attr("class", "graph-preview")
            .style("font-size", "0.8em")
            .style("color", "#667eea");
        preview.append("span").text(`${graph.num_gates} gates • Depth: ${graph.depth} • ${graph.inputs.length} inputs • ${graph.outputs.length} outputs`);

        if (currentGraphId === graphId) card.classed("selected", true);
    }
}

/**
 * Select a graph for visualization and mapping
 */
function selectGraph(graphId) {
    console.log("Selecting graph:", graphId);
    currentGraphId = graphId;
    currentGraph = graphs[graphId];

    // Update UI
    d3.selectAll(".graph-card").classed("selected", false);
    d3.select(`[data-graph-id="${graphId}"]`).classed("selected", true);

    // Visualize the graph
    visualizeGraph(currentGraph);
    updateStatus(`Selected: ${currentGraph.name} (${currentGraph.num_gates} gates)`, "info");
    clearResults();
}

/**
 * Visualize a graph using D3.js
 */
function visualizeGraph(graph) {
    console.log("Visualizing graph:", graph.name);
    d3.select("#graph-group").selectAll("*").remove();

    const g = d3.select("#graph-group");
    const width = parseInt(d3.select("#graph-canvas").style("width"));
    const height = parseInt(d3.select("#graph-canvas").style("height"));

    // Create a force-directed layout
    const simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Build nodes and links
    const nodes = [];
    const links = [];

    // Add input nodes
    for (const input of graph.inputs) {
        nodes.push({ id: input, type: "input", label: input });
    }

    // Add gate nodes
    for (const gate of graph.gates) {
        nodes.push({ id: gate.id, type: gate.type, label: gate.type + (gate.id ? " (" + gate.id + ")" : "") });

        // Add output node if different from gate id
        if (gate.output && gate.output !== gate.id) {
            nodes.push({ id: gate.output, type: "output", label: gate.output });
        }

        // Add links from inputs to gate
        for (const input of gate.inputs) {
            links.push({ source: input, target: gate.id, type: "input" });
        }

        // Add link from gate to output
        links.push({ source: gate.id, target: gate.output, type: "output" });
    }

    // Add output nodes not covered by gates
    for (const output of graph.outputs) {
        if (!nodes.some(n => n.id === output)) {
            nodes.push({ id: output, type: "output", label: output });
        }
    }

    // Draw links
    const link = g.append("g")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .attr("stroke", "#667eea")
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrowhead)");

    // Draw nodes
    const node = g.append("g")
        .selectAll("g")
        .data(nodes)
        .enter().append("g")
        .attr("class", "node")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Add node circles
    node.append("circle")
        .attr("r", d => getNodeRadius(d.type))
        .attr("fill", d => getNodeColor(d.type))
        .attr("stroke", "#333")
        .attr("stroke-width", 2);

    // Add node labels
    node.append("text")
        .text(d => d.label)
        .attr("text-anchor", "middle")
        .attr("dy", d => getNodeRadius(d.type) + 15)
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("fill", "#333");

    // Add node type labels
    node.append("text")
        .text(d => d.type)
        .attr("text-anchor", "middle")
        .attr("dy", d => getNodeRadius(d.type) + 30)
        .attr("font-size", "10px")
        .attr("fill", "#666");

    // Update simulation
    simulation.nodes(nodes).on("tick", ticked);
    simulation.force("link").links(links);

    function ticked() {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        node.attr("transform", d => `translate(${d.x},${d.y})`);
    }

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x; d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
    }

    resetZoom();
}

/**
 * Get node radius based on type
 */
function getNodeRadius(type) {
    const radii = { input: 12, output: 12, NOT: 15, AND: 18, OR: 18, NAND: 18, NOR: 18, XOR: 20, XNOR: 20 };
    return radii[type] || 16;
}

/**
 * Get node color based on type
 */
function getNodeColor(type) {
    const colors = {
        input: '#4CAF50', output: '#FF9800', NOT: '#9C27B0',
        AND: '#2196F3', OR: '#FF5722', NAND: '#00BCD4', NOR: '#E91E63',
        XOR: '#673AB7', XNOR: '#FFC107'
    };
    return colors[type] || '#9E9E9E';
}

/**
 * Load technology library
 */
async function loadTechnologyLibrary() {
    techLib = {
        library_name: "CMOS Standard Cell Library",
        technology: "45nm CMOS",
        description: "Standard cell library with area and delay costs",
        cells: [
            { name: "INV", type: "NOT", inputs: 1, outputs: 1, function: "Y = NOT A", area_um2: 1.2, delay_ps: 45, power_uW: 0.5, drive_strength: "1x", fanout_capacity: 4 },
            { name: "AND2", type: "AND", inputs: 2, outputs: 1, function: "Y = A AND B", area_um2: 2.8, delay_ps: 120, power_uW: 1.2, drive_strength: "1x", fanout_capacity: 4 },
            { name: "AND3", type: "AND", inputs: 3, outputs: 1, function: "Y = A AND B AND C", area_um2: 4.2, delay_ps: 180, power_uW: 1.8, drive_strength: "1x", fanout_capacity: 4 },
            { name: "AND4", type: "AND", inputs: 4, outputs: 1, function: "Y = A AND B AND C AND D", area_um2: 5.6, delay_ps: 240, power_uW: 2.4, drive_strength: "1x", fanout_capacity: 4 },
            { name: "OR2", type: "OR", inputs: 2, outputs: 1, function: "Y = A OR B", area_um2: 2.4, delay_ps: 90, power_uW: 1.0, drive_strength: "1x", fanout_capacity: 4 },
            { name: "OR3", type: "OR", inputs: 3, outputs: 1, function: "Y = A OR B OR C", area_um2: 3.6, delay_ps: 135, power_uW: 1.5, drive_strength: "1x", fanout_capacity: 4 },
            { name: "NAND2", type: "NAND", inputs: 2, outputs: 1, function: "Y = NOT (A AND B)", area_um2: 2.0, delay_ps: 80, power_uW: 0.8, drive_strength: "1x", fanout_capacity: 4 },
            { name: "NAND3", type: "NAND", inputs: 3, outputs: 1, function: "Y = NOT (A AND B AND C)", area_um2: 3.0, delay_ps: 120, power_uW: 1.2, drive_strength: "1x", fanout_capacity: 4 },
            { name: "NOR2", type: "NOR", inputs: 2, outputs: 1, function: "Y = NOT (A OR B)", area_um2: 1.8, delay_ps: 70, power_uW: 0.7, drive_strength: "1x", fanout_capacity: 4 },
            { name: "NOR3", type: "NOR", inputs: 3, outputs: 1, function: "Y = NOT (A OR B OR C)", area_um2: 2.7, delay_ps: 105, power_uW: 1.0, drive_strength: "1x", fanout_capacity: 4 },
            { name: "XOR2", type: "XOR", inputs: 2, outputs: 1, function: "Y = A XOR B", area_um2: 4.0, delay_ps: 150, power_uW: 2.0, drive_strength: "1x", fanout_capacity: 4 },
            { name: "XNOR2", type: "XNOR", inputs: 2, outputs: 1, function: "Y = NOT (A XOR B)", area_um2: 4.5, delay_ps: 160, power_uW: 2.2, drive_strength: "1x", fanout_capacity: 4 }
        ],
        cost_weights: costWeights
    };
    console.log("Loaded technology library with", techLib.cells.length, "cells");
}

/**
 * Load pattern library
 */
async function loadPatternLibrary() {
    patternLib = {
        pattern_library: "CMOS Technology Mapping Patterns",
        description: "Pattern matching templates for DAG covering algorithm",
        patterns: [
            { id: "p1", name: "Single Inverter", type: "pattern", matches: ["INV"], cost: { area: 1.2, delay: 45 } },
            { id: "p2", name: "2-input AND", type: "pattern", matches: ["AND2"], cost: { area: 2.8, delay: 120 } },
            { id: "p3", name: "2-input OR", type: "pattern", matches: ["OR2"], cost: { area: 2.4, delay: 90 } },
            { id: "p4", name: "NAND2", type: "pattern", matches: ["NAND2", "AND2+INV"], cost: { area: 2.0, delay: 80 } },
            { id: "p5", name: "NOR2", type: "pattern", matches: ["NOR2", "OR2+INV"], cost: { area: 1.8, delay: 70 } },
            { id: "p6", name: "XOR2", type: "pattern", matches: ["XOR2", "AND2+OR2+INV"], cost: { area: 4.0, delay: 150 } },
            { id: "p7", name: "3-input AND", type: "pattern", matches: ["AND3"], cost: { area: 4.2, delay: 180 } },
            { id: "p8", name: "3-input OR", type: "pattern", matches: ["OR3"], cost: { area: 3.6, delay: 135 } },
            { id: "p9", name: "AND-OR structure", type: "pattern", matches: ["AND2+OR2"], cost: { area: 5.2, delay: 210 } }
        ]
    };
    console.log("Loaded pattern library with", patternLib.patterns.length, "patterns");
}

/**
 * Initialize the technology mapper
 */
function initMapper() {
    mapper = new TechnologyMapper();
    mapper.initialize(techLib, patternLib);
    console.log("Technology mapper initialized");
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('area-weight-slider').addEventListener('input', updateCostWeights);
    document.getElementById('delay-weight-slider').addEventListener('input', updateCostWeights);
    document.getElementById('library-select').addEventListener('change', function() {
        console.log("Library changed to:", this.value);
    });
}

/**
 * Update cost weights from sliders
 */
function updateCostWeights() {
    const areaWeight = parseFloat(document.getElementById('area-weight-slider').value);
    const delayWeight = parseFloat(document.getElementById('delay-weight-slider').value);

    document.getElementById('area-weight-value').textContent = areaWeight.toFixed(1);
    document.getElementById('delay-weight-value').textContent = delayWeight.toFixed(1);
    document.getElementById('area-weight-percent').textContent = (areaWeight * 100) + '%';
    document.getElementById('delay-weight-percent').textContent = (delayWeight * 100) + '%';

    costWeights.area_weight = areaWeight;
    costWeights.delay_weight = delayWeight;

    if (techLib) techLib.cost_weights = costWeights;
    console.log("Cost weights updated:", costWeights);
}

/**
 * Perform technology mapping on the current graph
 */
function performMapping() {
    if (!currentGraph) {
        updateStatus("Please select a graph first", "error");
        return;
    }

    console.log("Performing technology mapping on:", currentGraph.name);
    mapper.loadGraph(currentGraph);
    const result = mapper.performMapping(costWeights);

    console.log("Mapping result:", result);
    displayMappingResults(result);

    if (result.success) {
        updateStatus("Technology mapping completed successfully!", "success");
    } else {
        updateStatus("Technology mapping completed with warnings", "info");
    }
}

/**
 * Compare different mapping strategies
 */
function compareStrategies() {
    if (!currentGraph) {
        updateStatus("Please select a graph first", "error");
        return;
    }

    const strategies = [
        { name: 'Area Optimized', weights: { area_weight: 1.0, delay_weight: 0.0, power_weight: 0.0 } },
        { name: 'Delay Optimized', weights: { area_weight: 0.0, delay_weight: 1.0, power_weight: 0.0 } },
        { name: 'Balanced', weights: { area_weight: 0.5, delay_weight: 0.5, power_weight: 0.0 } },
        { name: 'Custom', weights: costWeights }
    ];

    const results = [];
    for (const strategy of strategies) {
        const result = mapper.compareCostWeights(currentGraph, [strategy.weights]);
        results.push({
            strategy: strategy.name,
            result: result[0],
            area: result[0].result.totalCost.area,
            delay: result[0].result.totalCost.delay,
            total: result[0].result.totalCost.total
        });
    }

    displayStrategyComparison(results);
    updateStatus("Strategy comparison completed", "success");
}

/**
 * Display mapping results
 */
function displayMappingResults(result) {
    const resultsContent = d3.select("#results-content");
    resultsContent.selectAll("*").remove();

    const resultCard = resultsContent.append("div").attr("class", "result-card fade-in");
    resultCard.append("h3").text("📊 Mapping Results for " + currentGraph.name);

    // Summary statistics
    const summary = resultCard.append("div").attr("class", "result-grid");

    summary.append("div").attr("class", "result-item")
        .html(`<div class="label">Total Area</div><div class="value">${result.totalCost.area.toFixed(2)} µm²</div>`);
    summary.append("div").attr("class", "result-item")
        .html(`<div class="label">Critical Delay</div><div class="value">${result.totalCost.delay} ps</div>`);
    summary.append("div").attr("class", "result-item")
        .html(`<div class="label">Total Cost</div><div class="value">${result.totalCost.total.toFixed(2)}</div>`);
    summary.append("div").attr("class", "result-item")
        .html(`<div class="label">Coverage</div><div class="value">${result.coveredNodes.length}/${currentGraph.gates.length}</div>`);

    // Mapping table
    if (result.mapping && Object.keys(result.mapping).length > 0) {
        resultCard.append("h4").text("🔧 Gate Mapping Details")
            .style("margin-top", "20px").style("color", "#333");

        const table = resultCard.append("table").attr("class", "mapping-table");
        const thead = table.append("thead");
        const headerRow = thead.append("tr");
        headerRow.append("th").text("Gate ID");
        headerRow.append("th").text("Original Type");
        headerRow.append("th").text("Mapped Cell");
        headerRow.append("th").text("Area (µm²)");
        headerRow.append("th").text("Delay (ps)");

        const tbody = table.append("tbody");
        for (const gateId in result.mapping) {
            const mapping = result.mapping[gateId];
            const gate = currentGraph.gates.find(g => g.id === gateId);
            const row = tbody.append("tr");
            row.append("td").text(gateId);
            row.append("td").text(gate ? gate.type : 'N/A');
            row.append("td").text(mapping.cell || 'N/A');
            row.append("td").text(mapping.cost.area.toFixed(2));
            row.append("td").text(mapping.cost.delay);
        }
    }

    // Cell usage statistics
    const stats = mapper.getMappingStats(result);
    if (stats && Object.keys(stats.cellUsage).length > 0) {
        resultCard.append("h4").text("📈 Cell Usage Statistics")
            .style("margin-top", "20px").style("color", "#333");

        const usageGrid = resultCard.append("div").attr("class", "result-grid");
        for (const cellName in stats.cellUsage) {
            const count = stats.cellUsage[cellName];
            const cell = techLib.cells.find(c => c.name === cellName);
            usageGrid.append("div").attr("class", "result-item")
                .html(`<div class="label">${cellName}</div><div class="value">${count}x</div><div style="font-size: 0.8em; color: #666; margin-top: 5px;">${cell ? cell.area_um2 + ' µm²' : ''}</div>`);
        }
    }
}

/**
 * Display strategy comparison results
 */
function displayStrategyComparison(results) {
    const resultsContent = d3.select("#results-content");
    resultsContent.selectAll("*").remove();

    const comparisonCard = resultsContent.append("div").attr("class", "result-card fade-in");
    comparisonCard.append("h3").text("⚖️ Strategy Comparison for " + currentGraph.name);
    comparisonCard.append("p").text("Comparison of different cost weight configurations")
        .style("color", "#666").style("margin-bottom", "20px");

    const table = comparisonCard.append("table").attr("class", "mapping-table");
    const thead = table.append("thead");
    const headerRow = thead.append("tr");
    headerRow.append("th").text("Strategy");
    headerRow.append("th").text("Area (µm²)");
    headerRow.append("th").text("Delay (ps)");
    headerRow.append("th").text("Total Cost");
    headerRow.append("th").text("Best For");

    const tbody = table.append("tbody");
    for (const result of results) {
        const row = tbody.append("tr");
        row.append("td").text(result.strategy);
        row.append("td").text(result.area.toFixed(2));
        row.append("td").text(result.delay);
        row.append("td").text(result.total.toFixed(2));

        let bestFor = "";
        if (result.area === results.reduce((min, r) => Math.min(min, r.area), Infinity)) bestFor += "Area ";
        if (result.delay === results.reduce((min, r) => Math.min(min, r.delay), Infinity)) bestFor += "Delay";
        row.append("td").text(bestFor.trim() || "-");
    }

    const bestArea = results.reduce((min, r) => r.area < min.area ? r : min);
    const bestDelay = results.reduce((min, r) => r.delay < min.delay ? r : min);

    comparisonCard.append("div")
        .style("margin-top", "20px")
        .style("padding", "15px")
        .style("background", "#f8f9fa")
        .style("border-radius", "8px")
        .html(`<strong>💡 Recommendations:</strong><br>• For minimum area: Use <strong>${bestArea.strategy}</strong> (${bestArea.area.toFixed(2)} µm²)<br>• For minimum delay: Use <strong>${bestDelay.strategy}</strong> (${bestDelay.delay} ps)`);
}

/**
 * Display library cells
 */
function displayLibraryCells() {
    const libraryCells = d3.select("#library-cells");
    libraryCells.selectAll("*").remove();

    if (!techLib) return;

    for (const cell of techLib.cells) {
        const cellDiv = libraryCells.append("div")
            .attr("class", "library-cell")
            .attr("title", cell.function);

        cellDiv.append("div").attr("class", "cell-prop")
            .html(`<div class="prop-label">Name</div><div class="prop-value">${cell.name}</div>`);
        cellDiv.append("div").attr("class", "cell-prop")
            .html(`<div class="prop-label">Type</div><div class="prop-value">${cell.type}</div>`);
        cellDiv.append("div").attr("class", "cell-prop")
            .html(`<div class="prop-label">Area</div><div class="prop-value">${cell.area_um2} µm²</div>`);
        cellDiv.append("div").attr("class", "cell-prop")
            .html(`<div class="prop-label">Delay</div><div class="prop-value">${cell.delay_ps} ps</div>`);
    }
}

/**
 * Update status bar
 */
function updateStatus(message, type = "info") {
    const statusBar = d3.select("#status-bar");
    statusBar.text(message);
    statusBar.classed("status-success", false);
    statusBar.classed("status-error", false);
    statusBar.classed("status-info", false);
    statusBar.classed(`status-${type}`, true);
}

/**
 * Clear results
 */
function clearResults() {
    const resultsContent = d3.select("#results-content");
    resultsContent.selectAll("*").remove();
    resultsContent.append("p")
        .style("text-align", "center")
        .style("color", "#666")
        .text("No mapping performed yet. Select a graph and click 'Perform Technology Mapping'.");
    updateStatus("Results cleared", "info");
}

/**
 * Export results
 */
function exportResults() {
    if (!currentGraph) {
        updateStatus("No results to export", "error");
        return;
    }

    const resultsContent = document.getElementById("results-content");
    if (resultsContent.children.length === 0 ||
        (resultsContent.children.length === 1 && resultsContent.children[0].tagName === "P")) {
        updateStatus("No results to export", "error");
        return;
    }

    const exportData = {
        graph: currentGraph,
        costWeights: costWeights,
        technologyLibrary: techLib.library_name,
        timestamp: new Date().toISOString(),
        results: "See HTML content"
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `technology_mapping_${currentGraph.id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    updateStatus("Results exported successfully", "success");
}

/**
 * Zoom functions
 */
function zoomIn() {
    if (svg && zoomBehavior) svg.transition().call(zoomBehavior.scaleBy, 1.2);
}

function zoomOut() {
    if (svg && zoomBehavior) svg.transition().call(zoomBehavior.scaleBy, 0.8);
}

function resetZoom() {
    if (svg && zoomBehavior) svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity);
}

function resetGraphView() {
    resetZoom();
    if (currentGraph) visualizeGraph(currentGraph);
}

// Initialize the application when the page loads
document.addEventListener("DOMContentLoaded", initApp);
