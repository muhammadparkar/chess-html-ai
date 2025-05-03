var board,
    game = new Chess();

// Add visualization variables
var visualizeMoves = [];
var isVisualizationEnabled = false;

// Add visualization state
var visualizeMode = false;
var visualizationData = {
    nodes: [],
    currentDepth: 0,
    maxDepth: 0
};

// Add these variables at the top of the file, after the existing variables
var lastMoveEvaluations = [];

/*The "AI" part starts here */

var minimaxRoot = function(depth, game, isMaximisingPlayer) {
    // Clear previous visualization data if enabled
    if (isVisualizationEnabled) {
        visualizeMoves = [];
    }

    // Reset visualization data
    visualizationData = {
        nodes: [],
        currentDepth: 0,
        maxDepth: depth
    };

    // Clear previous evaluations
    lastMoveEvaluations = [];

    var newGameMoves = game.ugly_moves();
    var bestMove = -9999;
    var bestMoveFound;

    for(var i = 0; i < newGameMoves.length; i++) {
        var newGameMove = newGameMoves[i];
        game.ugly_move(newGameMove);
        
        // Save the move being evaluated if visualization is enabled
        if (isVisualizationEnabled) {
            var moveInfo = {
                from: newGameMove.from,
                to: newGameMove.to,
                piece: newGameMove.piece,
                fen: game.fen(),
                depth: 0,
                evaluation: "Calculating..."
            };
            visualizeMoves.push(moveInfo);
        }

        // Add root node to visualization
        var nodeId = 'root-' + i;
        if (visualizeMode) {
            visualizationData.nodes.push({
                id: nodeId,
                parent: null,
                move: formatMove(newGameMove),
                depth: 0,
                alpha: -10000,
                beta: 10000,
                evaluation: '?',
                position: game.fen()
            });
        }
        
        // Store the current position
        var currentFen = game.fen();

        var value = minimax(depth - 1, game, -10000, 10000, !isMaximisingPlayer, nodeId);
        game.undo();
        
        // Store evaluation data
        lastMoveEvaluations.push({
            move: formatMove(newGameMove),
            value: value,
            fen: currentFen,
            isBest: false
        });

        // Update evaluation if visualization is enabled
        if (isVisualizationEnabled && visualizeMoves.length > i) {
            visualizeMoves[i].evaluation = value;
        }

        // Update node evaluation
        if (visualizeMode) {
            updateNodeEvaluation(nodeId, value);
        }
        
        if(value >= bestMove) {
            bestMove = value;
            bestMoveFound = newGameMove;
            
            // Mark as best move if visualization is enabled
            if (isVisualizationEnabled && visualizeMoves.length > i) {
                visualizeMoves[i].isBest = true;
            }

            // Mark best move in visualization
            if (visualizeMode) {
                markBestMove(nodeId);
            }

            // Mark this as the best move in our evaluations
            for (var j = 0; j < lastMoveEvaluations.length; j++) {
                lastMoveEvaluations[j].isBest = (j === i);
            }
        }
    }
    
    // Display visualization if enabled
    if (isVisualizationEnabled) {
        displayVisualization();
    }

    // Display visualization if enabled
    if (visualizeMode) {
        renderVisualization();
    }
    
    return bestMoveFound;
};

