var searchApp = angular.module('searchApp', ['ngRoute']);

searchApp.config(function($routeProvider) {
	$routeProvider
		.when('/', {
			controller: 'SearchCtrl',
			templateUrl: 'search.html'
		})
		.when('/results/:userId', {
			controller: 'ResultsCtrl',
			templateUrl: 'results.html'
		})
		.otherwise({
			redirectTo: '/'
		});
});

searchApp.controller('SearchCtrl', function($scope, $location) {
	$scope.userName = "";
	
	$scope.searchUser = function() {
		var id = getUserId($scope.userName);
		if (id >= 0) {
			$location.path('/results/' + id);
		}
	};
});

searchApp.controller('ResultsCtrl', function($scope, $routeParams) {
	$scope.userData = {
		movieList: getList($routeParams.userId),
		intro: "Welcome User #" + $routeParams.userId,
		display: true,
		count: "two" //count: 2
	};
	$scope.movieForms = {
		one: '{} movie',
		other: '{} movies'
	};
	
	//$scope.userName = getUserName($routeParams.userId);
	
	$scope.alertUserName = function() {
		alert("The user is " + $scope.userName); //MISTAKE #1: userName is not defined in model ResultsCtrl
	};
});

function getUserId(name) {
	if (name == "Frolin") {
		return 0;
	}
	else if (name == "CountSolo") {
		return 1;
	}
	else {
		return -1;
	}
}

function getList(id) {
	if (id == 0) {
		return [
			{name: "Star Wars",
			oscars: 6},
			{name: "8 1/2",
			oscars: 2}
		];
	}
	else if (id == 1) {
		return [
			{name: "Seven Samurai",
			oscars: 0},
			{name: "Citizen Kane",
			oscars: 1}
		];
	}
	else {
		return [];
	}
}

function getUserName(id) {
	if (id == 0) {
		return "Frolin";
	}
	else if (id == 1) {
		return "CountSolo";
	}
	else {
		return null;
	}
}

var x = hello("some string");
var y = hello("hello world");
var z = hello("");
var a = hello(5);

function dummy() {
    x = {
        a: false,
        b: true
    }
    return null;
}

function anotherDummy() {
    return undefined;
}

var tpm = someFunc(tpm);
var aotc = someFunc(aotc);
var rots = someFunc(rots);
var anh = someFunc(anh);
var esb = someFunc(tesb);
var rotj = someFunc(rotj);
var tfa = someFunc(tfa);
var e8 = someFunc(e8);
var e9 = someFunc(e9);
var e10 = someFunc(e10);
var e11 = someFunc(e11);
var e12 = someFunc(e12);
var e13 = someFunc(e13);
var e14 = someFunc(e14);
var e15 = someFunc(e15);
var e16 = someFunc(e16);
var e17 = someFunc(e17);
var e18 = someFunc(e18);
var e19 = someFunc(e19);
var e20 = someFunc(e20);

function testFunc() {
    x = anotherFunc("e1tpm");
    x = anotherFunc("e2aotc");
    x = anotherFunc("e3rots");
    x = anotherFunc("e4anh");
    x = anotherFunc("e5esb");
    x = anotherFunc("e6rotj");
    x = anotherFunc("e7tfa");
}