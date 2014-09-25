'use strict';

angular.module('myApp', ['ui.router', 'mms', 'mms.directives', 'fa.directive.borderLayout', 'ui.bootstrap', 'ui.tree', 'angular-growl'])
.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider
    .state('doc', {
        url: '/sites/:site/products/:docId/:time',
        resolve: {
            document: function($stateParams, ElementService) {
                return ElementService.getElement($stateParams.docId, false, 'master', $stateParams.time);
            },
            site: function($stateParams, SiteService) {
                return SiteService.getSite($stateParams.site);
            },
            views: function($stateParams, ViewService) {
                return ViewService.getDocumentViews($stateParams.docId, false, 'master', $stateParams.time, true);
            },
            time: function($stateParams) {
                return $stateParams.time;
            },
            snapshots: function($stateParams, ConfigService) {
                return ConfigService.getProductSnapshots($stateParams.docId, $stateParams.site, 'master');
            }
        },
        views: {
            'menu': {
                template: '<mms-nav mms-responsive="true" mms-site="{{site}}" mms-title="{{title}}" mms-type="View Editor" mms-go-to="true" mms-other-sites="true"></mms-nav>',
                //template: '<mms-nav site="{{site}}" type="document"></mms-nav>',
                controller: function($scope, $stateParams, document, site) {
                    $scope.site = site.name;
                    if ($stateParams.time !== 'latest')
                        $scope.title = document.name + ' (' + $stateParams.time + ')';
                    else
                        $scope.title = document.name;
                    $scope.docweb = false;
                }
            },
            'pane-left': {
                templateUrl: 'partials/ve/pane-left.html',
                controller: 'NavTreeCtrl'
            },
            'pane-right': {
                templateUrl: 'partials/ve/pane-right.html',
                controller: 'ToolCtrl'
            },
            'toolbar-right': {
                template: '<mms-toolbar buttons="buttons" on-click="onClick(button)" mms-tb-api="tbApi"></mms-toolbar>',
                controller: 'ToolbarCtrl'
            }
        }
    })
    .state('doc.view', {
        url: '/view/:viewId',
        views: {
            'pane-center@': {
                templateUrl: 'partials/ve/pane-center.html',
                controller: 'ViewCtrl'
            }
        },
        resolve: {
            viewElements: function($stateParams, ViewService, time) {
                return ViewService.getViewElements($stateParams.viewId, false, 'master', time);
            }
        }
    })
    .state('doc.order', {
        url: '/order',
        views: {
            'pane-center@': {
                templateUrl: 'partials/ve/reorder-views.html',
                controller: 'ReorderCtrl'
            }
        }
    })
    .state('doc.all', {
        url: '/all',
        views: {
            'pane-center@': {
                templateUrl: 'partials/ve/full-doc.html',
                controller: 'FullDocCtrl'
            }
        }
    });
});