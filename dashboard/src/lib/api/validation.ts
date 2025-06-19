// Mock API for validation
export const validateModel = async (model: any) => {
  return {
    data: [], // Return an empty array instead of importing from validation.json
    valid: true,
    errors: []
  };
};
