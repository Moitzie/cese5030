/**
 * DAG Covering Algorithm for Technology Mapping
 *
 * This algorithm maps a given AND-Inverter graph to a technology library
 * using DAG covering approach. It finds the best matching of library cells
 * to cover the entire graph while minimizing cost (area and delay).
 */

class GraphNode {
    constructor(id, type, inputs = [], output = null) {
        this.id = id;
        this.type = type; // 'input', 'output', 'AND', 'OR', 'NOT', etc.
        this.inputs = inputs; // Array of input node IDs
        this.output = output; // Output node ID (for gates)
        this.fanout = 0;
        this.level = 0; // Depth level in DAG
        this.visited = false;
        this.mappedCell = null; // Reference to mapped library cell
        this.mappedPattern = null; // Reference to matched pattern
    }
}

class GraphEdge {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }
}

class DAGCovering {
    constructor(technologyLibrary, patternLibrary) {
        this.techLib = technologyLibrary;
        this.patternLib = patternLibrary;
        this.graph = null;
        this.nodes = {}; // Node ID -> GraphNode
        this.edges = []; // Array of GraphEdge
        this.inputs = []; // Input node IDs
        this.outputs = []; // Output node IDs
        this.mappingResults = [];
    }

    /**
     * Build the graph from JSON description
     */
    buildGraph(graphData) {
        this.graph = graphData;
        this.nodes = {};
        this.edges = [];
        this.inputs = graphData.inputs || [];
        this.outputs = graphData.outputs || [];

        // Create nodes for inputs
        for (const inputId of this.inputs) {
            this.nodes[inputId] = new GraphNode(inputId, 'input');
        }

        // Create nodes for gates
        for (const gate of graphData.gates) {
            this.nodes[gate.id] = new GraphNode(gate.id, gate.type, gate.inputs, gate.output);
            this.nodes[gate.output] = this.nodes[gate.id]; // Alias
        }

        // Create edges
        for (const gate of graphData.gates) {
            for (const input of gate.inputs) {
                this.edges.push(new GraphEdge(input, gate.id));
            }
            this.edges.push(new GraphEdge(gate.id, gate.output));
        }

        // Calculate levels (depth) for each node
        this.calculateLevels();

        // Calculate fanout for each node
        this.calculateFanout();

        return this.graph;
    }

    /**
     * Calculate depth levels for each node using BFS from inputs
     */
    calculateLevels() {
        const queue = [];

        // Initialize levels for input nodes
        for (const inputId of this.inputs) {
            this.nodes[inputId].level = 0;
            queue.push(inputId);
        }

        // BFS to calculate levels
        while (queue.length > 0) {
            const nodeId = queue.shift();
            const node = this.nodes[nodeId];

            // Find all edges going out from this node
            for (const edge of this.edges) {
                if (edge.from === nodeId) {
                    const toNode = this.nodes[edge.to];
                    if (toNode.level < node.level + 1) {
                        toNode.level = node.level + 1;
                        queue.push(edge.to);
                    }
                }
            }
        }
    }

    /**
     * Calculate fanout for each node
     */
    calculateFanout() {
        // Initialize fanout
        for (const nodeId in this.nodes) {
            this.nodes[nodeId].fanout = 0;
        }

        // Count outgoing edges
        for (const edge of this.edges) {
            this.nodes[edge.from].fanout++;
        }
    }

    /**
     * Find all possible matches for patterns at a given node
     */
    findPatternMatches(nodeId) {
        const matches = [];
        const node = this.nodes[nodeId];

        // Only look for matches at gate nodes (not inputs/outputs)
        if (node.type === 'input' || node.type === 'output') {
            return matches;
        }

        // Check each pattern in the library
        for (const pattern of this.patternLib.patterns) {
            const match = this.checkPatternMatch(nodeId, pattern);
            if (match) {
                matches.push({
                    pattern: pattern,
                    node: nodeId,
                    cost: this.calculateMatchCost(pattern),
                    coverage: this.getCoveredNodes(nodeId, pattern)
                });
            }
        }

        return matches;
    }

