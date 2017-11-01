/**
 * Finds all pattern inconsistencies given a set of hash bins
 */
define(function (require, exports, module) {
    'use strict';
    
    var utils = require('lib/utils');
    var subtreeFinder = require('lib/subtree_finder');
    var Constants = utils.Constants;
    
    /****
     * Queue Item Class
     ***/
    
    function QueueItem(_key, _bin) {
        this.key = _key;
        this.bin = _bin;
    }
    
    /****
     * Pattern Inconsistency Class
     ***/
    
    function PatternInconsistency(_inconsistentNode, _expectedNode) {
        this.inconsistentNode = _inconsistentNode;
        this.expectedNode = _expectedNode;
    }
    
    /****
     * Main Pattern Inconsistency Finder
     ***/
    
    var abstractJsNodeTypes = ["IDENTIFIER", "TYPE", "LITERAL"];
    
    //Don't use "-", as this character is already used for negative hash values
    //as well as hash collision disambiguation
    var HASH_DELIMITER = "x";
    
    function findAllPatternInconsistencies(jsHashBins, domHashBins, inconsistencyList, threshold) {
        var _js = null, _dom = null;
        if (jsHashBins !== null) 
            _js = findPatternInconsistencies(jsHashBins, inconsistencyList, threshold, "ast");
        if (domHashBins !== null) 
            _dom = findPatternInconsistencies(domHashBins, inconsistencyList, threshold, "dom");
        
        return {
            js: _js,
            dom: _dom
        };
    }
    
    function findPatternInconsistencies(hashBins, inconsistencyList, threshold, astOrDom) {
        var key, b;
        var binQueue = new utils.Queue();
        
        var newHashBins = {};
        for (key in hashBins) {
            //newHashBins[key] = hashBins[key];
            
            //Make sure the cloned version of the subtrees are used
            //This allows the concretization to be done multiple times if a node appears
            //in multiple subtree classes
            //var hashBinObj = {bin: hashBins[key]};
            //newHashBins[key] = JSON.parse(JSON.stringify(hashBinObj)).bin;
            
            newHashBins[key] = []
            for (var i = 0; i < hashBins[key].length; i++) {
                newHashBins[key].push(hashBins[key][i].copySubtree());
            }
        }
        
        //The nodes are concretized in depth-first pre-order
            
        for (key in newHashBins) {
            binQueue.enqueue(new QueueItem(key, newHashBins[key]));
        }
        newHashBins = {};

        while (binQueue.peek() != null) {
            var nextItem = binQueue.dequeue();
            var currentBin = nextItem.bin;
            var tempBins = {};
            var c = getNextNodeToConcretize(currentBin[0], astOrDom);

            if (c.idx == -1) {
                newHashBins[nextItem.key] = currentBin;
                continue;
            }

            for (var j = 0; j < currentBin.length; j++) {
                var subtree = currentBin[j];
                var n = getPreOrderNode(subtree, c.idx);
                n.concretize();
                subtree.currentNodeAnalyzed = n;
                var label = n.label;
                if (label == "hasOwnProperty") {
                    //Change label - otherwise, the hasOwnProperty function will be overriden!
                    label = "holocronJsTempHasOwnProperty";
                }
                if (tempBins.hasOwnProperty(label)) {
                    tempBins[label].push(subtree);
                }
                else {
                    tempBins[label] = [subtree];
                }
            }

            //Determine the dominant bin
            var dominantBinKey, max = 0, totalSubtrees = 0;
            for (b in tempBins) {
                var nextBin = tempBins[b];
                totalSubtrees += nextBin.length;
                if (nextBin.length > max) {
                    max = nextBin.length;
                    dominantBinKey = b;
                }
            }

            var expectedNode = tempBins[dominantBinKey][0].currentNodeAnalyzed;
            if ((max/totalSubtrees)*100 >= threshold) {
                for (b in tempBins) {
                    if (b != dominantBinKey) {
                        for (var j = 0; j < tempBins[b].length; j++) {
                            var subtree = tempBins[b][j];
                            var inconsistentNode = subtree.currentNodeAnalyzed;
                            if (inconsistentNode.appId == Constants.TARGET_APP_ID) {
                                var rule = new PatternInconsistency(inconsistentNode, expectedNode);
                                inconsistencyList.push(rule);
                            }
                        }
                    }
                }

                //Only include the dominant hash bin in the current bin
                binQueue.enqueue(new QueueItem(nextItem.key, tempBins[dominantBinKey]));
            }
            else {
                //Include everything
                var counter = 0;
                for (b in tempBins) {
                    binQueue.enqueue(new QueueItem(nextItem.key + HASH_DELIMITER + counter, tempBins[b]));
                    counter++;
                }
            }
        }
        
        //Merge surviving hash bins with the same hash value
        newHashBins = mergeSurvivingHashBins(newHashBins);
        
        return newHashBins;
    }
    
    function getNextNodeToConcretize(subtree, astOrDom, type) {
        var stack = new utils.Stack();
        stack.push(subtree.root);

        var comboArray = new subtreeFinder.IncrementableArray(subtree.root.childNodes, true);
        for (var i = 0; i < subtree.orderNum; i++) {
            comboArray.increment();
        }

        var order = 0;

        while (stack.peek() != null) {
            var nextNode = stack.pop();
            if (nextNode.shouldAbstractOut && (!type || fitsType(nextNode, type, astOrDom))) {
                //This is the next node to abstract out
                return {
                    idx: order,
                    node: nextNode
                };
            }
            else {
                //Add child nodes
                if (order == 0) {
                    //Go through combo array
                    //Pre-order traversal, so we add rightmost elements to the stack *first* (so that leftmost
                    //elements will be processed first in the stack)
                    for (var i = nextNode.childNodes.length-1; i >= 0; i--) {
                        if (comboArray.arr[i].currentValue == 0) continue;
                        stack.push(nextNode.childNodes[i]);
                    }
                }
                else {
                    for (var i = nextNode.childNodes.length-1; i >= 0; i--) {
                        stack.push(nextNode.childNodes[i]);
                    }
                }
            }
            order++;
        }

        return {
            idx: -1,
            node: null
        };
    }

    /**
     * Finds the pre-order node at a specified index
     * @param subtree The Subtree object
     * @param orderIndex The index to check (starting at 0)
     * @param notPreprocessed Indicates whether the preorderNodes array in the Subtree object have not been
     *                      filled yet
     */
    function getPreOrderNode(subtree, orderIndex, notPreprocessed) {
        if (!notPreprocessed) {
            //If the preorderNodes array is already filled, then we can just grab the value in the array
            return subtree.preorderNodes[orderIndex];
        }
        
        var stack = new utils.Stack();
        stack.push(subtree.root);

        var comboArray = new subtreeFinder.IncrementableArray(subtree.root.childNodes, true);
        for (var i = 0; i < subtree.orderNum; i++) {
            comboArray.increment();
        }

        var order = 0;

        while (stack.peek() != null) {
            var nextNode = stack.pop();
            if (order == orderIndex) {
                //This is the node we're looking for
                return nextNode;
            }
            else {
                //Add child nodes
                if (order == 0) {
                    //Go through combo array
                    //Pre-order traversal, so we add rightmost elements to the stack *first* (so that leftmost
                    //elements will be processed first in the stack)
                    for (var i = nextNode.childNodes.length-1; i >= 0; i--) {
                        if (comboArray.arr[i].currentValue == 0) continue;
                        stack.push(nextNode.childNodes[i]);
                    }
                }
                else {
                    for (var i = nextNode.childNodes.length-1; i >= 0; i--) {
                        stack.push(nextNode.childNodes[i]);
                    }
                }
            }
            order++;
        }

        return null;
    }

    function fitsType(node, type, astOrDom) {
        var isType = node.label == "StringLiteral" || node.label == "NumberLiteral" || 
            node.label == "BooleanLiteral" || node.label == "Literal";
        
        var isNumber = !isNaN(node.label);
        var isString = (node.label[0] == "\"" && node.label[node.label.length-1] == "\"") || 
            (node.label[0] == "'" && node.label[node.label.length-1] == "'");
        var isBoolean = (node.label == "false" || node.label == "true");
        var isNullOrUndefinedOrNaN = (node.label == "null" || node.label == "undefined" || 
                                      node.label == "NaN");
        var isLiteral = isNumber || isString || isBoolean || isNullOrUndefinedOrNaN;
            
        if (astOrDom == "ast") {
            if (type == "TYPE") {
                return isType;
            }
            else if (type == "LITERAL") {
                return isLiteral;
            }
            else if (type == "IDENTIFIER") {
                return !isType && !isNumber;
            }
            else {
                console.log("fitsType(): Invalid AST type");
                throw new Error();
            }
        }
        else if (astOrDom == "dom") {
            if (type == "TYPE") {
                return isType;
            }
            else if (type == "LITERAL") {
                return isLiteral;
            }
            else {
                console.log("fitsType(): Invalid DOM type");
                throw new Error();
            }
        }
        else {
            console.log("fitsType(): Invalid value for astOrDom");
            throw new Error();
        }
    }
    
    function mergeSurvivingHashBins(hashBins) {
        var newHashBins = {};
        for (var key in hashBins) {
            var originalKey = key;
            var notOriginalHashValue = key.indexOf(HASH_DELIMITER) >= 0;
            if (notOriginalHashValue) {
                originalKey = key.substring(0, key.indexOf(HASH_DELIMITER));
            }
            
            if (newHashBins.hasOwnProperty(originalKey)) {
                newHashBins[originalKey] = newHashBins[originalKey].concat(hashBins[key]);
            }
            else {
                newHashBins[originalKey] = hashBins[key];
            }
        }
        
        return newHashBins;
    }
    
    exports.findAllPatternInconsistencies = findAllPatternInconsistencies;
    exports.getPreOrderNode = getPreOrderNode;
});