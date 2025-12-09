// src/lib/services/pdf-export-service.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DatasetAnalysis, ColumnStatistics } from './csv-analysis-service';
import { CSVAnalysisService } from './csv-analysis-service';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

export class PDFExportService {
  private static readonly PAGE_WIDTH = 210; // A4 width in mm
  private static readonly PAGE_HEIGHT = 297; // A4 height in mm
  private static readonly MARGIN = 15;
  private static readonly CONTENT_WIDTH = PDFExportService.PAGE_WIDTH - 2 * PDFExportService.MARGIN;

  /**
   * Export dataset analysis to PDF
   */
  static async exportAnalysisToPDF(
    analysis: DatasetAnalysis,
    modelName?: string
  ): Promise<void> {
    const doc = new jsPDF();
    let yPosition = this.MARGIN;

    // Add header
    yPosition = this.addHeader(doc, analysis, modelName, yPosition);

    // Add dataset overview
    yPosition = this.addDatasetOverview(doc, analysis, yPosition);

    // Add numerical features table
    const numericalColumns = analysis.columns.filter(c => c.type === 'numerical');
    if (numericalColumns.length > 0) {
      yPosition = this.addNumericalFeaturesTable(doc, numericalColumns, yPosition);
    }

    // Add categorical features table
    const categoricalColumns = analysis.columns.filter(c => c.type === 'categorical');
    if (categoricalColumns.length > 0) {
      yPosition = this.addCategoricalFeaturesTable(doc, categoricalColumns, yPosition);
    }

    // Add missing data summary
    const columnsWithMissing = analysis.columns.filter(c => c.nullValues > 0);
    if (columnsWithMissing.length > 0) {
      yPosition = this.addMissingDataSummary(doc, columnsWithMissing, analysis.totalRows, yPosition);
    }

    // Add analysis summary
    yPosition = this.addAnalysisSummary(doc, analysis, yPosition);

    // Add footer to all pages
    this.addFooter(doc);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFileName = analysis.fileName.replace(/\.[^/.]+$/, '');
    const fileName = `dataset-analysis_${baseFileName}_${timestamp}.pdf`;

    // Save the PDF
    doc.save(fileName);
  }

  /**
   * Add header section with title and basic info
   */
  private static addHeader(
    doc: jsPDF,
    analysis: DatasetAnalysis,
    modelName: string | undefined,
    yPosition: number
  ): number {
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Dataset Analysis Report', this.MARGIN, yPosition);
    yPosition += 10;

    // Subtitle with model name if provided
    if (modelName) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Model: ${modelName}`, this.MARGIN, yPosition);
      yPosition += 6;
    }

    // Generation date
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated: ${new Date().toLocaleString()}`, this.MARGIN, yPosition);
    yPosition += 8;

    // Horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(this.MARGIN, yPosition, this.PAGE_WIDTH - this.MARGIN, yPosition);
    yPosition += 10;

