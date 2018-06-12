import { Location } from './types';
export default class Cursor implements Location {
    constructor(input: string, index?: number);
    private _index;
    private readonly _buffer;
    readonly index: number;
    peek(length?: number, offset?: number): string;
    test(re: RegExp, offset?: number): boolean;
    capture(re: RegExp, offset?: number): RegExpMatchArray | null;
    seek(index?: number): void;
    readonly eof: boolean;
    next(n?: number): string | null;
    lineIndex(lineNumber: number): number;
    readonly lines: string[];
    readonly lineNumber: number;
    readonly columnNumber: number;
}
