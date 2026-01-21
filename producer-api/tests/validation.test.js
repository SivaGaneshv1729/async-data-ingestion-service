import { ingestSchema } from '../src/middleware/validation.js';

describe('Ingest Schema Validation', () => {
    test('should validate correct payload', () => {
        const payload = {
            user_id: 'user_123',
            event_type: 'click',
            details: { page: 'home' }
        };
        const { error } = ingestSchema.validate(payload);
        expect(error).toBeUndefined();
    });

    test('should fail without user_id', () => {
        const payload = { event_type: 'click' };
        const { error } = ingestSchema.validate(payload);
        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('user_id');
    });

    test('should fail without event_type', () => {
        const payload = { user_id: '123' };
        const { error } = ingestSchema.validate(payload);
        expect(error).toBeDefined();
    });
});
