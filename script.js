// ===========================
// Constants and Configuration
// ===========================
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0],  [1, 1]
];

const DEFAULT_SIZE = 8;
const CELL_SIZE = 60;

const AI_DEPTH_MAP = { easy: 2, medium: 4, hard: 6 };

// ===========================
// Othello Game Logic
// ===========================
class OthelloGame {
    constructor(size = DEFAULT_SIZE, opponent_type = 'human', ai_difficulty = 'easy',
                player_color = 'B', dynamic_depth = false) {
        this.size = size;
        this.board = [];
        for (let r = 0; r < size; r++) {
            let row = [];
            for (let c = 0; c < size; c++) {
                row.push(EMPTY);
            }
            this.board.push(row);
        }
        // Initial setup
        const mid = Math.floor(size / 2);
        this.board[mid-1][mid-1] = WHITE;
        this.board[mid][mid] = WHITE;
        this.board[mid-1][mid] = BLACK;
        this.board[mid][mid-1] = BLACK;

        this.current_player = BLACK;
        this.last_placed_move = null;
        this.game_over = false;

        this.opponent_type = opponent_type;
        this.ai_depth = AI_DEPTH_MAP[ai_difficulty] || 2;
        this.player_color = (player_color === 'B') ? BLACK : WHITE;
        this.ai_player = (this.player_color === BLACK) ? WHITE : BLACK;
        this.dynamic_depth = dynamic_depth;

        // Move history for undo
        this.move_history = [ { board: this.copy_board(this.board), current_player: this.current_player } ];
        this.move_log = [];

        // Position weights for AI
        this.position_weights = this.generate_position_weights(this.size);

        // Transposition table
        this.transposition_table = {};
    }

