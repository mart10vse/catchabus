const sum = require('../app/sum');

test('adds strings to equal "Hello World!"', () => {
  expect(sum("Hello ", "World!")).toBe("Hello World!");
});