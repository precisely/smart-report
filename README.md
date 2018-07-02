[![CircleCI](https://circleci.com/gh/precisely/smart-report.svg?style=shield&circle-token=f23ab1dd6e3e57fb9b8a4e0a0ba12b9712d4e752)](https://circleci.com/gh/precisely/smart-report) [![Maintainability](https://api.codeclimate.com/v1/badges/f09325a34dba427331e5/maintainability)](https://codeclimate.com/repos/5b2185778d7f9c02aa007c3c/maintainability) [![Test Coverage](https://api.codeclimate.com/v1/badges/f09325a34dba427331e5/test_coverage)](https://codeclimate.com/repos/5b2185778d7f9c02aa007c3c/test_coverage)

# smart-report

Add custom React-like components to Markdown which can be safely used by end-users. Use with your favorite Markdown engine.

E.g.,
```html
<# A Box which defaults to blue if user has no favorite color #>
<Box color={user.favoriteColor or "blue"} lineWidth=3>
  ## subheading
  * listElement1
  * listElement2
  [google](https://google.com)
  <Box color="red">Box in box!</Box>
  _more_ markdown
</Box>
```

## Install

```javascript
yarn add git@github.com:precisely/smart-report.git
// plus your favorite markdown engine
// npm i markdown
// npm i showdown
// npm i markdown-it
```

## Quick start

```javascript
var { toHTML, markdownItEngine } = require("smart-report");

// define a Box component:
var components = {
  Box: function({ lineSize, color, __children }, render) {
    render(
      `<div style="border-width:${lineSize}; background-color:${color};">`
    );
    render(__children); // render internal elements
    render(`</div>`);
  }
};

// use the Box component:
var customizedMarkdown = `
Custom components:
<Box lineSize=2 color={ user.favoriteColor }>
  Can contain...
  # Markdown with interpolated expressions:
  This box should be *{ user.favoriteColor }*
  And the _markdown_ can contain custom components:
  <Box lineSize=1 color="red">
    which can contain *more markdown*
    and so on.
    Render open curly brace and open angle bracket: {{ and <<
  </Box>
</Box>`;

// render the markdown with your custom components,
// providing context variables:
var html = toHTML({
  input: customizedMarkdown,
  components: components,
  context: { user: { favoriteColor: 'blue' }},
  markdownEngine: markdownItEngine()
});
console.log(html); // ~=>
// <p>Custom components:</p>
// <div style="border-width:2; background-color>
// <p>Can contain...</p>
// <h1> Markdown with interpolation:</h1>
// <p>This box should be <b>blue</b>
// And the <i>markdown</i> can contain custom components:</p>
// <div style="border-width:1; background-color:red>
// <p>which can contain <b>more markdown</b>
// and so on.
// Render open curly brace and open angle bracket: { and &lt</p>
// </div>
// </div>
```

### Custom Components

The components argument to `toHTML` and `Renderer.write` provides functions that generate HTML.

For example:

```javascript
{
  Box: function ({__name, __children, color}, render) {
    // generate custom HTML:
    render(`<div class="box" style="background-color:${color}">`);
    render(__children); // render elements between start and end tag
    render(`</div>`);
  }
}
```

Allows you to write:
```html
<Box color="red">
# This markdown
Will be displayed on a red background
</Box>
```

## Rationale

Markdown components provides a content authoring language with custom components which is safe for use by end-users.

|           |JSX-Markdown | markdown-it-shortcodes | smart-report |
|:----------|:-----------:|:----------------------:|:-------------------:|
| end-users |  unsafe     | safe                   | safe                |
| nesting   |  yes        | no                     | yes                 |
| HOCs      |  yes        | no                     | yes                 |

JSX-markdown libraries aren't suitable because React interpolated expressions are Javascript. I.e., you'd need to eval user-generated javascript either on your server or another user's browser. You could try evaluating such code in a sandboxed environment, but it's inefficient and asynchronous. The need for asynchronous evaluation rules out using a sandbox like [jailed](https://github.com/asvd/jailed) in a React client, since React rendering requires synchronous execution.

In this package, expressions, like `{ a.b }` or `{ foo(a) }` are restricted to a context object and a set of developer defined functions, so there is no script injection vulnerability. Authors of this markdown work inside a developer-defined sandbox.

## API

### toHTML

Easy one step method for generating HTML.

Parses and renders Markdown with components to HTML.

```javascript
// requires: npm install markdown-it
import { markdownItEngine, toHTML } from 'smart-report';
toHTML({
  input: '<MyComponent a={ x.y } b=123 c="hello"># This is an {x.y} heading</MyComponent>',
  components: {
    MyComponent({a, b, c, __children}, render) {
      render(`<div class=my-component><p>a=${a};b=${b};c=${c}</p>`);
      render(__children); // renders elements between open and close tag
      render(`</div>`);
    }
  },
  markdownEngine: markdownItEngine(),
  context:{ x: { y: "interpolated" } }
  // defaultComponent,
  // interpolator
});
// =>
// "<div class=my-component><p>a=interpolated;b=123;c=hello</p><h1>This is an interpolated heading</h1></div>"
```

### Parser

Class for parsing component markdown input text.

Note that this function doesn't parse Markdown. Markdown parsing is currently done by the renderer. This is expected to change in future.


#### constructor arguments

* `markdownEngine` (required)
  The markdown engine function (required).
* `indentedMarkdown` (optional, default: true)
   Allows a contiguous block of Markdown to start at an indentation point without creating a [preformatted code block](https://daringfireball.net/projects/markdown/syntax#precode).
   This is useful when writing Markdown inside deeply nested components.

#### #parse

Returns a JSON object representing the parsed markdown.

```javascript
import { Parser, showdownEngine } from 'smart-report';
var parser = new Parser({markdownEngine:}); // use showdownjs
var parsedElements = parser.parse(`<MyComponent a={ x.y.z } b=123 c="hello" d e=false >
# User likes { user.color or "no" } color
</MyComponent>
`);
// =>
// [
//   {
//     type: "tag",
//     name: 'mycomponent',
//     rawName: 'MyComponent',
//     attribs: {
//       a: {
//            type: "interpolation",
//            expression: ["accessor", "x.y.z"]
//       },
//       b: 123,
//       c: "hello",
//       d: true,
//       e: false
//     }
//     children: [
//       {
//         type: "text",
//         blocks: [
//           "<h1>User likes ",
//           { type: "interpolation",
//             expression: ["or", ["accessor", "user.color"], ["scalar", "no"]]
//           },
//           "color</h1>"
//         ]
//       }
//     ]
//   }
// ]
```

#### Attribute types

Attributes can be ints, floats, strings, booleans and expressions.

```html
<MyComponent a=1 b=1.2 c="hello" d e=true f=false />
```

Note: the `d` attribute represents a `true` boolean.

### Renderer

A class representing the rendering logic.

#### constructor arguments

* `components` (required)
  An object of key:function pairs. Where the key is the componentName (matched case-insensitively with tags in the input text), and function is a function which takes parsed elements as input, and uses the render function to write HTML:

  ```js
  ({__name, __children, ...attrs}, render)=>{}
  ```
* `defaultComponent` (optional)
  A function called when a matching component cannot be found for a tag. Same function signature as a component.
* `functions` (optional)
  Functions which may be used in interpolation expressions, of the form:
  ```js
  (context, args) => value
  ```

#### #write

Writes an element (e.g., the result from Parser.parse) to `stream`, and uses the `context` when evaluating expressions:

```javascript
renderer.write(elements, context, stream);
var html = stream.toString();
```

### Renderer Components

The components argument is an object where keys are tag names, and functions render HTML. This is a required argument of the `Renderer` constructors and the `toHTML` function.

For example:

```javascript
{
  Box: function ({__name, __children, color}, render) {
    // generate custom HTML:
    render(`<div class="box" style="background-color:${color}">`);
    render(__children); // render elements between start and end tag
    render(`</div>`);
  }
}
```

Allows you to write:
```html
<Box color="red">
# This markdown
Will be displayed on a red background
</Box>
```

Component functions are of the form:
```javascript
(tagArguments, render) => { }
```

The first argument, tagArguments, contains values passed in the markup, plus two special keys:

`__name` name of the tag
`__children` array of Objects representing elements between the open and close tags, having the form:

The second argument, `render` is a function which takes a string representing HTML or an object representing parsed entities and writes it to a stream.


#### Higher Order Components

Because the component has responsibility for rendering `__children`, you can manipulate child elements at render time, choosing to ignore, rewrite or reorder them. For example, you could create elements that provide switch/case/default semantics:

```html
# Your Results
<Switch value={user.score}>
<Case value="A">You did _great_!</Case>
<Case value="B">Well done</Case>
<Default>Better luck next time</Default>
</Switch>
```

### Interpolation Functions

Interpolation blocks can contain simple expressions including function calls:

```js
<Component value={ not (foo(true)) and add(123, -123) or x.y } />
```

Interpolation functions are provided to the renderer constructor:
```js
new Renderer({
  components: {
    Component: (context, renderer) => {...}
  },
  functions: {
    foo(context, myBool) { return myBool; },
    add(context, a, b) { return a+b; }
  }
});
```

Given the above code, the `value` attribute of `Component` will be the value of x.y:

```js
value={ not (true) and 0 or x.y }
```

### Markdown Engine

A number of wrappers for existing Markdown interpreters are provided in `src/engines.js`. Each is a function which returns a rendering function. There are wrappers MarkdownIt, ShowdownJS and evilStreak's markdown. It's easy to write your own wrapper. See the source file.

```javascript
import { toHTML, markdownItEngine } from 'smart-report';

var html = toHTML({
  markdownEngine: markdownItEngine,
  ...
});
```

## Separately Parse and Render

If you're concerned about efficiency, parse the input first, and cache the result (a plain JSON object). Call Renderer.write with different contexts:

### Example
```javascript
var { markdownItEngine, Renderer, Parser } = require('smart-report'); // "npm i markdown-it" to use markdownItEngine
var streams = require('memory-streams'); // "npm i memory-streams"
var renderer = new Renderer({
  componets: {
    Box({ __children, color }, render) {
      render(`<div class="box" style="background-color:${color}">`);
      render(__children);
      render(`</div>`);
    }
  }
});

var parser = new Parser({ markdownEngine: markdownItEnginer() });
var parsedElements = parser.parse('<Box color={user.favoriteColor}>_Here is some_ *markdown*</Box>');

// red box
stream = streams.getWriteableStream();
renderer.write(parsedElements,{ user: { favoriteColor: "red" } }, stream);
console.log(stream.toString());
// <div class="box" style="background-color:red"><i>Here is some</i> <b>markdown</b></div>

// blue box
stream = streams.getWriteableStream();
renderer.write(parsedElements,{ user: { favoriteColor: "blue" } }, stream);
console.log(stream.toString());
// <div class="box" style="background-color:blue"><i>Here is some</i> <b>markdown</b></div>
```


### Reducer
The Reducer class reduces a parse tree to a minimal context-independent form. The `Reducer.reduce` function takes a parse tree and a context, and returns a minimized parse tree which can be rendered without a context. This is useful, for personalizing and removing other parts of a smart report on the server before sending it to a client for rendering.

#### constructor
```javascript
const reducer = new Reducer({
  components: {
    Foo(elt, context) {
      // the <Foo> tag selects children which have attr foo==true
      const reducedChildren = elt.children.filter(child => child.attrs.foo);
      return [reducedChildren, context]; // the context is returned unchanged
    }
  }
})
```

#### #reduce
```javascript
const parser = new Parser();
const parseTree = parser.parse('some text');
const context = {};
reducer.reduce(parseTree, context);
```

