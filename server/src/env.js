const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/** Loads the repository-root .env, then server/.env (which wins). Hosted environments set real env vars instead. */
function loadEnvFiles() {
  // Lets automated tests run the CLI scripts with exactly the environment they pass.
  if (process.env.HERBALCLINIC_SKIP_ENV_FILES === 'true') {
    return;
  }
  const rootEnv = path.join(__dirname, '..', '..', '.env');
  const serverEnv = path.join(__dirname, '..', '.env');
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  }
  if (fs.existsSync(serverEnv)) {
    dotenv.config({ path: serverEnv, override: true });
  }
}

module.exports = { loadEnvFiles };
