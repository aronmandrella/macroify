const chalk = require("chalk");

const assert = require("assert");

const {
  stringify
} = require("javascript-stringify");

const generate = require("@babel/generator").default;

function isStringAssert(string) {
  assert(typeof string === "string" || string instanceof String, `Function expected to get a string, but got: ${string}.`);
}

function isASTPathAssert(path) {
  assert(path && path.parentPath && path.node !== undefined, "DEBUG: Falsy or not an AST path.");
}

function isASTNodeAssert(node) {
  assert(node && node.type && path.parentPath === undefined, "DEBUG: Falsy or not an AST node.");
}

const CodeWrapperProp = "__isMacroifyCodeWrapper";

function CodeWrapper(code) {
  if (typeof code !== "string" && !(code instanceof String)) {
    const error = new Error(`CodeWrapper wrapper accepts string. Received: ${code}.`);
    error.title = "Wrong data type";
    throw error;
  }

  const wrapper = {};
  wrapper.code = code;
  wrapper[CodeWrapperProp] = true;
  return wrapper;
}

function isCodeWrapper(obj) {
  return obj && obj[CodeWrapperProp];
}

function objectToCode(obj) {
  if (isCodeWrapper(obj)) {
    return obj.code;
  } else {
      const stringifyValue = function (value, indent, _stringify) {
        if (isCodeWrapper(value)) {
          return value.code;
        }

        return _stringify(value);
      };

      try {
        return "(" + stringify(obj, stringifyValue, 2, {
          maxDepth: Number.MAX_SAFE_INTEGER,
          maxValues: Number.MAX_SAFE_INTEGER,
          references: true,
          skipUndefinedProperties: false
        }) + ")";
      } catch (error) {
        error.message = "Unable to convert provided object to code, " + error.message;
        throw error;
      }
    }
}

function codeToAST({
  code,
  state,
  babel
}) {
  assert(state, "DEBUG: Didn't pass state obj.");
  assert(babel, "DEBUG: Didn't pass babel obj.");
  isStringAssert(code);
  const babelParserOptions = state.file.opts.parserOpts;

  try {
    return babel.template.smart(code, {
      preserveComments: true,
      placeholderPattern: false,
      syntacticPlaceholders: false,
      sourceType: "module",
      ...babelParserOptions
    })();
  } catch (error) {
    error.message = "Unable to create AST (abstract syntax tree) due to problems with provided code, " + error.message;
    throw error;
  }
}

function astToCode(ast) {
  assert(ast, "DEBUG: Passed ast (node/path) node was falsy.");
  const node = ast.parentPath ? ast.node : ast;
  return generate(node, {
    comments: false
  }).code;
}

function removePath({
  path,
  state,
  consoleLogs = false,
  packageName = "macroify"
}) {
  isASTPathAssert(path);
  const line = path.node.loc.start.line;
  const sourceCode = astToCode(path.node);
  path.remove();

  if (consoleLogs) {
    const fileName = state.file.opts.sourceFileName;
    console.log(chalk.cyan(chalk.bold(`[${packageName}] Source code removal log (${fileName})\n`) + chalk.underline("Removed:\n") + chalk.gray(`Line ${line} | `) + chalk.white(sourceCode) + "\n"));
  }
}

function replaceWithCode({
  path,
  code,
  state,
  babel,
  source,
  consoleLogs,
  packageName
}) {
  assert(source, "DEBUG: Didn't pass source obj.");
  isASTPathAssert(path);
  const line = path.node.loc.start.line;
  const originalCode = astToCode(path.node);
  const astNode = codeToAST({
    code,
    state,
    babel
  });
  path.replaceWithMultiple(astNode);

  if (consoleLogs) {
    const fileName = state.file.opts.sourceFileName;
    console.log(chalk.cyan(chalk.bold(`[${packageName}] Source code replacement log (${fileName})\n`) + chalk.underline("Replaced:\n") + chalk.gray(`Line ${line} | `) + chalk.white(originalCode) + chalk.underline("\nWith:\n") + chalk.white(code) + "\n"));
  }
}

function replaceWithObj({
  path,
  obj = "",
  ...replaceWithCodeOpts
}) {
  replaceWithCode({
    path,
    code: objectToCode(obj),
    ...replaceWithCodeOpts
  });
}

function evaluatePath({
  path,
  babel,
  state,
  source
}) {
  isASTPathAssert(path);
  const {
    value,
    confident
  } = path.evaluate();

  if (confident) {
    replaceWithObj({
      path,
      obj: value,
      babel,
      state,
      source
    });
    return true;
  } else {
      return false;
    }
}

function evaluateChildrenIdentifiers({
  path,
  babel,
  state,
  source
}) {
  isASTPathAssert(path);
  path.traverse({
    Identifier: childPath => {
      evaluatePath({
        path: childPath,
        babel,
        state,
        source
      });
    }
  });
}

function findExpressionOuterPath(path, expressionStart = null) {
  isASTPathAssert(path);
  if (!expressionStart) expressionStart = path.node.start;
  const parentPath = path.findParent(p => p.isCallExpression() || p.isMemberExpression() || p.isAssignmentExpression() || p.isExpressionStatement());

  if (parentPath && parentPath.node.start === expressionStart) {
    return findExpressionOuterPath(parentPath, parentPath.node.start);
  }

  return path;
}

module.exports = {
  isStringAssert,
  isASTNodeAssert,
  isASTPathAssert,
  isCodeWrapper,
  CodeWrapper,
  objectToCode,
  codeToAST,
  astToCode,
  removePath,
  replaceWithCode,
  replaceWithObj,
  evaluateChildrenIdentifiers,
  findExpressionOuterPath
};