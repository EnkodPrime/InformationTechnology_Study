/* Помощник за тестовете: зарежда js/alpha.js в контекста на харнеса (главите го ползват по време на изпълнение). */
const fs = require("fs"), path = require("path"), vm = require("vm");
module.exports = function (t) {
  const f = path.join(__dirname, "..", "js", "alpha.js");
  vm.runInContext(fs.readFileSync(f, "utf8"), t.ctx, { filename: f });
  return t.ctx.T10;
};
