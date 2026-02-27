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

const EMBEDDED_DEMO_TRADING212_CSV = `Action,Time,Ticker,No. of shares,Gross Total,Currency (Gross Total),Currency conversion fee
Market buy,2024-01-08 10:12:00,AAPL,3,498.00,EUR,0.15
Market buy,2024-01-10 11:25:00,MSFT,2,710.00,EUR,0.12
Market buy,2024-01-15 14:04:00,NVDA,1.2,576.00,EUR,0.10
Market buy,2024-01-22 09:41:00,AMZN,2.8,432.00,EUR,0.11
Market buy,2024-02-01 16:22:00,GOOGL,2,282.00,EUR,0.09
Market buy,2024-02-06 12:03:00,META,1.4,602.00,EUR,0.13
Market buy,2024-02-14 10:19:00,TSLA,3.5,658.00,EUR,0.14
Market buy,2024-02-20 15:11:00,VWCE,5.2,541.00,EUR,0.16
Market buy,2024-03-05 13:48:00,EUNL,4.7,437.00,EUR,0.12
Market buy,2024-03-12 09:33:00,QQQ,1.5,551.00,EUR,0.10
Dividend (AAPL),2024-03-29 00:00:00,AAPL,0,2.96,EUR,0.00
Dividend (MSFT),2024-04-11 00:00:00,MSFT,0,3.04,EUR,0.00
Dividend (META),2024-04-26 00:00:00,META,0,1.12,EUR,0.00
Interest on cash,2024-04-30 00:00:00,CASH,0,0.41,EUR,0.00
Market buy,2024-05-03 10:02:00,AAPL,1.5,255.00,EUR,0.08
Market buy,2024-05-10 11:57:00,MSFT,1.2,426.00,EUR,0.07
Market buy,2024-05-17 14:20:00,NVDA,0.8,408.00,EUR,0.07
Market buy,2024-05-24 15:43:00,AMZN,1.4,221.00,EUR,0.06
Market buy,2024-06-03 09:18:00,GOOGL,1.3,188.00,EUR,0.06
Market buy,2024-06-07 12:27:00,META,0.9,404.00,EUR,0.08
Market buy,2024-06-14 10:44:00,TSLA,1.7,333.00,EUR,0.07
Market buy,2024-06-21 13:09:00,VWCE,2.3,249.00,EUR,0.08
Market buy,2024-07-02 16:01:00,EUNL,2.1,204.00,EUR,0.07
Market buy,2024-07-11 09:52:00,QQQ,0.7,269.00,EUR,0.06
Dividend (AAPL),2024-08-16 00:00:00,AAPL,0,3.48,EUR,0.00
Dividend (MSFT),2024-09-12 00:00:00,MSFT,0,3.42,EUR,0.00
Dividend (VWCE),2024-09-30 00:00:00,VWCE,0,1.35,EUR,0.00
Interest on cash,2024-10-01 00:00:00,CASH,0,0.52,EUR,0.00
Dividend (AAPL),2024-11-15 00:00:00,AAPL,0,3.51,EUR,0.00
Dividend (MSFT),2024-12-12 00:00:00,MSFT,0,3.58,EUR,0.00
Dividend (VWCE),2024-12-31 00:00:00,VWCE,0,1.44,EUR,0.00
Interest on cash,2025-01-01 00:00:00,CASH,0,0.61,EUR,0.00
Market sell,2025-01-15 10:30:00,AAPL,2,380.00,EUR,0.09
Market sell,2025-01-22 14:15:00,MSFT,1.2,470.00,EUR,0.09
Market sell,2025-01-28 11:42:00,NVDA,0.7,510.00,EUR,0.09
Market sell,2025-02-04 13:57:00,AMZN,1.6,285.00,EUR,0.08
Market sell,2025-02-10 09:26:00,GOOGL,1.1,216.00,EUR,0.08
Market sell,2025-02-18 15:20:00,META,0.9,453.00,EUR,0.08
Market sell,2025-02-24 10:06:00,TSLA,1.8,382.00,EUR,0.08
Market sell,2025-03-03 14:34:00,VWCE,2.6,321.00,EUR,0.09
Market sell,2025-03-11 09:40:00,EUNL,2.4,287.00,EUR,0.08
Market sell,2025-03-18 12:55:00,QQQ,0.8,336.00,EUR,0.08
Market sell,2025-03-25 10:10:00,MSFT,0.8,180.00,EUR,0.08
Market sell,2025-04-02 11:45:00,AAPL,1,120.00,EUR,0.08
Market sell,2025-04-09 15:05:00,TSLA,1.2,170.00,EUR,0.08
Dividend (AAPL),2025-03-28 00:00:00,AAPL,0,2.11,EUR,0.00
Dividend (MSFT),2025-04-10 00:00:00,MSFT,0,2.63,EUR,0.00
Interest on cash,2025-04-30 00:00:00,CASH,0,0.74,EUR,0.00`;

