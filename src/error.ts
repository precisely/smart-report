import {Location} from './types';

export const enum ErrorType {
  BadIndentation = 'BadIndentation',
  EvaluationFailed = 'EvaluationFailed',
  FunctionNotDefined = 'FunctionNotDefined',
  InvalidArgument = 'InvalidArgument',
  InvalidAttribute = 'InvalidAttribute',
  InvalidExpression = 'InvalidExpression',
  InvalidSymbol = 'InvalidSymbol',
  MissingEndBracket = 'MissingEndBracket',
  NoClosingComment = 'NoClosingComment',
  NoClosingTag = 'NoClosingTag',
  SyntaxError = 'SyntaxError',
  UnexpectedClosingTag = 'UnexpectedClosingTag',
  UnexpectedOperator = 'UnexpectedOperator',
  UnknownTag = 'UnknownTag',
  ValueUndefined = 'ValueUndefined'
}

export class CodeError extends Error {
  constructor(message: string, public readonly location: Location, public readonly type: ErrorType) {
    super(message + (location ? ` at ${location.lineNumber}:${location.columnNumber}` : ''));

    const actualProto = new.target.prototype;
    const _this: any = this; // tslint:disable-line 
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      _this.__proto__ = actualProto;
    }
  }
}
