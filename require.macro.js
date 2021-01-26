const { macroify } = require("./dist/main");
const { paramCase } = require("param-case");

// Function that provides underling macro objects
function macroFactory(opts) {
  var importName = opts.importName;

  return {
    // Default import : can be used to create a storage
    // Named imports : can be used to macroify any installed Node module
    obj:
      importName === "default"
        ? function (v) {
            return v;
          }
        : require(paramCase(importName)),

    // Other options:
    allowAssignments: true,
    preventOverride: true,
    thisConverter: undefined,
  };
}

// General macroify settings (console log related)
const macroifyOpts = {
  packageName: "macroify/require.macro",
  consoleLogs: Boolean(process.env.MACROIFY_LOGS),
};

// macroify/require.macro preset
module.exports = macroify(macroFactory, macroifyOpts);
