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
