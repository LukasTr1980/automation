const request = require('supertest');
const express = require('express');
const router = require('../routes/loginRoute');

const app = express();
app.use(express.json());
app.use('/', router);

describe('POST /', () => {
    it('should respond with a status code of 401 for successfull requests', async () => {
        const response = await request(app)
            .post('/')
            .send({ username: 'user', password: 'pass' });

        expect(response.statusCode).toBe(401);
    });
});