// @ts-check

import _ from 'lodash';
import fastify from 'fastify';

import init from '../server/plugin.js';
import encrypt from '../server/lib/secure.cjs';
import { getSessionCookieFromResponse, getTestData, prepareData } from './helpers/index.js';

describe('test users CRUD', () => {
  let app;
  let knex;
  let models;
  const testData = getTestData();

  beforeAll(async () => {
    app = fastify({
      exposeHeadRoutes: false,
      logger: { target: 'pino-pretty' },
    });
    await init(app);
    knex = app.objection.knex;
    models = app.objection.models;

    // TODO: пока один раз перед тестами
    // тесты не должны зависеть друг от друга
    // перед каждым тестом выполняем миграции
    // и заполняем БД тестовыми данными
    await knex.migrate.latest();
    await prepareData(app);
  });

  beforeEach(async () => {
  });

  it('index', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('users'),
    });

    expect(response.statusCode).toBe(200);
  });

  it('new', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('newUser'),
    });

    expect(response.statusCode).toBe(200);
  });

  it('edit', async () => {
    const responseSignIn = await app.inject({
      method: 'POST',
      url: app.reverse('session'),
      payload: {
        data: testData.users.existing,
      },
    });

    const wrongResponse = await app.inject({
      method: 'GET',
      url: app.reverse('editUser', { id: 1 }),
      cookies: getSessionCookieFromResponse(responseSignIn),
    });

    expect(wrongResponse.statusCode).toBe(302);

    const correctResponse = await app.inject({
      method: 'GET',
      url: app.reverse('editUser', { id: 2 }),
      cookies: getSessionCookieFromResponse(responseSignIn),
    });

    expect(correctResponse.statusCode).toBe(200);
  });

  it('create', async () => {
    const params = testData.users.new;
    const response = await app.inject({
      method: 'POST',
      url: app.reverse('users'),
      payload: {
        data: params,
      },
    });

    expect(response.statusCode).toBe(302);
    const expected = {
      ..._.omit(params, 'password'),
      passwordDigest: encrypt(params.password),
    };
    const user = await models.user.query().findOne({ email: params.email });
    expect(user).toMatchObject(expected);
  });

  it('patch', async () => {
    const userData = testData.users.existing;
    const patchedUser = testData.users.patched;
    const user = await models.user.query().findOne({ id: 2 });

    const responseSignIn = await app.inject({
      method: 'POST',
      url: app.reverse('session'),
      payload: {
        data: userData,
      },
    });

    const { UserNames } = testData.patches;
    // Запрос с указанием только имени и фамилии
    const wrondResponse = await app.inject({
      method: 'PATCH',
      url: app.reverse('patchUser', { id: Number(userData.id) }),
      cookies: getSessionCookieFromResponse(responseSignIn),
      payload: {
        data: UserNames,
      },
    });
    expect(wrondResponse.statusCode).toBe(422);
    expect(user).not.toMatchObject(patchedUser);

    const { correctPatchData } = testData.patches;
    const correctResponse = await app.inject({
      method: 'PATCH',
      url: app.reverse('patchUser', { id: Number(userData.id) }),
      cookies: getSessionCookieFromResponse(responseSignIn),
      payload: {
        data: correctPatchData,
      },
    });

    const updatedUser = await models.user.query().findOne({ id: 2 });

    expect(updatedUser).toMatchObject(patchedUser);
    expect(correctResponse.statusCode).toBe(302);
  });

  afterEach(async () => {
    // Пока Segmentation fault: 11
    // после каждого теста откатываем миграции
    // await knex.migrate.rollback();
  });

  afterAll(async () => {
    await app.close();
  });
});
