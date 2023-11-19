const request = require('supertest');
const express = require('express');
const router = require('../routes/loginRoute');

// Mock both vaultClient and connectToRedis
jest.mock('../../shared/build/vaultClient', () => ({
    login: jest.fn(),
    getSecret: jest.fn()
}));
jest.mock('../../shared/build/redisClient', () => ({
    connectToRedis: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/', router);

describe('POST /', () => {
    it('should respond with a status code of 200 for successful requests', async () => {
        // Mock for successful scenario
        const { getSecret } = require('../../shared/build/vaultClient');
        getSecret.mockResolvedValue({ data: { password: 'pass' }});
        const { connectToRedis } = require('../../shared/build/redisClient');
        connectToRedis.mockResolvedValue({
            set: jest.fn().mockResolvedValue(true)
        });

        const response = await request(app)
            .post('/')
            .send({ username: 'user', password: 'pass' });

        expect(response.statusCode).toBe(200);
    });

    it('should respond with a status code of 400 for invalid requests', async () => {
        // No specific mocking needed as validation fails before connecting to Redis
        const response = await request(app)
            .post('/')
            .send({ username: '', password: '' });

        expect(response.statusCode).toBe(400);
    });

    it('should respond with 500 if the Vault server is unavailable', async () => {
        // Mock Vault server unavailability
        const { login, getSecret } = require('../../shared/build/vaultClient');
        login.mockRejectedValue(new Error('Vault login failed'));
        getSecret.mockRejectedValue(new Error('Failed to fetch secret'));

        const response = await request(app)
            .post('/')
            .send({ username: 'testuser', password: 'testpassword' });

        expect(response.statusCode).toBe(500);
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message', 'An error occurred while processing your request.');
    });

    it('should respond with 500 if the Redis server is unavailable', async () => {
        // Mock Redis server unavailability
        const { connectToRedis } = require('../../shared/build/redisClient');
        connectToRedis.mockRejectedValue(new Error('Failed to connect to Redis'));

        const response = await request(app)
            .post('/')
            .send({ username: 'validUser', password: 'validPassword' });

        expect(response.statusCode).toBe(500);
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message', 'An error occurred while processing your request.');
    });
});
