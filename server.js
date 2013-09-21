#!/bin/env node

var app = require('express').createServer(),
    io = require('socket.io').listen(app);

var waitingUsers = [];
var currentGames = {};

var port = process.env.OPENSHIFT_NODEJS_PORT || 8080
, ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
app.listen(port);

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});
app.get('/styles.css', function (req, res) {
    res.sendfile(__dirname + '/styles.css');
});
app.get('/minesweeper.js', function (req, res) {
    res.sendfile(__dirname + '/minesweeper.js');
});
app.get('/cell.js', function (req, res) {
    res.sendfile(__dirname + '/cell.js');
});

io.sockets.on('connection', function (socket) {

    socket.on('click', function (data) {
        click(data, socket.id);
    });

    socket.on('findMatch', function () {
        // match found
        if (waitingUsers.length > 0) {
            var id = waitingUsers.shift();

            socket.emit('matchFound');
            io.sockets.socket(id).emit('matchFound');

            var game = new Game(id, socket.id);
            currentGames[id] = game;
            currentGames[socket.id] = game;

        } // no match, found wait
        else {
            waitingUsers.push(socket.id);
            socket.emit('matchMaking');
        }
    });

    socket.on('disconnect', function (data) {
        var i = waitingUsers.indexOf(socket.id);
        waitingUsers.splice(i, 1);
        if (currentGames.hasOwnProperty(socket.id)) {
            var id1 = currentGames[socket.id].socketIds[0];
            var id2 = currentGames[socket.id].socketIds[1];
            if (socket.id !== id1)
                io.sockets.socket(id1).emit('gameOver', { msg: 'Game over, Opponent quit!' });
            else if (socket.id !== id2)
                io.sockets.socket(id2).emit('gameOver', { msg: 'Game over, Opponent quit!' });
            delete currentGames[id1];
            delete currentGames[id2];
        }
    });
});

function click(data, socketid) {
    if (currentGames.hasOwnProperty(socketid)) {
        var game = currentGames[socketid];
        var socket1 = io.sockets.socket(game.socketIds[0]);
        var socket2 = io.sockets.socket(game.socketIds[1]);
        var player = game.socketIds.indexOf(socketid);
        game.cellBuffer.length = 0;
        game.scan(data['x'], data['y'], data['b'], player);
        if (game.cellBuffer.length > 0) {
            socket1.emit("update", {
                cells : game.cellBuffer,
                your_score: game.score[0],
                opponent_score: game.score[1],
                your_lives: game.lives[0],
                opponent_lives: game.lives[1],
                mines_remaining: game.minesRemaining
            });
            socket2.emit("update", {
                cells : game.cellBuffer,
                your_score: game.score[1],
                opponent_score: game.score[0],
                your_lives: game.lives[1],
                opponent_lives: game.lives[0],
                mines_remaining: game.minesRemaining
            });
        }
        if (game.cellsRemaining <= 0) {
            if (game.score[0] > game.score[1]) {
                socket1.emit('gameOver', {msg: 'Game over, you win!' });
                socket2.emit('gameOver', {msg: 'Game over, you lose!' });
            } else if (game.score[0] === game.score[1]) {
                socket1.emit('gameOver', {msg: "Game over, it's a tie!" });
                socket2.emit('gameOver', {msg: 'Game over, you lose!' });
            } else{
                socket1.emit('gameOver', {msg: 'Game over, you lose!' });
                socket2.emit('gameOver', {msg: 'Game over, you win!' });
            }
            delete currentGames[socket1.id];
            delete currentGames[socket2.id];
        }
        else if (game.lives[0] <= 0) {
            socket1.emit('gameOver', {msg: 'Game over, you lose!' });
            socket2.emit('gameOver', {msg: 'Game over, you win!' });
            delete currentGames[socket1.id];
            delete currentGames[socket2.id];
        }
        else if (game.lives[1] <= 0) {
            socket1.emit('gameOver', {msg: 'Game over, you win!' });
            socket2.emit('gameOver', {msg: 'Game over, you lose!' });
            delete currentGames[socket1.id];
            delete currentGames[socket2.id];
        }
    }
}

///////////////GAME////////////////////

function Game(id1, id2) {
    this.socketIds = [0, 0];
    this.socketIds[0] = id1;
    this.socketIds[1] = id2;
    this.cellsRemaining = 381;
    this.minesRemaining = 99;
    this.lives = [3, 3];
    this.score = [0, 0];
    this.cellBuffer = [];
    this.initMines();
}
Game.prototype.width = 30;
Game.prototype.height = 16;
Game.prototype.numOfMines = 99;

