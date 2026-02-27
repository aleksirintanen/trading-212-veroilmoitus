function validateRequiredModules() {
    const missing = [];

    if (!window.AppCore) missing.push('window.AppCore (assets/js/core/core-engine.js)');
    if (!window.AppPreviewUi) missing.push('window.AppPreviewUi (assets/js/ui/preview-ui.js)');
    if (!window.AppPdfExport) missing.push('window.AppPdfExport (assets/js/ui/pdf-export.js)');

    if (typeof calculateTaxes !== 'function') missing.push('calculateTaxes (assets/js/app-tax-calculation.js)');
    if (typeof updateFormatHelp !== 'function') missing.push('updateFormatHelp (assets/js/app-tax-calculation.js)');
    if (typeof exportAsJSON !== 'function') missing.push('exportAsJSON (assets/js/app-exports.js)');
    if (typeof exportAsSellersCSV !== 'function') missing.push('exportAsSellersCSV (assets/js/app-exports.js)');
    if (typeof exportFifoAuditCSV !== 'function') missing.push('exportFifoAuditCSV (assets/js/app-exports.js)');
        if (typeof export9APdf !== 'function') missing.push('export9APdf (assets/js/app-exports.js)');
        if (typeof exportDividendsCSV !== 'function') missing.push('exportDividendsCSV (assets/js/app-exports.js)');
        if (typeof exportInterestsCSV !== 'function') missing.push('exportInterestsCSV (assets/js/app-exports.js)');

    if (missing.length === 0) {
        return true;
    }

    const message = [
        'Trading 212 Veroilmoitus: puuttuvia moduuleja tai väärä script-järjestys.',
        ...missing.map(item => `- ${item}`),
        'Tarkista docs/index.html script load order.'
    ].join('\n');

    console.error(message);

    const errorElement = document.getElementById('errorMessage');
    if (errorElement && errorElement.classList) {
        errorElement.textContent = 'Sovelluksen alustaminen epäonnistui: tarkista konsoli (script load order).';
        errorElement.classList.add('show');
    }

    return false;
}

function initializeTrading212App() {
    if (!validateRequiredModules()) {
        return;
    }

    const previewUi = window.AppPreviewUi || {};
    const setExportButtonsState = previewUi.setExportButtonsState || (() => {});
    const setSalesEmptyState = previewUi.setSalesEmptyState || (() => {});
    const resetCsvPreview = previewUi.resetCsvPreview || (() => {});
    const previewSelectedFile = previewUi.previewSelectedFile || (() => {});

    if (typeof updateFormatHelp === 'function') {
        updateFormatHelp();
    }

    setExportButtonsState(false, false);
    resetCsvPreview();
    setSalesEmptyState(false);

    if (typeof refreshToggleButtonsState === 'function') {
        refreshToggleButtonsState();
    }

    const csvFileInput = document.getElementById('csvFile');
    if (csvFileInput && typeof csvFileInput.addEventListener === 'function') {
        csvFileInput.addEventListener('change', previewSelectedFile);
    }

    const formatSelect = document.getElementById('formatSelect');
    if (formatSelect && typeof formatSelect.addEventListener === 'function') {
        formatSelect.addEventListener('change', () => {
            const fileInput = document.getElementById('csvFile');
            if (fileInput?.files?.length) {
                previewSelectedFile();
            }
        });
    }

    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey && typeof calculateTaxes === 'function') {
            calculateTaxes();
        }
    });
}

if (typeof window !== 'undefined') {
    window.initializeTrading212App = initializeTrading212App;
}

if (typeof document !== 'undefined') {
    initializeTrading212App();
}