    doc.setTextColor(0, 0, 0);
    return yPosition;
  }

  /**
   * Add dataset overview section
   */
  private static addDatasetOverview(
    doc: jsPDF,
    analysis: DatasetAnalysis,
    yPosition: number
  ): number {
    // Check if we need a new page
    if (yPosition > this.PAGE_HEIGHT - 80) {
      doc.addPage();
      yPosition = this.MARGIN;
    }

    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Dataset Overview', this.MARGIN, yPosition);
    yPosition += 8;

    // Overview data
    const overviewData = [
      ['File Name', analysis.fileName],
      ['File Size', CSVAnalysisService.formatFileSize(analysis.fileSize)],
      ['Total Rows', analysis.totalRows.toLocaleString()],
      ['Total Columns', analysis.totalColumns.toString()],
      ['Numerical Columns', analysis.columns.filter(c => c.type === 'numerical').length.toString()],
      ['Categorical Columns', analysis.columns.filter(c => c.type === 'categorical').length.toString()],
      ['Data Completeness', `${analysis.completeness}% (${this.getCompletenessLabel(analysis.completeness)})`]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: overviewData,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: this.MARGIN, right: this.MARGIN }
    });

    return doc.lastAutoTable.finalY + 10;
  }

  /**
   * Add numerical features table
   */
  private static addNumericalFeaturesTable(
    doc: jsPDF,
    columns: ColumnStatistics[],
    yPosition: number
  ): number {
    // Check if we need a new page
    if (yPosition > this.PAGE_HEIGHT - 60) {
      doc.addPage();
      yPosition = this.MARGIN;
    }

    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Numerical Features', this.MARGIN, yPosition);
    yPosition += 8;

    const headers = ['Feature', 'Count', 'Mean', 'Std', 'Min', '25%', '50%', '75%', 'Max'];
    const body = columns.map(col => [
      col.name,
      this.formatNumber(col.count),
      this.formatNumber(col.mean),
      this.formatNumber(col.std),
      this.formatNumber(col.min),
      this.formatNumber(col.quartiles?.q1),
      this.formatNumber(col.quartiles?.q2),
      this.formatNumber(col.quartiles?.q3),
      this.formatNumber(col.max)
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [headers],
      body: body,
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold' }
      },
      margin: { left: this.MARGIN, right: this.MARGIN }
    });

    return doc.lastAutoTable.finalY + 10;
  }

  /**
   * Add categorical features table
   */
  private static addCategoricalFeaturesTable(
    doc: jsPDF,
    columns: ColumnStatistics[],
    yPosition: number
  ): number {
    // Check if we need a new page
    if (yPosition > this.PAGE_HEIGHT - 60) {
      doc.addPage();
      yPosition = this.MARGIN;
    }

    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Categorical Features', this.MARGIN, yPosition);
    yPosition += 8;

    const headers = ['Feature', 'Count', 'Unique Values', 'Most Common', 'Frequency'];
    const body = columns.map(col => [
      col.name,
      this.formatNumber(col.count),
      this.formatNumber(col.uniqueValues),
      col.mostCommon?.value || '-',
      this.formatNumber(col.mostCommon?.count)
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [headers],
      body: body,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [108, 117, 125],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        3: { cellWidth: 40 }
      },
      margin: { left: this.MARGIN, right: this.MARGIN }
    });

    return doc.lastAutoTable.finalY + 10;
  }

  /**
   * Add missing data summary
   */
  private static addMissingDataSummary(
    doc: jsPDF,
    columnsWithMissing: ColumnStatistics[],
    totalRows: number,
    yPosition: number
  ): number {
    // Check if we need a new page
    if (yPosition > this.PAGE_HEIGHT - 60) {
      doc.addPage();
      yPosition = this.MARGIN;
    }

    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Missing Data Summary', this.MARGIN, yPosition);
    yPosition += 8;

    const headers = ['Column', 'Missing Values', 'Percentage'];
    const body = columnsWithMissing.map(col => [
      col.name,
      col.nullValues.toLocaleString(),
      `${((col.nullValues / totalRows) * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [headers],
      body: body,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [220, 53, 69],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold' }
      },
      margin: { left: this.MARGIN, right: this.MARGIN }
    });

    return doc.lastAutoTable.finalY + 10;
  }

  /**
   * Add analysis summary section
   */
  private static addAnalysisSummary(
    doc: jsPDF,
    analysis: DatasetAnalysis,
    yPosition: number
  ): number {
    // Check if we need a new page
    if (yPosition > this.PAGE_HEIGHT - 80) {
      doc.addPage();
      yPosition = this.MARGIN;
    }

    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Analysis Summary', this.MARGIN, yPosition);
    yPosition += 10;

    // Data Quality subsection
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Data Quality', this.MARGIN, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const totalMissing = analysis.columns.reduce((sum, col) => sum + col.nullValues, 0);
    const columnsWithMissing = analysis.columns.filter(c => c.nullValues > 0).length;

    const qualityData = [
      `Completeness: ${analysis.completeness}%`,
      `Total Missing Values: ${totalMissing.toLocaleString()}`,
      `Columns with Missing Data: ${columnsWithMissing} of ${analysis.totalColumns}`
    ];

    qualityData.forEach(line => {
      doc.text(`  ${line}`, this.MARGIN, yPosition);
      yPosition += 5;
    });
    yPosition += 5;

    // Data Types subsection
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Data Types', this.MARGIN, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const numericalCount = analysis.columns.filter(c => c.type === 'numerical').length;
    const categoricalCount = analysis.columns.filter(c => c.type === 'categorical').length;
    const avgUniqueValues = Math.round(
      analysis.columns.reduce((sum, col) => sum + col.uniqueValues, 0) / analysis.totalColumns
    );

    const typesData = [
      `Numerical Columns: ${numericalCount}`,
      `Categorical Columns: ${categoricalCount}`,
      `Average Unique Values: ${avgUniqueValues}`
    ];

    typesData.forEach(line => {
      doc.text(`  ${line}`, this.MARGIN, yPosition);
      yPosition += 5;
    });
    yPosition += 5;

    // Recommendations subsection
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations', this.MARGIN, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const recommendations = this.getRecommendations(analysis);
    recommendations.forEach(rec => {
      const lines = doc.splitTextToSize(`  - ${rec}`, this.CONTENT_WIDTH - 5);
      doc.text(lines, this.MARGIN, yPosition);
      yPosition += lines.length * 5;
    });

    return yPosition + 10;
  }

  /**
   * Add footer to all pages
   */
  private static addFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);

      // Page number
      doc.text(
        `Page ${i} of ${pageCount}`,
        this.PAGE_WIDTH / 2,
        this.PAGE_HEIGHT - 10,
        { align: 'center' }
      );

      // App name
      doc.text(
        'FAIVOR Dashboard - Dataset Analysis Report',
        this.MARGIN,
        this.PAGE_HEIGHT - 10
      );
    }
  }

  /**
   * Get completeness label
   */
  private static getCompletenessLabel(completeness: number): string {
    if (completeness >= 95) return 'Excellent';
    if (completeness >= 85) return 'Good';
    if (completeness >= 70) return 'Fair';
    return 'Poor';
  }

  /**
   * Format number for display
   */
  private static formatNumber(num: number | null | undefined): string {
    if (num === undefined || num === null || isNaN(num)) return '-';
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  /**
   * Generate recommendations based on analysis
   */
  private static getRecommendations(analysis: DatasetAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.completeness < 85) {
      const severity = analysis.completeness < 70 ? 'High' : 'Moderate';
      recommendations.push(
        `Consider addressing missing data before model training. ${severity} amount of missing values detected.`
      );
    }

    if (analysis.columns.some(c => c.type === 'categorical' && c.uniqueValues > 50)) {
      recommendations.push(
        'Some categorical columns have high cardinality (>50 unique values). Consider feature engineering or encoding strategies.'
      );
    }

    if (analysis.totalRows < 100) {
      recommendations.push(
        `Small dataset detected (${analysis.totalRows} rows). Consider collecting more data for robust model training.`
      );
    }

    if (analysis.completeness >= 95 && analysis.totalRows >= 1000) {
      recommendations.push(
        'Excellent data quality! High completeness and sufficient sample size for model training.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Dataset appears to be in good condition for analysis.');
    }

    return recommendations;
  }
}