    get black_count() {
        let count = 0;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === BLACK) count++;
            }
        }
        return count;
    }

    get white_count() {
        let count = 0;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === WHITE) count++;
            }
        }
        return count;
    }

    in_bounds(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    opponent(player) {
        return (player === BLACK) ? WHITE : BLACK;
    }

    valid_moves(player) {
        let moves = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === EMPTY && this.can_flip(r, c, player)) {
                    moves.push([r,c]);
                }
            }
        }
        return moves;
    }

    can_flip(row, col, player) {
        if (this.board[row][col] !== EMPTY) return false;
        const opp = this.opponent(player);
        for (let [dr, dc] of DIRECTIONS) {
            let rr = row+dr, cc = col+dc;
            let found_opponent = false;
            while (this.in_bounds(rr, cc) && this.board[rr][cc] === opp) {
                rr += dr; cc += dc;
                found_opponent = true;
            }
            if (found_opponent && this.in_bounds(rr, cc) && this.board[rr][cc] === player) {
                return true;
            }
        }
        return false;
    }

    place_piece(row, col, player) {
        if (!this.in_bounds(row,col) || !this.can_flip(row,col,player)) {
            return false;
        }
        this.board[row][col] = player;
        this.flip_discs(row,col,player);
        this.last_placed_move = [row,col];
        this.move_history.push({ board: this.copy_board(this.board), current_player: this.current_player });
        this.move_log.push([player, [row,col]]);
        return true;
    }

    flip_discs(row, col, player) {
        const opp = this.opponent(player);
        for (let [dr,dc] of DIRECTIONS) {
            let rr = row+dr, cc = col+dc;
            let discs_to_flip = [];
            while (this.in_bounds(rr,cc) && this.board[rr][cc]===opp) {
                discs_to_flip.push([rr,cc]);
                rr+=dr; cc+=dc;
            }
            if (this.in_bounds(rr,cc) && this.board[rr][cc]===player && discs_to_flip.length>0) {
                for (let [fr,fc] of discs_to_flip) {
                    this.board[fr][fc]=player;
                }
            }
        }
    }

    switch_player() {
        this.current_player = this.opponent(this.current_player);
    }

    is_game_over() {
        if (this.valid_moves(BLACK).length > 0) return false;
        if (this.valid_moves(WHITE).length > 0) return false;
        return true;
    }

    reset() {
        this.board = [];
        for (let r = 0; r < this.size; r++) {
            let row = [];
            for (let c = 0; c < this.size; c++) {
                row.push(EMPTY);
            }
            this.board.push(row);
        }
        const mid = Math.floor(this.size / 2);
        this.board[mid-1][mid-1] = WHITE;
        this.board[mid][mid] = WHITE;
        this.board[mid-1][mid] = BLACK;
        this.board[mid][mid-1] = BLACK;
        this.current_player = BLACK;
        this.last_placed_move = null;
        this.game_over = false;
        this.move_history = [{ board: this.copy_board(this.board), current_player: this.current_player }];
        this.move_log = [];
        this.transposition_table = {};
    }

    has_valid_moves(player) {
        return this.valid_moves(player).length > 0;
    }

    generate_position_weights(size) {
        let weights = [];
        for (let r = 0; r < size; r++) {
            let row = [];
            for (let c = 0; c < size; c++) {
                let w = 0;
                // Corner
                if ((r===0||r===size-1) && (c===0||c===size-1)) {
                    w = 120;
                } else if ((r===1||r===size-2)&&(c===1||c===size-2)) {
                    w = -20;
                } else if (r===0||r===size-1||c===0||c===size-1) {
                    w = 20;
                } else {
                    w = 1;
                }
                row.push(w);
            }
            weights.push(row);
        }
        return weights;
    }

    evaluate_board(board, player) {
        const opp = this.opponent(player);
        let player_score=0, opp_score=0;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                let piece = board[r][c];
                let w = this.position_weights[r][c];
                if (piece === player) player_score+=w;
                else if (piece===opp) opp_score+=w;
            }
        }
        return player_score - opp_score;
    }

    is_terminal_state(board) {
        return !this.has_valid_moves_in_state(board, BLACK) && !this.has_valid_moves_in_state(board, WHITE);
    }

    is_valid_move_in_state(board, row, col, player) {
        if (board[row][col]!==EMPTY) return false;
        const opp = this.opponent(player);
        for (let [dr,dc] of DIRECTIONS) {
            let r = row+dr, c=col+dc;
            let has_opponent = false;
            while (r>=0&&r<this.size&&c>=0&&c<this.size) {
                if (board[r][c]===opp) {
                    has_opponent = true;
                } else if (board[r][c]===player && has_opponent) {
                    return true;
                } else {
                    break;
                }
                r+=dr; c+=dc;
            }
        }
        return false;
    }

    has_valid_moves_in_state(board, player) {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.is_valid_move_in_state(board,r,c,player)) return true;
            }
        }
        return false;
    }

    get_valid_moves_in_state(board, player) {
        let valid = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.is_valid_move_in_state(board,r,c,player)) valid.push([r,c]);
            }
        }
        return valid;
    }

    make_move_in_state(board, row, col, player) {
        const opp = this.opponent(player);
        board[row][col]=player;
        for (let [dr,dc] of DIRECTIONS) {
            let r=row+dr, c=col+dc;
            let flip_list = [];
            while (r>=0&&r<this.size&&c>=0&&c<this.size) {
                if (board[r][c]===opp) {
                    flip_list.push([r,c]);
                } else if (board[r][c]===player && flip_list.length>0) {
                    for (let [fr,fc] of flip_list) board[fr][fc]=player;
                    break;
                } else {
                    break;
                }
                r+=dr;c+=dc;
            }
        }
    }

    copy_board(board) {
        return board.map(row => row.slice());
    }

    hash_board(board) {
        return board.map(r=>r.join('')).join('');
    }

    adjust_depth(board) {
        let total_pieces=0;
        let max_pieces=this.size*this.size;
        for (let r=0; r<this.size; r++) {
            for (let c=0; c<this.size; c++){
                if (board[r][c]!==EMPTY) total_pieces++;
            }
        }
        let fill_ratio = total_pieces/max_pieces;
        if (fill_ratio<0.25) return 2;
        else if (fill_ratio<0.75) return 4;
        else return 6;
    }

    minimax(board, depth, maximizing_player, alpha, beta, player) {
        let board_hash = this.hash_board(board);
        if (this.transposition_table[board_hash] !== undefined) {
            return this.transposition_table[board_hash];
        }

        if (depth===0||this.is_terminal_state(board)) {
            let eval_val = this.evaluate_board(board, player);
            this.transposition_table[board_hash]=eval_val;
            return eval_val;
        }

        let current_player = maximizing_player ? player : this.opponent(player);
        let valid_moves = this.get_valid_moves_in_state(board, current_player);
        if (valid_moves.length===0) {
            let eval_val = this.minimax(board, depth-1, !maximizing_player, alpha, beta, player);
            this.transposition_table[board_hash]=eval_val;
            return eval_val;
        }

        if (maximizing_player) {
            // sort moves descending by weight
            valid_moves.sort((m1,m2)=>this.position_weights[m2[0]][m2[1]]-this.position_weights[m1[0]][m1[1]]);
            let max_eval = -Infinity;
            for (let move of valid_moves) {
                let temp = this.copy_board(board);
                this.make_move_in_state(temp, move[0], move[1], current_player);
                let eval_val = this.minimax(temp, depth-1, false, alpha, beta, player);
                max_eval = Math.max(max_eval, eval_val);
                alpha = Math.max(alpha, eval_val);
                if (beta<=alpha) break;
            }
            this.transposition_table[board_hash]=max_eval;
            return max_eval;
        } else {
            // sort moves ascending by weight
            valid_moves.sort((m1,m2)=>this.position_weights[m1[0]][m1[1]]-this.position_weights[m2[0]][m2[1]]);
            let min_eval = Infinity;
            for (let move of valid_moves) {
                let temp = this.copy_board(board);
                this.make_move_in_state(temp, move[0], move[1], current_player);
                let eval_val = this.minimax(temp, depth-1, true, alpha, beta, player);
                min_eval = Math.min(min_eval, eval_val);
                beta = Math.min(beta, eval_val);
                if (beta<=alpha) break;
            }
            this.transposition_table[board_hash]=min_eval;
            return min_eval;
        }
    }

    get_best_move(board, player) {
        let valid_moves = this.get_valid_moves_in_state(board, player);
        if (valid_moves.length===0) return null;

        let depth = this.ai_depth;
        if (this.dynamic_depth) {
            depth = this.adjust_depth(board);
        }

        let best_score = -Infinity;
        let best_move = null;
        let alpha = -Infinity;
        let beta = Infinity;

        // sort moves descending
        valid_moves.sort((m1,m2)=>this.position_weights[m2[0]][m2[1]]-this.position_weights[m1[0]][m1[1]]);
        for (let move of valid_moves) {
            let temp = this.copy_board(board);
            this.make_move_in_state(temp, move[0], move[1], player);
            let board_hash = this.hash_board(temp);
            let score;
            if (this.transposition_table[board_hash]!==undefined) {
                score = this.transposition_table[board_hash];
            } else {
                score = this.minimax(temp, depth-1, false, alpha, beta, player);
                this.transposition_table[board_hash]=score;
            }
            if (score>best_score) {
                best_score=score;
                best_move=move;
            }
            alpha = Math.max(alpha,best_score);
            if (beta<=alpha) break;
        }

        return best_move;
    }

    undo_move() {
        if (this.move_history.length>1) {
            this.move_history.pop();
            let prev = this.move_history[this.move_history.length-1];
            this.board = this.copy_board(prev.board);
            this.current_player = prev.current_player;
            if (this.move_log.length>0) this.move_log.pop();
            this.last_placed_move = null;
            this.game_over=this.is_game_over();
            return true;
        }
        return false;
    }
}

