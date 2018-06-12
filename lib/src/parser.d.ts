import { Element, Interpolation, TagElement, TextElement, Attribute, Hash, Expression } from './types';
export declare const DEFAULT_INTERPOLATION_POINT = "=interpolation-point=";
export declare const ATTRIBUTE_RE: RegExp;
declare type CaptureFn = () => Element<Interpolation> | null;
export default class Parser {
    constructor({ markdownEngine, interpolationPoint, indentedMarkdown }: {
        markdownEngine?: null;
        interpolationPoint?: null;
        indentedMarkdown?: boolean;
    });
    private cursor;
    private _markdownEngine;
    private _interpolationPoint;
    private _indentedMarkdown;
    parse(input: string): Element<Interpolation>[];
    captureContentUntil(capture: CaptureFn, closeTest: RegExp | undefined | false | void | null, elements: Element<Interpolation>[]): boolean;
    content(closeTag?: string): Element<Interpolation>[];
    tag(): TagElement<Interpolation> | null;
    text(): TextElement<Interpolation> | null;
    zipTextAndInterpolation(textBlocks: string[], interpolationElements: Interpolation[]): (string | Interpolation)[];
    renderMarkdownBlocks(textBlocks: (string | Interpolation)[]): string[];
    removeIndent(text: string): string;
    findFirstIndentedLine(textBlockLines: string[]): (number | null | undefined)[];
    captureTextUntilBreak(): string;
    captureAttributes(): Hash<Attribute<Interpolation>>;
    captureTextAndInterpolations(): [string[], Interpolation[]];
    captureInterpolation(): Interpolation | null;
    captureInterpolationExpression(terminator: RegExp): Expression | null;
    captureInterpolationTerm(lhs: Expression | null, terminator: RegExp): Expression | null;
    captureSymbolExpression(symbol: string, isFuncall: boolean): Expression;
    captureScalarExpression(scalarExpression: string): Expression;
    captureInterpolationBinaryOperator(binOp: string, lhs: Expression | null, terminator: RegExp): Expression;
    captureInterpolationUnaryOperator(op: string, terminator: RegExp): Expression;
    captureInterpolationGroup(): Expression | null;
    captureInterpolationFunctionArguments(symbol: string): [string, any[]][];
}
export {};
