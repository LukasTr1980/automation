const request = require('supertest');
const express = require('express');
const authMiddleware = require('../authMiddleware');

// Mock the Redis client directly within the jest.mock call
jest.mock('../../shared/build/redisClient', () => {
  const mockGet = jest.fn();
  return {
    connectToRedis: jest.fn().mockResolvedValue({
      get: mockGet
    }),
    mockGet // Exposing mockGet for manipulation in tests
  };
});

const app = express();
app.use(express.json());

// Create a test route that uses the authMiddleware
app.get('/test', authMiddleware, (req, res) => {
  res.status(200).send('Success');
});

describe('authMiddleware', () => {
    let mockGet;

    beforeEach(() => {
        // Reset the mock before each test
        const redisClient = require('../../shared/build/redisClient');
        mockGet = redisClient.mockGet;
        mockGet.mockClear();
    });

    it('should respond with 401 if session ID is not provided', async () => {
      const response = await request(app).get('/test');
      expect(response.statusCode).toBe(401);
    });
  
    it('should respond with 401 for invalid or expired session ID', async () => {
      mockGet.mockResolvedValue(null);
      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalidSessionId');
      expect(response.statusCode).toBe(401);
    });
  
    it('should allow request to proceed for valid session ID', async () => {
      mockGet.mockResolvedValue('validSession');
      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer validSessionId');
      expect(response.statusCode).toBe(200);
    });
});
