// @ts-check

const BaseModel = require('./BaseModel.cjs');

module.exports = class Task extends BaseModel {
  static get tableName() {
    return 'tasks';
  }

  static modifiers = {
    findCreator(query, creatorId) {
      if (creatorId) query.where('creator.id', creatorId);
    },
    findStatus(query, statusId) {
      if (statusId) query.where('status.id', statusId);
    },
    findExecutor(query, executorId) {
      if (executorId) query.where('executor.id', executorId);
    },
  };

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'statusId', 'creatorId'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        statusId: { type: 'integer', minimum: 1 },
        creatorId: { type: 'integer', minimum: 1 },
        executorId: { type: 'integer' },
      },
    };
  }

  $parseJson(json, opt) {
    const superJson = super.$parseJson(json, opt);
    const dict = {
      name: (name) => name,
      description: (description) => description,
      statusId: (statusId) => Number(statusId),
      creatorId: (creatorId) => Number(creatorId),
      executorId: (executorId) => Number(executorId),
    };
    const convertedJson = Object.entries(superJson)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: dict[key](value) }), {});
    return convertedJson;
  }

  static get relationMappings() {
    return {
      status: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'Status.cjs',
        join: {
          from: 'tasks.statusId',
          to: 'statuses.id',
        },
      },
      creator: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'User.cjs',
        join: {
          from: 'tasks.creatorId',
          to: 'users.id',
        },
      },
      executor: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'User.cjs',
        join: {
          from: 'tasks.executorId',
          to: 'users.id',
        },
      },
    };
  }
};
