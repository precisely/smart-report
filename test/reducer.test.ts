import cases from 'jest-in-case';
import Reducer, { removeTags } from '../src/reducer';
import {
  Hash, InterpolationFunction,
  Element, Attributes, Interpolation, Context,
  TextElement, ReducibleTextElement, isTagElement, ReducibleTagElement
} from '../src/types';

describe('Reducer', function () {
  describe('#reduce', function () {
    it('should return a simple tag element without interpolations, with reduced flag set', function () {
      const reducer = new Reducer({});
      const tag: ReducibleTagElement = {
        type: 'tag',
        name: 'foo',
        rawName: 'Foo',
        attrs: { a: 1, b: 'bar' },
        children: [],
        reduced: false
      };
      const expectedTag = {
        ...tag,
        reduced: true
      };
      expect(reducer.reduce([tag], {})).toEqual([expectedTag]);
    });

    cases('should evaluate unreachable logic in analysis mode', ({op, rhs, lhs, result}) => {
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
      const reducer = new Reducer({functions, analysisMode: true});
      const textElement: ReducibleTextElement = {
        type: 'text',
        blocks: [{
          type: 'interpolation',
          expression: expression
        }],
        reduced: false
      };
      const evaluationResult = reducer.reduce([textElement], {});
      expect(evaluationResult).toEqual([{
        type: 'text',
        blocks: [`${result}`],
        reduced: true
      }]);
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

    it('should throw an error if an invalid argument is provided', function () {
      const reducer = new Reducer({});
      const tag: any = 'invalid element'; // tslint:disable-line
      expect(() => reducer.reduce([tag], {})).toThrow();
    });

    it('should not process strings in text blocks', function () {
      const reducer = new Reducer({});
      const tag: ReducibleTextElement = {
        type: 'text',
        blocks: ['hello, ', 'sailor'],
        reduced: false
      };
      expect(reducer.reduce([tag], {})).toEqual([{
        type: 'text',
        blocks: ['hello, ', 'sailor'],
        reduced: true
      }]);
    });

    it('should evaluate interpolated attributes', function () {
      const reducer = new Reducer({});
      const tag: ReducibleTagElement = {
        type: 'tag',
        name: 'foo',
        rawName: 'Foo',
        attrs: { a: 1, b: { type: 'interpolation', expression: ['accessor', 'bar.baz'] }},
        children: [],
        reduced: false
      };
      const context = { bar: { baz: 'interpolatedValue' }};
      const expectedTag = {
        ...tag,
        attrs: { a: 1, b: 'interpolatedValue' },
        reduced: true
      };
      expect(reducer.reduce([tag], context)).toEqual([expectedTag]);
    });

    describe('when tag removes children based on an attribute, and the child is an interpolation expr,', function () {

      // this is an integration test showing the complex case where a
      it('should reduce the expression tag reduction', function () {
        const childElement: ReducibleTagElement = {
          type: 'tag',
          name: 'child',
          rawName: 'Child',
          attrs: { shouldRemove: { type: 'interpolation', expression: ['accessor', 'removeIt'] }},
          children: [],
          reduced: false
        };
        const tag: ReducibleTagElement = {
          type: 'tag',
          name: 'foo',
          rawName: 'Foo',
          attrs: {},
          children: [ childElement ],
          reduced: false
        };

        const reducer = new Reducer({
          components: {
            Foo(elt: ReducibleTagElement, ctx: Context) {
              const reducedChildren = elt.children.filter(child => {
                return !isTagElement(child) || child.name !== 'child' || !child.attrs.shouldRemove;
              });
              return [reducedChildren, ctx];
            }
          }
        });

        // when context contains value which
        expect(reducer.reduce([tag], {removeIt: true})).toEqual([{
          ...tag,
          children: [],
          reduced: true
        }]);

        expect(reducer.reduce([tag], {removeIt: false})).toEqual([{
          ...tag,
          children: [{
            ...childElement,
            attrs: { shouldRemove: false },
            reduced: true
          }],
          reduced: true
        }]);
      });
    });

    it('should return reduced child tags', function () {
      const reducer = new Reducer({});
      const childElement: ReducibleTagElement = {
        type: 'tag',
        name: 'bar',
        rawName: 'Bar',
        attrs: { a: 1, b: { type: 'interpolation', expression: ['accessor', 'bar.baz'] }},
        children: [],
        reduced: false
      };
      const tag: ReducibleTagElement = {
        type: 'tag',
        name: 'foo',
        rawName: 'Foo',
        attrs: { },
        children: [ childElement ],
        reduced: false
      };
      const context = { bar: { baz: 'interpolatedValue' }};
      const expectedTag = {
        ...tag,
        children: [
          { ...childElement,
            attrs: { a: 1, b: 'interpolatedValue' },
            reduced: true
          }
        ],
        reduced: true
      };
      expect(reducer.reduce([tag], context)).toEqual([expectedTag]);
    });

    const makeTag = (name: string, reduced: boolean, children: Element<Interpolation>[]): ReducibleTagElement => ({
      type: 'tag', name: name.toLowerCase(), rawName: name,
      attrs: {}, children: children, reduced
    });

    it('should allow the reducer component to remove children', function () {

      const tag = makeTag('IgnoreChildren', false, [
        makeTag('Bar', false, []),
        makeTag('Baz', false, []),
      ]);
      const reducer = new Reducer({
        components: {
          IgnoreChildren(elt: ReducibleTagElement, context: Context) {
            return [[], context];
          }
      }});

      expect(reducer.reduce([tag], {})).toEqual([makeTag('IgnoreChildren', true, [])]);
    });

    it('should allow the reducer component to add children which will be subject to reduction', function () {

      const tag = makeTag('AddChildren', false, []);
      const reducer = new Reducer({
        components: {
          AddChildren(elt: ReducibleTagElement, context: Context) {
            const newChildren = [makeTag('Bar', false, []), makeTag('Baz', false, [])];
            return [newChildren, context];
          }
      }});

      expect(reducer.reduce([tag], {})).toEqual([
        makeTag('AddChildren', true, [
          // reduced tag will contain the new, reduced children:
          makeTag('Bar', true, []),
          makeTag('Baz', true, [])
        ])
      ]);
    });

    it('should html encode interpolated strings', function () {
      const reducer = new Reducer({});
      const textElement: TextElement<Interpolation> = {
        type: 'text',
        blocks: [{
          type: 'interpolation',
          expression: ['scalar', '<script>nastyExploit();</script>']
        }],
        reduced: false
      };
      expect(reducer.reduce([textElement], {})).toEqual([
        {
          type: 'text',
          blocks: [ '&lt;script&gt;nastyExploit();&lt;/script&gt;'],
          reduced: true
        }
      ]);
    });

    cases('should stringify any other object that appears in an interpolation, except for nulls', ({value, blocks}) => {
      const reducer = new Reducer({});
      const textElement: TextElement<Interpolation> = {
        type: 'text',
        blocks: [{
          type: 'interpolation',
          expression: ['scalar', value ]
        }],
        reduced: false
      };
      expect(reducer.reduce([textElement], {})).toEqual([{
        type: 'text',
        blocks: blocks,
        reduced: true
      }]);

    }, [
      { value: true, blocks: ['true'] },
      { value: 123, blocks: ['123'] },
      { value: [123, 234], blocks: ['123,234'] },
      { value: { a: 1, b: 'foo', c: {d: 1}}, blocks: ['[object Object]'] },
      { value: null, blocks: [] }
    ]);
  });
});

describe('reduceTags', function () {
  const yesChild: ReducibleTagElement = {
    type: 'tag', name: 'yesChild', rawName: 'YesChild', children: [], reduced: false, attrs: { val: 'yes' }
  };
  const noChild: ReducibleTagElement = {
    type: 'tag', name: 'noChild', rawName: 'NoChild', children: [], reduced: false, attrs: { val: 'no' }
  };
  const textChild: ReducibleTextElement = {
    type: 'text', blocks: [], reduced: false
  };

  it('should remove children with attributes that match a predicate', function () {
    expect(removeTags([yesChild], ({val}: Attributes) => {
      return val === 'yes';
    })).toEqual([]);
    expect(removeTags([noChild], ({val}: Attributes) => {
      return val === 'no';
    })).toEqual([]);
  });
  it("should not remove children with attributes that don't match a predicate", function () {
    expect(removeTags([yesChild, noChild], ({val}: Attributes) => {
      return val === 'yes';
    })).toEqual([noChild]);
  });

  it('should preserve non-tag elements', function () {
    expect(removeTags([yesChild, textChild, noChild], ({val}: Attributes) => {
      return true;
    })).toEqual([textChild]);
  });

  it('should provide the name as __name in the attributes', function () {
    const names = [];
    removeTags([yesChild, textChild, noChild], ({__name}: Attributes) => {
      names.push(__name);
      return true;
    });
    expect(names).toEqual(['yesChild', 'noChild']);
  });
});
