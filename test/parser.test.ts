// tslint:disable no-any
import fs from 'fs';
import path from 'path';

import Parser, { DEFAULT_INTERPOLATION_POINT, ATTRIBUTE_RE } from '../src/parser';
import { markdownItEngine } from '../src/engines';
import { Interpolation, Element } from '../src/types';
import { isArray } from 'util';
import { ParserError } from '../src/parser';
import cases = require('jest-in-case');
import { ErrorType } from '../src/error';
const permutation = require('array-permutation');

describe('Parser', function () {
  describe('constructor', function () {
    it('should set indentedMarkdown by default', function () {
      const parser = new Parser({ markdownEngine: () => null});
      expect(parser.indentedMarkdown).toBeTruthy();
    });

    it("should throw an error if markdownEngine isn't provided", function () {
      expect(() => new Parser({})).toThrow();
      expect(() => new Parser({})).toThrow();
    });

    it('should set interpolationPoint for splitting text on interpolations', function () { 
      var parser = new Parser({ markdownEngine: () => null, interpolationPoint: 'abcdefg' });
      expect(parser.interpolationPoint).toEqual('abcdefg');
    });

    it('should generate a random interpolationPoint if none is given', function () {
      var parser1 = new Parser({ markdownEngine: () => null });
      var parser2 = new Parser({ markdownEngine: () => null });
      expect(parser1.interpolationPoint).toEqual(DEFAULT_INTERPOLATION_POINT);
      expect(parser2.interpolationPoint).toEqual(DEFAULT_INTERPOLATION_POINT);
    });

    describe('allowedTags', function () {

      it('should not produce errors if an allowed tag is encountered', function () {
        var parser = new Parser({ 
          markdownEngine: markdownItEngine(),
          allowedTags: ['Foo', 'bar']
        });
        expect(parser.parse('<Foo>bar</Foo>').errors).toHaveLength(0);
        expect(parser.parse('<foo>bar</foo>').errors).toHaveLength(0);
        expect(parser.parse('<Bar/>').errors).toHaveLength(0);
        expect(parser.parse('<bar/>').errors).toHaveLength(0);
      });

      it('should produce an error if allowedTags is defined, but an unrecognized tag is encountered', function () {
        var parser = new Parser({ 
          markdownEngine: markdownItEngine(),
          allowedTags: []

        });
        expect(parser.parse('<Foo>bar</Foo>').errors).toHaveLength(1);
      });
    });

    describe('allowedFunctions', function () {

      it('should not produce errors if an allowed function is encountered', function () {
        var parser = new Parser({ 
          markdownEngine: markdownItEngine(),
          allowedFunctions: ['valid']
        });
        expect(parser.parse('This is an allowed function { valid() }').errors).toHaveLength(0);
      });

      it('should not produce errors if a function is encountered and allowedFunctions is undefined', function () {
        var parser = new Parser({ 
          markdownEngine: markdownItEngine()
        });
        expect(parser.parse('And function is allowed { foo() }').errors).toHaveLength(0);
      });

      it('should produce an error if allowedFunctions is defined, but an unrecognized tag is encountered', function () {
        var parser = new Parser({ 
          markdownEngine: markdownItEngine(),
          allowedFunctions: []

        });
        expect(parser.parse('This is a disallowed function { foo() }').errors).toHaveLength(1);
      });
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
    var parse: (text: string | Buffer) => { elements: Element<Interpolation>[], errors: ParserError[]};
    beforeEach(function () {
      var parser = new Parser({ markdownEngine: markdownItEngine() });
      parse = function (text: string | Buffer) {
        return parser.parse(text);
      };
    });

    describe('attributes', function () {
      it('should parse a string attribute', function () {
        const {elements, errors} = parse(`<MyTag a="foo"></MyTag>`);
        expect(errors).toHaveLength(0);
        expect(elements).toHaveLength(1);
        expect(elements[0]).toMatchObject({
          type: 'tag',
          attrs: {
            a: 'foo'
          }
        });
      });

      it('should parse numbers', function () {
        const {elements, errors} = parse(`<MyTag a=123 b=3.456></MyTag>`);
        expect(errors).toHaveLength(0);
        expect(elements).toHaveLength(1);
        expect(elements[0]).toMatchObject({
          type: 'tag',
          attrs: {
            a: 123,
            b: 3.456
          }
        });
      });

      it('should parse interpolation attributes', function () {
        const {elements, errors} = parse(`<MyTag a={ x }></MyTag>`);
        expect(errors).toHaveLength(0);
        expect(elements).toHaveLength(1);
        expect(elements[0]).toMatchObject({
          type: 'tag',
          attrs: {
            a: { type: 'interpolation' }
          }
        });
      });

      it('should parse explicit boolean attributes', function () {
        const {elements, errors} = parse(`<MyTag a=true b=false></MyTag>`);
        expect(errors).toHaveLength(0);
        expect(elements).toHaveLength(1);
        expect(elements[0]).toMatchObject({
          type: 'tag',
          attrs: {
            a: true,
            b: false
          }
        });
      });

      it('should parse implicit boolean attributes', function () {
        const {elements, errors} = parse(`<MyTag a></MyTag>`);
        expect(errors).toHaveLength(0);
        expect(elements).toHaveLength(1);
        expect(elements[0]).toMatchObject({
          type: 'tag',
          attrs: {
            a: true
          }
        });
      });

      it('should parse implicit boolean attributes before other attributes', function () {
        const {elements, errors} = parse(`<MyTag a b=1></MyTag>`);
        expect(errors).toHaveLength(0);
        expect(elements).toHaveLength(1);
        expect(elements[0]).toMatchObject({
          type: 'tag',
          attrs: {
            a: true,
            b: 1
          }
        });
      });

      it('should parse attributes containing new lines', function () {
        const {elements, errors} = parse(`<MyTag a=1 \n b=2 \n c="foo" \n></MyTag>`);
        expect(errors).toHaveLength(0);
        expect(elements).toHaveLength(1); 
        expect(elements[0]).toMatchObject({
          attrs: {
            a: 1,
            b: 2,
            c: 'foo'
          }
        });
      });

      cases('should parse attributes in any order', (attribs: string[]) => {
        const attributeInsert = attribs.join(' ');
        const {elements, errors} = parse(`<MyTag ${attributeInsert}></MyTag>`);
        expect(errors).toHaveLength(0);
        expect(elements).toHaveLength(1);
        expect(elements[0]).toMatchObject({
          type: 'tag',
          attrs: {
            a: 1,
            b: 'string',
            c: { type: 'interpolation' },
            d: true,
            e: true
          }
        });
      }, Array.from(permutation(['a=1', 'b="string"', '\n', 'c={ x.y }', 'd', 'e=true'])));

      it('should parse attributes containing errors', () => {
        const {elements, errors} = parse('<MyTag a="valid" b=123 err2| err1=[123]></MyTag>');
        expect(errors).toHaveLength(2);
        expect(elements).toHaveLength(1);
        expect(elements[0]).toMatchObject({
          type: 'tag'
        });
      });

      cases('should parse many attributes containing errors in any order', (attribs: string[]) => {
        // const attribs = ['a="valid"', 'b=123', 'err1=[123]', 'err2|' ];
        const attributeInsert = attribs.join(' ');
        const {elements, errors} = parse(`<MyTag ${attributeInsert}></MyTag>`);
        expect(errors).toHaveLength(2);
        expect(elements).toHaveLength(1);
        expect(elements[0]).toMatchObject({
          type: 'tag'
        });
      }, 
      Array.from(permutation(['a="valid"', 'b=123', 'err1=[123]', 'err2|' ])));
    });

    describe('core elements', function () {
        
      it('should parse a text block', function () {
        var { elements, errors }: { elements: any, errors: ParserError[]} = parse('Some text'); 
        expect(isArray(elements)).toBeTruthy();
        expect(elements).toHaveLength(1);
        expect(elements[0].type).toEqual('text');
        expect(elements[0].blocks).toEqual(['<p>Some text</p>']);
        expect(errors).toHaveLength(0);
      });

      it('should parse recursive tags', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('<Outer a={ x.y }>\n' + 
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
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('<Outer><inner></inner></outer>'); 
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].name).toEqual('outer');
        expect(elements[0].children[0].name).toEqual('inner');
      });

      it('should correctly parse an interpolation followed by a tag', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } 
          = parse('<Outer>{test}<inner></inner></outer>');
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].name).toEqual('outer');
        expect(elements[0].children[0].type).toEqual('text');
        expect(elements[0].children[1].name).toEqual('inner');
      });
    });

    describe('indentation', function () {
      it('should treat indented markdown as a code block when indentedMarkdown=false', function () {
        var parser = new Parser({
          indentedMarkdown: false,
          markdownEngine: markdownItEngine()
        });
        var { elements, errors }: { elements: any, errors: ParserError[] } = parser.parse( // tslint:disable-line
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
        var { elements, errors }: { elements: any, errors: ParserError[] } = parser.parse( // tslint:disable-line
          '    # Heading\n' +
          '    Some text\n'
        );
        
        expect(errors).toHaveLength(0);
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
        var { elements, errors }: { elements: any, errors: ParserError[] } = parser.parse( // tslint:disable-line
          '<mytag>\n' +
          '    # Heading\n' +
          '    Some text\n' +
          '</mytag>\n'
        );
        expect(errors).toHaveLength(0);
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

          const {errors} = parser.parse(
            '<mytag>\n' +
            '     # Here is some indented markdown\n' +
            '     with some valid text\n' +
            '    and some invalid dedented text\n' +
            '     and some valid indented text\n' +
            '</mytag>'
          );
          expect(errors).toHaveLength(1);
        });

        it('should ignore indentation if indentedMarkdown is false', function () {
          var testFn;
          var parser = new Parser({
            indentedMarkdown: false,            // FALSE
            markdownEngine: markdownItEngine()
          });

          const {elements, errors} = parser.parse(
            '     # Here is some indented markdown\n' +
            '     with some valid text\n' +
            '   and some invalid dedented text' +
            '     and some valid indented text'
          );
          expect(errors).toHaveLength(0);
          expect(elements).toHaveLength(1);
          expect(elements[0]).toMatchObject({
            type: 'text'
          });
        });
      });
    });

    describe('interpolation', function () {
      it('should parse interpolation with an accessor', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('{ someVar }'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].type).toEqual('text');
        expect(elements[0].blocks).toEqual([
          '<p>',
          { type: 'interpolation', expression: ['accessor', 'someVar'] },
          '</p>'
        ]);
      });

      it('should parse interpolation with scalar', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('{ "abc" }'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].type).toEqual('text');
        expect(elements[0].blocks).toEqual([
          '<p>',
          { type: 'interpolation', expression: ['scalar', 'abc'] },
          '</p>'
        ]);
      });

      it('should parse interpolation with a function call', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('{ foo("bar") }'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
        expect(errors).toHaveLength(0);
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
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('{ foo("bar") and "hello" or x.y }'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].type).toEqual('text');
        const funcallBlock = elements[0].blocks[1];
        expect(funcallBlock.expression).toEqual([
          'and',
          ['funcall', 'foo', { lineNumber: 1, columnNumber: 7 }, ['scalar', 'bar']],
          ['or', ['scalar', 'hello'], ['accessor', 'x.y']]
        ]);
      });

      it('should parse interpolation with a logic expression in uppercase', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('{ foo("bar") AND "hello" OR x.y }'); // tslint:disable-line
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
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('hello { x.y } sailor'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
        expect(elements[0].type).toEqual('text');
        expect(elements[0].blocks).toEqual([
          '<p>hello ',
          { type: 'interpolation', expression: ['accessor', 'x.y'] },
          ' sailor</p>'
        ]);
      });

      it('should parse an interpolation group', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('hello { (x and y) or z } sailor'); // tslint:disable-line
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

      it('should parse multiline interpolation logic', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('hello { (x\n and\n y\n) or\n z\n } sailor'); // tslint:disable-line
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

      it('should parse tags with interpolation functions which contain terminator characters', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('<MyTag val={ foo("hello>") }></MyTag>'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
      });

      it('should parse tags with interpolation functions which contain terminator characters', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('<MyTag val={ foo("hello>") }></MyTag>'); // tslint:disable-line
        expect(isArray(elements)).toBeTruthy();
      });

      it('should parse tags within tags with functions which contain args with terminator characters', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } 
          = parse('<AnalysisBox><Analysis case={ variant("chr1:10A>T") }></Analysis></AnalysisBox>'); 
        expect(isArray(elements)).toBeTruthy();
      });
    });

    describe('comments', function () {
      it('should ignore comments at the beginning of text', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('<# ignored #>hello sailor'); 
        expect(errors).toHaveLength(0);
        expect(elements).toEqual([{
          type: 'text',
          blocks: [ '<p>hello sailor</p>' ],
          reduced: false
        }]);
      });

      it('should ignore multiline comments', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse(
          '<# \nignored\nignored \nignored\n #>hello sailor'
        ); 
        expect(errors).toHaveLength(0);
        expect(elements).toEqual([{
          type: 'text',
          blocks: [ '<p>hello sailor</p>' ],
          reduced: false
        }]);
      });

      it('should ignore multiline indented comments', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse(
          '<foo>\n   <# \nignored\nignored \nignored\n #>\n   hello sailor</foo>'
        ); 
        expect(errors).toHaveLength(0);
        expect(elements).toEqual([{
          type: 'tag',
          name: 'foo',
          attrs: {},
          rawName: 'foo',
          children: [{
            type: 'text',
            blocks: [ '<p>hello sailor</p>' ],
            reduced: false
          }],
          reduced: false,
          selfClosing: false
        }]);
      });

      it('should ignore comments at the end of text', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('hello sailor<# ignored #>'); 
        expect(elements).toEqual([{
          type: 'text',
          blocks: [ '<p>hello sailor</p>' ],
          reduced: false
        }]);
      });
      
      it('should ignore comments in the middle of text', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('hello<# ignored #> sailor'); 
        expect(elements).toEqual([{
          type: 'text',
          blocks: [ '<p>hello sailor</p>' ],
          reduced: false
        }]);
      });

      it('should ignore comments between tags', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } = parse('<div>  <# ignored #>  </div>'); 
        expect(elements).toEqual([{
          type: 'tag',
          name: 'div',
          attrs: {},
          rawName: 'div',
          children: [],
          reduced: false,
          selfClosing: false
        }]);
      });
      
      it('should be able to handle a multiline comment', function () {
        var { elements, errors }: { elements: any, errors: ParserError[] } 
          = parse('<div><# ignored\n   ignored\n   ignored\n #></div>'); 
        expect(elements).toEqual([{
          type: 'tag',
          name: 'div',
          attrs: {},
          rawName: 'div',
          children: [],
          reduced: false,
          selfClosing: false
        }]);
      });
    });

    describe('with bad input', function () {

      describe('during interpolation', function () {
        it('should return an error if a tag start (<) appears ', function () {
          expect(parse('First Line OK\n12345{<}This is text after the error').errors).toHaveLength(1);
        });
        
        it('should return an error if a tag end (>) appears', function () {
          expect(parse('First Line OK\n12345{a.b < d a>}This is text after the error').errors).toHaveLength(1);
        });

        it('should fail when extra braces', function () {
          expect(parse('First Line OK\n12345{ {d} >}This is text after the error').errors).not.toHaveLength(0);
        });
        
      });
      
      it("should throw an error if closing tag isn't present", function () {
        expect(parse('<outer><inner></inner>').errors).not.toHaveLength(0);
      });

      it('should throw an error if invalid closing tag is encountered', function () {
        expect(parse('<outer><inner></outer>').errors).not.toHaveLength(0);
      });

      it('should throw an error if an invalid attribute is given', function () {
        expect(true).toBeTruthy();
        expect(parse('<tag a=1 b=[123]></tag>').errors).not.toHaveLength(0);
        expect(parse("<tag a=1 b='123'></tag>").errors).not.toHaveLength(0);
      });

      it('should throw an error if an attribute interpolation is unclosed', function () {
        expect(parse('<tag a={></tag>').errors).not.toHaveLength(0);
      });

      it('should throw an error if the tag end brace is missing', function () {
        expect(parse('<tag</tag>').errors).not.toHaveLength(0);
      });

      it('should throw an error if an incomplete end tag is encountered', function () {
        expect(parse('</').errors).not.toHaveLength(0);
      });

      it('should throw an error if an incomplete end tag is encountered', function () {
        expect(parse('<tag></></tag>').errors).not.toHaveLength(0);
      });

      it('should throw an error if an empty tag is encounter', function () {
        expect(parse('<>').errors).not.toHaveLength(0);
      });

      it('should throw an error if closing tag is encountered with non-word characters', function () {
        expect(parse('</ >').errors).not.toHaveLength(0);
      });

      it('should throw an error if closing tag with non-word characters is encountered', function () {
        expect(parse('<\t>').errors).not.toHaveLength(0);
        expect(parse('<  >').errors).not.toHaveLength(0);
      });

      it('should throw an error if unbalanced comment syntax is encountered', function () {
        expect(parse('Here is some text <# unclosed comment ooops!').errors).not.toHaveLength(0);
      });
    });

    describe('with complex input', function () {
      var elements: any; // tslint:disable-line
      var errors: ParserError[];
      beforeEach(function () {
        const example = fs.readFileSync(path.join(__dirname, 'example.md'));
        const parseResult = parse(example);
        elements = parseResult.elements;
        errors = parseResult.errors;
      });

      it('should have no errors', function () {
        expect(errors).toHaveLength(0);
      });

      it('should return an array containing objects representing the parsed HTML tree', function () {
        expect(isArray(elements)).toBeTruthy();
        expect(elements).toHaveLength(5);
      });

      it('should interpolate into markdown', function () {
        expect(elements[0].type).toEqual('text');
        expect(elements[0].blocks).toEqual([
          '<h1>heading1</h1>\n<p>Text after an interpolation ',
          { type: 'interpolation', expression: ['accessor', 'x.y'] },
          ' heading1</p>'
        ]);
      });

      it('should parse a tag within markdown', function () {
        expect(elements[1].type).toEqual('tag');
        expect(elements[1].name).toEqual('div');
        expect(elements[1].children).toHaveLength(1);
      });

      it('should parse a self closing tag', function () {
        expect(elements[2].type).toEqual('tag');
        expect(elements[2].name).toEqual('selfclosing');
      });

      describe('while parsing a component with each type of attribute', function () {
        let attrs: any; // tslint:disable-line

        beforeEach(function () {
          attrs = elements[4].attrs;
        });

        it('should parse the element correctly, providing type, name, children and attributes', function () {
          expect(elements[4].type).toEqual('tag');
          expect(elements[4].name).toEqual('mycomponent');
          expect(elements[4].attrs).toBeDefined();
          expect(elements[4].children).toHaveLength(2);
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
        expect(elements[4].children[0]).toEqual({
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
        expect(elements[4].children[1].type).toEqual('tag');
        expect(elements[4].children[1].name).toEqual('subcomponent');
      });
    });

    describe('with multiple errors', function () {
      var elements, errors;

      beforeEach(() => {
        const example = fs.readFileSync(path.join(__dirname, 'errors.md'));
        const result = parse(example);
        elements = result.elements;
        errors = result.errors;
      });
      it('should parse elements', function () {
        expect(elements).toHaveLength(3);
      });

      it('should detect the bad indentation', function () {
        const detected = errors.filter(e => e.type === ErrorType.BadIndentation);
        expect(detected).toHaveLength(1);
        expect(detected[0].location.lineNumber).toEqual(5);
      });

      it('should detect invalid expression', function () {
        const detected = errors.filter(e => e.type === ErrorType.InvalidExpression);
        expect(detected).not.toHaveLength(0);
        expect(detected[0].location.lineNumber).toEqual(6);
      });
      it('should detect an invalid attribute', function () {
        const detected = errors.filter(e => e.type === ErrorType.InvalidAttribute);
        expect(detected).toHaveLength(1);
        expect(detected[0].location.lineNumber).toEqual(7);
      });

      it('should detect an a non-closing tag', function () {
        const detected = errors.filter(e => e.type === ErrorType.NoClosingTag);
        expect(detected).toHaveLength(1);
        expect(detected[0].location.lineNumber).toEqual(9);
      });

      it('should detect an a non-closing comment', function () {
        const detected = errors.filter(e => e.type === ErrorType.NoClosingComment);
        expect(detected).toHaveLength(1);
        expect(detected[0].location.lineNumber).toEqual(10);
      });
    });
  });

  describe('real world test', function () {
    it('should read real world input', function () {
      const example = fs.readFileSync(path.join(__dirname, 'realworld.md'));
      const parser = new Parser({ markdownEngine: markdownItEngine() });
      const parseResult = parser.parse(example);
      const elements = parseResult.elements;
      const errors = parseResult.errors;
      expect(errors).toHaveLength(0);
    });    
  });
});
