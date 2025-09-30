const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

test('get authenticated user', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  const token = loginRes.body.token;

  const getUserRes = await request(app).get('/api/user/me').set('Authorization', `Bearer ${token}`);
  expect(getUserRes.status).toBe(200);
  expect(getUserRes.body).toMatchObject(loginRes.body.user);
});