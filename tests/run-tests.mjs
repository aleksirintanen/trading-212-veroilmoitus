import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch (_) {
    threw = true;
  }
  if (!threw) {
    throw new Error(message);
  }
}

function assertThrowsMessage(fn, expectedMessagePart, message) {
  try {
    fn();
  } catch (error) {
    if (String(error?.message || '').includes(expectedMessagePart)) {
      return;
    }
    throw new Error(`${message}. Actual: ${error?.message || '(no message)'}`);
  }
  throw new Error(message);
}

const corePath = path.resolve(process.cwd(), 'docs/assets/js/core/core-engine.js');
const coreSource = fs.readFileSync(corePath, 'utf8');

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

const elements = new Map();
const getEl = (id) => {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      value: id === 'formatSelect' ? 'trading212' : '',
      innerHTML: '',
      textContent: '',
      dataset: {},
      checked: false,
      files: [],
      style: {},
      disabled: false,
      addEventListener() {},
      classList: { add() {}, remove() {}, toggle() {} }
    });
  }
  return elements.get(id);
};

const sandbox = {
  console,
  Date,
  Math,
  Intl,
  Blob,
  URL,
  setTimeout,
  clearTimeout,
  alert() {},
  window: {},
  document: {
    getElementById: getEl,
    createElement() {
      return {
        textContent: '',
        className: '',
        classList: { add() {}, remove() {}, toggle() {} },
        appendChild() {},
        replaceChildren() {},
        style: {}
      };
    },
    createTextNode(text) {
      return { textContent: text };
    },
    createDocumentFragment() {
      return { appendChild() {} };
    },
    querySelector() {
      return {
        innerHTML: '',
        appendChild() {},
        classList: { add() {}, remove() {}, toggle() {} }
      };
    },
    addEventListener() {}
  },
  jspdf: {
    jsPDF: function() {
      return {};
    }
  }
};

sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(coreSource, sandbox, { filename: 'core-engine.js' });

assert(typeof sandbox.parseCSV === 'function', 'parseCSV was not loaded');
assert(typeof sandbox.parseDate === 'function', 'parseDate was not loaded');
assert(typeof sandbox.getTaxRulesForYear === 'function', 'getTaxRulesForYear was not loaded');
assert(typeof sandbox.estimateCapitalTax === 'function', 'estimateCapitalTax was not loaded');
assert(typeof sandbox.runInternalTests === 'function', 'runInternalTests was not loaded');

const internal = sandbox.runInternalTests();
assert(internal?.ok === true, 'runInternalTests did not return ok=true');

const parsedWithComma = sandbox.parseCSV(
  'Action,Time,Ticker,No. of shares,Gross Total,Currency (Gross Total),Currency conversion fee\n' +
  '"Dividend (Foo, Inc)",2025-03-20 00:00:00,FOO,0,25.00,EUR,0.00\n'
);
assert(parsedWithComma.length === 1, 'Quoted CSV row count mismatch');
assert(parsedWithComma[0].action === 'Dividend (Foo, Inc)', 'Quoted comma parsing failed');

const parsedMultiline = sandbox.parseCSV(
  'date,type,symbol,qty,price_eur,fee_eur,name\n' +
  '2025-01-15,BUY,AAPL,1,150.00,0.00,"Apple\nInc"\n'
);
assert(parsedMultiline.length === 1, 'Multiline quoted CSV row count mismatch');
assert(parsedMultiline[0].name === 'Apple\nInc', 'Multiline quoted field parsing failed');

const parsedSemicolon = sandbox.parseCSV(
  'date;type;symbol;qty;price_eur;fee_eur\n' +
  '2025-01-15;BUY;AAPL;1;150.00;0.00\n'
);
assert(parsedSemicolon.length === 1, 'Semicolon CSV row count mismatch');
assert(parsedSemicolon[0].type === 'BUY', 'Semicolon delimiter parsing failed');

