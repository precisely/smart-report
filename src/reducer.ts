import { htmlEncode } from 'js-htmlencode';
import { evaluate } from './evaluator';
import {
  Hash, Interpolation, InterpolationFunction, Context,
  Element, TagElement, TextElement,
  isInterpolation, isTagElement, isTextElement, Attribute,
  ReducerFunction
} from './types';
import { isString, isArray } from 'util';
import { isElement } from './types';

// ReducerFunction takes a tag element and context and
// returns a modified list of child nodes and a modified context
// When
const DefaultReducer: ReducerFunction = (elt: TagElement<Interpolation>, context: Context) => [elt.children, context];
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
  constructor({ components = {}, functions = {}, exhaustiveEval = false}: {
    components?: Hash<ReducerFunction>,
    functions?: Hash<InterpolationFunction>,
    exhaustiveEval?: boolean
  }) {
    this._reducers = {};
    for (const key in components) {
      if (components.hasOwnProperty(key)) {
        this._reducers[key.toLowerCase()] = components[key];
      }
    }
    this._functions = functions;
    this._exhaustiveEval = exhaustiveEval;
  }
  private _reducers: Hash<ReducerFunction>;
  private _functions: Hash<InterpolationFunction>;
  private _exhaustiveEval: boolean;
  
  /**
   * Transforms a parse tree, removing interpolations and reducing the
   * tree using reducer functions
   *
   * @param {Element<Interpolation>} elt
   * @param {Context} context
   * @returns {Element<void>} - a reduced element with all interpolations removed
   * @memberof Reducer
   */
  public reduce(
    elt: Element<Interpolation>[],
    context: Context
  ): Element[] {
    return elt.map(e => this.reduceSingleElement(e, context));
  }

  private reduceSingleElement(elt: Element<Interpolation>, context: Context): Element {
    if (isTagElement<Interpolation>(elt)) {
      const result: Element = this.reduceTagElement(elt, context)[0];
      return result;
    } else if (isTextElement<Interpolation>(elt)) {
      return this.reduceTextElement(elt, context);
    } else {
      throw new Error(`Fatal error unexpected element: ${elt}`);
    }
  }

  private reducerFromElement(elt: TagElement<Interpolation>): ReducerFunction {
    const reducer = this._reducers[elt.name];
    if (!reducer) {
      return DefaultReducer;
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
      return child ? this.reduceSingleElement(child, context) : null;
    }).filter(c => c) as Element[];
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
    }).filter(b => b) as string[];
    return {
      ...textElement,
      blocks: reducedBlocks,
      reduced: true
    };
  }

  private interpolateAttributes(attrs: Hash<Attribute<Interpolation>>, context: Context): Hash<any> { // tslint:disable-line
    const props: Hash<Attribute> = {};
    for (const key in attrs) {
      if (attrs.hasOwnProperty(key)) {
        const value = attrs[key];
        if (isInterpolation(value)) {
          props[key] = evaluate(value.expression, context, this._functions);
        } else {
          props[key] = value;
        }
      }
    }
    return props;
  }
}

function stringified(o: any): string | null { // tslint:disable-line
  if (isString(o)) {
    return htmlEncode(o);
  } else if (o) {
    return o.toString();
  }
  return null;
}
