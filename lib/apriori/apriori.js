/*
(function(root, factory) {
    if(typeof exports === 'object') {
        module.exports = factory();
    }
    else if(typeof define === 'function' && define.amd) {
        define('apriori', [], factory);
    }
    else {
        root['Apriori'] = factory();
    }
}
*/ 
(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.

    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.Apriori = {}));
    }
}(this, function(exports) {

    'use strict';

    //var Apriori;
    //(function (Apriori) {
        var AnalysisResult = (function () {
            function AnalysisResult(frequentItemSets, associationRules) {
                this.frequentItemSets = frequentItemSets;
                this.associationRules = associationRules;
            }
            return AnalysisResult;
        })();
        exports.AnalysisResult = AnalysisResult;

        var FrequentItemSet = (function () {
            function FrequentItemSet(itemSet, support) {
                this.itemSet = itemSet;
                this.support = support;
            }
            return FrequentItemSet;
        })();
        exports.FrequentItemSet = FrequentItemSet;

        var AssociationRule = (function () {
            function AssociationRule(lhs, rhs, confidence) {
                this.lhs = lhs;
                this.rhs = rhs;
                this.confidence = confidence;
            }
            return AssociationRule;
        })();
        exports.AssociationRule = AssociationRule;

        var Algorithm = (function () {
            function Algorithm(minSupport, minConfidence, debugMode) {
                this.minSupport = minSupport ? minSupport === 0 ? 0 : minSupport : 0.15;
                this.minConfidence = minConfidence ? minConfidence === 0 ? 0 : minConfidence : 0.6;
                this.debugMode = debugMode || false;
            }
            Algorithm.prototype.analyze = function (transactions) {
                var self = this;
                var beforeMillis = new Date().getTime();

                var frequencies = {};
                var frequentItemSets = {};

                var oneElementItemSets = self.toOneElementItemSets(transactions);
                var oneCItemSets = self.findItemSetsMinSupportSatisfied(oneElementItemSets, transactions, self.minSupport, frequencies);
                var currentLItemSets = oneCItemSets;
                var itemSetSize = 1;

                if (self.debugMode) {
                    console.log('Before finding item sets: ' + self.getTime(beforeMillis) + ' ms');
                }
                var extractItemSet = function (f) {
                    return f.itemSet;
                };
                while (currentLItemSets.length !== 0) {
                    frequentItemSets[itemSetSize] = currentLItemSets;
                    var joinedSets = ArrayUtils.toFixedSizeJoinedSets(currentLItemSets.map(extractItemSet), itemSetSize + 1);
                    currentLItemSets = self.findItemSetsMinSupportSatisfied(joinedSets, transactions, self.minSupport, frequencies);
                    itemSetSize += 1;
                }
                if (self.debugMode) {
                    console.log('After finding item sets: ' + self.getTime(beforeMillis) + ' ms');
                }

                var calculateSupport = function (itemSet, frequencies, transactions) {
                    var frequency = frequencies[itemSet.toString()];
                    return frequency ? frequency / transactions.length : 0;
                };
                var foundSubSets = [];
                var isTheRuleAlreadyFound = function (itemSet) {
                    var found = false;
                    foundSubSets.forEach(function (subset) {
                        if (!found)
                            found = subset.toString() === itemSet.toString();
                    });
                    return found;
                };

                if (self.debugMode) {
                    console.log('Before calculating association rules: ' + self.getTime(beforeMillis) + ' ms');
                }
                var associationRules = [];
                var currentItemSet;
                var saveAssociationRuleIfFound = function (subsetItemSet) {
                    var diffItemSet = ArrayUtils.getDiffArray(currentItemSet, subsetItemSet);
                    if (diffItemSet.length > 0) {
                        var itemSupport = calculateSupport(currentItemSet, frequencies, transactions), subsetSupport = calculateSupport(subsetItemSet, frequencies, transactions), confidence = itemSupport / subsetSupport;

                        if (!isNaN(confidence) && !isTheRuleAlreadyFound(subsetItemSet) && confidence >= self.minConfidence) {
                            foundSubSets.push(subsetItemSet);
                            associationRules.push(new exports.AssociationRule(subsetItemSet, diffItemSet, confidence));
                        }
                    }
                };
                var saveAllAssociationRulesIfFound = function (itemSet) {
                    currentItemSet = itemSet;
                    ArrayUtils.toAllSubSets(currentItemSet).forEach(saveAssociationRuleIfFound);
                };
                for (var k in frequentItemSets) {
                    var itemSets = frequentItemSets[k].map(extractItemSet);
                    if (itemSets.length === 0 || itemSets[0].length <= 1) {
                        continue;
                    }
                    itemSets.forEach(saveAllAssociationRulesIfFound);
                }
                if (self.debugMode) {
                    console.log('After calculating association rules: ' + self.getTime(beforeMillis) + ' ms');
                }

                var analysisResult = new AnalysisResult(frequentItemSets, associationRules);
                if (self.debugMode) {
                    console.log('AnalysisResult: ' + JSON.stringify(analysisResult));
                    console.log('Apriori.Algorithm\'s total spent time: ' + self.getTime(beforeMillis) + ' ms');
                }
                return analysisResult;
            };
            
            /*Same as analyze, but with a few custom tweaks*/
            Algorithm.prototype.modAnalyze = function (transactions) {
                var self = this;
                var beforeMillis = new Date().getTime();

                var frequencies = {};
                var frequentItemSets = {};

                var oneElementItemSets = self.toOneElementItemSets(transactions);
                var oneCItemSets = self.findItemSetsMinSupportSatisfied(oneElementItemSets, transactions, self.minSupport, frequencies);
                var currentLItemSets = oneCItemSets;
                var itemSetSize = 1;

                if (self.debugMode) {
                    console.log('Before finding item sets: ' + self.getTime(beforeMillis) + ' ms');
                }
                var extractItemSet = function (f) {
                    return f.itemSet;
                };
                while (currentLItemSets.length !== 0 && itemSetSize <= 3) { //FROLIN: Added second clause
                    frequentItemSets[itemSetSize] = currentLItemSets;
                    if (itemSetSize == 3) break;
                    var joinedSets = ArrayUtils.modToFixedSizeJoinedSets(currentLItemSets.map(extractItemSet), itemSetSize + 1);
                    currentLItemSets = self.findItemSetsMinSupportSatisfied(joinedSets, transactions, self.minSupport, frequencies);
                    itemSetSize += 1;
                }
                if (self.debugMode) {
                    console.log('After finding item sets: ' + self.getTime(beforeMillis) + ' ms');
                }

                var calculateSupport = function (itemSet, frequencies, transactions) {
                    var frequency = frequencies[itemSet.toString()];
                    return frequency ? frequency / transactions.length : 0;
                };
                var foundSubSets = [];
                var isTheRuleAlreadyFound = function (itemSet) {
                    var found = false;
                    foundSubSets.forEach(function (subset) {
                        if (!found)
                            found = subset.toString() === itemSet.toString();
                    });
                    return found;
                };

                if (self.debugMode) {
                    console.log('Before calculating association rules: ' + self.getTime(beforeMillis) + ' ms');
                }
                var associationRules = [];
                var currentItemSet;
                var saveAssociationRuleIfFound = function (subsetItemSet) {
                    var subsetItemSetStr = JSON.stringify(subsetItemSet);
                    if (subsetItemSetStr.indexOf('"link') >= 0 || subsetItemSetStr.indexOf('"allink') >= 0) 
                        return;
                    var diffItemSet = ArrayUtils.getDiffArray(currentItemSet, subsetItemSet);
                    if (diffItemSet.length > 0) {
                        var diffItemSetStr = JSON.stringify(diffItemSet);
                        if (diffItemSetStr.indexOf('"af') >= 0 || diffItemSetStr.indexOf('"at') >= 0) return;
                        var itemSupport = calculateSupport(currentItemSet, frequencies, transactions), subsetSupport = calculateSupport(subsetItemSet, frequencies, transactions), confidence = itemSupport / subsetSupport;

                        if (!isNaN(confidence) && confidence >= self.minConfidence) {
                            if (!isTheRuleAlreadyFound(subsetItemSet)) {
                                foundSubSets.push(subsetItemSet);
                            }
                            associationRules.push(new exports.AssociationRule(subsetItemSet, diffItemSet, confidence));
                        }
                    }
                };
                var saveAllAssociationRulesIfFound = function (itemSet) {
                    currentItemSet = itemSet;
                    ArrayUtils.toAllSubSets(currentItemSet).forEach(saveAssociationRuleIfFound);
                };
                for (var k in frequentItemSets) {
                    var itemSets = frequentItemSets[k].map(extractItemSet);
                    if (itemSets.length === 0 || itemSets[0].length <= 1) {
                        continue;
                    }
                    itemSets.forEach(saveAllAssociationRulesIfFound);
                }
                if (self.debugMode) {
                    console.log('After calculating association rules: ' + self.getTime(beforeMillis) + ' ms');
                }

                var analysisResult = new AnalysisResult(frequentItemSets, associationRules);
                if (self.debugMode) {
                    console.log('AnalysisResult: ' + JSON.stringify(analysisResult));
                    console.log('Apriori.Algorithm\'s total spent time: ' + self.getTime(beforeMillis) + ' ms');
                }
                return analysisResult;
            };

            Algorithm.prototype.toOneElementItemSets = function (transactions) {
                var nestedArrayOfItem = [];
                transactions.forEach(function (transaction) {
                    transaction.forEach(function (item) {
                        nestedArrayOfItem.push(new Array(item));
                    });
                });
                return ArrayUtils.toArraySet(nestedArrayOfItem);
            };
            
            /*Same as toOneElementItemSets, but only considers "af" and "at" items*/
            Algorithm.prototype.modToOneElementItemSets = function (transactions) {
                var nestedArrayOfItem = [];
                transactions.forEach(function (transaction) {
                    transaction.forEach(function (item) {
                        if (item.indexOf("at") == 0 || item.indexOf("af") == 0)
                            nestedArrayOfItem.push(new Array(item));
                    });
                });
                return ArrayUtils.toArraySet(nestedArrayOfItem);
            };

            Algorithm.prototype.findItemSetsMinSupportSatisfied = function (itemSets, transactions, minSupport, frequencies) {
                var filteredItemSets = [], localFrequencies = {};

                itemSets.forEach(function (itemSet) {
                    transactions.forEach(function (transaction) {
                        if (ArrayUtils.isSubSetArrayOf(itemSet, transaction)) {
                            if (!frequencies[itemSet.toString()])
                                frequencies[itemSet.toString()] = 0;
                            if (!localFrequencies[itemSet.toString()])
                                localFrequencies[itemSet.toString()] = 0;
                            frequencies[itemSet.toString()] += 1;
                            localFrequencies[itemSet.toString()] += 1;
                        }
                    });
                });
                var alreadyAdded = false;
                var setAsAlreadyAddedIfFound = function (f) {
                    if (!alreadyAdded)
                        alreadyAdded = f.itemSet.toString() === itemSet.toString();
                };
                for (var strItemSet in localFrequencies) {
                    var itemSet = strItemSet.split(',').sort(), localCount = localFrequencies[itemSet.toString()], support = localCount / transactions.length;

                    if (support >= minSupport) {
                        alreadyAdded = false;
                        filteredItemSets.forEach(setAsAlreadyAddedIfFound);
                        if (!alreadyAdded) {
                            filteredItemSets.push(new FrequentItemSet(itemSet, support));
                        }
                    }
                }
                return filteredItemSets;
            };

            Algorithm.prototype.showAnalysisResultFromFile = function (filename) {
                var self = this;
                require('fs').readFile(filename, 'utf8', function (err, data) {
                    if (err)
                        throw err;
                    var transactions = ArrayUtils.readCSVToArray(data, ',');
                    var analysisResult = self.analyze(transactions);
                    console.log(JSON.stringify(analysisResult.associationRules));
                });
            };

            Algorithm.prototype.getTime = function (initial) {
                return new Date().getTime() - initial;
            };
            return Algorithm;
        })();
        exports.Algorithm = Algorithm;

        var ArrayUtils = (function () {
            function ArrayUtils() {
            }
            ArrayUtils.toStringSet = function (array) {
                var uniqueArray = [];
                array.forEach(function (e) {
                    if (uniqueArray.indexOf(e) === -1)
                        uniqueArray.push(e);
                });
                return uniqueArray;
            };
            ArrayUtils.toArraySet = function (arrayOfArray) {
                var foundElements = {}, uniqueArray = [];
                arrayOfArray.forEach(function (array) {
                    if (!foundElements.hasOwnProperty(array.toString())) {
                        uniqueArray.push(array);
                        foundElements[array.toString()] = true;
                    }
                });
                return uniqueArray;
            };
            ArrayUtils.toAllSubSets = function (array) {
                var op = function (n, sourceArray, currentArray, allSubSets) {
                    if (n === 0) {
                        if (currentArray.length > 0) {
                            allSubSets[allSubSets.length] = ArrayUtils.toStringSet(currentArray);
                        }
                    } else {
                        for (var j = 0; j < sourceArray.length; j++) {
                            var nextN = n - 1, nextArray = sourceArray.slice(j + 1), updatedCurrentSubSet = currentArray.concat([sourceArray[j]]);
                            op(nextN, nextArray, updatedCurrentSubSet, allSubSets);
                        }
                    }
                };
                var allSubSets = [];
                array.sort();
                for (var i = 1; i < array.length; i++) {
                    op(i, array, [], allSubSets);
                }
                allSubSets.push(array);
                return ArrayUtils.toArraySet(allSubSets);
            };
            ArrayUtils.toFixedSizeJoinedSets = function (itemSets, length) {
                var joinedSetArray = [];
                itemSets.forEach(function (itemSetA) {
                    itemSets.forEach(function (itemSetB) {
                        if (ArrayUtils.getDiffArray(itemSetA, itemSetB).length > 0) {
                            var mergedArray = [].concat(itemSetA).concat(itemSetB), joinedSet = ArrayUtils.toStringSet(mergedArray);
                            if (joinedSet.length === length)
                                joinedSetArray.push(joinedSet);
                        }
                    });
                });
                return ArrayUtils.toArraySet(joinedSetArray);
            };
            
            /*Same as toFixedSizeJoinedSets, but it only considers "af" + "at" pairs*/
            ArrayUtils.modToFixedSizeJoinedSets = function (itemSets, length) {
                var joinedSetArray = [];
                itemSets.forEach(function (itemSetA) {
                    itemSets.forEach(function (itemSetB) {
                        if (ArrayUtils.getDiffArray(itemSetA, itemSetB).length > 0) {
                            var mergedArray = [].concat(itemSetA).concat(itemSetB), joinedSet = ArrayUtils.toStringSet(mergedArray);
                            if (joinedSet.length === length) {
                                if (length == 3) {
                                    if ((joinedSet[0].indexOf("af") == 0 && joinedSet[1].indexOf("at") == 0)
                                       || (joinedSet[0].indexOf("af") == 0 && joinedSet[2].indexOf("at") == 0)
                                       || (joinedSet[1].indexOf("af") == 0 && joinedSet[2].indexOf("at") == 0)) 
                                    {
                                        joinedSetArray.push(joinedSet);
                                    }
                                }
                                else if (length == 2) {
                                    if (joinedSet[0].indexOf("af") == 0 || joinedSet[0].indexOf("af") == 0 || 
                                         joinedSet[1].indexOf("at") == 0 || joinedSet[1].indexOf("at") == 0) {
                                        joinedSetArray.push(joinedSet);
                                    }
                                }
                                else {
                                    joinedSetArray.push(joinedSet);
                                }
                            }
                        }
                    });
                });
                return ArrayUtils.toArraySet(joinedSetArray);
            };
            ArrayUtils.isSubSetArrayOf = function (targetArray, superSetArray) {
                var isSubSetArray = true;
                targetArray.forEach(function (item) {
                    if (isSubSetArray && superSetArray.indexOf(item) === -1)
                        isSubSetArray = false;
                });
                return isSubSetArray;
            };
            ArrayUtils.getDiffArray = function (arrayA, arrayB) {
                var diffArray = [];
                arrayA.forEach(function (e) {
                    if (arrayB.indexOf(e) === -1)
                        diffArray.push(e);
                });
                return diffArray;
            };
            ArrayUtils.readCSVToArray = function (inputString, delimiter) {
                delimiter = delimiter || ',';
                var regexp = new RegExp(("(\\" + delimiter + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + delimiter + "\\r\\n]*))"), 'gi');

                var arrayOfRows = [[]];
                var matched;
                while (!!(matched = regexp.exec(inputString))) {
                    var matchedDelimiter = matched[1];
                    if (matchedDelimiter.length && matchedDelimiter !== delimiter) {
                        arrayOfRows.push([]);
                    }
                    var matchedValue = matched[2] ? matched[2].replace(new RegExp('""', 'g'), '"') : matched[3];
                    if (matchedValue.length > 0) {
                        arrayOfRows[arrayOfRows.length - 1].push(matchedValue);
                    }
                }
                return arrayOfRows;
            };
            return ArrayUtils;
        })();
        exports.ArrayUtils = ArrayUtils;
    //})(Apriori || (Apriori = {}));
    //# sourceMappingURL=apriori.js.map

    //exports.Apriori = Apriori;

    //return Apriori;

}));