const fs = require("fs");

module.exports = (dir, extension) => {
  const files = fs.readdirSync(dir);
  return files.filter(name => name.endsWith(extension));
};