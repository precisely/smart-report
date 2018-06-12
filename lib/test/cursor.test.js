"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var cursor_1 = __importDefault(require("../src/cursor"));
var jest_tobetype_1 = __importDefault(require("jest-tobetype"));
expect.extend(jest_tobetype_1.default);
describe('Cursor', function () {
    describe('constructor', function () {
        it('should accept a string', function () {
            expect(new cursor_1.default('abc')).toBeInstanceOf(cursor_1.default);
        });
        it('should accept a string and an index', function () {
            var cursor = new cursor_1.default('abc', 2);
            expect(cursor).toBeInstanceOf(cursor_1.default);
            expect(cursor.index).toEqual(2);
        });
    });
    describe('#peek', function () {
        it('should show one character at the current index', function () {
            var cursor = new cursor_1.default('abcdefghijk', 4);
            expect(cursor.peek()).toEqual('e');
        });
        it('should show several characters at the current index', function () {
            var cursor = new cursor_1.default('abcdefghijk', 4);
            expect(cursor.peek(3)).toEqual('efg');
        });
        it('should show a specified number of characters at the current index', function () {
            var cursor = new cursor_1.default('abcdefghijk', 4);
            expect(cursor.peek(3)).toEqual('efg');
        });
        it('should show a specified number of characters at an offset from the current index', function () {
            var cursor = new cursor_1.default('abcdefghijk', 4);
            expect(cursor.peek(3, -1)).toEqual('def');
        });
    });
    describe('#test', function () {
        it('should return true if the regex matches current input position', function () {
            var cursor = new cursor_1.default('abcdefg');
            expect(cursor.test(/abc/)).toBe(true);
            ;
            expect(cursor.test(/def/)).toBe(true);
            ;
        });
        it('should return false if the regex does not match text from the current input position', function () {
            var cursor = new cursor_1.default('abcdefg', 3);
            expect(cursor.test(/abc/)).toBe(false);
            ;
        });
        it('should test at the provided offset', function () {
            var cursor = new cursor_1.default('abcdefg', 3);
            expect(cursor.test(/abc/, -3)).toBe(true);
            ;
            expect(cursor.test(/abc/, 1)).toBe(false);
            ;
        });
        it('should return false when cursor is eof', function () {
            var cursor = new cursor_1.default('abc', 3);
            expect(cursor.test(/.*/)).toBe(false);
            ;
        });
    });
    describe('#capture', function () {
        it('should return the match and advance the index after a successful match', function () {
            var cursor = new cursor_1.default('abcdefg');
            var capture = cursor.capture(/b(.*)e/);
            expect(capture).toBeTruthy();
            expect(capture[0]).toEqual('bcde');
            expect(cursor.index).toEqual(5);
            expect(cursor.peek()).toEqual('f');
        });
        it('should return null and not advance the index after an unsuccesful match', function () {
            var cursor = new cursor_1.default('abcdefg', 3);
            var capture = cursor.capture(/b(.*)e/);
            expect(capture).toBeNull();
        });
        it('should return null when cursor is eof', function () {
            var cursor = new cursor_1.default('abc', 3);
            expect(cursor.capture(/(.*)/)).toBeNull();
        });
    });
    describe('#seek', function () {
        it('should reset the index to 0 when no args are given', function () {
            var cursor = new cursor_1.default('abcdefg', 5);
            cursor.seek();
            expect(cursor.index).toEqual(0);
        });
        it('should set the index to the provided value', function () {
            var cursor = new cursor_1.default('abcdefg');
            cursor.seek(3);
            expect(cursor.index).toEqual(3);
        });
    });
    describe('#eof', function () {
        it('should be true when index before the end of the input', function () {
            var cursor = new cursor_1.default('abcdefg');
            cursor.seek(6);
            expect(cursor.eof).toBe(false);
            ;
        });
        it('should be false when index at the end of the input', function () {
            var cursor = new cursor_1.default('abcdefg');
            cursor.seek(7);
            expect(cursor.eof).toBe(true);
            ;
        });
        it('should be false when index is beyond the end of the input', function () {
            var cursor = new cursor_1.default('abcdefg');
            cursor.seek(8);
            expect(cursor.eof).toBe(true);
            ;
        });
    });
    describe('#next', function () {
        it('should return the next character', function () {
            var cursor = new cursor_1.default('abcdefg');
            expect(cursor.next()).toEqual('a');
            expect(cursor.next()).toEqual('b');
            expect(cursor.next()).toEqual('c');
        });
        it('should return the next n characters', function () {
            var cursor = new cursor_1.default('abcdefg');
            expect(cursor.next(3)).toEqual('abc');
            expect(cursor.next(3)).toEqual('def');
        });
        it('should return null when index is at the end of input', function () {
            var cursor = new cursor_1.default('abcdefg');
            cursor.seek(7);
            expect(cursor.next(3)).toBeNull();
        });
    });
    describe('when reporting location', function () {
        var cursor;
        beforeEach(function () {
            cursor = new cursor_1.default('123456789\n1234\n123456789');
        });
        it('should report 1:1 values at the beginning', function () {
            cursor.seek(0);
            expect(cursor.lineNumber).toEqual(1);
            expect(cursor.columnNumber).toEqual(1);
        });
        it('should report lineNumber 0 on the first line, but the correct column number', function () {
            cursor.seek(5);
            expect(cursor.lineNumber).toEqual(1);
            expect(cursor.columnNumber).toEqual(6);
            cursor.seek(7);
            expect(cursor.lineNumber).toEqual(1);
            expect(cursor.columnNumber).toEqual(8);
        });
        it('should report lineNumber 1 when just before the first carriage return', function () {
            cursor.seek(9);
            expect(cursor.lineNumber).toEqual(1);
            expect(cursor.columnNumber).toEqual(10);
        });
        it('should report the correct line and column when in the last line', function () {
            cursor.seek(20);
            expect(cursor.lineNumber).toEqual(3);
            expect(cursor.columnNumber).toEqual(6);
        });
    });
    describe('#lineIndex', function () {
        var cursor;
        beforeEach(function () {
            cursor = new cursor_1.default('01234\n6789\n123456789\n');
        });
        it('should return 0 for lineNumber 1', function () {
            expect(cursor.lineIndex(1)).toEqual(0);
        });
        it('should throw for lineNumber<1', function () {
            expect(function () { return cursor.lineIndex(0); }).toThrow();
            expect(function () { return cursor.lineIndex(-2); }).toThrow();
        });
        it('should return the index of the first character of the second line for lineNumber=2', function () {
            expect(cursor.lineIndex(2)).toEqual(6);
        });
        it('should return the index of the first character of the third line for lineNumber=3', function () {
            expect(cursor.lineIndex(3)).toEqual(11);
        });
    });
});
