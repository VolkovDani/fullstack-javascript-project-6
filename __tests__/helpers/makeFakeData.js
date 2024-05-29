import { faker } from '@faker-js/faker';

export const fakeUser = {
  id: faker.string.uuid(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
};

export const fakeTask = {
  name: faker.person.jobTitle(),
  description: faker.lorem.sentence(4),
  statusId: faker.number.int({ min: 1, max: 2 }),
  creatorId: faker.number.int({ min: 1, max: 3 }),
  executorId: faker.number.int({ min: 0, max: 3 }),
};
