const {
  macroify
} = require("../../dist/main");

const macroFactoryCallback = ({
  localName,
  importName
}) => {
  return {
    obj: require("lodash"),
    allowAssignments: false
  };
};

const macroifyOpts = {
  packageName: "lodash.macro",
  consoleLogs: false
};
module.exports = macroify(macroFactoryCallback, macroifyOpts);