var minimax = function (depth, game, alpha, beta, isMaximisingPlayer, parentNodeId) {
    positionCount++;
    visualizationData.currentDepth = visualizationData.maxDepth - depth;
    
    if (depth === 0) {
        var evaluation = -evaluateBoard(game.board());
        
        // Add leaf node to visualization
        if (visualizeMode && parentNodeId) {
            var leafNodeId = parentNodeId + '-leaf-' + positionCount;
            visualizationData.nodes.push({
                id: leafNodeId,
                parent: parentNodeId,
                move: 'Leaf',
                depth: visualizationData.currentDepth,
                alpha: alpha,
                beta: beta,
                evaluation: evaluation,
                position: game.fen(),
                isLeaf: true
            });
        }
        
        return evaluation;
    }

    var newGameMoves = game.ugly_moves();

    if (isMaximisingPlayer) {
        var bestMove = -9999;
        for (var i = 0; i < newGameMoves.length; i++) {
            var currentMove = newGameMoves[i];
            game.ugly_move(currentMove);
            
            // Add node to visualization
            var nodeId = parentNodeId ? parentNodeId + '-' + i : 'node-' + positionCount;
            if (visualizeMode) {
                visualizationData.nodes.push({
                    id: nodeId,
                    parent: parentNodeId,
                    move: formatMove(currentMove),
                    depth: visualizationData.currentDepth,
                    alpha: alpha,
                    beta: beta,
                    evaluation: '?',
                    position: game.fen()
                });
            }
            
            var value = minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer, nodeId);
            game.undo();
            
            // Update node evaluation
            if (visualizeMode) {
                updateNodeEvaluation(nodeId, value);
            }
            
            bestMove = Math.max(bestMove, value);
            alpha = Math.max(alpha, bestMove);
            
            // Update alpha in visualization
            if (visualizeMode) {
                updateAlphaBeta(nodeId, alpha, beta);
            }
            
            if (beta <= alpha) {
                if (visualizeMode) {
                    markPruned(nodeId);
                }
                return bestMove;
            }
        }
        return bestMove;
    } else {
        var bestMove = 9999;
        for (var i = 0; i < newGameMoves.length; i++) {
            var currentMove = newGameMoves[i];
            game.ugly_move(currentMove);
            
            // Add node to visualization
            var nodeId = parentNodeId ? parentNodeId + '-' + i : 'node-' + positionCount;
            if (visualizeMode) {
                visualizationData.nodes.push({
                    id: nodeId,
                    parent: parentNodeId,
                    move: formatMove(currentMove),
                    depth: visualizationData.currentDepth,
                    alpha: alpha,
                    beta: beta,
                    evaluation: '?',
                    position: game.fen()
                });
            }
            
            var value = minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer, nodeId);
            game.undo();
            
            // Update node evaluation
            if (visualizeMode) {
                updateNodeEvaluation(nodeId, value);
            }
            
            bestMove = Math.min(bestMove, value);
            beta = Math.min(beta, bestMove);
            
            // Update beta in visualization
            if (visualizeMode) {
                updateAlphaBeta(nodeId, alpha, beta);
            }
            
            if (beta <= alpha) {
                if (visualizeMode) {
                    markPruned(nodeId);
                }
                return bestMove;
            }
        }
        return bestMove;
    }
};

// Helper functions for visualization
function formatMove(move) {
    if (move.captured) {
        return move.piece.toUpperCase() + '@' + move.from + 'x' + move.to;
    }
    return move.piece.toUpperCase() + '@' + move.from + '-' + move.to;
}

function updateNodeEvaluation(nodeId, value) {
    for (var i = 0; i < visualizationData.nodes.length; i++) {
        if (visualizationData.nodes[i].id === nodeId) {
            visualizationData.nodes[i].evaluation = value;
            break;
        }
    }
}

function updateAlphaBeta(nodeId, alpha, beta) {
    for (var i = 0; i < visualizationData.nodes.length; i++) {
        if (visualizationData.nodes[i].id === nodeId) {
            visualizationData.nodes[i].alpha = alpha;
            visualizationData.nodes[i].beta = beta;
            break;
        }
    }
}

function markBestMove(nodeId) {
    for (var i = 0; i < visualizationData.nodes.length; i++) {
        visualizationData.nodes[i].isBest = (visualizationData.nodes[i].id === nodeId);
    }
}

function markPruned(nodeId) {
    for (var i = 0; i < visualizationData.nodes.length; i++) {
        if (visualizationData.nodes[i].id === nodeId) {
            visualizationData.nodes[i].pruned = true;
            break;
        }
    }
}

