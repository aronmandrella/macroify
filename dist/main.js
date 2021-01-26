const path = require("path");

const chalk = require("chalk");

const assert = require("assert");

const {
  createMacro,
  MacroError
} = require("babel-plugin-macros");

const {
  isCodeWrapper,
  CodeWrapper,
  astToCode,
  removePath,
  replaceWithCode,
  replaceWithObj,
  findExpressionOuterPath
} = require("./ast-utils");

const evalExpression = require("./eval-expression");

function defaultTo(value, defaultValue) {
  if (value === undefined || value === null) return defaultValue;else return value;
}

function isFunction(fun) {
  return !!(fun && fun.constructor && fun.call && fun.apply);
}

function printError({
  message,
  exit,
  state,
  source,
  packageName
}) {
  const file = state.file.opts.sourceFileName;
  console.log(chalk.red(chalk.bold(`[${packageName}] ERROR : '${source}' macro failed in ${file}\n`) + message + "\n"));
  if (exit !== false) process.exit(1);
}

function printEvalError({
  message,
  code,
  line,
  exit,
  ...PLUGIN_OPTS
}) {
  printError({
    message: chalk.gray(`Line ${line} | `) + chalk.yellow(code) + "\n" + message,
    exit,
    ...PLUGIN_OPTS
  });
}

function referencesToIdentifiers({
  references,
  state,
  source,
  packageName
}) {
  assert(references && state && source, "DEBUG: referencesToIdentifiers - missing object fields.");
  const IDENTIFIERS = [];

  for (const importName in references) {
    if (!references[importName].length) {
      const fileName = state.file.opts.sourceFileName;
      const importCode = "import " + (importName === "default" ? importName : `{ ${importName} }`) + ` from "${source}"`;
      console.log(chalk.yellow(chalk.bold(`[${packageName}] Warning, macro was imported (${importCode}) but never used in ${fileName}.\n`) + "Possible reason: direct assignment is not yet supported due to a bug in babel-plugin-macros 3.0.1.\n" + chalk.magenta("https://github.com/kentcdodds/babel-plugin-macros/issues/167#issuecomment-764806920\n") + "This won't work: " + chalk.red("import macro from 'm.macro'; macro = {};\n") + "but you can do assignment like this: " + chalk.green("import macro from 'm.macro'; macro.something = {};\n")));
      continue;
    }

    const localName = references[importName][0].node.name;
    IDENTIFIERS.push({
      localName,
      importName
    });
  }

  return IDENTIFIERS;
}

function validateMacroSettings({
  macroSettings,
  ...PLUGIN_OPTS
}) {
  if (!macroSettings || !macroSettings.hasOwnProperty("obj")) {
    printError({
      message: "Function passed as a first argument to 'macrofy' didn't return an object with required 'obj' field.",
      ...PLUGIN_OPTS
    });
  }

  const supportedFields = ["obj", "allowAssignments", "preventOverride", "thisConverter"];
  const unsuportedFields = Object.keys(macroSettings).filter(field => supportedFields.indexOf(field) === -1);

  if (unsuportedFields.length) {
    printError({
      message: "Function passed as a first argument to 'macrofy' returned an object with some\n" + "unknown fields: [" + unsuportedFields.join(", ") + "].\nOnly these are supported: [" + supportedFields.join(", ") + "].",
      ...PLUGIN_OPTS
    });
  }

  macroSettings.allowAssignments = defaultTo(macroSettings.allowAssignments, true);
  macroSettings.preventOverride = defaultTo(macroSettings.preventOverride, true);

  macroSettings.thisConverter = macroSettings.thisConverter || (() => {
    const error = new Error("This was probably not intendent as\n" + "as it could lead to cluttering your code with many definitions of the same object.\n" + "If you want to use a macro in this way: " + chalk.white("if(macro){...}") + " or if you are sure that you want\n" + "to return this, please provide a 'thisConverter' callback in your macro configuration.\n" + "There's an example in README.");
    error.title = "Macro returned object this";
    throw error;
  });

  if (!isFunction(macroSettings.thisConverter)) {
    printError({
      message: `Function passed as a first argument to 'macrofy' returned wrong value in a '${binarySetting}' field.\n` + "It has to be a Function. There's an example in README.",
      ...PLUGIN_OPTS
    });
  }

  for (const binarySetting of ["allowAssignments", "preventOverride"]) {
    if (typeof macroSettings[binarySetting] !== "boolean") {
      printError({
        message: `Function passed as a first argument to 'macrofy' returned wrong value in a '${binarySetting}' field.\n` + "It has to be a Boolean (default: true).",
        ...PLUGIN_OPTS
      });
    }
  }
}

