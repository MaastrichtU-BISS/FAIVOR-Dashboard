import { writable } from 'svelte/store';
import type { ValidationJob, ValidationFormData, DatasetFolderFiles } from '$lib/types/validation';
import type { CSVValidationResponse, ModelValidationResponse } from '$lib/api/faivor-backend';


export type ValidationMode = 'create' | 'view' | 'edit';

// Re-export ValidationJob for backwards compatibility
export type { ValidationJob };

interface ValidationStoreState {
  currentValidation: ValidationJob | null;
  mode: ValidationMode;
  isOpen: boolean;
}

const initialState: ValidationStoreState = {
  currentValidation: null,
  mode: 'create',
  isOpen: false
};

function createValidationStore() {
  const { subscribe, update, set } = writable<ValidationStoreState>(initialState);

  return {
    subscribe,

    openModal: (validation?: ValidationJob, mode: ValidationMode = 'create') => {
      update(state => ({
        ...state,
        currentValidation: validation || null,
        mode,
        isOpen: true
      }));
    },

    closeModal: () => {
      update(state => ({
        ...state,
        isOpen: false
      }));
    },

    setMode: (mode: ValidationMode) => {
      update(state => ({
        ...state,
        mode
      }));
    },

    updateValidation: (updatedValidation: Partial<ValidationJob>) => {
      update(state => {
        if (!state.currentValidation) {
          return {
            ...state,
            currentValidation: updatedValidation as ValidationJob
          };
        }

        return {
          ...state,
          currentValidation: {
            ...state.currentValidation,
            ...updatedValidation
          }
        };
      });
    },

    reset: () => {
      set(initialState);
    }
  };
}

export const validationStore = createValidationStore();


// Validation results interface for storing in the form state
export interface ValidationResults {
  csvValidation?: {
    success: boolean;
    message: string;
    details?: CSVValidationResponse;
  };
  modelValidation?: {
    success: boolean;
    message: string;
    details?: ModelValidationResponse;
  };
  stage: 'none' | 'csv' | 'model' | 'complete';
}

interface ValidationFormState extends ValidationFormData {
  // Add any additional UI state if needed
  isSubmitting?: boolean;
  errors?: Record<string, string | undefined>;
  // Add validation results to the store
  validationResults?: ValidationResults;
  showValidationModal?: boolean;
}

const formInitialState: ValidationFormState = {
  validationName: '',
  userName: '',
  date: '',
  datasetName: '',
  uploadedFile: null,
  uploadedFolder: undefined,
  folderName: '',
  datasetDescription: '',
  datasetCharacteristics: '',
  metricsDescription: '',
  performanceMetrics: '',
  modelId: '',
  isSubmitting: false,
  errors: {},
  validationResults: { stage: 'none' },
  showValidationModal: false
};

