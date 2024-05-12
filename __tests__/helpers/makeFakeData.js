import { faker } from '@faker-js/faker';

const fakeUser = {
  id: faker.string.uuid(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
};

console.log(fakeUser);
