// @ts-check

export const up = (knex) => knex.schema
  .createTable('labels_for_tasks', (table) => {
    table.increments('id').primary();
    table.integer('label_id');
    table.integer('task_id');
  })
  .alterTable('tasks', (table) => {
    table
      .integer('status_id')
      .references('id')
      .inTable('statuses')
      .onDelete('RESTRICT');
    table
      .integer('creator_id')
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');
  });

export const down = (knex) => knex.schema.dropTable('labels_for_tasks');
