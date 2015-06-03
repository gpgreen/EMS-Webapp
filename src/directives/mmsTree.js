'use strict';

angular.module('mms.directives')
.directive('mmsTree', ["$timeout", "$log", '$templateCache', mmsTree]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsTree
 *
 * @requires $timeout
 * @requires $templateCache
 *
 * @restrict E
 *
 * @description
 * Outputs a tree with customizable icons for different types of nodes and callback
 * for node branch clicked. Includes api, see methods section. (the name display is
 * angular data binded)
 * Object for tree model require (can have multiple roots):
 *  <pre>
    [
        {
            label: 'root node name',
            type: 'a type',
            data: {name: 'name will be shown', ...},
            children: [{...}]
        },
        {
            label: 'another root node',
            type: 'another type',
            data: {name: 'another name', ...},
            children: [{...}]
        }
    ]
    </pre>
 * Tree options:
 *  <pre>
    {
        types: {
            'a type': 'fa fa-file-o',
            'another type': 'fa fa-file'
        }
    }
    </pre>
 *
 * ## Example 
 * ### controller (js)
 *  <pre>
    angular.module('app', ['mms.directives'])
    .controller('TreeCtrl', ['$scope', function($scope) {
        $scope.api = {}; //empty object to be populated by the spec api
        $scope.handler = function(branch) {
            //branch selected
        };
        $scope.treeData = [
            {
                label: 'Root',
                type: 'Package',
                data: {
                    name: 'Root',
                    sysmlid: 'id',
                    //any other stuff
                },
                children: [
                    {
                        label: 'Child',
                        type: 'Class',
                        data: {
                            name: 'Child',
                            sysmlid: 'blah',
                            //other stuff
                        },
                        children: []
                    }
                ]
            }
        ];
        $scope.options = {
            types: {
                'Package': 'fa fa-folder',
                'Class': 'fa fa-bomb'
            }
        };
    }]);
    </pre>
 * ### template (html)
 *  <pre>
    <div ng-controller="TreeCtrl">
        <mms-tree tree-data="treeData" on-select="handler(branch)" options="options" tree-control="api"></mms-tree>
    </div>
    </pre>
 *
 * @param {Array} treeData Array of root nodes
 * @param {Object=} treeControl Empty object to populate with api
 * @param {Object=} options Options object to customize icons for types and statuses
 * @param {expression=} onSelect Handler for branch selected
 * @param {string='fa fa-caret-right'} iconExpand icon to use when branch is collapsed
 * @param {string='fa fa-caret-down'} iconCollapse icon to use when branch is expanded
 * @param {string='fa fa-file'} iconDefault default icon to use for nodes
 * @param {boolean=false} sectionNumbering Add section numbers
 * @param {string} search filter on labels
 */
function mmsTree($timeout, $log, $templateCache) {

    var mmsTreeLink = function(scope, element, attrs) {
        scope.search = "";
        
 if (!attrs.iconExpand)
            attrs.iconExpand = 'fa fa-caret-right fa-lg fa-fw';
        if (!attrs.iconCollapse)
            attrs.iconCollapse = 'fa fa-caret-down fa-lg fa-fw';
        if (!attrs.iconDefault)
            attrs.iconDefault = 'fa fa-file fa-fw';
        if (!attrs.expandLevel)
            attrs.expandLevel = '1';
 var expand_level = parseInt(attrs.expandLevel, 10);
        if (!angular.isArray(scope.treeData)) {
            $log.warn('treeData is not an array!');
            return;
        }

        var for_each_branch = function(func) {
            var run = function(branch, level) {
                func(branch, level);
                if (branch.children) {
                    for (var i = 0; i < branch.children.length; i++) {
                        run(branch.children[i], level + 1);
                    }
                }
            };
            for (var i = 0; i < scope.treeData.length; i++) {
                run(scope.treeData[i], 1);
            }
        };

        var remove_branch = function (branch) {
            var parent_branch = get_parent(branch);
            for (var i = 0; i < parent_branch.children.length; i++)
                if (parent_branch.children[i].uid === branch.uid)
                    parent_branch.children.splice(i,1);
        };

 var get_parent = function(child) {
            var parent = null;
            if (child.parent_uid) {
                for_each_branch(function(b) {
                    if (b.uid === child.parent_uid) {
                        parent = b;
                    }
                });
            }
            return parent;
        };

        var for_all_ancestors = function(child, fn) {
            var parent = get_parent(child);
            if (parent) {
                fn(parent);
                for_all_ancestors(parent, fn);
            }
        };

        var expand_all_parents = function(child) {
            for_all_ancestors(child, function(b) {
                b.expanded = true;
            });
        };

        var selected_branch = null;
        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsTree#select_branch
         * @methodOf mms.directives.directive:mmsTree
         * 
         * @description 
         * self explanatory
         *
         * @param {Object} branch branch to select
         */
        var select_branch = function(branch) {
            if (!branch) {
                if (selected_branch)
                    selected_branch.selected = false;
                selected_branch = null;
                return;
            }
            if (branch !== selected_branch) {
                if (selected_branch)
                    selected_branch.selected = false;
                branch.selected = true;
                selected_branch = branch;
                expand_all_parents(branch);
                if (branch.onSelect) {
                    $timeout(function() {
                        branch.onSelect(branch);
                    });
                } else if (scope.onSelect) {
                    $timeout(function() {
                        scope.onSelect({branch: branch});
                    });
                }
            }
        };

        var on_initialSelection_change = function() {
            if (scope.initialSelection) {
                for_each_branch(function(b) {
                    if (b.data.sysmlid === scope.initialSelection || b.data.id === scope.initialSelection)
                 select_branch(b);
                });
                on_treeData_change();
            }
        };

        var on_treeData_change = function() {
            for_each_branch(function(b, level) {
                if (!b.uid)
                    b.uid = '' + Math.random();
            });
            for_each_branch(function(b) {
                if (angular.isArray(b.children)) {
                    for (var i = 0; i < b.children.length; i++) {
                        var child = b.children[i];
                        child.parent_uid = b.uid;
                    }
                }
            });
            scope.tree_rows = [];
            var add_branch_to_list = function(level, section, branch, visible) {
                var expand_icon = "";
                var type_icon = "";
                var status_properties = { style: "" };
                var button_properties = "";

                if (!branch.expanded)
                    branch.expanded = false;
                if (branch.children && branch.children.length > 0) {
                    if (branch.expanded) 
                        expand_icon = attrs.iconCollapse;
                    else
                        expand_icon = attrs.iconExpand;
                } else
                    expand_icon = "fa fa-lg fa-fw";

                if (branch.loading)
                    type_icon = "fa fa-spinner fa-spin";
                else if (scope.options && scope.options.types && scope.options.types[branch.type])
                    type_icon = scope.options.types[branch.type.toLowerCase()];
         else
                    type_icon = attrs.iconDefault;

                if (scope.options && scope.options.statuses && scope.options.statuses[branch.status]) {
                    status_properties = scope.options.statuses[branch.status];
                    if (scope.options.buttons && scope.options.buttons[status_properties.button]) {
                        button_properties = scope.options.buttons[status_properties.button];
                    }
                }

                scope.tree_rows.push({
                    level: level,
                    section: section,
                    branch: branch,
                    label: branch.label,
                    expand_icon: expand_icon,
                    visible: visible,
                    status: branch.status,
                    status_properties: status_properties,
                    button_properties: button_properties,
                    type_icon: type_icon
                });
                if (branch.children) {
                    if (scope.options.sort) {
                        branch.children.sort(scope.options.sort);
                    }
             for (var i = 0, j = 0; i < branch.children.length; i++) {
                        var child_visible = visible && branch.expanded;
                        var sectionChar = '.';
                        var sectionValue = '';
                        if (section === '')
                            sectionChar = '';
                        if (branch.children[i].type === 'section')
                            add_branch_to_list(level + 1, '§ ', branch.children[i], child_visible);
                        else {
                            j++;
                            if (scope.sectionNumbering) {
                                sectionValue = section + sectionChar + j;
                                add_branch_to_list(level + 1, sectionValue, branch.children[i], child_visible);
                            } else
                                add_branch_to_list(level + 1, '', branch.children[i], child_visible);
                        }
                    }
                }
            };

            if (scope.options.sort) {
                scope.treeData.sort(scope.options.sort);
            }

            for (var i = 0; i < scope.treeData.length; i++) {
                add_branch_to_list(1, '', scope.treeData[i], true);
            }

 };
        scope.on_treeData_change = on_treeData_change;
        scope.$watch('treeData', on_treeData_change, false);
        scope.$watch('initialSelection', on_initialSelection_change);
        scope.tree_rows = [];

        if (attrs.initialSelection) {
            for_each_branch(function(b) {
                if (b.data.sysmlid === attrs.initialSelection || b.data.id === attrs.initialSelection) {
             $timeout(function() {
                        select_branch(b);
                    });
                }
            });

        }

        for_each_branch(function(b, level) {
            b.level = level;
            b.expanded = b.level <= expand_level;
        });

        on_treeData_change();

        scope.user_clicks_branch = function(branch) {
            if (branch !== selected_branch) 
                select_branch(branch);
        };

        if (angular.isObject(scope.treeControl)) {
            var tree = scope.treeControl;
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsTree#expand_all
             * @methodOf mms.directives.directive:mmsTree
             * 
             * @description 
             * self explanatory
             */
            tree.expand_all = function() {
                for_each_branch(function(b, level) {
                    b.expanded = true;
                });
                on_treeData_change();
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsTree#collapse_all
             * @methodOf mms.directives.directive:mmsTree
             * 
             * @description 
             * self explanatory
             */
            tree.collapse_all = function() {
                for_each_branch(function(b, level) {
                    b.expanded = false;
                });
                on_treeData_change();
            };
            tree.get_first_branch = function() {
                if (scope.treeData.length > 0)
                    return scope.treeData[0];
            };
            tree.select_first_branch = function() {
                var b = tree.get_first_branch();
                select_branch(b);
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsTree#get_selected_branch
             * @methodOf mms.directives.directive:mmsTree
             * 
             * @description 
             * self explanatory
             *
             * @return {Object} current selected branch
             */
            tree.get_selected_branch = function() {
                return selected_branch;
            };

            tree.clear_selected_branch = function() {
                selected_branch = null;
            };

     tree.get_parent_branch = get_parent;
            tree.select_branch = select_branch;
            tree.get_children = function(b) {
                return b.children;
            };
            tree.select_parent_branch = function(b) {
                var p = tree.get_parent_branch(b);
                if (p) 
                    tree.select_branch(p);
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsTree#add_branch
             * @methodOf mms.directives.directive:mmsTree
             * 
             * @description 
             * self explanatory
             *
             * @param {Object} parent parent branch or null 
             * @param {Object} new_branch branch to add to parent or root
             */
            tree.add_branch = function(parent, new_branch, top) {
                if (parent) {
                    if (top)
                        parent.children.unshift(new_branch);
                    else
                        parent.children.push(new_branch);
                    parent.expanded = true;
                } else {
                    if (top)
                        scope.treeData.unshift(new_branch);
                    else
                        scope.treeData.push(new_branch);
                }
                on_treeData_change();
            };

            tree.remove_branch = function(branch) {
                remove_branch(branch);
                on_treeData_change();
            };

     tree.add_root_branch = function(new_branch) {
                tree.add_branch(null, new_branch);
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsTree#expand_branch
             * @methodOf mms.directives.directive:mmsTree
             * 
             * @description 
             * self explanatory
             *
             * @param {Object} branch branch to expand
             */
            tree.expand_branch = function(b) {
                if (!b)
                    b = tree.get_selected_branch();
                if (b)
                    b.expanded = true;
                on_treeData_change();
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsTree#collapse_branch
             * @methodOf mms.directives.directive:mmsTree
             * 
             * @description 
             * self explanatory
             *
             * @param {Object} branch branch to collapse
             */
            tree.collapse_branch = function(b) {
                if (!b)
                    b = selected_branch;
                if (b)
                    b.expanded = false;
                on_treeData_change();
            };
            tree.get_siblings = function(b) {
                var siblings;
                var p = tree.get_parent_branch(b);
                if (p)
                    siblings = p.children;
                else
                    siblings = scope.treeData;
                return siblings;
            };
            tree.get_next_sibling = function(b) {
                var siblings = tree.get_siblings(b);
                if (angular.isArray(siblings)) {
                    var i = siblings.indexOf(b);
                    if (i < siblings.length - 1)
                        return siblings[i + 1];
                }
            };
            tree.get_prev_sibling = function(b) {
                var siblings = tree.get_siblings(b);
                if (angular.isArray(siblings)) {
                    var i = siblings.indexOf(b);
                    if (i > 0) 
                        return siblings[i - 1];
                }
            };
            tree.select_next_sibling = function(b) {
                var next = tree.get_next_silbing(b);
                if (next)
                    tree.select_branch(next);
            };
            tree.select_prev_sibling = function(b) {
                var prev = tree.get_prev_sibling(b);
                if (prev)
                    tree.select_branch(prev);
            };
            tree.get_first_child = function(b) {
                if (!b)
                    b = selected_branch;
                if (b && b.children && b.children.length > 0)
                    return b.children[0];
            };
            tree.get_closest_ancestor_next_sibling = function(b) {
                var next = tree.get_next_sibling(b);
                if (next)
                    return next;
                else {
                    next = tree.get_parent_branch(b);
                    return tree.get_closest_ancestor_next_sibling(next);
                }
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsTree#get_next_branch
             * @methodOf mms.directives.directive:mmsTree
             * 
             * @description 
             * self explanatory
             *
             * @param {Object} branch current branch
             * @return {Object} next branch
             */
            tree.get_next_branch = function(b) {
                if (!b)
                    b = selected_branch;
                if (b) {
                    var next = tree.get_first_child(b);
                    if (next)
                        return next;
                    else {
                        next = tree.get_closest_ancestor_next_sibling(b);
                        return next;
                    }
                }
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsTree#select_next_branch
             * @methodOf mms.directives.directive:mmsTree
             * 
             * @description 
             * self explanatory
             *
             * @param {Object} branch current branch
             */
            tree.select_next_branch = function(b) {
                var next = tree.get_next_branch(b);
                if (next)
                    tree.select_branch(next);
            };
            tree.last_descendant = function(b) {
                if (b) {
                    if (b.children.length === 0)
                        return b;
                    var last = b.children[b.children.length - 1];
                    return tree.last_descendant(last);
                }
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsTree#get_prev_branch
             * @methodOf mms.directives.directive:mmsTree
             * 
             * @description 
             * self explanatory
             *
             * @param {Object} branch current branch
             * @return {Object} previous branch
             */
            tree.get_prev_branch = function(b) {
                var prev_sibling = tree.get_prev_sibling(b);
                if (prev_sibling)
                    return tree.last_descendant(prev_sibling);
                return tree.get_parent_branch(b);
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsTree#select_prev_branch
             * @methodOf mms.directives.directive:mmsTree
             * 
             * @description 
             * self explanatory
             *
             * @param {Object} branch current branch
             */
            tree.select_prev_branch = function(b) {
                var prev = tree.get_prev_branch(b);
                if (prev)
                    tree.select_branch(prev);
            };

            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsTree#refresh
             * @methodOf mms.directives.directive:mmsTree
             * 
             * @description 
             * rerender the tree when data or options change
             */
            tree.refresh = function() {
                on_treeData_change();
            };

            tree.sort_branch = function(b, sortFunction) {
                b.children.sort(sortFunction);
            };
 }
    };

    return {
        restrict: 'E',
        template: $templateCache.get('mms/templates/mmsTree.html'),
        // replace: true,
 scope: {
            treeData: '=',
            sectionNumbering: '=',
            onSelect: '&',
            initialSelection: '@',
            treeControl: '=',
            search: '=',
            options: '='
        },
        link: mmsTreeLink
    };
}
