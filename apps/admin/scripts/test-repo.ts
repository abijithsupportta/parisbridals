import { categoryRepository } from '../repository/categoryRepository';
import fs from 'fs';

// simple dotenv equivalent
const envConfig = fs.readFileSync('.env.local', 'utf-8');
for (const line of envConfig.split('\n')) {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    }
  }
}

async function run() {
  console.log("Checking categories...");
  const result = await categoryRepository.findAll();
  console.log("Categories result:", JSON.stringify(result, null, 2));
}
run().catch(console.error);