async function loadDemoCsvText() {
    try {
        if (typeof fetch === 'function') {
            const demoUrl = new URL('assets/data/demo_trading212_history.csv', window.location.href).toString();
            const response = await fetch(demoUrl, { cache: 'no-store' });
            if (response.ok) {
                const fetchedText = await response.text();
                if (fetchedText.trim().length > 0) {
                    return fetchedText;
                }
            }
        }
    } catch (_) {
    }

    return EMBEDDED_DEMO_TRADING212_CSV;
}

function setDemoModeIndicator(isDemoMode) {
    window.isDemoMode = !!isDemoMode;
    const demoBadge = document.getElementById('demoModeBadge');
    if (demoBadge?.classList) {
        demoBadge.classList.toggle('show', !!isDemoMode);
    }
}

async function loadDemoData() {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement?.classList) {
        errorElement.classList.remove('show');
        errorElement.textContent = '';
    }

    const demoButton = document.getElementById('loadDemoButton');
    const defaultButtonText = demoButton?.textContent || '🧪 Kokeile demoaineistolla';
    if (demoButton) {
        demoButton.disabled = true;
        demoButton.textContent = 'Ladataan demoa...';
    }

    try {
        setDemoModeIndicator(true);

        const formatSelect = document.getElementById('formatSelect');
        if (formatSelect) {
            formatSelect.value = 'trading212';
        }
        if (typeof updateFormatHelp === 'function') {
            updateFormatHelp();
        }

        const csvText = await loadDemoCsvText();
        const fileInput = document.getElementById('csvFile');
        if (!fileInput) {
            throw new Error('CSV-tiedostokenttää ei löytynyt');
        }

        if (typeof DataTransfer !== 'function' || typeof File !== 'function') {
            throw new Error('Selaimesi ei tue demoaineiston automaattista latausta');
        }

        const file = new File([csvText], 'demo_trading212_history.csv', { type: 'text/csv' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        const previewUi = window.AppPreviewUi || {};
        if (typeof previewUi.previewSelectedFile === 'function') {
            previewUi.previewSelectedFile();
        } else {
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (typeof calculateTaxes === 'function') {
            calculateTaxes();
        }
    } catch (error) {
        setDemoModeIndicator(false);
        if (errorElement?.classList) {
            errorElement.textContent = `Virhe: ${error.message}`;
            errorElement.classList.add('show');
        }
    } finally {
        if (demoButton) {
            demoButton.disabled = false;
            demoButton.textContent = defaultButtonText;
        }
    }
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
    setDemoModeIndicator(false);

    if (typeof refreshToggleButtonsState === 'function') {
        refreshToggleButtonsState();
    }

    const csvFileInput = document.getElementById('csvFile');
    if (csvFileInput && typeof csvFileInput.addEventListener === 'function') {
        csvFileInput.addEventListener('change', () => {
            setDemoModeIndicator(false);
            previewSelectedFile();
        });
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
    window.loadDemoData = loadDemoData;
}

if (typeof document !== 'undefined') {
    initializeTrading212App();
}
