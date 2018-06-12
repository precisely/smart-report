"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Cursor = (function () {
    function Cursor(input, index) {
        if (index === void 0) { index = 0; }
        this._index = index;
        this._buffer = new Buffer(input);
    }
    Object.defineProperty(Cursor.prototype, "index", {
        get: function () {
            return this._index;
        },
        enumerable: true,
        configurable: true
    });
    Cursor.prototype.peek = function (length, offset) {
        if (length === void 0) { length = 1; }
        if (offset === void 0) { offset = 0; }
        return this._buffer.slice(this._index + offset, this._index + length + offset).toString();
    };
    Cursor.prototype.test = function (re, offset) {
        if (offset === void 0) { offset = 0; }
        return !this.eof && re.test(this._buffer.slice(this._index + offset).toString());
    };
    Cursor.prototype.capture = function (re, offset) {
        if (offset === void 0) { offset = 0; }
        var match = this.eof ? null : re.exec(this._buffer.slice(this._index + offset).toString());
        if (match) {
            this._index += match[0].length + match.index;
        }
        return match;
    };
    Cursor.prototype.seek = function (index) {
        if (index === void 0) { index = 0; }
        this._index = index;
    };
    Object.defineProperty(Cursor.prototype, "eof", {
        get: function () {
            return this._index >= this._buffer.length;
        },
        enumerable: true,
        configurable: true
    });
    Cursor.prototype.next = function (n) {
        if (n === void 0) { n = 1; }
        if (!this.eof) {
            var result = this._buffer.slice(this._index, this._index + n).toString();
            this._index += n;
            return result;
        }
        else {
            return null;
        }
    };
    Cursor.prototype.lineIndex = function (lineNumber) {
        var lines = this._buffer.toString().split('\n');
        var selectedLines = lines.slice(0, lineNumber - 1);
        var total = 0;
        if (lineNumber < 1 || lineNumber > lines.length) {
            throw new Error("Line number out of range " + lineNumber);
        }
        selectedLines.forEach(function (line) {
            total += line.length + 1;
        });
        return total;
    };
    Object.defineProperty(Cursor.prototype, "lines", {
        get: function () {
            var stringToCurrentIndex = this._buffer.slice(0, this._index).toString();
            return stringToCurrentIndex.split(/\r\n|\r|\n/);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Cursor.prototype, "lineNumber", {
        get: function () {
            return this.lines.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Cursor.prototype, "columnNumber", {
        get: function () {
            var lastLine = this.lines[this.lineNumber - 1];
            return lastLine ? lastLine.length + 1 : 1;
        },
        enumerable: true,
        configurable: true
    });
    return Cursor;
}());
exports.default = Cursor;
