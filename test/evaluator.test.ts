import { evaluate } from '../src/evaluator';
import { Context, InterpolationFunction, Hash } from '../src/types';
import cases from 'jest-in-case';

describe('evaluator', function () {
  it('should evaluate a scalar', function () {
    expect(evaluate(['scalar', 'abc'], {}, {})).toEqual('abc');
    expect(evaluate(['scalar', 123], {}, {})).toEqual(123);
    expect(evaluate(['scalar', true], {}, {})).toEqual(true);
    expect(evaluate(['scalar', false], {}, {})).toEqual(false);
  });

  it('should evaluate a variable', function () {
    expect(evaluate(['accessor', 'a'], { a: 1 }, {})).toEqual(1);
    expect(evaluate(['accessor', 'a.b'], { a: { b: 123 }}, {})).toEqual(123);
  });

  it('should evaluate a missing variable as undefined', function () {
    expect(evaluate(['accessor', 'b'], { a: 1 }, {})).toBeUndefined();
    expect(evaluate(['accessor', 'a.b.c'], {}, {})).toBeUndefined();
  });

  it('should evaluate a function call with scalar arguments', function () {
    expect(evaluate(['funcall', 'mul', {}, ['scalar', 2], ['scalar', 3]], {}, {
      mul(ctx: Context, x: number, y: number) {
        return x * y;
      }
    })).toEqual(6);
  });

  it('should evaluate a function call with scalar, accessor arguments', function () {
    expect(evaluate(['funcall', 'mul', {}, ['scalar', 2], ['accessor', 'a.b']], {
      a: { b: 3 }
    }, {
      mul(ctx: Context, x: number, y: number) {
        return x * y;
      }
    })).toEqual(6);
  });

  it('should evaluate a function call with funcall and scalar arguments', function () {
    expect(evaluate(['funcall', 'mul', {},
    ['scalar', 2],
    ['funcall', 'mul', {}, ['scalar', 2], ['scalar', 3]]], {}, {
      mul(ctx: Context, x: number, y: number) {
        return x * y;
      }
    })).toEqual(12);
  });

  it('should throw an error if the function is not defined', function () {
    expect(() => evaluate(['funcall', 'mul',
      { lineNumber: 5, columnNumber: 7 },
      ['scalar', 2],
      ['funcall', 'mul', {}, ['scalar', 2], ['scalar', 3]]], {}, {})
    ).toThrow(/No function "mul" at.*5.*7/);
  });

  cases('should evaluate logic correctly', ({op, lhs, rhs, result}) => {
    expect(evaluate([op, ['scalar', lhs], ['scalar', rhs]])).toEqual(result);
  }, [
    { op: 'and', lhs: true, rhs: true, result: true},
    { op: 'and', lhs: false, rhs: true, result: false},
    { op: 'and', lhs: true, rhs: false, result: false},
    { op: 'and', lhs: false, rhs: false, result: false},
    { op: 'or', lhs: false, rhs: false, result: false},
    { op: 'or', lhs: true, rhs: false, result: true},
    { op: 'or', lhs: false, rhs: true, result: true},
    { op: 'or', lhs: true, rhs: true, result: true}
  ]);
  it('should evaluate not logic correctly', function () {
    expect(evaluate(['not', ['scalar', true]])).toEqual(false);
    expect(evaluate(['not', ['scalar', false]])).toEqual(true);
  });

  it('should throw an error if an invalid expression is provided', function () {
    expect(() => evaluate(['no such op'], {}, {})).toThrow();
    expect(() => evaluate([], {}, {})).toThrow();
  });

  describe('when analysis flag is set,', function () {
    it('missing functions should evaluate to undefined', function () {
      const expression = ['funcall', 'missing', {}, ['scalar', 123]];
      const evaluationResult = evaluate(expression, {}, {}, true);
      expect(evaluationResult).toBeUndefined();
    });

    cases('should evaluate both lhs and rhs of logic operation', ({ op, lhs, rhs, result }) => {
      const expression: any[] = [op, // tslint:disable-line
        ['funcall', 'lhs', {}, ['scalar', lhs]],
        ['funcall', 'rhs', {}, ['scalar', rhs]]
      ];
      let lhsCalled, rhsCalled;
      const functions: Hash<InterpolationFunction> = {
        lhs(c: Context, val: any) { // tslint:disable-line
          lhsCalled = true;
          return val;
        },
        rhs(c: Context, val: any) { // tslint:disable-line
          rhsCalled = true;
          return val;
        }
      };

      const evaluationResult = evaluate(expression, {}, functions, true);
      expect(evaluationResult).toEqual(result);
      expect(lhsCalled).toBeTruthy();
      expect(rhsCalled).toBeTruthy();
    }, [
      { op: 'and', lhs: true, rhs: true, result: true},
      { op: 'and', lhs: false, rhs: true, result: false},
      { op: 'and', lhs: true, rhs: false, result: false},
      { op: 'and', lhs: false, rhs: false, result: false},
      { op: 'or', lhs: false, rhs: false, result: false},
      { op: 'or', lhs: true, rhs: false, result: true},
      { op: 'or', lhs: false, rhs: true, result: true},
      { op: 'or', lhs: true, rhs: true, result: true}
    ]);
  });
});
