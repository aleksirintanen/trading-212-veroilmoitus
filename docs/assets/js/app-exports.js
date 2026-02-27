(() => {
const exportsCore = window.AppCore || {};
const {
    formatNumber,
    formatQuantityCsv,
    formatSaleInstrumentDisplay,
    formatDeemedCostCsv,
    expandSaleRowsForReporting
} = exportsCore;

function toggleSales() {
    document.getElementById('salesSection').classList.toggle('show');
}

function toggleDividends() {
    document.getElementById('dividendsSection').classList.toggle('show');
}

function toggleInterests() {
    document.getElementById('interestsSection').classList.toggle('show');
}

function exportAsJSON() {
    if (!window.lastResults) {
        alert('Laske ensin verot');
        return;
    }

    const data = JSON.stringify(window.lastResults, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veroilmoitus_${window.lastResults.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myynnit_${window.lastResults.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function export9APdf() {
    if (!window.AppPdfExport || typeof window.AppPdfExport.export9APdf !== 'function') {
        alert('PDF-vienti ei ole käytettävissä tällä hetkellä.');
        return;
    }

    window.AppPdfExport.export9APdf();
}

window.toggleSales = toggleSales;
window.toggleDividends = toggleDividends;
window.toggleInterests = toggleInterests;
window.exportAsJSON = exportAsJSON;
window.exportAsSellersCSV = exportAsSellersCSV;
window.export9APdf = export9APdf;
})();
