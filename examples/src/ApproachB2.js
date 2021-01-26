import m from "../../require.macro";

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

const prevaledModule = m.preval(require("./function-that-returns-1"));

m.codegen = (callback) => {
  const { CodeWrapper } = require("../../dist/main");
  return CodeWrapper(callback());
};

m.codegen(() => {
  const vars = ["cat", "dog", "bird"].map(
    (animal) => `var ${animal} = "${animal}";`
  );
  return vars.join("\n");
});
