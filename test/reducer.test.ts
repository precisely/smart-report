import Reducer from '../src/reducer';
import { Element, ReducibleTagElement, Interpolation, Attribute, Context } from '../src/types';

describe('Reducer', function () {
  describe('#reduce', function () {
    it('should return a simple tag element without interpolations, with reduced flag set', function () {
      const reducer = new Reducer({});
      const tag: ReducibleTagElement = {
        type: 'tag',
        name: 'foo',
        rawName: 'Foo',
        attrs: { a: 1, b: "bar" },
        children: [],
        reduced: false
      };
      const expectedTag = {
        ...tag,
        reduced: true
      };
      expect(reducer.reduce([tag], {})).toEqual([expectedTag]);
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
          IgnoreChildren(tag: ReducibleTagElement, context: Context) {
            return [[], context];
          }
      }});

      expect(reducer.reduce([tag], {})).toEqual([makeTag('IgnoreChildren', true, [])]);
    });

    it('should allow the reducer component to add children which will be subject to reduction', function () {

      const tag = makeTag('AddChildren', false, []);
      const reducer = new Reducer({
        components: {
          AddChildren(tag: ReducibleTagElement, context: Context) {
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
  });
});