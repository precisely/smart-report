import { isArray, isString, isNumber } from 'lodash';
import { evaluate } from './evaluator';
import { Writable } from 'stream';
import { CodeError, ErrorType } from './error';
import {
  Hash, InterpolationFunction, Component, Context,
  Element, TagElement, TextElement, WritableObject, RenderingFunction,
  isInterpolation, isTagElement, isTextElement, Attribute,
  isElement, ComponentContext, Interpolation
} from './types';

const DefaultComponent: Component = (attrs: ComponentContext<Interpolation>, render: RenderingFunction) => {
  throw new CodeError(
    `Unrecognized component: ${attrs.__name}`,
    { lineNumber: 1, columnNumber: 1}, // TODO: need to add location to component so we can report correctly
    ErrorType.UnknownTag
  );
};
/**
 * Renderer
 *
 * @param {any} options
 * @param {Hash<Component>} components - { componentName: function (renderer, tagName, attrs, children, stream)
 *                              => writes HTML to stream, ... }
 * @param {Component} defaultComponent - function (renderer, tagName, attrs, children, stream)
 * @param {Hash<InterpolationFunction>} functions - functions that may appear inside interpolation blocks
 *
 * components are functions of the form (renderer, tagName, attrs, children, stream) => {}
 * interpolator uses the expression inside {} to extract a value from variables
 */
export default class Renderer {
  constructor({ components = {}, defaultComponent = DefaultComponent, functions = {} }: {
    components?: Hash<Component>,
    defaultComponent?: Component,
    functions?: Hash<InterpolationFunction>
  }) {
    this._components = {};
    for (const key in components) {
      if (components.hasOwnProperty(key)) {
        this._components[key.toLowerCase()] = components[key];
      }
    }
    this._defaultComponent = defaultComponent ;
    this._functions = functions;
  }
  private _components: Hash<Component>;
  private _defaultComponent: Component;
  private _functions: Hash<InterpolationFunction>;

  public write(element: Element<Interpolation> | Element<Interpolation>[], context: Context, stream: Writable) {
    if (isArray(element)) {
      const elements = element;
      elements.forEach((elt: Element<Interpolation>) => {
        this.write(elt, context, stream);
      });
    } else if (isElement(element)) {
      this.writeElement(element, context, stream);
    } else {
      throw new Error(`Unexpected element: ${JSON.stringify(element)}`);
    }
  }

  private componentFromElement(element: TagElement<Interpolation>): Component {
    var component = this._components[element.name] || this._defaultComponent;
    if (!component) {
      throw new Error(`No component named ${element.rawName}`);
    }
    return component;
  }

  private writeElement(element: Element<Interpolation>, context: Context, stream: Writable) {
    const render: RenderingFunction = (obj: WritableObject, newContext?: Context) => {
      newContext = newContext || context;

      const isElementArray = (elt: any): elt is Element<Interpolation>[] => isArray(elt) && isElement(elt[0]); // tslint:disable-line
      if (isString(obj) || isNumber(obj)) {
        stream.write(obj);
      } else if (isElement(obj)) {
        this.write(obj, newContext, stream);
      } else if (isElementArray(obj)) {
        obj.forEach((elt: Element<Interpolation>) => render(elt, newContext));
      }
    };

    // render markdown
    if (isTextElement(element)) {
      this.renderTextElement(element, context, render);
    } else if (isTagElement<Interpolation>(element)) {
      // or a component:
      const component = this.componentFromElement(element);
      // inject special vars into props
      const te: TextElement<Interpolation> = {type: 'text', blocks: [], reduced: false};
      const interpolatedAttrs: ComponentContext<Interpolation> = {
        __name: element.name,
        __children: element.children,
        ...this.interpolateAttributes(element.attrs, context)
      };
      component(interpolatedAttrs, render);
    }
  }

  private renderTextElement(
    textElement: TextElement<Interpolation | void>,
    context: Context,
    render: RenderingFunction
  ) {
    textElement.blocks.forEach(block => {
      if (isInterpolation(block)) {
        const value = evaluate(block.expression, context, this._functions);
        if (value) {
          render(value);
        }
      } else if (block) {
        render(block);
      }
    });
  }

  private interpolateAttributes(attrs: Hash<Attribute<Interpolation> | void>, context: Context): Hash<Attribute<void>> {
    const props = { ...context };
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
