import { Location } from './types';
export declare enum ErrorType {
    NoClosingTag = "NoClosingTag",
    MissingEndBracket = "MissingEndBracket",
    UnexpectedClosingTag = "UnexpectedClosingTag",
    BadIndentation = "BadIndentation",
    InvalidExpression = "InvalidExpression",
    InvalidArgument = "InvalidArgument",
    UnexpectedOperator = "UnexpectedOperator",
    ValueUndefined = "ValueUndefined",
    FunctionNotDefined = "FunctionNotDefined"
}
export declare class CodeError extends Error {
    readonly location: Location;
    readonly type: ErrorType;
    constructor(message: string, location: Location, type: ErrorType);
    readonly lineNumber: number;
    readonly columnNumber: number;
}
