(function(global) {
    const HAS_DECIMAL = typeof global.Decimal === 'function';

    function toNumeric(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    }

    function decimalAdd(a, b) {
        if (HAS_DECIMAL) return new global.Decimal(a).plus(b).toNumber();
        return toNumeric(a) + toNumeric(b);
    }

    function decimalSub(a, b) {
        if (HAS_DECIMAL) return new global.Decimal(a).minus(b).toNumber();
        return toNumeric(a) - toNumeric(b);
    }

    function decimalMul(a, b) {
        if (HAS_DECIMAL) return new global.Decimal(a).times(b).toNumber();
        return toNumeric(a) * toNumeric(b);
    }

    function decimalDiv(a, b) {
        const divisor = toNumeric(b);
        if (Math.abs(divisor) <= 1e-18) return 0;
        if (HAS_DECIMAL) return new global.Decimal(a).div(b).toNumber();
        return toNumeric(a) / divisor;
    }

    function decimalAbs(a) {
        if (HAS_DECIMAL) return new global.Decimal(a).abs().toNumber();
        return Math.abs(toNumeric(a));
    }

    const TAX_RULES_BY_YEAR = {
        2025: {
            capitalIncomeBracketEur: 30_000,
            capitalTaxLow: 0.30,
            capitalTaxHigh: 0.34,
            listedDividendTaxableShare: 0.85,
            deemedCostUnder10Y: 0.20,
            deemedCost10YOrMore: 0.40,
            custodyDeductibleExcess: 50.0
        }
    };

    function getTaxRulesForYear(year) {
        return resolveTaxRulesForYear(year).rules;
    }

    function resolveTaxRulesForYear(year) {
        const numericYear = Number(year);
        const availableYears = Object.keys(TAX_RULES_BY_YEAR)
            .map(Number)
            .sort((a, b) => a - b);

        if (availableYears.length === 0) {
            throw new Error('Verosääntöjä ei ole määritelty');
        }

        if (Number.isFinite(numericYear) && TAX_RULES_BY_YEAR[numericYear]) {
            return { ruleYear: numericYear, rules: TAX_RULES_BY_YEAR[numericYear] };
        }

        if (Number.isFinite(numericYear)) {
            const fallbackYear = [...availableYears].reverse().find(y => y <= numericYear);
            if (fallbackYear) {
                return { ruleYear: fallbackYear, rules: TAX_RULES_BY_YEAR[fallbackYear] };
            }
        }

        const latestYear = availableYears[availableYears.length - 1];
        return { ruleYear: latestYear, rules: TAX_RULES_BY_YEAR[latestYear] };
    }

    class Lot {
        constructor(acquired, qty, purchaseTotal, acquisitionFeeTotal) {
            this.acquired = acquired;
            this.qty = qty;
            this.originalQty = qty;
            this.purchaseTotal = purchaseTotal;
            this.acquisitionFeeTotal = acquisitionFeeTotal;
        }

        get unitPurchaseCost() {
            return this.qty > 0 ? decimalDiv(this.purchaseTotal, this.qty) : 0;
        }

        get unitAcquisitionFee() {
            return this.qty > 0 ? decimalDiv(this.acquisitionFeeTotal, this.qty) : 0;
        }

        get unitCostTotal() {
            return decimalAdd(this.unitPurchaseCost, this.unitAcquisitionFee);
        }
    }

    class SaleResult {
        constructor(symbol, symbolName, soldDate, qty, proceedsEur, sellFeesEur, acquisitionPriceEur, acquisitionFeesEur, actualCostEur, deemedCostEur, methodUsed, gainEur, lotsUsed) {
            this.symbol = symbol;
            this.symbolName = symbolName;
            this.soldDate = soldDate;
            this.qty = qty;
            this.proceedsEur = proceedsEur;
            this.sellFeesEur = sellFeesEur;
            this.feesEur = sellFeesEur;
            this.acquisitionPriceEur = acquisitionPriceEur;
            this.acquisitionFeesEur = acquisitionFeesEur;
            this.actualCostEur = actualCostEur;
            this.deemedCostEur = deemedCostEur;
            this.methodUsed = methodUsed;
            this.gainEur = gainEur;
            this.lotsUsed = lotsUsed;
        }
    }

    class FifoBook {
        constructor(taxRules = getTaxRulesForYear(new Date().getFullYear())) {
            this.lots = {};
            this.taxRules = taxRules;
        }

        getLots(symbol) {
            if (!this.lots[symbol]) {
                this.lots[symbol] = [];
            }
            return this.lots[symbol];
        }

        buy(symbol, date, qty, purchasePriceTotalEur, acquisitionFeeEur = 0) {
            if (qty <= 0) throw new Error(`BUY qty must be > 0 (got ${qty})`);
            this.getLots(symbol).push(new Lot(date, qty, purchasePriceTotalEur, acquisitionFeeEur));
        }

        applySplit(symbol, ratio) {
            if (ratio <= 0) throw new Error('split ratio must be > 0');
            for (let lot of this.getLots(symbol)) {
                lot.qty = decimalMul(lot.qty, ratio);
                lot.originalQty = decimalMul(lot.originalQty, ratio);
            }
        }

        sell(symbol, symbolName, date, qty, proceedsEur, feeEur) {
            if (qty <= 0) throw new Error(`SELL qty must be > 0 (got ${qty})`);

            const lots = this.getLots(symbol);
            let remaining = qty;
            const lotsUsed = [];
            let actualPurchaseCost = 0;
            let actualAcquisitionFees = 0;

            while (remaining > 1e-12) {
                if (lots.length === 0) {
                    throw new Error(`Not enough lots to sell ${qty} ${symbol} on ${date}. Missing acquisition history.`);
                }

                const lot = lots[0];
                const take = Math.min(lot.qty, remaining);
                const lotQtyBeforeSale = lot.qty;
                const purchasePiece = decimalMul(lot.unitPurchaseCost, take);
                const acquisitionFeePiece = decimalMul(lot.unitAcquisitionFee, take);
                const totalCostPiece = decimalAdd(purchasePiece, acquisitionFeePiece);
                actualPurchaseCost = decimalAdd(actualPurchaseCost, purchasePiece);
                actualAcquisitionFees = decimalAdd(actualAcquisitionFees, acquisitionFeePiece);

                lot.qty = decimalSub(lot.qty, take);
                lot.purchaseTotal = decimalSub(lot.purchaseTotal, purchasePiece);
                lot.acquisitionFeeTotal = decimalSub(lot.acquisitionFeeTotal, acquisitionFeePiece);
                const lotQtyAfterSale = lot.qty;

                lotsUsed.push([
                    lot.acquired,
                    take,
                    purchasePiece,
                    acquisitionFeePiece,
                    totalCostPiece,
                    lot.originalQty,
                    lotQtyBeforeSale,
                    lotQtyAfterSale
                ]);
                remaining = decimalSub(remaining, take);

                if (lot.qty <= 1e-12) {
                    lots.shift();
                }
            }

            const proceeds = proceedsEur;

            const holdingDaysMin = Math.min(...lotsUsed.map(([acq]) =>
                Math.floor((date - acq) / (1000 * 60 * 60 * 24))
            ));
            const deemedRate = holdingDaysMin >= 3650
                ? this.taxRules.deemedCost10YOrMore
                : this.taxRules.deemedCostUnder10Y;
            const deemedCost = decimalMul(proceeds, deemedRate);
            const actualCost = decimalAdd(actualPurchaseCost, actualAcquisitionFees);

            const gainActual = decimalSub(decimalSub(proceeds, actualCost), feeEur);
            const gainDeemed = decimalSub(proceeds, deemedCost);

            let method, gain;
            if (gainDeemed < gainActual) {
                method = 'DEEMED';
                gain = gainDeemed;
            } else {
                method = 'ACTUAL';
                gain = gainActual;
            }

            return new SaleResult(
                symbol,
                symbolName,
                date,
                qty,
                proceeds,
                feeEur,
                actualPurchaseCost,
                actualAcquisitionFees,
                actualCost + feeEur,
                deemedCost,
                method,
                gain,
                lotsUsed
            );
        }
    }

    function estimateCapitalTax(netCapitalIncome, taxRules = getTaxRulesForYear(new Date().getFullYear())) {
        if (netCapitalIncome <= 0) return 0;
        const low = Math.min(netCapitalIncome, taxRules.capitalIncomeBracketEur);
        const high = Math.max(0, netCapitalIncome - taxRules.capitalIncomeBracketEur);
        return decimalAdd(decimalMul(low, taxRules.capitalTaxLow), decimalMul(high, taxRules.capitalTaxHigh));
    }

    function parseDate(dateString) {
        const input = String(dateString || '').trim();
        const match = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);

        if (!match) {
            throw new Error(`Virheellinen päivämäärämuoto: "${input}". Käytä muotoa YYYY-MM-DD tai YYYY-MM-DD HH:mm:ss`);
        }

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const hour = Number(match[4] ?? 0);
        const minute = Number(match[5] ?? 0);
        const second = Number(match[6] ?? 0);

        if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
            throw new Error(`Virheellinen päivämäärä: "${input}"`);
        }

        const date = new Date(year, month - 1, day, hour, minute, second, 0);
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== (month - 1) ||
            date.getDate() !== day ||
            date.getHours() !== hour ||
            date.getMinutes() !== minute ||
            date.getSeconds() !== second
        ) {
            throw new Error(`Virheellinen päivämäärä: "${input}"`);
        }

        return date;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('fi-FI', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    function formatNumber(value) {
        return new Intl.NumberFormat('fi-FI', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    function formatQuantity(value) {
        return new Intl.NumberFormat('fi-FI', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 20,
            useGrouping: false
        }).format(Number(value || 0));
    }

    function formatQuantityCsv(value) {
        return Number(value || 0).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 20,
            useGrouping: false
        });
    }

    function getSaleCostUsed(sale) {
        return sale.methodUsed === 'DEEMED' ? sale.deemedCostEur : sale.actualCostEur;
    }

    function sanitizeQuotedText(value) {
        return String(value || '')
            .trim()
            .replace(/^['"`]+/, '')
            .replace(/['"`]+$/, '')
            .trim();
    }

    function getSymbolNameFromRow(row) {
        return sanitizeQuotedText(row['name'] || row['instrument'] || row['company'] || '');
    }

    function formatInstrumentDisplay(symbol, symbolName) {
        const cleanSymbol = sanitizeQuotedText(symbol);
        const cleanName = sanitizeQuotedText(symbolName);
        if (!cleanName) return cleanSymbol;
        if (cleanName.toUpperCase() === cleanSymbol.toUpperCase()) return cleanSymbol;
        return `${cleanName} (${cleanSymbol})`;
    }

    function formatSaleInstrumentDisplay(sale) {
        return formatInstrumentDisplay(sale.symbol, sale.symbolName);
    }

    function formatDeemedCostDisplay(sale) {
        return sale.methodUsed === 'DEEMED' ? formatCurrency(sale.deemedCostEur) : '-';
    }

    function formatDeemedCostCsv(sale) {
        return sale.methodUsed === 'DEEMED'
            ? formatNumber(sale.deemedCostEur).replace(',', '.')
            : '-';
    }

    function formatAcquisitionDate(lotsUsed) {
        if (!lotsUsed || lotsUsed.length === 0) return '-';
        const uniqueDates = [...new Set(lotsUsed.map(([acq]) => acq.toLocaleDateString('fi-FI')))];
        if (uniqueDates.length === 1) return uniqueDates[0];

        const sorted = lotsUsed
            .map(([acq]) => acq)
            .sort((a, b) => a - b);
        const first = sorted[0].toLocaleDateString('fi-FI');
        const last = sorted[sorted.length - 1].toLocaleDateString('fi-FI');
        return `${first}–${last}`;
    }

    function expandSaleRowsForReporting(sales) {
        const rows = [];

        for (const sale of [...(sales || [])].sort((a, b) => a.soldDate - b.soldDate)) {
            const lots = sale.lotsUsed || [];
            const totalQty = Number(sale.qty || 0);
            const hasQty = decimalAbs(totalQty) > 1e-12;

            if (!lots.length) {
                rows.push({
                    symbol: sale.symbol,
                    symbolName: sale.symbolName,
                    qty: sale.qty,
                    acquiredDate: sale.soldDate,
                    soldDate: sale.soldDate,
                    proceedsEur: sale.proceedsEur,
                    acquisitionPriceEur: sale.acquisitionPriceEur,
                    acquisitionFeesEur: sale.acquisitionFeesEur,
                    sellFeesEur: sale.sellFeesEur,
                    deemedCostEur: sale.deemedCostEur,
                    methodUsed: sale.methodUsed,
                    gainEur: sale.gainEur
                });
                continue;
            }

            for (const lot of lots) {
                const [acquiredDate, lotQty, purchasePiece, acquisitionFeePiece, _totalCostPiece, lotOriginalQty, lotQtyBeforeSale, lotQtyAfterSale] = lot;
                const weight = hasQty ? decimalDiv(lotQty, totalQty) : 0;
                const proceedsPiece = decimalMul(sale.proceedsEur, weight);
                const sellFeesPiece = decimalMul(sale.sellFeesEur, weight);
                const deemedCostPiece = decimalMul(sale.deemedCostEur, weight);
                const gainPiece = sale.methodUsed === 'DEEMED'
                    ? decimalSub(proceedsPiece, deemedCostPiece)
                    : decimalSub(decimalSub(decimalSub(proceedsPiece, purchasePiece), acquisitionFeePiece), sellFeesPiece);

                rows.push({
                    symbol: sale.symbol,
                    symbolName: sale.symbolName,
                    qty: lotQty,
                    acquiredDate: acquiredDate,
                    soldDate: sale.soldDate,
                    proceedsEur: proceedsPiece,
                    acquisitionPriceEur: purchasePiece,
                    acquisitionFeesEur: acquisitionFeePiece,
                    sellFeesEur: sellFeesPiece,
                    deemedCostEur: deemedCostPiece,
                    methodUsed: sale.methodUsed,
                    gainEur: gainPiece,
                    lotOriginalQty: Number.isFinite(lotOriginalQty) ? lotOriginalQty : lotQty,
                    lotQtyBeforeSale: Number.isFinite(lotQtyBeforeSale) ? lotQtyBeforeSale : lotQty,
                    lotQtyAfterSale: Number.isFinite(lotQtyAfterSale) ? lotQtyAfterSale : 0
                });
            }
        }

        return rows;
    }

    function countDelimiterOutsideQuotes(line, delimiter) {
        let inQuotes = false;
        let count = 0;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (!inQuotes && char === delimiter) {
                count++;
            }
        }

        return count;
    }

    function detectCsvDelimiter(text) {
        const candidates = [',', ';', '\t'];
        const lines = String(text || '')
            .split(/\r\n|\n|\r/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .slice(0, 5);

        if (lines.length === 0) {
            return ',';
        }

        let bestDelimiter = ',';
        let bestScore = -1;

        for (const delimiter of candidates) {
            let score = 0;
            for (const line of lines) {
                score += countDelimiterOutsideQuotes(line, delimiter);
            }

            if (score > bestScore) {
                bestScore = score;
                bestDelimiter = delimiter;
            }
        }

        return bestScore > 0 ? bestDelimiter : ',';
    }

    function parseCSV(csvText) {
        const text = String(csvText || '').replace(/^\uFEFF/, '');
        const delimiter = detectCsvDelimiter(text);
        const rowsRaw = [];
        let currentRow = [];
        let currentCell = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentCell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (!inQuotes && char === delimiter) {
                currentRow.push(currentCell.trim());
                currentCell = '';
                continue;
            }

            if (!inQuotes && (char === '\n' || char === '\r')) {
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
                currentRow.push(currentCell.trim());
                currentCell = '';

                if (currentRow.some(cell => cell !== '')) {
                    rowsRaw.push(currentRow);
                }
                currentRow = [];
                continue;
            }

            currentCell += char;
        }

        if (currentCell.length > 0 || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            if (currentRow.some(cell => cell !== '')) {
                rowsRaw.push(currentRow);
            }
        }

        if (rowsRaw.length === 0) return [];

        const headers = rowsRaw[0].map(h => h.trim().toLowerCase());
        const rows = [];

        for (let i = 1; i < rowsRaw.length; i++) {
            const values = rowsRaw[i];
            if (!values || values.length === 0) continue;

            const row = {};
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = values[j] ? values[j].trim() : '';
            }
            rows.push(row);
        }

        return rows;
    }

    function parseTrading212(rows) {
        const requiredColumns = ['action', 'time', 'ticker', 'no. of shares', 'gross total', 'currency (gross total)', 'currency conversion fee'];
        if (rows.length === 0) throw new Error('CSV-tiedosto on tyhjä');

        const firstRow = rows[0];
        const missingCols = requiredColumns.filter(col => !(col in firstRow));
        if (missingCols.length > 0) {
            const detectedFormat = autoDetectFormat(rows);
            if (detectedFormat !== 'trading212') {
                throw new Error('Väärä muoto! CSV näyttää olevan manuaalinen muoto. Valitse "Manuaalinen muoto" dropdown-valikosta.');
            }
            throw new Error(`Sarakkeet puuttuvat CSV:stä: ${missingCols.join(', ')}`);
        }

        const parseNumberField = (value, fieldName, rowNumber, allowEmpty = true) => {
            const raw = String(value ?? '').trim();
            if (raw === '') {
                if (allowEmpty) return 0;
                throw new Error(`Rivi ${rowNumber}: kenttä "${fieldName}" puuttuu`);
            }
            const parsed = Number(raw.replace(',', '.'));
            if (!Number.isFinite(parsed)) {
                throw new Error(`Rivi ${rowNumber}: kenttä "${fieldName}" ei ole numero (arvo: "${raw}")`);
            }
            return parsed;
        };

        const transactions = [];
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const rowNumber = index + 2;

            try {
                const action = String(row['action'] || '').trim().toLowerCase();
                const timeStr = String(row['time'] || '').trim();
                const ticker = sanitizeQuotedText(row['ticker']).toUpperCase();
                const symbolName = getSymbolNameFromRow(row);
                const qty = parseNumberField(row['no. of shares'], 'No. of shares', rowNumber, true);
                const grossTotal = parseNumberField(row['gross total'], 'Gross Total', rowNumber, true);
                const fxFee = parseNumberField(row['currency conversion fee'], 'Currency conversion fee', rowNumber, true);

                if (!action) {
                    throw new Error(`Rivi ${rowNumber}: kenttä "Action" puuttuu`);
                }
                if (!timeStr) {
                    throw new Error(`Rivi ${rowNumber}: kenttä "Time" puuttuu`);
                }

                const date = parseDate(timeStr);

                let type = 'IGNORE';
                if (action.includes('market buy') || action.includes('limit buy') || action.match(/\bbuy\b/)) {
                    type = 'BUY';
                } else if (action.includes('market sell') || action.includes('limit sell') || action.match(/\bsell\b/)) {
                    type = 'SELL';
                } else if (action.includes('interest on cash')) {
                    type = 'INTEREST';
                } else if (action.includes('dividend')) {
                    type = 'DIVIDEND';
                }

                if (type !== 'IGNORE') {
                    transactions.push({
                        date: date,
                        type: type,
                        symbol: ticker || 'CASH',
                        symbolName: symbolName,
                        qty: qty,
                        gross_total_eur: decimalAbs(grossTotal),
                        fx_fee_eur: decimalAbs(fxFee)
                    });
                }
            } catch (error) {
                if (String(error?.message || '').startsWith('Rivi ')) {
                    throw error;
                }
                throw new Error(`Rivi ${rowNumber}: ${error.message}`);
            }
        }

        return transactions.sort((a, b) => a.date - b.date);
    }

    function parseRevolut(rows) {
        const requiredColumns = ['date', 'type', 'ticker', 'quantity', 'price', 'fee', 'currency'];
        if (rows.length === 0) throw new Error('CSV-tiedosto on tyhjä');

        const firstRow = rows[0];
        const missingCols = requiredColumns.filter(col => !(col in firstRow));
        if (missingCols.length > 0) {
            throw new Error(`Sarakkeet puuttuvat CSV:stä: ${missingCols.join(', ')}`);
        }

        const parseNumberField = (value, fieldName, rowNumber, allowEmpty = true) => {
            const raw = String(value ?? '').trim();
            if (raw === '') {
                if (allowEmpty) return 0;
                throw new Error(`Rivi ${rowNumber}: kenttä "${fieldName}" puuttuu`);
            }
            const parsed = Number(raw.replace(',', '.'));
            if (!Number.isFinite(parsed)) {
                throw new Error(`Rivi ${rowNumber}: kenttä "${fieldName}" ei ole numero (arvo: "${raw}")`);
            }
            return parsed;
        };

        const mapType = (rawType) => {
            const type = String(rawType || '').trim().toLowerCase();
            if (type === 'buy' || type === 'market buy' || type === 'stock buy') return 'BUY';
            if (type === 'sell' || type === 'market sell' || type === 'stock sell') return 'SELL';
            if (type.includes('dividend')) return 'DIVIDEND';
            if (type.includes('interest')) return 'INTEREST';
            return 'IGNORE';
        };

        const transactions = [];
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const rowNumber = index + 2;

            try {
                const dateRaw = String(row['date'] || '').trim();
                const type = mapType(row['type']);
                const symbol = sanitizeQuotedText(row['ticker']).toUpperCase() || 'CASH';
                const symbolName = getSymbolNameFromRow(row);
                const qty = parseNumberField(row['quantity'], 'quantity', rowNumber, true);
                const priceEur = parseNumberField(row['price'], 'price', rowNumber, true);
                const feeEur = decimalAbs(parseNumberField(row['fee'], 'fee', rowNumber, true));
                const currency = String(row['currency'] || '').trim().toUpperCase();

                if (!dateRaw) {
                    throw new Error(`Rivi ${rowNumber}: kenttä "date" puuttuu`);
                }

                if (currency && currency !== 'EUR') {
                    throw new Error(`Rivi ${rowNumber}: vain EUR-valuutta on tuettu Revolut-tuonnissa (löytyi "${currency}")`);
                }

                const date = parseDate(dateRaw);
                if (type === 'IGNORE') {
                    continue;
                }

                transactions.push({
                    date,
                    type,
                    symbol,
                    symbolName,
                    qty: decimalAbs(qty),
                    price_eur: decimalAbs(priceEur),
                    fee_eur: feeEur
                });
            } catch (error) {
                if (String(error?.message || '').startsWith('Rivi ')) {
                    throw error;
                }
                throw new Error(`Rivi ${rowNumber}: ${error.message}`);
            }
        }

        return transactions.sort((a, b) => a.date - b.date);
    }

    function parseInteractiveBrokers(rows) {
        const requiredColumns = ['trade date', 'action', 'symbol', 'quantity', 'price', 'commission', 'currency'];
        if (rows.length === 0) throw new Error('CSV-tiedosto on tyhjä');

        const firstRow = rows[0];
        const missingCols = requiredColumns.filter(col => !(col in firstRow));
        if (missingCols.length > 0) {
            throw new Error(`Sarakkeet puuttuvat CSV:stä: ${missingCols.join(', ')}`);
        }

        const parseNumberField = (value, fieldName, rowNumber, allowEmpty = true) => {
            const raw = String(value ?? '').trim();
            if (raw === '') {
                if (allowEmpty) return 0;
                throw new Error(`Rivi ${rowNumber}: kenttä "${fieldName}" puuttuu`);
            }
            const parsed = Number(raw.replace(',', '.'));
            if (!Number.isFinite(parsed)) {
                throw new Error(`Rivi ${rowNumber}: kenttä "${fieldName}" ei ole numero (arvo: "${raw}")`);
            }
            return parsed;
        };

        const mapType = (rawAction) => {
            const action = String(rawAction || '').trim().toUpperCase();
            if (action === 'BUY') return 'BUY';
            if (action === 'SELL') return 'SELL';
            if (action === 'DIVIDEND') return 'DIVIDEND';
            if (action === 'INTEREST') return 'INTEREST';
            return 'IGNORE';
        };

        const transactions = [];
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const rowNumber = index + 2;

            try {
                const dateRaw = String(row['trade date'] || '').trim();
                const type = mapType(row['action']);
                const symbol = sanitizeQuotedText(row['symbol']).toUpperCase() || 'CASH';
                const symbolName = sanitizeQuotedText(row['description'] || row['symbol name'] || '');
                const qty = parseNumberField(row['quantity'], 'quantity', rowNumber, true);
                const priceEur = parseNumberField(row['price'], 'price', rowNumber, true);
                const feeEur = decimalAbs(parseNumberField(row['commission'], 'commission', rowNumber, true));
                const currency = String(row['currency'] || '').trim().toUpperCase();

                if (!dateRaw) {
                    throw new Error(`Rivi ${rowNumber}: kenttä "trade date" puuttuu`);
                }

                if (currency && currency !== 'EUR') {
                    throw new Error(`Rivi ${rowNumber}: vain EUR-valuutta on tuettu Interactive Brokers -tuonnissa (löytyi "${currency}")`);
                }

                const date = parseDate(dateRaw);
                if (type === 'IGNORE') {
                    continue;
                }

                transactions.push({
                    date,
                    type,
                    symbol,
                    symbolName,
                    qty: decimalAbs(qty),
                    price_eur: decimalAbs(priceEur),
                    fee_eur: feeEur
                });
            } catch (error) {
                if (String(error?.message || '').startsWith('Rivi ')) {
                    throw error;
                }
                throw new Error(`Rivi ${rowNumber}: ${error.message}`);
            }
        }

        return transactions.sort((a, b) => a.date - b.date);
    }

    const IMPORT_FORMATS = {
        trading212: {
            requiredColumns: ['action', 'time', 'ticker', 'no. of shares', 'gross total', 'currency (gross total)', 'currency conversion fee'],
            parser: parseTrading212
        },
        manual: {
            requiredColumns: ['date', 'type', 'symbol', 'qty', 'price_eur', 'fee_eur'],
            parser: parseManual
        },
        revolut: {
            requiredColumns: ['date', 'type', 'ticker', 'quantity', 'price', 'fee', 'currency'],
            parser: parseRevolut
        },
        ibkr: {
            requiredColumns: ['trade date', 'action', 'symbol', 'quantity', 'price', 'commission', 'currency'],
            parser: parseInteractiveBrokers
        }
    };

    function parseTransactionsByFormat(format, rows) {
        const normalizedFormat = String(format || '').trim().toLowerCase();
        const definition = IMPORT_FORMATS[normalizedFormat];
        if (!definition || typeof definition.parser !== 'function') {
            throw new Error(`Tuntematon CSV-muoto: ${format}`);
        }

        return definition.parser(rows);
    }

    function autoDetectFormat(rows) {
        if (rows.length === 0) throw new Error('CSV-tiedosto on tyhjä');

        const firstRow = rows[0];
        const columns = Object.keys(firstRow);

        const preferredOrder = ['trading212', 'manual', 'revolut', 'ibkr'];
        for (const format of preferredOrder) {
            const definition = IMPORT_FORMATS[format];
            const hasAllColumns = definition.requiredColumns.every(col => columns.includes(col));
            if (hasAllColumns) {
                return format;
            }
        }

        throw new Error(`CSV-muotoa ei tunnistettu. Löydetyt sarakkeet: ${columns.join(', ')}`);
    }

    function parseManual(rows) {
        const requiredColumns = ['date', 'type', 'symbol', 'qty', 'price_eur', 'fee_eur'];
        if (rows.length === 0) throw new Error('CSV-tiedosto on tyhjä');

        const firstRow = rows[0];
        const missingCols = requiredColumns.filter(col => !(col in firstRow));
        if (missingCols.length > 0) {
            const detectedFormat = autoDetectFormat(rows);
            if (detectedFormat !== 'manual') {
                throw new Error(`Väärä muoto! CSV näyttää olevan ${detectedFormat === 'trading212' ? 'Trading 212' : 'tuntematon'} -muodossa. Valitse oikea muoto dropdown-valikosta.`);
            }
            throw new Error(`Sarakkeet puuttuvat CSV:stä: ${missingCols.join(', ')}`);
        }

        const parseNumberField = (value, fieldName, rowNumber, allowEmpty = true) => {
            const raw = String(value ?? '').trim();
            if (raw === '') {
                if (allowEmpty) return 0;
                throw new Error(`Rivi ${rowNumber}: kenttä "${fieldName}" puuttuu`);
            }
            const parsed = Number(raw.replace(',', '.'));
            if (!Number.isFinite(parsed)) {
                throw new Error(`Rivi ${rowNumber}: kenttä "${fieldName}" ei ole numero (arvo: "${raw}")`);
            }
            return parsed;
        };

        const allowedTypes = new Set(['BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'SPLIT', 'REVERSE_SPLIT', 'CUSTODY_FEE', 'FEE', 'CASHBACK']);
        const transactions = [];
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const rowNumber = index + 2;

            try {
                const dateRaw = String(row['date'] || '').trim();
                const type = String(row['type'] || '').trim().toUpperCase();
                const symbol = sanitizeQuotedText(row['symbol']).toUpperCase();
                const symbolName = getSymbolNameFromRow(row);
                const qty = parseNumberField(row['qty'], 'qty', rowNumber, true);
                const priceEur = parseNumberField(row['price_eur'], 'price_eur', rowNumber, true);
                const feeEur = parseNumberField(row['fee_eur'], 'fee_eur', rowNumber, true);

                if (!dateRaw) {
                    throw new Error(`Rivi ${rowNumber}: kenttä "date" puuttuu`);
                }
                if (!type) {
                    throw new Error(`Rivi ${rowNumber}: kenttä "type" puuttuu`);
                }
                if (!allowedTypes.has(type)) {
                    throw new Error(`Rivi ${rowNumber}: tuntematon type "${type}"`);
                }
                if (!symbol) {
                    throw new Error(`Rivi ${rowNumber}: kenttä "symbol" puuttuu`);
                }

                const date = parseDate(dateRaw);

                transactions.push({
                    date: date,
                    type: type,
                    symbol: symbol,
                    symbolName: symbolName,
                    qty: qty,
                    price_eur: priceEur,
                    fee_eur: feeEur
                });
            } catch (error) {
                if (String(error?.message || '').startsWith('Rivi ')) {
                    throw error;
                }
                throw new Error(`Rivi ${rowNumber}: ${error.message}`);
            }
        }

        return transactions.sort((a, b) => a.date - b.date);
    }

    function runInternalTests() {
        const approxEqual = (a, b, epsilon = 1e-9) => Math.abs(a - b) <= epsilon;

        const book = new FifoBook();
        const buyDate = new Date('2024-01-10');
        const sellDate1 = new Date('2025-02-10');
        const sellDate2 = new Date('2025-02-15');

        book.buy('VWCE', buyDate, 1.0, 4.0, 0.0);

        const sale1 = book.sell('VWCE', 'Vanguard FTSE All-World (Acc)', sellDate1, 0.6, 2.5, 0.0);
        const sale2 = book.sell('VWCE', 'Vanguard FTSE All-World (Acc)', sellDate2, 0.4, 1.8, 0.0);

        const purchaseSum = sale1.acquisitionPriceEur + sale2.acquisitionPriceEur;
        const qtySum = sale1.qty + sale2.qty;
        const gainSum = sale1.gainEur + sale2.gainEur;

        if (!approxEqual(purchaseSum, 4.0)) {
            throw new Error(`FIFO test failed: purchase sum ${purchaseSum} != 4.0`);
        }
        if (!approxEqual(qtySum, 1.0)) {
            throw new Error(`FIFO test failed: qty sum ${qtySum} != 1.0`);
        }
        if (!approxEqual(gainSum, (2.5 + 1.8 - 4.0))) {
            throw new Error(`FIFO test failed: gain sum ${gainSum} unexpected`);
        }

        const parsed = parseCSV('Action,Time,Ticker,No. of shares,Gross Total,Currency (Gross Total),Currency conversion fee\n"Dividend (AAPL)",2025-03-20 00:00:00,AAPL,0,25.00,EUR,0.00');
        if (!parsed.length || parsed[0]['action'] !== 'Dividend (AAPL)') {
            throw new Error('CSV parser test failed: quoted action not parsed correctly');
        }

        return {
            ok: true,
            message: 'Internal tests passed',
            checks: {
                purchaseSum,
                qtySum,
                gainSum,
                parsedAction: parsed[0]['action']
            }
        };
    }

    const api = {
        TAX_RULES_BY_YEAR,
        getTaxRulesForYear,
        resolveTaxRulesForYear,
        Lot,
        SaleResult,
        FifoBook,
        estimateCapitalTax,
        parseDate,
        formatCurrency,
        formatNumber,
        formatQuantity,
        formatQuantityCsv,
        getSaleCostUsed,
        sanitizeQuotedText,
        getSymbolNameFromRow,
        formatInstrumentDisplay,
        formatSaleInstrumentDisplay,
        formatDeemedCostDisplay,
        formatDeemedCostCsv,
        formatAcquisitionDate,
        expandSaleRowsForReporting,
        parseCSV,
        parseTrading212,
        parseRevolut,
        parseInteractiveBrokers,
        parseTransactionsByFormat,
        autoDetectFormat,
        parseManual,
        runInternalTests
    };

    global.AppCore = api;
    Object.assign(global, {
        getTaxRulesForYear,
        resolveTaxRulesForYear,
        FifoBook,
        estimateCapitalTax,
        parseDate,
        formatCurrency,
        formatNumber,
        formatQuantity,
        formatQuantityCsv,
        getSaleCostUsed,
        sanitizeQuotedText,
        getSymbolNameFromRow,
        formatInstrumentDisplay,
        formatSaleInstrumentDisplay,
        formatDeemedCostDisplay,
        formatDeemedCostCsv,
        formatAcquisitionDate,
        expandSaleRowsForReporting,
        parseCSV,
        parseTrading212,
        parseRevolut,
        parseInteractiveBrokers,
        parseTransactionsByFormat,
        autoDetectFormat,
        parseManual,
        runInternalTests
    });
})(window);
