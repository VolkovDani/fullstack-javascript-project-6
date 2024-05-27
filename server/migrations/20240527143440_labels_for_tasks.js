// @ts-check

export const up = (knex) => (
  knex.schema.createTable('labels_for_tasks', (table) => {
    table.increments('id').primary();
    table.integer('label_id');
    table.integer('task_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  })
);

export const down = (knex) => knex.schema.dropTable('labels_for_tasks');