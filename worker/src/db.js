// D1 database adapter — same interface as backend/src/db.js but async + D1

let _d1 = null;

function init(d1Binding) {
  _d1 = d1Binding;
}

async function run(sql, params = []) {
  return _d1.prepare(sql).bind(...params).run();
}

async function get(sql, params = []) {
  return _d1.prepare(sql).bind(...params).first();
}

async function all(sql, params = []) {
  const result = await _d1.prepare(sql).bind(...params).all();
  return result.results;
}

async function exec(sql) {
  return _d1.exec(sql);
}

export { init, run, get, all, exec };
