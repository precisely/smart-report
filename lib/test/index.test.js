"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var src_1 = require("../src");
var engines_1 = require("../src/engines");
var jest_tobetype_1 = __importDefault(require("jest-tobetype"));
expect.extend(jest_tobetype_1.default);
describe('toHTML', function () {
    var components = {
        SimpleComponent: function (_a, render) {
            var __children = _a.__children, a = _a.a;
            render('<div class="simple-component">');
            render("a=" + a + ":" + typeof a + "\n");
            render(__children);
            render('</div>');
        }
    };
    it('should create HTML in one step with evilStreakEngine', function () {
        var result = src_1.toHTML({
            input: '<SimpleComponent a={ x.y }>\n' +
                '  <SimpleComponent a=123>\n' +
                '# Heading with interpolation - { x.y }\n' +
                '  </SimpleComponent>\n' +
                '</SimpleComponent>',
            components: components,
            markdownEngine: engines_1.evilStreakMarkdownEngine(),
            context: { x: { y: 'hello' } }
        });
        expect(result).toBeType('string');
        expect(result).toEqual(expect.stringContaining('a=hello:string'));
        expect(result).toEqual(expect.stringContaining('a=123:number'));
        expect(result).toEqual(expect.stringContaining('<h1>Heading with interpolation - hello</h1>'));
    });
    it('should create HTML in one step with showdownEngine', function () {
        var result = src_1.toHTML({
            input: '<SimpleComponent a={ x.y }>\n' +
                '  <SimpleComponent a=123>\n' +
                '# Heading with interpolation - { x.y }\n' +
                '  </SimpleComponent>\n' +
                '</SimpleComponent>',
            components: components,
            markdownEngine: engines_1.showdownEngine(),
            context: { x: { y: 'hello' } }
        });
        expect(result).toBeType('string');
        expect(result).toEqual(expect.stringContaining('a=hello:string'));
        expect(result).toEqual(expect.stringContaining('a=123:number'));
        expect(result).toEqual(expect.stringContaining('<h1>Heading with interpolation - hello</h1>'));
    });
});
