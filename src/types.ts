import { isObject, isArray, isNumber, isString } from 'lodash';

export type Context = { [key: string]: any }; // tslint:disable-line
export type InterpolationFunction = (context: Context, ...args: any[]) => Attribute; // tslint:disable-line

export interface Hash<T> {
  [key: string]: T;
}

export interface Interpolation {
  type: 'interpolation';
  expression: Expression;
}

export type Expression = any[]; // tslint:disable-line

export type JSONValue = string | number | boolean | JSONObject | JSONArray;
export interface JSONObject {
    [x: string]: JSONValue;
}
export interface JSONArray extends Array<JSONValue> { }
export type Attribute<I extends Interpolation | void = void> = JSONValue | I | undefined | null;
export type ReducedAttribute = JSONValue | undefined | null;

export interface Element<I extends Interpolation | void = void> {
  type: 'text' | 'tag';
  reduced: (I extends Interpolation ? true|false : true);
}

// Unlike other TextElements, TagElements can have interpolatable attrs and/or children
// D
export interface TagElement<
  I extends Interpolation | void = void,
  CI extends Interpolation | void = I
> extends Element<I> {
  name: string;
  type: 'tag';
  rawName: string;
  attrs: Hash<Attribute<I>>;
  children: Element<CI>[];
  selfClosing?: boolean;
}

export interface TextElement<I extends Interpolation | void = void> extends Element<I> {
  type: 'text';
  blocks: (string | I)[];
}

export type ComponentContext<I extends Interpolation | void = void> = {
  __name: string;
  __children: Element<I>[];

  // type should be Attribute, but Typescript complains:
  [key: string]: any; // tslint:disable-line
};

export type Props = ComponentContext<Interpolation>;

export type WritableObject =  void | JSONValue | Element<Interpolation> | Element<Interpolation>[];

export type RenderingFunction = (obj: WritableObject, newContext?: Context) => void;

export type Component = (props: Props, render: RenderingFunction) => void;

export type ReducibleTagElement = TagElement<Interpolation>;
export type ReducibleTextElement = TextElement<Interpolation>;
export type ReducerFunction = (
  tagElt: ReducibleTagElement,
  context: Context
) => [Element<Interpolation>[], Context];

export function isTagElement<T extends Interpolation | void>(o: (TagElement<T> | any)): o is TagElement<T> { // tslint:disable-line
  return isElement(o) && o.type === 'tag';
}

export function isTextElement<T extends Interpolation | void>(o: (TextElement<T> | any)): o is TextElement<T> { // tslint:disable-line
  return isElement(o) && o.type === 'text';
}

export function isInterpolation(o: any): o is Interpolation { // tslint:disable-line
  return o && o.hasOwnProperty('type') && o.type === 'interpolation';
}

export function isElement(o: any): o is Element<Interpolation | void> { // tslint:disable-line
  return o && o.hasOwnProperty('type');
}

export interface Location {
  lineNumber: number;
  columnNumber: number;
}
