"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var memory_streams_1 = __importDefault(require("memory-streams"));
var renderer_1 = __importDefault(require("./renderer"));
exports.Renderer = renderer_1.default;
var parser_1 = __importDefault(require("./parser"));
exports.Parser = parser_1.default;
__export(require("./engines"));
function toHTML(_a) {
    var input = _a.input, components = _a.components, markdownEngine = _a.markdownEngine, context = _a.context;
    var parser = new parser_1.default({ markdownEngine: markdownEngine });
    var parsedInput = parser.parse(input);
    var renderer = new renderer_1.default({
        components: components
    });
    var stream = new memory_streams_1.default.WritableStream();
    renderer.write(parsedInput, context, stream);
    return stream.toString();
}
exports.toHTML = toHTML;
