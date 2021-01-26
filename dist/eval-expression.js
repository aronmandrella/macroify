__module_require__ = require;

module.exports = function ({
  __macroify__
}) {
  if (!__macroify__.filename) throw new Error("DEBUG: __macroify__.filename missing.");

  const require = __module_require__("create-require")(__macroify__.filename);

  require("assert")(__macroify__ && __macroify__.expression && __macroify__.expression.macro && __macroify__.expression.macro.localName && __macroify__.expression.macro.importName && __macroify__.expression.macro.hasOwnProperty("obj") && __macroify__.expression.macro.hasOwnProperty("preventOverride") && __macroify__.expression.expressionCode, "DEBUG: eval-expression, missing arguments.");

  const __relative_expression_code__ = __macroify__.expression.expressionCode.slice(__macroify__.expression.macro.localName.length);

  try {
    if (__macroify__.expression.macro.preventOverride) {
      return eval(`
        (()=>{
            const __macro_const_obj__ = __macroify__.expression.macro.obj;
            return __macro_const_obj__${__relative_expression_code__}
        })()
    `);
    } else {
        return eval(`
        (()=>{
            return __macroify__.expression.macro.obj${__relative_expression_code__}
        })()
    `);
      }
  } catch (error) {
    error.title = "Code evaluation failed";
    error.message = error.message.replace(new RegExp("__macro_const_obj__", "g"), __macroify__.expression.macro.localName).replace(new RegExp("__macroify__.expression.macro.obj", "g"), __macroify__.expression.macro.localName);
    throw error;
  }
};