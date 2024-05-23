// @ts-check

import fastify from 'fastify';

import init from '../server/plugin.js';
import { getSessionCookieFromResponse, getTestData, prepareData } from './helpers/index.js';

describe('test statuses CRUD', () => {
  let app;
  let knex;
  // let models;
  const testData = getTestData();

  let signInResponse;

  beforeAll(async () => {
    app = fastify({
      exposeHeadRoutes: false,
      logger: { target: 'pino-pretty' },
    });
    await init(app);
    knex = app.objection.knex;
    // models = app.objection.models;

    // TODO: пока один раз перед тестами
    // тесты не должны зависеть друг от друга
    // перед каждым тестом выполняем миграции
    // и заполняем БД тестовыми данными
    await knex.migrate.latest();
    await prepareData(app);
  });

  beforeEach(async () => {
    signInResponse = await app.inject({
      method: 'POST',
      url: app.reverse('session'),
      payload: {
        data: testData.users.userForLogin,
      },
    });
  });

  it('index', async () => {
    const wrongResponse = await app.inject({
      method: 'GET',
      url: app.reverse('tasks'),
    });

    expect(wrongResponse.statusCode).toBe(302);

    const response = await app.inject({
      method: 'GET',
      url: app.reverse('tasks'),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(response.statusCode).toBe(200);
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
