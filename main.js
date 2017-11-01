/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

/** Infers consistency rules in JS application and finds deviations from those rules */
//TODO: Find some way to support multiple files
define(function (require, exports, module) {
    "use strict";

    var AppInit = brackets.getModule('utils/AppInit'),
        CommandManager = brackets.getModule("command/CommandManager"),
        Menus  = brackets.getModule("command/Menus"),
        FileSystem = brackets.getModule("filesystem/FileSystem"),
        FileUtils = brackets.getModule("file/FileUtils"),
        Directory = brackets.getModule("filesystem/Directory"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs = brackets.getModule("widgets/DefaultDialogs"),
        HOLOCRONJS_CMD_ID = "holocronjs.findsubtrees";


    var subtreeFinder = require('lib/subtree_finder');
    var codeTreeTransformer = require('lib/codetree_transformer');
    var esprima = require('lib/esprima');
    var DOMParser = require('lib/xmldom/dom-parser').DOMParser;
    var pattIncFinder = require('lib/pattern_inconsistency_finder');
    var linkIncFinder = require('lib/link_inconsistency_finder');
    var utils = require('lib/utils');
    var Constants = utils.Constants;
    var Parameters = utils.Parameters;


    AppInit.appReady(function () {
        var helpMenu = Menus.getMenu(Menus.AppMenuBar.HELP_MENU);
        
        //TODO: Make sure casing for labels is consistent
        var sampleTree = {
            label: "HTML",
            childNodes: [
                {
                    label: "HEAD",
                    childNodes: []
                },
                {
                    label: "BODY",
                    childNodes: [
                        {
                            label: "DIV",
                            childNodes: []
                        },
                        {
                            label: "SPAN",
                            childNodes: []
                        },
                        {
                            label: "DIV",
                            childNodes: []
                        }
                    ]
                }
            ]
        };
        
        // On Windows, paths look like "C:/foo/bar.txt"
        // On Mac, paths look like "/foo/bar.txt"
        //var pathToFile = "/Users/focarizajr/Library/Application Support/Brackets/extensions/user/ca.ubc.ece.frolino.holocronjs/samples/sample1.js"
        //var file = FileSystem.getFileForPath(pathToFile);
                     
        var getSubtrees = function() {
            var startTime = new Date().getTime();

            var jsHashTable = {};
            var domHashTable = {};
            var inconsistencyList = [];
            
            //These elements of these arrays of promises alternate between file contents and file name
            var targetAppPromises = [];
            var sampleAppPromises = [];
            var doneTargetApp = false;
            var doneSampleApps = false;
            var promisesMade = false;
            var dirRecursionLevel = 0;
            var sampleAppId = 1; //Starting ID for sample apps
            
            var dlg = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, 
                                              "Type Directory: <input type='text' id='directory-elem' /><br />"
                                             +"<input type='checkbox' id='use-sample-apps' />Use Sample Apps"
                                             +"<br />Framework"
                                             +"<br />"
                                             +"<input type='radio' id='angular' />AngularJS<br />"
                                             +"<input type='radio' id='backbone' />BackboneJS<br />"
                                             +"<input type='radio' id='ember' />EmberJS<br />"
                                             +"<input type='radio' id='detect' />Detect Automatically<br />");
            dlg.done(function(btn) {
                var doc = dlg.getElement()[0];
                var directoryName = doc.querySelector("#directory-elem").value;
                var useSampleApps = doc.querySelector("#use-sample-apps").checked;
                
                var sampleAppsDirectoryName = Parameters.FULL_PATH_TO_PLUGIN + Parameters.SAMPLE_APP_FOLDER;
                if (doc.querySelector("#angular").checked) {
                    sampleAppsDirectoryName += "angular/";
                }
                else if (doc.querySelector("#backbone").checked) {
                    sampleAppsDirectoryName += "backbone/";
                }
                else if (doc.querySelector("#ember").checked) {
                    sampleAppsDirectoryName += "ember/";
                }
                else {
                    sampleAppsDirectoryName += "angular/"; //TODO: Try to actually find from the web
                }
                
                var directory = FileSystem.getDirectoryForPath(directoryName);
                var processDirectoryContents = function(err, entries) {
                    if (!err) {
                        var recLevel = dirRecursionLevel++;
                        for (var i = 0; i < entries.length; i++) {
                            var file = entries[i];
                            var pathToFile = file._path;
                            
                            //Determine if the file is a directory. If so, go through the children
                            if (file instanceof Directory) {
                                var newContents = file.getContents(processDirectoryContents);
                                continue;
                            }
                            
                            if (!((pathToFile.indexOf(".js") > 0 && 
                                            pathToFile.indexOf(".js")+".js".length == pathToFile.length) ||
                                            (pathToFile.indexOf(".html") > 0 &&
                                                pathToFile.indexOf(".html")+".html".length == 
                                                pathToFile.length))) {
                                continue;
                            }
                        
                            var promise = FileUtils.readAsText(file);  // completes asynchronously
                            targetAppPromises.push(promise);
                            targetAppPromises.push(pathToFile);
                        }
                        
                        if (!promisesMade && recLevel == 0) {
                            promisesMade = true;
                            
                            Promise.all(targetAppPromises).then(function(results) {
                                var appId = Constants.TARGET_APP_ID; //This is the app ID for the target

                                for (var i = 0; i < results.length-1; i=i+2) {
                                    var text = results[i];
                                    var pathToFile = results[i+1];

                                    if (pathToFile.indexOf(".js") > 0 && 
                                            pathToFile.indexOf(".js")+".js".length == pathToFile.length) {
                                        var generatedAst = esprima.parse(text, {loc: true});
                                        var codeTree = codeTreeTransformer.getCodeTree(generatedAst, 
                                                                                       "ast", pathToFile, 
                                                                                       appId);

                                        subtreeFinder.findAllSubtrees(codeTree.tree, Parameters.MAX_CHILDREN, 
                                                                      jsHashTable);
                                        //console.log(jsHashTable);
                                    }
                                    else if (pathToFile.indexOf(".html") > 0 &&
                                                pathToFile.indexOf(".html")+".html".length == 
                                                pathToFile.length) {
                                        //TODO: Any other file extensions (e.g., ".htm")?
                                        var generatedDomTree = new DOMParser().parseFromString(text, 
                                                                                               'text/xml');
                                        //console.log(generatedDomTree);
                                        var codeTree = codeTreeTransformer.getCodeTree(generatedDomTree,
                                                                                       "dom", pathToFile, 
                                                                                       appId);

                                        subtreeFinder.findAllSubtrees(codeTree.tree, Parameters.MAX_CHILDREN, 
                                                                      domHashTable);
                                        //console.log(domHashTable);
                                    }
                                }

                                doneTargetApp = true;

                                if (useSampleApps) {
                                    if (doneTargetApp && doneSampleApps) 
                                        findInconsistencies();
                                }
                                else {
                                    findInconsistencies();
                                }
                            });

                            //TODO: Move this to callback for getting sample apps
                            /*
                            Promise.all(sampleAppPromises).then(function(results) {
                                doneSampleApps = true;

                                if (doneTargetApp && doneSampleApps) findInconsistencies();
                            });
                            */
                        }
                    }
                };
                var contents = directory.getContents(processDirectoryContents);
                
                var processSampleApps = function(err, entries) {
                    if (!err) {
                        for (var i = 0; i < entries.length; i++) {
                            var file = entries[i];
                            var pathToFile = file._path;
                            
                            //The file must be a directory
                            if (file instanceof Directory) {
                                var sameAsTarget = (pathToFile.indexOf(directoryName) == 0);
                                if (!sameAsTarget) {
                                    var newContents = file.getContents(processOneSampleApp);
                                    sampleAppId++;
                                }
                            }
                        }
                    
                        Promise.all(sampleAppPromises).then(function(results) {
                            for (var i = 0; i < results.length-1; i=i+3) {
                                var text = results[i];
                                var pathToFile = results[i+1];
                                var appId = results[i+2];

                                if (pathToFile.indexOf(".js") > 0 && 
                                        pathToFile.indexOf(".js")+".js".length == pathToFile.length) {
                                    var generatedAst = esprima.parse(text, {loc: true});
                                    var codeTree = codeTreeTransformer.getCodeTree(generatedAst, 
                                                                                   "ast", pathToFile, 
                                                                                   appId);

                                    subtreeFinder.findAllSubtrees(codeTree.tree, Parameters.MAX_CHILDREN, 
                                                                  jsHashTable);
                                    //console.log(jsHashTable);
                                }
                                else if (pathToFile.indexOf(".html") > 0 &&
                                            pathToFile.indexOf(".html")+".html".length == 
                                            pathToFile.length) {
                                    //TODO: Any other file extensions (e.g., ".htm")?
                                    var generatedDomTree = new DOMParser().parseFromString(text, 
                                                                                           'text/xml');
                                    //console.log(generatedDomTree);
                                    var codeTree = codeTreeTransformer.getCodeTree(generatedDomTree,
                                                                                   "dom", pathToFile, 
                                                                                   appId);

                                    subtreeFinder.findAllSubtrees(codeTree.tree, Parameters.MAX_CHILDREN, 
                                                                  domHashTable);
                                    //console.log(domHashTable);
                                }
                            }

                            doneSampleApps = true;

                            if (doneTargetApp && doneSampleApps) findInconsistencies();
                        });
                    }
                };
                
                var processOneSampleApp = function(err, entries) {
                    if (!err) {
                        for (var i = 0; i < entries.length; i++) {
                            var file = entries[i];
                            var pathToFile = file._path;
                            
                            //Determine if the file is a directory. If so, go through the children
                            if (file instanceof Directory) {
                                var newContents = file.getContents(processOneSampleApp);
                                continue;
                            }
                            
                            if (!((pathToFile.indexOf(".js") > 0 && 
                                            pathToFile.indexOf(".js")+".js".length == pathToFile.length) ||
                                            (pathToFile.indexOf(".html") > 0 &&
                                                pathToFile.indexOf(".html")+".html".length == 
                                                pathToFile.length))) {
                                continue;
                            }
                        
                            var promise = FileUtils.readAsText(file);  // completes asynchronously
                            sampleAppPromises.push(promise);
                            sampleAppPromises.push(pathToFile);
                            sampleAppPromises.push(sampleAppId);
                        }
                    }
                };
                
                if (useSampleApps) {
                    var sampleAppsDir = FileSystem.getDirectoryForPath(sampleAppsDirectoryName);
                    var sampleAppsContents = sampleAppsDir.getContents(processSampleApps);
                }
            });
            
            var findInconsistencies = function() {
                subtreeFinder.removeUninterestingHashBins(jsHashTable, false);
                //console.log(jsHashTable);
                jsHashTable = subtreeFinder.removeCollisions(jsHashTable);
                console.log(jsHashTable);
                subtreeFinder.removeUninterestingHashBins(jsHashTable, true);
                console.log(jsHashTable);
                
                subtreeFinder.removeUninterestingHashBins(domHashTable, false);
                //console.log(domHashTable);
                domHashTable = subtreeFinder.removeCollisions(domHashTable);
                console.log(domHashTable);
                subtreeFinder.removeUninterestingHashBins(domHashTable, true);
                console.log(domHashTable);
                
                console.log("Finding Subtrees: " + (new Date().getTime() - startTime) + " ms");

                var bins = pattIncFinder.findAllPatternInconsistencies(jsHashTable, 
                                                                    domHashTable, inconsistencyList, 
                                                                    Parameters.PATT_INC_THRESHOLD);
                jsHashTable = bins.js;
                domHashTable = bins.dom;
                
                console.log("Finding Pattern Inconsistencies: " + (new Date().getTime() - startTime) + " ms");
                
                subtreeFinder.capHashBins(jsHashTable, Parameters.HASH_BIN_CAP);
                console.log(jsHashTable);
                subtreeFinder.capHashBins(domHashTable, Parameters.HASH_BIN_CAP);
                console.log(domHashTable);
                
                console.log(jsHashTable);
                console.log(domHashTable);
                console.log(inconsistencyList);

                linkIncFinder.findLinkInconsistencies(jsHashTable, domHashTable, inconsistencyList, 
                                                      Parameters.LINK_INC_THRESHOLD, startTime);
                
                console.log("Finding Conditional Violations: " + (new Date().getTime() - startTime) + " ms");
                
                console.log(inconsistencyList);
                
                console.log((new Date().getTime() - startTime) + " ms");
            };
        };

        CommandManager.register("Try to Find Subtrees", HOLOCRONJS_CMD_ID, getSubtrees);
        helpMenu.addMenuItem(HOLOCRONJS_CMD_ID);
    });
});