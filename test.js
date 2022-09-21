function Test() {
	myFunc = function () {
		alert('a');
	};
	return this;
}

Test.myFunc = function () {
	alert('b');
};
Test.prototype.myFunc = function () {
	alert('c');
};
var myFunc = function () {
	alert('d');
};
function myFunc() {
	alert('e');
}
