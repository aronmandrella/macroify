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

/*
  import _m1 from "./lodash.macro";
  import _m2 from "./lodash.macro";

  const value = _m1.reverse(_m2.uniq([1, 1, 2, 2]));
*/
