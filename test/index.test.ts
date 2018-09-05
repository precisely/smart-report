import { toHTML } from '../src';
import { evilStreakMarkdownEngine, showdownEngine } from '../src/engines';
import { Props, RenderingFunction } from '../src/types';

describe('toHTML', function() {
  const components = {
    SimpleComponent: function({ __children, a }: Props, render: RenderingFunction) {
      render('<div class="simple-component">');
      render(`a=${a}:${typeof a}\n`);
      render(__children);
      render('</div>');
    }
  };

  it('should create HTML in one step with evilStreakEngine', function() {
    const {html, errors} = toHTML({
      input:
        '<SimpleComponent a={ x.y }>\n' +
        '  <SimpleComponent a=123>\n' +
        '# Heading with interpolation - { x.y }\n' +
        '  </SimpleComponent>\n' +
        '</SimpleComponent>',
      components: components,
      markdownEngine: evilStreakMarkdownEngine(),
      context: { x: { y: 'hello' }}
    });

    expect(errors).toHaveLength(0);
    expect(typeof html).toBe('string');
    expect(html).toEqual(expect.stringContaining('a=hello:string'));
    expect(html).toEqual(expect.stringContaining('a=123:number'));
    expect(html).toEqual(expect.stringContaining('<h1>Heading with interpolation - hello</h1>'));
  });

  it('should create HTML in one step with showdownEngine', function () {
    const {html, errors} = toHTML({
      input:
        '<SimpleComponent a={ x.y }>\n' +
        '  <SimpleComponent a=123>\n' +
        '# Heading with interpolation - { x.y }\n' +
        '  </SimpleComponent>\n' +
        '</SimpleComponent>',
      components: components,
      markdownEngine: showdownEngine(),
      context: { x: { y: 'hello' }}
    });
    
    expect(errors).toHaveLength(0);
    expect(typeof html).toBe('string');
    expect(html).toEqual(expect.stringContaining('a=hello:string'));
    expect(html).toEqual(expect.stringContaining('a=123:number'));
    expect(html).toEqual(expect.stringContaining('<h1>Heading with interpolation - hello</h1>'));
  });
});
