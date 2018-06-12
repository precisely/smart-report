import { isObject, isArray, isString, isNumber } from 'lodash';
import { evaluate } from './evaluator';
import { Writable } from 'stream';
import {
  Hash, InterpolationFunction, Component, Context,
  Element, TagElement, TextElement, WritableObject, RenderingFunction,
  isInterpolation, isTagElement, isTextElement, Attribute,
  isElement, ComponentContext, Interpolation
} from './types';

const DefaultComponent: Component = (attrs: ComponentContext<Interpolation>, render: RenderingFunction) => {};
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
    for (var key in components) {
      this._components[key.toLowerCase()] = components[key];
    }
    this._defaultComponent = defaultComponent ;
    this._functions = functions;
  }
  private _components: Hash<Component>;
  private _defaultComponent: Component;
  private _functions: Hash<InterpolationFunction>;

  public write(elt: Element<Interpolation> | Element<Interpolation>[], context: Context, stream: Writable) {
    if (isArray(elt)) {
      var _this = this;
      var elements = elt;
      elements.forEach(function (elt) {
        _this.write(elt, context, stream);
      });
    } else if (isObject(elt)) {
      this.writeElement(elt, context, stream);
    } else {
      throw new Error(`Unexpected dom element: ${JSON.stringify(elt)}`);
    }
  }

  private componentFromElement(element: TagElement<Interpolation>): Component {
    var component = this._components[element.name] || this._defaultComponent;
    if (!component) {
      throw new Error(`No component named ${element.rawName}`);
    }
    return component;
  }

  private writeElement(elt: Element<Interpolation>, context: Context, stream: Writable) {
    const _this = this;
    const render: RenderingFunction = function (obj: WritableObject, newContext?: Context) {
      newContext = newContext || context;
      if (isString(obj) || isNumber(obj)) {
        stream.write(obj);
      } else if (isElement(obj)) {
        _this.write(obj, newContext, stream);
      }
    };

    // render markdown
    if (isTextElement(elt)) {
      this.renderTextElement(elt, context, render);
    } else if (isTagElement(elt)) {
      // or a component:
      const component = this.componentFromElement(elt);
      // inject special vars into props
      const te: TextElement<Interpolation> = {type:'text', blocks: [], reduced: false};
      const interpolatedAttrs: ComponentContext<Interpolation> = {
        __name: elt.name,
        __children: elt.children,
        ...this.interpolateAttributes(elt.attrs, context)
      };
      component(interpolatedAttrs, render);
    }
  };

  private renderTextElement(textElement: TextElement<Interpolation>, context: Context, render: RenderingFunction) {
    textElement.blocks.forEach(block => {
      if (isInterpolation(block)) {
        render(evaluate(block.expression, context, this._functions));
      } else if (block) {
        render(block);
      }
    });
  }

  private interpolateAttributes(attrs: Hash<Attribute<Interpolation> | void>, context: Context): Hash<Attribute<void>> {
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
