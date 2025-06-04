// Test endpoint to debug file upload issues
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();

    // Extract all files from FormData
    const files: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files[key] = {
          name: value.name,
          size: value.size,
          type: value.type,
          lastModified: value.lastModified,
          // Try to read properties in different ways
          sizeViaProperty: value.size,
          nameViaProperty: value.name,
          // Check if properties are enumerable
          ownPropertyNames: Object.getOwnPropertyNames(value),
          ownPropertyDescriptors: Object.getOwnPropertyDescriptors(value),
          // Check JSON serialization
          jsonStringify: JSON.stringify(value),
          // Check if we can access via bracket notation
          sizeBracket: value['size'],
          nameBracket: value['name']
        };
      } else {
        files[key] = value;
      }
    }

    console.log('🧪 Debug file upload test:', {
      totalEntries: Array.from(formData.entries()).length,
      files
    });

    return json({
      success: true,
      debug: files
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return json({ error: error.message }, { status: 500 });
  }
};
