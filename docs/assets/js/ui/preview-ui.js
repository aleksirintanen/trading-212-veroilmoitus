(function(global) {
    const CSV_PREVIEW_MAX_ROWS = 8;

    function setExportButtonsState(hasResults, hasSales = false) {
        const jsonButton = document.getElementById('exportJsonButton');
        const salesCsvButton = document.getElementById('exportSalesCsvButton');
        const pdfButton = document.getElementById('exportPdfButton');

        if (jsonButton) jsonButton.disabled = !hasResults;
        if (pdfButton) pdfButton.disabled = !hasResults;
        if (salesCsvButton) salesCsvButton.disabled = !(hasResults && hasSales);
    }

    function setCalculatingState(isCalculating) {
        const button = document.getElementById('calculateButton');
        if (!button) return;

        if (!button.dataset.defaultText) {
            button.dataset.defaultText = button.textContent;
        }

        button.disabled = !!isCalculating;
        button.textContent = isCalculating ? 'Lasketaan...' : button.dataset.defaultText;
    }

    function setSalesEmptyState(visible) {
        const emptyState = document.getElementById('salesEmptyState');
        if (!emptyState || !emptyState.classList) return;
        emptyState.classList.toggle('show', !!visible);
    }

    function hideResults() {
        const results = document.getElementById('results');
        if (results && results.classList) {
            results.classList.remove('show');
        }
    }

    function resetCsvPreview(message = 'Valitse tiedosto nähdäksesi esikatselun.') {
        const previewBox = document.getElementById('csvPreviewBox');
        const previewMeta = document.getElementById('csvPreviewMeta');
        const previewWrap = document.getElementById('csvPreviewTableWrap');

        if (previewMeta) {
            previewMeta.textContent = message;
        }
        if (previewWrap) {
            previewWrap.textContent = '';
        }
        if (previewBox && previewBox.classList) {
            previewBox.classList.remove('show');
        }
    }

    function renderCsvPreview(rows, selectedFormat) {
        const previewBox = document.getElementById('csvPreviewBox');
        const previewMeta = document.getElementById('csvPreviewMeta');
        const previewWrap = document.getElementById('csvPreviewTableWrap');

        if (!previewBox || !previewMeta || !previewWrap) return;

        previewBox.classList.add('show');
        previewWrap.textContent = '';

        const detectedFormat = global.autoDetectFormat(rows);
        const formatLabel = detectedFormat === 'trading212'
            ? 'Trading 212'
            : detectedFormat === 'manual'
                ? 'Manuaalinen'
                : 'Tuntematon';

        if (!rows.length) {
            previewMeta.textContent = `CSV on tyhjä. Valittu muoto: ${selectedFormat}.`;
            return;
        }

        const headers = Object.keys(rows[0] || {});
        const previewRows = rows.slice(0, CSV_PREVIEW_MAX_ROWS);

        previewMeta.textContent = `Rivejä: ${rows.length} | Sarakkeita: ${headers.length} | Tunnistettu muoto: ${formatLabel}`;

        const table = document.createElement('table');
        table.className = 'csv-preview-table';

        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        const rowNumberHeader = document.createElement('th');
        rowNumberHeader.textContent = '#';
        rowNumberHeader.className = 'csv-preview-rownum';
        headRow.appendChild(rowNumberHeader);
        for (const header of headers) {
            const th = document.createElement('th');
            th.textContent = header;
            headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (let index = 0; index < previewRows.length; index++) {
            const row = previewRows[index];
            const tr = document.createElement('tr');

            const rowNumberCell = document.createElement('td');
            rowNumberCell.className = 'csv-preview-rownum';
            rowNumberCell.textContent = String(index + 2);
            tr.appendChild(rowNumberCell);

            for (const header of headers) {
                const td = document.createElement('td');
                td.textContent = String(row[header] || '');
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        previewWrap.appendChild(table);

        if (rows.length > previewRows.length) {
            const overflowNote = document.createElement('div');
            overflowNote.className = 'help-text';
            overflowNote.textContent = `Näytetään ${previewRows.length} ensimmäistä riviä.`;
            previewWrap.appendChild(overflowNote);
        }
    }

    function previewSelectedFile() {
        const fileInput = document.getElementById('csvFile');
        if (!fileInput || !fileInput.files || !fileInput.files.length) {
            resetCsvPreview();
            global.lastResults = null;
            setExportButtonsState(false, false);
            hideResults();
            return;
        }

        const selectedFormat = document.getElementById('formatSelect')?.value || 'trading212';
        const file = fileInput.files[0];
        const reader = new FileReader();

        resetCsvPreview('Luetaan CSV-esikatselua...');
        document.getElementById('csvPreviewBox')?.classList?.add('show');

        reader.onload = function(event) {
            try {
                const csvText = event.target?.result || '';
                const rows = global.parseCSV(csvText);
                renderCsvPreview(rows, selectedFormat);
                global.lastResults = null;
                setExportButtonsState(false, false);
                hideResults();
            } catch (error) {
                resetCsvPreview(`Esikatselu epäonnistui: ${error.message}`);
                document.getElementById('csvPreviewBox')?.classList?.add('show');
            }
        };

        reader.onerror = function() {
            resetCsvPreview('Esikatselu epäonnistui: tiedoston lukeminen ei onnistunut.');
            document.getElementById('csvPreviewBox')?.classList?.add('show');
        };

        reader.readAsText(file);
    }

    global.AppPreviewUi = {
        setExportButtonsState,
        setCalculatingState,
        setSalesEmptyState,
        hideResults,
        resetCsvPreview,
        previewSelectedFile
    };
})(window);
