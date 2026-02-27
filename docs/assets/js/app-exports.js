(() => {
const exportsCore = window.AppCore || {};
const {
    formatNumber,
    formatQuantityCsv,
    formatSaleInstrumentDisplay,
    formatDeemedCostCsv,
    expandSaleRowsForReporting
} = exportsCore;

const SECTION_STATE_STORAGE_KEY = 't212_section_visibility_state_v1';
const SECTION_IDS = ['salesSection', 'fifoAuditSection', 'dividendsSection', 'interestsSection'];

function loadSectionVisibilityState() {
    try {
        if (typeof localStorage === 'undefined') return {};
        const raw = localStorage.getItem(SECTION_STATE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
        return {};
    }
}

function saveSectionVisibilityState(sectionId, isVisible) {
    if (!SECTION_IDS.includes(sectionId)) return;

    try {
        if (typeof localStorage === 'undefined') return;
        const current = loadSectionVisibilityState();
        current[sectionId] = !!isVisible;
        localStorage.setItem(SECTION_STATE_STORAGE_KEY, JSON.stringify(current));
    } catch (_) {
    }
}

function restoreSectionVisibilityState() {
    const stored = loadSectionVisibilityState();

    for (const sectionId of SECTION_IDS) {
        const section = document.getElementById(sectionId);
        if (!section || !section.classList) continue;

        section.classList.toggle('show', !!stored[sectionId]);
    }
}

function triggerDownload(content, mimeType, filename) {
    const preferredType = /json|csv|text|pdf/i.test(String(mimeType || ''))
        ? 'application/octet-stream'
        : mimeType;
    const blob = new Blob([content], { type: preferredType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_self';
    link.download = filename;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function toggleSales() {
    toggleSection('salesSection', 'toggleSalesButton', 'myynnit', '📋');
}

function toggleFifoAudit() {
    toggleSection('fifoAuditSection', 'toggleFifoAuditButton', 'FIFO-audit trail', '🧾');
}

function toggleDividends() {
    toggleSection('dividendsSection', 'toggleDividendsButton', 'osingot', '💶');
}

function toggleInterests() {
    toggleSection('interestsSection', 'toggleInterestsButton', 'korot', '🏦');
}

function updateToggleButtonLabel(sectionId, buttonId, nounLabel, icon) {
    const section = document.getElementById(sectionId);
    const button = document.getElementById(buttonId);
    if (!section || !button) return;

    const isVisible = !!(
        section.classList && typeof section.classList.contains === 'function'
            ? section.classList.contains('show')
            : (typeof section.className === 'string' && section.className.split(/\s+/).includes('show'))
    );
    button.textContent = isVisible
        ? `${icon} Piilota ${nounLabel}`
        : `${icon} Näytä ${nounLabel}`;
}

function refreshToggleButtonsState() {
    updateToggleButtonLabel('salesSection', 'toggleSalesButton', 'myynnit', '📋');
    updateToggleButtonLabel('fifoAuditSection', 'toggleFifoAuditButton', 'FIFO-audit trail', '🧾');
    updateToggleButtonLabel('dividendsSection', 'toggleDividendsButton', 'osingot', '💶');
    updateToggleButtonLabel('interestsSection', 'toggleInterestsButton', 'korot', '🏦');
}

function toggleSection(sectionId, buttonId, nounLabel, icon) {
    const section = document.getElementById(sectionId);
    if (!section || !section.classList) return;

    section.classList.toggle('show');
    saveSectionVisibilityState(sectionId, section.classList.contains('show'));
    updateToggleButtonLabel(sectionId, buttonId, nounLabel, icon);
}

function exportAsJSON() {
    if (!window.lastResults) {
        alert('Laske ensin verot');
        return;
    }

    const data = JSON.stringify(window.lastResults, null, 2);
    triggerDownload(data, 'application/json', `veroilmoitus_${window.lastResults.year}.json`);
}

function exportAsSellersCSV() {
    if (!window.lastResults || !window.lastResults.sales.length) {
        alert('Ei myyntejä exporttia varten');
        return;
    }

    let csv = 'Luovutettu arvopaperi/arvo-osuus,Määrä,Hankinta-aika,Luovutusaika,Luovutushinta,Hankintahinta,Hankintakulut,Myyntikulut,Hankintameno-olettama,Voitto tai tappio\n';

    const reportRows = expandSaleRowsForReporting(window.lastResults.sales);
    for (let sale of reportRows) {
        csv += [
            formatSaleInstrumentDisplay(sale),
            formatQuantityCsv(sale.qty),
            sale.acquiredDate.toLocaleDateString('fi-FI'),
            sale.soldDate.toLocaleDateString('fi-FI'),
            formatNumber(sale.proceedsEur).replace(',', '.'),
            formatNumber(sale.acquisitionPriceEur).replace(',', '.'),
            formatNumber(sale.acquisitionFeesEur).replace(',', '.'),
            formatNumber(sale.sellFeesEur).replace(',', '.'),
            formatDeemedCostCsv(sale),
            formatNumber(sale.gainEur).replace(',', '.')
        ].join(',') + '\n';
    }

    triggerDownload(csv, 'text/csv;charset=utf-8;', `myynnit_${window.lastResults.year}.csv`);
}

function exportFifoAuditCSV() {
    if (!window.lastResults) {
        alert('Laske ensin verot');
        return;
    }

    const auditRows = Array.isArray(window.lastResults.fifoAuditRows)
        ? window.lastResults.fifoAuditRows
        : expandSaleRowsForReporting(window.lastResults.sales || []);

    if (!auditRows.length) {
        alert('Ei FIFO-audit rivejä exporttia varten');
        return;
    }

    let csv = 'Myynti pvm,Arvopaperi,Myyty määrä,Hankinta pvm,Lotista käytetty määrä,Lotin alkuperäinen määrä,Lotista jäljellä myynnin jälkeen,Hankintahinta osuus,Hankintakulut osuus,Myyntikulut osuus,Hankintameno-olettama osuus,Menetelmä,Voitto/tappio osuus\n';

    for (const row of auditRows) {
        csv += [
            row.soldDate.toLocaleDateString('fi-FI'),
            formatSaleInstrumentDisplay(row),
            formatQuantityCsv(row.qty),
            row.acquiredDate.toLocaleDateString('fi-FI'),
            formatQuantityCsv(row.qty),
            formatQuantityCsv(row.lotOriginalQty),
            formatQuantityCsv(row.lotQtyAfterSale),
            formatNumber(row.acquisitionPriceEur).replace(',', '.'),
            formatNumber(row.acquisitionFeesEur).replace(',', '.'),
            formatNumber(row.sellFeesEur).replace(',', '.'),
            formatDeemedCostCsv(row),
            row.methodUsed,
            formatNumber(row.gainEur).replace(',', '.')
        ].join(',') + '\n';
    }

    triggerDownload(csv, 'text/csv;charset=utf-8;', `fifo_audit_${window.lastResults.year}.csv`);
}

function exportDividendsCSV() {
    if (!window.lastResults) {
        alert('Laske ensin verot');
        return;
    }

    const rows = Array.isArray(window.lastResults.dividends) ? window.lastResults.dividends : [];
    if (!rows.length) {
        alert('Ei osinkorivejä exporttia varten');
        return;
    }

    let csv = 'Päivä,Arvopaperi,Brutto-osinko\n';
    for (const row of rows) {
        csv += [
            row.date.toLocaleDateString('fi-FI'),
            formatSaleInstrumentDisplay({ symbol: row.symbol, symbolName: row.symbolName }),
            formatNumber(row.amount).replace(',', '.')
        ].join(',') + '\n';
    }

    triggerDownload(csv, 'text/csv;charset=utf-8;', `osingot_${window.lastResults.year}.csv`);
}

function exportInterestsCSV() {
    if (!window.lastResults) {
        alert('Laske ensin verot');
        return;
    }

    const rows = Array.isArray(window.lastResults.interests) ? window.lastResults.interests : [];
    if (!rows.length) {
        alert('Ei korkorivejä exporttia varten');
        return;
    }

    let csv = 'Päivä,Tapahtuma,Määrä\n';
    for (const row of rows) {
        csv += [
            row.date.toLocaleDateString('fi-FI'),
            'Interest on cash',
            formatNumber(row.amount).replace(',', '.')
        ].join(',') + '\n';
    }

    triggerDownload(csv, 'text/csv;charset=utf-8;', `korot_${window.lastResults.year}.csv`);
}

function export9APdf() {
    if (!window.AppPdfExport || typeof window.AppPdfExport.export9APdf !== 'function') {
        alert('PDF-vienti ei ole käytettävissä tällä hetkellä.');
        return;
    }

    window.AppPdfExport.export9APdf();
}

function exportTaxSummaryPdf() {
    if (!window.AppPdfExport || typeof window.AppPdfExport.exportTaxSummaryPdf !== 'function') {
        alert('Yhteenveto-PDF-vienti ei ole käytettävissä tällä hetkellä.');
        return;
    }

    window.AppPdfExport.exportTaxSummaryPdf();
}

window.toggleSales = toggleSales;
window.toggleFifoAudit = toggleFifoAudit;
window.toggleDividends = toggleDividends;
window.toggleInterests = toggleInterests;
window.refreshToggleButtonsState = refreshToggleButtonsState;
window.restoreSectionVisibilityState = restoreSectionVisibilityState;
window.exportAsJSON = exportAsJSON;
window.exportAsSellersCSV = exportAsSellersCSV;
window.exportFifoAuditCSV = exportFifoAuditCSV;
window.exportDividendsCSV = exportDividendsCSV;
window.exportInterestsCSV = exportInterestsCSV;
window.export9APdf = export9APdf;
window.exportTaxSummaryPdf = exportTaxSummaryPdf;

if (typeof document !== 'undefined') {
    restoreSectionVisibilityState();
    refreshToggleButtonsState();
}
})();
