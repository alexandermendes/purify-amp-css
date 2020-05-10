module.exports = {
  clearMocks: true,
  testPathIgnorePatterns: ['node_modules', 'dist'],
  transform: { '^.+\\.[t|j]sx?$': 'babel-jest' },
};