    /**
     * Check if a pattern matches at a given node
     */
    checkPatternMatch(nodeId, pattern) {
        const node = this.nodes[nodeId];

        // Pattern must match the node type
        const patternOutputNode = pattern.structure.nodes.find(n => n.id === 'out');
        if (!patternOutputNode) return false;

        // For simple 1:1 matching (node type to pattern)
        const patternGateNode = pattern.structure.nodes.find(n =>
            n.type !== 'input' && n.type !== 'output'
        );

        if (patternGateNode && patternGateNode.type !== node.type) {
            // Special case: NAND can match AND+INV, etc.
            if (node.type === 'AND' && patternGateNode.type === 'NAND') {
                return false; // For now, require exact type match
            }
            if (node.type === 'OR' && patternGateNode.type === 'NOR') {
                return false;
            }
        }

        // Check if the pattern structure matches
        // This is simplified - a full implementation would do structural matching
        return true;
    }

    /**
     * Calculate the cost of a pattern match
     */
    calculateMatchCost(pattern) {
        const libraryCell = this.techLib.cells.find(cell =>
            cell.name === pattern.matches[0]
        );

        if (libraryCell) {
            return {
                area: libraryCell.area_um2,
                delay: libraryCell.delay_ps,
                total: libraryCell.area_um2 * this.techLib.cost_weights.area_weight +
                      libraryCell.delay_ps * this.techLib.cost_weights.delay_weight
            };
        }

        // If no direct match, calculate from component costs
        let totalArea = 0;
        let totalDelay = 0;

        for (const match of pattern.matches) {
            const cell = this.techLib.cells.find(c => c.name === match);
            if (cell) {
                totalArea += cell.area_um2;
                totalDelay += cell.delay_ps;
            }
        }

        return {
            area: totalArea,
            delay: totalDelay,
            total: totalArea * this.techLib.cost_weights.area_weight +
                  totalDelay * this.techLib.cost_weights.delay_weight
        };
    }

    /**
     * Get all nodes covered by a pattern match
     */
    getCoveredNodes(nodeId, pattern) {
        // Simplified: for now, just return the node itself
        // A full implementation would traverse the pattern structure
        return [nodeId];
    }

    /**
     * DAG Covering Algorithm
     *
     * This is a greedy algorithm that:
     * 1. Processes nodes in topological order (from outputs backward)
     * 2. At each node, finds the best pattern match
     * 3. Marks covered nodes as visited
     * 4. Continues until all nodes are covered
     */
    performDAGCovering() {
        this.mappingResults = [];
        const coveredNodes = new Set();
        const mapping = {};

        // Reset visited flags
        for (const nodeId in this.nodes) {
            this.nodes[nodeId].visited = false;
        }

        // Sort outputs by level (process deepest first)
        const outputsByLevel = this.outputs
            .map(outId => this.nodes[outId])
            .filter(node => node)
            .sort((a, b) => b.level - a.level);

        // Process each output
        for (const outputNode of outputsByLevel) {
            this.coverOutputDAG(outputNode.id, coveredNodes, mapping);
        }

        // Check if all gates are covered
        for (const gate of this.graph.gates) {
            if (!coveredNodes.has(gate.id)) {
                // Try to cover remaining nodes
                this.coverRemainingNodes(coveredNodes, mapping);
                break;
            }
        }

        // Calculate total cost
        const totalCost = this.calculateTotalCost(mapping);

        return {
            mapping: mapping,
            coveredNodes: Array.from(coveredNodes),
            totalCost: totalCost,
            success: coveredNodes.size >= this.graph.gates.length
        };
    }

