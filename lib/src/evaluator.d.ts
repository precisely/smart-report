import { Context, Hash, InterpolationFunction, Attribute, Expression } from './types';
export declare enum OpType {
    funcall = "funcall",
    and = "and",
    or = "or",
    not = "not",
    equals = "equals",
    scalar = "scalar",
    accessor = "accessor"
}
export declare function evaluate(expression: Expression, context?: Context, functions?: Hash<InterpolationFunction>): Attribute;
