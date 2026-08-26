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
    // In a real browser environment, we would fetch these files
    // For this implementation, we'll use the pre-defined graph data

    // Graph 1: Simple AND
    graphs.graph1 = {
        id: "graph1",
        name: "Simple AND Function",
        description: "Basic 2-input AND gate with inputs A and B",
        inputs: ["A", "B"],
        outputs: ["Y"],
        gates: [
            {
                id: "g1",
                type: "AND",
                inputs: ["A", "B"],
                output: "Y"
            }
        ],
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
            {
                id: "g1",
                type: "AND",
                inputs: ["A", "B"],
                output: "net1"
            },
            {
                id: "g2",
                type: "AND",
                inputs: ["C", "D"],
                output: "net2"
            },
            {
                id: "g3",
                type: "OR",
                inputs: ["net1", "net2"],
                output: "Y"
            }
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
            {
                id: "g1",
                type: "AND",
                inputs: ["A", "B"],
                output: "net1"
            },
            {
                id: "g2",
                type: "AND",
                inputs: ["C", "D"],
                output: "net2"
            },
            {
                id: "g3",
                type: "OR",
                inputs: ["net1", "net2"],
                output: "net3"
            },
            {
                id: "g4",
                type: "AND",
                inputs: ["net3", "A"],
                output: "net4"
            },
            {
                id: "g5",
                type: "NOT",
                inputs: ["net4"],
                output: "Y"
            },
            {
                id: "g6",
                type: "AND",
                inputs: ["net1", "net2"],
                output: "Z"
            }
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
            {
                id: "g1",
                type: "NOT",
                inputs: ["A"],
                output: "notA"
            },
            {
                id: "g2",
                type: "NOT",
                inputs: ["B"],
                output: "notB"
            },
            {
                id: "g3",
                type: "AND",
                inputs: ["A", "notB"],
                output: "net1"
            },
            {
                id: "g4",
                type: "AND",
                inputs: ["notA", "B"],
                output: "net2"
            },
            {
                id: "g5",
                type: "OR",
                inputs: ["net1", "net2"],
                output: "Y"
            }
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
            {
                id: "g1",
                type: "AND",
                inputs: ["A", "B"],
                output: "Carry"
            },
            {
                id: "g2",
                type: "NOT",
                inputs: ["A"],
                output: "notA"
            },
            {
                id: "g3",
                type: "NOT",
                inputs: ["B"],
                output: "notB"
            },
            {
                id: "g4",
                type: "AND",
                inputs: ["A", "notB"],
                output: "net1"
            },
            {
                id: "g5",
               
