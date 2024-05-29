// @ts-check

import fastify from 'fastify';

import init from '../server/plugin.js';
import { getSessionCookieFromResponse, getTestData, prepareData } from './helpers/index.js';

describe('test tasks CRUD', () => {
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

  it('new', async () => {
    const responseWithoutSignIn = await app.inject({
      method: 'GET',
      url: app.reverse('newTask'),
    });

    expect(responseWithoutSignIn.statusCode).toBe(302);

    const responseWithPage = await app.inject({
      method: 'GET',
      url: app.reverse('newTask'),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(responseWithPage.statusCode).toBe(200);

    const { newTask } = testData.tasks;

    const response = await app.inject({
      method: 'POST',
      url: app.reverse('tasks'),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: newTask,
      },
    });

    expect(response.statusCode).toBe(302);
    const createdTask = await models.task.query().findOne({ name: newTask.name });
    expect(createdTask).toMatchObject(testData.tasks.new);
  });

  it('task page', async () => {
    const nonAuthResponse = await app.inject({
      method: 'GET',
      url: app.reverse('taskPage', { id: 1 }),
    });

    const { newTask } = testData.tasks;

    await app.inject({
      method: 'POST',
      url: app.reverse('tasks'),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: newTask,
      },
    });

    expect(nonAuthResponse.statusCode).toBe(302);

    const authedResponse = await app.inject({
      method: 'GET',
      url: app.reverse('taskPage', { id: 1 }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(authedResponse.statusCode).toBe(200);
  });

  it('edit', async () => {
    const nonAuthResponse = await app.inject({
      method: 'GET',
      url: app.reverse('editTask', { id: 1 }),
    });

    expect(nonAuthResponse.statusCode).toBe(302);

    const response = await app.inject({
      method: 'GET',
      url: app.reverse('editTask', { id: 1 }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(response.statusCode).toBe(200);
  });

  it('patch', async () => {
    const { id, ...body } = testData.patches.task;
    const wrondResponse = await app.inject({
      method: 'PATCH',
      url: app.reverse('patchTask', { id: Number(id) }),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: body,
      },
    });
    expect(wrondResponse.statusCode).toBe(302);

    const patchedTask = testData.tasks.patched;

    const updatedTask = await models.task.query().findOne({ id: 1 });
    expect(updatedTask).toMatchObject(patchedTask);

    const responseWithIndexPage = await app.inject({
      method: 'GET',
      url: app.reverse('tasks'),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(responseWithIndexPage.statusCode).toBe(200);
  });

  it('delete', async () => {
    const params = testData.users.new;
    await app.inject({
      method: 'POST',
      url: app.reverse('users'),
      payload: {
        data: params,
      },
    });

    const anotherUserAuth = await app.inject({
      method: 'POST',
      url: app.reverse('session'),
      payload: {
        data: testData.users.userForSecondLogin,
      },
    });

    const taskForDeleting = testData.tasks.delete;

    const deleteResponseFromAnotherUser = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteTask', { id: taskForDeleting.id }),
      cookies: getSessionCookieFromResponse(anotherUserAuth),
    });
    expect(deleteResponseFromAnotherUser.statusCode).toBe(302);

    await expect(models.task
      .query()
      .findOne({ id: 1 })
      .throwIfNotFound()).resolves.not.toThrowError('NotFoundError');

    const deleteResponseFromCreator = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteTask', { id: taskForDeleting.id }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });
    expect(deleteResponseFromCreator.statusCode).toBe(302);
    await expect(models.task
      .query()
      .findOne({ id: 1 })
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