function createValidationFormStore() {
  const { subscribe, update, set } = writable<ValidationFormState>(formInitialState);

  return {
    subscribe,

    // Update individual fields
    updateField: <K extends keyof ValidationFormState>(field: K, value: ValidationFormState[K]) => {
      update(state => ({
        ...state,
        [field]: value,
        // Clear error for this field when updating
        errors: {
          ...state.errors,
          [field]: undefined
        }
      }));
    },

    // Update multiple fields at once
    updateFields: (updates: Partial<ValidationFormState>) => {
      update(state => ({
        ...state,
        ...updates
      }));
    },

    // Set folder files and extract metadata
    setFolderFiles: (files: DatasetFolderFiles, folderName: string) => {
      update(state => ({
        ...state,
        uploadedFolder: files,
        folderName,
        // Auto-populate dataset name if not set
        datasetName: state.datasetName || folderName,
        // Clear any file-related errors
        errors: {
          ...state.errors,
          uploadedFolder: undefined,
          folderName: undefined
        }
      }));
    },

    // Clear folder files
    clearFolderFiles: () => {
      update(state => ({
        ...state,
        uploadedFolder: undefined,
        folderName: ''
      }));
    },

    // Set single file
    setFile: (file: File | null) => {
      update(state => ({
        ...state,
        uploadedFile: file,
        // Auto-populate dataset name if not set
        datasetName: state.datasetName || (file ? file.name.replace(/\.[^/.]+$/, '') : ''),
        // Clear any file-related errors
        errors: {
          ...state.errors,
          uploadedFile: undefined
        }
      }));
    },

    // Set validation errors
    setErrors: (errors: Record<string, string>) => {
      update(state => ({
        ...state,
        errors
      }));
    },

    // Clear specific error
    clearError: (field: string) => {
      update(state => ({
        ...state,
        errors: {
          ...state.errors,
          [field]: undefined
        }
      }));
    },

    // Set submitting state
    setSubmitting: (isSubmitting: boolean) => {
      update(state => ({
        ...state,
        isSubmitting
      }));
    },

    // Set validation results
    setValidationResults: (validationResults: ValidationResults) => {
      update(state => ({
        ...state,
        validationResults
      }));
    },

    // Show/hide validation modal
    setShowValidationModal: (show: boolean) => {
      update(state => ({
        ...state,
        showValidationModal: show
      }));
    },

    // Clear validation results
    clearValidationResults: () => {
      update(state => ({
        ...state,
        validationResults: { stage: 'none' },
        showValidationModal: false
      }));
    },

    // Load form data (for editing existing validation)
    loadFormData: (formData: ValidationFormData) => {
      update(state => ({
        ...state,
        ...formData,
        isSubmitting: false,
        errors: {},
        // Preserve existing validation results when loading data
        // The validation results will be loaded separately via validationJobToFormData
        showValidationModal: false
      }));
    },

    // Reset form to initial state
    reset: () => {
      set(formInitialState);
    },

    // Get form data for submission (excluding UI state)
    getFormData: (): ValidationFormData => {
      let currentState: ValidationFormState;
      const unsubscribe = subscribe(state => {
        currentState = state;
      });
      unsubscribe();

      const {
        isSubmitting,
        errors,
        validationResults,
        showValidationModal,
        ...formData
      } = currentState!;

      return formData;
    },

    // Validate form and return errors
    validate: (): Record<string, string> => {
      let currentState: ValidationFormState;
      const unsubscribe = subscribe(state => {
        currentState = state;
      });
      unsubscribe();

      const errors: Record<string, string> = {};
      const state = currentState!;

      // Required field validations
      if (!state.validationName.trim()) {
        errors.validationName = 'Validation name is required';
      }

      if (!state.modelId) {
        errors.modelId = 'Model selection is required';
      }

      // File validation - either single file or folder required
      if (!state.uploadedFile && !state.uploadedFolder) {
        errors.uploadedFile = 'Please upload a file or select a folder';
      }

      // Folder validation
      if (state.uploadedFolder) {
        if (!state.uploadedFolder.metadata) {
          errors.uploadedFolder = 'Folder must contain metadata.json';
        }
        if (!state.uploadedFolder.data) {
          errors.uploadedFolder = 'Folder must contain data.csv';
        }
      }

      return errors;
    }
  };
}

export const validationFormStore = createValidationFormStore();

// Helper function to get file sizes from the store
export function getFileSizesFromStore(): {
  metadataSize: number;
  dataSize: number;
  columnMetadataSize: number;
  totalSize: number;
} {
  let currentState: ValidationFormState;
  const unsubscribe = validationFormStore.subscribe(state => {
    currentState = state;
  });
  unsubscribe();

  const state = currentState!;

  const metadataSize = state.uploadedFolder?.metadata?.size || 0;
  const dataSize = state.uploadedFolder?.data?.size || 0;
  const columnMetadataSize = state.uploadedFolder?.columnMetadata?.size || 0;
  const singleFileSize = state.uploadedFile?.size || 0;

  return {
    metadataSize,
    dataSize,
    columnMetadataSize,
    totalSize: metadataSize + dataSize + columnMetadataSize + singleFileSize
  };
}
