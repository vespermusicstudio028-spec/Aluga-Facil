import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection } from "firebase/firestore";
import * as fs from 'fs';

const configStr = fs.readFileSync('firebase-applet-config.json', 'utf-8');
const config = JSON.parse(configStr);
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const q = await getDocs(collection(db, "properties"));
  console.log("Properties:", q.docs.map(d => ({id: d.id, name: d.data().name, photos: d.data().photos})));
}
run().catch(console.error).finally(() => process.exit(0));
