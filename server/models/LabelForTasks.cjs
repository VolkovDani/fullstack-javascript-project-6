// @ts-check

const objectionUnique = require('objection-unique');
const BaseModel = require('./BaseModel.cjs');

const unique = objectionUnique({ fields: [['labelId, taskId']] });

module.exports = class LabelsForTasks extends unique(BaseModel) {
  static get tableName() {
    return 'labels_for_tasks';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['labelId, taskId'],
      properties: {
        id: { type: 'integer' },
        labelId: { type: 'integer' },
        taskId: { type: 'integer' },
      },
    };
  }
};
