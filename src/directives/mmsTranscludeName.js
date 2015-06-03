'use strict';

angular.module('mms.directives')
.directive('mmsTranscludeName', ['ElementService', '$compile', 'growl', mmsTranscludeName]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsTranscludeName
 *
 * @requires mms.ElementService
 * @requires $compile
 *
 * @restrict E
 *
 * @description
 * Given an element id, puts in the element's name binding, if there's a parent 
 * mmsView directive, will notify parent view of transclusion on init and name change,
 * and on click
 *
 * @param {string} mmsEid The id of the element whose name to transclude
 * @param {string=master} mmsWs Workspace to use, defaults to master
 * @param {string=latest} mmsVersion Version can be alfresco version number or timestamp, default is latest
 */
function mmsTranscludeName(ElementService, $compile, growl) {

    var mmsTranscludeNameLink = function(scope, element, attrs, mmsViewCtrl) {
        var processed = false;
        element.click(function(e) {
            if (!mmsViewCtrl)
                return false;
            mmsViewCtrl.transcludeClicked(scope.mmsEid);
            return false;
        });

        scope.$watch('mmsEid', function(newVal, oldVal) {
            if (!newVal || (newVal === oldVal && processed))
                return;
            processed = true;
            var ws = scope.mmsWs;
            var version = scope.mmsVersion;
            if (mmsViewCtrl) {
                var viewVersion = mmsViewCtrl.getWsAndVersion();
                if (!ws)
                    ws = viewVersion.workspace;
                if (!version)
                    version = viewVersion.version;
            }
            scope.version = version ? version : 'latest';
     ElementService.getElement(scope.mmsEid, false, ws, version)
            .then(function(data) {
                scope.element = data;
                if (mmsViewCtrl) {
                    mmsViewCtrl.elementTranscluded(scope.element);
                }
            }, function(reason) {
                element.html('<span class="error">name cf ' + newVal + ' not found</span>');
         growl.error('Cf Name Error: ' + reason.message + ': ' + scope.mmsEid);
            });
        });

        scope.$watch('element.name', function(newVal) {
            if (mmsViewCtrl && newVal) {
                mmsViewCtrl.elementTranscluded(scope.element);
            }
        });
    };

    return {
        restrict: 'E',
        template: '<span ng-if="element.name">{{element.name}}</span><span ng-if="!element.name" ng-class="{placeholder: version!=\'latest\'}">(no name)</span>',
 scope: {
            mmsEid: '@',
            mmsWs: '@',
            mmsVersion: '@'
        },
        require: '?^mmsView',
        //controller: ['$scope', controller]
        link: mmsTranscludeNameLink
    };
}