function renderVisualization() {
    var container = document.getElementById('visualization-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'visualization-container';
        document.body.appendChild(container);
    }
    
    // Clear previous visualization
    container.innerHTML = '';
    
    // Create visualization structure based on node tree
    var treeContainer = document.createElement('div');
    treeContainer.className = 'tree-container';
    container.appendChild(treeContainer);
    
    // Create legend
    var legend = document.createElement('div');
    legend.className = 'viz-legend';
    legend.innerHTML = '<span class="best-move">■ Best move</span> <span class="pruned-node">■ Pruned branch</span>';
    container.appendChild(legend);
    
    // Group nodes by depth
    var nodesByDepth = {};
    for (var i = 0; i < visualizationData.nodes.length; i++) {
        var node = visualizationData.nodes[i];
        if (!nodesByDepth[node.depth]) {
            nodesByDepth[node.depth] = [];
        }
        nodesByDepth[node.depth].push(node);
    }
    
    // Create levels from top to bottom
    for (var depth = 0; depth <= visualizationData.maxDepth; depth++) {
        var levelNodes = nodesByDepth[depth] || [];
        if (levelNodes.length === 0) continue;
        
        var levelDiv = document.createElement('div');
        levelDiv.className = 'tree-level';
        levelDiv.setAttribute('data-depth', depth);
        treeContainer.appendChild(levelDiv);
        
        for (var j = 0; j < levelNodes.length; j++) {
            var node = levelNodes[j];
            var nodeDiv = createNodeElement(node);
            levelDiv.appendChild(nodeDiv);
        }
    }
    
    // Draw connections between nodes
    drawConnections();
}

function createNodeElement(node) {
    var nodeDiv = document.createElement('div');
    nodeDiv.className = 'tree-node';
    nodeDiv.id = 'viz-' + node.id;
    
    if (node.isBest) nodeDiv.classList.add('best-move');
    if (node.pruned) nodeDiv.classList.add('pruned-node');
    if (node.isLeaf) nodeDiv.classList.add('leaf-node');
    
    nodeDiv.innerHTML = `
        <div class="node-move">${node.move}</div>
        <div class="node-eval">Eval: ${node.evaluation !== '?' ? node.evaluation.toFixed(2) : '?'}</div>
        <div class="node-alpha-beta">α: ${node.alpha} β: ${node.beta}</div>
    `;
    
    // Add hover functionality to show position
    nodeDiv.setAttribute('data-position', node.position);
    nodeDiv.addEventListener('mouseenter', function() {
        showPosition(node.position);
    });
    nodeDiv.addEventListener('mouseleave', function() {
        hidePosition();
    });
    
    return nodeDiv;
}

function drawConnections() {
    // Create connections between parent and child nodes
    for (var i = 0; i < visualizationData.nodes.length; i++) {
        var node = visualizationData.nodes[i];
        if (node.parent) {
            var parentElement = document.getElementById('viz-' + node.parent);
            var childElement = document.getElementById('viz-' + node.id);
            
            if (parentElement && childElement) {
                drawLine(parentElement, childElement);
            }
        }
    }
}

function drawLine(parent, child) {
    var line = document.createElement('div');
    line.className = 'tree-line';
    
    var parentRect = parent.getBoundingClientRect();
    var childRect = child.getBoundingClientRect();
    var containerRect = document.querySelector('.tree-container').getBoundingClientRect();
    
    // Calculate positions relative to the container
    var x1 = parentRect.left + parentRect.width / 2 - containerRect.left;
    var y1 = parentRect.bottom - containerRect.top;
    var x2 = childRect.left + childRect.width / 2 - containerRect.left;
    var y2 = childRect.top - containerRect.top;
    
    // Determine line length and angle
    var length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    var angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    
    // Position and rotate the line
    line.style.width = length + 'px';
    line.style.left = x1 + 'px';
    line.style.top = y1 + 'px';
    line.style.transform = 'rotate(' + angle + 'deg)';
    line.style.transformOrigin = '0 0';
    
    document.querySelector('.tree-container').appendChild(line);
}

