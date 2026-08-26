/**
 * Technology Mapper for Digital CMOS Design
 *
 * This module provides the main technology mapping functionality,
 * combining graph loading, DAG covering, and result generation.
 */

class TechnologyMapper {
    constructor() {
        this.techLib = null;
        this.patternLib = null;
        this.graphs = {};
        this.currentGraph = null;
        this.mappingResults = [];
    }

    /**
     * Initialize the mapper with technology and pattern libraries
     */
    initialize(techLib, patternLib) {
        this.techLib = techLib;
        this.patternLib = patternLib;
        return this;
    }

    /**
     * Load a graph from JSON data
     */
    loadGraph(graphData) {
        this.currentGraph = graphData;
        return graphData;
    }

    /**
     * Load multiple graphs
     */
    loadGraphs(graphsData) {
        for (const graph of graphsData) {
            this.graphs[graph.id] = graph;
        }
        return this.graphs;
    }

    /**
     * Perform technology mapping on the current graph
     */
    performMapping(costWeights = null) {
        if (!this.currentGraph) {
            throw new Error("No graph loaded. Call loadGraph() first.");
        }

        if (!this.techLib) {
            throw new Error("No technology library loaded. Call initialize() first.");
        }

        // Override cost weights if provided
        if (costWeights) {
            this.techLib.cost_weights = costWeights;
        }

        // Create DAG covering instance
        const dagCovering = new DAGCovering(this.techLib, this.patternLib);

        // Build the graph
        dagCovering.buildGraph(this.currentGraph);

        // Perform DAG covering
        const result = dagCovering.performDAGCovering();

        // Store result
        this.mappingResults.push({
            graph: this.currentGraph.name,
            result: result,
            stats: dagCovering.getMappingStats(result),
            timestamp: new Date().toISOString()
        });

        return result;
    }

    /**
     * Perform optimal mapping (more expensive but better results)
     */
    performOptimalMapping(costWeights = null) {
        if (!this.currentGraph) {
            throw new Error("No graph loaded. Call loadGraph() first.");
        }

        if (!this.techLib) {
            throw new Error("No technology library loaded. Call initialize() first.");
        }

        // Override cost weights if provided
        if (costWeights) {
            this.techLib.cost_weights = costWeights;
        }

        // Create DAG covering instance
        const dagCovering = new DAGCovering(this.techLib, this.patternLib);

        // Build the graph
        dagCovering.buildGraph(this.currentGraph);

        // Perform optimal DAG covering
        const result = dagCovering.performOptimalDAGCovering();

        // Store result
        this.mappingResults.push({
            graph: this.currentGraph.name,
            result: result,
            stats: dagCovering.getMappingStats(result),
            timestamp: new Date().toISOString()
        });

        return result;
    }

    /**
     * Map all loaded graphs
     */
    mapAllGraphs(costWeights = null) {
        const results = [];

        for (const graphId in this.graphs) {
            const graph = this.graphs[graphId];
            this.loadGraph(graph);
            const result = this.performMapping(costWeights);
            results.push({
                graphId: graphId,
                graphName: graph.name,
                result: result,
                stats: this.mappingResults[this.mappingResults.length - 1].stats
            });
        }

        return results;
    }

    /**
     * Get comparison of different cost weight configurations
     */
    compareCostWeights(graphData, weightConfigurations) {
        const results = [];

        for (const config of weightConfigurations) {
            this.loadGraph(graphData);
            const result = this.performMapping(config);
            results.push({
                weights: config,
                result: result,
                cost: result.totalCost
            });
        }

        return results;
    }

    /**
     * Find the best library cell for a given logic function
     */
    findBestCellForFunction(logicFunction, inputCount) {
        const matchingCells = this.techLib.cells.filter(cell => {
            // Check if cell can implement the function
            if (cell.type === logicFunction) {
                return true;
            }

            // Special cases
            if (logicFunction === 'AND' && cell.type === 'NAND') {
                return true; // NAND can be used with an inverter
            }

            if (logicFunction === 'OR' && cell.type === 'NOR') {
                return true; // NOR can be used with an inverter
            }

            return false;
        });

        // Filter by input count
        const exactMatches = matchingCells.filter(cell => cell.inputs === inputCount);

        if (exactMatches.length > 0) {
            // Return the cell with lowest cost
            exactMatches.sort((a, b) => {
                const aCost = a.area_um2 * this.techLib.cost_weights.area_weight +
                             a.delay_ps * this.techLib.cost_weights.delay_weight;
                const bCost = b.area_um2 * this.techLib.cost_weights.area_weight +
                             b.delay_ps * this.techLib.cost_weights.delay_weight;
                return aCost - bCost;
            });
            return exactMatches[0];
        }

        return null;
    }

