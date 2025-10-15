const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');


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

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

test('get authenticated user', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  const token = loginRes.body.token;

  const getUserRes = await request(app).get('/api/user/me').set('Authorization', `Bearer ${token}`);
  expect(getUserRes.status).toBe(200);
  expect(getUserRes.body).toMatchObject(loginRes.body.user);
});

test('update user', async () => {
  const adminUser = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(adminUser);
  const token = loginRes.body.token;

  const updatedUserObject = { name: 'Updated Name', email: `${adminUser.email}`, password: `${adminUser.password}`};

  const updateUserRes = await request(app).put(`/api/user/${adminUser.id}`).set('Authorization', `Bearer ${token}`).set('Content-Type', 'application/json').send(updatedUserObject);
  expect(updateUserRes.status).toBe(200);
  expect(adminUser.name).not.toBe(updateUserRes.body.name);

  const newToken = updateUserRes.body.token;

  const getUserRes = await request(app).get('/api/user/me').set('Authorization', `Bearer ${newToken}`);
  expect(getUserRes.body.name).toBe("Updated Name");
});

test('list users unauthorized', async () => {
  const listUsersRes = await request(app).get('/api/user');
  expect(listUsersRes.status).toBe(401);
});

test('list users', async () => {
  const [, userToken] = await registerUser(request(app));
  const listUsersRes = await request(app)
    .get('/api/user?page=0&limit=3&name=*pi*')
    .set('Authorization', 'Bearer ' + userToken);
  expect(listUsersRes.status).toBe(200);
});

async function registerUser(service) {
  const testUser = {
    name: 'pizza diner',
    email: `${randomName()}@test.com`,
    password: 'a',
  };
  const registerRes = await service.post('/api/auth').send(testUser);
  registerRes.body.user.password = testUser.password;

  return [registerRes.body.user, registerRes.body.token];
}
