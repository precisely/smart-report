"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var src_1 = require("../src");
var memory_streams_1 = __importDefault(require("memory-streams"));
var engines_1 = require("../src/engines");
describe('Renderer', function () {
    var components;
    var parse;
    describe('write', function () {
        beforeEach(function () {
            var parser = new src_1.Parser({ markdownEngine: engines_1.markdownItEngine() });
            parse = function (input) { return parser.parse(input); };
            components = {
                SimpleComponent: function (_a, render) {
                    var __children = _a.__children, a = _a.a;
                    render('<div class="simple-component">');
                    render("a=" + a + ":" + typeof a + "\n");
                    render(__children);
                    render('</div>');
                }
            };
        });
        describe('context variables', function () {
            it('should be implicitly available to the component', function () {
                var renderer = new src_1.Renderer({
                    components: {
                        ShowA: function (_a, render) {
                            var A = _a.A;
                            render("A:" + A + "\n");
                        }
                    }
                });
                var dom = parse('<ShowA/>');
                var stream = new memory_streams_1.default.WritableStream();
                renderer.write(dom, { A: 1 }, stream);
                var result = stream.toString();
                expect(result).toEqual(expect.stringContaining('A:1'));
            });
            it('may be changed during rendering', function () {
                var renderer = new src_1.Renderer({
                    components: {
                        Square: function (_a, render) {
                            var val = _a.val, __children = _a.__children;
                            render(val + "\n");
                            render(__children, { val: Math.pow(val, 2) });
                        }
                    }
                });
                var dom = parse('<Square><Square><Square></Square></Square></Square>');
                var stream = new memory_streams_1.default.WritableStream();
                renderer.write(dom, { val: 2 }, stream);
                var result = stream.toString();
                var lines = result.split('\n');
                expect(lines[0]).toEqual('2');
                expect(lines[1]).toEqual('4');
                expect(lines[2]).toEqual('16');
                expect(lines[3]).toEqual('');
            });
        });
        it('should render a float attribute', function () {
            var renderer = new src_1.Renderer({
                components: components
            });
            var dom = parse('<SimpleComponent a=1.09 />');
            var stream = new memory_streams_1.default.WritableStream();
            renderer.write(dom, { a: { b: 'xyz' } }, stream);
            var result = stream.toString();
            expect(result).toEqual(expect.stringContaining('a=1.09:number'));
        });
        it('should render a string attribute', function () {
            var renderer = new src_1.Renderer({
                components: components
            });
            var dom = parse('<SimpleComponent a="abc" />');
            var stream = new memory_streams_1.default.WritableStream();
            renderer.write(dom, { a: { b: 'xyz' } }, stream);
            var result = stream.toString();
            expect(result).toEqual(expect.stringContaining('a=abc:string'));
        });
        it('should render an interpolated attribute', function () {
            var renderer = new src_1.Renderer({
                components: components
            });
            var dom = parse('<SimpleComponent a={x.y} />');
            var stream = new memory_streams_1.default.WritableStream();
            renderer.write(dom, { x: { y: 'xyz' } }, stream);
            var result = stream.toString();
            expect(result).toEqual(expect.stringContaining('a=xyz:string'));
        });
        it('should render an interpolated attribute, ignoring spaces', function () {
            var renderer = new src_1.Renderer({
                components: components
            });
            var dom = parse('<SimpleComponent a={ x.y } />');
            var stream = new memory_streams_1.default.WritableStream();
            renderer.write(dom, { x: { y: 'xyz' } }, stream);
            var result = stream.toString();
            expect(result).toEqual(expect.stringContaining('a=xyz:string'));
        });
        it('should render subcomponents', function () {
            var renderer = new src_1.Renderer({
                components: components
            });
            var dom = parse('<SimpleComponent a={ x.y }>\n' +
                '  <SimpleComponent a=123>\n' +
                '  </SimpleComponent>\n' +
                '</SimpleComponent>');
            var stream = new memory_streams_1.default.WritableStream();
            renderer.write(dom, { x: { y: 'xyz' } }, stream);
            var result = stream.toString();
            expect(result).toEqual(expect.stringContaining('a=xyz:string'));
        });
        it('should render markdown inside a component', function () {
            var renderer = new src_1.Renderer({
                components: components
            });
            var dom = parse('<SimpleComponent>\n' +
                '# heading\n' +
                '* listItem1\n' +
                '* listItem2\n' +
                '</SimpleComponent>');
            var stream = new memory_streams_1.default.WritableStream();
            renderer.write(dom, {}, stream);
            var result = stream.toString();
            expect(result).toEqual(expect.stringContaining('<div class="simple-component">'));
            expect(result).toEqual(expect.stringContaining('<h1>heading</h1>'));
            expect(result).toEqual(expect.stringContaining('<li>listItem1</li>'));
            expect(result).toEqual(expect.stringContaining('<li>listItem2</li>'));
            expect(result).toEqual(expect.stringContaining('</div>'));
        });
        it('should interpolate curly brace expressions inside markdown', function () {
            var renderer = new src_1.Renderer({
                components: components
            });
            var dom = parse('<SimpleComponent>\n' +
                "# { user.name }'s Settings\n" +
                '* setting1\n' +
                '* setting2\n' +
                '</SimpleComponent>');
            var stream = new memory_streams_1.default.WritableStream();
            renderer.write(dom, { user: { name: 'Bob' } }, stream);
            var result = stream.toString();
            expect(result).toEqual(expect.stringContaining("<h1>Bob's Settings</h1>"));
        });
        it('should throw an error if an invalid object is provided', function () {
            var renderer = new src_1.Renderer({
                components: components
            });
            var stream = new memory_streams_1.default.WritableStream();
            var X = (function () {
                function X() {
                }
                return X;
            }());
            ;
            expect(function () { return renderer.write(1, {}, stream); }).toThrow();
            expect(function () { return renderer.write(new X(), {}, stream); }).toThrow();
        });
        it('should render a component with multiple variables', function () {
            var renderer = new src_1.Renderer({
                components: {
                    MyComponent: function (_a, render) {
                        var __children = _a.__children, a = _a.a, b = _a.b, c = _a.c, d = _a.d;
                        render('<div class="my-component">');
                        render("a=" + a + ":" + typeof a + "\n");
                        render("b=" + b + ":" + typeof b + "\n");
                        render("c=" + c + ":" + typeof c + "\n");
                        render("d=" + d + ":" + typeof d + "\n");
                        render(__children);
                        render('</div>');
                    }
                }
            });
            var dom = parse('<MyComponent a=1 b="string" c={a.b} d={ a.b }/>');
            var stream = new memory_streams_1.default.WritableStream();
            renderer.write(dom, { a: { b: 'xyz' } }, stream);
            var result = stream.toString();
            expect(result).toEqual(expect.stringContaining('a=1:number'));
            expect(result).toEqual(expect.stringContaining('b=string:string'));
            expect(result).toEqual(expect.stringContaining('c=xyz:string'));
            expect(result).toEqual(expect.stringContaining('d=xyz:string'));
        });
        describe('when an unrecognized component is present', function () {
            it('and defaultComponent is provided,', function () {
                var renderer = new src_1.Renderer({
                    components: components,
                    defaultComponent: function (attrs, render) {
                        render('<div class="default">');
                        render("a=>" + attrs.a + ";b=>" + attrs.b + ";c=>" + attrs.c);
                        render('</div>');
                    }
                });
                var stream = new memory_streams_1.default.WritableStream();
                var dom = parse('<default a=123 b="hello" c={val}></default>');
                renderer.write(dom, { val: 'myval' }, stream);
                var result = stream.toString();
                expect(result).toEqual('<div class="default">' +
                    'a=>123;b=>hello;c=>myval' +
                    '</div>');
            });
            it('and defaultComponent is not provided,', function () {
                var renderer = new src_1.Renderer({
                    components: components
                });
                var dom = parse('<default a=123 b="hello" c={val}></default>');
                expect(function () { return renderer.write(dom, { val: 'myval' }); }).toThrow();
            });
        });
    });
});
