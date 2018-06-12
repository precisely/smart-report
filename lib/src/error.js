"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var ErrorType;
(function (ErrorType) {
    ErrorType["NoClosingTag"] = "NoClosingTag";
    ErrorType["MissingEndBracket"] = "MissingEndBracket";
    ErrorType["UnexpectedClosingTag"] = "UnexpectedClosingTag";
    ErrorType["BadIndentation"] = "BadIndentation";
    ErrorType["InvalidExpression"] = "InvalidExpression";
    ErrorType["InvalidArgument"] = "InvalidArgument";
    ErrorType["UnexpectedOperator"] = "UnexpectedOperator";
    ErrorType["ValueUndefined"] = "ValueUndefined";
    ErrorType["FunctionNotDefined"] = "FunctionNotDefined";
})(ErrorType = exports.ErrorType || (exports.ErrorType = {}));
var CodeError = (function (_super) {
    __extends(CodeError, _super);
    function CodeError(message, location, type) {
        var _this = _super.call(this, message + (" at " + location.lineNumber + ":" + location.columnNumber)) || this;
        _this.location = location;
        _this.type = type;
        return _this;
    }
    Object.defineProperty(CodeError.prototype, "lineNumber", {
        get: function () {
            return this.location.lineNumber;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CodeError.prototype, "columnNumber", {
        get: function () {
            return this.location.columnNumber;
        },
        enumerable: true,
        configurable: true
    });
    return CodeError;
}(Error));
exports.CodeError = CodeError;
