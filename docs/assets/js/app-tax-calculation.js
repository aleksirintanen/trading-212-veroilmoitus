(() => {
const calcCore = window.AppCore || {};
const {
    resolveTaxRulesForYear,
    FifoBook,
    estimateCapitalTax,
    parseCSV,
    parseTransactionsByFormat,
    autoDetectFormat,
    formatCurrency,
    formatQuantity,
    getSaleCostUsed,
    formatSaleInstrumentDisplay,
    formatDeemedCostDisplay,
    expandSaleRowsForReporting
} = calcCore;

function updateFormatHelp() {
    const format = document.getElementById('formatSelect').value;
    const helpDiv = document.getElementById('formatHelp');

    if (format === 'trading212') {
        helpDiv.innerHTML = `
            <div class="help-text">Vaaditut sarakkeet: Action, Time, Ticker, No. of shares, Gross Total, Currency (Gross Total), Currency conversion fee</div>
            <div class="csv-sample">
                <strong>Esimerkki (Trading 212 History):</strong><br>
Action,Time,Ticker,No. of shares,Gross Total,Currency (Gross Total),Currency conversion fee<br>
Market buy,2025-01-15 10:30:00,AAPL,10,1500.00,EUR,0.00<br>
Dividend (AAPL),2025-03-20 00:00:00,AAPL,0,25.00,EUR,0.00<br>
Market sell,2025-06-10 14:22:00,AAPL,5,800.00,EUR,0.00
            </div>
        `;
    } else if (format === 'manual') {
        helpDiv.innerHTML = `
            <div class="help-text">Vaaditut sarakkeet: date, type, symbol, qty, price_eur, fee_eur</div>
            <div class="csv-sample">
                <strong>Esimerkki (Manuaalinen):</strong><br>
date,type,symbol,qty,price_eur,fee_eur<br>
2025-01-15,BUY,AAPL,10,150.00,5.00<br>
2025-03-20,DIVIDEND,AAPL,0,2.50,0<br>
2025-06-10,SELL,AAPL,5,160.00,5.00
            </div>
        `;
    } else if (format === 'revolut') {
        helpDiv.innerHTML = `
            <div class="help-text">Vaaditut sarakkeet: Date, Type, Ticker, Quantity, Price, Fee, Currency</div>
            <div class="csv-sample">
                <strong>Esimerkki (Revolut):</strong><br>
Date,Type,Ticker,Quantity,Price,Fee,Currency<br>
2025-01-15,Buy,AAPL,10,150.00,1.00,EUR<br>
2025-03-20,Dividend,AAPL,0,2.50,0.00,EUR<br>
2025-06-10,Sell,AAPL,5,160.00,1.00,EUR
            </div>
        `;
    } else if (format === 'ibkr') {
        helpDiv.innerHTML = `
            <div class="help-text">Vaaditut sarakkeet: Trade Date, Action, Symbol, Quantity, Price, Commission, Currency</div>
            <div class="csv-sample">
                <strong>Esimerkki (Interactive Brokers):</strong><br>
Trade Date,Action,Symbol,Quantity,Price,Commission,Currency<br>
2025-01-15,BUY,AAPL,10,150.00,1.00,EUR<br>
2025-03-20,DIVIDEND,AAPL,0,2.50,0.00,EUR<br>
2025-06-10,SELL,AAPL,5,160.00,1.00,EUR
            </div>
        `;
    }
}

const previewUiCalc = window.AppPreviewUi || {};
const setExportButtonsState = previewUiCalc.setExportButtonsState || (() => {});
const setCalculatingState = previewUiCalc.setCalculatingState || (() => {});
const setSalesEmptyState = previewUiCalc.setSalesEmptyState || (() => {});

function showExportBehaviorReminderOnce() {
    const storageKey = 't212_export_behavior_notice_shown';

    if (window.__skipExportBehaviorNoticeOnce) {
        window.__skipExportBehaviorNoticeOnce = false;
        return true;
    }

    let wasShown = !!window.__exportBehaviorNoticeShown;
    try {
        if (!wasShown && typeof sessionStorage !== 'undefined') {
            wasShown = sessionStorage.getItem(storageKey) === '1';
        }
    } catch (_) {
    }

    if (wasShown) return true;

    const overlay = document.getElementById('exportReminderOverlay');
    const continueButton = document.getElementById('exportReminderContinueBtn');
    const dontShowAgainInput = document.getElementById('exportReminderDontShowAgain');
    if (!overlay || !continueButton || !overlay.classList) {
        window.__exportBehaviorNoticeShown = true;
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(storageKey, '1');
            }
        } catch (_) {
        }
        return true;
    }

    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    if (dontShowAgainInput) {
        dontShowAgainInput.checked = false;
    }

    continueButton.onclick = () => {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');

        const suppressForSession = !!dontShowAgainInput?.checked;
        if (suppressForSession) {
            window.__exportBehaviorNoticeShown = true;
            try {
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem(storageKey, '1');
                }
            } catch (_) {
            }
        }

        window.__skipExportBehaviorNoticeOnce = true;
        calculateTaxes();
    };

    return false;
}

