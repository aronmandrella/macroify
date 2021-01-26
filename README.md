<img src="https://raw.githubusercontent.com/aronmandrella/macroify/main/media/macroify.png" />

---

> It allows you to easily turn any JavaScript module, into a Babel macro that behaves (almost) like a regular object... but at build time.

### Example

Preloading a file content with `macroify/require.macro` and `fs-extra` NPM package:

```js
// src/index.js

import m, { fsExtra as mFs, path as mPath } from "macroify/require.macro";

const seed = m("Build seed: " + Math.random());

const packageName = mFs.readJsonSync(
  mPath.resolve(__dirname, "../package.json")
).name;
```

After you transcompile it with Babel, you'll get something like this:

```js
const seed = "Build seed: 0.3397477727963272";
const packageName = "your-package-name";
```

<br>

---

<br>

- [Beginner introduction](#beginner-introduction)

  - [What is Babel?](#what-is-babel)
  - [What are Babel plugins?](#what-are-babel-plugins)
  - [What are Babel macros?](#what-are-babel-macros)
  - [What can you I Babel macros for?](#what-can-i-use-babel-macros-for)
  - [What do I need to use Babel macros?](#what-do-i-need-to-use-babel-macros)

- [Install](#install)

- [Approach A - /require.macro (recommended)](#approach-a)

  - [Importing modules](#approach-a-importing-modules)
  - [Limitations and a thing to remember](#limitations)
  - [Safety notice](#safety-notice)
  - [Example 1 - list of files with certain extension](#approach-a-example-1)
  - [Example 2](#approach-a-example-2)
  - [Example 3 - preval / codegen clones](#approach-a-example-3)
  - [Example 4](#approach-a-example-4)

- [Approach B - Separate macros (not recommended)](#approach-b)

  - [Step 0 - API](#approach-b-step-0)
  - [Step 1 - Create a .macro.js file](#approach-b-step-1)
  - [Step 2 - That's it](#approach-b-step-2)
  - [Why Approach B usually is not recommended?](#why-approach-b-is-not-recommended)

<br>

---

<br>

<a id="beginner-introduction"></a>

## Beginner introduction

<a id="what-is-babel"></a>

### What is Babel?

Babel is a transcompiler that is most commonly used to turn modern JavaScript into a ES5/ES6 JavaScript that is widely supported by browsers... but it can do way more than that. Basically it can be used to mangle your source code in any way you can imagine.

<a id="what-are-babel-plugins"></a>

### What are Babel plugins?

Babel plugin is a piece of code that is responsible for some specific code mangling. For example there is a babel plugin that when enabled [removes all console log from your code](https://www.npmjs.com/package/babel-plugin-transform-remove-console).

<a id="what-are-babel-macros"></a>

### What are Babel macros?

There is a Babel plugin called `babel-plugin-macros`. It allows you to use (so called by the community) babel macros. They are basically mini plugins, but they are easier to use, because they can be imported like any other JavaScript module. When you want to use a Babel plugin, you have to specify it in your Babel configuration. On the other hand, when you want to use a macro, you only need to import it in your code, thus to use any Babel macro you only need to add `babel-plugin-macros` to your Babel configuration.

<a id="what-can-i-use-babel-macros-for"></a>

### What can I use Babel macros for?

For many things. For example: they can be used to add some syntax sugar to JavaScript, to pre-compute some values, to pre-load some data, or even to generate/modify your source code in various ways.

<a id="what-do-i-need-to-use-babel-macros"></a>

### What do I need to use Babel macros?

If you use a boilerplate that transpiles your code with Babel and has a `babel-plugin-macros` installed you're already good to go (`create-react-app` is a boilerplate like this for example). Otherwise unfortunately you'll need to set up these two things first. It takes only few minutes, though. For more information either read [Babel docs](https://babeljs.io/setup#installation) or one of [many guides available online](https://www.robinwieruch.de/webpack-babel-setup-tutorial).

<br>

<a id="install"></a>

## Install

```
npm install macroify --save-dev
```

Make sure that you use Babel and `babel-plugin-macros` too.

<br>

<a id="approach-a"></a>

## Approach A - /require.macro (recommended)

<a id="approach-a-importing-modules"></a>

### Importing modules

The main idea behind this approach, is that it gives you a way to import and macroify any installed module, all within a single import statement.

> ⚠️Don't use multiple import statements to avoid issues described in the [Why Approach B usually is not recommended?](#why-approach-b-is-not-recommended) section.

This is how you use `"macroify/require.macro` to import modules :

```js
// Good - single import on top of a file
import {
  path as mPath, // 'm' prefixes/suffixes aren't required.
  lodash as _m,
  fsExtra as mFs,
  // ...
  anyModuleNameInCamelCase as localNameOfYourChoice,
} from "macroify/require.macro";

// Bad - macroify won't be able to sort nested macro calls
import { path as mPath } from "macroify/require.macro";
import { lodash as _m } from "macroify/require.macro";
import { fsExtra as mFs } from "macroify/require.macro";
```

You can use these modules as excepted:

```js
// C:/Users/.../examples/src/index.js

import { path as mPath } from "macroify/require.macro";
const examplesDir = mPath.resolve(__dirname, "../");

// After you transpile it, everything will be replaced with:
// => const examplesDir = "C:/Users/.../examples";
```

If you want to macroify a local module, you can us the default import:

```js
import m, { path as mPath } from "macroify/require.macro";

// You can use it like a build-time object:
m.value = 12;
m.module = require("./my-module"); // <-- relative to this file

const value = m.module.functionThatReturnsInput(m.value);

// After you transpile it, everything will be replaced with:
// => const value = 12;
```

Default import is a `(v)=>v` function, so you can use it like this too:

```js
// C:/Users/.../index.js

import m from "macroify/require.macro";

const seed = m(Math.random());
const filename = m(__filename);

// After you transpile it, everything will be replaced with:
// => const seed = 0.17373428609998465;
// => const filename = "C:/Users/.../index.js";
```

<a id="limitations"></a>

### Limitations and a thing to remember

In macro calls you **can't** use any local variables, but you **can** use other macros (as long as you import them as shown [above](#approach-a-importing-modules)), JavaScript APIs, and variables that are available in every Node.js module (`require`, `__dirname`, `__filename` and so on):

```js
import m from "macroify/require.macro";

m.upperCase = (s) => s.toUpperCase();

// Bad
const text = "some text";
const upperText = m.upperCase(text);
// When you transpile it:
// => ReferenceError: text is not defined

// Good
m.text = "some text";
const upperText = m.upperCase(m.text);
// When you transpile it:
// => const upperText = "SOME TEXT";
```

Macro call can't return a Promise, and you can't add a _await_ keyword before it.

> If you really need to do something asynchronous (there is no way to do it synchronously) then maybe try to use [this package](https://www.npmjs.com/package/do-sync) to synchronize the function in question.

```js
import m, { path as mPath, fsExtra as mFs } from "macroify/require.macro";

m.file = mPath.resolve(__dirname, "../package.json");

// Bad
const packageName = await mFs.readJson(m.file).name;
// When you transpile it:
// => Error: await keyword not allowed

// Bad
const packageName = mFs.readJson(m.file).name;
// When you transpile it:
// => Error: macro returned a Promise

// Good
const packageName = mFs.readJsonSync(m.file).name;
// When you transpile it:
// => const packageName = "your-package-name";
```

When you use any babel macros be sure to remember how they are processed. No matter where they are, they are always executed (exactly once to be precise):

```js
import m from "macroify/require.macro";

m.value = 0;

if (false) m.value += 1;
while (true) m.value += 1;

function unusedFunction() {
  m.value += 1;
}

const value = m.value;
// This line after you transpile a file:
// => const value = 3;
```

<a id="safety-notice"></a>

### Safety notice

This solution like some other babel plugins / babel macros ([Preval](https://npm.im/babel-plugin-preval), [Codegen](https://www.npmjs.com/package/babel-plugin-codegen), [tinket.macro](https://www.npmjs.com/package/tinker.macro)) during transpilation internally evaluates the code in your macros as code (you know, the evil `eval`). Since macros are only used during development, unless you will intentionally try to preform some malicious actions on your system, it shouldn't be an issue. However keep in mind that it's better to not transpile any untrusted source code (just like you shouldn't run untrusted Node.js code in general).

<a id="approach-a-example-1"></a>

### Example 1 - list of files with certain extension

```js
// src/list-files-with-extension.js

const fs = require("fs");

module.exports = (dir, extension) => {
  const files = fs.readdirSync(dir);
  return files.filter((name) => name.endsWith(extension));
};
```

```js
// src/index.js

import m from "macroify/require.macro";

m.listFiles = require("./list-files-with-extension");

const scripts = m.listFiles(__dirname, ".js");
const stylesheets = m.listFiles(__dirname, ".css");
// When you transpile it:
// => const scripts = [ "index.js", /* ... */ ];
// => const stylesheets = [ /* ... */ ];
```

<a id="approach-a-example-2"></a>

### Example 2 - nesting macros

```js
import m, { lodash as _m } from "../../require.macro";

m.a = [1, 2, 3, 4];
m.b = [1, 2, 5, 6];
m.c = [...m.a, ...m.b];

const value = m.c;
// This line after you transpile a file:
// => const value = [1, 2, 3, 4, 1, 2, 5, 6];

const value2 = _m.reverse(_m.uniq(m.c));
// This line after you transpile a file:
// => const value2 = [6, 5, 4, 3, 2, 1];
```

<a id="approach-a-example-3"></a>

### Example 3 - preval / codegen clones

Ever heard of [preval](https://www.npmjs.com/package/babel-plugin-preval) or [codegen](https://www.npmjs.com/package/babel-plugin-codegen) babel plugins / babel macros? If not, `preval` can be used to pre-evaluate a constant that you want to use in your application, and `codegen` can be used to generate code at build-time. You can easily do both these things with macroify too.

Macroify-style preval:

```js
import m from "macroify/require.macro";

m.preval = (callback) => {
  return callback();
};

const prevaled = m.preval(() => {
  // You can do anything synchronous inside:
  let exponents = [];
  for (let i = 0; i < 5; i++) {
    exponents.push(2 ** i);
  }
  return exponents;
});
// This line after you transpile a file:
// => const prevaled = [1, 2, 4, 8, 16];

const prevaledModule = m.preval(require("./function-that-returns-1"));
// This line after you transpile a file:
// => const prevaledModule = 1;
```

Macroify-style codegen:

```js
import m from "macroify/require.macro";

m.codegen = (callback) => {
  // Use it to tell macroify that you're passing code
  const { CodeWrapper } = require("macroify");
  return CodeWrapper(callback());
};

m.codegen(() => {
  const vars = ["cat", "dog", "bird"].map(
    (animal) => `var ${animal} = "${animal}";`
  );
  return vars.join("\n");
});
// This line after you transpile a file:
// => var cat = "cat";
// => var dog = "dog";
// => var bird = "bird";
```

<a id="approach-a-example-4"></a>

### Example 4

TODO

<br>

<a id="approach-b"></a>

## Approach B - Separate macros (not recommended)

This example shows how you can manually turn any object/module into a classic Babel macro. In this case it will be [Lodash](https://www.npmjs.com/package/lodash), but it could be literally anything.

<a id="approach-b-step-0"></a>

### Step 0 - API

To create a macro we'll use a `macroify(macroFactoryCallback, macroifyOpts)` function.

```js
const { macroify } = require("macroify");
module.exports = macroify(macroFactoryCallback, macroifyOpts);
```

`macroFactoryCallback` (required) : Function

- This function is called when a macro is imported.
- It receives: `{ localName, importName }`.

  - `importName` : String

    It's `"default"` when you import a macro like this: `import macro from './m.macro'`, or the actual import name when you import a macro like this: `import { anything } from './m.macro'`.

  - `localName` : String

    Name of the macro as it's used (it will be different from `importName` when you use `as` statement or when `importName === "default"`).

- It has has to return: `{ obj, allowAssignments, preventOverride, thisConverter }`.

  - `obj` (required)

    The object/module instance that you want to bind to macro.

  - `allowAssignments` (optional) : Boolean, `true`

    When false, assigning or overwriting obj props will be forbidden.

  - `preventOverride` (optional) : Boolean, `true`

    When false, obj won't be treated as a const value, and you'll be able to overwrite it with direct assignment.

    > ⚠️ As of `babel-plugin-macros@3.0.1` direct assignment to a macro (`macro = {...}`) is not detected due to a bug, so this option currently doesn't matter.

  - `thisConverter` (optional) : Function, `(obj)=>{/* Throws error */}`

    When macroify detects that the macro expression returned a value equal to obj, it will call `thisConverter` callback with obj as an argument. Whatever this callback will return will be treated as the actual value that you want to embed in your code. By default, whenever expression returns obj, error is thrown. This is to prevent unintended cluttering of your code with multiple definitions of the same object.

`macroifyOpts` : Object (optional)

- `packageName` (optional) : String, `"macroify"`

  Macro name to be displayed in errors, warnings and logs.

- `consoleLogs` (optional) : Boolean, `false`

  Enable/disable non error/warning console logs (what was changed into what).

<a id="approach-b-step-1"></a>

### Step 1 - Create a .macro.js file

```js
// src/lodash.macro.js

const { macroify } = require("macroify");

const macroFactoryCallback = ({ localName, importName }) => {
  return {
    obj: require("lodash"),
    allowAssignments: false,
  };
};

const macroifyOpts = {
  packageName: "lodash.macro",
  consoleLogs: true,
};

module.exports = macroify(macroFactoryCallback, macroifyOpts);
```

<a id="approach-b-step-2"></a>

### Step 2 - That's it

Now you can use your lodash macro, almost like you would use normal lodash (see: [Limitations](#limitations)
and [Safety notice](#safety-notice)).

Let's use an example from official Lodash docs:

```js
import _m from "./lodash.macro";

const youngestUser = _m
  .chain([
    { user: "barney", age: 36 },
    { user: "fred", age: 40 },
    { user: "pebbles", age: 1 },
  ])
  .sortBy("age")
  .map(function (o) {
    return o.user + " is " + o.age;
  })
  .head()
  .value();
```

After you transcompile it with Babel, you'll get this:

```js
const youngestUser = "pebbles is 1";
```

<a id="why-approach-b-is-not-recommended"></a>

### Why Approach B usually is not recommended?

With approach B, you could face some issues when you start to use other macroifyed modules within your macroifyed function calls. In cases like this it's important to make sure that macros are evaluated in the right order (inner macro expressions first). It's easy to do in theory, but unfortunately when there are many import statements `babel-plugin-macros` by design processes macros from every import statement separately in the order of appearance.

This example bellow illustrates the problem.
This issue can be avoided when you use Approach A instead:

```js
import _m1 from "./lodash.macro";
import _m2 from "./lodash.macro";

// This would work. Macros would be evaluated like this:
// _m1.uniq([1, 1, 2, 2]) => [1,2]
// _m2.reverse([1,2]) => [2,1]
// const value = [2,1]
const value = _m2.reverse(_m1.uniq([1, 1, 2, 2]));

// This would fail. Macros would be evaluated like this:
// _m1.reverse(_m2.uniq([1, 1, 2, 2])) => Error: Excepted constant
const value = _m1.reverse(_m2.uniq([1, 1, 2, 2]));
```

So why Approach B exists? Approach A uses it internally, it's basically an Approach B preset that provides a "good-enough" solution to issues mentioned above. Approach B also will be the better choice, if you want to change how the macro behaves, based on the module import name. You will have to deal with these limitations when you use this macro, though.

<br>

## LICENSE

MIT
