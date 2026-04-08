import { PORT } from './config/env.js';
import app from './app.js';

app.listen(PORT, () => {
  console.log(`qr-menu server running on port ${PORT}`);
});
