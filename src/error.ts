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
   NoClosingComment = 'NoClosingComment',
   UnknownTag = 'UnknownTag',
   InvalidSymbol = 'InvalidSymbol',
   InvalidAttribute = 'InvalidAttribute'
}

export class CodeError extends Error {
  constructor(message: string, public readonly location: Location, public readonly type: ErrorType) {
    super(message + ` at ${location.lineNumber}:${location.columnNumber}`);
  }
}
