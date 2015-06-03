'use strict';

angular.module('mms.directives')
.directive('mmsTranscludeVal', ['ElementService', 'UtilsService', '$log', '$compile', '$templateCache', 'growl', mmsTranscludeVal]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsTranscludeVal
 *
 * @requires mms.ElementService
 * @requires mms.UtilsService
 * @requires $compile
 *
 * @restrict E
 *
 * @description
 * Given an element id, puts in the element's value binding, if there's a parent 
 * mmsView directive, will notify parent view of transclusion on init and val change,
 * and on click. The element should be a Property. Nested transclusions within 
 * string values will also be registered.
 *
 * @param {string} mmsEid The id of the element whose value to transclude
 * @param {string=master} mmsWs Workspace to use, defaults to master
 * @param {string=latest} mmsVersion Version can be alfresco version number or timestamp, default is latest
 */
function mmsTranscludeVal(ElementService, UtilsService, $log, $compile, $templateCache, growl) {
    var valTemplate = $templateCache.get('mms/templates/mmsTranscludeVal.html');

    var mmsTranscludeValLink = function(scope, element, attrs, mmsViewCtrl) {
        var processed = false;
        scope.cfType = 'val';
        element.click(function(e) {
            if (mmsViewCtrl)
                mmsViewCtrl.transcludeClicked(scope.mmsEid);
            if (e.target.tagName !== 'A')
                return false;
        });

        var recompile = function() {
            var toCompileList = [];
            var areStrings = false;
            for (var i = 0; i < scope.values.length; i++) {
                if (scope.values[i].type === 'LiteralString') {
                    areStrings = true;
                    var s = scope.values[i].string;
                    if (s.indexOf('<p>') === -1) {
                        s = s.replace('<', '&lt;');
                    }
                    toCompileList.push(s);
         } else {
                    break;
                }
            } 
            element.empty();
            if (scope.values.length === 0 || Object.keys(scope.values[0]).length < 2)
                element.html('<span' + ((scope.version === 'latest') ? '' : ' class="placeholder"') + '>(no value)</span>');
            else if (areStrings) {
                var toCompile = toCompileList.join(' ');
                if (toCompile === '') {
                    element.html('<span' + ((scope.version === 'latest') ? '' : ' class="placeholder"') + '>(no value)</span>');
             return;
                }
                element.append(toCompile);
                $compile(element.contents())(scope); 
            } else {
                element.append(valTemplate);
                $compile(element.contents())(scope);
            }
            if (mmsViewCtrl) {
                mmsViewCtrl.elementTranscluded(scope.element);
            }
        };

        scope.$watch('mmsEid', function(newVal, oldVal) {
            if (!newVal || (newVal === oldVal && processed))
                return;
            processed = true;
            if (UtilsService.hasCircularReference(scope, scope.mmsEid, 'val')) {
                //$log.log("prevent circular dereference!");
                element.html('<span class="error">Circular Reference!</span>');
                return;
            }
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
                scope.values = scope.element.specialization.value;
                if (scope.element.specialization.type === 'Constraint' && scope.element.specialization.specification)
                    scope.values = [scope.element.specialization.specification];
                recompile();
                scope.$watch('values', recompile, true);
            }, function(reason) {
                element.html('<span class="error">value cf ' + newVal + ' not found</span>');
         growl.error('Cf Val Error: ' + reason.message + ': ' + scope.mmsEid);
            });
        });
    };

    return {
        restrict: 'E',
        //template: template,
        scope: {
            mmsEid: '@',
            mmsWs: '@',
            mmsVersion: '@'
        },
        require: '?^mmsView',
        //controller: ['$scope', controller]
        link: mmsTranscludeValLink
    };
}