function showPosition(fen) {
    var positionPreview = document.getElementById('position-preview');
    if (!positionPreview) {
        positionPreview = document.createElement('div');
        positionPreview.id = 'position-preview';
        document.body.appendChild(positionPreview);
        
        // Create a mini board
        var board = document.createElement('div');
        board.id = 'preview-board';
        positionPreview.appendChild(board);
    }
    
    // Show the preview near the cursor
    positionPreview.style.display = 'block';
    
    // Use Chessboard.js to show the position
    var previewBoard = ChessBoard('preview-board', {
        position: fen,
        showNotation: false,
        pieceTheme: 'lib/chessboardjs/img/chesspieces/wikipedia/{piece}.png'
    });
    
    // Position preview follows mouse
    document.addEventListener('mousemove', movePreview);
}

function movePreview(e) {
    var positionPreview = document.getElementById('position-preview');
    if (positionPreview) {
        positionPreview.style.left = (e.pageX + 20) + 'px';
        positionPreview.style.top = (e.pageY - 100) + 'px';
    }
}

function hidePosition() {
    var positionPreview = document.getElementById('position-preview');
    if (positionPreview) {
        positionPreview.style.display = 'none';
        document.removeEventListener('mousemove', movePreview);
    }
}

// Add toggle for visualization
function toggleVisualization() {
    visualizeMode = !visualizeMode;
    document.getElementById('visualize-btn').innerText = visualizeMode ? 'Disable Visualization' : 'Enable Visualization';
    
    // Hide or show the container
    var container = document.getElementById('visualization-container');
    if (container) {
        container.style.display = visualizeMode ? 'block' : 'none';
    }
}

function displayVisualization() {
    // Check if visualization container exists, if not create it
    var vizContainer = document.getElementById('minimax-viz');
    if (!vizContainer) {
        vizContainer = document.createElement('div');
        vizContainer.id = 'minimax-viz';
        vizContainer.className = 'minimax-visualization';
        document.body.appendChild(vizContainer);
    }
    
    // Clear previous visualization
    vizContainer.innerHTML = '';
    
    // Create header
    var header = document.createElement('h3');
    header.textContent = 'Minimax Move Evaluation';
    vizContainer.appendChild(header);
    
    // Create move cards
    var movesContainer = document.createElement('div');
    movesContainer.className = 'move-cards-container';
    
    for (var i = 0; i < visualizeMoves.length; i++) {
        var move = visualizeMoves[i];
        
        var moveCard = document.createElement('div');
        moveCard.className = 'move-card';
        if (move.isBest) {
            moveCard.className += ' best-move';
        }
        
        // Create a mini board showing the position
        var boardContainer = document.createElement('div');
        boardContainer.className = 'mini-board';
        boardContainer.id = 'board-' + i;
        moveCard.appendChild(boardContainer);
        
        // Add move information
        var moveInfo = document.createElement('div');
        moveInfo.className = 'move-info';
        moveInfo.innerHTML = `
            <div class="move-text">${move.piece.toUpperCase()} ${move.from} → ${move.to}</div>
            <div class="move-evaluation">Evaluation: ${move.evaluation}</div>
            <div class="move-depth">Depth: ${move.depth}</div>
        `;
        moveCard.appendChild(moveInfo);
        
        movesContainer.appendChild(moveCard);
    }
    
    vizContainer.appendChild(movesContainer);
    
    // Render mini boards
    for (var i = 0; i < visualizeMoves.length; i++) {
        var miniBoard = ChessBoard('board-' + i, {
            position: visualizeMoves[i].fen,
            pieceTheme: 'lib/chessboardjs/img/chesspieces/wikipedia/{piece}.png',
            showNotation: false,
            size: '150px'
        });
    }
}

// Function to toggle visualization
function toggleVisualization() {
    isVisualizationEnabled = !isVisualizationEnabled;
    
    var button = document.getElementById('viz-toggle');
    if (button) {
        button.textContent = isVisualizationEnabled ? 'Disable Visualization' : 'Enable Visualization';
    }
    
    // Clear or show visualization
    var vizContainer = document.getElementById('minimax-viz');
    if (vizContainer) {
        if (!isVisualizationEnabled) {
            vizContainer.style.display = 'none';
        } else {
            vizContainer.style.display = 'block';
        }
    }
}

