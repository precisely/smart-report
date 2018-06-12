"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var evaluator_1 = require("./evaluator");
var types_1 = require("./types");
var util_1 = require("util");
var Reducer = (function () {
    function Reducer(_a) {
        var _b = _a.reducers, reducers = _b === void 0 ? {} : _b, _c = _a.functions, functions = _c === void 0 ? {} : _c;
        this._reducers = {};
        for (var key in reducers) {
            this._reducers[key.toLowerCase()] = reducers[key];
        }
        this._functions = functions;
    }
    Reducer.prototype.reduce = function (elt, context) {
        if (types_1.isInterpolation(elt)) {
            return safeValue(evaluator_1.evaluate(elt.expression, context));
        }
        else if (types_1.isTagElement(elt)) {
            return this.reduceTagElement(elt, context)[0];
        }
        else if (types_1.isTextElement(elt)) {
            return this.reduceTextElement(elt, context);
        }
        else {
            throw new Error("Fatal error unexpected element: " + elt);
        }
    };
    Reducer.prototype.reducerFromElement = function (elt) {
        var reducer = this._reducers[elt.name];
        if (!reducer) {
            throw new Error("No component named " + elt.rawName);
        }
        return reducer;
    };
    Reducer.prototype.reduceTagElement = function (elt, context) {
        var _a;
        var _this = this;
        var interpolatedAttributes = this.interpolateAttributes(elt.attrs, context);
        var reducer = this.reducerFromElement(elt);
        var eltWithReducedAttributes = __assign({}, elt, { attrs: interpolatedAttributes });
        var children;
        if (reducer) {
            _a = reducer(eltWithReducedAttributes, context), children = _a[0], context = _a[1];
        }
        else {
            children = elt.children;
        }
        var reducedChildren = children.map(function (child) {
            return child ? _this.reduce(child, context) : null;
        }).filter(function (c) { return c; });
        var reducedTag = __assign({}, eltWithReducedAttributes, { attrs: interpolatedAttributes, reduced: true, children: reducedChildren });
        return [reducedTag, context];
    };
    Reducer.prototype.reduceTextElement = function (textElement, context) {
        var _this = this;
        var reducedBlocks = textElement.blocks.map(function (block) {
            if (types_1.isInterpolation(block)) {
                var value = evaluator_1.evaluate(block.expression, context, _this._functions);
                return safeString(value);
            }
            else {
                return block;
            }
        }).filter(function (b) { return b; });
        return __assign({}, textElement, { blocks: reducedBlocks, reduced: true });
    };
    Reducer.prototype.interpolateAttributes = function (attrs, context) {
        var props = __assign({}, context);
        for (var key in attrs) {
            var value = attrs[key];
            if (types_1.isInterpolation(value)) {
                props[key] = evaluator_1.evaluate(value.expression, context, this._functions);
            }
            else {
                props[key] = value;
            }
        }
        return props;
    };
    return Reducer;
}());
exports.default = Reducer;
function encodedString(o) {
    if (util_1.isString(o)) {
        return;
    }
    else {
    }
}
