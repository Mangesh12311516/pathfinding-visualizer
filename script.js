document.addEventListener('DOMContentLoaded', () => {

    // --- A Priority Queue Implementation (Min-Heap) ---
    class PriorityQueue {
        constructor() { this.heap = []; }
        enqueue(node, priority) { this.heap.push({ node, priority }); this.siftUp(); }
        dequeue() {
            if (this.isEmpty()) return null;
            this.swap(0, this.heap.length - 1);
            const { node } = this.heap.pop();
            this.siftDown();
            return node;
        }
        siftUp() {
            let index = this.heap.length - 1;
            while (index > 0) {
                const parentIndex = Math.floor((index - 1) / 2);
                if (this.heap[parentIndex].priority > this.heap[index].priority) {
                    this.swap(parentIndex, index);
                    index = parentIndex;
                } else { break; }
            }
        }
        siftDown() {
            let index = 0;
            const length = this.heap.length;
            const element = this.heap[0];
            while (true) {
                let leftChildIndex = 2 * index + 1, rightChildIndex = 2 * index + 2;
                let leftChild, rightChild, swapIndex = null;
                if (leftChildIndex < length) {
                    leftChild = this.heap[leftChildIndex];
                    if (leftChild.priority < element.priority) swapIndex = leftChildIndex;
                }
                if (rightChildIndex < length) {
                    rightChild = this.heap[rightChildIndex];
                    if ((swapIndex === null && rightChild.priority < element.priority) || (swapIndex !== null && rightChild.priority < leftChild.priority)) {
                        swapIndex = rightChildIndex;
                    }
                }
                if (swapIndex === null) break;
                this.swap(index, swapIndex);
                index = swapIndex;
            }
        }
        swap(i, j) { [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]]; }
        isEmpty() { return this.heap.length === 0; }
    }

    // --- DOM Elements ---
    const gridContainer = document.getElementById('grid-container');
    const visualizeBtn = document.getElementById('visualize-btn');
    const clearBoardBtn = document.getElementById('clear-board-btn');
    const clearPathBtn = document.getElementById('clear-path-btn');
    const algorithmSelect = document.getElementById('algorithm-select');
    const statsMessage = document.getElementById('stats-message');
    const statsTime = document.getElementById('stats-time');
    const statsVisited = document.getElementById('stats-visited');
    const statsPath = document.getElementById('stats-path');

    // --- Grid Settings ---
    const GRID_WIDTH = 50; const GRID_HEIGHT = 20;
    const WEIGHTS = { light: 5, heavy: 20, negative: -5 };
    let grid = [], startNodeCoords = { row: 10, col: 5 }, endNodeCoords = { row: 10, col: 45 };

    // --- State Variables ---
    let isMouseDown = false, algorithmRunning = false, movingStartNode = false, movingEndNode = false, currentBrush = 'wall';

    // --- Node Class ---
    class Node {
        constructor(row, col) {
            this.row = row; this.col = col; this.isStart = false; this.isEnd = false;
            this.isWall = false; this.weight = 0; this.distance = Infinity;
            this.hCost = Infinity; this.fCost = Infinity; this.isVisited = false;
            this.previousNode = null; this.element = document.createElement('div');
            this.element.className = 'node'; this.element.id = `node-${row}-${col}`;
        }
        reset() {
            this.isWall = false; this.weight = 0;
            this.element.className = 'node';
            if (this.isStart) this.element.classList.add('node-start');
            if (this.isEnd) this.element.classList.add('node-end');
        }
    }

    // --- Grid Creation & Editing ---
    function createGrid() {
        gridContainer.innerHTML = ''; grid = [];
        gridContainer.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, 25px)`;
        for (let row = 0; row < GRID_HEIGHT; row++) {
            const currentRow = [];
            for (let col = 0; col < GRID_WIDTH; col++) {
                const node = new Node(row, col);
                addNodeEventListeners(node);
                gridContainer.appendChild(node.element);
                currentRow.push(node);
            }
            grid.push(currentRow);
        }
        updateStartNode(startNodeCoords.row, startNodeCoords.col);
        updateEndNode(endNodeCoords.row, endNodeCoords.col);
    }
    function addNodeEventListeners(node) {
        node.element.onmousedown = (e) => {
            e.preventDefault(); if (algorithmRunning) return; isMouseDown = true;
            if (node.isStart) movingStartNode = true;
            else if (node.isEnd) movingEndNode = true;
            else editNode(node);
        };
        node.element.onmouseenter = () => {
            if (algorithmRunning || !isMouseDown) return;
            if (movingStartNode) updateStartNode(node.row, node.col);
            else if (movingEndNode) updateEndNode(node.row, node.col);
            else editNode(node);
        };
    }
    document.onmouseup = () => { isMouseDown = false; movingStartNode = false; movingEndNode = false; };
    document.querySelectorAll('input[name="brush"]').forEach(radio => { radio.onchange = () => currentBrush = radio.value; });
    function editNode(node) {
        if (node.isStart || node.isEnd) return;
        node.reset();
        switch (currentBrush) {
            case 'wall': node.isWall = true; node.element.classList.add('node-wall'); break;
            case 'weight_light': node.weight = WEIGHTS.light; node.element.classList.add('node-weight-light'); break;
            case 'weight_heavy': node.weight = WEIGHTS.heavy; node.element.classList.add('node-weight-heavy'); break;
            case 'weight_negative': node.weight = WEIGHTS.negative; node.element.classList.add('node-weight-negative'); break;
            case 'erase': break;
        }
    }
    function updateStartNode(row, col) {
        const newStartNode = grid[row][col];
        if (newStartNode.isEnd || newStartNode.isWall) return;
        grid[startNodeCoords.row][startNodeCoords.col].isStart = false;
        grid[startNodeCoords.row][startNodeCoords.col].element.classList.remove('node-start');
        startNodeCoords = { row, col };
        newStartNode.isStart = true; newStartNode.element.classList.add('node-start');
    }
    function updateEndNode(row, col) {
        const newEndNode = grid[row][col];
        if (newEndNode.isStart || newEndNode.isWall) return;
        grid[endNodeCoords.row][endNodeCoords.col].isEnd = false;
        grid[endNodeCoords.row][endNodeCoords.col].element.classList.remove('node-end');
        endNodeCoords = { row, col };
        newEndNode.isEnd = true; newEndNode.element.classList.add('node-end');
    }

    // --- Controls ---
    visualizeBtn.onclick = () => { if (!algorithmRunning) visualizeAlgorithm(algorithmSelect.value); };
    clearBoardBtn.onclick = () => { if (!algorithmRunning) { createGrid(); clearStats(); } };
    clearPathBtn.onclick = () => {
        if (algorithmRunning) return;
        for (let row of grid) {
            for (let node of row) {
                node.isVisited = false; node.distance = Infinity;
                node.hCost = Infinity; node.fCost = Infinity; node.previousNode = null;
                if (!node.isStart && !node.isEnd && !node.isWall) {
                    node.element.classList.remove('node-visited', 'node-shortest-path', 'node-negative-cycle');
                }
            }
        }
        clearStats();
    };
    function clearStats() {
        statsMessage.textContent = 'Select an algorithm and click Visualize!';
        statsMessage.classList.remove('warning');
        statsTime.textContent = ''; statsVisited.textContent = ''; statsPath.textContent = '';
    }
    
    // --- Visualization ---
    async function visualizeAlgorithm(algorithm) {
        algorithmRunning = true; clearPathBtn.click();
        const startNode = grid[startNodeCoords.row][startNodeCoords.col];
        const endNode = grid[endNodeCoords.row][endNodeCoords.col];
        const hasNegativeWeights = grid.flat().some(node => node.weight < 0);
        if (hasNegativeWeights && (algorithm === 'dijkstra' || algorithm === 'astar')) {
            statsMessage.textContent = "Warning: Dijkstra/A* may fail with negative weights!";
            statsMessage.classList.add('warning');
        }

        const startTime = performance.now();
        let result = {};

        switch(algorithm) {
            case 'dijkstra': result = { visitedNodes: dijkstra(startNode, endNode) }; break;
            case 'astar': result = { visitedNodes: aStar(startNode, endNode) }; break;
            case 'bellmanford': result = bellmanFord(startNode, endNode); break;
            case 'bfs': result = { visitedNodes: bfs(startNode, endNode) }; break;
            case 'dfs': result = { visitedNodes: dfs(startNode, endNode) }; break;
            default: return;
        }
        const endTime = performance.now();

        if (result.cycleDetected) {
            statsMessage.textContent = "Error: Negative Weight Cycle Detected!";
            statsMessage.classList.add('warning');
            await animateCycle(result.cycleNodes);
        } else {
            const path = getNodesInShortestPathOrder(endNode);
            updateStats(endTime - startTime, result.visitedNodes.length, path);
            await animateVisualization(result.visitedNodes, path);
        }
        algorithmRunning = false;
    }

    function updateStats(time, visitedCount, path) {
        statsTime.textContent = `Time: ${Math.round(time)}ms`;
        statsVisited.textContent = `Visited: ${visitedCount} nodes`;
        const endNode = grid[endNodeCoords.row][endNodeCoords.col];
        if (endNode.previousNode === null) {
            if (!statsMessage.classList.contains('warning')) {
                statsMessage.textContent = 'Path Not Found!';
            }
            statsPath.textContent = 'Path: 0 nodes';
        } else {
            if (!statsMessage.classList.contains('warning')) {
                statsMessage.textContent = 'Path Found!';
            }
            statsPath.textContent = `Path: ${path.length} nodes`;
        }
    }
    async function animateVisualization(visited, path) {
        for (let i = 0; i < visited.length; i++) {
            await new Promise(resolve => setTimeout(() => {
                if (visited[i] && !visited[i].isStart && !visited[i].isEnd) {
                    visited[i].element.classList.add('node-visited');
                }
                resolve();
            }, 10));
        }
        await animateShortestPath(path);
    }
    async function animateShortestPath(path) {
        for (let i = 0; i < path.length; i++) {
             await new Promise(resolve => setTimeout(() => {
                if (path[i] && !path[i].isStart && !path[i].isEnd) {
                    path[i].element.classList.add('node-shortest-path');
                }
                resolve();
            }, 30));
        }
    }
    async function animateCycle(cycleNodes) { for(const node of cycleNodes) { node.element.classList.add('node-negative-cycle'); } }
    function getNodesInShortestPathOrder(endNode) {
        const path = []; let currentNode = endNode;
        while (currentNode !== null) { path.unshift(currentNode); currentNode = currentNode.previousNode; }
        return path;
    }
    
    // --- Pathfinding Algorithms ---

    function bellmanFord(startNode, endNode) {
        const visitedNodesInOrder = []; const allNodes = grid.flat();
        allNodes.forEach(node => node.distance = Infinity);
        startNode.distance = 0;
        visitedNodesInOrder.push(startNode);
        for (let i = 0; i < allNodes.length - 1; i++) {
            const nodesRelaxedInThisIteration = new Set();
            for (const node of allNodes) {
                if (node.distance === Infinity || node.isWall) continue;
                for (const neighbor of getNeighbors(node)) {
                    if (neighbor.isWall) continue;
                    const edgeCost = 1 + neighbor.weight;
                    if (node.distance + edgeCost < neighbor.distance) {
                        neighbor.distance = node.distance + edgeCost;
                        neighbor.previousNode = node;
                        nodesRelaxedInThisIteration.add(neighbor);
                    }
                }
            }
            if (nodesRelaxedInThisIteration.size === 0) break;
            nodesRelaxedInThisIteration.forEach(node => visitedNodesInOrder.push(node));
        }
        const cycleNodes = [];
        for (const node of allNodes) {
            if (node.distance === Infinity || node.isWall) continue;
            for (const neighbor of getNeighbors(node)) {
                if (neighbor.isWall) continue;
                const edgeCost = 1 + neighbor.weight;
                if (node.distance + edgeCost < neighbor.distance) cycleNodes.push(neighbor);
            }
        }
        return { visitedNodes: visitedNodesInOrder, cycleDetected: cycleNodes.length > 0, cycleNodes: cycleNodes };
    }

    function dijkstra(startNode, endNode) {
        const visitedNodesInOrder = []; const pq = new PriorityQueue();
        startNode.distance = 0;
        pq.enqueue(startNode, 0);
        while (!pq.isEmpty()) {
            const closestNode = pq.dequeue();
            if (closestNode.isVisited || closestNode.isWall) continue;
            closestNode.isVisited = true;
            visitedNodesInOrder.push(closestNode);
            if (closestNode === endNode) return visitedNodesInOrder;
            for (const neighbor of getNeighbors(closestNode)) {
                if (neighbor.isVisited) continue;
                let costToNeighbor = closestNode.distance + 1 + neighbor.weight;
                if (costToNeighbor < neighbor.distance) {
                    neighbor.distance = costToNeighbor;
                    neighbor.previousNode = closestNode;
                    pq.enqueue(neighbor, neighbor.distance);
                }
            }
        }
        return visitedNodesInOrder;
    }

    function aStar(startNode, endNode) {
        const visitedNodesInOrder = []; const pq = new PriorityQueue();
        startNode.distance = 0;
        startNode.hCost = heuristic(startNode, endNode);
        startNode.fCost = startNode.hCost;
        pq.enqueue(startNode, startNode.fCost);
        while (!pq.isEmpty()) {
            const currentNode = pq.dequeue();
            if (currentNode.isVisited || currentNode.isWall) continue;
            currentNode.isVisited = true;
            visitedNodesInOrder.push(currentNode);
            if (currentNode === endNode) return visitedNodesInOrder;
            for (const neighbor of getNeighbors(currentNode)) {
                if (neighbor.isVisited) continue;
                const gCost = currentNode.distance + 1 + neighbor.weight;
                if (gCost < neighbor.distance) {
                    neighbor.previousNode = currentNode;
                    neighbor.distance = gCost;
                    neighbor.hCost = heuristic(neighbor, endNode);
                    neighbor.fCost = neighbor.distance + neighbor.hCost;
                    pq.enqueue(neighbor, neighbor.fCost);
                }
            }
        }
        return visitedNodesInOrder;
    }

    function bfs(startNode, endNode) {
        const visitedNodesInOrder = []; const queue = [startNode];
        startNode.isVisited = true;
        while (queue.length) {
            const currentNode = queue.shift();
            if (currentNode.isWall) continue;
            visitedNodesInOrder.push(currentNode);
            if (currentNode === endNode) return visitedNodesInOrder;
            for (const neighbor of getNeighbors(currentNode)) {
                if (!neighbor.isVisited) {
                    neighbor.isVisited = true; neighbor.previousNode = currentNode;
                    queue.push(neighbor);
                }
            }
        }
        return visitedNodesInOrder;
    }

    function dfs(startNode, endNode) {
        const visitedNodesInOrder = []; const stack = [startNode];
        while(stack.length) {
            const currentNode = stack.pop();
            if(currentNode.isWall || currentNode.isVisited) continue;
            currentNode.isVisited = true;
            visitedNodesInOrder.push(currentNode);
            if (currentNode === endNode) return visitedNodesInOrder;
            for (const neighbor of getNeighbors(currentNode).reverse()) {
                 if (!neighbor.isVisited) {
                    neighbor.previousNode = currentNode;
                    stack.push(neighbor);
                 }
            }
        }
        return visitedNodesInOrder;
    }
    
    // --- Helper Functions ---
    function heuristic(nodeA, nodeB) {
        const dx = Math.abs(nodeA.col - nodeB.col);
        const dy = Math.abs(nodeA.row - nodeB.row);
        return dx + dy;
    }
    function getNeighbors(node) {
        const neighbors = [];
        const { col, row } = node;
        if (row > 0) neighbors.push(grid[row - 1][col]);
        if (row < GRID_HEIGHT - 1) neighbors.push(grid[row + 1][col]);
        if (col > 0) neighbors.push(grid[row][col - 1]);
        if (col < GRID_WIDTH - 1) neighbors.push(grid[row][col + 1]);
        return neighbors;
    }

    // --- Initial Setup ---
    createGrid();
});