// Add this function to show the visualization
function showLastVisualization() {
    var vizContent = document.getElementById('viz-content');
    
    if (lastMoveEvaluations.length === 0) {
        vizContent.innerHTML = "No move data available. Make a move first.";
        return;
    }
    
    var html = '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
    
    for (var i = 0; i < lastMoveEvaluations.length; i++) {
        var moveData = lastMoveEvaluations[i];
        var boardId = 'mini-board-' + i;
        
        var borderColor = moveData.isBest ? "3px solid green" : "1px solid gray";
        var background = moveData.isBest ? "#d9f7d9" : "white";
        
        html += '<div style="width: 160px; padding: 10px; border: ' + borderColor + '; background: ' + background + ';">';
        html += '<div id="' + boardId + '" style="width: 150px; height: 150px;"></div>';
        html += '<div style="margin-top: 5px; font-weight: bold;">' + moveData.move + '</div>';
        html += '<div>Evaluation: ' + moveData.value + '</div>';
        if (moveData.isBest) {
            html += '<div style="color: green; font-weight: bold;">BEST MOVE</div>';
        }
        html += '</div>';
    }
    
    html += '</div>';
    vizContent.innerHTML = html;
    
    // Render the mini boards
    for (var i = 0; i < lastMoveEvaluations.length; i++) {
        var boardConfig = {
            position: lastMoveEvaluations[i].fen,
            showNotation: false,
            pieceTheme: 'lib/chessboardjs/img/chesspieces/wikipedia/{piece}.png'
        };
        ChessBoard('mini-board-' + i, boardConfig);
    }
}

var evaluateBoard = function (board) {
    var totalEvaluation = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            totalEvaluation = totalEvaluation + getPieceValue(board[i][j], i ,j);
        }
    }
    return totalEvaluation;
};

var reverseArray = function(array) {
    return array.slice().reverse();
};

