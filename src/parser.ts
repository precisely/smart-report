import { zipObject, isString } from 'lodash';

import Cursor from './cursor';
import streams from 'memory-streams';
import { isFunction } from 'lodash';
import { CodeError, ErrorType } from './error';
import { OpType } from './evaluator';
import { Element, Interpolation, TagElement, TextElement, Attribute, Hash, Expression, Location } from './types';

export const DEFAULT_INTERPOLATION_POINT = '=interpolation-point=';
export const ATTRIBUTE_RE = /^\s*(\w+)\s*(?:(?:=\s*((?:"([^"]*)")|([-+]?[0-9]*\.?[0-9]+)|((?=\{))|(true|false)))|(\s+|(?=\/?>))|([^\w]))/; // tslint:disable-line

type CaptureFn = () => Element<Interpolation> | null;
export type ParserOptions = {
  markdownEngine?: Function,
  interpolationPoint?: string,
  indentedMarkdown?: boolean,
  allowedTags?: string[];
  allowedFunctions?: string[];
};

export type ParserError = {
  type: ErrorType,
  message: string,
  location: Location
};

export default class Parser {
  constructor({ 
    indentedMarkdown = true,
    markdownEngine,
    interpolationPoint,
    allowedTags,
    allowedFunctions
   }: ParserOptions
  ) {
    if (!isFunction(markdownEngine)) {
      throw new Error('Invalid markdownEngine');
    }
    this._errors = [];
    this._markdownEngine = markdownEngine || (() => null);
    this._interpolationPoint = interpolationPoint || DEFAULT_INTERPOLATION_POINT;
    this._indentedMarkdown = indentedMarkdown;
    this._allowedTags = allowedTags ? 
      zipObject(allowedTags.map(t => t.toLowerCase()), allowedTags.map(() => true)) 
      : undefined;
    this._allowedFunctions = allowedFunctions ? 
      zipObject(allowedFunctions, allowedFunctions.map(() => true)) 
      : undefined;
    
    this.cursor = new Cursor('');
  }

  public get interpolationPoint() { return this._interpolationPoint; }
  public get markdownEngine() { return this._markdownEngine; }
  public get indentedMarkdown() { return this._indentedMarkdown; }

  private cursor: Cursor;
  private _markdownEngine: Function;
  private _interpolationPoint: string;
  private _indentedMarkdown: boolean;
  private _allowedTags?: { [key: string]: boolean}; 
  private _allowedFunctions?: { [key: string]: boolean }; 
  private _errors: ParserError[];

  parse(input: string | Buffer): { elements: Element<Interpolation>[], errors: ParserError[] } {
    this.cursor = new Cursor(input);
    this._errors = [];
    return { elements: this.content(), errors: this._errors };
  }

  // returns true if a close is encountered
  captureContentUntil(
    capture: CaptureFn,
    closeTest: RegExp | undefined | false | void | null,
    elements: Element<Interpolation>[]
  ): boolean {
    // check for closing tag before we capture anything:
    if (closeTest && this.cursor.capture(closeTest)) {
      return true;
    } else {
      var elt = capture();
      if (elt) {
        elements.push(elt);
      }
    }
    return false;
  }

  content(closeTag?: string, removeIndent: boolean = false, startTagLocation?: Location): Element<Interpolation>[] {
    const closeTest: RegExp | null = closeTag ? new RegExp(`^</${closeTag}>`, 'i') : null;
    var elements: Element<Interpolation>[] = [];

    while (!this.cursor.eof) {
      if (
        this.captureContentUntil(() => this.tag(), closeTest, elements) ||
        this.captureContentUntil(() => this.text(removeIndent), closeTest, elements)
      ) {
        return elements;
      }
    }

    if (closeTag) {
      this.error(`Expecting closing tag </${closeTag}>`, ErrorType.NoClosingTag, startTagLocation);
    }

    return elements;
  }

  tag(): TagElement<Interpolation> | null {
    // TODO: consider adding \s* to beginning of this regex:
    const tagMatch = this.cursor.capture(/^<(#|\/?\w*)/);
    if (tagMatch) {
      const rawName = tagMatch[1];
      const isClosingTag = rawName[0] === '/';

      if (rawName === '#') { // comment
        this.captureCommentBody();
        return null;
      }
      this.checkTag(isClosingTag ? rawName.slice(1) : rawName);
      const attrs = this.captureAttributes();
      const startTagLocation = this.cursor.clone();
      const endBracket = this.cursor.capture(/^\s*(\/)?>[ \t]*[\r\n]?/);
      const name = rawName.toLowerCase();

      if (!endBracket) {
        this.error(
          `Missing end bracket while parsing '<${rawName} ...'`,
          ErrorType.MissingEndBracket
        );
        return null;
      }

      if (isClosingTag) {
        this.error(`Unexpected closing tag <${rawName}>`, ErrorType.UnexpectedClosingTag);
      } else if (name.length === 0) {
        this.error('Empty tag encountered <>', ErrorType.UnknownTag);
      }

      const selfClosing = (endBracket[1] === '/');
      const children = selfClosing ? [] : this.content(rawName, this._indentedMarkdown, startTagLocation);

      return {
        type: 'tag',
        name, rawName, children, selfClosing, attrs,
        reduced: false
      };
    }
    return null;
  }

  text(removeIndent: boolean = true): TextElement<Interpolation> | null {
    const [textBlocks, interpolationElements] = this.captureTextAndInterpolations(removeIndent);
    const renderedTextBlocks = this.renderMarkdownBlocks(textBlocks);
    const blocks = this.zipTextAndInterpolation(renderedTextBlocks, interpolationElements);

    if (blocks.length > 0) {
      return {
        type: 'text',
        blocks: blocks,
        reduced: false
      };
    }

    return null;
  }

  captureCommentBody() {
    const location = this.cursor.clone();
    const endMatch = this.cursor.capture(/(?:[\s\S]*?(#>))|(?:[\s\S]*)/m);
    if (!endMatch || !endMatch[1]) {
      this.error('Unbalanced comment', ErrorType.NoClosingComment, location);
    }
  }

  zipTextAndInterpolation(textBlocks: string[], interpolationElements: Interpolation[]) {
    const blocks = [];
    let i = 0;
    while (textBlocks.length > i || interpolationElements.length > i) {
      const [text, interpolation] = [textBlocks[i], interpolationElements[i]];
      if (text && text.length > 0) {
        blocks.push(text);
      }
      if (interpolation) {
        blocks.push(interpolation);
      }
      i++;
    }
    // remove empty text elements before returning
    return blocks.filter(block => block !== '');
  }

  //
  // Markdown block parser
  //
  renderMarkdownBlocks(textBlocks: (string | Interpolation)[]) {
    const textWithInterpolationPoints = textBlocks.join('');
    const stream = new streams.WritableStream();
    const render = (htmlText: string) => stream.write(htmlText);
    this._markdownEngine(textWithInterpolationPoints, render);
    const processedTextWithInterpolationPoints = stream.toString();
    const processedTextBlocks = processedTextWithInterpolationPoints.split(this._interpolationPoint);
    return processedTextBlocks;
  }

  removeIndentsFromBlocks(textBlocks: string[], startLineNumber: number): string[] {
    const splitPoint = `{split ${this._interpolationPoint.split('').reverse().join('')}}`;
    const textWithSplitPoint = textBlocks.join('').replace(
      this._interpolationPoint,
      splitPoint + this._interpolationPoint + splitPoint);
    const dedentedText = this.removeRawIndent(textWithSplitPoint, startLineNumber);
    return dedentedText.split(splitPoint);
  }

  removeRawIndent(text: string, startLineNumber: number): string {
    const textBlockLines = text.split('\n');
    let indentation: number | null = null;
    const resultLines: string[] = [];

    for (const line of textBlockLines) {
      const lineIndent = this.getIndent(line);
      if (lineIndent !== null) {
        if (indentation === null) { indentation = lineIndent; }
        if (lineIndent >= indentation) {
          resultLines.push(line.slice(indentation));
        } else { // error! dedent detected
          const cursor = this.cursor.clone();
          cursor.seek(cursor.indexFromLine(startLineNumber + resultLines.length));
          this.error('Bad indentation in text block', ErrorType.BadIndentation, cursor);
          resultLines.push(line.slice(lineIndent));
        }
      }
    }

    return resultLines.join('\n');
  }

  /**
   * Size of indentation (if line is indented) or null
   * @param line line of text
   * @returns number of leading white space characters
   */
  getIndent(line: string): number | null {
    const indentRE = /^(\s*)[^\s]/;
    const indentMatch = indentRE.exec(line);
    return indentMatch && indentMatch[1].length;
  }

  captureTextUntilBreak() {
    const blocks = [];
    let textMatch: RegExpMatchArray | null;

    while (textMatch = this.cursor.capture(/^\s*([^<{}>])*/)) {
      // detect {{ << escape sequences, and non-tag angle bracket
      const escapedText = this.cursor.capture(/^({{|}}|<<|>>)/);
      if (escapedText) {
        // this is not a break, capture the character and continue...
        blocks.push(textMatch[0] + escapedText[0][0]);
      } else if (this.cursor.peek(2) === '<#') {
        this.captureCommentBody();
        blocks.push(textMatch[0]);
      } else {
        blocks.push(textMatch[0]);
        return blocks.join('');
      }
    }

    return blocks.join('');
  }

  captureAttributes(): Hash<Attribute<Interpolation>> {
    var attribs: Hash<Attribute<Interpolation>> = {};
    var match;
    const endOfTag = /^\s*\/?>/;

    while (match = this.cursor.capture(ATTRIBUTE_RE)) {
      var variable = match[1];
      if (match[3]) { // string
        attribs[variable] = match[3];
      } else if (match[4]) { // number
        attribs[variable] = parseFloat(match[4]);
      } else if (match[5] === '') { // interpolation start
        attribs[variable] = this.captureInterpolation();
      } else if (match[6]) { // explicity boolean
        attribs[variable] = match[6] === 'true' ? true : false;
      } else if (isString(match[7])) { // implicit boolean - isString is also true for empty string
        attribs[variable] = true;
      } else {
        this.error(`Invalid attribute ${variable}`, ErrorType.InvalidAttribute);
        this.cursor.capture(/^[^\s>]*/);
      }
    } 

    if (!this.cursor.test(endOfTag)) {
      this.error('Invalid attributes', ErrorType.InvalidAttribute);
      // capture cursor until closing >
      this.cursor.capture(/^[^>]*\/?>/);
    }
    
    return attribs;
  }

  //
  // Text and Interpolations
  //
  captureTextAndInterpolations(removeIndent: boolean = false): [string[], Interpolation[]] {
    const interpolationElements: Interpolation[] = [];
    let textBlocks: string[] = [];
    const captureAndStoreInterpolation = () => {
      const interpolation = this.captureInterpolation();
      if (interpolation) {
        interpolationElements.push(interpolation);
        textBlocks.push(this._interpolationPoint);
      }
      return true;
    };

    // this.cursor may start with an interpolation...
    captureAndStoreInterpolation();
    const startLineNumber = this.cursor.lineNumber;
    let rawText;
    while (rawText = this.captureTextUntilBreak()) {
      textBlocks.push(rawText);
      captureAndStoreInterpolation();
    }
    if (removeIndent) {
      textBlocks = this.removeIndentsFromBlocks(textBlocks, startLineNumber);
    }
    return [textBlocks, interpolationElements];
  }

  //
  //
  // Interpolation Parsing
  //
  //
  captureInterpolation(): Interpolation | null {
    if (this.cursor.capture(/^\s*\{/)) {
      let expression = this.captureInterpolationExpression(/^\s*((?=\}))/);
      if (!expression) {
        this.error('Invalid expression', ErrorType.InvalidExpression);
        expression = [];
      }
      const result: Interpolation = {
        type: 'interpolation',
        expression: expression
      };
      this.cursor.capture(/^\s*\}/); // consume the final }
      return result;
    }
    return null;
  }

  captureInterpolationExpression(terminator: RegExp): Expression | null {
    let lhs = null;
    while (!this.cursor.capture(terminator)) {
      this.cursor.capture(/^\s*/);
      lhs = this.captureInterpolationTerm(lhs, terminator);
      if (!lhs) {
        break;
      }
    }
    return lhs;
  }

  captureInterpolationTerm(lhs: Expression | null, terminator: RegExp): Expression | null {
    const expressionMatch = this.cursor.capture(
      /^\s*(?:(and\b|or\b)|(not\b)|(\()|([a-zA-Z][.\w]*)\s*(\()?|(\"[^\"]*\"|\'[^\']*\'|true|false|[+-]?(?:[0-9]*[.])?[0-9]+))/i // tslint:disable-line
    );
    if (expressionMatch) {
      const capture = expressionMatch[0].trim();
      if (expressionMatch[1]) { // binary operator
        return this.captureInterpolationBinaryOperator(expressionMatch[1], lhs, terminator);
      } else if (lhs) {
        this.error(
          `Expecting "and" or "or" but received "${capture}"`,
          ErrorType.InvalidExpression
        );
      } else if (expressionMatch[4]) {
        return this.captureSymbolExpression(expressionMatch[4], !!expressionMatch[5]);
      } else if (expressionMatch[6]) { // scalar
        return this.captureScalarExpression(expressionMatch[6]);
      } else if (expressionMatch[2]) { // not
        return this.captureInterpolationUnaryOperator(expressionMatch[2], terminator);
      } else if (expressionMatch[3]) { // group start: ( ...
        return this.captureInterpolationGroup();
      }
      this.error('Invalid expression', ErrorType.InvalidExpression);
    }
    return null;
  }

  captureSymbolExpression(symbol: string, isFuncall: boolean): Expression {
    if (isFuncall) { // funcall
      const location = { lineNumber: this.cursor.lineNumber, columnNumber: this.cursor.columnNumber };
      this.checkFunction(symbol); 
      return [OpType.funcall, symbol, location, ...this.captureInterpolationFunctionArguments(symbol)];
    } else { // value
      return [OpType.accessor, symbol];
    }
  }

  captureScalarExpression(scalarExpression: string): Expression {
    try {
      return [OpType.scalar, JSON.parse(scalarExpression)];
    } catch (e) {
      this.error(`Invalid expression ${scalarExpression}`, ErrorType.InvalidExpression);
      return [];
    }
  }

  captureInterpolationBinaryOperator(binOp: string, lhs: Expression | null, terminator: RegExp): Expression {
    if (!lhs) {
      this.error(`Unexpected operator ${binOp}`, ErrorType.UnexpectedOperator);
      return [];
    } else {
      return [binOp, lhs, this.captureInterpolationExpression(terminator)];
    }
  }

  captureInterpolationUnaryOperator(op: string, terminator: RegExp): Expression {
    const term = this.captureInterpolationTerm(null, terminator);
    if (!term) {
      this.error(`Expecting a term after ${op}`, ErrorType.InvalidExpression);
      return [];
    }
    return [op, term];
  }

  captureInterpolationGroup(): Expression | null {
    const result = this.captureInterpolationExpression(/^\s*(?=\))/);
    this.cursor.capture(/^\)/);
    return result;
  }

  captureInterpolationFunctionArguments(symbol: string) {
    const args = [];
    if (!this.cursor.capture(/^\s*\)/)) {
      while (true) {
        const arg = this.captureInterpolationExpression(/^\s*((?=\,|\)))/);
        if (arg) {
          args.push(arg);
        } else {
          this.error(`Invalid argument to ${symbol}`, ErrorType.InvalidArgument);
          return [];
        }
        const argNextMatch = this.cursor.capture(/^\s*(\)|\,)/);
        if (!argNextMatch) {
          this.error(`Expecting , or ) in call to ${symbol}`, ErrorType.InvalidArgument);
          return [];
        } else if (argNextMatch[1]) { // closing paren )
          break;
        } // else found comma - continue processing args
      }
    }
    return args;
  }

  error(message: string, type: ErrorType, location?: Location) {
    location = location || this.cursor;
    if (location instanceof Cursor) {
      location = location.clone();
    }
    this._errors.push({
      type, message, location: location
    });
  }

  // 
  // Checks for allowed tags and functions
  //

  checkTag(tagName: string) {
    if (this._allowedTags && !this._allowedTags[tagName.toLowerCase()]) {
      this.error(`Invalid tag: ${tagName}`, ErrorType.InvalidSymbol);
    }
  }

  checkFunction(functionName: string) {
    if (this._allowedFunctions && !this._allowedFunctions[functionName]) {
      this.error(`Invalid function: ${functionName}`, ErrorType.InvalidSymbol);
    }
  }
}
