
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
	1 : "#ffd900",
	2 : "red",
	//3 : "#68B3D4"
	3 : "#3c6996"
};