assertThrowsMessage(
  () => sandbox.parseManual([{ date: '2025-02-30', type: 'BUY', symbol: 'AAPL', qty: '1', price_eur: '150', fee_eur: '0' }]),
  'Rivi 2',
  'parseManual should include row number in validation error'
);

const parsedDate = sandbox.parseDate('2025-03-20 14:22:59');
assert(parsedDate.getFullYear() === 2025, 'parseDate year mismatch');
assert(parsedDate.getMonth() === 2, 'parseDate month mismatch');
assert(parsedDate.getDate() === 20, 'parseDate day mismatch');
assert(parsedDate.getHours() === 14, 'parseDate hour mismatch');
assert(parsedDate.getMinutes() === 22, 'parseDate minute mismatch');
assert(parsedDate.getSeconds() === 59, 'parseDate second mismatch');

assertThrows(
  () => sandbox.parseDate('2025-02-30'),
  'parseDate should reject invalid calendar dates'
);

const rules2025 = sandbox.getTaxRulesForYear(2025);
assert(rules2025.capitalIncomeBracketEur === 30000, 'tax rule bracket mismatch for 2025');

const rulesFallback = sandbox.getTaxRulesForYear(2030);
assert(rulesFallback.capitalIncomeBracketEur === 30000, 'tax rule fallback should use latest known year');

const expectedTax = 30000 * 0.30 + 10000 * 0.34;
const estimatedTax = sandbox.estimateCapitalTax(40000, rules2025);
assert(Math.abs(estimatedTax - expectedTax) < 1e-9, 'estimateCapitalTax mismatch with explicit rules');

const smokeScripts = [
  'docs/assets/js/core/core-engine.js',
  'docs/assets/js/ui/preview-ui.js',
  'docs/assets/js/ui/pdf-export.js',
  'docs/assets/js/app-tax-calculation.js',
  'docs/assets/js/app-exports.js',
  'docs/assets/js/app-init.js'
];

for (const scriptPath of smokeScripts) {
  vm.runInContext(readSource(scriptPath), sandbox, { filename: path.basename(scriptPath) });
}

assert(typeof sandbox.AppCore === 'object', 'Smoke test: AppCore missing');
assert(typeof sandbox.AppPreviewUi === 'object', 'Smoke test: AppPreviewUi missing');
assert(typeof sandbox.AppPdfExport === 'object', 'Smoke test: AppPdfExport missing');
assert(typeof sandbox.calculateTaxes === 'function', 'Smoke test: calculateTaxes missing');
assert(typeof sandbox.exportAsJSON === 'function', 'Smoke test: exportAsJSON missing');
assert(typeof sandbox.exportFifoAuditCSV === 'function', 'Smoke test: exportFifoAuditCSV missing');
assert(typeof sandbox.exportDividendsCSV === 'function', 'Smoke test: exportDividendsCSV missing');
assert(typeof sandbox.exportInterestsCSV === 'function', 'Smoke test: exportInterestsCSV missing');
assert(typeof sandbox.exportTaxSummaryPdf === 'function', 'Smoke test: exportTaxSummaryPdf missing');
assert(typeof sandbox.toggleSales === 'function', 'Smoke test: toggleSales missing');
assert(typeof sandbox.toggleFifoAudit === 'function', 'Smoke test: toggleFifoAudit missing');
assert(typeof sandbox.toggleDividends === 'function', 'Smoke test: toggleDividends missing');
assert(typeof sandbox.toggleInterests === 'function', 'Smoke test: toggleInterests missing');
assert(typeof sandbox.initializeTrading212App === 'function', 'Smoke test: initializeTrading212App missing');
assert(typeof sandbox.loadDemoData === 'function', 'Smoke test: loadDemoData missing');
assert(typeof sandbox.exitDemoMode === 'function', 'Smoke test: exitDemoMode missing');

sandbox.initializeTrading212App();

console.log('✅ All tests passed');
