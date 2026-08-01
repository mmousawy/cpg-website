/** @param {string[]} filenames */
function chunkEslint(filenames) {
  const CHUNK_SIZE = 15;
  const commands = [];

  for (let i = 0; i < filenames.length; i += CHUNK_SIZE) {
    const chunk = filenames.slice(i, i + CHUNK_SIZE);
    const files = chunk.map((file) => JSON.stringify(file)).join(' ');
    commands.push(`eslint --fix --max-warnings=999999 ${files}`);
  }

  return commands;
}

/** @type {import('lint-staged').Configuration} */
export default {
  '*.{ts,tsx}': chunkEslint,
};
