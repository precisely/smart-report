import { Location } from './types';
import { Stream } from 'stream';

export default class Cursor implements Location {
  constructor(input: Buffer | string, index: number = 0) {
    this._index = index;
    if (input instanceof Buffer) { // funky duplication because @types/node uses overloads
      this._buffer = new Buffer(input);
    } else {
      this._buffer = new Buffer(input);
    }
  }
  private _index: number;
  private readonly _buffer: Buffer;

  /**
   * index - current location of the cursor from the start
   *
   * @readonly
   * @memberof Cursor
   */
  get index() {
    return this._index;
  }

  /**
   * peek - returns a new string of the given length representing the buffer at
   *        the current index and offset.
   *
   * @param {number} [length=1]
   * @param {number} [offset=0]
   * @returns {Buffer} result
   * @memberof Cursor
   */
  peek(length: number = 1, offset: number = 0) {
    return this._buffer.slice(this._index + offset, this._index + length + offset).toString();
  }

  /**
   * test - tests whether text at the current input matches the regex
   *
   * @param {RE2} re
   * @returns {boolean} success
   * @memberof Cursor
   */
  test(re: RegExp, offset: number = 0): boolean {
    return !this.eof && re.test(this._buffer.slice(this._index + offset).toString());
  }

  /**
   * capture - advances the cursor to the next character if of a sequence
   *            matching a regex, returning the match or null
   *
   * @param {RE2} re
   * @returns {Object?} match
   * @memberof Cursor
   */
  capture(re: RegExp, offset: number = 0): RegExpMatchArray | null {
    var match = this.eof ? null : re.exec(this._buffer.slice(this._index + offset).toString());
    if (match) {
      this._index += match[0].length + match.index;
    }
    return match;
  }

  /**
   * seek - positions the cursor at the absolute index provided.
   *        if no argument is provided, effectively resets the cursor.
   * @param {number} [index=0]
   * @memberof Cursor
   */
  seek(index: number = 0): void {
    this._index = index;
  }

  /**
   * eos - end of string
   *
   * @memberof Cursor
   */
  get eof(): boolean {
    return this._index >= this._buffer.length;
  }

  /**
   * next - creates and returns a new string object of length n at the current index
   *
   * @memberof Cursor
   */
  next(n: number = 1): string | null {
    if (!this.eof) {
      var result = this._buffer.slice(this._index, this._index + n).toString();
      this._index += n;
      return result;
    } else {
      return null;
    }
  }

  /**
   * Returns the 0-based character index of a line
   * @param lineNumber - the 1-based index of a line
   * @returns {number} the 0-based character index of the first character on the line
   */
  indexFromLine(lineNumber: number): number {
    const lines = this._buffer.toString().split('\n');
    const selectedLines = lines.slice(0, lineNumber - 1);
    var total = 0;
    if (lineNumber < 1 || lineNumber > lines.length) {
      throw new Error(`Line number out of range ${lineNumber}`);
    }
    selectedLines.forEach(line => {
      total += line.length + 1;
    });
    return total;
  }

  get lines(): string[] {
    var stringToCurrentIndex = this._buffer.slice(0, this._index).toString();
    return stringToCurrentIndex.split(/\r\n|\r|\n/);
  }

  get lineNumber(): number {
    return this.lines.length;
  }

  get columnNumber(): number {
    const lastLine = this.lines[this.lineNumber - 1];
    return lastLine ? lastLine.length + 1 : 1;
  }
}
