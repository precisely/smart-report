/// <reference types="node" />
import { Writable } from 'stream';
import { Hash, InterpolationFunction, Component, Context, Element } from './types';
export default class Renderer {
    constructor({ components, defaultComponent, functions }: {
        components: Hash<Component>;
        defaultComponent: Component;
        functions: Hash<InterpolationFunction>;
    });
    private _components;
    private _defaultComponent;
    private _functions;
    write(elt: Element | Element[], context: Context, stream: Writable): void;
    private componentFromElement;
    private writeElement;
    private renderTextElement;
    private interpolateAttributes;
}
