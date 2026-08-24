// src/lib/services/validation-pdf-export-service.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ComprehensiveMetricsResponse } from '$lib/api/faivor-backend';
import type { UiValidationJob } from '$lib/stores/models/types';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

export interface ChartImages {
  radarChart?: string;
  rocChart?: string;
  prChart?: string;
  subgroupCharts?: Record<string, string>;
}

export class ValidationPDFExportService {
  private static readonly PAGE_WIDTH = 210; // A4 width in mm
  private static readonly PAGE_HEIGHT = 297; // A4 height in mm
  private static readonly MARGIN = 15;
  private static readonly CONTENT_WIDTH = ValidationPDFExportService.PAGE_WIDTH - 2 * ValidationPDFExportService.MARGIN;
  private static readonly CHART_WIDTH = 85; // Width for side-by-side charts
  private static readonly CHART_HEIGHT = 60; // Height for charts

  /**
   * Export validation results to PDF with optional chart images
   */
  static async exportResultsToPDF(
    validationJob: UiValidationJob,
    metricsData: ComprehensiveMetricsResponse | null,
    modelName?: string,
    chartImages?: ChartImages
  ): Promise<void> {
    const doc = new jsPDF();
    let yPosition = this.MARGIN;

    // Add header
    yPosition = this.addHeader(doc, validationJob, modelName, yPosition);

    // Add validation info
    yPosition = this.addValidationInfo(doc, validationJob, yPosition);

    // Add model info if available
    if (metricsData?.model_info) {
      yPosition = this.addModelInfo(doc, metricsData.model_info, yPosition);
    }

    // Parse metrics data
    const parsedMetrics = this.parseMetricsData(metricsData);

    // Add overall metrics
    if (parsedMetrics?.overall) {
      yPosition = this.addOverallMetrics(doc, parsedMetrics.overall, yPosition);
    }

    // Add threshold analysis
    if (parsedMetrics?.threshold_metrics) {
      yPosition = this.addThresholdAnalysis(doc, parsedMetrics.threshold_metrics, yPosition);
    }

    // Add subgroup analysis
    if (parsedMetrics?.subgroups && Object.keys(parsedMetrics.subgroups).length > 0) {
      yPosition = this.addSubgroupAnalysis(doc, parsedMetrics.subgroups, yPosition);
    }

    // Add charts section if chart images are provided
    if (chartImages && Object.keys(chartImages).length > 0) {
      yPosition = this.addChartsSection(doc, chartImages, yPosition);
    }

    // Add footer to all pages
    this.addFooter(doc);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const validationName = validationJob.validation_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'validation';
    const fileName = `validation-results_${validationName}_${timestamp}.pdf`;

    // Save the PDF
    doc.save(fileName);
  }

  /**
   * Parse metrics data handling different structures
   */
  private static parseMetricsData(metricsData: ComprehensiveMetricsResponse | null): any {
    if (!metricsData) return null;

    const hasNestedStructure = (metricsData as any).overall?.overall_metrics;
    const hasCamelCaseKeys = (metricsData as any)['Overall Metrics'] || (metricsData as any)['Threshold Metrics'];

    if (hasNestedStructure) {
      return {
        overall: (metricsData as any).overall.overall_metrics,
        threshold_metrics: (metricsData as any).overall.threshold_metrics,
        model_info: metricsData.model_info || { name: 'Unknown', type: 'Unknown' },
        subgroups: metricsData.subgroups
      };
    } else if (hasCamelCaseKeys) {
      const overallMetrics = (metricsData as any)['Overall Metrics'];
      const thresholdMetrics = (metricsData as any)['Threshold Metrics'];
      return {
        overall: typeof overallMetrics === 'string' ? JSON.parse(overallMetrics) : overallMetrics,
        threshold_metrics: typeof thresholdMetrics === 'string' ? JSON.parse(thresholdMetrics) : thresholdMetrics,
        model_info: metricsData.model_info || (metricsData as any)['Model Information'] || { name: 'Unknown', type: 'Unknown' },
        subgroups: metricsData.subgroups || (metricsData as any)['Subgroups']
      };
    }

    return metricsData;
  }

