var game, socket, singlePlayer = false, matchinprogress = false;

if (typeof io !== "undefined"){
	socket = io.connect("http://minesweeper-trevor.rhcloud.com:8000/");
}
window.onload = function(){
	game = new Game();
	$('#find_match').click(function(){
		if (!matchinprogress) findMatch();
	});
		
	if (typeof socket !== "undefined"){
		socket.on('update', function (data){
			var i, l = data.cells.length;
			for (i = 0; i < l; i ++){
				var cell = data.cells[i];
				game.colorSquare(cell.x, cell.y, Cell.colors[cell.c.state], cell.c.adjacentMines);
			}
			$('#your_score').html(data['your_score']);
			$('#opponent_score').html(data['opponent_score']);
			$('#your_lives').html(data['your_lives']);
			$('#opponent_lives').html(data['opponent_lives']);
			$('#mines_remaining').html(data['mines_remaining']);
		});
		socket.on('matchinprogress', function(){
			$('#game_log').append("Waiting for another player...\n");
			$('#game_log').scrollTop($('#game_log').scrollHeight);
		});
		socket.on('matchFound', function(){
			$('#game_log').append("Player found! Match starting!\n");
			$('#game_log').scrollTop($('#game_log').scrollHeight);
		});
		socket.on('gameOver', function(data){
			$('#game_log').append(data.msg + "\n");
			$('#game_log').scrollTop($('#game_log').scrollHeight);
			matchinprogress = false;
			$('#find_match').removeClass("disabled");
		});
	}
}

function findMatch(){
	if (typeof socket !== "undefined") {
		$('#your_score').html('0');
		$('#opponent_score').html('0');
		$('#your_lives').html('3');
		$('#opponent_lives').html('3');
		$('#mines_remaining').html('99');
		game.drawBoard();
		matchinprogress = true;
		$('#find_match').addClass("disabled");
		socket.emit("findMatch");
		$('#game_log').append("Looking for a match...\n");
	}
	else {
		$('#game_log').append("Network error.\n");
	}
    $('#game_log').scrollTop($('#game_log').scrollHeight);
}



Game.prototype.state = 0;
Game.prototype.canvas = null;
Game.prototype.ctx = null;
Game.prototype.WIDTH = 0;
Game.prototype.HEIGHT = 0;
Game.prototype.offsetTop = 0;
Game.prototype.offsetLeft = 0;
Game.prototype.width = 30;
Game.prototype.height = 16;
Game.prototype.numOfMines = 99;
Game.prototype.cellSize = 30;
Game.prototype.cells = null;
Game.prototype.cellBuffer = [];
Game.prototype.cellsRemaining = 381;

