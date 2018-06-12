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
var lodash_1 = require("lodash");
var evaluator_1 = require("./evaluator");
var types_1 = require("./types");
var DefaultComponent = function (attrs, writer) { };
var Renderer = (function () {
    function Renderer(_a) {
        var _b = _a.components, components = _b === void 0 ? {} : _b, _c = _a.defaultComponent, defaultComponent = _c === void 0 ? DefaultComponent : _c, _d = _a.functions, functions = _d === void 0 ? {} : _d;
        this._components = {};
        for (var key in components) {
            this._components[key.toLowerCase()] = components[key];
        }
        this._defaultComponent = defaultComponent;
        this._functions = functions;
    }
    Renderer.prototype.write = function (elt, context, stream) {
        if (lodash_1.isArray(elt)) {
            var _this = this;
            var elements = elt;
            elements.forEach(function (elt) {
                _this.write(elt, context, stream);
            });
        }
        else if (lodash_1.isObject(elt)) {
            this.writeElement(elt, context, stream);
        }
        else {
            throw new Error("Unexpected dom element: " + JSON.stringify(elt));
        }
    };
    Renderer.prototype.componentFromElement = function (element) {
        var component = this._components[element.name] || this._defaultComponent;
        if (!component) {
            throw new Error("No component named " + element.rawName);
        }
        return component;
    };
    Renderer.prototype.writeElement = function (elt, context, stream) {
        var _this = this;
        var writer = function (obj, newContext) {
            newContext = newContext || context;
            if (lodash_1.isString(obj) || lodash_1.isNumber(obj)) {
                stream.write(obj);
            }
            else if (types_1.isElement(obj)) {
                _this.write(obj, newContext, stream);
            }
        };
        if (types_1.isTextElement(elt)) {
            this.renderTextElement(elt, context, writer);
        }
        else if (types_1.isTagElement(elt)) {
            var component = this.componentFromElement(elt);
            var interpolatedAttrs = Object.assign({ __name: elt.name, __children: elt.children }, this.interpolateAttributes(elt.attrs, context));
            component(interpolatedAttrs, writer);
        }
    };
    ;
    Renderer.prototype.renderTextElement = function (textElement, context, writer) {
        var _this_1 = this;
        textElement.blocks.forEach(function (block) {
            if (types_1.isInterpolation(block)) {
                writer(evaluator_1.evaluate(block.expression, context, _this_1._functions));
            }
            else if (block) {
                writer(block);
            }
        });
    };
    Renderer.prototype.interpolateAttributes = function (attrs, context) {
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
    return Renderer;
}());
exports.default = Renderer;