// ===========================
// GUI and User Interaction
// ===========================
class OthelloGUI {
    constructor(size, opponent_type, ai_difficulty, player_color, dynamic_depth, cell_size = CELL_SIZE) {
        this.size = size;
        this.cell_size = cell_size;
        this.game = new OthelloGame(size, opponent_type, ai_difficulty, player_color, dynamic_depth);
        this.opponent_type = opponent_type;
        this.ai_player = this.game.ai_player;
        this.player_color = this.game.player_color;

        this.canvas = document.getElementById('game-canvas');
        this.statusLabel = document.getElementById('status-label');
        this.moveLogText = document.getElementById('move-log');

        this.canvas.width = this.size*this.cell_size;
        this.canvas.height = this.size*this.cell_size;

        this.ctx = this.canvas.getContext('2d');

        // Event handlers
        this.canvas.addEventListener('click', this.on_click.bind(this));
        document.getElementById('undo-button').addEventListener('click', this.on_undo.bind(this));
        document.getElementById('restart-button').addEventListener('click', this.on_restart.bind(this));

        this.draw_board();
        this.update_status();
        this.update_move_log();

        if (this.opponent_type==='ai' && this.game.current_player===this.ai_player) {
            setTimeout(()=>this.ai_move(),500);
        }
    }

