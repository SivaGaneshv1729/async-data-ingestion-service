import { jest } from '@jest/globals';

// Define the mock factory
jest.unstable_mockModule('../src/services/db.js', () => ({
    checkMessageExists: jest.fn(),
    saveProcessedData: jest.fn(),
    initDb: jest.fn(),
}));

// Dynamic imports are required after unstable_mockModule
const db = await import('../src/services/db.js');
const { processMessage } = await import('../src/services/processor.js');

describe('Data Processor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should process new message successfully', async () => {
        db.checkMessageExists.mockResolvedValue(false);
        db.saveProcessedData.mockResolvedValue();

        const message = {
            message_id: 'msg_1',
            timestamp: '2023-01-01T00:00:00Z',
            data: { user_id: 'abc', event_type: 'test' }
        };

        await processMessage(message);

        expect(db.checkMessageExists).toHaveBeenCalledWith('msg_1');
        expect(db.saveProcessedData).toHaveBeenCalledWith(
            'msg_1',
            '2023-01-01T00:00:00Z',
            'test',
            expect.objectContaining({ user_id: 'ABC', _metadata: expect.any(Object) }),
            expect.any(String)
        );
    });

    test('should skip duplicate message', async () => {
        db.checkMessageExists.mockResolvedValue(true);

        const message = { message_id: 'msg_1', data: {} };
        await processMessage(message);

        expect(db.checkMessageExists).toHaveBeenCalledWith('msg_1');
        expect(db.saveProcessedData).not.toHaveBeenCalled();
    });
});
