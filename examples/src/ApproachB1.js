import m, { path as mPath, fsExtra as mFs } from "../../require.macro";

const examplesDir = mPath.resolve(__dirname, "../");

const cwd = mPath.resolve(".");

const packageName = mFs.readJsonSync(
  mPath.resolve(__dirname, "../../package.json")
).name;

// Zmienne

m.upperCase = (s) => s.toUpperCase();
m.text = "some text";
const upperText = m.upperCase(m.text);

// Zasady wywoływania

m.value = 0;

if (false) m.value += 1;
while (true) m.value += 1;

function unusedFunction() {
  m.value += 1;
}

const value = m.value;

//
