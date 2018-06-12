export declare type Context = {
    [key: string]: any;
};
export declare type InterpolationFunction = (context: Context, ...args: any[]) => Attribute;
export interface Hash<T> {
    [key: string]: T;
}
export interface Interpolation {
    type: 'interpolation';
    expression: Expression;
}
export declare type Expression = [string, any[]];
export declare type JSONValue = string | number | boolean | JSONObject | JSONArray;
interface JSONObject {
    [x: string]: JSONValue;
}
interface JSONArray extends Array<JSONValue> {
}
export declare type Attribute<I extends Interpolation | void = Interpolation> = JSONValue | I | undefined | null;
export declare type ReducedAttribute = JSONValue | undefined | null;
export interface Element<I extends Interpolation | void = void> {
    type: 'text' | 'tag';
    reduced: (I extends Interpolation ? false : true);
}
export interface TagElement<I extends Interpolation | void = void, CI extends Interpolation | void = I> extends Element<I> {
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
export declare type ComponentContext<I extends Interpolation | void = void> = {
    __name: string;
    __children: (Element<I> | I)[];
} & Context;
export declare type WritableObject = ComponentContext | Attribute;
export declare type Writer = (obj: WritableObject, newContext?: Context) => void;
export declare type Component = (args: ComponentContext, writer: Writer) => void;
export declare function isTagElement<T extends Interpolation | void>(o: Element<T>): o is TagElement<T>;
export declare function isTextElement<T extends Interpolation | void>(o: Element<T>): o is TextElement<T>;
export declare function isInterpolation(o: any): o is Interpolation;
export declare function isElement(o: any): o is Element<Interpolation | void>;
export interface Location {
    lineNumber: number;
    columnNumber: number;
}
export {};