function calculateTaxes() {
    if (!showExportBehaviorReminderOnce()) {
        return;
    }

    const errorElement = document.getElementById('errorMessage');
    errorElement.classList.remove('show');
    errorElement.textContent = '';
    setCalculatingState(true);

    try {
        const fileInput = document.getElementById('csvFile');
        if (!fileInput.files.length) {
            throw new Error('Valitse CSV-tiedosto');
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const csvText = e.target.result;
                const rows = parseCSV(csvText);
                const year = parseInt(document.getElementById('taxYear').value);
                let format = document.getElementById('formatSelect').value;

                try {
                    const detectedFormat = autoDetectFormat(rows);
                    if (format !== detectedFormat && detectedFormat !== null) {
                        console.log(`Auto-detected format: ${detectedFormat}, using that instead of selected: ${format}`);
                        format = detectedFormat;
                        document.getElementById('formatSelect').value = format;
                    }
                } catch (e) {
                }

                const { ruleYear: taxRuleYear, rules: taxRules } = resolveTaxRulesForYear(year);

                const transactions = parseTransactionsByFormat(format, rows);

                const book = new FifoBook(taxRules);
                const sales = [];
                const symbolNames = {};
                const dataWarnings = [];
                const dividendRows = [];
                const interestRows = [];

                let dividendsGross = 0;
                let dividendsTaxable = 0;
                let interestIncome = 0;
                let custodyFees = 0;

                const pushWarning = (message) => {
                    dataWarnings.push(message);
                };

                const getAvailableQty = (targetSymbol) => {
                    const lots = book.getLots(targetSymbol) || [];
                    return lots.reduce((sum, lot) => sum + Number(lot.qty || 0), 0);
                };

                for (let transaction of transactions) {
                    const d = transaction.date;
                    const type = transaction.type;
                    const symbol = transaction.symbol;
                    const symbolName = (transaction.symbolName || '').trim();
                    const qty = transaction.qty;

                    if (symbolName && !symbolNames[symbol]) {
                        symbolNames[symbol] = symbolName;
                    } else if (symbolName && symbolNames[symbol] && symbolNames[symbol] !== symbolName) {
                        pushWarning(`${d.toLocaleDateString('fi-FI')} ${symbol}: eri nimivariantteja havaittu ("${symbolNames[symbol]}" vs "${symbolName}")`);
                    }

                    if (type === 'BUY') {
                        if (!(qty > 0)) {
                            pushWarning(`${d.toLocaleDateString('fi-FI')} ${symbol}: BUY-rivi ohitettu, määrä ei ole positiivinen (${qty})`);
                            continue;
                        }

                        let purchasePriceTotalEur, acquisitionFeeEur;
                        if (format === 'trading212') {
                            purchasePriceTotalEur = transaction.gross_total_eur;
                            acquisitionFeeEur = transaction.fx_fee_eur;
                        } else {
                            purchasePriceTotalEur = qty * transaction.price_eur;
                            acquisitionFeeEur = transaction.fee_eur;
                        }
                        book.buy(symbol, d, qty, purchasePriceTotalEur, acquisitionFeeEur);

                    } else if (type === 'SELL') {
                        if (!(qty > 0)) {
                            pushWarning(`${d.toLocaleDateString('fi-FI')} ${symbol}: SELL-rivi ohitettu, määrä ei ole positiivinen (${qty})`);
                            continue;
                        }

                        const availableQty = getAvailableQty(symbol);
                        if (availableQty <= 1e-12) {
                            pushWarning(`${d.toLocaleDateString('fi-FI')} ${symbol}: myynti ennen ostoja, rivi ohitettu (myyntimäärä ${formatQuantity(qty)})`);
                            continue;
                        }

                        if (availableQty + 1e-12 < qty) {
                            pushWarning(`${d.toLocaleDateString('fi-FI')} ${symbol}: myyntimäärä (${formatQuantity(qty)}) ylittää omistuksen (${formatQuantity(availableQty)}), rivi ohitettu`);
                            continue;
                        }

                        let proceedsEur, feesEur;
                        if (format === 'trading212') {
                            proceedsEur = transaction.gross_total_eur;
                            feesEur = transaction.fx_fee_eur;
                        } else {
                            proceedsEur = qty * transaction.price_eur;
                            feesEur = transaction.fee_eur;
                        }
                        const res = book.sell(symbol, symbolNames[symbol] || '', d, qty, proceedsEur, feesEur);
                        if (d.getFullYear() === year) {
                            sales.push(res);
                        }

                    } else if (type === 'SPLIT' && format === 'manual') {
                        book.applySplit(symbol, qty);

                    } else if (type === 'REVERSE_SPLIT' && format === 'manual') {
                        book.applySplit(symbol, qty);

                    } else if (type === 'DIVIDEND') {
                        if (d.getFullYear() === year) {
                            const gross = format === 'trading212' ? transaction.gross_total_eur : transaction.price_eur;
                            dividendsGross += gross;
                            dividendsTaxable += gross * taxRules.listedDividendTaxableShare;
                            dividendRows.push({
                                date: d,
                                symbol: symbol,
                                symbolName: symbolNames[symbol] || symbolName || '',
                                amount: gross
                            });
                        }

                    } else if (type === 'INTEREST') {
                        if (d.getFullYear() === year) {
                            const amount = format === 'trading212' ? transaction.gross_total_eur : transaction.price_eur;
                            interestIncome += amount;
                            interestRows.push({
                                date: d,
                                amount: amount
                            });
                        }

                    } else if ((type === 'CUSTODY_FEE' || type === 'FEE') && format === 'manual') {
                        if (d.getFullYear() === year) {
                            custodyFees += transaction.fee_eur;
                        }
                    }
                }

                const totalGains = sales.reduce((sum, s) => sum + (s.gainEur > 0 ? s.gainEur : 0), 0);
                const totalLosses = sales.reduce((sum, s) => sum + (s.gainEur < 0 ? s.gainEur : 0), 0);
                const netGains = totalGains + totalLosses;

                const profitableSales = sales.filter(s => s.gainEur > 0);
                const lossSales = sales.filter(s => s.gainEur < 0);

                const profitProceedsTotal = profitableSales.reduce((sum, s) => sum + s.proceedsEur, 0);
                const profitCostTotal = profitableSales.reduce((sum, s) => sum + getSaleCostUsed(s), 0);
                const profitGainTotal = profitableSales.reduce((sum, s) => sum + s.gainEur, 0);

                const lossProceedsTotal = lossSales.reduce((sum, s) => sum + s.proceedsEur, 0);
                const lossCostTotal = lossSales.reduce((sum, s) => sum + getSaleCostUsed(s), 0);
                const lossGainTotal = lossSales.reduce((sum, s) => sum + s.gainEur, 0);

                const custodyDeductible = Math.max(0, custodyFees - taxRules.custodyDeductibleExcess);
                const netCapitalIncome = netGains + dividendsTaxable + interestIncome - custodyDeductible;
                const estimatedTax = estimateCapitalTax(netCapitalIncome, taxRules);

                document.getElementById('totalGains').textContent = formatCurrency(totalGains);
                document.getElementById('totalGains').className = 'summary-item-value positive';

                document.getElementById('totalLosses').textContent = formatCurrency(totalLosses);
                document.getElementById('totalLosses').className = totalLosses < 0 ? 'summary-item-value negative' : 'summary-item-value';

                document.getElementById('netGains').textContent = formatCurrency(netGains);
                document.getElementById('netGains').className = netGains >= 0 ? 'summary-item-value positive' : 'summary-item-value negative';

                document.getElementById('dividendGross').textContent = formatCurrency(dividendsGross);
                document.getElementById('dividendTaxable').textContent = formatCurrency(dividendsTaxable);
                document.getElementById('interestIncome').textContent = formatCurrency(interestIncome);
                document.getElementById('custodyFees').textContent = formatCurrency(custodyFees);
                document.getElementById('deductibleFees').textContent = formatCurrency(custodyDeductible);

                document.getElementById('netCapitalIncome').textContent = formatCurrency(netCapitalIncome);
                document.getElementById('netCapitalIncome').className = netCapitalIncome >= 0 ? 'summary-item-value positive' : 'summary-item-value negative';

                document.getElementById('estimatedTax').textContent = formatCurrency(estimatedTax);
                document.getElementById('estimatedTax').className = 'summary-item-value';

                const taxRulesInfo = document.getElementById('taxRulesInfo');
                if (taxRulesInfo) {
                    const rows = [
                        ['Verovuosi', String(year)],
                        ['Sääntövuosi', String(taxRuleYear)],
                        ['Pääomatulovero', `${Math.round(taxRules.capitalTaxLow * 100)}% / ${Math.round(taxRules.capitalTaxHigh * 100)}% (raja ${formatCurrency(taxRules.capitalIncomeBracketEur)})`],
                        ['Osingon veronalainen osuus', `${Math.round(taxRules.listedDividendTaxableShare * 100)}%`],
                        ['Hankintameno-olettama', `${Math.round(taxRules.deemedCostUnder10Y * 100)}% / ${Math.round(taxRules.deemedCost10YOrMore * 100)}%`],
                        ['Hoitokulujen omavastuu', formatCurrency(taxRules.custodyDeductibleExcess)]
                    ];

                    if (typeof taxRulesInfo.replaceChildren === 'function') {
                        const fragment = document.createDocumentFragment();
                        for (const [label, value] of rows) {
                            const line = document.createElement('div');
                            line.className = 'tax-rule-row';

                            const strong = document.createElement('strong');
                            strong.textContent = `${label}: `;

                            const text = document.createTextNode(value);
                            line.appendChild(strong);
                            line.appendChild(text);
                            fragment.appendChild(line);
                        }
                        taxRulesInfo.replaceChildren(fragment);
                    } else {
                        taxRulesInfo.textContent = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
                    }
                }

                document.getElementById('profitProceedsTotal').textContent = formatCurrency(profitProceedsTotal);
                document.getElementById('profitCostTotal').textContent = formatCurrency(profitCostTotal);
                document.getElementById('profitGainTotal').textContent = formatCurrency(profitGainTotal);
                document.getElementById('profitGainTotal').className = 'summary-item-value positive';

                document.getElementById('lossProceedsTotal').textContent = formatCurrency(lossProceedsTotal);
                document.getElementById('lossCostTotal').textContent = formatCurrency(lossCostTotal);
                document.getElementById('lossGainTotal').textContent = formatCurrency(lossGainTotal);
                document.getElementById('lossGainTotal').className = 'summary-item-value negative';

                const tbody = document.querySelector('#salesTable tbody');
                tbody.innerHTML = '';

                const reportRows = expandSaleRowsForReporting(sales);
                setSalesEmptyState(reportRows.length === 0);
                for (let sale of reportRows) {
                    const row = document.createElement('tr');

                    const cells = [
                        formatSaleInstrumentDisplay(sale),
                        formatQuantity(sale.qty),
                        sale.acquiredDate.toLocaleDateString('fi-FI'),
                        sale.soldDate.toLocaleDateString('fi-FI'),
                        formatCurrency(sale.proceedsEur),
                        formatCurrency(sale.acquisitionPriceEur),
                        formatCurrency(sale.acquisitionFeesEur),
                        formatCurrency(sale.sellFeesEur),
                        formatDeemedCostDisplay(sale),
                        formatCurrency(sale.gainEur)
                    ];

                    for (let index = 0; index < cells.length; index++) {
                        const value = cells[index];
                        const cell = document.createElement('td');
                        cell.textContent = value;
                        row.appendChild(cell);
                    }

                    const gainCell = row.lastElementChild;
                    if (gainCell) {
                        if (sale.gainEur > 0) {
                            gainCell.classList.add('sales-gain-positive');
                            gainCell.style.color = '#28a745';
                            gainCell.style.fontWeight = '600';
                        } else if (sale.gainEur < 0) {
                            gainCell.classList.add('sales-gain-negative');
                            gainCell.style.color = '#dc3545';
                            gainCell.style.fontWeight = '600';
                        }
                    }

                    tbody.appendChild(row);
                }

                const allocatedAcquisitionFeesTotal = reportRows.reduce((sum, row) => sum + (row.acquisitionFeesEur || 0), 0);
                const allocatedSellFeesTotal = reportRows.reduce((sum, row) => sum + (row.sellFeesEur || 0), 0);
                document.getElementById('allocatedAcquisitionFees').textContent = formatCurrency(allocatedAcquisitionFeesTotal);
                document.getElementById('allocatedSellFees').textContent = formatCurrency(allocatedSellFeesTotal);

                const warningsBox = document.getElementById('dataWarningsBox');
                const warningsList = document.getElementById('dataWarningsList');
                if (warningsBox?.classList && warningsList) {
                    warningsList.innerHTML = '';

                    if (dataWarnings.length > 0) {
                        for (const warning of dataWarnings) {
                            const item = document.createElement('li');
                            item.textContent = warning;
                            warningsList.appendChild(item);
                        }
                        warningsBox.classList.add('show');
                    } else {
                        warningsBox.classList.remove('show');
                    }
                }

                const fifoAuditBody = document.querySelector('#fifoAuditTable tbody');
                if (fifoAuditBody) {
                    fifoAuditBody.innerHTML = '';
                    const fifoAuditEmptyState = document.getElementById('fifoAuditEmptyState');
                    if (fifoAuditEmptyState?.classList) {
                        fifoAuditEmptyState.classList.toggle('show', reportRows.length === 0);
                    }

                    for (const rowData of reportRows) {
                        const row = document.createElement('tr');
                        const cells = [
                            rowData.soldDate.toLocaleDateString('fi-FI'),
                            formatSaleInstrumentDisplay(rowData),
                            formatQuantity(rowData.qty),
                            rowData.acquiredDate.toLocaleDateString('fi-FI'),
                            formatQuantity(rowData.qty),
                            formatQuantity(rowData.lotOriginalQty),
                            formatQuantity(rowData.lotQtyAfterSale),
                            formatCurrency(rowData.acquisitionPriceEur),
                            formatCurrency(rowData.acquisitionFeesEur),
                            formatCurrency(rowData.sellFeesEur),
                            formatDeemedCostDisplay(rowData),
                            rowData.methodUsed,
                            formatCurrency(rowData.gainEur)
                        ];

                        const amountColumns = new Set([2, 4, 5, 6, 7, 8, 9, 10, 12]);

                        for (let index = 0; index < cells.length; index++) {
                            const cell = document.createElement('td');
                            cell.textContent = cells[index];

                            if (amountColumns.has(index)) {
                                cell.classList.add('amount-cell');
                            }

                            if (index === 12) {
                                if (rowData.gainEur > 0) {
                                    cell.classList.add('sales-gain-positive');
                                } else if (rowData.gainEur < 0) {
                                    cell.classList.add('sales-gain-negative');
                                }
                            }

                            row.appendChild(cell);
                        }

                        fifoAuditBody.appendChild(row);
                    }
                }

                const dividendsBody = document.querySelector('#dividendsTable tbody');
                if (dividendsBody) {
                    dividendsBody.innerHTML = '';
                    const sortedDividends = [...dividendRows].sort((a, b) => a.date - b.date);
                    const dividendsEmptyState = document.getElementById('dividendsEmptyState');
                    if (dividendsEmptyState?.classList) {
                        dividendsEmptyState.classList.toggle('show', sortedDividends.length === 0);
                    }

                    for (const dividend of sortedDividends) {
                        const row = document.createElement('tr');

                        const dateCell = document.createElement('td');
                        dateCell.textContent = dividend.date.toLocaleDateString('fi-FI');
                        row.appendChild(dateCell);

                        const symbolCell = document.createElement('td');
                        symbolCell.textContent = formatSaleInstrumentDisplay({
                            symbol: dividend.symbol,
                            symbolName: dividend.symbolName
                        });
                        row.appendChild(symbolCell);

                        const amountCell = document.createElement('td');
                        amountCell.classList.add('amount-cell');
                        amountCell.textContent = formatCurrency(dividend.amount);
                        row.appendChild(amountCell);

                        dividendsBody.appendChild(row);
                    }
                }

                const interestsBody = document.querySelector('#interestsTable tbody');
                if (interestsBody) {
                    interestsBody.innerHTML = '';
                    const sortedInterests = [...interestRows].sort((a, b) => a.date - b.date);
                    const interestsEmptyState = document.getElementById('interestsEmptyState');
                    if (interestsEmptyState?.classList) {
                        interestsEmptyState.classList.toggle('show', sortedInterests.length === 0);
                    }

                    for (const interest of sortedInterests) {
                        const row = document.createElement('tr');

                        const dateCell = document.createElement('td');
                        dateCell.textContent = interest.date.toLocaleDateString('fi-FI');
                        row.appendChild(dateCell);

                        const typeCell = document.createElement('td');
                        typeCell.textContent = 'Interest on cash';
                        row.appendChild(typeCell);

                        const amountCell = document.createElement('td');
                        amountCell.classList.add('amount-cell');
                        amountCell.textContent = formatCurrency(interest.amount);
                        row.appendChild(amountCell);

                        interestsBody.appendChild(row);
                    }
                }

                window.lastResults = {
                    year: year,
                    totalGains: totalGains,
                    totalLosses: totalLosses,
                    netGains: netGains,
                    dividendsGross: dividendsGross,
                    dividendsTaxable: dividendsTaxable,
                    interestIncome: interestIncome,
                    dividends: dividendRows,
                    interests: interestRows,
                    fifoAuditRows: reportRows,
                    allocatedAcquisitionFees: allocatedAcquisitionFeesTotal,
                    allocatedSellFees: allocatedSellFeesTotal,
                    dataWarnings: dataWarnings,
                    custodyFees: custodyFees,
                    custodyDeductible: custodyDeductible,
                    netCapitalIncome: netCapitalIncome,
                    estimatedTax: estimatedTax,
                    taxRuleYearApplied: taxRuleYear,
                    taxRulesApplied: taxRules,
                    omaVeroSummary: {
                        profitable: {
                            proceedsTotal: profitProceedsTotal,
                            costTotal: profitCostTotal,
                            gainTotal: profitGainTotal
                        },
                        lossMaking: {
                            proceedsTotal: lossProceedsTotal,
                            costTotal: lossCostTotal,
                            gainTotal: lossGainTotal
                        }
                    },
                    sales: sales
                };

                setExportButtonsState(
                    true,
                    sales.length > 0,
                    dividendRows.length > 0,
                    interestRows.length > 0
                );
                document.getElementById('results').classList.add('show');

            } catch (error) {
                errorElement.textContent = `Virhe: ${error.message}`;
                errorElement.classList.add('show');
            } finally {
                setCalculatingState(false);
            }
        };

        reader.onerror = function() {
            errorElement.textContent = 'Virhe: CSV-tiedoston lukeminen epäonnistui';
            errorElement.classList.add('show');
            setCalculatingState(false);
        };

        reader.readAsText(file);

    } catch (error) {
        errorElement.textContent = `Virhe: ${error.message}`;
        errorElement.classList.add('show');
        setCalculatingState(false);
    }
}

window.updateFormatHelp = updateFormatHelp;
window.calculateTaxes = calculateTaxes;
})();