  /**
   * Add header section
   */
  private static addHeader(
    doc: jsPDF,
    validationJob: UiValidationJob,
    modelName: string | undefined,
    yPosition: number
  ): number {
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Validation Results Report', this.MARGIN, yPosition);
    yPosition += 10;

    // Model name
    if (modelName) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Model: ${modelName}`, this.MARGIN, yPosition);
      yPosition += 6;
    }

    // Validation name
    if (validationJob.validation_name) {
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text(`Validation: ${validationJob.validation_name}`, this.MARGIN, yPosition);
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
   * Add validation info section
   */
  private static addValidationInfo(
    doc: jsPDF,
    validationJob: UiValidationJob,
    yPosition: number
  ): number {
    if (yPosition > this.PAGE_HEIGHT - 60) {
      doc.addPage();
      yPosition = this.MARGIN;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Validation Information', this.MARGIN, yPosition);
    yPosition += 8;

    const validationData = [
      ['Status', validationJob.validation_status?.charAt(0).toUpperCase() + validationJob.validation_status?.slice(1) || 'Unknown'],
      ['Created', new Date(validationJob.start_datetime).toLocaleString()],
      ['Data Provided', validationJob.dataProvided ? 'Yes' : 'No'],
      ['Data Characteristics', validationJob.dataCharacteristics ? 'Yes' : 'No'],
      ['Metrics Available', validationJob.metrics ? 'Yes' : 'No']
    ];

    if ((validationJob as any).end_datetime) {
      validationData.splice(2, 0, ['Completed', new Date((validationJob as any).end_datetime).toLocaleString()]);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: validationData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: this.MARGIN, right: this.MARGIN }
    });

    return doc.lastAutoTable.finalY + 10;
  }

  /**
   * Add model info section
   */
  private static addModelInfo(
    doc: jsPDF,
    modelInfo: { name?: string; type?: string },
    yPosition: number
  ): number {
    if (yPosition > this.PAGE_HEIGHT - 50) {
      doc.addPage();
      yPosition = this.MARGIN;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Model Information', this.MARGIN, yPosition);
    yPosition += 8;

    const modelType = modelInfo.type
      ? modelInfo.type.charAt(0).toUpperCase() + modelInfo.type.slice(1)
      : 'Unknown';
    const modelData = [
      ['Model Name', modelInfo.name || 'Unknown'],
      ['Model Type', modelType]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: modelData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: this.MARGIN, right: this.MARGIN }
    });

    return doc.lastAutoTable.finalY + 10;
  }

  /**
   * Add overall metrics section
   */
  private static addOverallMetrics(
    doc: jsPDF,
    overall: Record<string, any>,
    yPosition: number
  ): number {
    const grouped = this.groupMetricsByCategory(overall);

    for (const [category, metrics] of Object.entries(grouped)) {
      if (yPosition > this.PAGE_HEIGHT - 60) {
        doc.addPage();
        yPosition = this.MARGIN;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${category} Metrics`, this.MARGIN, yPosition);
      yPosition += 8;

