import { describe, expect, test, mock, afterEach } from 'bun:test';

mock.module('$env/dynamic/public', () => ({ env: { PUBLIC_VALIDATOR_URL: 'http://validator.test' } }));

// Resolve the SvelteKit $lib alias for bun's test runner
const errorsModule = await import('../../../src/lib/types/validation-errors');
mock.module('$lib/types/validation-errors', () => errorsModule);

const { FaivorBackendAPI } = await import('../../../src/lib/api/faivor-backend');
const { ValidationError, ValidationErrorCode } = await import('../../../src/lib/types/validation-errors');

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('FaivorBackendAPI.calibrateModel', () => {
  test('posts form data to /calibrate-model and returns the JSON body', async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response(JSON.stringify({ model_selection: { selected_model: 'm1' } }), { status: 200 });
    }) as any;

    const file = new File(['a,b\n1,2\n'], 'data.csv', { type: 'text/csv' });
    const result = await FaivorBackendAPI.calibrateModel({ name: 'm' }, file, { a: 1 });

    expect(result.model_selection.selected_model).toBe('m1');
    expect(captured!.url).toBe('http://validator.test/calibrate-model');
    const body = captured!.init.body as FormData;
    expect(body.get('model_metadata')).toBe(JSON.stringify({ name: 'm' }));
    expect(body.get('csv_file')).toBeInstanceOf(File);
    expect(body.get('column_metadata')).toBe(JSON.stringify({ a: 1 }));
  });

  test('omits column_metadata when null', async () => {
    let body: FormData | undefined;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      body = init.body as FormData;
      return new Response('{}', { status: 200 });
    }) as any;

    await FaivorBackendAPI.calibrateModel({}, new File(['x'], 'd.csv'));
    expect(body!.has('column_metadata')).toBe(false);
  });

  test('maps CALIBRATION_ERROR to CALIBRATION_FAILED', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ detail: { code: 'CALIBRATION_ERROR', message: 'boom', technical_details: 'x' } }),
        { status: 500 }
      )) as any;

    try {
      await FaivorBackendAPI.calibrateModel({}, new File(['x'], 'd.csv'));
      throw new Error('should have thrown');
    } catch (error: any) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe(ValidationErrorCode.CALIBRATION_FAILED);
    }
  });

  test('wraps network failures as service unavailable', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as any;

    await expect(FaivorBackendAPI.calibrateModel({}, new File(['x'], 'd.csv'))).rejects.toBeInstanceOf(ValidationError);
  });
});
