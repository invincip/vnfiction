angular.module('FictionApp', ['chieffancypants.loadingBar', 'ngAnimate', 'ui.bootstrap'])
  .controller('FictionCtrl', function ($scope, $http, $timeout, cfpLoadingBar, $sce) {
    // Sorting helper
    $scope.sortBy = 'name';
    $scope.sortOrder = 'ascend';
    var story_sort = function(a, b) {
      switch ($scope.sortBy) {
        case 'length':
          result = a.stats.length - b.stats.length;
          break;
        case 'chapters':
          result = a.stats.chapters - b.stats.chapters;
          break;
        case 'view':
          result = a.stats.read - b.stats.read;
          break;
        case 'name':
        default:
          result = a.name.trim().localeCompare(b.name.trim());
      }
      if ($scope.sortOrder === 'descend')
        result = result * -1;
      return result;
    }
    $scope.sort = function(criterion) {
      $scope.sortBy = criterion;
      $scope.currentPage = 1;
      $scope.$broadcast("page_changed");
      $scope.updateCurrentItems();
    }
    $scope.order = function(order) {
      $scope.sortOrder = order;
      $scope.currentPage = 1;
      $scope.$broadcast("page_changed");
      $scope.updateCurrentItems();
    }
    
    // Catalog
    $scope._catalog = [];
    $scope.catalog = function() {
      var result = null;
      
      // Filter catalog
      result = $scope._catalog.filter(function(story) {
        return ($scope.completionDisabledStates.indexOf(story.stats.completed) === -1) 
          && ($scope.ratingDisabledStates.indexOf(story.stats.rating) === -1);
      });
      
      // Sort catalog
      result = result.sort(story_sort);
      
      // Update item count
      $scope.totalItems = result.length;
      
      return result;
    };
      
    // Navigations
    $scope.pageLimit = 10;
    $scope.pageOffset = function() {
      return ($scope.currentPage - 1) * $scope.pageLimit;
    };
    $scope.currentItems = [];
    $scope.totalItems = 0;
    $scope.currentPage = 1;
    $scope.updateCurrentItems = function() {
      $scope.currentItems = $scope.catalog().slice($scope.pageOffset(), $scope.pageOffset() + $scope.pageLimit);
    }
    $scope.pageChanged = function () {
      $scope.updateCurrentItems();
      $scope.$broadcast("page_changed");
    }
    
    // Filtering states
    $scope.completionDisabledStates = []
    $scope.completionStates = function() {
      result = [];
      $scope._catalog.forEach(function(story) {
        if (result.indexOf(story.stats.completed) === -1) {
          result.push(story.stats.completed);
        }
      });
      
      return result.sort();
    }
    $scope.toggleCompletionState = function(state) {
      var index = $scope.completionDisabledStates.indexOf(state);
      if ( index === -1) {
        $scope.completionDisabledStates.push(state);
      } else {
        $scope.completionDisabledStates.splice(index, 1);
      }
      $scope.updateCurrentItems();
    }
    $scope.ratingDisabledStates = []
    $scope.ratingStates = function() {
      result = [];
      $scope._catalog.forEach(function(story) {
        if (story.stats.rating && result.indexOf(story.stats.rating) === -1) {
          result.push(story.stats.rating);
        }
      });
      
      return result.sort();
    }
    $scope.toggleRatingState = function(state) {
      var index = $scope.ratingDisabledStates.indexOf(state);
      if ( index === -1) {
        $scope.ratingDisabledStates.push(state);
      } else {
        $scope.ratingDisabledStates.splice(index, 1);
      }
      $scope.updateCurrentItems();
    }
    
    // View panel
    $scope.panelShowed = false;
    $scope.panelItem = {
      title: null,
      content: null
    };
    $scope.view = function(story) {
      $scope.panelShowed = true;
      $scope.panelItem.title = story.name;
      $http.get('partials/' + story.sid + '.html').success(function(data) {
        $scope.panelItem.content = $sce.trustAsHtml(data);
      });
    }
    $scope.closePanel = function() {
      $scope.panelShowed = false;
      $scope.panelItem.content = null; // Release memory
    }  
    $scope.showPanel = function() {
      $scope.panelShowed = true;
    }
    
    // Download catalog
    $http.get('catalog.json').success(function(data) {
      $scope._catalog = data;
      $scope._catalog.forEach(function(story) {
        story.abstract = $sce.trustAsHtml(story.abstract);
      });
      $scope.updateCurrentItems();
    })
  })
  .directive("scrollToTopWhen", function ($timeout) {
    return { 
      link: function (scope, element, attrs) {
        scope.$on(attrs.scrollToTopWhen, function () {
          $timeout(function () {
            angular.element(element)[0].scrollTop = 0;
          }, 100);
        });
      }
    }
  });
