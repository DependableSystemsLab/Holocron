/**
 * Finds all the subtrees of a tree. 
 * Each subtree is defined by (1) a reference to its root; (2) the number of traversals done from
 * the specified root to get the subtree; and (3) its hash value
 */
define(function (require, exports, module) {
    'use strict';
    
    var utils = require('lib/utils');
    var Constants = utils.Constants;
    //var Constants = require('lib/utils').Constants;
    
    //TODO: The tree structure input to this module is assumed to have the following children
    //  childNodes - the list of child nodes
    //  label - the node label
    //Make sure that numSubtrees is not defined yet, as well as subtreeListRange
    //You might want to make sure the line number is included as well
    
    /****
     * Subtree Class
     * Each subtree is defined by (1) a reference to its root; (2) the order number from
     * the specified root to get the subtree (see below); and (3) its hash value
     *
     * The order number is determined as follows:
     *      - Assume depth-first search
     *      - The possible combinations of children are labelled in binary (0's and 1's), where 0 means the
     *      child of the root node does not appear, and 1 means the child appears. For example, if there are
     *      three children, the combinations are labelled 000, 001, 010, 011, 100, 101, 110, 111. In this case,
     *      000 has the most precedence (i.e., ordered first), while 111 has least precedence (i.e., ordered
     *      last).
     *      - For each of the combinations of children, there are also combinations based on the number of
     *      subtrees rooted at the appearing children. For example, suppose the first child has 5 subtrees, the
     *      second child has 3 subtrees, and the third child has 2 subtrees. Further, let's say we're looking
     *      at the combination 011. In that case, there are 3x2 = 6 possible subtrees for this combination,
     *      namely (000), (001), (010), (011), (020), (021), where the numbers are counted from 0 (not from 1).
     *      Within these combinations, the one with the lowest corresponding decimal digit takes precedence.
     *      - After ordering the subtrees as outlined above, each subtree is given an order number, where the
     *      subtree with the highest precedence is given order #0, and the subtree with lowest precedence given
     *      order #N, where N is the number of subtrees. In the example above, the subtree with the lowest
     *      precedence is the (421) subtree that belongs to combination 111.
     ***/
    
    /**
     * Constructor for Subtree object
     * @param root Reference to the root of the subtree
     * @param orderNum The order number needed to acquire the subtree from the original tree,          *            *            starting from the root
     * @param hashValue The hash value of the subtree
     * @param preorderNodes An array of nodes, sorted in preorder. This will only be filled later
     */
    function Subtree(root, orderNum, hashValue) {
        this.root = root;
        this.orderNum = orderNum;
        this.hashValue = hashValue;
        this.preorderNodes = [];
    }
    
    Subtree.prototype.copySubtree = function() {
        //return new Subtree(this.root.copyFromRoot(), this.orderNum, this.hashValue);
        var newSubtree = new Subtree(this.root.copyFromRoot(), this.orderNum, this.hashValue);
        newSubtree.fillPreorderNodes();
        return newSubtree;
    };
    
    Subtree.prototype.fillPreorderNodes = function() {
        var stack = new utils.Stack();
        stack.push(this.root);

        var comboArray = new IncrementableArray(this.root.childNodes, true);
        for (var i = 0; i < this.orderNum; i++) {
            comboArray.increment();
        }

        var order = 0;

        while (stack.peek() != null) {
            var nextNode = stack.pop();
            this.preorderNodes.push(nextNode);
            
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
            order++;
        }
    };
    
    /****
     * Subtree List Class
     ***/
    
    /**
     * Constructor for SubtreeList object
     * @param mainTree The tree for which a subtree list needs to be made
     */
    function SubtreeList(mainTree) {
        this.subtreeList = [];
    }
    
    /**
     * Constructor for SubtreeList object
     * @param root Reference to the root of the subtree
     * @param orderNum The order number needed to acquire the subtree from the original tree,          *            *            starting from the root
     * @param hashValue The hash value of the subtree
     */
    SubtreeList.prototype.addSubtree = function(root, orderNum, hashValue) {
        var newSubtree = new Subtree(root, orderNum, hashValue);
        this.subtreeList.push(newSubtree);
        
        //No need to add to hash table if this is simply one node
        //TODO: May want to modify this in case order changes
        if (orderNum != 0) {
            addToHashTable(newSubtree, hashValue);
        }
    };
    
    /**
     * Determine the range of values that have root as their root node. This works because all subtrees rooted
     * at a particular node are positioned side by side in the subtree list
     * @param root The root
     */
    SubtreeList.prototype.getRange = function(root) {
        var min = -1, 
            max = -1;
        for (var i = 0; i < this.subtreeList.length; i++) {
            var nextSubtree = this.subtreeList[i];
            if (min == -1 && nextSubtree.root === root) {
                min = i;
            }
            else if (min >= 0 && nextSubtree.root !== root) {
                max = i-1;
                break;
            }
        }
        
        if (min >= 0 && max == -1) {
            max == this.subtreeList.length-1;
        }
        
        return {
            minimum: min,
            maximum: max
        };
    };
    
    /****
     * Incrementable Array Class
     * The array in this class is meant to imitate the combinations outlined above, and are incremented
     * based on the ordering
     ***/
    
    /**
     * Constructor for the IncrementableArray class
     * @param childrenList The list of children for which an incrementable array will be built
     * @param isCombo Are we making a combo array (i.e., comprising of 0's and 1's)?
     * @param comboArray The combo array (only used if isCombo is false), which must have the same number of
     *                      elements as childrenList. This is assumed to be an IncrementableArray as well
     */
    function IncrementableArray(childrenList, isCombo, comboArray) {
        this.arr = [];
        if (isCombo) {
            for (var i = 0; i < childrenList.length; i++) {
                this.arr.push({
                    currentValue: 0, 
                    maxValue: 1
                });
            }
        }
        else {
            //Loop invariant: comboArray should have the same number of elements as childrenList
            if (comboArray.arr.length != childrenList.length) {
                console.log("IncrementableArray: comboArray and childrenList do not have the same number of elements!");
                throw new Error();
            }
            for (var i = 0; i < comboArray.arr.length; i++) {
                if (comboArray.arr[i].currentValue == 1) {
                    this.arr.push({
                        currentValue: 0, 
                        maxValue: childrenList[i].numSubtrees-1,
                        root: childrenList[i]
                    });
                }
            }
        }
    }
    
    /**
     * Increment the array by one step
     */
    IncrementableArray.prototype.increment = function() {
        //Try incrementing, starting from the end
        for (var i = this.arr.length-1; i >= 0; i--) {
            var arrItem = this.arr[i];
            if (arrItem.currentValue < arrItem.maxValue) {
                arrItem.currentValue = arrItem.currentValue + 1;
                break;
            }
            else if (arrItem.currentValue == arrItem.maxValue) {
                arrItem.currentValue = 0;
            }
            else {
                console.log("IncrementableArray: currentValue exceeds maxValue!");
                throw new Error();
            }
        }
    };
    
    /**
     * Check if the array already reached the highest limit (i.e., last in the order)
     */
    IncrementableArray.prototype.isHighest = function() {
        var result = true;
        for (var i = 0; i < this.arr.length; i++) {
            var arrItem = this.arr[i];
            if (arrItem.currentValue < arrItem.maxValue) {
                result = false;
                break;
            }
            else if (arrItem.currentValue > arrItem.maxValue) {
                console.log("IncrementableArray: currentValue exceeds maxValue!");
                throw new Error();
            }
        }
        
        return result;
    };
    
    /**
     * Immediately set the array to its highest limit (i.e., last in order) without incrementing
     */
    IncrementableArray.prototype.setToHighest = function() {
        for (var i = 0; i < this.arr.length; i++) {
            var arrItem = this.arr[i];
            arrItem.currentValue = arrItem.maxValue;
        }
    };
    
    /****
     * Main Subtree Finder
     ***/
    
    var tree, //The main tree
        subtreeList, //The list of subtrees of "tree"
        hashTable;
    var ABSTRACT_LABEL_STRING = "holocronjsabstractlabel";
    
    /**
     * Find all subtrees in a tree, and assign hashes to them.
     * @param _tree The tree to parse
     * @param maxChildren If the number of children exceeds this, only the full subtree will be considered for
     *          that root
     * @param ht The current hash table (i.e., hash bins). This will be modified
     */
    function findAllSubtrees(_tree, maxChildren, ht) {
        tree = _tree;
        subtreeList = new SubtreeList(tree);
        hashTable = ht;
        
        findSubtreesRootedAt(tree, maxChildren);
        
        return hashTable;
    }
    
    /**
     * This is a recursive algorithm that uses depth-first search (DFS) to find all the subtrees rooted
     * at root. The children are assumed to be stored in a list called childNodes (Esprima's generated tree
     * may have to be modified to fit this)
     * @param root The root
     * @param maxChildren If the number of children exceeds this, only the full subtree will be considered
     *          for that root
     */
    function findSubtreesRootedAt(root, maxChildren) {
        var theChildren = root.childNodes;
        
        //Process the children first
        for (var i = 0; i < theChildren.length; i++) {
            findSubtreesRootedAt(theChildren[i], maxChildren);
        }
        
        //Now, process this node (make sure you stamp the node with the number of subtrees it has)
        if (theChildren.length == 0) {
            //Must be a leaf node
            root.numSubtrees = 1;
            
            var hashValue = findHashValue(root, null);
            subtreeList.addSubtree(root, 0, hashValue);
            
            root.subtreeListRange = {
                minimum: subtreeList.subtreeList.length - 1,
                maximum: subtreeList.subtreeList.length - 1
            };
        }
        else {
            //Go through all the combinations in the same order outlined above, and then find the hash value
            //for the corresponding subtree
            //TODO: We probably need to have a "HashTable" class that contains a list of subtrees for each hash
            //value
            
            //Keep track of the subtreeList range
            root.subtreeListRange = {
                minimum: -1,
                maximum: -1
            };
            var firstSubtreeAddedToList = false;
            
            //Create an array that stores 0's and 1's
            var comboArray = new IncrementableArray(theChildren, true, null);
            
            if (theChildren.length > maxChildren) {
                comboArray.setToHighest();
            }
            
            //Go through each combination
            var subtreeCount = 0;
            while (true) {
                var activatedChildrenArray = new IncrementableArray(theChildren, false, comboArray);
                
                //Go through each sub-combination
                while (true) {
                    //NOTE: We now only consider full subtrees, as well as full subtree combinations of the                         //child nodes, so we execute this only if activatedChildrenArray has reached its peak
                    /*
                    var hashValue = findHashValue(root, activatedChildrenArray);
                    subtreeList.addSubtree(root, subtreeCount, hashValue);
                    if (!firstSubtreeAddedToList) {
                        firstSubtreeAddedToList = true;
                        root.subtreeListRange.minimum = subtreeList.subtreeList.length - 1;
                    }
                    subtreeCount++;
                    */
                    
                    //Immediately set to highest (comment out if we want partial subtrees, which would take
                    //a really long time to execute...)
                    activatedChildrenArray.setToHighest();
                    if (!activatedChildrenArray.isHighest()) {
                        console.log("findSubtreesRootedAt(): activatedChildrenArray not set to highest!");
                        throw new Error();
                    }
                    
                    if (activatedChildrenArray.isHighest()) {
                        var hashValue = findHashValue(root, activatedChildrenArray);
                        subtreeList.addSubtree(root, subtreeCount, hashValue);
                        if (!firstSubtreeAddedToList) {
                            firstSubtreeAddedToList = true;
                            root.subtreeListRange.minimum = subtreeList.subtreeList.length - 1;
                        }
                        subtreeCount++;
                        break;
                    }
                    
                    activatedChildrenArray.increment();
                }
                
                //Check if we have 11..111, at which point, we break
                if (comboArray.isHighest()) {
                    break;
                }
                
                comboArray.increment();
            }
            
            root.subtreeListRange.maximum = subtreeList.subtreeList.length - 1;
            root.numSubtrees = subtreeCount;
        }
        
        //console.log(hashTable);
    }
    
    /**
     * Determine the hash value for the subtree, defined by the root's label, the number of children, and the 
     * children's hash values
     * @param root The root
     * @param activatedChildrenArray Incrementable array of activated children, from which we will get the
     *                                  hash values
     */
    function findHashValue(root, activatedChildrenArray) {
        //TODO: We should be able to compute the hash value from just the root and the hash values of the
        //children's subtrees. We will use SubtreeList.getRange to find the range in the array that stores 
        //the subtrees rooted at each child (as specified in activatedChildrenArray)
        
        var hash = 0;
        
        //First, get the hash value of the label
        //TODO: Make sure the trees (AST and DOM) are converted into a data structure with a label property
        //for each node
        if (!root.shouldAbstractOut) {
            hash = findStringHashValue(root.label);
        }
        else {
            hash = findStringHashValue(ABSTRACT_LABEL_STRING);
        }
        
        //Then, get the hash value of the number of children in the subtree, if any
        if (activatedChildrenArray && activatedChildrenArray.arr.length > 0) {
            //hash = hash + 13*activatedChildrenArray.arr.length;
            hash = hash * 29 + activatedChildrenArray.arr.length;
            hash |= 0;
        }
        
        //Finally, get the sum of the hash values of the children, if any
        if (activatedChildrenArray && activatedChildrenArray.arr.length > 0) {
            for (var i = 0; i < activatedChildrenArray.arr.length; i++) {
                var nextActivatedChildRecord = activatedChildrenArray.arr[i];
                //var range = subtreeList.getRange(nextActivatedChildRecord.root);
                var range = nextActivatedChildRecord.root.subtreeListRange;
                
                if (nextActivatedChildRecord.currentValue < 0) {
                    console.log("findHashValue(): activated child record's current value out of range!");
                    throw new Error();
                }
                
                if (nextActivatedChildRecord.currentValue > range.maximum - range.minimum) {
                    console.log("findHashValue(): activated child record's current value out of range!");
                    throw new Error();
                }
                
                var subtreeListIndex = range.minimum + nextActivatedChildRecord.currentValue;
                var subtreeListItem = subtreeList.subtreeList[subtreeListIndex];
                var subtreeHash = subtreeListItem.hashValue;
                //hash = hash + subtreeHash * 11; //TODO: Should we multiply by 11?
                
                //We multiply 17 with subtreeHash instead of hash because we don't care about the 
                //order of the children (isomorphic subtrees may have different orders, but are 
                //still considered subtree repeats in our case)
                hash = hash + subtreeHash * 17;
                hash |= 0;
            }
        }
        
        return hash;
    }
    
    /**
     * Determine the hash value for a string. This is based on Java's string hash function.
     * See http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
     * See https://en.wikipedia.org/wiki/Java_hashCode%28%29#The_java.lang.String_hash_function
     * @param theString The string to hash
     */
    function findStringHashValue(theString) {
        var hash = 0, i, chr, len;
        if (theString.length == 0) return hash;
        for (i = 0, len = theString.length; i < len; i++) {
            chr   = theString.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
    
    function addToHashTable(subtree, hashValue) {
        var key = hashValue + "";
        if (hashTable[key]) {
            hashTable[key].push(subtree);
        }
        else {
            hashTable[key] = [];
            hashTable[key].push(subtree);
        }
    }
    
    /**
     * Remove all the hash bins that are not arrays (these shouldn't even be hash bins to begin with)
     * as well as those that have fewer than 3 items. Also, remove those whose appId is not equal to the
     * corresponding appId for the target app. Finally, remove those where the trees are very small (e.g.,
     * size 3)
     * @param ht The hash table
     */
    function removeUninterestingHashBins(ht, alreadyRemovedCollisions) {
        for (var key in ht) {
            var nextBin = ht[key];
            if (!(nextBin instanceof Array))
                delete ht[key];
            else if (nextBin.length < 25) { //TODO: Modify depending on the framework (15 for Angular, 25 for Backbone)
                delete ht[key];
            }
            else if (!containsSubtreeFromTarget(nextBin)) {
                delete ht[key];
            }
            else if (alreadyRemovedCollisions && getTreeSize(nextBin[0].root) <= 6) {
                delete ht[key];
            }
        }
        
        //return ht;
    }
    
    /**
     * Determine if the given hash bin (i.e., subtree category) contains a subtree that comes from
     * the target app
     * @param hashBin The hash bin to check
     */
    function containsSubtreeFromTarget(hashBin) {
        for (var i = 0; i < hashBin.length; i++) {
            if (hashBin[0].root.appId == Constants.TARGET_APP_ID) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get the size of the tree in terms of the number of nodes
     * @param root The tree's root
     */
    function getTreeSize(root) {
        var size = 1;
        for (var i = 0; i < root.childNodes.length; i++) {
            size += getTreeSize(root.childNodes[i]);
        }
        return size;
    }
    
    /**
     * Find collisions in the hash table and split hash bins with collisions into multiple
     * hash bins. This will produce a new hash table with no collisions. Note that new hash bins
     * are labeled with their original hash value, but appended with "-<index>", where <index> starts at
     * 0.
     * @param ht The hash table
     */
    function removeCollisions(ht) {
        var newHashTable = {};
        for (var key in ht) {
            var nextBin = ht[key];
            var tempArray = [];
            if (nextBin instanceof Array) {
                for (var arrKey in nextBin) {
                    var nextSubtree = nextBin[arrKey];
                    
                    var comboArray = new IncrementableArray(nextSubtree.root.childNodes, true, null);
                    for (var i = 0; i < nextSubtree.orderNum; i++) {
                        comboArray.increment();
                    }
                    var serializedSubtree = serializeTree(nextSubtree.root, comboArray);
                    
                    //Have we seen this subtree before?
                    var seenBefore = false;
                    for (var i = 0; i < tempArray.length; i++) {
                        var nextRecord = tempArray[i];
                        if (nextRecord.serializedString == serializedSubtree) {
                            nextRecord.items.push(nextSubtree);
                            seenBefore = true;
                            break;
                        }
                    }
                    
                    if (!seenBefore) {
                        tempArray.push({
                            serializedString: serializedSubtree,
                            items: [nextSubtree]
                        });
                    }
                }
                
                //Transfer the tempArray items to the new hash table
                if (tempArray.length == 0) {
                    console.log("removeCollisions(): tempArray can't possibly be empty!");
                    throw new Error();
                }
                else if (tempArray.length == 1) {
                    newHashTable[key] = tempArray[0].items;
                }
                else {
                    for (var i = 0; i < tempArray.length; i++) {
                        newHashTable[key + "-" + i] = tempArray[i].items;
                    }
                }
            }
        }
        
        return newHashTable;
    }
    
    /**
     * Cap the number of "foreign" subtrees in each hash bin ht[i] by cap. A foreign subtree
     * pertains to a subtree in the sample app
     * @param ht The hash table
     * @param cap The cap
     */
    function capHashBins(ht, cap) {
        for (var key in ht) {
            var nextBin = ht[key];
            
            if (nextBin.length < cap) continue;
            
            var finalHashBin = [];
            var numForeignSubtrees = 0;
            for (var i = 0; i < nextBin.length; i++) {
                if (nextBin[i].root.appId == Constants.TARGET_APP_ID) {
                    finalHashBin.push(nextBin[i]);
                }
                else if (numForeignSubtrees < cap) {
                    finalHashBin.push(nextBin[i]);
                    numForeignSubtrees++;
                }
            }
            ht[key] = finalHashBin;
        }
    }
    
    /**
     * This function serializes a tree into a string. Any nodes that are marked as "shouldAbstractOut" will be
     * shown as blank. Labels are marked with "l", and child nodes are marked with "c".
     * @param root The root of the tree to serialize. This is a CodeTreeNode object
     * @param comboArray The IncrementableArray (in this case, a combo array) that describes what children
     *              are activated
     */
    function serializeTree(root, comboArray) {
        var serializedString = "{l:'";
        if (!root.shouldAbstractOut) {
            serializedString = serializedString + root.label;
        }
        serializedString = serializedString + "'";
        if (root.childNodes.length > 0) {
            serializedString = serializedString + ",c:[";
            var placedFirstItem = false;
            for (var i = 0; i < root.childNodes.length; i++) {
                if (comboArray.arr[i].currentValue == 0) continue;
                var nextChild = root.childNodes[i];
                if (placedFirstItem)
                    serializedString = serializedString + ",";
                var newComboArray = new IncrementableArray(nextChild.childNodes, true, null);
                newComboArray.setToHighest();
                serializedString = serializedString + serializeTree(nextChild, newComboArray);
                if (!placedFirstItem)
                    placedFirstItem = true;
            }
            serializedString = serializedString + "]";
        }
        serializedString = serializedString + "}";
        
        return serializedString;
    }
    
    exports.subtreeList = subtreeList;
    exports.findAllSubtrees = findAllSubtrees;
    exports.removeUninterestingHashBins = removeUninterestingHashBins;
    exports.removeCollisions = removeCollisions;
    exports.capHashBins = capHashBins;
    exports.IncrementableArray = IncrementableArray;
});
