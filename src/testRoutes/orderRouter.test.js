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

test('get menu', async () => {
    const getMenuRes = await request(app).get('/api/order/menu');
    expect(getMenuRes.status).toBe(200);
});

test('add to menu', async () => {
    const adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    const token = loginRes.body.token;
    const itemName = randomName();
    const newItem = { title: `${itemName}`, description: 'test', image: 'test', price: 0.0001 };

    const putMenuRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${token}`).send(newItem);
    expect(putMenuRes.status).toBe(200);
    expect(putMenuRes.body.at(-1)).toEqual(expect.objectContaining(newItem));
});

test('get orders', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    const token = loginRes.body.token;

    const getOrderRes = await request(app).get('/api/order').set('Authorization', `Bearer ${token}`);
    expect(getOrderRes.status).toBe(200);
});

test('make order', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    const token = loginRes.body.token;

    const getMenuRes = await request(app).get('/api/order/menu');
    const orderItem = getMenuRes.body.at(0);
    const newOrder = { franchiseId: 1, storeId: 1, items: [{ menuId: `${orderItem.id}`, description: `${orderItem.title}`, price: `${orderItem.price}`}]}

    const makeOrderRes = await request(app).post('/api/order').set('Authorization', `Bearer ${token}`).send(newOrder);
    expect(makeOrderRes.status).toBe(200);
    expect(makeOrderRes.body.order).toEqual(expect.objectContaining(newOrder));
    expect(expectValidJwt(makeOrderRes.body.jwt))
});