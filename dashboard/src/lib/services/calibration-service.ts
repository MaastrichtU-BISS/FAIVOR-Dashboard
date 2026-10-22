import type { CalibrationResponse } from '$lib/api/faivor-backend';
import type { DatasetFolderFiles } from '$lib/types/validation';

export interface CalibrationErrorInfo {
  message: string;
  code?: string;
  technicalDetails?: string;
  userGuidance?: string;
}

export class CalibrationRequestError extends Error {
  info: CalibrationErrorInfo;
  constructor(info: CalibrationErrorInfo) {
    super(info.message);
    this.info = info;
  }
}

export class CalibrationService {
  /**
   * Run calibration through the internal /api/calibration route.
   * Throws CalibrationRequestError with structured details on failure.
   */
  static async run(
    modelMetadata: any,
    uploadedFolder: DatasetFolderFiles
  ): Promise<CalibrationResponse> {
    if (!uploadedFolder.data) {
      throw new CalibrationRequestError({ message: 'No data file available for calibration' });
    }

    const formData = new FormData();
    formData.append('model_metadata', JSON.stringify(modelMetadata));
    formData.append('csv_file', uploadedFolder.data);
    if (uploadedFolder.columnMetadata) {
      formData.append('column_metadata', await uploadedFolder.columnMetadata.text());
    }

    const response = await fetch('/api/calibration', { method: 'POST', body: formData });
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.success) {
      const first = body?.error?.errors?.[0];
      throw new CalibrationRequestError({
        message: first?.message || (typeof body?.error === 'string' ? body.error : 'Calibration failed'),
        code: first?.code,
        technicalDetails: first?.technicalDetails,
        userGuidance: first?.userGuidance
      });
    }
    return body.calibration as CalibrationResponse;
  }
}
