import {Location} from './types';

export const enum ErrorType {
   NoClosingTag = 'NoClosingTag',
   MissingEndBracket = 'MissingEndBracket',
   UnexpectedClosingTag = 'UnexpectedClosingTag',
   BadIndentation = 'BadIndentation',
   InvalidExpression = 'InvalidExpression',
   InvalidArgument = 'InvalidArgument',
   UnexpectedOperator = 'UnexpectedOperator',
   ValueUndefined = 'ValueUndefined',
   FunctionNotDefined = 'FunctionNotDefined',
   UnknownTag = 'UnknownTag'
}

export class CodeError extends Error {
  constructor(message: string, public readonly location: Location, public readonly type: ErrorType) {
    super(message + ` at ${location.lineNumber}:${location.columnNumber}`);
  }
  public get lineNumber() {
    return this.location.lineNumber;
  }
  public get columnNumber() {
    return this.location.columnNumber;
  }
}


