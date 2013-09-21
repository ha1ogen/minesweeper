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

	this.initMines();
	this.drawBoard();
	this.canvas.addEventListener('mouseup', this.getMouse.bind(this), false);
}
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
	this.ctx.fillStyle = "black";
	this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

	//draw gridlines
	this.ctx.strokeStyle = "white";
	for (x = 1; x <= this.width; x++){
		this.ctx.moveTo(x * this.cellSize, 0);
		this.ctx.lineTo(x * this.cellSize, this.HEIGHT);
		this.ctx.stroke();
	}
	for (y = 1; y <= this.height; y++){
		this.ctx.moveTo(0, y * this.cellSize);
		this.ctx.lineTo(this.WIDTH, y * this.cellSize);
		this.ctx.stroke();
	}
	// draw the mines
	/*for (x = 0; x < this.cells.length; x++){
		for (y = 0; y < this.cells[x].length; y++){
			if (this.cells[x][y].isBomb) {
				this.ctx.fillStyle = "red";
				this.ctx.fillRect(x * this.cellSize + 1, y * this.cellSize + 1, this.cellSize - 2, this.cellSize -2);
			}
		}
	}*/
}
Game.prototype.getMouse = function(evt){
	var pixelx = evt.clientX - this.offsetLeft + window.pageXOffset;
	var pixely = evt.clientY - this.offsetTop + window.pageYOffset;
	pixelx = pixelx - (pixelx % this.cellSize);
	pixely = pixely - (pixely % this.cellSize);
	this.scan(pixelx, pixely, evt.button);
}
Game.prototype.colorSquare = function(pixelx, pixely, color, number){
	this.ctx.fillStyle = color;
	this.ctx.fillRect(pixelx + 1, pixely + 1, this.cellSize - 2, this.cellSize -2);
	if (number > 0){
		this.ctx.font = "20px Arial";
		this.ctx.fillStyle = "white";
		this.ctx.fillText(number.toString(), pixelx + 9, pixely + this.cellSize - 8);
	}
}
Game.prototype.scan = function(pixelx, pixely, mousebutton){
	var x = pixelx / this.cellSize;
	var y = pixely / this.cellSize;
	mousebutton = mousebutton || 0
	// flag cell
	if (mousebutton === 2 && !this.cells[x][y].isCleared() && !this.cells[x][y].isBombed()){
		if (this.cells[x][y].isFlagged()) {
			this.cells[x][y].setDefault();
			this.colorSquare(pixelx, pixely, Cell.colors[this.cells[x][y].state]);
		}
		else if (this.cells[x][y].isDefault()) {
			this.cells[x][y].setFlagged();
			this.colorSquare(pixelx, pixely, Cell.colors[this.cells[x][y].state]);
		}
	} 
	else if (mousebutton < 2){
		// bombs flagged correctly, quick clear, recurse
		if (this.cells[x][y].isCleared() && this.correctFlags(x,y)){
			var toCheck = this.getBorderCells(x, y);
			var i, checkX, checkY;
			for (i = 0; i < toCheck.length; i++){
				checkX = toCheck[i][0];
				checkY = toCheck[i][1];
				if (checkX >= 0 && checkX < this.width && checkY >= 0 && checkY < this.height &&
					!this.cells[checkX][checkY].isCleared() && !this.cells[checkX][checkY].isBomb){
					this.scan(checkX * this.cellSize, checkY * this.cellSize);
				}
			}
		} // clicked on a bomb, show bomb
		else if (this.cells[x][y].isBomb){
			this.cells[x][y].setBombed();
			this.colorSquare(pixelx, pixely, Cell.colors[this.cells[x][y].state]);
		} // cleared a numbered cell
		else if (this.cells[x][y].adjacentMines > 0){
			this.cells[x][y].setCleared();
			this.colorSquare(pixelx, pixely, Cell.colors[this.cells[x][y].state], this.cells[x][y].adjacentMines);
		}
		else { // cleared a 0 cell, recurse
			this.cells[x][y].setCleared();
			this.colorSquare(pixelx, pixely, Cell.colors[this.cells[x][y].state]);
			var toCheck = this.getBorderCells(x, y);
			var i, checkX, checkY;
			for (i = 0; i < toCheck.length; i++){
				checkX = toCheck[i][0];
				checkY = toCheck[i][1];
				if (checkX >= 0 && checkX < this.width && checkY >= 0 && checkY < this.height &&
					!this.cells[checkX][checkY].isCleared()){
					this.scan(checkX * this.cellSize, checkY * this.cellSize);
				}
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
			if ((this.cells[checkX][checkY].isFlagged() && !this.cells[checkX][checkY].isBomb) ||
				(!this.cells[checkX][checkY].isFlagged() && this.cells[checkX][checkY].isBomb) ||
				this.cells[checkX][checkY].isBombed()){
				return false;
			}
		}
	}
	return true;
}

window.onload = function(){
	var game = new Game();
}

function Cell(){
	this.adjacentMines = 0;
	this.isBomb = false;
	this.setDefault();
}
Cell.prototype.isDefault = function(){
	if (this.state === Cell.state['default'])
		return true;
	else
		return false;
}
Cell.prototype.isFlagged = function(){
	if (this.state === Cell.state['flagged'])
		return true;
	else
		return false;
}
Cell.prototype.isBombed = function(){
	if (this.state === Cell.state['bombed'])
		return true;
	else
		return false;
}
Cell.prototype.isCleared = function(){
	if (this.state === Cell.state['cleared'])
		return true;
	else
		return false;
}
Cell.prototype.setDefault = function(){
	this.state = Cell.state['default'];
}
Cell.prototype.setFlagged = function(){
	this.state = Cell.state['flagged'];
}
Cell.prototype.setBombed = function(){
	this.state = Cell.state['bombed'];
}
Cell.prototype.setCleared = function(){
	this.state = Cell.state['cleared'];
}

Cell.state = {
	"default" : 0,
	"flagged" : 1,
	"bombed" : 2,
	"cleared" : 3
};

Cell.colors = {
	0 : "black",
	1 : "yellow",
	2 : "red",
	3 : "#68B3D4"
};

