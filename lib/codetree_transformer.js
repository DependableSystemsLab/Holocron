/**
 * Transforms an AST and a DOM tree into a CodeTree. 
 * A CodeTree consists of a type (ast or dom), a label, a list of child nodes,
 * and a count of the number of subtrees
 */
define(function (require, exports, module) {
    'use strict';
    
    /****
     * CodeTree Class
     ***/
    
    /**
     * Constructor for CodeTree object
     * @param originalTree The original tree, which is either an AST or DOM
     * @param type The type of the original tree (ast or dom)
     * @param sourceFile The source file for this AST
     */
    function CodeTree(originalTree, type, sourceFile, appId) {
        if (type == "ast") {
            this.tree = transformAstToCodeTree(originalTree, sourceFile, appId);
        }
        else if (type == "dom") {
            this.tree = transformDomToCodeTree(originalTree, sourceFile, appId);
        }
    }
    
    /****
     * CodeTreeNode Class
     ***/
    
    /**
     * Constructor for CodeTreeNode object. Note that numSubtrees is initially undefined, as well as
     * subtreeListRange (i.e., the list of indices)
     * @param _type The node type (ast or dom)
     * @param _label The node label
     * @param _sourceFile The source file (empty if none)
     * @param _appId An id for the app to which this source file belongs
     */
    function CodeTreeNode(_type, _label, _parent, _sourceFile, _appId) {
        this.type = _type;
        this.label = _label;
        this.parent = _parent;
        this.childNodes = [];
        this.shouldAbstractOut = false;
        this.lineNumber = null;
        this.columnNumber = null;
        this.sourceFile = _sourceFile;
        this.appId = _appId;
    }
    
    CodeTreeNode.prototype.addChild = function(codeTreeNode) {
        this.childNodes.push(codeTreeNode);
    };
    
    CodeTreeNode.prototype.abstractOut = function() {
        this.shouldAbstractOut = true;
    };
    
    CodeTreeNode.prototype.concretize = function() {
        this.shouldAbstractOut = false;
    };
    
    CodeTreeNode.prototype.addLoc = function(line, column) {
        this.lineNumber = line;
        this.columnNumber = column;
    };
    
    CodeTreeNode.prototype.addSourceFile = function(src) {
        this.sourceFile = src;
    };
    
    CodeTreeNode.prototype.copyFromRoot = function() {
        return copyCodeTreeNode(this);
    };
    
    function copyCodeTreeNode(root) {
        //Note that the parent will point to the *original* parent
        var newNode = new CodeTreeNode(root.type, root.label, root.parent, root.sourceFile, root.appId);
        newNode.shouldAbstractOut = root.shouldAbstractOut;
        newNode.addLoc(root.lineNumber, root.columnNumber);
        newNode.originalNode = root;
        
        //Copy the children as well
        for (var i = 0; i < root.childNodes.length; i++) {
            var nextChild = copyCodeTreeNode(root.childNodes[i]);
            newNode.addChild(nextChild);
        }
        
        return newNode;
    }
    
    /****
     * Tree Transformer Functions
     ***/
    
    /**
     * Walk through the AST, and create a corresponding CodeTreeNode for each node
     * @param ast The original AST root
     * @param sourceFile The source file for the AST (empty string if none)
     * @param appId The app ID for the current file
     */
    function transformAstToCodeTree(ast, sourceFile, appId) {
        var stack = [ ast ], i, j, key, len, node, child, subchild;
        
        //Create a CodeTreeNode for the root
        var newCodeTreeNode = new CodeTreeNode("ast", ast.type, null, sourceFile, appId);
        if (ast.loc != undefined) {
            newCodeTreeNode.addLoc(ast.loc.start.line, ast.loc.start.column);
        }
        ast.codetreeref = newCodeTreeNode;

        //Now, walk through all the nodes
        for (i = 0; i < stack.length; i++) {
            node = stack[i];

            for (key in node) {
                if (key !== "codetreeref") {
                    child = node[key];

                    if (child instanceof Array) {
                        for (j = 0, len = child.length; j < len; j += 1) {
                            subchild = child[j];
                            addChildNode(subchild, node, sourceFile, appId);
                            stack.push(subchild);
                        }
                    } else if (child != void 0 && typeof child.type === 'string') {
                        addChildNode(child, node, sourceFile, appId);        
                        stack.push(child);
                    }
                    
                    //The above considers identifiers and literals as nodes in the CodeTree as well. These must 
                    //be added as the child of an Identifier or a Literal node. Also, the "Literal" label 
                    //should be changed based on the 'value' property. If it's a number literal, it should be 
                    //changed to "NumberLiteral". If it's a string literal, it should be changed to 
                    //"StringLiteral". We should also look at the "operator" property of a BinaryExpression, 
                    //UpdateExpression, or UnaryExpression, if any. For UpdateExpression and UnaryExpression, 
                    //we should also look at the prefix value (i.e., true or false), which indicates whether 
                    //the operator is before or after.
                }
            }
        }
        
        return ast.codetreeref;
    }
    
    /**
     * Walk through the DOM, and create a corresponding CodeTreeNode for each node
     * @param dom The DOM document object
     * @param sourceFile The source file for the DOM (empty string if none)
     * @param appId The app ID for the current file
     */
    function transformDomToCodeTree(dom, sourceFile, appId) {
        var domRoot = dom;
        var stack = [ domRoot ], i, j, key, len, node, child, subchild;
        
        //Create a CodeTreeNode for the root
        var newCodeTreeNode = new CodeTreeNode("dom", "DocumentNode", null, sourceFile, appId);
        if (domRoot.loc != undefined) {
            newCodeTreeNode.addLoc(domRoot.loc.start.line, domRoot.loc.start.column);
        }
        domRoot.codetreeref = newCodeTreeNode;

        //Now, walk through all the nodes
        for (i = 0; i < stack.length; i++) {
            node = stack[i];
            
            //Find children of elements, or name and value of attribute, or value of text
            var type = node.nodeType;
            if (type == 1 || node === domRoot) { //Element, or Document node
                //Get all the children
                var children = node.childNodes;
                
                for (j = 0; j < children.length; j++) {
                    var child = children[j];
                    
                    //What kind of node is it?
                    var childType = child.nodeType;
                    if (childType == 1) { //Element
                        var newCodeTreeNode = new CodeTreeNode("dom", child.tagName, node.codetreeref, 
                                                               sourceFile, appId);
                        if (child.loc != undefined) {
                            newCodeTreeNode.addLoc(child.loc.start.line, child.loc.start.column);
                        }
                        node.codetreeref.addChild(newCodeTreeNode);
                        child.codetreeref = newCodeTreeNode;
                        stack.push(child);
                    }
                    else if (childType == 3) { //Text
                        if (child.nodeValue.trim() == "") continue; //Don't care if text node is empty
                        var newCodeTreeNode = new CodeTreeNode("dom", "TextNode", node.codetreeref, 
                                                               sourceFile, appId);
                        if (child.loc != undefined) {
                            newCodeTreeNode.addLoc(child.loc.start.line, child.loc.start.column);
                        }
                        node.codetreeref.addChild(newCodeTreeNode);
                        child.codetreeref = newCodeTreeNode;
                        stack.push(child);
                    }
                }
                
                //Get attributes too
                if (type == 1) {
                    var attrs = node.attributes;
                    for (j = 0; j < attrs.length; j++) {
                        var attr = attrs[j];
                        var newCodeTreeNode = new CodeTreeNode("dom", "AttributeNode", 
                                                               node.codetreeref, sourceFile, appId);
                        if (attr.loc != undefined) {
                            newCodeTreeNode.addLoc(attr.loc.start.line, attr.loc.start.column);
                        }
                        node.codetreeref.addChild(newCodeTreeNode);
                        attr.codetreeref = newCodeTreeNode;
                        stack.push(attr);
                    }
                }
            }
            else if (type == 2) { //Attr
                //Add the attribute name and value (no need to push to the stack)
                var newCodeTreeNode = new CodeTreeNode("dom", node.nodeName, node.codetreeref, 
                                                       sourceFile, appId);
                if (node.loc != undefined) {
                    newCodeTreeNode.addLoc(node.loc.start.line, node.loc.start.column);
                }
                node.codetreeref.addChild(newCodeTreeNode);
                
                //For the value, determine whether it's a NumberLiteral, BooleanLiteral, or, by default,
                //a StringLiteral
                var val = node.nodeValue, valType = "StringLiteral";
                if (!isNaN(val)) {
                    valType = "NumberLiteral";
                }
                else if (val == "true" || val == "false") {
                    valType = "BooleanLiteral";
                }
                var typeNode = new CodeTreeNode("dom", valType, node.codetreeref, sourceFile, appId);
                typeNode.abstractOut();
                if (node.loc != undefined) {
                    typeNode.addLoc(node.loc.start.line, node.loc.start.column);
                }
                node.codetreeref.addChild(typeNode);
                newCodeTreeNode = new CodeTreeNode("dom", node.nodeValue, typeNode, sourceFile, appId);
                newCodeTreeNode.abstractOut();
                if (node.loc != undefined) {
                    newCodeTreeNode.addLoc(node.loc.start.line, node.loc.start.column);
                }
                typeNode.addChild(newCodeTreeNode);
            }
            else if (type == 3) { //Text
                newCodeTreeNode = new CodeTreeNode("dom", node.nodeValue, node.codetreeref, sourceFile, appId);
                if (node.loc != undefined) {
                    newCodeTreeNode.addLoc(node.loc.start.line, node.loc.start.column);
                }
                node.codetreeref.addChild(newCodeTreeNode);
            }
        }
        
        return domRoot.codetreeref;
    }
    
    /**
     * Add the specified child node (child) to the current node (node)
     * @param child The child node to add
     * @param node The node to add to (more specifically, we need to add to the corresponding CodeTreeNode,
     *          which is stored in node.codetreeref)
     * @param sourceFile The source file
     * @param appId The app ID for the current file
     */
    function addChildNode(child, node, sourceFile, appId) {
        var childType = child.type;
        if (child.type === "Literal") {
            if (child.value != undefined && typeof child.value === 'string') {
                childType = "StringLiteral";
            }
            else if (child.value != undefined && typeof child.value === 'number') {
                childType = "NumberLiteral";
            }
            else if (child.value != undefined && typeof child.value == 'boolean') {
                childType = "BooleanLiteral";
            }
        }

        var hasLoc = (child.loc != undefined), lineNumber, columnNumber;
        if (hasLoc) {
            lineNumber = child.loc.start.line;
            columnNumber = child.loc.start.column;
        }

        //Add this in the childNodes array of the current node
        var newCodeTreeNode = new CodeTreeNode("ast", childType, node.codetreeref, sourceFile, appId);
        if (child.type === "Literal") newCodeTreeNode.abstractOut();
        if (hasLoc) newCodeTreeNode.addLoc(lineNumber, columnNumber);
        node.codetreeref.addChild(newCodeTreeNode);
        child.codetreeref = newCodeTreeNode;

        //Add values if necessary
        if (child.type === "Literal" && child.raw != undefined) {
            var newLiteralNode = new CodeTreeNode("ast", "" + child.raw, newCodeTreeNode, sourceFile, appId);
            if (hasLoc) newLiteralNode.addLoc(lineNumber, columnNumber);
            newLiteralNode.abstractOut();
            newCodeTreeNode.addChild(newLiteralNode);
        }
        else if (child.type === "Identifier" && child.name != undefined) {
            var newNameNode = new CodeTreeNode("ast", child.name, newCodeTreeNode, sourceFile, appId);
            if (hasLoc) newNameNode.addLoc(lineNumber, columnNumber);
            newNameNode.abstractOut();
            newCodeTreeNode.addChild(newNameNode);
        }
        else if (child.type === "BinaryExpression" || child.type === "UpdateExpression" || child.type === "UnaryExpression") {
            if (child.operator != undefined) {
                var newOperatorNode = new CodeTreeNode("ast", child.operator, newCodeTreeNode, 
                                                       sourceFile, appId);
                if (hasLoc) newOperatorNode.addLoc(lineNumber, columnNumber);
                newCodeTreeNode.addChild(newOperatorNode);
            }
            if (child.prefix != undefined) {
                var newPrefixNode = new CodeTreeNode("ast", child.prefix + "", newCodeTreeNode, 
                                                     sourceFile, appId);
                if (hasLoc) newPrefixNode.addLoc(lineNumber, columnNumber);
                newCodeTreeNode.addChild(newPrefixNode);
            }
        }
    }
    
    /**
     * Wrapper function for generating the CodeTree for the given tree
     * @param originalTree The original tree
     * @param type The original tree's type (ast or dom)
     */
    function getCodeTree(originalTree, type, sourceFile, appId) {
        return new CodeTree(originalTree, type, sourceFile, appId);
    }
    
    exports.getCodeTree = getCodeTree;
});