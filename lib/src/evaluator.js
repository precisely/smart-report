"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var error_1 = require("./error");
var OpType;
(function (OpType) {
    OpType["funcall"] = "funcall";
    OpType["and"] = "and";
    OpType["or"] = "or";
    OpType["not"] = "not";
    OpType["equals"] = "equals";
    OpType["scalar"] = "scalar";
    OpType["accessor"] = "accessor";
})(OpType = exports.OpType || (exports.OpType = {}));
;
function getValue(accessor, context) {
    if (accessor.length === 0) {
        return context;
    }
    else {
        var key = accessor[0], rest = accessor.slice(1);
        return getValue(rest, context ? context[key] : undefined);
    }
}
function getFunction(accessor, functions, location) {
    var result = functions[accessor[0]];
    if (!result || accessor.length != 1) {
        throw new error_1.CodeError("No function \"" + accessor.join('.') + "\"", location, error_1.ErrorType.FunctionNotDefined);
    }
    return result;
}
var evaluators = {
    accessor: function (args, context) {
        var accessor = args[0].split('.');
        return getValue(accessor, context);
    },
    funcall: function (args, context, functions) {
        var name = args[0], location = args[1], fnargs = args[2];
        var functionSymbol = name.split('.');
        var func = getFunction(functionSymbol, functions, location);
        var evaluatedArgs = fnargs.map(function (arg) { return evaluate(arg, context, functions); });
        return func.apply(void 0, [context].concat(evaluatedArgs));
    },
    and: function (args, context, functions) {
        var lhs = args[0], rhs = args[1];
        return (evaluate(lhs, context, functions) &&
            evaluate(rhs, context, functions));
    },
    or: function (args, context, functions) {
        var lhs = args[0], rhs = args[1];
        return (evaluate(lhs, context, functions) ||
            evaluate(rhs, context, functions));
    },
    not: function (args, context, functions) {
        return !evaluate(args[1], context, functions);
    },
    scalar: function (args) {
        return args[1];
    }
};
function evaluate(expression, context, functions) {
    if (context === void 0) { context = {}; }
    if (functions === void 0) { functions = {}; }
    var op = expression[0], args = expression[1];
    var evaluator = evaluators[op];
    if (evaluator) {
        return evaluator(args, context, functions);
    }
    else {
        throw new Error("Fatal: unexpected expression during evaluation: " + JSON.stringify(expression));
    }
}
exports.evaluate = evaluate;
