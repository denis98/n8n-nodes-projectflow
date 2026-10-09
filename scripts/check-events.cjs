const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { ProjectFlowTrigger } = require('../dist/nodes/ProjectFlow/ProjectFlowTrigger.node.js');

function backendEvents(backendDir) {
  const declarations = new Map();
  for (const name of ['webhook.ts', 'enums.ts']) {
    const file = path.join(backendDir, 'src/types', name);
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) declarations.set(node.name.text, node.initializer);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  function strings(node, seen = new Set()) {
    if (!node) throw new Error('Webhook catalog declaration is missing');
    if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node)) return strings(node.expression, seen);
    if (ts.isIdentifier(node)) {
      if (seen.has(node.text)) throw new Error('Circular webhook catalog reference');
      return strings(declarations.get(node.text), new Set([...seen, node.text]));
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Set') return strings(node.arguments?.[0], seen);
    if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(element => {
      if (ts.isStringLiteral(element)) return [element.text];
      if (ts.isSpreadElement(element)) return strings(element.expression, seen);
      throw new Error('Unsupported webhook catalog value; update the drift checker');
    });
    throw new Error('Unsupported webhook catalog expression; update the drift checker');
  }
  return new Set(strings(declarations.get('WEBHOOK_EVENTS')));
}
function triggerEvents() {
  return new ProjectFlowTrigger().description.properties.find(property => property.name === 'events').options.map(option => option.value);
}
function compareEvents(expected, actual) {
  return {
    missing: [...expected].filter(event => !actual.includes(event)),
    unsupported: actual.filter(event => !expected.has(event)),
    duplicates: actual.filter((event, index) => actual.indexOf(event) !== index),
  };
}
if (require.main === module) {
  try {
    const index = process.argv.indexOf('--backend');
    const backendDir = index >= 0 ? process.argv[index + 1] : process.env.PROJECTFLOW_BACKEND_DIR;
    if (!backendDir) throw new Error('Pass --backend /path/to/kanban/backend or set PROJECTFLOW_BACKEND_DIR');
    const expected = backendEvents(path.resolve(backendDir));
    const result = compareEvents(expected, triggerEvents());
    if (Object.values(result).some(values => values.length)) throw new Error(JSON.stringify(result));
    console.log(`Trigger matches all ${expected.size} backend webhook events.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { backendEvents, triggerEvents, compareEvents };
