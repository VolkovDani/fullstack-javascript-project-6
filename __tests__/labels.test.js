// @ts-check

import fastify from 'fastify';

import init from '../server/plugin.js';
import { getSessionCookieFromResponse, getTestData, prepareData } from './helpers/index.js';

describe('test labels CRUD', () => {
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
      url: app.reverse('labels'),
    });

    expect(wrongResponse.statusCode).toBe(302);

    const response = await app.inject({
      method: 'GET',
      url: app.reverse('labels'),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(response.statusCode).toBe(200);
  });

  it('new', async () => {
    const responseWithoutSignIn = await app.inject({
      method: 'GET',
      url: app.reverse('newLabel'),
    });

    expect(responseWithoutSignIn.statusCode).toBe(302);

    const responseWithPage = await app.inject({
      method: 'GET',
      url: app.reverse('newLabel'),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(responseWithPage.statusCode).toBe(200);

    const { newLabel } = testData.labels;

    const response = await app.inject({
      method: 'POST',
      url: app.reverse('labels'),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: newLabel,
      },
    });

    expect(response.statusCode).toBe(302);

    const createdLabel = await models.label.query().findOne({ name: newLabel.name });

    expect(createdLabel).toMatchObject(testData.labels.new);
  });

  it('edit', async () => {
    const { expected } = testData.labels;

    const pageResponse = await app.inject({
      method: 'GET',
      url: app.reverse('editLabel', { id: expected.id }),
    });

    expect(pageResponse.statusCode).toBe(302);

    const pageResponseWithSignIn = await app.inject({
      method: 'GET',
      url: app.reverse('editLabel', { id: expected.id }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(pageResponseWithSignIn.statusCode).toBe(200);
  });

  it('patch', async () => {
    const { edit, expected } = testData.labels;

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: app.reverse('patchLabel', { id: expected.id }),
      payload: {
        data: edit,
      },
    });
    // проверяю что роут существует
    expect(patchResponse.statusCode).toBe(302);
    let label;
    label = await models.label.query().findOne({ id: expected.id });
    expect(label).not.toMatchObject(expected);

    await app.inject({
      method: 'PATCH',
      url: app.reverse('patchLabel', { id: expected.id }),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: edit,
      },
    });
    label = await models.label.query().findOne({ id: expected.id });
    expect(label).toMatchObject(expected);
  });

  it('delete', async () => {
    const { expected } = testData.labels;
    const label = await models.label.query().findOne({ id: expected.id });
    expect(label).toMatchObject(expected);

    const { newStatus } = testData.statuses;

    await app.inject({
      method: 'POST',
      url: app.reverse('statuses'),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: newStatus,
      },
    });

    const { newTask } = testData.tasks;

    await app.inject({
      method: 'POST',
      url: app.reverse('tasks'),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: { ...newTask, labels: [1] },
      },
    });

    const task = await models.task
      .query()
      .withGraphJoined('labels')
      .findById(testData.tasks.new.id);
    console.log(task);

    expect(task).toMatchObject({ ...testData.tasks.new });
    expect(task).toMatchObject({ labels: [{ id: 1, ...expected }] });

    await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteLabel', { id: expected.id }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    await expect(models.label
      .query()
      .findOne({ id: expected.id })
      .throwIfNotFound()).resolves.not.toThrowError('NotFoundError');

    await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteTask', { id: testData.tasks.new.id }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteLabel', { id: expected.id }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    await expect(models.label
      .query()
      .findById(expected.id)
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
