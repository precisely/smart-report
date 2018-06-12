"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var parser_1 = __importStar(require("../src/parser"));
var engines_1 = require("../src/engines");
var jest_tobetype_1 = __importDefault(require("jest-tobetype"));
expect.extend(jest_tobetype_1.default);
describe('Parser', function () {
    describe('constructor', function () {
        it("should throw an error if markdownEngine isn't provided", function () {
            expect(function () { return new parser_1.default({}); }).toThrow();
        });
        it('should take an interpolationPoint argument which sets the string for splitting text on interpolations', function () {
            var parser = new parser_1.default({ markdownEngine: function () { }, interpolationPoint: 'abcdefg' });
            expect(parser._interpolationPoint).toEqual('abcdefg');
        });
        it('should generate a random interpolationPoint if none is given', function () {
            var parser1 = new parser_1.default({ markdownEngine: function () { } });
            var parser2 = new parser_1.default({ markdownEngine: function () { } });
            expect(parser1._interpolationPoint).toEqual(parser_1.DEFAULT_INTERPOLATION_POINT);
            expect(parser2._interpolationPoint).toEqual(parser_1.DEFAULT_INTERPOLATION_POINT);
        });
    });
    describe('ATTRIBUTE_RE', function () {
        it('should parse a string attribute', function () {
            expect(parser_1.ATTRIBUTE_RE.exec('a="str"')).toBeDefined();
        });
        it('should parse a float attribute', function () {
            expect(parser_1.ATTRIBUTE_RE.exec('a=1.23')).toBeDefined();
        });
        it('should parse a bool', function () {
            expect(parser_1.ATTRIBUTE_RE.exec('a')).toBeDefined();
        });
        it('should parse a bool assignment', function () {
            expect(parser_1.ATTRIBUTE_RE.exec('a=true')).toBeDefined();
            expect(parser_1.ATTRIBUTE_RE.exec('a=false')).toBeDefined();
        });
        it('should parse an interpolation', function () {
            expect(parser_1.ATTRIBUTE_RE.exec('a={x}')).toBeDefined();
        });
    });
    describe('#parse', function () {
        var parse;
        beforeEach(function () {
            var parser = new parser_1.default({ markdownEngine: engines_1.markdownItEngine() });
            parse = function (text) {
                return parser.parse(text);
            };
        });
        it('should parse a text block', function () {
            var elements = parse('Some text');
            expect(elements).toBeType('array');
            expect(elements).toHaveLength(1);
            expect(elements[0].type).toEqual('text');
            expect(elements[0].blocks).toEqual(['<p>Some text</p>']);
        });
        it('should parse recursive tags', function () {
            var elements = parse('<Outer a={ x.y }>\n' +
                '  <Inner a=123>\n' +
                '  </Inner>\n' +
                '</Outer>');
            expect(elements).toBeType('array');
            expect(elements).toHaveLength(1);
            expect(elements[0].type).toEqual('tag');
            expect(elements[0].name).toEqual('outer');
            expect(elements[0].children).toHaveLength(1);
            expect(elements[0].children[0].name).toEqual('inner');
        });
        it('should parse tags with no spaces', function () {
            var elements = parse('<Outer><inner></inner></outer>');
            expect(elements).toBeType('array');
            expect(elements[0].name).toEqual('outer');
            expect(elements[0].children[0].name).toEqual('inner');
        });
        it('should correctly parse an interpolation followed by a tag', function () {
            var elements = parse('<Outer>{test}<inner></inner></outer>');
            expect(elements).toBeType('array');
            expect(elements[0].name).toEqual('outer');
            expect(elements[0].children[0].type).toEqual('text');
            expect(elements[0].children[1].name).toEqual('inner');
        });
        describe('indentation', function () {
            it('should treat indented markdown as a code block when indentedMarkdown=false', function () {
                var parser = new parser_1.default({
                    indentedMarkdown: false,
                    markdownEngine: engines_1.markdownItEngine()
                });
                var elements = parser.parse('    # Heading\n' +
                    '    Some text\n');
                expect(elements[0]).toEqual({
                    type: 'text',
                    blocks: ['<pre><code># Heading\nSome text\n</code></pre>']
                });
            });
            it('should parse markdown using the indentation of the first line if indentedMarkdown is true', function () {
                var parser = new parser_1.default({
                    indentedMarkdown: true,
                    markdownEngine: engines_1.markdownItEngine()
                });
                var elements = parser.parse('    # Heading\n' +
                    '    Some text\n');
                expect(elements[0]).toEqual({
                    type: 'text',
                    blocks: ['<h1>Heading</h1>\n<p>Some text</p>']
                });
            });
            it('should parse indented markdown in a tag body', function () {
                var parser = new parser_1.default({
                    indentedMarkdown: true,
                    markdownEngine: engines_1.markdownItEngine()
                });
                var elements = parser.parse('<mytag>\n' +
                    '    # Heading\n' +
                    '    Some text\n' +
                    '</mytag>\n');
                expect(elements[0].children).toEqual([
                    {
                        type: 'text',
                        blocks: ['<h1>Heading</h1>\n<p>Some text</p>']
                    }
                ]);
            });
            describe('when invalid indentation is encountered,', function () {
                it('should detect invalid indentation (if indentedMarkdown is true)', function () {
                    var testFn;
                    var parser = new parser_1.default({
                        indentedMarkdown: true,
                        markdownEngine: engines_1.markdownItEngine()
                    });
                    var testFn = function () { return parser.parse('     # Here is some indented markdown\n' +
                        '     with some valid text\n' +
                        '   and some invalid dedented text\n' +
                        '     and some valid indented text'); };
                    expect(testFn).toThrow(Error, 'Bad indentation in text block at 3:4');
                });
                it('should ignore indentation if indentedMarkdown is false', function () {
                    var testFn;
                    var parser = new parser_1.default({
                        indentedMarkdown: false,
                        markdownEngine: engines_1.markdownItEngine()
                    });
                    var testFn = function () { return parser.parse('     # Here is some indented markdown\n' +
                        '     with some valid text\n' +
                        '   and some invalid dedented text' +
                        '     and some valid indented text'); };
                    expect(testFn).not.toThrow();
                });
            });
        });
        describe('interpolation', function () {
            it('should parse interpolation with an accessor', function () {
                var elements = parse('{ someVar }');
                expect(elements).toBeType('array');
                expect(elements[0].type).toEqual('text');
                expect(elements[0].blocks).toEqual([
                    '<p>',
                    { type: 'interpolation', expression: ['accessor', 'someVar'] },
                    '</p>'
                ]);
            });
            it('should parse interpolation with scalar', function () {
                var elements = parse('{ "abc" }');
                expect(elements).toBeType('array');
                expect(elements[0].type).toEqual('text');
                expect(elements[0].blocks).toEqual([
                    '<p>',
                    { type: 'interpolation', expression: ['scalar', 'abc'] },
                    '</p>'
                ]);
            });
            it('should parse interpolation with a function call', function () {
                var elements = parse('{ foo("bar") }');
                expect(elements).toBeType('array');
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
                var elements = parse('{ foo("bar") and "hello" or x.y }');
                expect(elements).toBeType('array');
                expect(elements[0].type).toEqual('text');
                var funcallBlock = elements[0].blocks[1];
                expect(funcallBlock.expression).toEqual([
                    'and',
                    ['funcall', 'foo', { lineNumber: 1, columnNumber: 7 }, ['scalar', 'bar']],
                    ['or', ['scalar', 'hello'], ['accessor', 'x.y']]
                ]);
            });
        });
        describe('with bad input', function () {
            it("should throw an error if closing tag isn't present", function () {
                expect(function () { return parse('<outer><inner></inner>'); }).toThrow();
            });
            it('should throw an error if invalid closing tag is encountered', function () {
                expect(function () { return parse('<outer><inner></outer>'); }).toThrow();
            });
            it('should throw an error if an invalid attribute is given', function () {
                expect(function () { return parse('<tag a=1 b=[123]></tag>'); }).toThrow();
                expect(function () { return parse("<tag a=1 b='123'></tag>"); }).toThrow();
            });
            it('should throw an error if an attribute interpolation is unclosed', function () {
                expect(function () { return parse('<tag a={></tag>'); }).toThrow();
            });
            it('should throw an error if the tag end brace is missing', function () {
                expect(function () { return parse('<tag</tag>'); }).toThrow();
            });
        });
        describe('with complex input', function () {
            var parseResult;
            beforeEach(function () {
                var example = fs_1.default.readFileSync(path_1.default.join(__dirname, 'example.md'));
                parseResult = parse(example);
            });
            it('should return an array containing objects representing the parsed HTML tree', function () {
                expect(parseResult).toBeType('array');
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
                var attrs;
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
                    expect(attrs.a).toBeType('number');
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
                    ]
                });
                expect(parseResult[4].children[1].type).toEqual('tag');
                expect(parseResult[4].children[1].name).toEqual('subcomponent');
            });
        });
    });
});