function referencesToExpressions({
  references,
  macroFactory,
  ...PLUGIN_OPTS
}) {
  assert(references && macroFactory, "DEBUG: referencesToExpressions - missing object fields.");
  const EXPRESSIONS = [];
  const IDENTIFIERS = referencesToIdentifiers({
    references,
    ...PLUGIN_OPTS
  });

  for (const {
    importName,
    localName
  } of IDENTIFIERS) {
    const macro = macroFactory({
      localName,
      importName
    });
    validateMacroSettings({
      macroSettings: macro,
      ...PLUGIN_OPTS
    });
    macro.importName = importName;
    macro.localName = localName;

    for (const identifierPath of references[importName]) {
      const expressionOuterPath = findExpressionOuterPath(identifierPath, null);
      const expressionCode = astToCode(expressionOuterPath);
      const expressionStart = expressionOuterPath.node.start;
      const expressionEnd = expressionOuterPath.node.end;
      const filename = PLUGIN_OPTS.state.filename;
      const dirname = path.dirname(filename);
      expressionOuterPath.traverse({
        Identifier: path => {
          const node = path.node;

          if (node.name === "__filename") {
            replaceWithObj({
              path,
              obj: filename,
              ...PLUGIN_OPTS
            });
          } else if (node.name === "__dirname") {
            replaceWithObj({
              path,
              obj: dirname,
              ...PLUGIN_OPTS
            });
          }
        }
      });

      if (!macro.allowAssignments) {
        expressionOuterPath.traverse({
          AssignmentExpression(path) {
            if (path.node.start === expressionStart) {
              printEvalError({
                message: "Operation not allowed.\n" + `Property assignment is disabled for this macro (localName: ${localName}).`,
                line: path.node.loc.start.line,
                code: expressionCode,
                ...PLUGIN_OPTS
              });
            }
          }

        });
      }

      if (expressionOuterPath.parentPath.isAwaitExpression()) {
        printEvalError({
          message: chalk.underline(`Await keyword is not allowed here`) + ` : You can't return promises from macros.`,
          line: expressionOuterPath.parentPath.node.loc.start.line,
          code: astToCode(expressionOuterPath.parentPath),
          ...PLUGIN_OPTS
        });
      }

      EXPRESSIONS.push({
        macro,
        expressionOuterPath,
        expressionCode,
        expressionStart,
        expressionEnd,
        identifierPath
      });
    }
  }

  EXPRESSIONS.sort((m1, m2) => m1.expressionStart - m2.expressionStart);
  let previousExpressionEnd = -1;

  for (const macro of EXPRESSIONS) {
    if (macro.expressionEnd > previousExpressionEnd) {
      macro.isNested = false;
      previousExpressionEnd = macro.expressionEnd;
    } else {
      macro.isNested = true;
    }
  }

  EXPRESSIONS.sort((m1, m2) => m1.expressionEnd - m2.expressionEnd);
  return EXPRESSIONS;
}

function processExpression({
  expression,
  ...PLUGIN_OPTS
}) {
  if (!this.EXPRESSION_TEMP_RESULTS) {
    this.EXPRESSION_TEMP_RESULTS = [];

    this.getTempResult = i => {
      assert(typeof i === "number", "DEBUG: i has to be a number.");
      assert(this.EXPRESSION_TEMP_RESULTS.hasOwnProperty(i), "DEBUG: Temp value with index doesn't exist.");
      return this.EXPRESSION_TEMP_RESULTS[i];
    };

    this.pushTempResult = value => {
      this.EXPRESSION_TEMP_RESULTS.push(value);
      return this.EXPRESSION_TEMP_RESULTS.length - 1;
    };
  }

  const {
    macro,
    isNested,
    expressionCode,
    expressionOuterPath
  } = expression;
  const filename = PLUGIN_OPTS.state.filename;
  const dirname = path.dirname(filename);
  let result = evalExpression({
    __macroify__: {
      expression,
      filename,
      dirname,
      getTempResult: this.getTempResult
    }
  });

  if (Promise.resolve(result) === result) {
    const error = new Error("You can't run asynchronous code in macros.\n" + "https://github.com/kentcdodds/babel-plugin-macros/issues/62\n" + "If you can do that synchronously, you can try synchronizing your function with 'do-sync' NPM package,\n" + "but be aware that it will run slow, and there are some limitations.");
    error.title = "Macro returned a promise";
    throw error;
  }

  if (isNested) {
    replaceWithCode({
      path: expressionOuterPath,
      code: `__macroify__.getTempResult(${this.pushTempResult(result)})`,
      ...PLUGIN_OPTS
    });
  } else {
      if (!isCodeWrapper(result) && expressionOuterPath.isExpressionStatement()) {
        removePath({
          path: expressionOuterPath,
          ...PLUGIN_OPTS
        });
      } else {
          if (result === macro.obj) {
            result = macro.thisConverter(macro.obj);
          }

          replaceWithObj({
            path: expressionOuterPath,
            obj: result,
            ...PLUGIN_OPTS
          });
        }

      this.EXPRESSION_TEMP_RESULTS = [];
    }
}

const macroify = function (macroFactory, macroifyOpts = {}) {
  if (!isFunction(macroFactory)) {
    throw new MacroError(chalk.red(chalk.bold("\nMACRO SETTINGS ERROR:") + "\n'macroFactory' has to be a function that receives an object with " + "'importName' and 'localName' fields,\nand returns an object with the following fields:\n" + `{obj (required), thisConverter (optional), preventOverride (optional), allowAssignments (optional) }.\n` + `Read README for more details.\n`));
  }

  return createMacro(function ({
    references,
    state,
    babel,
    source,
    config
  }) {
    const PLUGIN_OPTS = {
      state,
      babel,
      source,
      packageName: macroifyOpts.packageName || "macroify",
      consoleLogs: macroifyOpts.consoleLogs || false
    };
    const EXPRESSIONS = referencesToExpressions({
      references,
      macroFactory,
      ...PLUGIN_OPTS
    });

    for (const expression of EXPRESSIONS) {
      const expressionOuterPath = expression.expressionOuterPath;
      const expressionOriginalCode = expression.expressionCode;
      expression.expressionCode = astToCode(expressionOuterPath);

      try {
        processExpression({
          expression,
          ...PLUGIN_OPTS
        });
      } catch (error) {
        error.stack = error.stack.replace(error.name + ":", "");
        error.stack = error.stack.replace(error.message, "");
        printEvalError({
          message: `${chalk.underline(error.title || error.name)} : ${error.message}` + chalk.white(error.stack),
          line: expressionOuterPath.node.loc.start.line,
          code: expressionOriginalCode,
          ...PLUGIN_OPTS
        });
      }
    }
  });
};

module.exports = {
  macroify,
  CodeWrapper
};