import ExcelJS from 'exceljs';

// Cache logo base64 in memory
let cachedLogoBase64 = null;

export async function getLogoBase64() {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const res = await fetch('/logo/DEFLOW_LOGO_TAGLINE_CKLT.png');
    if (!res.ok) throw new Error('Logo fetch failed with status ' + res.status);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result;
        resolve(cachedLogoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not load logo for Excel export:', err);
    return null;
  }
}

/**
 * Format month & year in Indonesian, e.g. "AGUSTUS 2026" or "OKTOBER 2026"
 */
export function formatMonthYearLabel(startDate, endDate) {
  if (!startDate) {
    const now = new Date();
    return now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
  }
  const d1 = new Date(startDate);
  const d2 = new Date(endDate || startDate);
  const m1 = d1.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const m2 = d2.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  if (m1 === m2) {
    return m1.toUpperCase();
  }
  return `${d1.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase()} - ${d2.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase()}`;
}

/**
 * Export styled Deflow Excel with logo and merged title banner
 */
export async function exportStyledExcel({ fileName, sheets = [] }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DEFLOW Aesthetic Clinic';
  workbook.lastModifiedBy = 'DEFLOW Management System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const logoBase64 = await getLogoBase64();
  let logoImageId = null;
  if (logoBase64) {
    try {
      logoImageId = workbook.addImage({
        base64: logoBase64,
        extension: 'png',
      });
    } catch (e) {
      console.warn('Error adding logo to workbook:', e);
    }
  }

  for (const sheetDef of sheets) {
    const worksheet = workbook.addWorksheet(sheetDef.name || 'Sheet1', {
      views: [{ showGridLines: true }]
    });

    const cols = sheetDef.columns || [];
    const totalCols = Math.max(cols.length, 7);

    // Setup columns: Column 1 is empty left margin, then columns 2..N correspond to data cols
    worksheet.columns = [
      { key: '_margin', width: 3 }, // Column A (Margin)
      ...cols.map((c, idx) => ({
        key: c.key,
        width: c.width || (idx === 0 ? 8 : 22),
      }))
    ];

    // Configure row heights
    worksheet.getRow(1).height = 10; // Top margin
    worksheet.getRow(2).height = 24; // Logo & Title Row 1
    worksheet.getRow(3).height = 24; // Logo & Title Row 2
    worksheet.getRow(4).height = 18; // Subtitle / Period Row
    worksheet.getRow(5).height = 12; // Gap
    worksheet.getRow(6).height = 26; // Table Header Row

    // 1. Add Logo in Columns B to D (rows 2 to 4)
    if (logoImageId !== null) {
      try {
        worksheet.addImage(logoImageId, {
          tl: { col: 1.1, row: 1.1 },
          ext: { width: 155, height: 73 },
          editAs: 'oneCell'
        });
      } catch (err) {
        console.warn('Error placing logo image:', err);
      }
    } else {
      worksheet.mergeCells('B2:C3');
      const logoTextCell = worksheet.getCell('B2');
      logoTextCell.value = 'DEFLOW\nAESTHETIC CLINIC';
      logoTextCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: '7D5141' } };
      logoTextCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }

    // 2. Merged Title Banner in Columns E to Last Column (Rows 2 to 3)
    const titleStartCol = 5; // Column E
    const titleEndCol = totalCols + 1; // Last data column (offset by 1 margin column)

    worksheet.mergeCells(2, titleStartCol, 3, titleEndCol);
    const titleCell = worksheet.getCell(2, titleStartCol);
    titleCell.value = sheetDef.title || 'DATA DEFLOW AESTHETIC CLINIC';
    titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: '1E1B15' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FAF3E8' } // Luxury warm beige
    };
    titleCell.border = {
      top: { style: 'thin', color: { argb: 'D6C2BD' } },
      bottom: { style: 'thin', color: { argb: 'D6C2BD' } },
      left: { style: 'thin', color: { argb: 'D6C2BD' } },
      right: { style: 'thin', color: { argb: 'D6C2BD' } }
    };

    // Subtitle / Period in Row 4 (Columns E to Last Column)
    worksheet.mergeCells(4, titleStartCol, 4, titleEndCol);
    const subCell = worksheet.getCell(4, titleStartCol);
    subCell.value = sheetDef.subtitle || (sheetDef.period ? `Periode: ${sheetDef.period}` : 'DEFLOW AESTHETIC CLINIC REPORT');
    subCell.font = { name: 'Arial', size: 9.5, italic: true, bold: true, color: { argb: '7D5141' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    subCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FAF3E8' }
    };
    subCell.border = {
      top: { style: 'thin', color: { argb: 'D6C2BD' } },
      bottom: { style: 'thin', color: { argb: 'D6C2BD' } },
      left: { style: 'thin', color: { argb: 'D6C2BD' } },
      right: { style: 'thin', color: { argb: 'D6C2BD' } }
    };

    // 3. Table Header in Row 6 (starting at Column B / index 2)
    const headerRow = worksheet.getRow(6);
    cols.forEach((c, idx) => {
      const cell = headerRow.getCell(idx + 2); // Offset +2 because column 1 is margin
      cell.value = c.header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '514440' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F3ECE3' } // Clean elegant cream
      };
      cell.alignment = { vertical: 'middle', horizontal: c.alignment || 'center', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: '7D5141' } },
        bottom: { style: 'medium', color: { argb: '7D5141' } },
        left: { style: 'thin', color: { argb: 'D6C2BD' } },
        right: { style: 'thin', color: { argb: 'D6C2BD' } }
      };
    });

    // 4. Populate Data Rows starting from Row 7
    let currentRowIdx = 7;
    (sheetDef.data || []).forEach((rowObj, dataIdx) => {
      const dataRow = worksheet.getRow(currentRowIdx);
      dataRow.height = 20;

      cols.forEach((colDef, colIdx) => {
        const cell = dataRow.getCell(colIdx + 2); // Offset +2
        const val = rowObj[colDef.key];

        if (colDef.isCurrency) {
          cell.value = Number(val) || 0;
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (colDef.isNumber) {
          cell.value = Number(val) || 0;
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.value = val !== undefined && val !== null ? String(val) : '-';
          cell.alignment = { vertical: 'middle', horizontal: colDef.alignment || (colIdx === 0 ? 'center' : 'left') };
        }

        cell.font = { name: 'Arial', size: 9.5, color: { argb: '1E1B15' } };

        // Zebra striping
        if (dataIdx % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FCFAF7' }
          };
        }

        cell.border = {
          top: { style: 'thin', color: { argb: 'E5DED4' } },
          bottom: { style: 'thin', color: { argb: 'E5DED4' } },
          left: { style: 'thin', color: { argb: 'E5DED4' } },
          right: { style: 'thin', color: { argb: 'E5DED4' } }
        };
      });

      currentRowIdx++;
    });

    // 5. Optional Summary / Total Row
    if (sheetDef.summaryRow) {
      const summaryRow = worksheet.getRow(currentRowIdx);
      summaryRow.height = 22;

      cols.forEach((colDef, colIdx) => {
        const cell = summaryRow.getCell(colIdx + 2); // Offset +2
        const val = sheetDef.summaryRow[colDef.key];

        if (colDef.isCurrency) {
          cell.value = Number(val) || 0;
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (colDef.isNumber) {
          cell.value = Number(val) || 0;
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.value = val !== undefined && val !== null ? String(val) : '';
          cell.alignment = { vertical: 'middle', horizontal: colDef.alignment || 'left' };
        }

        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E1B15' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FAF3E8' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: '7D5141' } },
          bottom: { style: 'double', color: { argb: '7D5141' } },
          left: { style: 'thin', color: { argb: 'D6C2BD' } },
          right: { style: 'thin', color: { argb: 'D6C2BD' } }
        };
      });
      currentRowIdx++;
    }
  }

  // Generate blob and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
