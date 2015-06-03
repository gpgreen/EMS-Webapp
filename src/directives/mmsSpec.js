'use strict';

angular.module('mms.directives')
.directive('mmsSpec', ['ElementService', 'WorkspaceService', 'ConfigService', '$compile', '$templateCache', '$modal', '$q', 'growl', '_', mmsSpec]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsSpec
 *
 * @requires mms.ElementService
 * @requires $compile
 * @requires $templateCache
 * @requires $modal
 * @requires $q
 * @requires growl
 * @requires _
 *
 * @restrict E
 *
 * @description
 * Outputs a "spec window" of the element whose id is specified. Spec includes name,
 * documentation, and value if the element is a property. Also last modified time, 
 * last user, element id. Editability is determined by a param and also element
 * editability. Documentation and string values can have html and can transclude other
 * element properties. Conflict can occur during save based on last server read time
 * and offers choice of force save, discard edit or simple merge. To control saving
 * or editing pass in an api object that will be populated with methods (see methods seciton):
 *
 * ## Example spec with full edit (given permission)
 * ### controller (js)
 *  <pre>
    angular.module('app', ['mms.directives'])
    .controller('SpecCtrl', ['$scope', function($scope) {
        $scope.api = {}; //empty object to be populated by the spec api
        $scope.edit = function() {
            $scope.api.setEditing(true);
        };
        $scope.save = function() {
            $scope.api.save()
            .then(function(e) {
                //success
            }, function(reason) {
                //failed
            });
        };
    }]);
    </pre>
 * ### template (html)
 *  <pre>
    <div ng-controller="SpecCtrl">
        <button ng-click="edit()">Edit</button>
        <button ng-click="save()">Save</button>
        <mms-spec mms-eid="element_id" mms-edit-field="all" mms-spec-api="api"></mms-spec>
    </div>
    </pre>
 * ## Example for showing an element spec at a certain time
 *  <pre>
    <mms-spec mms-eid="element_id" mms-version="2014-07-01T08:57:36.915-0700"></mms-spec>
    </pre>
 * ## Example for showing a current element with nothing editable
 *  <pre>
    <mms-spec mms-eid="element_id" mms-edit-field="none"></mms-spec>
    </pre>
 *
 * @param {string} mmsEid The id of the element
 * @param {string=master} mmsWs Workspace to use, defaults to master
 * @param {string=latest} mmsVersion Version can be alfresco version number or timestamp, default is latest
 * @param {string=all} mmsEditField "all" or "none"
 * @param {Object=} mmsSpecApi An empty object that'll be populated with api methods
 * @param {Array=} mmsCfElements Array of element objects as returned by ElementService
 *      that can be transcluded into documentation or string values. Regardless, transclusion
 *      allows keyword searching elements to transclude from alfresco
 * @param {Object=} mmsElement An element object, if this is provided, a read only 
 *      element spec for it would be shown, this will not use mms services to get the element
 */
function mmsSpec(ElementService, WorkspaceService, ConfigService, $compile, $templateCache, $modal, $q, growl, _) {
    var readTemplate = $templateCache.get('mms/templates/mmsSpec.html');
    //var editTemplate = $templateCache.get('mms/templates/mmsSpecEdit.html');
    var template = $templateCache.get('mms/templates/mmsSpec.html');

    var mmsSpecLink = function(scope, element, attrs) {
        var keepMode = false;
        scope.editing = false;
        scope.editable = true;
        if (scope.mmsElement) {
            scope.element = scope.mmsElement;
            if (scope.element.specialization.type === 'Property')
                scope.values = scope.element.specialization.value;
            if (scope.element.specialization.type === 'Constraint')
                scope.value = scope.element.specialization.specification;
     scope.editable = false;
            //element.empty();
            //element.append(readTemplate);
            //$compile(element.contents())(scope);
            return;
        }
        scope.tinymceApi = {};
 /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSpec#changeElement
         * @methodOf mms.directives.directive:mmsSpec
         * 
         * @description 
         * change element in the spec, this would reevaluate whether it's editable
         * 
         * @param {string} newVal new element id
         */
        var changeElement = function(newVal, oldVal) {
            if (!newVal) {
                //element.empty();
                return;
            }
            WorkspaceService.getWorkspace(scope.mmsWs)
            .then(function(data) {
                scope.workspace = data;
            }, function(reason) {scope.workspace = null;});
            if (scope.edit && scope.tinymceApi.save)
                scope.tinymceApi.save();
            if (scope.mmsType === 'workspace') {
                WorkspaceService.getWorkspace(scope.mmsEid)
                .then(function(data) {
                    scope.element = data;
                    scope.editable = true;
                    WorkspaceService.getWorkspaceForEdit(scope.mmsEid)
                    .then(function(data) {
                        scope.edit = data;
                        scope.editable = true;
                        if (!keepMode)
                            scope.editing = false;
                        keepMode = false;
                    });
                });
            } else if (scope.mmsType === 'tag') {
                ConfigService.getConfig(scope.mmsEid, scope.mmsWs, false)
                .then(function(data) {
                    scope.element = data;
                    scope.editable = true;
                    ConfigService.getConfigForEdit(scope.mmsEid, scope.mmsWs)
                    .then(function(data) {
                        scope.edit = data;
                        scope.editable = true;
                        if (!keepMode)
                            scope.editing = false;
                        keepMode = false;
                    });
                });
            } else {
     ElementService.getElement(scope.mmsEid, false, scope.mmsWs, scope.mmsVersion)
            .then(function(data) {
                //element.empty();
                //var template = null;
                scope.element = data;
                if (scope.element.specialization.type === 'Property')
                    scope.values = scope.element.specialization.value;
                if (scope.element.specialization.type === 'Constraint')
                    scope.value = scope.element.specialization.specification;
         if (scope.mmsEditField === 'none' || 
                        !scope.element.editable || 
                        (scope.mmsVersion !== 'latest' && scope.mmsVersion)) {
                    scope.editable = false;
                    scope.edit = null;
                    scope.editing = false;
                    //scope.$emit('elementEditability', scope.editable);
                    //template = readTemplate;
                    
                    //element.append(template);
                    //$compile(element.contents())(scope); 
                } else {
                    ElementService.getElementForEdit(scope.mmsEid, false, scope.mmsWs)
                    .then(function(data) {
                        scope.edit = data;
                        scope.editable = true;
                        if (!keepMode)
                            scope.editing = false;
                        keepMode = false;
                        //template = editTemplate;
                        //scope.$emit('elementEditability', scope.editable);
                        if (scope.edit.specialization.type === 'Property' && angular.isArray(scope.edit.specialization.value)) {
                            scope.editValues = scope.edit.specialization.value;
                        }
                        if (scope.edit.specialization.type === 'Constraint' && scope.edit.specialization.specification) {
                            scope.editValue = scope.edit.specialization.specification;
                        }
                 //element.append(template);
                        //$compile(element.contents())(scope); 
                    });
                }
            }, function(reason) {
                //growl.error("Getting Element Error: " + reason.message);
            });
            }
        };
        scope.changeElement = changeElement;
        scope.$watch('mmsEid', changeElement);
        //scope.$watch('mmsType', changeElement);
        scope.$watch('mmsWs', changeElement);

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSpec#revertEdits
         * @methodOf mms.directives.directive:mmsSpec
         * 
         * @description 
         * reset editing object back to base element values for name, doc, values
         * 
         */
        scope.revertEdits = function() {
            if (scope.mmsType === 'workspace') {
                scope.edit.name = scope.element.name;
            } else if (scope.mmsType === 'tag') {
                scope.edit.name = scope.element.name;
                scope.edit.description = scope.element.description;
            } else {
     scope.edit.name = scope.element.name;
            scope.edit.documentation = scope.element.documentation;
            if (scope.edit.specialization.type === 'Property' && angular.isArray(scope.edit.specialization.value)) {
                scope.edit.specialization.value = _.cloneDeep(scope.element.specialization.value);
                scope.editValues = scope.edit.specialization.value;
            }
            if (scope.edit.specialization.type === 'Constraint' && scope.edit.specialization.specification) {
                scope.edit.specialization.specification = _.cloneDeep(scope.element.specialization.specification);
                scope.editValue = scope.edit.specialization.specification;
            }
            }
 };
        
        var conflictCtrl = function($scope, $modalInstance) {
            $scope.ok = function() {
                $modalInstance.close('ok');
            };
            $scope.cancel = function() {
                $modalInstance.close('cancel');
            };
            $scope.force = function() {
                $modalInstance.close('force');
            };
            $scope.merge = function() {
                $modalInstance.close('merge');
            };
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSpec#save
         * @methodOf mms.directives.directive:mmsSpec
         * 
         * @description 
         * save edited element
         * 
         * @return {Promise} promise would be resolved with updated element if save is successful.
         *      For unsuccessful saves, it will be rejected with an object with type and message.
         *      Type can be error or info. In case of conflict, there is an option to discard, merge,
         *      or force save. If the user decides to discord or merge, type will be info even though 
         *      the original save failed. Error means an actual error occured. 
         */
        scope.save = function() {
            var deferred = $q.defer();
            if (!scope.editable || !scope.editing) {
                deferred.reject({type: 'error', message: "Element isn't editable and can't be saved."});
                return deferred.promise;
            }
            if (scope.tinymceApi.save)
                scope.tinymceApi.save();
            if (scope.mmsType === 'workspace') {
                WorkspaceService.update(scope.edit)
                .then(function(data) {
                    deferred.resolve(data);
                }, function(reason) {
                    deferred.reject({type: 'error', message: reason.message});
                });
            } else if (scope.mmsType === 'tag') {
                ConfigService.update(scope.edit, scope.mmsWs)
                .then(function(data) {
                    deferred.resolve(data);
                }, function(reason) {
                    deferred.reject({type: 'error', message: reason.message});
                });
            } else {
     ElementService.updateElement(scope.edit, scope.mmsWs)
            .then(function(data) {
                deferred.resolve(data);
                //growl.success("Save successful");
                //scope.editing = false;
            }, function(reason) {
                if (reason.status === 409) {
                    scope.latest = reason.data.elements[0];
                    var instance = $modal.open({
                        template: $templateCache.get('mms/templates/saveConflict.html'),
                        controller: ['$scope', '$modalInstance', conflictCtrl],
                        scope: scope,
                        size: 'lg'
                    });
                    instance.result.then(function(choice) {
                        if (choice === 'ok') {
                            ElementService.getElementForEdit(scope.mmsEid, true, scope.mmsWs)
                            .then(function(data) {
                                //growl.info("Element Updated to Latest");
                                deferred.reject({type: 'info', message: 'Element Updated to Latest'});
                            }, function(reason) {
                                //growl.error("Element Update Error: " + reason.message);
                                deferred.reject({type: 'error', message: 'Element Update Error: ' + reason.message});
                            }); 
                        } else if (choice === 'merge') { 
                            ElementService.getElement(scope.mmsEid, true, scope.mmsWs)
                            .then(function(data) {
                                var currentEdit = scope.edit;
                                if (data.name !== currentEdit.name)
                                    currentEdit.name = data.name + ' MERGE ' + currentEdit.name;
                                if (data.documentation !== currentEdit.documentation)
                                    currentEdit.documentation = data.documentation + '<p>MERGE</p>' + currentEdit.documentation;
                                currentEdit.read = data.read;
                                currentEdit.modified = data.modified;
                         //growl.info("Element name and doc merged");
                                deferred.reject({type: 'info', message: 'Element name and doc merged'});
                            }, function(reason2) {
                                //growl.error("Merge error: " + reason2.message);
                                deferred.reject({type: 'error', message: 'Merge error: ' + reason2.message});
                            });
                        } else if (choice === 'force') {
                            scope.edit.read = scope.latest.read;
                            scope.edit.modified = scope.latest.modified;
                     scope.save().then(function(resolved) {
                                deferred.resolve(resolved);
                            }, function(error) {
                                deferred.reject(error);
                            });
                        } else
                            deferred.reject({type: 'cancel'});
                    });
                } else {
                    deferred.reject({type: 'error', message: reason.message});
                    //growl.error("Save Error: Status " + reason.status);
                }
            });
            }
     return deferred.promise;
        };

        scope.hasHtml = function(s) {
            if (s.indexOf('<p>') === -1)
                return false;
            return true;
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSpec#hasEdits
         * @methodOf mms.directives.directive:mmsSpec
         * 
         * @description 
         * whether editing object has changes compared to base element,
         * currently compares name, doc, property values, if element is not 
         * editable, returns false
         * 
         * @return {boolean} has changes or not
         */
        scope.hasEdits = function() {
            if (scope.edit === null)
                return false;
            if (scope.edit.name !== scope.element.name)
                return true;
            if (scope.edit.documentation !== scope.element.documentation)
                return true;
            if (scope.edit.specialization && scope.edit.specialization.type === 'Property' && 
                !angular.equals(scope.edit.specialization.value, scope.element.specialization.value))
                return true;
            if (scope.edit.description !== scope.element.description)
         return true;
            return false;
        };

        scope.addValueTypes = {string: 'LiteralString', boolean: 'LiteralBoolean', integer: 'LiteralInteger', real: 'LiteralReal'};
        scope.addValue = function(type) {
            if (type === 'LiteralBoolean')
                scope.editValues.push({type: type, boolean: false});
            else if (type === 'LiteralInteger')
                scope.editValues.push({type: type, integer: 0});
            else if (type === 'LiteralString')
                scope.editValues.push({type: type, string: ''});
            else if (type === 'LiteralReal')
                scope.editValues.push({type: type, double: 0.0});
        };
        scope.addValueType = 'LiteralString';

        if (angular.isObject(scope.mmsSpecApi)) {
            var api = scope.mmsSpecApi;
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsSpec#toggleEditing
             * @methodOf mms.directives.directive:mmsSpec
             * 
             * @description 
             * toggles editing
             * 
             * @return {boolean} toggle successful
             */
            api.toggleEditing = function() {
                if (!scope.editing) {
                    if (scope.editable)
                        scope.editing = true;
                    else
                        return false;
                } else {
                    scope.editing = false;
                }
                return true;
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsSpec#setEditing
             * @methodOf mms.directives.directive:mmsSpec
             * 
             * @description 
             * sets editing state
             * 
             * @param {boolean} mode true or false
             * @return {boolean} set successful
             */
            api.setEditing = function(mode) {
                if (mode) {
                    if (scope.editable)
                        scope.editing = true;
                    else
                        return false;
                } else
                    scope.editing = false;
                return true;
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsSpec#getEditing
             * @methodOf mms.directives.directive:mmsSpec
             * 
             * @description 
             * get editing state
             * 
             * @return {boolean} editing or not
             */
            api.getEditing = function() {
                return scope.editing;
            };
            api.save = scope.save;
            api.revertEdits = scope.revertEdits;
            api.changeElement = scope.changeElement;
            api.hasEdits = scope.hasEdits;
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsSpec#getEdits
             * @methodOf mms.directives.directive:mmsSpec
             * 
             * @description 
             * get current edit object
             * 
             * @return {Object} may be null or undefined, if not, is 
             *  current element object that can be edited (may include changes)
             */
            api.getEdits = function() {
                return scope.edit;
            };

            api.keepMode = function() {
                keepMode = true;
            };

            api.tinymceSave = function() {
                if (scope.edit && scope.tinymceApi.save)
                    scope.tinymceApi.save();
            };
 }
    };

    return {
        restrict: 'E',
        template: template,
        scope: {
            mmsEid: '@',
            mmsEditField: '@', //all or none or individual field
            mmsWs: '@',
            mmsSite: '@',
            mmsVersion: '@',
            mmsCfElements: '=', //array of element objects
            mmsElement: '=',
            mmsSpecApi: '=',
            mmsViewEdit: '=',
            mmsType: '@'
 },
        link: mmsSpecLink
    };
}
