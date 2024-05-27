// @ts-check

const objectionUnique = require('objection-unique');
const BaseModel = require('./BaseModel.cjs');

const unique = objectionUnique({ fields: ['labelName'] });

module.exports = class Label extends unique(BaseModel) {
  static get tableName() {
    return 'labels';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1 },
      },
    };
  }

  static get relationMappings() {
    return {
      task: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: 'Task.cjs',
        join: {
          from: 'labels.id',
          through: {
            from: 'labels_for_tasks.labelId',
            to: 'labels_for_tasks.taskId',
          },
          to: 'tasks.id',
        },
      },
    };
  }
};
