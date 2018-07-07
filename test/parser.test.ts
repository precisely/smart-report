import fs from 'fs';
import path from 'path';

import Parser, { DEFAULT_INTERPOLATION_POINT, ATTRIBUTE_RE } from '../src/parser';
import { markdownItEngine } from '../src/engines';
import { Interpolation, Element, ReducedAttribute } from '../src/types';
import { isArray } from 'util';

describe('Parser', function () {
  describe('constructor', function () {
    it('should set indentedMarkdown by default', function () {
      const parser = new Parser({ markdownEngine: () => null});
      expect(parser.indentedMarkdown).toBeTruthy();
    });

    it("should throw an error if markdownEngine isn't provided", function () {
      expect(() => new Parser({})).toThrow();
    });

    it('should take an interpolationPoint argument which sets the string for splitting text on interpolations', function () { // tslint:disable-line
      var parser = new Parser({ markdownEngine: () => null, interpolationPoint: 'abcdefg' });
      expect(parser.interpolationPoint).toEqual('abcdefg');
    });

    it('should generate a random interpolationPoint if none is given', function () {
      var parser1 = new Parser({ markdownEngine: () => null });
      var parser2 = new Parser({ markdownEngine: () => null });
      expect(parser1.interpolationPoint).toEqual(DEFAULT_INTERPOLATION_POINT);
      expect(parser2.interpolationPoint).toEqual(DEFAULT_INTERPOLATION_POINT);
    });
  });

  describe('ATTRIBUTE_RE', function () {
    // ATTRIBUTE_RE sanity check
    it('should parse a string attribute', function () {
      expect(ATTRIBUTE_RE.exec('a="str"')).toBeDefined();
    });

    it('should parse a float attribute', function () {
      expect(ATTRIBUTE_RE.exec('a=1.23')).toBeDefined();
    });

    it('should parse a bool', function () {
      expect(ATTRIBUTE_RE.exec('a')).toBeDefined();
    });

    it('should parse a bool assignment', function () {
      expect(ATTRIBUTE_RE.exec('a=true')).toBeDefined();
      expect(ATTRIBUTE_RE.exec('a=false')).toBeDefined();
    });

    it('should parse an interpolation', function () {
      expect(ATTRIBUTE_RE.exec('a={x}')).toBeDefined();
    });
  });

  describe('#parse', function () {
    var parse: (text: string | Buffer) => Element<Interpolation>[];
    beforeEach(function () {
      var parser = new Parser({ markdownEngine: markdownItEngine() });
      parse = function (text: string | Buffer) {
        return parser.parse(text);
      };
    });

    it('should parse a text block', function () {
      var elements: any = parse('Some text'); // tslint:disable-line
      expect(isArray(elements)).toBeTruthy();
      expect(elements).toHaveLength(1);
      expect(elements[0].type).toEqual('text');
      expect(elements[0].blocks).toEqual(['<p>Some text</p>']);
    });

    it('should parse recursive tags', function () {
      var elements: any = parse('<Outer a={ x.y }>\n' + // tslint:disable-line
        '  <Inner a=123>\n' +
        '  </Inner>\n' +
        '</Outer>');
      expect(isArray(elements)).toBeTruthy();
      expect(elements).toHaveLength(1);
      expect(elements[0].type).toEqual('tag');
      expect(elements[0].name).toEqual('outer');
      expect(elements[0].children).toHaveLength(1);
      expect(elements[0].children[0].name).toEqual('inner');
    });

    it('should parse tags with no spaces', function () {
      var elements: any = parse('<Outer><inner></inner></outer>'); // tslint:disable-line
      expect(isArray(elements)).toBeTruthy();
      expect(elements[0].name).toEqual('outer');
      expect(elements[0].children[0].name).toEqual('inner');
    });

    it('should correctly parse an interpolation followed by a tag', function () {
      var elements: any = parse('<Outer>{test}<inner></inner></outer>'); // tslint:disable-line
      expect(isArray(elements)).toBeTruthy();
      expect(elements[0].name).toEqual('outer');
      expect(elements[0].children[0].type).toEqual('text');
      expect(elements[0].children[1].name).toEqual('inner');
    });

    describe('indentation', function () {
      it('should treat indented markdown as a code block when indentedMarkdown=false', function () {
        var parser = new Parser({
          indentedMarkdown: false,
          markdownEngine: markdownItEngine()
        });
        var elements: any = parser.parse( // tslint:disable-line
          '    # Heading\n' +
          '    Some text\n'
        );

        expect(elements[0]).toEqual({
          type: 'text',
          blocks: ['<pre><code># Heading\nSome text\n</code></pre>'],
          reduced: false
        });
      });

      it('should not dedent markdown outside of a tag block, even when indentedMarkdown is true', function () {
        var parser = new Parser({
          indentedMarkdown: true,
          markdownEngine: markdownItEngine()
        });
        var elements: any = parser.parse( // tslint:disable-line
          '    # Heading\n' +
          '    Some text\n'
        );
        expect(elements[0]).toEqual({
          type: 'text',
          blocks: ['<pre><code># Heading\nSome text\n</code></pre>'],
          reduced: false
        });
      });

      it('should parse indented markdown in a tag body', function () {
        var parser = new Parser({
          indentedMarkdown: true,
          markdownEngine: markdownItEngine()
        });
        var elements: any = parser.parse( // tslint:disable-line
          '<mytag>\n' +
          '    # Heading\n' +
          '    Some text\n' +
          '</mytag>\n'
        );
        expect(elements[0].children).toEqual([
          {
            type: 'text',
            blocks: ['<h1>Heading</h1>\n<p>Some text</p>'],
            reduced: false
          }
        ]);
      });

      describe('when invalid indentation is encountered,', function () {

        it('should detect invalid indentation (if indentedMarkdown is true)', function () {
          var testFn: any; // tslint:disable-line
          var parser = new Parser({
            indentedMarkdown: true,             // TRUE
            markdownEngine: markdownItEngine()
          });

          testFn = () => parser.parse(
            '<mytag>\n' +
            '     # Here is some indented markdown\n' +
            '     with some valid text\n' +
            '    and some invalid dedented text\n' +
            '     and some valid indented text\n' +
            '</mytag>'
          );
          expect(testFn).toThrow('Bad indentation in text block at 2:1');
        });

        it('should ignore indentation if indentedMarkdown is false', function () {
          var testFn;
          var parser = new Parser({
            indentedMarkdown: false,            // FALSE
            markdownEngine: markdownItEngine()
          });

          testFn = () => parser.parse(
            '     # Here is some indented markdown\n' +
            '     with some valid text\n' +
            '   and some invalid dedented text' +
            '     and some valid indented text'
          );
          expect(testFn).not.toThrow();
        });
      });
    });

    describe('interpolation', function () {
      it('should parse interpolation with an accessor', function () {
        var elements: any = parse('{ someVar }'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].type).toEqual('text');
        expect(elements[0].blocks).toEqual([
          '<p>',
          { type: 'interpolation', expression: ['accessor', 'someVar'] },
          '</p>'
        ]);
      });

      it('should parse interpolation with scalar', function () {
        var elements: any = parse('{ "abc" }'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].type).toEqual('text');
        expect(elements[0].blocks).toEqual([
          '<p>',
          { type: 'interpolation', expression: ['scalar', 'abc'] },
          '</p>'
        ]);
      });

      it('should parse interpolation with a function call', function () {
        var elements: any = parse('{ foo("bar") }'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].type).toEqual('text');
        expect(elements[0].blocks).toEqual([
          '<p>',
          {
            type: 'interpolation',
            expression: ['funcall', 'foo', { lineNumber: 1, columnNumber: 7 }, ['scalar', 'bar']]
          },
          '</p>'
        ]);
      });

      it('should parse interpolation with a logic expression', function () {
        const elements: any = parse('{ foo("bar") and "hello" or x.y }'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].type).toEqual('text');
        const funcallBlock = elements[0].blocks[1];
        expect(funcallBlock.expression).toEqual([
          'and',
          ['funcall', 'foo', { lineNumber: 1, columnNumber: 7 }, ['scalar', 'bar']],
          ['or', ['scalar', 'hello'], ['accessor', 'x.y']]
        ]);
      });

      it('should parse interpolation in the midst of text', function () {
        const elements: any = parse('hello { x.y } sailor'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].type).toEqual('text');
        expect(elements[0].blocks).toEqual([
          '<p>hello ',
          { type: 'interpolation', expression: ['accessor', 'x.y'] },
          ' sailor</p>'
        ]);
      });

      it('should parse an interpolation group', function () {
        const elements: any = parse('hello { (x and y) or z } sailor'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].type).toEqual('text');
        expect(elements[0].blocks).toEqual([
          '<p>hello ',
          { type: 'interpolation',
            expression: ['or', ['and', ['accessor', 'x'], ['accessor', 'y']], ['accessor', 'z']]
          },
          ' sailor</p>'
        ]);
      });
    });

    describe('with bad input', function () {
      it("should throw an error if closing tag isn't present", function () {
        expect(() => parse('<outer><inner></inner>')).toThrow();
      });

      it('should throw an error if invalid closing tag is encountered', function () {
        expect(() => parse('<outer><inner></outer>')).toThrow();
      });

      it('should throw an error if an invalid attribute is given', function () {
        expect(() => parse('<tag a=1 b=[123]></tag>')).toThrow();
        expect(() => parse("<tag a=1 b='123'></tag>")).toThrow();
      });

      it('should throw an error if an attribute interpolation is unclosed', function () {
        expect(() => parse('<tag a={></tag>')).toThrow();
      });

      it('should throw an error if the tag end brace is missing', function () {
        expect(() => parse('<tag</tag>')).toThrow();
      });
    });

    describe('with complex input', function () {
      var parseResult: any; // tslint:disable-line
      beforeEach(function () {
        const example = fs.readFileSync(path.join(__dirname, 'example.md'));
        parseResult = parse(example);
      });

      it('should return an array containing objects representing the parsed HTML tree', function () {
        expect(isArray(parseResult)).toBeTruthy();
        expect(parseResult).toHaveLength(5);
      });

      it('should interpolate into markdown', function () {
        expect(parseResult[0].type).toEqual('text');
        expect(parseResult[0].blocks).toEqual([
          '<h1>heading1</h1>\n<p>Text after and interpolation ',
          { type: 'interpolation', expression: ['accessor', 'x.y'] },
          ' heading1</p>'
        ]);
      });

      it('should parse a tag within markdown', function () {
        expect(parseResult[1].type).toEqual('tag');
        expect(parseResult[1].name).toEqual('div');
        expect(parseResult[1].children).toHaveLength(1);
      });

      it('should parse a self closing tag', function () {
        expect(parseResult[2].type).toEqual('tag');
        expect(parseResult[2].name).toEqual('selfclosing');
      });

      describe('while parsing a component with each type of attribute', function () {
        let attrs: any; // tslint:disable-line

        beforeEach(function () {
          attrs = parseResult[4].attrs;
        });

        it('should parse the element correctly, providing type, name, children and attributes', function () {
          expect(parseResult[4].type).toEqual('tag');
          expect(parseResult[4].name).toEqual('mycomponent');
          expect(parseResult[4].attrs).toBeDefined();
          expect(parseResult[4].children).toHaveLength(2);
        });

        it('should parse a number attribute correctly', function () {
          expect(typeof attrs.a).toBe('number');
          expect(attrs.a).toEqual(1);
        });

        it('should parse a string correctly', function () {
          expect(attrs.b).toEqual('string');
        });

        it('should parse an interpolation correctly', function () {
          expect(attrs.c).toEqual({
            type: 'interpolation',
            expression: ['accessor', 'x.y']
          });
        });

        it('should parse an unassigned attribute as boolean true', function () {
          expect(attrs.d).toEqual(true);
        });

        it('should parse an true assignment correctly', function () {
          expect(attrs.e).toEqual(true);
        });

        it('should parse a false assignment correctly', function () {
          expect(attrs.f).toEqual(false);
        });
      });

      it('should handle curly and angle escapes', function () {
        expect(parseResult[4].children[0]).toEqual({
          type: 'text',
          blocks: [
            '<p>Text inside MyComponent\n' +
            'With escaped chars: { &lt; } &gt;</p>\n' +
            '<ul>\n' +
            '<li>listElt1</li>\n' +
            '<li>listElt2</li>\n' +
            '</ul>'
          ],
          reduced: false
        });
        expect(parseResult[4].children[1].type).toEqual('tag');
        expect(parseResult[4].children[1].name).toEqual('subcomponent');
      });
    });
  });
});