Game.prototype.initMines = function () {
    var i, j, x, y;
    // init 2d array cells to 0
    this.cells = new Array(this.width);
    for (i = 0; i < this.cells.length; i++) {
        this.cells[i] = new Array(this.height);
        for (j = 0; j < this.cells[i].length; j++) {
            this.cells[i][j] = new Cell();
        }
    }
    // randomly generate the miness
    for (i = 0; i < this.numOfMines; i++) {
        do {
            x = this.randomInt(0, this.width - 1);
            y = this.randomInt(0, this.height - 1);
        } while (this.cells[x][y].isBomb);
        this.cells[x][y].isBomb = true;
    }
    // set the numbers
    for (i = 0; i < this.cells.length; i++) {
        for (j = 0; j < this.cells[i].length; j++) {
            this.cells[i][j].adjacentMines = this.adjacentMines(i, j);
        }
    }
}
Game.prototype.adjacentMines = function (x, y) {
    var toCheck = this.getBorderCells(x, y);
    var i, x, y, count = 0;
    for (i = 0; i < toCheck.length; i++) {
        x = toCheck[i][0];
        y = toCheck[i][1];
        if (x >= 0 && x < this.width && y >= 0 && y < this.height &&
            this.cells[x][y].isBomb) {
            count++;
        }
    }
    return count;
}
Game.prototype.getBorderCells = function (x, y) {
    return [[x - 1, y - 1], [x, y - 1], [x + 1, y - 1], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x - 1, y + 1], [x - 1, y]];
}
Game.prototype.randomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
Game.prototype.scan = function (x, y, mousebutton, player) {
    mousebutton = mousebutton || 0
    // flag cell
    if (mousebutton === 2 && !this.cells[x][y].isCleared() && !this.cells[x][y].isBombed()) {
        if (this.cells[x][y].isFlagged()) {
            this.cells[x][y].setDefault();
            this.minesRemaining++;
            this.cellBuffer.push({
                "c": this.cells[x][y],
                "x": x,
                "y": y
            })
        } else if (this.cells[x][y].isDefault()) {
            this.cells[x][y].setFlagged();
            this.minesRemaining--;
            this.cellBuffer.push({
                "c": this.cells[x][y],
                "x": x,
                "y": y
            })
        }
    } else if (mousebutton < 2) {
        // mines flagged correctly, quick clear, recurse
        if (this.cells[x][y].isCleared() && this.correctFlags(x, y)) {
            this.score[player]++;
            this.recursescan2(x, y);
        } // clicked on a bomb
        else if (this.cells[x][y].isBomb) {
            this.cells[x][y].setBombed();
            this.lives[player]--;
            this.minesRemaining--;
            this.cellBuffer.push({
                "c": this.cells[x][y],
                "x": x,
                "y": y
            })
        } // cleared a  cell
        else if (!this.cells[x][y].isCleared()) {
            this.score[player]++;
            this.recursescan1(x, y);
        }
    }
}
Game.prototype.recursescan1 = function (x, y) {
    this.cells[x][y].setCleared();
    this.cellsRemaining--;
    this.cellBuffer.push({
        "c": this.cells[x][y],
        "x": x,
        "y": y
    });

    if (this.cells[x][y].adjacentMines === 0) {
        var toCheck = this.getBorderCells(x, y);
        var i, checkX, checkY;
        for (i = 0; i < toCheck.length; i++) {
            checkX = toCheck[i][0];
            checkY = toCheck[i][1];
            if (checkX >= 0 && checkX < this.width &&
                checkY >= 0 && checkY < this.height && !this.cells[checkX][checkY].isCleared()) {

                this.recursescan1(checkX, checkY);
            }
        }
    }
}
Game.prototype.recursescan2 = function (x, y) {
    var toCheck = this.getBorderCells(x, y);
    var i, checkX, checkY;

    if (!this.cells[x][y].isCleared()) {
        this.cells[x][y].setCleared();
        this.cellsRemaining--;
        this.cellBuffer.push({
            "c": this.cells[x][y],
            "x": x,
            "y": y
        });
    }

    for (i = 0; i < toCheck.length; i++) {
        checkX = toCheck[i][0];
        checkY = toCheck[i][1];
        if (checkX >= 0 && checkX < this.width &&
            checkY >= 0 && checkY < this.height && !this.cells[checkX][checkY].isCleared() && !this.cells[checkX][checkY].isBomb) {

            if (this.cells[checkX][checkY].adjacentMines === 0) {
                this.recursescan2(checkX, checkY);
            } else {
                this.cells[checkX][checkY].setCleared();
                this.cellsRemaining--;
                this.cellBuffer.push({
                    "c": this.cells[checkX][checkY],
                    "x": checkX,
                    "y": checkY
                });
            }
        }
    }
}
Game.prototype.correctFlags = function (x, y) {
    var toCheck = this.getBorderCells(x, y);
    var i, checkX, checkY;
    for (i = 0; i < toCheck.length; i++) {
        checkX = toCheck[i][0];
        checkY = toCheck[i][1];
        if (checkX >= 0 && checkX < this.width && checkY >= 0 && checkY < this.height) {
            if (!this.cells[checkX][checkY].isBombed() &&
                ((this.cells[checkX][checkY].isFlagged() && !this.cells[checkX][checkY].isBomb) ||
                    (!this.cells[checkX][checkY].isFlagged() && this.cells[checkX][checkY].isBomb))) {
                return false;
            }
        }
    }
    return true;
}

////////////////////CELL///////////////////////////////

function Cell() {
    this.adjacentMines = 0;
    this.isBomb = false;
    this.setDefault();
}
Cell.prototype.isDefault = function () {
    if (this.state === this.states['default'])
        return true;
    else
        return false;
}
Cell.prototype.isFlagged = function () {
    if (this.state === this.states['flagged'])
        return true;
    else
        return false;
}
Cell.prototype.isBombed = function () {
    if (this.state === this.states['bombed'])
        return true;
    else
        return false;
}
Cell.prototype.isCleared = function () {
    if (this.state === this.states['cleared'])
        return true;
    else
        return false;
}
Cell.prototype.setDefault = function () {
    this.state = this.states['default'];
}
Cell.prototype.setFlagged = function () {
    this.state = this.states['flagged'];
}
Cell.prototype.setBombed = function () {
    this.state = this.states['bombed'];
}
Cell.prototype.setCleared = function () {
    this.state = this.states['cleared'];
}

Cell.prototype.states = {
    "default": 0,
    "flagged": 1,
    "bombed": 2,
    "cleared": 3
};