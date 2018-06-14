
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

/**
 * Retrieve nested value from object
 * E.g., getValue(['a', 'b'], { a: { b: 'foo' }}) // => foo
 * Returns undefined for invalid path.
 *
 * @param path
 * @param context
 */
function getValue(path: string[], context: Context): Attribute<void> {
  if (path.length === 0) {
    return context;
  } else {
    const [key, ...rest] = path;
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
  const interpolationFunction =
    functions[name] ? functions[name] :
      analysisMode ? (context: Context, ...args: any[]) => undefined // tslint:disable-line
      : null;

  if (!interpolationFunction) {
    throw new CodeError(`No function "${name}"`, location, ErrorType.FunctionNotDefined);
  }

  const evaluatedArgs = (<EvalArg[]> fnargs).map(arg => evaluate(arg, context, functions, true));

  return interpolationFunction(context, ...evaluatedArgs);
}

const evaluators: Hash<EvaluationFunction> = {
  accessor(args: string[], context: Context): Attribute {
    const accessor = args[0].split('.');
    return getValue(accessor, context);
  },
  funcall(args: EvalArg[], context: Context, functions: Hash<InterpolationFunction>): Attribute {
    return evaluateFuncall(args, context, functions, false);
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
    return evaluateFuncall(args, context, functions, true);
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