    draw_board() {
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

        // Grid lines
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        for (let i=0; i<=this.size; i++){
            this.ctx.beginPath();
            this.ctx.moveTo(i*this.cell_size,0);
            this.ctx.lineTo(i*this.cell_size,this.size*this.cell_size);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0,i*this.cell_size);
            this.ctx.lineTo(this.size*this.cell_size,i*this.cell_size);
            this.ctx.stroke();
        }

        // Pieces
        for (let r=0; r<this.size; r++) {
            for (let c=0; c<this.size; c++) {
                let piece = this.game.board[r][c];
                if (piece!==EMPTY) {
                    this.draw_piece(r,c,piece);
                }
            }
        }

        // Highlight valid moves if human turn and not game over
        if (!this.game.game_over && (this.game.current_player===this.player_color || this.opponent_type==='human')) {
            let valid_moves = this.game.valid_moves(this.game.current_player);
            this.ctx.strokeStyle='yellow';
            this.ctx.lineWidth=2;
            for (let [r,c] of valid_moves) {
                let {x1,y1,x2,y2}=this.cell_coords(r,c);
                this.ctx.beginPath();
                this.ctx.ellipse((x1+x2)/2,(y1+y2)/2,(this.cell_size-30)/2,(this.cell_size-30)/2,0,0,2*Math.PI);
                this.ctx.stroke();
            }
        }

