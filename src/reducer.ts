import { htmlEncode } from 'js-htmlencode';
import { evaluate } from './evaluator';
import {
  Hash, Interpolation, InterpolationFunction, Context,
  Element, TagElement, TextElement,
  isInterpolation, isTagElement, isTextElement, Attribute
} from './types';
import { isString } from 'util';

type ReducerFunction = (
  tagElt: TagElement<Interpolation>,
  context: Context
) => [Element<Interpolation>[], Context];
/**
 * Renderer
 *
 * @param {any} options
 * @param {Hash<ReducerFunction>} reducers - { reducerName: (elt: Element<Interpolation>, context: Context) => Element }
 * @param {Hash<InterpolationFunction>} functions - functions that may appear inside interpolation blocks
 *
 * components are functions of the form (renderer, tagName, attrs, children, stream) => {}
 * interpolator uses the expression inside {} to extract a value from variables
 */
export default class Reducer {
  constructor({ reducers = {}, functions ={}}: {
    reducers?: Hash<ReducerFunction>,
    functions?: Hash<InterpolationFunction>
  }) {
    this._reducers = {};
    for (var key in reducers) {
      this._reducers[key.toLowerCase()] = reducers[key];
    }
    this._functions = functions;
  }
  private _reducers: Hash<ReducerFunction>;
  private _functions: Hash<InterpolationFunction>;

  /**
   * Transforms a parse tree, removing interpolations and reducing the
   * tree using reducer functions
   *
   * @param {Element<Interpolation>} elt
   * @param {Context} context
   * @returns {Element<void>} - a reduced element with all interpolations removed
   * @memberof Reducer
   */
  public reduce(elt: Element<Interpolation>, context: Context): Element<void> {
    if (isTagElement(elt)) {
      return this.reduceTagElement(elt, context)[0];
    } else if (isTextElement(elt)) {
      return this.reduceTextElement(elt, context);
    } else {
      throw new Error(`Fatal error unexpected element: ${elt}`);
    }
  }

  private reducerFromElement(elt: TagElement<Interpolation>): ReducerFunction {
    const reducer = this._reducers[elt.name];
    if (!reducer) {
      throw new Error(`No component named ${elt.rawName}`);
    }
    return reducer;
  }

  private reduceTagElement(elt: TagElement<Interpolation>, context: Context): [TagElement, Context] {
    const interpolatedAttributes = this.interpolateAttributes(elt.attrs, context);
    const reducer = this.reducerFromElement(elt);
    const eltWithReducedAttributes = {... elt, attrs: interpolatedAttributes};
    let  children;
    if (reducer) { // reduce the children and the context
      [children, context] = reducer(eltWithReducedAttributes, context);
    } else {
      children = elt.children;
    }
    const reducedChildren = children.map(child => {
      return child ? this.reduce(child, context) : null;
    }).filter(c => c) as Element<void>[];
    const reducedTag: TagElement = {
      ...eltWithReducedAttributes,
      attrs: interpolatedAttributes,
      reduced: true,
      children: reducedChildren
    };

    return [reducedTag, context];
  }

  private reduceTextElement(textElement: TextElement<Interpolation>, context: Context): TextElement {
    const reducedBlocks = textElement.blocks.map(block => {
      if (isInterpolation(block)) {
        const value = evaluate(block.expression, context, this._functions);
        return stringified(value);
      } else {
        return block;
      }
    }).filter(b=>b) as string[];
    return {
      ...textElement,
      blocks: reducedBlocks,
      reduced: true
    };
  }

  private interpolateAttributes(attrs: Hash<Attribute<Interpolation>>, context: Context): Hash<any> {
    var props = { ...context };
    for (var key in attrs) {
      var value = attrs[key];
      if (isInterpolation(value)) {
        props[key] = evaluate(value.expression, context, this._functions);
      } else {
        props[key] = value;
      }
    }
    return props;
  }
}

function stringified(o: any): string | null {
  if (isString(o)) {
    return htmlEncode(o);
  } else if (o) {
    return o.toString();
  }
  return null;
}