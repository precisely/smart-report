
import { CodeError, ErrorType } from './error';
import { Context, Hash, InterpolationFunction, Attribute, Expression, Location } from './types';

export const enum OpType {
  funcall = 'funcall',
  and = 'and',
  or = 'or',
  not = 'not',
  equals = 'equals',
  scalar = 'scalar',
  accessor = 'accessor'
}

function getValue(accessor: string[], context: Context): Attribute<void> {
  if (accessor.length === 0) {
    return context;
  } else {
    const [key, ...rest] = accessor;
    return getValue(rest, context ? context[key] : undefined);
  }
}

type EvalArg = any; // tslint:disable-line
type EvaluationFunction = (args: EvalArg[], context: Context, functions: Hash<InterpolationFunction>) => Attribute; //

function evaluateFuncall(
  args: EvalArg[],
  context: Context,
  functions: Hash<InterpolationFunction>,
  analysisMode: boolean = true
): Attribute {
  const [name, location, ...fnargs] = args;
  const accessor = name.split('.');
  const interpolationFunction = functions[accessor[0]]
            || analysisMode ? (context: Context, ...args: any[]) => null : null; // tslint:disable-line

  if (!interpolationFunction || accessor.length !== 1) {
    throw new CodeError(`No function "${accessor.join('.')}"`, location, ErrorType.FunctionNotDefined);
  }

  const evaluatedArgs = (<EvalArg[]> fnargs).map(arg => evaluate(arg, context, functions));

  return interpolationFunction(context, ...evaluatedArgs);
}

const evaluators: Hash<EvaluationFunction> = {
  accessor(args: string[], context: Context): Attribute {
    const accessor = args[0].split('.');
    return getValue(accessor, context);
  },
  funcall(args: EvalArg[], context: Context, functions: Hash<InterpolationFunction>): Attribute {
    const [name, location, ...fnargs] = args;
    const functionSymbol = name.split('.');
    const func: InterpolationFunction = getFunction(functionSymbol, functions, location);
    const evaluatedArgs = (<EvalArg[]> fnargs).map(arg => evaluate(arg, context, functions));

    return func(context, ...evaluatedArgs);
  },
  and(args: EvalArg[], context: Context, functions: Hash<InterpolationFunction>) {
    const [lhs, rhs] = args;
    return (
      evaluate(lhs, context, functions) &&
      evaluate(rhs, context, functions)
    );
  },
  or(args: EvalArg[], context: Context, functions: Hash<InterpolationFunction>) {
    const [lhs, rhs] = args;
    return (
      evaluate(lhs, context, functions) ||
      evaluate(rhs, context, functions)
    );
  },
  not(args: EvalArg[], context: Context, functions: Hash<InterpolationFunction>) {
    return !evaluate(args[0], context, functions);
  },
  scalar(args: EvalArg[]) {
    return args[0];
  }
};

const analyticEvaluators = {
  ...evaluators,
  and(args: EvalArg[], context: Context, functions: Hash<InterpolationFunction>) {
    const [lhs, rhs] = args;
    const lhsVal = evaluate(lhs, context, functions);
    const rhsVal = evaluate(rhs, context, functions);
    return lhsVal && rhsVal;
  },
  or(args: EvalArg[], context: Context, functions: Hash<InterpolationFunction>) {
    const [lhs, rhs] = args;
    const lhsVal = evaluate(lhs, context, functions);
    const rhsVal = evaluate(rhs, context, functions);
    return lhsVal || rhsVal;
  },
  funcall(args: EvalArg[], context: Context, functions: Hash<InterpolationFunction>): Attribute {
    return evaluateFuncall(fn, args, context);
  }
};

/**
 * Evaluates an interpolation expression
 *
 * @param {[string, any[]]} expression - [op, args]
 * @param {[key: string]: any} context
 * @param {[key: string]: (context, ...args) => any} functions
 * @param {boolean} analysis - if true, all expressions are guaranteed to be evaluated, even
 *                                in branches of
 */
export function evaluate(
  expression: Expression,
  context: Context = {},
  functions: Hash<InterpolationFunction> = {},
  analysis: boolean = false
): Attribute {
  const [op, ...args] = expression;
  // console.log('evaluate(%j, %j, %j)', expression, context, functions);
  const evaluator = (analysis ? analyticEvaluators : evaluators)[op];
  if (evaluator) {
    return evaluator(args, context, functions);
  } else {
    throw new Error(`Fatal: unexpected expression during evaluation: ${JSON.stringify(expression)}`);
  }
}