        // Highlight last placed
        if (this.game.last_placed_move) {
            let [rr,cc]=this.game.last_placed_move;
            let {x1,y1,x2,y2}=this.cell_coords(rr,cc);
            this.ctx.strokeStyle='red';
            this.ctx.lineWidth=2;
            this.ctx.strokeRect(x1+3,y1+3,x2-x1-6,y2-y1-6);
        }
    }

    draw_piece(r,c,player) {
        let {x1,y1,x2,y2}=this.cell_coords(r,c);
        let fillColor = (player===BLACK)? 'black':'white';
        this.ctx.beginPath();
        this.ctx.arc((x1+x2)/2,(y1+y2)/2,(this.cell_size-10)/2,0,2*Math.PI);
        this.ctx.fillStyle=fillColor;
        this.ctx.fill();
    }

    cell_coords(r,c) {
        let x1 = c*this.cell_size;
        let y1 = r*this.cell_size;
        let x2 = x1+this.cell_size;
        let y2 = y1+this.cell_size;
        return {x1,y1,x2,y2};
    }

    on_click(event) {
        if (this.game.game_over) return;
        if (this.opponent_type==='ai' && this.game.current_player===this.ai_player) return;

        const rect = this.canvas.getBoundingClientRect();
        let mx = event.clientX - rect.left;
        let my = event.clientY - rect.top;
        let c = Math.floor(mx/this.cell_size);
        let r = Math.floor(my/this.cell_size);

        if (!this.game.in_bounds(r,c)) return;
        if (!this.game.place_piece(r,c,this.game.current_player)) {
            // Invalid move
            this.statusLabel.textContent="Invalid Move!";
            this.statusLabel.style.background="grey";
            setTimeout(()=>this.update_status(),1000);
            return;
        }

        // Move ok
        this.update_move_log();
        this.switch_turns();
    }

    switch_turns() {
        this.game.switch_player();
        // Check if next player has moves
        if (!this.game.has_valid_moves(this.game.current_player)) {
            // No moves
            this.statusLabel.textContent="No valid moves!";
            this.statusLabel.style.background="grey";
            setTimeout(()=>this.update_status(),1000);
            this.game.switch_player();
            if (!this.game.has_valid_moves(this.game.current_player)) {
                // Both no moves
                this.handle_game_over();
                return;
            }
        }

        this.draw_board();
        this.update_status();

        if (this.opponent_type==='ai' && this.game.current_player===this.ai_player && !this.game.game_over) {
            setTimeout(()=>this.ai_move(),500);
        }
    }

    ai_move() {
        if (this.game.game_over) return;

        let move = this.game.get_best_move(this.game.copy_board(this.game.board),this.ai_player);
        if (move) {
            this.game.place_piece(move[0],move[1],this.ai_player);
            this.update_move_log();
            this.draw_board();
            this.update_status();
            this.switch_turns();
        } else {
            alert("AI has no valid moves and passes its turn.");
            this.switch_turns();
        }
    }

    update_move_log() {
        this.moveLogText.value="";
        for (let [player, [r,c]] of this.game.move_log) {
            let player_text = (player===BLACK)?"Black":"White";
            let move_text = player_text+": "+String.fromCharCode('A'.charCodeAt(0)+c)+(r+1)+"\n";
            this.moveLogText.value+=move_text;
        }
        this.moveLogText.scrollTop=this.moveLogText.scrollHeight;
    }

    on_undo() {
        if (this.opponent_type==='ai' && this.game.current_player===this.ai_player) {
            // no undo during AI turn
            return;
        }
        if (this.game.undo_move()) {
            this.draw_board();
            this.update_status();
            this.update_move_log();
        }
    }

    update_status() {
        let black_count = this.game.black_count;
        let white_count = this.game.white_count;
        if (this.game.game_over) {
            this.statusLabel.textContent=`Game Over! Black: ${black_count}, White: ${white_count}`;
            this.statusLabel.style.background="grey";
            this.statusLabel.style.color="black";
        } else {
            let current_player = this.game.current_player;
            let player_text = (current_player===BLACK)?"Black":"White";
            let bg_color = (current_player===BLACK)?"black":"white";
            let fg_color = (current_player===BLACK)?"white":"black";
            this.statusLabel.textContent=`Current Player: ${player_text} | Black: ${black_count}, White: ${white_count}`;
            this.statusLabel.style.background=bg_color;
            this.statusLabel.style.color=fg_color;
        }
    }

    handle_game_over() {
        this.game.game_over=true;
        let black_count=this.game.black_count;
        let white_count=this.game.white_count;
        let winner;
        if (black_count>white_count) winner="Black";
        else if (white_count>black_count) winner="White";
        else winner="Tie";

        this.statusLabel.textContent=`Game Over! Winner: ${winner} (Black: ${black_count}, White: ${white_count})`;
        this.statusLabel.style.background="grey";
        this.statusLabel.style.color="black";
    }

    on_restart() {
        // Return to start screen
        document.getElementById('game-container').style.display='none';
        document.getElementById('start-container').style.display='block';
    }
}

// ===========================
// Initialization
// ===========================
document.addEventListener('DOMContentLoaded', ()=>{
    const opponentRadios = document.getElementsByName('opponent');
    const aiOptions = document.getElementById('ai-options');
    const startBtn = document.getElementById('start-game-btn');
    const boardSizeInput = document.getElementById('board-size');
    const difficultySelect = document.getElementById('difficulty');
    const dynamicDepthCheck = document.getElementById('dynamic-depth');

    function updateAIOptions() {
        let opponent = [...opponentRadios].find(r=>r.checked).value;
        if (opponent==='ai') {
            aiOptions.style.display='block';
        } else {
            aiOptions.style.display='none';
        }
    }

    opponentRadios.forEach(r=>r.addEventListener('change', updateAIOptions));

    startBtn.addEventListener('click', ()=>{
        let opponent = [...opponentRadios].find(r=>r.checked).value;
        let difficulty = difficultySelect.value;
        let color = [...document.getElementsByName('color')].find(r=>r.checked).value;
        let dynamic_depth = dynamicDepthCheck.checked;

        let board_size = parseInt(boardSizeInput.value);
        if (isNaN(board_size) || board_size<6 || board_size>20 || board_size%2!==0) {
            alert("Board size must be an even number between 6 and 20.");
            return;
        }

        document.getElementById('start-container').style.display='none';
        document.getElementById('game-container').style.display='block';

        new OthelloGUI(board_size, opponent, difficulty, color, dynamic_depth);
    });
});
