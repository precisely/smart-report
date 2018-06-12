import { Hash, Interpolation, InterpolationFunction, Context, Element, TagElement } from './types';
declare type ReducerFunction = (tagElt: TagElement<Interpolation>, context: Context) => [Element<Interpolation>[], Context];
export default class Reducer {
    constructor({ reducers, functions }: {
        reducers?: Hash<ReducerFunction>;
        functions?: Hash<InterpolationFunction>;
    });
    private _reducers;
    private _functions;
    reduce(elt: Element<Interpolation>, context: Context): Element<void>;
    private reducerFromElement;
    private reduceTagElement;
    private reduceTextElement;
    private interpolateAttributes;
}
export {};
