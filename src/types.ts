import { isObject, isArray, isNumber, isString } from 'lodash';

export type Context = { [key: string]: any };
export type InterpolationFunction = (context: Context, ...args: any[]) => Attribute;

export interface Hash<T> {
  [key: string]: T;
}

export interface Interpolation {
  type: 'interpolation';
  expression: Expression;
}

export type Expression = any[];

export type JSONValue = string | number | boolean | JSONObject | JSONArray;
interface JSONObject {
    [x: string]: JSONValue;
}
interface JSONArray extends Array<JSONValue> { }
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
  selfClosing?: boolean
}

export interface TextElement<I extends Interpolation | void = void> extends Element<I> {
  type: 'text';
  blocks: (string | I)[];
}

export type ComponentContext<I extends Interpolation | void = void> = {
  __name: string;
  __children: Element<I>[];
  [key: string]: any; // type should be Attribute, but Typescript complains
}

export type Props = ComponentContext<Interpolation>;

export type WritableObject =  ComponentContext | Attribute | Element<Interpolation> | Element<Interpolation>[];

export type RenderingFunction = (obj: WritableObject, newContext?: Context) => void;

export type Component = (props: Props, render: RenderingFunction) => void;

export function isTagElement<T extends Interpolation | void>(o: Element<T>): o is TagElement<T> {
  return isElement(o) && o.type === 'tag';
}

export function isTextElement<T extends Interpolation | void>(o: Element<T>): o is TextElement<T> {
  return isElement(o) && o.type === 'text';
}

export function isInterpolation(o: any): o is Interpolation {
  return o && o.hasOwnProperty('interpolation') && o.type === 'interpolation';
}

export function isElement(o: any): o is Element<Interpolation | void> {
  return o && o.hasOwnProperty('type');
}

export interface Location {
  lineNumber: number;
  columnNumber: number
}
