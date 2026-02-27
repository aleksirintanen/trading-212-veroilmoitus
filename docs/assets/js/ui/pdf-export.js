(function(global) {
    function export9APdf() {
        if (!global.lastResults) {
            global.alert('Laske ensin verot');
            return;
        }

        if (!global.jspdf || !global.jspdf.jsPDF) {
            global.alert('PDF-kirjasto ei latautunut. Yritä päivittää sivu ja kokeile uudelleen.');
            return;
        }

        const { jsPDF } = global.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let y = margin;

        const results = global.lastResults;
        const sales = [...(results.sales || [])].sort((a, b) => a.soldDate - b.soldDate);
        const summary = results.omaVeroSummary || {
            profitable: { proceedsTotal: 0, costTotal: 0, gainTotal: 0 },
            lossMaking: { proceedsTotal: 0, costTotal: 0, gainTotal: 0 }
        };
        const fullName = (document.getElementById('fullName')?.value || '').trim() || '-';
        const personalId = (document.getElementById('personalId')?.value || '').trim() || '-';
        const periodText = `1.1.${results.year} - 31.12.${results.year}`;

        const euro = (v) => `${Number(v || 0).toFixed(2)} €`;
        const toDate = (d) => {
            if (d instanceof Date) return d.toLocaleDateString('fi-FI');
            return new Date(d).toLocaleDateString('fi-FI');
        };
        const money = (v) => `${Number(v || 0).toFixed(2)} EUR`;

        function addHeader() {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.text('9A-liite (arvopaperien luovutukset)', margin, y);
            y += 18;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Nimi: ${fullName}`, margin, y);
            y += 12;
            doc.text(`Henkilö-/Y-tunnus: ${personalId}`, margin, y);
            y += 12;
            doc.text(`Period: ${periodText}`, margin, y);
            y += 12;
            doc.text('Koonti OmaVeroa varten: voitolliset ja tappiolliset myynnit erikseen.', margin, y);
            y += 14;

            doc.setDrawColor(210);
            doc.line(margin, y, pageWidth - margin, y);
            y += 16;
        }

        function ensureSpace(requiredHeight) {
            if (y + requiredHeight <= pageHeight - margin) return;
            doc.addPage();
            y = margin;
            addHeader();
        }

        function writeSummaryLine(label, proceeds, cost, gain, gainLabel) {
            ensureSpace(18);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(label, margin, y);
            y += 12;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Myynnit yht.: ${euro(proceeds)}`, margin + 12, y);
            doc.text(`Hankintameno yht.: ${euro(cost)}`, margin + 190, y);
            doc.text(`${gainLabel}: ${euro(gain)}`, margin + 410, y);
            y += 13;
        }

        addHeader();

        writeSummaryLine(
            'Voitolliset myynnit',
            summary.profitable.proceedsTotal,
            summary.profitable.costTotal,
            summary.profitable.gainTotal,
            'Voitto yht.'
        );
        writeSummaryLine(
            'Tappiolliset myynnit',
            summary.lossMaking.proceedsTotal,
            summary.lossMaking.costTotal,
            summary.lossMaking.gainTotal,
            'Tappio yht.'
        );

        ensureSpace(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Myyntikohtaiset rivit', margin, y);
        y += 12;

        const tableColumns = [
            { key: 'symbol', header: 'Luovutettu arvopaperi/arvo-osuus', width: 130, align: 'left' },
            { key: 'qty', header: 'Määrä', width: 50, align: 'right' },
            { key: 'acquisitionDate', header: 'Hankinta-aika', width: 45, align: 'right' },
            { key: 'soldDate', header: 'Luovutusaika', width: 45, align: 'right' },
            { key: 'proceeds', header: 'Luovutushinta', width: 45, align: 'right' },
            { key: 'acquisitionPrice', header: 'Hankintahinta', width: 45, align: 'right' },
            { key: 'acquisitionFees', header: 'Hankintakulu', width: 40, align: 'right' },
            { key: 'sellFees', header: 'Myyntikulu', width: 40, align: 'right' },
            { key: 'deemedCost', header: 'Hankintameno-olettama', width: 50, align: 'right' },
            { key: 'gain', header: 'Voitto/tappio', width: 64, align: 'right' }
        ];

        const tableWidth = pageWidth - margin * 2;
        const configuredWidth = tableColumns.reduce((sum, col) => sum + col.width, 0);
        const widthScale = tableWidth / configuredWidth;
        const scaledColumns = tableColumns.map(col => ({ ...col, width: col.width * widthScale }));
        const tableLeftInset = 1.2;
        const tableRightInset = 1.2;

        function getHeaderFontSize() {
            const paddingX = tableRightInset;
            for (let size = 7; size >= 3.5; size -= 0.25) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(size);
                const fitsAll = scaledColumns.every(col => doc.getTextWidth(col.header) <= (col.width - paddingX * 2));
                if (fitsAll) return size;
            }
            return 3.5;
        }

        const headerFontSize = getHeaderFontSize();

        function drawTableHeader() {
            const rowHeight = 11;

            if (y + rowHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
                addHeader();
                ensureSpace(24);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text('Myyntikohtaiset rivit (jatkuu)', margin, y);
                y += 14;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(headerFontSize);
            doc.setDrawColor(180);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageWidth - margin, y);

            let x = margin;
            for (const col of scaledColumns) {
                const textY = y + rowHeight / 2 + headerFontSize * 0.3;
                if (col.align === 'right') {
                    doc.text(col.header, x + col.width - tableRightInset, textY, { align: 'right' });
                } else {
                    doc.text(col.header, x + tableLeftInset, textY);
                }
                x += col.width;
            }

            y += rowHeight;
            doc.line(margin, y, pageWidth - margin, y);
        }

        function drawTableRow(cells) {
            const fontSize = 7;
            const lineHeight = 8;
            const paddingY = 3;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(fontSize);

            const wrapped = scaledColumns.map((col, index) => {
                const text = String(cells[index] ?? '');
                if (col.align === 'right') {
                    return [text];
                }
                return doc.splitTextToSize(text, Math.max(8, col.width - tableLeftInset - tableRightInset));
            });

            const maxLines = Math.max(...wrapped.map(lines => lines.length), 1);
            const rowHeight = maxLines * lineHeight + paddingY * 2;

            if (y + rowHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
                addHeader();
                ensureSpace(24);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text('Myyntikohtaiset rivit (jatkuu)', margin, y);
                y += 14;
                drawTableHeader();
            }

            let x = margin;
            for (let i = 0; i < scaledColumns.length; i++) {
                const col = scaledColumns[i];
                const lines = wrapped[i];

                if (col.align === 'right') {
                    doc.text(lines, x + col.width - tableRightInset, y + paddingY + 6, { align: 'right' });
                } else {
                    doc.text(lines, x + tableLeftInset, y + paddingY + 6);
                }
                x += col.width;
            }

            y += rowHeight;
            doc.setDrawColor(205);
            doc.setLineWidth(0.2);
            doc.line(margin, y, pageWidth - margin, y);
        }

        drawTableHeader();

        const reportRows = global.expandSaleRowsForReporting(sales);
        for (const s of reportRows) {
            drawTableRow([
                global.formatSaleInstrumentDisplay(s),
                global.formatQuantity(s.qty),
                toDate(s.acquiredDate),
                toDate(s.soldDate),
                money(s.proceedsEur),
                money(s.acquisitionPriceEur),
                money(s.acquisitionFeesEur),
                money(s.sellFeesEur),
                s.methodUsed === 'DEEMED' ? money(s.deemedCostEur) : '-',
                money(s.gainEur)
            ]);
        }

        ensureSpace(30);
        y += 8;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.text('Huom: Tarkista tiedot ennen OmaVeroon ilmoittamista.', margin, y);

        const pdfArrayBuffer = doc.output('arraybuffer');
        const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/octet-stream' });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.target = '_self';
        link.download = `9A_liite_${results.year}.pdf`;
        link.setAttribute('download', `9A_liite_${results.year}.pdf`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(pdfUrl);
    }

    global.AppPdfExport = {
        export9APdf
    };
})(window);
