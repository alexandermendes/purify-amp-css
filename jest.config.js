module.exports = {
  clearMocks: true,
  testEnvironment: 'node',
  testPathIgnorePatterns: ['node_modules', 'dist'],
  transform: { '^.+\\.[t|j]sx?$': 'babel-jest' },
};