function Game() {
	this.canvas = document.getElementById("game");
	this.ctx = this.canvas.getContext("2d");	
	
	// prevent mouse highlighting the canvas
	this.canvas.onmousedown = function(){ return false; };
	// prevent right click menu
	this.canvas.oncontextmenu = function(){ return false; };

	this.canvas.width = this.width * this.cellSize;
	this.canvas.height = this.height * this.cellSize;
	this.WIDTH = this.canvas.width;
	this.HEIGHT = this.canvas.height;

	var canvas = this.canvas;
	while (canvas.tagName != 'BODY') {
		this.offsetTop += canvas.offsetTop;
		this.offsetLeft += canvas.offsetLeft;
		canvas = canvas.offsetParent;
	}

	if (singlePlayer) this.initMines();
	this.drawBoard();
	this.canvas.addEventListener('mouseup', this.getMouse.bind(this), false);
}
Game.prototype.getMouse = function(evt){
	var x = evt.clientX - this.offsetLeft + window.pageXOffset;
	var y = evt.clientY - this.offsetTop + window.pageYOffset;
	x = (x - (x % this.cellSize))/this.cellSize;
	y = (y - (y % this.cellSize))/this.cellSize;

	if (singlePlayer){
		this.cellBuffer.length = 0;
		this.scan(x, y, evt.button);
		for (i = 0; i < this.cellBuffer.length; i ++){
			this.colorSquare(this.cellBuffer[i].x, this.cellBuffer[i].y, 
				Cell.colors[this.cellBuffer[i].c.state], this.cellBuffer[i].c.adjacentMines);
		}
	}
	else if (matchinprogress) socket.emit('click', { "x" : x, "y": y, "b": evt.button });
}
/*Game.prototype.createMenu = function(){
	this.ctx.fillStyle = "black";
	this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
	//button
	this.ctx.shadowOffsetX = 3;
	this.ctx.shadowOffsetY = 3;
	this.ctx.shadowColor = "#bbdaf7";
	this.ctx.fillStyle = "#3c6996";
	this.ctx.fillRect(this.WIDTH/2-70, this.HEIGHT/2-100, 140, 50);

	this.ctx.shadowOffsetX = 0;
	this.ctx.shadowOffsetY = 0;
	this.ctx.textAlign = "center"; 
	this.ctx.fillStyle = 'white';
	this.ctx.font = "20px Arial";
	this.ctx.textBaseline = 'middle';
	this.ctx.fillText('Single Player', this.WIDTH/2, this.HEIGHT/2-75);

	this.ctx.fillText('Find Match', this.WIDTH/2, this.HEIGHT/2-75);
}*/
Game.prototype.init = function(){
	//this.initMines();
}
Game.prototype.initMines = function(){
	var i, j, x, y;
	// init 2d array cells to 0
	this.cells = new Array(this.width);
	for (i = 0; i < this.cells.length; i++){
		this.cells[i] = new Array(this.height);
		for (j = 0; j < this.cells[i].length; j++){
			this.cells[i][j] = new Cell();
		}
	}
	// randomly generate the miness
	for (i = 0; i < this.numOfMines; i++){
		do {
			x = this.randomInt(0, this.width - 1);
			y = this.randomInt(0, this.height - 1);
		} while(this.cells[x][y].isBomb);
		this.cells[x][y].isBomb = true;
	}
	// set the numbers
	for (i = 0; i < this.cells.length; i++){
		for (j = 0; j < this.cells[i].length; j++){
			this.cells[i][j].adjacentMines = this.adjacentMines(i, j);
		}
	}
}
Game.prototype.adjacentMines = function(x, y){
	var toCheck = this.getBorderCells(x, y);
	var i, x, y, count = 0;
	for (i = 0; i < toCheck.length; i++){
		x = toCheck[i][0];
		y = toCheck[i][1];
		if (x >= 0 && x < this.width && y >= 0 && y < this.height &&
			this.cells[x][y].isBomb){
			count++;
		}
	}
	return count;
}
Game.prototype.getBorderCells = function(x, y){
	return [[x - 1, y - 1], [x, y - 1], [x + 1, y - 1], [x + 1, y],
			[x + 1, y + 1],	[x, y + 1], [x - 1, y + 1], [x - 1, y]];
}
Game.prototype.randomInt = function (min, max){
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
Game.prototype.drawBoard = function(){
	var x, y;
	// draw board black
	this.ctx.fillStyle = Cell.colors[0];
	this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

	//draw gridlines
	this.ctx.strokeStyle = "white";
	for (x = 0; x <= this.width; x++){
		this.ctx.moveTo(x * this.cellSize, 0);
		this.ctx.lineTo(x * this.cellSize, this.HEIGHT);
		this.ctx.stroke();
	}
	for (y = 0; y <= this.height; y++){
		this.ctx.moveTo(0, y * this.cellSize);
		this.ctx.lineTo(this.WIDTH, y * this.cellSize);
		this.ctx.stroke();
	}
	// draw the mines
	/*for (x = 0; x < this.cells.length; x++){
		for (y = 0; y < this.cells[x].length; y++){
			if (this.cells[x][y].isBomb) {
				this.ctx.fillStyle = "red";
				this.ctx.fillRect(x * this.cellSize + 1, y * this.cellSize + 1, 
					this.cellSize - 2, this.cellSize -2);
			}
		}
	}*/
}

Game.prototype.colorSquare = function(x, y, color, number){
	var pixelx = x * this.cellSize;
	var pixely = y * this.cellSize;
	this.ctx.fillStyle = color;
	this.ctx.fillRect(pixelx + 1, pixely + 1, this.cellSize - 2, this.cellSize -2);
	if (number > 0 && color === Cell.colors[3]){
		this.ctx.fillStyle = "white";
		this.ctx.font = "20px Arial";
		this.ctx.fillText(number.toString(), pixelx + 9, pixely + this.cellSize - 8);
	}
}
Game.prototype.scan = function(x, y, mousebutton){
  mousebutton = mousebutton || 0
  // flag cell
  if (mousebutton === 2 && !this.cells[x][y].isCleared() && !this.cells[x][y].isBombed()){
    if (this.cells[x][y].isFlagged()) {
      this.cells[x][y].setDefault();
      this.cellBuffer.push({"c" : this.cells[x][y], "x" : x, "y" : y})
    }
    else if (this.cells[x][y].isDefault()) {
      this.cells[x][y].setFlagged();
      this.cellBuffer.push({"c" : this.cells[x][y], "x" : x, "y" : y})
    }
  } 
  else if (mousebutton < 2){
    // bombs flagged correctly, quick clear, recurse
    if (this.cells[x][y].isCleared() && this.correctFlags(x,y)){
    	this.recursescan2(x, y);
    } // clicked on a bomb
    else if (this.cells[x][y].isBomb){
      this.cells[x][y].setBombed();
      this.cellBuffer.push({"c" : this.cells[x][y], "x" : x, "y" : y})
    } // cleared a  cell
    else if (!this.cells[x][y].isCleared()){ 
    	this.recursescan1(x, y);
    }
  }
}
Game.prototype.recursescan1 = function(x, y){
	this.cells[x][y].setCleared();
	this.cellsRemaining--;
	this.cellBuffer.push({"c" : this.cells[x][y], "x" : x, "y" : y});

	if (this.cells[x][y].adjacentMines === 0){
		var toCheck = this.getBorderCells(x, y);
		var i, checkX, checkY;
		for (i = 0; i < toCheck.length; i++){
			checkX = toCheck[i][0];
			checkY = toCheck[i][1];
			if (checkX >= 0 && checkX < this.width && 
				checkY >= 0 && checkY < this.height &&
				!this.cells[checkX][checkY].isCleared() ){

				this.recursescan1(checkX, checkY);
			}
		}
	}
}
Game.prototype.recursescan2 = function(x, y){
	var toCheck = this.getBorderCells(x, y);
	var i, checkX, checkY;

	if (!this.cells[x][y].isCleared()){
		this.cells[x][y].setCleared();
		this.cellsRemaining--;
		this.cellBuffer.push({"c" : this.cells[x][y], "x" : x, "y" : y});
	}
	
	for (i = 0; i < toCheck.length; i++){
		checkX = toCheck[i][0];
		checkY = toCheck[i][1];
		if (checkX >= 0 && checkX < this.width && 
			checkY >= 0 && checkY < this.height &&
		  	!this.cells[checkX][checkY].isCleared() && !this.cells[checkX][checkY].isBomb){

			if (this.cells[checkX][checkY].adjacentMines === 0){
				this.recursescan2(checkX, checkY);
			}
			else {
				this.cells[checkX][checkY].setCleared();
				this.cellsRemaining--;
				this.cellBuffer.push({"c" : this.cells[checkX][checkY], "x" : checkX, "y" : checkY});
			}
			
		}
	}
}
Game.prototype.correctFlags = function(x, y){
	var toCheck = this.getBorderCells(x, y);
	var i, checkX, checkY;
	for (i = 0; i < toCheck.length; i++){
		checkX = toCheck[i][0];
		checkY = toCheck[i][1];
		if (checkX >= 0 && checkX < this.width && checkY >= 0 && checkY < this.height){
			if (!this.cells[checkX][checkY].isBombed() &&
				((this.cells[checkX][checkY].isFlagged() && !this.cells[checkX][checkY].isBomb) ||
				(!this.cells[checkX][checkY].isFlagged() && this.cells[checkX][checkY].isBomb))){
				return false;
			}
		}
	}
	return true;
}