    /**
     * Cover the DAG from an output node backward
     */
    coverOutputDAG(outputNodeId, coveredNodes, mapping) {
        const stack = [outputNodeId];

        while (stack.length > 0) {
            const nodeId = stack.pop();

            // Skip if already covered
            if (coveredNodes.has(nodeId)) continue;

            const node = this.nodes[nodeId];

            // If it's an input, we're done with this branch
            if (node.type === 'input') {
                coveredNodes.add(nodeId);
                continue;
            }

            // Find the best pattern match at this node
            const matches = this.findPatternMatches(nodeId);

            if (matches.length > 0) {
                // Sort matches by cost (lowest first)
                matches.sort((a, b) => a.cost.total - b.cost.total);

                const bestMatch = matches[0];

                // Map this node to the best pattern
                mapping[nodeId] = {
                    pattern: bestMatch.pattern,
                    cell: bestMatch.pattern.matches[0],
                    cost: bestMatch.cost,
                    coveredNodes: bestMatch.coverage
                };

                // Mark all covered nodes
                for (const coveredNodeId of bestMatch.coverage) {
                    coveredNodes.add(coveredNodeId);
                }

                // Add input nodes to stack for processing
                for (const inputId of node.inputs) {
                    if (!coveredNodes.has(inputId)) {
                        stack.push(inputId);
                    }
                }
            } else {
                // No pattern match found, try to cover inputs
                for (const inputId of node.inputs) {
                    if (!coveredNodes.has(inputId)) {
                        stack.push(inputId);
                    }
                }
            }
        }
    }

    /**
     * Cover any remaining uncovered nodes
     */
    coverRemainingNodes(coveredNodes, mapping) {
        // Find all uncovered gate nodes
        const uncoveredGates = this.graph.gates.filter(
            gate => !coveredNodes.has(gate.id)
        );

        // Try to map each uncovered gate individually
        for (const gate of uncoveredGates) {
            const node = this.nodes[gate.id];

            // Find library cell that matches this gate type
            const cell = this.techLib.cells.find(c =>
                c.type === node.type && c.inputs === node.inputs.length
            );

            if (cell) {
                mapping[gate.id] = {
                    pattern: null,
                    cell: cell.name,
                    cost: {
                        area: cell.area_um2,
                        delay: cell.delay_ps,
                        total: cell.area_um2 * this.techLib.cost_weights.area_weight +
                              cell.delay_ps * this.techLib.cost_weights.delay_weight
                    },
                    coveredNodes: [gate.id]
                };
                coveredNodes.add(gate.id);
            }
        }
    }

    /**
     * Calculate total cost of the mapping
     */
    calculateTotalCost(mapping) {
        let totalArea = 0;
        let totalDelay = 0;
        let maxDelay = 0; // Critical path delay

        for (const nodeId in mapping) {
            const map = mapping[nodeId];
            totalArea += map.cost.area;

            // For delay, we need to consider the critical path
            const node = this.nodes[nodeId];
            const pathDelay = map.cost.delay * (node.level + 1);
            if (pathDelay > maxDelay) {
                maxDelay = pathDelay;
            }
        }

        return {
            area: totalArea,
            delay: maxDelay,
            total: totalArea * this.techLib.cost_weights.area_weight +
                  maxDelay * this.techLib.cost_weights.delay_weight
        };
    }

    /**
     * Alternative: Optimal DAG Covering using dynamic programming
     * This is more sophisticated but computationally expensive
     */
    performOptimalDAGCovering() {
        const results = this.performDAGCovering();

        // For now, return the greedy result
        // A full optimal implementation would use DP to find the minimum cost covering
        results.algorithm = "greedy";

        return results;
    }

    /**
     * Get mapping statistics
     */
    getMappingStats(mappingResult) {
        const cellUsage = {};

        for (const nodeId in mappingResult.mapping) {
            const cellName = mappingResult.mapping[nodeId].cell;
            cellUsage[cellName] = (cellUsage[cellName] || 0) + 1;
        }

        return {
            cellUsage: cellUsage,
            totalCells: Object.keys(cellUsage).length,
            totalGatesMapped: Object.keys(mappingResult.mapping).length,
            coveragePercentage: (mappingResult.coveredNodes.length / this.graph.gates.length) * 100
        };
    }

    /**
     * Export mapping result to JSON
     */
    exportMappingResult(mappingResult) {
        return {
            graph: this.graph.name,
            mapping: mappingResult.mapping,
            stats: this.getMappingStats(mappingResult),
            cost: mappingResult.totalCost,
            success: mappingResult.success,
            timestamp: new Date().toISOString()
        };
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.DAGCovering = DAGCovering;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DAGCovering;
}
