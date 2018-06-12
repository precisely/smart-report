"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var cursor_1 = __importDefault(require("./cursor"));
var memory_streams_1 = __importDefault(require("memory-streams"));
var lodash_1 = require("lodash");
var error_1 = require("./error");
var evaluator_1 = require("./evaluator");
exports.DEFAULT_INTERPOLATION_POINT = '=interpolation-point=';
exports.ATTRIBUTE_RE = /^\s*([^/=<>"'\s]+)\s*(?:=\s*((?:"([^"]*)")|([-+]?[0-9]*\.?[0-9]+)|((?=\{))|(true|false)))?/;
var Parser = (function () {
    function Parser(_a) {
        var _b = _a.markdownEngine, markdownEngine = _b === void 0 ? null : _b, _c = _a.interpolationPoint, interpolationPoint = _c === void 0 ? null : _c, _d = _a.indentedMarkdown, indentedMarkdown = _d === void 0 ? true : _d;
        if (!lodash_1.isFunction(markdownEngine)) {
            throw new Error('Invalid markdownEngine');
        }
        this._markdownEngine = markdownEngine || (function () { });
        this._interpolationPoint = interpolationPoint || exports.DEFAULT_INTERPOLATION_POINT;
        this._indentedMarkdown = indentedMarkdown;
        this.cursor = new cursor_1.default("");
    }
    Parser.prototype.parse = function (input) {
        this.cursor = new cursor_1.default(input);
        return this.content();
    };
    Parser.prototype.captureContentUntil = function (capture, closeTest, elements) {
        if (closeTest && this.cursor.capture(closeTest)) {
            return true;
        }
        else {
            var elt = capture();
            if (elt) {
                elements.push(elt);
            }
        }
        return false;
    };
    Parser.prototype.content = function (closeTag) {
        var _this = this;
        var closeTest = closeTag ? new RegExp("^</" + closeTag + ">", 'i') : null;
        var elements = [];
        while (!this.cursor.eof) {
            if (this.captureContentUntil(function () { return _this.tag(); }, closeTest, elements) ||
                this.captureContentUntil(function () { return _this.text(); }, closeTest, elements)) {
                return elements;
            }
        }
        if (closeTag) {
            throw new error_1.CodeError("Expecting closing tag </" + closeTag + ">", this.cursor, error_1.ErrorType.NoClosingTag);
        }
        return elements;
    };
    Parser.prototype.tag = function () {
        var tagMatch = this.cursor.capture(/^<(\/?\w+)/);
        if (tagMatch) {
            var rawName = tagMatch[1];
            var attrs = this.captureAttributes();
            var endBracket = this.cursor.capture(/^\s*(\/)?>/);
            var name = rawName.toLowerCase();
            if (!endBracket) {
                throw new error_1.CodeError("Missing end bracket while parsing '<" + rawName + " ...'", this.cursor, error_1.ErrorType.MissingEndBracket);
            }
            if (name[0] === '/') {
                throw new error_1.CodeError("Unexpected closing tag <" + rawName + ">", this.cursor, error_1.ErrorType.UnexpectedClosingTag);
            }
            var selfClosing = (endBracket[1] === '/');
            var children = selfClosing ? [] : this.content(rawName);
            return {
                type: 'tag',
                name: name, rawName: rawName, children: children, selfClosing: selfClosing, attrs: attrs,
                reduced: false
            };
        }
        return null;
    };
    Parser.prototype.text = function () {
        var _a = this.captureTextAndInterpolations(), textBlocks = _a[0], interpolationElements = _a[1];
        var renderedTextBlocks = this.renderMarkdownBlocks(textBlocks);
        var blocks = this.zipTextAndInterpolation(renderedTextBlocks, interpolationElements);
        if (blocks.length > 0) {
            return {
                type: 'text',
                blocks: blocks,
                reduced: false
            };
        }
        return null;
    };
    Parser.prototype.zipTextAndInterpolation = function (textBlocks, interpolationElements) {
        var blocks = [];
        var i = 0;
        while (textBlocks.length > i || interpolationElements.length > i) {
            var _a = [textBlocks[i], interpolationElements[i]], text = _a[0], interpolation = _a[1];
            if (text && text.length > 0) {
                blocks.push(text);
            }
            if (interpolation) {
                blocks.push(interpolation);
            }
            i++;
        }
        return blocks.filter(function (block) { return block !== ''; });
    };
    Parser.prototype.renderMarkdownBlocks = function (textBlocks) {
        var textWithInterpolationPoints = textBlocks.join('');
        var stream = new memory_streams_1.default.WritableStream();
        var render = function (htmlText) { return stream.write(htmlText); };
        this._markdownEngine(textWithInterpolationPoints, render);
        var processedTextWithInterpolationPoints = stream.toString();
        var processedTextBlocks = processedTextWithInterpolationPoints.split(this._interpolationPoint);
        return processedTextBlocks;
    };
    Parser.prototype.removeIndent = function (text) {
        var textBlockLines = text.split('\n');
        var _a = this.findFirstIndentedLine(textBlockLines), startLine = _a[0], firstIndent = _a[1];
        if (startLine && firstIndent) {
            var resultLines = [];
            for (var lineIndex = startLine; lineIndex < textBlockLines.length; lineIndex++) {
                var line = textBlockLines[lineIndex];
                var lineIndent = getIndent(line);
                if (lineIndent) {
                    if (lineIndent >= firstIndent) {
                        resultLines.push(line.slice(firstIndent));
                    }
                    else {
                        var cursor = this.cursor;
                        var lineNumber = startLine + lineIndex + 1;
                        cursor.seek(cursor.lineIndex(lineNumber) + lineIndent);
                        throw new error_1.CodeError('Bad indentation in text block', cursor, error_1.ErrorType.BadIndentation);
                    }
                }
            }
            return resultLines.join('\n');
        }
        return "";
    };
    Parser.prototype.findFirstIndentedLine = function (textBlockLines) {
        var firstIndent;
        var startLine;
        for (startLine = 0; startLine < textBlockLines.length; startLine++) {
            firstIndent = getIndent(textBlockLines[startLine]);
            if (firstIndent) {
                break;
            }
        }
        return [startLine, firstIndent];
    };
    Parser.prototype.captureTextUntilBreak = function () {
        var blocks = [];
        var text;
        while (text = this.cursor.capture(/^\s*([^<{}>])*/)) {
            var escapedText = this.cursor.capture(/^({{|}}|<<|>>)/);
            if (escapedText) {
                blocks.push(text[0] + escapedText[0][0]);
            }
            else {
                blocks.push(text[0]);
                return blocks.join('');
            }
        }
        return blocks.join('');
    };
    Parser.prototype.captureAttributes = function () {
        var attribs = {};
        var match;
        while (match = this.cursor.capture(exports.ATTRIBUTE_RE)) {
            var variable = match[1];
            if (match[3]) {
                attribs[variable] = match[3];
            }
            else if (match[4]) {
                attribs[variable] = parseFloat(match[4]);
            }
            else if (match[5] === '') {
                attribs[variable] = this.captureInterpolation();
            }
            else if (match[6]) {
                attribs[variable] = match[6] === 'true' ? true : false;
            }
            else {
                attribs[variable] = true;
            }
        }
        return attribs;
    };
    Parser.prototype.captureTextAndInterpolations = function () {
        var _this = this;
        var interpolationElements = [];
        var textBlocks = [];
        var captureAndStoreInterpolation = function () {
            var interpolation = _this.captureInterpolation();
            if (interpolation) {
                interpolationElements.push(interpolation);
                textBlocks.push(_this._interpolationPoint);
            }
            return true;
        };
        captureAndStoreInterpolation();
        var rawText;
        while (rawText = this.captureTextUntilBreak()) {
            if (this._indentedMarkdown) {
                textBlocks.push(this.removeIndent(rawText));
            }
            else {
                textBlocks.push(rawText);
            }
            captureAndStoreInterpolation();
        }
        return [textBlocks, interpolationElements];
    };
    Parser.prototype.captureInterpolation = function () {
        if (this.cursor.capture(/^\s*\{/)) {
            var expression = this.captureInterpolationExpression(/^\s*((?=\}))/);
            if (!expression) {
                throw new error_1.CodeError('Invalid expression', this.cursor, error_1.ErrorType.InvalidExpression);
            }
            var result = {
                type: 'interpolation',
                expression: expression
            };
            this.cursor.capture(/^\s*\}/);
            return result;
        }
        return null;
    };
    Parser.prototype.captureInterpolationExpression = function (terminator) {
        var lhs = null;
        while (!this.cursor.capture(terminator)) {
            this.cursor.capture(/^\s*/);
            lhs = this.captureInterpolationTerm(lhs, terminator);
        }
        return lhs;
    };
    Parser.prototype.captureInterpolationTerm = function (lhs, terminator) {
        var expressionMatch = this.cursor.capture(/^\s*(and\b|or\b)|(not\b)|(\()|([a-zA-Z][.\w]*)\s*(\()?|(\"[^\"]*\"|\'[^\']*\'|true|false|[+-]?(?:[0-9]*[.])?[0-9]+)/i);
        if (expressionMatch) {
            var capture = expressionMatch[0].trim();
            if (expressionMatch[1]) {
                return this.captureInterpolationBinaryOperator(expressionMatch[1], lhs, terminator);
            }
            else if (lhs) {
                throw new error_1.CodeError("Expecting \"and\" or \"or\" but received \"" + capture + "\"", this.cursor, error_1.ErrorType.InvalidExpression);
            }
            else if (expressionMatch[4]) {
                return this.captureSymbolExpression(expressionMatch[4], !!expressionMatch[5]);
            }
            else if (expressionMatch[6]) {
                return this.captureScalarExpression(expressionMatch[6]);
            }
            else if (expressionMatch[2]) {
                return this.captureInterpolationUnaryOperator(expressionMatch[2], terminator);
            }
            else if (expressionMatch[3]) {
                return this.captureInterpolationGroup();
            }
            throw new error_1.CodeError('Invalid expression', this.cursor, error_1.ErrorType.InvalidExpression);
        }
        return null;
    };
    Parser.prototype.captureSymbolExpression = function (symbol, isFuncall) {
        if (isFuncall) {
            var location = { lineNumber: this.cursor.lineNumber, columnNumber: this.cursor.columnNumber };
            return [evaluator_1.OpType.funcall, [symbol, location].concat(this.captureInterpolationFunctionArguments(symbol))];
        }
        else {
            return [evaluator_1.OpType.accessor, [symbol]];
        }
    };
    Parser.prototype.captureScalarExpression = function (scalarExpression) {
        try {
            return [evaluator_1.OpType.scalar, [JSON.parse(scalarExpression)]];
        }
        catch (e) {
            throw new error_1.CodeError("Invalid expression " + scalarExpression, this.cursor, error_1.ErrorType.InvalidExpression);
        }
    };
    Parser.prototype.captureInterpolationBinaryOperator = function (binOp, lhs, terminator) {
        if (!lhs) {
            throw new error_1.CodeError("Unexpected operator " + binOp, this.cursor, error_1.ErrorType.UnexpectedOperator);
        }
        else {
            return [binOp, [lhs, this.captureInterpolationExpression(terminator)]];
        }
    };
    Parser.prototype.captureInterpolationUnaryOperator = function (op, terminator) {
        var term = this.captureInterpolationTerm(null, terminator);
        if (!term) {
            throw new error_1.CodeError("Expecting a term after " + op, this.cursor, error_1.ErrorType.InvalidExpression);
        }
        return [op, [term]];
    };
    Parser.prototype.captureInterpolationGroup = function () {
        return this.captureInterpolationExpression(/^\s*\)/);
    };
    Parser.prototype.captureInterpolationFunctionArguments = function (symbol) {
        var args = [];
        if (!this.cursor.capture(/^\s*\)/)) {
            while (true) {
                var arg = this.captureInterpolationExpression(/^\s*((?=\,|\)))/);
                if (arg) {
                    args.push(arg);
                }
                else {
                    throw new error_1.CodeError("Invalid argument to " + symbol, this.cursor, error_1.ErrorType.InvalidArgument);
                }
                var argNextMatch = this.cursor.capture(/^\s*(\)|\,)/);
                if (!argNextMatch) {
                    throw new error_1.CodeError("Expecting , or ) in call to " + symbol, this.cursor, error_1.ErrorType.InvalidArgument);
                }
                else if (argNextMatch[1]) {
                    break;
                }
            }
        }
        return args;
    };
    return Parser;
}());
exports.default = Parser;
function getIndent(line) {
    var indentRE = /^(\s*)[^\s]/;
    var indentMatch = indentRE.exec(line);
    return indentMatch && indentMatch[1].length;
}