      const metricsBody = Object.entries(metrics).map(([name, value]) => [
        name.replace(/_/g, ' ').charAt(0).toUpperCase() + name.replace(/_/g, ' ').slice(1),
        this.formatMetricValue(value)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: metricsBody,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: category === 'Performance' ? [66, 139, 202] :
                     category === 'Fairness' ? [92, 184, 92] : [108, 117, 125],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'right', font: 'courier' }
        },
        margin: { left: this.MARGIN, right: this.MARGIN }
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    return yPosition;
  }

  /**
   * Add threshold analysis section
   */
  private static addThresholdAnalysis(
    doc: jsPDF,
    thresholdData: any,
    yPosition: number
  ): number {
    if (yPosition > this.PAGE_HEIGHT - 80) {
      doc.addPage();
      yPosition = this.MARGIN;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Threshold Analysis', this.MARGIN, yPosition);
    yPosition += 8;

    // ROC and PR curves summary
    const curvesData: string[][] = [];
    if (thresholdData.roc_curve?.auc) {
      curvesData.push(['ROC AUC Score', thresholdData.roc_curve.auc.toFixed(4)]);
    }
    if (thresholdData.pr_curve?.average_precision) {
      curvesData.push(['Average Precision', thresholdData.pr_curve.average_precision.toFixed(4)]);
    }

    if (curvesData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Curve Metric', 'Value']],
        body: curvesData,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: [155, 89, 182],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          1: { halign: 'right', font: 'courier' }
        },
        margin: { left: this.MARGIN, right: this.MARGIN }
      });

      yPosition = doc.lastAutoTable.finalY + 8;
    }

    // Threshold metrics table
    if (thresholdData.threshold_metrics) {
      const sampleThresholds = ['0.3', '0.5', '0.7'];
      const thresholdBody: string[][] = [];

      for (const threshold of sampleThresholds) {
        const metrics = thresholdData.threshold_metrics[threshold];
        if (metrics) {
          thresholdBody.push([
            threshold,
            metrics.accuracy?.toFixed(3) || 'N/A',
            metrics.precision?.toFixed(3) || 'N/A',
            metrics.recall?.toFixed(3) || 'N/A',
            metrics.f1_score?.toFixed(3) || 'N/A'
          ]);
        }
      }

      if (thresholdBody.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Sample Threshold Performance', this.MARGIN, yPosition);
        yPosition += 6;

        autoTable(doc, {
          startY: yPosition,
          head: [['Threshold', 'Accuracy', 'Precision', 'Recall', 'F1 Score']],
          body: thresholdBody,
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: {
            fillColor: [52, 73, 94],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right', font: 'courier' },
            2: { halign: 'right', font: 'courier' },
            3: { halign: 'right', font: 'courier' },
            4: { halign: 'right', font: 'courier' }
          },
          margin: { left: this.MARGIN, right: this.MARGIN }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
      }
    }

    return yPosition;
  }

  /**
   * Add subgroup analysis section
   */
  private static addSubgroupAnalysis(
    doc: jsPDF,
    subgroups: Record<string, any>,
    yPosition: number
  ): number {
    if (yPosition > this.PAGE_HEIGHT - 60) {
      doc.addPage();
      yPosition = this.MARGIN;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Subgroup Analysis', this.MARGIN, yPosition);
    yPosition += 10;

    for (const [feature, featureSubgroups] of Object.entries(subgroups)) {
      if (typeof featureSubgroups !== 'object' || featureSubgroups === null) continue;

      if (yPosition > this.PAGE_HEIGHT - 60) {
        doc.addPage();
        yPosition = this.MARGIN;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const featureName = feature.replace(/_/g, ' ').charAt(0).toUpperCase() + feature.replace(/_/g, ' ').slice(1);
      doc.text(featureName, this.MARGIN, yPosition);
      yPosition += 6;

      const subgroupBody: string[][] = [];
      for (const [subgroup, metrics] of Object.entries(featureSubgroups)) {
        if (typeof metrics !== 'object' || metrics === null) continue;
        const m = metrics as any;
        subgroupBody.push([
          subgroup,
          m.sample_size?.toString() || 'N/A',
          m['performance.accuracy']?.toFixed(3) || 'N/A',
          m['performance.precision']?.toFixed(3) || 'N/A',
          m['performance.recall']?.toFixed(3) || 'N/A'
        ]);
      }

      if (subgroupBody.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [['Subgroup', 'Sample Size', 'Accuracy', 'Precision', 'Recall']],
          body: subgroupBody,
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: {
            fillColor: [230, 126, 34],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right' },
            2: { halign: 'right', font: 'courier' },
            3: { halign: 'right', font: 'courier' },
            4: { halign: 'right', font: 'courier' }
          },
          margin: { left: this.MARGIN, right: this.MARGIN }
        });

        yPosition = doc.lastAutoTable.finalY + 8;
      }
    }

    return yPosition;
  }

  /**
   * Add charts section to PDF
   */
  private static addChartsSection(
    doc: jsPDF,
    chartImages: ChartImages,
    yPosition: number
  ): number {
    // Start a new page for charts
    doc.addPage();
    yPosition = this.MARGIN;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Visualizations', this.MARGIN, yPosition);
    yPosition += 10;

    // Add radar chart (full width)
    if (chartImages.radarChart) {
      yPosition = this.addChartImage(
        doc,
        chartImages.radarChart,
        'Metrics Overview',
        yPosition,
        this.CONTENT_WIDTH,
        this.CHART_HEIGHT + 10
      );
    }

    // Add ROC and PR curves side by side
    if (chartImages.rocChart || chartImages.prChart) {
      if (yPosition > this.PAGE_HEIGHT - this.CHART_HEIGHT - 30) {
        doc.addPage();
        yPosition = this.MARGIN;
      }

      const chartWidth = (this.CONTENT_WIDTH - 10) / 2; // Leave 10mm gap between charts

      if (chartImages.rocChart && chartImages.prChart) {
        // Both charts - side by side
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('ROC Curve', this.MARGIN, yPosition);
        doc.text('Precision-Recall Curve', this.MARGIN + chartWidth + 10, yPosition);
        yPosition += 5;

        doc.addImage(
          chartImages.rocChart,
          'PNG',
          this.MARGIN,
          yPosition,
          chartWidth,
          this.CHART_HEIGHT
        );
        doc.addImage(
          chartImages.prChart,
          'PNG',
          this.MARGIN + chartWidth + 10,
          yPosition,
          chartWidth,
          this.CHART_HEIGHT
        );
        yPosition += this.CHART_HEIGHT + 10;
      } else if (chartImages.rocChart) {
        yPosition = this.addChartImage(
          doc,
          chartImages.rocChart,
          'ROC Curve',
          yPosition,
          this.CONTENT_WIDTH,
          this.CHART_HEIGHT
        );
      } else if (chartImages.prChart) {
        yPosition = this.addChartImage(
          doc,
          chartImages.prChart,
          'Precision-Recall Curve',
          yPosition,
          this.CONTENT_WIDTH,
          this.CHART_HEIGHT
        );
      }
    }

    // Add subgroup charts
    if (chartImages.subgroupCharts && Object.keys(chartImages.subgroupCharts).length > 0) {
      for (const [feature, imageData] of Object.entries(chartImages.subgroupCharts)) {
        if (yPosition > this.PAGE_HEIGHT - this.CHART_HEIGHT - 30) {
          doc.addPage();
          yPosition = this.MARGIN;
        }

        const featureName = feature.replace(/_/g, ' ').charAt(0).toUpperCase() + feature.replace(/_/g, ' ').slice(1);
        yPosition = this.addChartImage(
          doc,
          imageData,
          `Subgroup Analysis: ${featureName}`,
          yPosition,
          this.CONTENT_WIDTH,
          this.CHART_HEIGHT
        );
      }
    }

    return yPosition;
  }

  /**
   * Helper to add a single chart image with title
   */
  private static addChartImage(
    doc: jsPDF,
    imageData: string,
    title: string,
    yPosition: number,
    width: number,
    height: number
  ): number {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, this.MARGIN, yPosition);
    yPosition += 5;

    doc.addImage(
      imageData,
      'PNG',
      this.MARGIN,
      yPosition,
      width,
      height
    );
    yPosition += height + 10;

    return yPosition;
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

      doc.text(
        `Page ${i} of ${pageCount}`,
        this.PAGE_WIDTH / 2,
        this.PAGE_HEIGHT - 10,
        { align: 'center' }
      );

      doc.text(
        'FAIVOR Dashboard - Validation Results Report',
        this.MARGIN,
        this.PAGE_HEIGHT - 10
      );
    }
  }

  /**
   * Group metrics by category
   */
  private static groupMetricsByCategory(metrics: Record<string, any>): Record<string, Record<string, any>> {
    const grouped: Record<string, Record<string, any>> = {};

    for (const [key, value] of Object.entries(metrics)) {
      let category = 'Other';
      let name = key;

      if (key.startsWith('performance.')) {
        category = 'Performance';
        name = key.replace('performance.', '');
      } else if (key.startsWith('fairness.')) {
        category = 'Fairness';
        name = key.replace('fairness.', '');
      } else if (key.startsWith('explainability.')) {
        category = 'Explainability';
        name = key.replace('explainability.', '');
      }

      if (!grouped[category]) {
        grouped[category] = {};
      }
      grouped[category][name] = value;
    }

    return grouped;
  }

  /**
   * Format metric value for display
   */
  private static formatMetricValue(value: any): string {
    if (typeof value === 'number') {
      return value.toFixed(4);
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return value;
      }
    }
    return JSON.stringify(value);
  }
}
