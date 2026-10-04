import { APP_NAME, APP_VERSION, createApp } from './app.js';

const PORT = 8080;

createApp().listen(PORT, '0.0.0.0', () => {
  console.log(`${APP_NAME} ${APP_VERSION} starting on port ${PORT}`);
});