var pawnEvalWhite =
    [
        [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [1.0,  1.0,  2.0,  3.0,  3.0,  2.0,  1.0,  1.0],
        [0.5,  0.5,  1.0,  2.5,  2.5,  1.0,  0.5,  0.5],
        [0.0,  0.0,  0.0,  2.0,  2.0,  0.0,  0.0,  0.0],
        [0.5, -0.5, -1.0,  0.0,  0.0, -1.0, -0.5,  0.5],
        [0.5,  1.0, 1.0,  -2.0, -2.0,  1.0,  1.0,  0.5],
        [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]
    ];

var pawnEvalBlack = reverseArray(pawnEvalWhite);

var knightEval =
    [
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
        [-4.0, -2.0,  0.0,  0.0,  0.0,  0.0, -2.0, -4.0],
        [-3.0,  0.0,  1.0,  1.5,  1.5,  1.0,  0.0, -3.0],
        [-3.0,  0.5,  1.5,  2.0,  2.0,  1.5,  0.5, -3.0],
        [-3.0,  0.0,  1.5,  2.0,  2.0,  1.5,  0.0, -3.0],
        [-3.0,  0.5,  1.0,  1.5,  1.5,  1.0,  0.5, -3.0],
        [-4.0, -2.0,  0.0,  0.5,  0.5,  0.0, -2.0, -4.0],
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
    ];

var bishopEvalWhite = [
    [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
    [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  1.0,  1.0,  0.5,  0.0, -1.0],
    [ -1.0,  0.5,  0.5,  1.0,  1.0,  0.5,  0.5, -1.0],
    [ -1.0,  0.0,  1.0,  1.0,  1.0,  1.0,  0.0, -1.0],
    [ -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0],
    [ -1.0,  0.5,  0.0,  0.0,  0.0,  0.0,  0.5, -1.0],
    [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
];

var bishopEvalBlack = reverseArray(bishopEvalWhite);

var rookEvalWhite = [
    [  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
    [  0.5,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [  0.0,   0.0, 0.0,  0.5,  0.5,  0.0,  0.0,  0.0]
];

var rookEvalBlack = reverseArray(rookEvalWhite);

var evalQueen = [
    [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
    [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
    [ -0.5,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
    [  0.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
    [ -1.0,  0.5,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
];

var kingEvalWhite = [

    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
    [ -1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
    [  2.0,  2.0,  0.0,  0.0,  0.0,  0.0,  2.0,  2.0 ],
    [  2.0,  3.0,  1.0,  0.0,  0.0,  1.0,  3.0,  2.0 ]
];

var kingEvalBlack = reverseArray(kingEvalWhite);

var getPieceValue = function (piece, x, y) {
    if (piece === null) {
        return 0;
    }
    var getAbsoluteValue = function (piece, isWhite, x ,y) {
        if (piece.type === 'p') {
            return 10 + ( isWhite ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x] );
        } else if (piece.type === 'r') {
            return 50 + ( isWhite ? rookEvalWhite[y][x] : rookEvalBlack[y][x] );
        } else if (piece.type === 'n') {
            return 30 + knightEval[y][x];
        } else if (piece.type === 'b') {
            return 30 + ( isWhite ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x] );
        } else if (piece.type === 'q') {
            return 90 + evalQueen[y][x];
        } else if (piece.type === 'k') {
            return 900 + ( isWhite ? kingEvalWhite[y][x] : kingEvalBlack[y][x] );
        }
        throw "Unknown piece type: " + piece.type;
    };

    var absoluteValue = getAbsoluteValue(piece, piece.color === 'w', x ,y);
    return piece.color === 'w' ? absoluteValue : -absoluteValue;
};

/* board visualization and games state handling */

var onDragStart = function (source, piece, position, orientation) {
    if (game.in_checkmate() === true || game.in_draw() === true ||
        piece.search(/^b/) !== -1) {
        return false;
    }
};

var makeBestMove = function () {
    var bestMove = getBestMove(game);
    game.ugly_move(bestMove);
    board.position(game.fen());
    renderMoveHistory(game.history());
    if (game.game_over()) {
        alert('Game over');
    }
};

var positionCount;
var getBestMove = function (game) {
    if (game.game_over()) {
        alert('Game over');
    }

    positionCount = 0;
    var depth = parseInt($('#search-depth').find(':selected').text());

    var d = new Date().getTime();
    var bestMove = minimaxRoot(depth, game, true);
    var d2 = new Date().getTime();
    var moveTime = (d2 - d);
    var positionsPerS = ( positionCount * 1000 / moveTime);

    $('#position-count').text(positionCount);
    $('#time').text(moveTime/1000 + 's');
    $('#positions-per-s').text(positionsPerS);
    
    // Update visualization if enabled
    if (isVisualizationEnabled) {
        displayVisualization();
    }
    
    return bestMove;
};

var renderMoveHistory = function (moves) {
    var historyElement = $('#move-history').empty();
    historyElement.empty();
    for (var i = 0; i < moves.length; i = i + 2) {
        historyElement.append('<span>' + moves[i] + ' ' + ( moves[i + 1] ? moves[i + 1] : ' ') + '</span><br>')
    }
    historyElement.scrollTop(historyElement[0].scrollHeight);
};

var onDrop = function (source, target) {
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    removeGreySquares();
    if (move === null) {
        return 'snapback';
    }

    renderMoveHistory(game.history());
    window.setTimeout(makeBestMove, 250);
};

var onSnapEnd = function () {
    board.position(game.fen());
};

var onMouseoverSquare = function(square, piece) {
    var moves = game.moves({
        square: square,
        verbose: true
    });

    if (moves.length === 0) return;

    greySquare(square);

    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
};

var onMouseoutSquare = function(square, piece) {
    removeGreySquares();
};

var removeGreySquares = function() {
    $('#board .square-55d63').css('background', '');
};

var greySquare = function(square) {
    var squareEl = $('#board .square-' + square);

    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d') === true) {
        background = '#696969';
    }

    squareEl.css('background', background);
};

var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onSnapEnd: onSnapEnd
};
board = ChessBoard('board', cfg);