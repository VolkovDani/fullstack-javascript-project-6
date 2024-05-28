// @ts-check

export const up = (knex) => (
  knex.schema.createTable('labels_for_tasks', (table) => {
    table.increments('id').primary();
    table.integer('label_id').references('id').inTable('labels').onDelete('CASCADE');
    table.integer('task_id').references('id').inTable('tasks').onDelete('CASCADE');
  })
);

export const down = (knex) => knex.schema.dropTable('labels_for_tasks');