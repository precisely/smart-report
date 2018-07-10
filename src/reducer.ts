import { htmlEncode } from 'js-htmlencode';
import { evaluate } from './evaluator';
import {
  Hash, Interpolation, InterpolationFunction, Context,
  Element, TagElement, TextElement,
  isInterpolation, isTagElement, isTextElement, Attribute,
  ReducerFunction,
  ReducibleElement
} from './types';
import { isString, isNullOrUndefined } from 'util';

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
  constructor({ components = {}, functions = {}, analysisMode = false}: {
    components?: Hash<ReducerFunction>,
    functions?: Hash<InterpolationFunction>,
    analysisMode?: boolean
  }) {
    this._reducers = {};
    for (const key in components) {
      /* istanbul ignore next */
      if (components.hasOwnProperty(key)) {
        this._reducers[key.toLowerCase()] = components[key];
      }
    }
    this._functions = functions;
    this._analysisMode = analysisMode;
  }
  private _reducers: Hash<ReducerFunction>;
  private _functions: Hash<InterpolationFunction>;
  private _analysisMode: boolean;

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

  private forTagsInterpolateAttributes(elements: ReducibleElement[], context: Context) {
    return elements.map(elt => {
      if (isTagElement(elt)) {
        return {
          ...elt,
          attrs: this.interpolateAttributes(elt.attrs, context)
        };
      } else {
        return elt;
      }
    });
  }
  private reduceTagElement(elt: TagElement<Interpolation>, context: Context): [TagElement, Context] {
    const interpolatedAttributes = this.interpolateAttributes(elt.attrs, context);
    const reducer = this.reducerFromElement(elt);
    const childrenWithInterpolatedAttributes = this.forTagsInterpolateAttributes(elt.children, context);
    const eltWithReducedAttributesAndChildren = {
      ... elt,
      attrs: interpolatedAttributes,
      children: childrenWithInterpolatedAttributes
    };
    const [children, reducedContext] = reducer(eltWithReducedAttributesAndChildren, context);

    const reducedChildren = children.map(child => {
      /* istanbul ignore next */
      return child ? this.reduceSingleElement(child, reducedContext) : null;
    }).filter(c => c) as Element[];
    const reducedTag: TagElement = {
      ...eltWithReducedAttributesAndChildren,
      attrs: interpolatedAttributes,
      reduced: true,
      children: reducedChildren
    };

    return [reducedTag, reducedContext];
  }

  private reduceTextElement(textElement: TextElement<Interpolation>, context: Context): TextElement {
    const reducedBlocks = textElement.blocks.map(block => {
      if (isInterpolation(block)) {
        const value = evaluate(block.expression, context, this._functions, this._analysisMode);
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

  private interpolateAttributes(attrs: Hash<Attribute<void|Interpolation>>, context: Context): Hash<any> { // tslint:disable-line
    const props: Hash<Attribute> = {};
    for (const key in attrs) {
      /* istanbul ignore next */
      if (attrs.hasOwnProperty(key)) {
        const value = attrs[key];
        if (isInterpolation(value)) {
          props[key] = evaluate(value.expression, context, this._functions, this._analysisMode);
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
  } else if (!isNullOrUndefined(o)) {
    return o.toString();
  }
  return null;
}

/**
 * Removes tag elements (but not text elements) matching the predicate
 * Predicate takes a hash of attributes, including __name which names the tag.
 * This is useful for writing reducer components.
 * E.g.,
 * removeTag(children, ({__name, someAttr}) => {
 *   return __name==='foo' && someAttr==='bar'; // all <Foo bar=truthy> tags removed
 * })
 *
 * @param children
 * @param predicate
 */
export function removeTags(
  children: Element<Interpolation|void>[],
  predicate: (attrs: Hash<Attribute|void>) => boolean
): Element<Interpolation|void>[] {
  return children.filter(child => {
    if (isTagElement<void>(child)) {
      return !predicate({...child.attrs, __name: child.name});
    } else {
      return true;
    }
  });
}