    /**
     * Calculate the cost of implementing a gate using library cells
     */
    calculateGateCost(gate) {
        const cell = this.findBestCellForFunction(gate.type, gate.inputs.length);

        if (cell) {
            return {
                cell: cell.name,
                area: cell.area_um2,
                delay: cell.delay_ps,
                power: cell.power_uW,
                total: cell.area_um2 * this.techLib.cost_weights.area_weight +
                      cell.delay_ps * this.techLib.cost_weights.delay_weight
            };
        }

        // If no direct match, try to decompose
        return this.calculateDecomposedCost(gate);
    }

    /**
     * Calculate cost for decomposed implementation
     */
    calculateDecomposedCost(gate) {
        // For example, XOR can be implemented with AND, OR, NOT gates
        if (gate.type === 'XOR' && gate.inputs.length === 2) {
            // XOR = (A AND NOT B) OR (NOT A AND B)
            const notCost = this.findBestCellForFunction('NOT', 1);
            const andCost = this.findBestCellForFunction('AND', 2);
            const orCost = this.findBestCellForFunction('OR', 2);

            const totalArea = 2 * notCost.area_um2 + 2 * andCost.area_um2 + orCost.area_um2;
            const totalDelay = 2 * notCost.delay_ps + 2 * andCost.delay_ps + orCost.delay_ps;

            return {
                cell: 'DECOMPOSED (AND+OR+NOT)',
                area: totalArea,
                delay: totalDelay,
                power: 2 * notCost.power_uW + 2 * andCost.power_uW + orCost.power_uW,
                total: totalArea * this.techLib.cost_weights.area_weight +
                      totalDelay * this.techLib.cost_weights.delay_weight
            };
        }

        return { cell: 'UNKNOWN', area: 0, delay: 0, power: 0, total: 0 };
    }

    /**
     * Generate a report comparing different mapping strategies
     */
    generateComparisonReport(graphData) {
        const strategies = [
            { name: 'Area Optimized', weights: { area_weight: 1.0, delay_weight: 0.0, power_weight: 0.0 } },
            { name: 'Delay Optimized', weights: { area_weight: 0.0, delay_weight: 1.0, power_weight: 0.0 } },
            { name: 'Balanced', weights: { area_weight: 0.5, delay_weight: 0.5, power_weight: 0.0 } }
        ];

        const results = [];

        for (const strategy of strategies) {
            const result = this.compareCostWeights(graphData, [strategy.weights]);
            results.push({
                strategy: strategy.name,
                result: result[0],
                area: result[0].result.totalCost.area,
                delay: result[0].result.totalCost.delay,
                total: result[0].result.totalCost.total
            });
        }

        return {
            graph: graphData.name,
            strategies: results,
            bestByArea: results.reduce((min, curr) => curr.area < min.area ? curr : min),
            bestByDelay: results.reduce((min, curr) => curr.delay < min.delay ? curr : min)
        };
    }
}

/**
 * Helper function to create a technology mapper with default libraries
 */
function createDefaultMapper() {
    const mapper = new TechnologyMapper();

    // Default CMOS library (simplified)
    const defaultTechLib = {
        cells: [
            { name: 'INV', type: 'NOT', inputs: 1, area_um2: 1.2, delay_ps: 45 },
            { name: 'AND2', type: 'AND', inputs: 2, area_um2: 2.8, delay_ps: 120 },
            { name: 'OR2', type: 'OR', inputs: 2, area_um2: 2.4, delay_ps: 90 },
            { name: 'NAND2', type: 'NAND', inputs: 2, area_um2: 2.0, delay_ps: 80 },
            { name: 'NOR2', type: 'NOR', inputs: 2, area_um2: 1.8, delay_ps: 70 }
        ],
        cost_weights: { area_weight: 0.5, delay_weight: 0.5, power_weight: 0.0 }
    };

    // Default pattern library (simplified)
    const defaultPatternLib = {
        patterns: [
            { id: 'inv', name: 'Inverter', type: 'pattern', matches: ['INV'], cost: { area: 1.2, delay: 45 } },
            { id: 'and2', name: '2-input AND', type: 'pattern', matches: ['AND2'], cost: { area: 2.8, delay: 120 } },
            { id: 'or2', name: '2-input OR', type: 'pattern', matches: ['OR2'], cost: { area: 2.4, delay: 90 } }
        ]
    };

    return mapper.initialize(defaultTechLib, defaultPatternLib);
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.TechnologyMapper = TechnologyMapper;
    window.createDefaultMapper = createDefaultMapper;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TechnologyMapper, createDefaultMapper };
}
