// @ts-check

export const up = (knex) =>
  knex.schema
    .createTable('labels_for_tasks', (table) => {
      table.increments('id').primary();
      table.integer('label_id');
      table.integer('task_id');
    })
    .createTable('tasks', (table) => {
      table.increments('id').primary();
      table.string('name');
      table.string('description');
  
      table.integer('status_id')
        .references('id')
        .inTable('statuses')
        .onDelete('RESTRICT');
  
      table.integer('creator_id')
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT');
  
      table.integer('executor_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
  
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })

export const down = (knex) => knex.schema.dropTable('labels_for_tasks');
