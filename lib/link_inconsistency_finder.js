/**
 * Finds all unconditional and conditional link inconsistencies given a set of hash bins
 */
define(function (require, exports, module) {
    'use strict';
    
    var pattIncFinder = require('lib/pattern_inconsistency_finder');
    var Apriori = require('lib/apriori/apriori');
    var Constants = require('lib/utils').Constants;
    
    /****
     * Link Class
     * Each Link object is uniquely identified by the following parameters
     * - fromHashBin: The property value of the "from" hash bin (i.e., the key used to access the hash bin)
     * - toHashBin: The property value of the "to" hash bin (i.e., the key used to access the hash bin)
     * - fromNode: Order number of the node of interest in the "from" subtrees, given a pre-order traversal
     * - toNode: Order number of the node of interest in the "to" subtrees, given a pre-order traversal
     *
     * Note that fromNode and toNode start at 0
     ***/
    
    function Link(_fromHashBin, _toHashBin, _fromNode, _toNode, _id) {
        this.fromHashBin = _fromHashBin;
        this.toHashBin = _toHashBin;
        this.fromNode = _fromNode;
        this.toNode = _toNode;
        this.subtreePairs = [];
        this.id = _id; //Must be unique, and prefixed with "link"
    }
    
    Link.prototype.isEquals = function(other) {
        return (this.fromHashBin == other.fromHashBin) 
            && (this.toHashBin == other.toHashBin) 
            && (this.fromNode == other.fromNode) 
            && (this.toNode == other.toNode);
    };
    
    Link.prototype.addSubtreePair = function(subtreePair) {
        this.subtreePairs.push(subtreePair);
    };
    
    /****
     * Ancestor Attribute
     * Each AncestorAttribute object is uniquely identified by the CodeTreeNode
     ***/
    
    function AncestorAttribute(_node, _id) {
        this.node = _node;
        this.id = _id;
    }
    
    AncestorAttribute.prototype.isEquals = function(other) {
        return this.node === other.node;
    };
    
    /****
     * Subtree Pair Class
     * Important parameters are as follows
     * - fromHashBin: The property value of the "from" hash bin (i.e., the key used to access the hash bin)
     * - toHashBin: The property value of the "to" hash bin (i.e., the key used to access the hash bin)
     * - fromSubtree: Index number of the subtree of interest in fromHashBin
     * - toSubtree: Index number of the subtree of interest in toHashBin
     ***/
    
    function SubtreePair(_fromHashBin, _toHashBin, _fromSubtree, _toSubtree) {
        this.fromHashBin = _fromHashBin;
        this.toHashBin = _toHashBin;
        this.fromSubtree = _fromSubtree;
        this.toSubtree = _toSubtree;
        this.links = [];
        this.ancestorAttributesFrom = [];
        this.ancestorAttributesTo = [];
    }
    
    SubtreePair.prototype.addLink = function(newLink) {
        this.links.push(newLink);
    };
    
    SubtreePair.prototype.addAncestorAttribute = function(newAncestorAttribute, type) {
        if (type == "from") {
            this.ancestorAttributesFrom.push(newAncestorAttribute);
        }
        else { //type == "to"
            this.ancestorAttributesTo.push(newAncestorAttribute);
        }
    };
    
    /****
     * Unconditional Link Inconsistency Class
     * Important parameters are as follows
     * - inconsistentNode: Copy of the node that is inconsistent
     * - sampleFromNode: Sample node from a subtree in the "from" hash bin that follows the link rule
     * - sampleToNode: Sample node from a subtree in the "to" hash bin that follows the link rule and 
     *      corresponds with sampleFromNode
     ***/
    
    function UnconditionalLinkInconsistency(_inconsistentNode, _sampleFromNode, _sampleToNode) {
        this.inconsistentNode = _inconsistentNode;
        this.sampleFromNode = _sampleFromNode;
        this.sampleToNode = _sampleToNode;
    }
    
    UnconditionalLinkInconsistency.prototype.isEquals = function(other) {
        if (other instanceof UnconditionalLinkInconsistency) {
            return (this.inconsistentNode.originalNode === other.inconsistentNode.originalNode && 
                this.sampleFromNode.originalNode === other.sampleFromNode.originalNode && 
                    this.sampleToNode.originalNode === other.sampleToNode.originalNode);
        }
        else if (other instanceof ConditionalLinkInconsistency) {
            return (this.inconsistentNode.originalNode === other.inconsistentNode.originalNode && 
                this.sampleFromNode.originalNode === other.sampleFromNode.originalNode && 
                    this.sampleToNode.originalNode === other.sampleToNode.originalNode);
        }
        else {
            return false;
        }
    };
    
    UnconditionalLinkInconsistency.prototype.sameInconsistentNode = function(other) {
        if (other instanceof UnconditionalLinkInconsistency) {
            return (this.inconsistentNode.originalNode === other.inconsistentNode.originalNode);
        }
        else if (other instanceof ConditionalLinkInconsistency) {
            return (this.inconsistentNode.originalNode === other.inconsistentNode.originalNode);
        }
        else {
            return false;
        }
    };
    
    /****
     * Conditional Link Inconsistency Class
     * Important parameters are as follows
     * - inconsistentNode: Copy of the node that is inconsistent (only "from" node is needed since it's
     *          the one that has no corresponding "to" node.
     * - sampleFromNode: Sample node from a subtree in the "from" hash bin that follows the link rule
     * - sampleToNode: Sample node from a subtree in the "to" hash bin that follows the link rule and 
     *      corresponds with sampleFromNode
     ***/
    
    function ConditionalLinkInconsistency(_inconsistentNode, _sampleFromNode, _sampleToNode) {
        this.inconsistentNode = _inconsistentNode;
        this.sampleFromNode = _sampleFromNode;
        this.sampleToNode = _sampleToNode;
    }
    
    ConditionalLinkInconsistency.prototype.isEquals = function(other) {
        if (other instanceof ConditionalLinkInconsistency) {
            return (this.inconsistentNode.originalNode === other.inconsistentNode.originalNode && 
                this.sampleFromNode.originalNode === other.sampleFromNode.originalNode && 
                    this.sampleToNode.originalNode === other.sampleToNode.originalNode);
        }
        else if (other instanceof UnconditionalLinkInconsistency) {
            return (this.inconsistentNode.originalNode === other.inconsistentNode.originalNode && 
                this.sampleFromNode.originalNode === other.sampleFromNode.originalNode && 
                    this.sampleToNode.originalNode === other.sampleToNode.originalNode);
        }
        else {
            return false;
        }
    };
    
    ConditionalLinkInconsistency.prototype.sameInconsistentNode = function(other) {
        if (other instanceof ConditionalLinkInconsistency) {
            return (this.inconsistentNode.originalNode === other.inconsistentNode.originalNode);
        }
        else if (other instanceof UnconditionalLinkInconsistency) {
            return (this.inconsistentNode.originalNode === other.inconsistentNode.originalNode);
        }
        else {
            return false;
        }
    };
    
    /****
     * Main Link Inconsistency Finder
     ***/
    
    function findLinkInconsistencies(jsHashBins, domHashBins, inconsistencyList, threshold, startTime) {
        var key1, key2;
        var debugKey, numKeys = 0;

        //Handle single-language links for JS
        for (debugKey in jsHashBins) numKeys++;
        console.log("Number of Keys in jsHashBins: " + numKeys);
        numKeys = 0;
        for (key1 in jsHashBins) {
            console.log("JS to JS: " + (++numKeys));
            for (key2 in jsHashBins) {
                if (key1 != key2) {
                    //Note that order matters (i.e., from vs to)
                    handleHashBinPair(jsHashBins[key1], jsHashBins[key2], 
                                      key1, key2, inconsistencyList, threshold, false);
                }
            }
        }

        //Handle single-language links for DOM
        numKeys = 0;
        for (debugKey in domHashBins) numKeys++;
        console.log("Number of Keys in domHashBins: " + numKeys);
        numKeys = 0;
        for (key1 in domHashBins) {
            console.log("DOM to DOM: " + (++numKeys));
            for (key2 in domHashBins) {
                if (key1 != key2) {
                    //Note that order matters (i.e., from vs to)
                    handleHashBinPair(domHashBins[key1], domHashBins[key2], 
                                      key1, key2, inconsistencyList, threshold, false);
                }
            }
        }

        //Handle cross-language (JS to DOM)
        numKeys = 0;
        for (debugKey in jsHashBins) numKeys++;
        console.log("Number of Keys in jsHashBins: " + numKeys);
        numKeys = 0;
        for (key1 in jsHashBins) {
            console.log("JS to DOM: " + (++numKeys));
            for (key2 in domHashBins) {
                //Note that order matters (i.e., from vs to)
                handleHashBinPair(jsHashBins[key1], domHashBins[key2], 
                                  key1, key2, inconsistencyList, threshold, true);
            }
        }
        
        console.log("Finding Unconditional Link Violations: " + (new Date().getTime() - startTime) + " ms");

        //Handle cross-language (DOM to JS)
        numKeys = 0;
        for (debugKey in domHashBins) numKeys++;
        console.log("Number of Keys in domHashBins: " + numKeys);
        numKeys = 0;
        for (key1 in domHashBins) {
            console.log("DOM to JS: " + (++numKeys));
            for (key2 in jsHashBins) {
                //Note that order matters (i.e., from vs to)
                handleHashBinPair(domHashBins[key1], jsHashBins[key2], 
                                  key1, key2, inconsistencyList, threshold, false);
            }
        }
    }

    function handleHashBinPair(fromHashBin, toHashBin, fromKey, toKey, inconsistencyList, threshold, 
                                findConditionalLinkRules) {
        var linkRules = []; //To be iterated for finding unconditional link inconsistencies
        var ancestorAttributes = [];
        var subtreePairs = []; //To be iterated for finding conditional link inconsistencies
        
        var linkId = 0;
        var ancestorId = 0;
        
        for (var i = 0; i < fromHashBin.length; i++) {
            for (var j = 0; j < toHashBin.length; j++) {
                var fromSubtreeObj = fromHashBin[i];
                var toSubtreeObj = toHashBin[j];
                
                //This is our way of keeping track which links each *node* has
                //We will use this later for association rule mining
                fromSubtreeObj.linksAsFrom = [];
                toSubtreeObj.linksAsTo = [];
            }
        }

        for (var i = 0; i < fromHashBin.length; i++) {
            for (var j = 0; j < toHashBin.length; j++) {
                var fromSubtreeObj = fromHashBin[i];
                var toSubtreeObj = toHashBin[j];

                var subtreePair = new SubtreePair(fromKey, toKey, i, j);
                subtreePairs.push(subtreePair);
                
                var alreadyAddedToAncestors = false;

                var fromNodeCounter = 0;
                var nextFromNode = pattIncFinder.getPreOrderNode(fromSubtreeObj, fromNodeCounter);
                
                //Add ancestor info for the root of the from subtree (which should be the first nextFromNode)
                var parent = nextFromNode.parent;
                while (parent != null) {
                    addAncestorInfo("from", parent, ancestorAttributes, subtreePair);
                    parent = parent.parent;
                }

                while (nextFromNode != null) {
                    //Pair nextFromNode with the other nodes in the "to" subtree
                    var toNodeCounter = 0;
                    var nextToNode = pattIncFinder.getPreOrderNode(toSubtreeObj, toNodeCounter);

                    //Add ancestor info for the root of the to subtree (which should be the first 
                    //nextToNode)
                    if (!alreadyAddedToAncestors) {
                        var parent = nextToNode.parent;
                        while (parent != null) {
                            addAncestorInfo("to", parent, ancestorAttributes, subtreePair);
                            parent = parent.parent;
                        }
                        alreadyAddedToAncestors = true;
                    }

                    while (nextToNode != null) {
                        var toNodeLabel1 = nextToNode.label;
                        var toNodeLabel2 = nextToNode.label;
                        
                        //If this is a DOM node, we should check if the label is a string literal, in which
                        //case we need to add quotation marks around the label (assuming the "from" node we're
                        //comparing with is also a string literal)
                        if (nextToNode.type == "dom" && nextToNode.parent != null && 
                                nextToNode.parent.label == "StringLiteral" && nextFromNode.parent != null
                                && nextFromNode.parent.label == "StringLiteral") {
                            toNodeLabel1 = "\"" + nextToNode.label + "\"";
                            toNodeLabel2 = "'" + nextToNode.label + "'";
                        }
                        if ((!(nextFromNode === nextToNode)) && 
                            (nextFromNode.label == toNodeLabel1 || nextFromNode.label == toNodeLabel2)
                           && (nextFromNode.appId == nextToNode.appId)) {
                            var newLink = new Link(fromKey, toKey, fromNodeCounter, toNodeCounter, "link" + linkId);
                            newLink.addSubtreePair(subtreePair);
                            var linkIdStr = addLinkToArray(newLink, linkRules, subtreePair);
                            if (JSON.stringify(fromSubtreeObj.linksAsFrom).indexOf("\"al" + linkIdStr + "\"") < 0) {
                                fromSubtreeObj.linksAsFrom.push("al" + linkIdStr);
                            }
                            if (JSON.stringify(toSubtreeObj.linksAsTo).indexOf("\"al" + linkIdStr + "\"") < 0) {
                                toSubtreeObj.linksAsTo.push("al" + linkIdStr);
                            }
                            //subtreePair.addLink(newLink);
                            linkId++;
                        }

                        toNodeCounter++;
                        nextToNode = pattIncFinder.getPreOrderNode(toSubtreeObj, toNodeCounter);
                    }

                    fromNodeCounter++;
                    nextFromNode = pattIncFinder.getPreOrderNode(fromSubtreeObj, fromNodeCounter);
                }
            }
        }

        //Go through link rules. This will help us find the unconditional link rules
        var maxLinks = fromHashBin.length*toHashBin.length;
        for (var i = 0; i < linkRules.length; i++) {
            //We don't need to go through this link rule if we know that every from Node is connected
            //to every to Node. We won't find any inconsistencies there
            if (linkRules[i].subtreePairs.length == maxLinks) {
                continue;
            }
            
            //No match for from node
            var subtreeCounter = [];
            for (var j = 0; j < fromHashBin.length; j++) {
                subtreeCounter[j] = 0;
            }
            for (var j = 0; j < linkRules[i].subtreePairs.length; j++) {
                var nextSubtreePair = linkRules[i].subtreePairs[j];
                subtreeCounter[nextSubtreePair.fromSubtree] = subtreeCounter[nextSubtreePair.fromSubtree] + 1;
            }

            var numUnrepresented = 0;
            for (var j = 0; j < subtreeCounter.length; j++) {
                if (subtreeCounter[j] == 0) {
                    numUnrepresented++;
                    //fromHashBin[j];
                }
            }

            var percentUnrepresented = (numUnrepresented/subtreeCounter.length)*100;
            if (percentUnrepresented <= (100-threshold)) {
                var sampleFromNode, sampleToNode;
                var nextSubtreePair = linkRules[i].subtreePairs[0];
                sampleFromNode = pattIncFinder.getPreOrderNode(fromHashBin[nextSubtreePair.fromSubtree], 
                                                               linkRules[i].fromNode);
                sampleToNode = pattIncFinder.getPreOrderNode(toHashBin[nextSubtreePair.toSubtree], 
                                                             linkRules[i].toNode);

                for (var j = 0; j < subtreeCounter.length; j++) {
                    if (subtreeCounter[j] == 0) {
                        var inconsistentNode = pattIncFinder.getPreOrderNode(fromHashBin[j], 
                                                                             linkRules[i].fromNode);
                        
                        if (inconsistentNode.appId == Constants.TARGET_APP_ID) {
                            //Check first if the inconsistent node is the same node as any of the to nodes
                            //in the current link rule
                            var sameNode = false;
                            for (var k = 0; k < linkRules[i].subtreePairs.length; k++) {
                                var toNodeToCompare = pattIncFinder.getPreOrderNode( 
                                            toHashBin[linkRules[i].subtreePairs[k].toSubtree], 
                                            linkRules[i].toNode );
                                if (toNodeToCompare === inconsistentNode) {
                                    sameNode = true;
                                    break;
                                }
                            }
                            if (sameNode) continue;

                            var newLinkInconsistency = new UnconditionalLinkInconsistency(inconsistentNode, 
                                                                                          sampleFromNode, 
                                                                                          sampleToNode);

                            if (!ruleIsInList(newLinkInconsistency, inconsistencyList)) {
                                inconsistencyList.push(newLinkInconsistency);
                            }
                        }
                    }
                }
            }

            //Wrong match for from node
            subtreeCounter = [];
            for (var j = 0; j < toHashBin.length; j++) {
                subtreeCounter[j] = 0;
            }
            for (var j = 0; j < linkRules[i].subtreePairs.length; j++) {
                var nextSubtreePair = linkRules[i].subtreePairs[j];
                subtreeCounter[nextSubtreePair.toSubtree] = subtreeCounter[nextSubtreePair.toSubtree] + 1;
            }
            
            var maxToNodeIndex = 0;
            var maxLinks = 0;
            for (var j = 0; j < subtreeCounter.length; j++) {
                if (subtreeCounter[j] > maxLinks) {
                    maxToNodeIndex = j;
                    maxLinks = subtreeCounter[j];
                }
            }
            
            var percentOfMax = (maxLinks/linkRules[i].subtreePairs.length)*100;
            if (percentOfMax >= threshold) {
                var sampleFromNode, sampleToNode;
                var nextSubtreePair;
                for (var j = 0; j < linkRules[i].subtreePairs.length; j++) {
                    var next = linkRules[i].subtreePairs[j];
                    if (next.toSubtree == maxToNodeIndex) {
                        nextSubtreePair = next;
                        break;
                    }
                }
                sampleFromNode = pattIncFinder.getPreOrderNode(fromHashBin[nextSubtreePair.fromSubtree], 
                                                               linkRules[i].fromNode);
                sampleToNode = pattIncFinder.getPreOrderNode(toHashBin[nextSubtreePair.toSubtree], 
                                                             linkRules[i].toNode);
                
                //Will be used as a sparse array to determine which from subtrees we've already labelled as an
                //inconsistency
                var fromSubtreesReported = [];
                for (var j = 0; j < linkRules[i].subtreePairs.length; j++) {
                    var nextPair = linkRules[i].subtreePairs[j];
                    
                    if (fromSubtreesReported[nextPair.fromSubtree + ""] !== undefined) continue;
                    
                    //If the to node is not the same as the maxToNodeIndex, then we have an inconsistency
                    if (nextPair.toSubtree != maxToNodeIndex) {
                        var inconsistentNode = pattIncFinder.getPreOrderNode(fromHashBin[nextPair.fromSubtree], 
                                                                             linkRules[i].fromNode);
                        
                        if (inconsistentNode.appId == Constants.TARGET_APP_ID) {
                            //Check first if the inconsistent node is the same node as any of the to nodes
                            //in the current link rule
                            var sameNode = false;
                            for (var k = 0; k < linkRules[i].subtreePairs.length; k++) {
                                var toNodeToCompare = pattIncFinder.getPreOrderNode( 
                                            toHashBin[linkRules[i].subtreePairs[k].toSubtree], 
                                            linkRules[i].toNode );
                                if (toNodeToCompare === inconsistentNode) {
                                    sameNode = true;
                                    break;
                                }
                            }
                            if (sameNode) continue;

                            var newLinkInconsistency = new UnconditionalLinkInconsistency(inconsistentNode, 
                                                                                          sampleFromNode, 
                                                                                          sampleToNode);
                            if (!ruleIsInList(newLinkInconsistency, inconsistencyList)) {
                                inconsistencyList.push(newLinkInconsistency);
                            }
                        }
                        
                        fromSubtreesReported[nextPair.fromSubtree + ""] = true;
                    }
                }
            }
        }

        //Find the conditional link rules if applicable
        if (findConditionalLinkRules) {
            //Go through subtree pairs. This will help us find the conditional link rules

            //We treat each subtree pair as a transaction, fed into the association rule miner
            //For each subtree pair, we treat each link rule and each ancestor info as data
            //We will create a comma-delimited version of each transaction (where each transaction is placed in 
            //one line in a string, and each row is ended by a comma)
            var transactionText = "";
            for (var i = 0; i < subtreePairs.length; i++) {
                var nextPair = subtreePairs[i];
                var nextPairFromNode = fromHashBin[nextPair.fromSubtree];
                
                if (nextPairFromNode.root.appId != Constants.TARGET_APP_ID) continue;
                
                var localTransaction = "";
                
                for (var j = 0; j < nextPair.links.length; j++) {
                    transactionText += nextPair.links[j].id + ",";
                    localTransaction += nextPair.links[j].id + ",";
                }
                
                for (var j = 0; j < nextPairFromNode.linksAsFrom.length; j++) {
                    transactionText += nextPairFromNode.linksAsFrom[j] + ",";
                    localTransaction += nextPairFromNode.linksAsFrom[j] + ",";
                }

                for (var j = 0; j < nextPair.ancestorAttributesFrom.length; j++) {
                    transactionText += "af" + nextPair.ancestorAttributesFrom[j].id + ",";
                    localTransaction += "af" + nextPair.ancestorAttributesFrom[j].id + ",";
                }

                for (var j = 0; j < nextPair.ancestorAttributesTo.length; j++) {
                    transactionText += "at" + nextPair.ancestorAttributesTo[j].id + ",";
                    localTransaction += "at" + nextPair.ancestorAttributesTo[j].id + ",";
                }
                
                if (localTransaction == "") continue;

                nextPair.transactions = localTransaction;
                transactionText += "\n";
            }
            
            if (transactionText.trim() == "") return; //TODO: Check if this is correct

            //Now, we feed the transaction text into the apriori algorithm, which does association rule mining
            //Note that in the Apriori.Algorithm method, the first parameter is the support threshold, and the
            //second parameter is the confidence threshold.
            var transactions = Apriori.ArrayUtils.readCSVToArray(transactionText, ",");
            var apriori = new Apriori.Algorithm(0.25, 0.8, false); //Original params: 0.25, 0.8, false
            var result = apriori.modAnalyze(transactions);
            //if (result.associationRules.length > 0)
            //    console.log(JSON.stringify(result.associationRules, null, '  '));
            
            //var conditionalRulesFound = [];

            //Compare association rules with each subtree pair, and create conditional link rule objects
            for (var i = 0; i < result.associationRules.length; i++) {
                var nextRule = result.associationRules[i];
                
                //No need to check if confidence is 1, since there will definitely be no violations
                if (nextRule.confidence == 1) continue;
                
                //Go through each subtree pair, and determine which subtree pairs
                //violate the conditional link rule
                var satisfyingSubtree = null;
                for (var j = 0; j < subtreePairs.length; j++) {
                    var nextPair = subtreePairs[j];
                    
                    if (fromHashBin[nextPair.fromSubtree].root.appId != Constants.TARGET_APP_ID) continue;
                    
                    if (nextPair.transactions === undefined) continue;
                    
                    var conditionSatisfied = true;
                    for (var k = 0; k < nextRule.lhs.length; k++) {
                        var nextLhs = nextRule.lhs[k];
                        if (!(nextPair.transactions.indexOf(nextLhs + ",") >= 0)) {
                            conditionSatisfied = false;
                            break;
                        }
                    }
                    if (!conditionSatisfied) continue;
                    
                    //Check if the implication is satisfied. If not, then it's a violation
                    var implicationSatisfied = true;
                    var unsatisfiedImplication = null;
                    for (var k = 0; k < nextRule.rhs.length; k++) {
                        var nextRhs = nextRule.rhs[k];
                        if (!(nextPair.transactions.indexOf(nextRhs + ",") >= 0)) {
                            implicationSatisfied = false;
                            unsatisfiedImplication = nextRhs;
                            break;
                        }
                    }
                    
                    if (implicationSatisfied && satisfyingSubtree == null) {
                        satisfyingSubtree = findSatisfyingSubtree(subtreePairs, nextRule);
                        continue;
                    }
                    else if (implicationSatisfied) {
                        continue;
                    }
                    else {
                        //There must be a violation, so report
                        if (satisfyingSubtree == null) {
                            //Find some satisfying subtree
                            satisfyingSubtree = findSatisfyingSubtree(subtreePairs, nextRule);
                        }
                        
                        if (satisfyingSubtree == null) {
                            //If it's still null, then we skip
                            break;
                        }
                        
                        var badLink = findBadLink(satisfyingSubtree, unsatisfiedImplication);
                        var inconsistentNode = pattIncFinder.getPreOrderNode(fromHashBin[nextPair.fromSubtree], 
                                                                             badLink.fromNode);
                        
                        if (inconsistentNode.appId == Constants.TARGET_APP_ID) {
                            var sampleFromNode = 
                                pattIncFinder.getPreOrderNode(fromHashBin[satisfyingSubtree.fromSubtree], 
                                                              badLink.fromNode);
                            var sampleToNode = 
                                pattIncFinder.getPreOrderNode(toHashBin[satisfyingSubtree.toSubtree], 
                                                              badLink.toNode);
                            var newLinkInconsistency = new ConditionalLinkInconsistency(inconsistentNode,
                                                                                        sampleFromNode,
                                                                                        sampleToNode);
                            if (!ruleIsInList(newLinkInconsistency, inconsistencyList)) {
                                inconsistencyList.push(newLinkInconsistency);
                                //conditionalRulesFound.push(newLinkInconsistency);
                            }
                        }
                        
                        //break; //TODO: Should this be continue instead?
                        continue;
                        
                        //TODO: We need to find some way to determine duplicates
                    }
                }
            }
        }
    }

    function addLinkToArray(link, linkRules, subtreePair) {
        for (var i = 0; i < linkRules.length; i++) {
            if (linkRules[i].isEquals(link)) {
                linkRules[i].addSubtreePair(subtreePair);
                subtreePair.addLink(linkRules[i]);
                return linkRules[i].id;
            }
        }

        linkRules.push(link);
        subtreePair.addLink(link);
        return link.id;
    }
    
    function addAncestorInfo(type, node, ancestorAttributes, subtreePair) {
        //First, check if there is already an ancestor attribute associated with this node
        for (var i = 0; i < ancestorAttributes.length; i++) {
            if (ancestorAttributes[i].isEquals(new AncestorAttribute(node, 0))) {
                subtreePair.addAncestorAttribute(ancestorAttributes[i], type);
                return;
            }
        }
        
        var id = ancestorAttributes.length;
        var newAttr = new AncestorAttribute(node, id);
        subtreePair.addAncestorAttribute(newAttr, type);
        ancestorAttributes.push(newAttr);
    }
    
    /**
     * Find a subtree pair that satisfies the association rule
     * @param subtreePairs The array of subtree pairs
     * @param nextRule The association rule to check
     */
    function findSatisfyingSubtree(subtreePairs, nextRule) {
        if (subtreePairs.length < 1) return null;
        
        for (var j = 0; j < subtreePairs.length; j++) {
            var nextPair = subtreePairs[j];
            
            if (nextPair.transactions === undefined) continue;
            
            var conditionSatisfied = true;
            for (var k = 0; k < nextRule.lhs.length; k++) {
                var nextLhs = nextRule.lhs[k];
                if (!(nextPair.transactions.indexOf(nextLhs + ",") >= 0)) {
                    conditionSatisfied = false;
                    break;
                }
            }
            if (!conditionSatisfied) continue;
            
            var implicationSatisfied = true;
            for (var k = 0; k < nextRule.rhs.length; k++) {
                var nextRhs = nextRule.rhs[k];
                if (nextRhs.indexOf("allink") == 0) {
                    nextRhs = nextRhs.substring(2);
                }
                if (!((nextPair.transactions.indexOf(nextRhs + ",") == 0) 
                      || (nextPair.transactions.indexOf("," + nextRhs + ",") >= 0))) {
                    implicationSatisfied = false;
                    break;
                }
            }
            
            if (implicationSatisfied) return nextPair;
        }
        
        return null;
    }
    
    /**
     * Find the link rule in the given subtree pair that is unsatisfied
     * @param subtreePair The subtree pair to analyze
     * @param unsatisfiedImplication String ID of the unsatisfied link rule
     */
    function findBadLink(subtreePair, unsatisfiedImplication) {
        if (unsatisfiedImplication.indexOf("allink") == 0) {
            unsatisfiedImplication = unsatisfiedImplication.substring(2);
        }
        for (var i = 0; i < subtreePair.links.length; i++) {
            if (subtreePair.links[i].id == unsatisfiedImplication) {
                return subtreePair.links[i];
            }
        }
        
        return null;
    }
    
    /**
     * Determine if a link rule is in the given list. Here, we discard all subsequent inconsistencies
     * found that have the same inconsistent node
     * @param rule The conditional or unconditional link rule
     * @param list The list to check
     */
    function ruleIsInList(rule, list) {
        for (var i = 0; i < list.length; i++) {
            if (list[i] instanceof UnconditionalLinkInconsistency 
                    || list[i] instanceof ConditionalLinkInconsistency) {
                if (list[i].sameInconsistentNode(rule)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    exports.findLinkInconsistencies = findLinkInconsistencies;
});