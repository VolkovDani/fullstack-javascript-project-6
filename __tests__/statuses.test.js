// @ts-check

import fastify from 'fastify';

import init from '../server/plugin.js';
import { getSessionCookieFromResponse, getTestData, prepareData } from './helpers/index.js';

describe('test statuses CRUD', () => {
  let app;
  let knex;
  let models;
  const testData = getTestData();

  let signInResponse;

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
      url: app.reverse('statuses'),
    });

    expect(wrongResponse.statusCode).toBe(302);

    const response = await app.inject({
      method: 'GET',
      url: app.reverse('statuses'),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(response.statusCode).toBe(200);
  });

  it('new', async () => {
    const responseWithoutSignIn = await app.inject({
      method: 'GET',
      url: app.reverse('newStatus'),
    });

    expect(responseWithoutSignIn.statusCode).toBe(302);

    const responseWithPage = await app.inject({
      method: 'GET',
      url: app.reverse('newStatus'),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(responseWithPage.statusCode).toBe(200);

    const { newStatus } = testData.statuses;

    const response = await app.inject({
      method: 'POST',
      url: app.reverse('statuses'),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: newStatus,
      },
    });

    expect(response.statusCode).toBe(302);

    const createdStatus = await models.status.query().findOne({ name: newStatus.name });

    expect(createdStatus).toMatchObject(testData.statuses.new);

    const responseIndexPage = await app.inject({
      method: 'GET',
      url: app.reverse('statuses'),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(responseIndexPage.statusCode).toBe(200);
  });

  it('edit', async () => {
    const { edit, expected } = testData.statuses;

    const pageResponse = await app.inject({
      method: 'GET',
      url: app.reverse('editStatus', { id: expected.id }),
    });

    expect(pageResponse.statusCode).toBe(302);

    const pageResponseWithSignIn = await app.inject({
      method: 'GET',
      url: app.reverse('editStatus', { id: expected.id }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(pageResponseWithSignIn.statusCode).toBe(200);

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: app.reverse('patchStatus', { id: expected.id }),
      payload: {
        data: edit,
      },
    });
    // проверяю что роут существует
    expect(patchResponse.statusCode).toBe(302);
    let status;
    status = await models.status.query().findOne({ id: expected.id });
    expect(status).not.toMatchObject(expected);

    await app.inject({
      method: 'PATCH',
      url: app.reverse('patchStatus', { id: expected.id }),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: edit,
      },
    });
    status = await models.status.query().findOne({ id: expected.id });
    expect(status).toMatchObject(expected);
  });

  it('delete', async () => {
    const { expected } = testData.statuses;
    const status = await models.status.query().findOne({ id: expected.id });

    expect(status).toMatchObject(expected);
    // удаляем пользователя
    await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteStatus', { id: Number(expected.id) }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    await expect(models.status
      .query()
      .findOne({ id: expected.id })
      .throwIfNotFound()).rejects.toThrowError('NotFoundError');
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
