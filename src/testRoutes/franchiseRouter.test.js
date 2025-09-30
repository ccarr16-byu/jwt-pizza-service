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

test('get all franchises', async () => {
    const getAllFranchisesRes = await request(app).get('/api/franchise?page=0&limit=10&name=*');
    expect(getAllFranchisesRes.status).toBe(200);
});

test('get user franchises', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    const token = loginRes.body.token;
    const userId = loginRes.body.user.id

    const getUserFranchisesRes = await request(app).get(`/api/franchise/${userId}`).set('Authorization', `Bearer ${token}`);
    expect(getUserFranchisesRes.status).toBe(200);
});

test('make franchise', async () => {
    const adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    const token = loginRes.body.token;
    const franchiseName = randomName();
    const newFranchise = { name: `${franchiseName}`, admins: [{email: `${adminUser.email}`}] };

    const makeFranchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${token}`).set('Content-Type', 'application/json').send(newFranchise);
    expect(makeFranchiseRes.status).toBe(200);
    expect(makeFranchiseRes.body.name).toMatch(franchiseName);
});

test('delete franchise', async () => {
    const adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    const token = loginRes.body.token;
    const franchiseName = randomName();
    const newFranchise = { name: `${franchiseName}`, admins: [{email: `${adminUser.email}`}] };

    const makeFranchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${token}`).set('Content-Type', 'application/json').send(newFranchise);
    const franchiseId = makeFranchiseRes.body.id;

    const deleteFranchiseRes = await request(app).delete(`/api/franchise/${franchiseId}`).set('Authorization', `Bearer ${token}`);
    expect(deleteFranchiseRes.status).toBe(200);
    expect(deleteFranchiseRes.body.message).toMatch('franchise deleted');
});

test('make store', async () => {
    const adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    const token = loginRes.body.token;

    const franchiseName = randomName();
    const newFranchise = { name: `${franchiseName}`, admins: [{email: `${adminUser.email}`}] };
    const makeFranchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${token}`).set('Content-Type', 'application/json').send(newFranchise);
    const franchiseId = makeFranchiseRes.body.id;

    const storeName = randomName();
    const newStore = { name: `${storeName}`, franchiseId: `${franchiseId}` };

    const makeStoreRes = await request(app).post(`/api/franchise/${franchiseId}/store`).set('Authorization', `Bearer ${token}`).set('Content-Type', 'application/json').send(newStore);
    expect(makeStoreRes.status).toBe(200);
    expect(makeStoreRes.body.name).toMatch(storeName);
});

test('delete store', async () => {
    const adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    const token = loginRes.body.token;

    const franchiseName = randomName();
    const newFranchise = { name: `${franchiseName}`, admins: [{email: `${adminUser.email}`}] };
    const makeFranchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${token}`).set('Content-Type', 'application/json').send(newFranchise);
    const franchiseId = makeFranchiseRes.body.id;

    const storeName = randomName();
    const newStore = { name: `${storeName}`, franchiseId: `${franchiseId}` };

    const makeStoreRes = await request(app).post(`/api/franchise/${franchiseId}/store`).set('Authorization', `Bearer ${token}`).set('Content-Type', 'application/json').send(newStore);
    const storeId = makeStoreRes.body.id;

    const deleteStoreRes = await request(app).delete(`/api/franchise/${franchiseId}/store/${storeId}`).set('Authorization', `Bearer ${token}`);
    expect(deleteStoreRes.status).toBe(200);
    expect(deleteStoreRes.body.message).toMatch('store deleted');
});