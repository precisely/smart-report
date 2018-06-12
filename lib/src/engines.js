"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function markdownItEngine(options) {
    var MarkdownIt = require('markdown-it');
    var markdown = new MarkdownIt(options);
    return function markdownRenderer(mdText, render) {
        var text = markdown.render(mdText);
        if (text[text.length - 1] === '\n') {
            render(text.slice(0, text.length - 1));
        }
        else {
            render(text);
        }
    };
}
exports.markdownItEngine = markdownItEngine;
function evilStreakMarkdownEngine(dialect) {
    var markdown = require('markdown').markdown;
    return function markdownRenderer(mdText, render) {
        render(markdown.toHTML(mdText, dialect));
    };
}
exports.evilStreakMarkdownEngine = evilStreakMarkdownEngine;
function showdownEngine(options) {
    var showdown = require('showdown');
    var converter = new showdown.Converter(options || { noHeaderId: true });
    return function markdownRenderer(mdText, render) {
        render(converter.makeHtml(mdText));
    };
}
exports.showdownEngine = showdownEngine;
