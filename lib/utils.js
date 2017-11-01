/**
 * Defines various utility functions and classes
 */
define(function (require, exports, module) {
    'use strict';
    
    /****
     * Stack Class
     ***/
    function Stack() {
        this.stackArr = [];
    }

    Stack.prototype.push = function(item) {
        this.stackArr.push(item);
    };

    Stack.prototype.pop = function() {
        if (this.stackArr.length == 0) return null;
        var item = this.stackArr[this.stackArr.length-1];
        this.stackArr.splice(this.stackArr.length-1, 1);
        return item;
    };

    Stack.prototype.peek = function() {
        if (this.stackArr.length == 0) return null;
        var item = this.stackArr[this.stackArr.length-1];
        return item;
    };
    
    /****
     * Queue Class
     ***/

    function Queue() {
        this.queueArr = [];
    }

    Queue.prototype.enqueue = function(item) {
        this.queueArr.push(item);
    };

    Queue.prototype.dequeue = function() {
        if (this.queueArr.length == 0) return null;
        var item = this.queueArr[0];
        this.queueArr.splice(0, 1);
        return item;
    };

    Queue.prototype.peek = function() {
        if (this.queueArr.length == 0) return null;
        var item = this.queueArr[0];
        return item;
    };
    
    /****
     * Constants
     ***/
    
    var Constants = {
        TARGET_APP_ID: 0,
    };
    
    /****
     * Parameters
     ***/
    
    //TODO FOR USER: Change FULL_PATH_TO_PLUGIN
    //Original PATT_INC_THRESHOLD: 90
    //Original LINK_INC_THRESHOLD: 95
    var Parameters = {
        PATT_INC_THRESHOLD: 90,
        LINK_INC_THRESHOLD: 95,
        MAX_CHILDREN: 5,
        FULL_PATH_TO_PLUGIN: "/Users/focarizajr/Library/Application Support/Brackets/extensions/user/ca.ubc.ece.frolino.holocronjs/",
        SAMPLE_APP_FOLDER: "sampleapps/",
        
        HASH_BIN_CAP: 20,
        TRANSACTIONS_CAP: 50
    };
    
    exports.Stack = Stack;
    exports.Queue = Queue;
    exports.Constants = Constants;
    exports.Parameters = Parameters;
});