import m, { lodash as _m } from "../../require.macro";

m.listFiles = require("./list-files-with-extension");

const scripts = m.listFiles(__dirname, ".js");
const stylesheets = m.listFiles(__dirname, ".css");

m.a = [1, 2, 3, 4];
m.b = [1, 2, 5, 6];
m.c = [...m.a, ...m.b];
const value = m.c;

const value2 = _m.reverse(_m.uniq(m.c));
