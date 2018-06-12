import Reducer from '../src/reducer';
import { TagElement, Interpolation } from '../src/types';

describe('Reducer', function () {
  it('should render a simple tag element without interpolations as itself', function () {
    const reducer = new Reducer({});
    const tag: TagElement<Interpolation> = {
      type: 'tag',
      name: 'foo',
      rawName: 'Foo',
      attrs: { a: 1, b: "bar" },
      children: [],
      reduced: false
    };
    expect(reducer.reduce(tag, {})).toEqual(tag);
  });
});