/**
 * markFirstGenUsers.js
 * ─────────────────────────────────────────────────────
 * One-time migration script.
 * Finds the first 1000 Wathiq profiles (ordered by createdAt ASC)
 * and stamps { isFirstGen: true } on each one.
 *
 * HOW TO RUN:
 *   1. Download your Firebase service account key from:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Save it as  scripts/serviceAccountKey.json  (it's in .gitignore)
 *   3. In this folder run:
 *        npm install firebase-admin
 *        node markFirstGenUsers.js
 *
 * SAFE TO RE-RUN: Already-stamped profiles are skipped.
 * ─────────────────────────────────────────────────────
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'whatheeq',
});

const db = admin.firestore();

const FIRST_GEN_LIMIT = 1000;
const BATCH_SIZE = 400; // Firestore batch max is 500

async function run() {
    console.log(`\nQuerying the first ${FIRST_GEN_LIMIT} profiles by createdAt...\n`);

    const snapshot = await db
        .collection('profiles')
        .orderBy('createdAt', 'asc')
        .limit(FIRST_GEN_LIMIT)
        .get();

    if (snapshot.empty) {
        console.log('No profiles found. Exiting.');
        return;
    }

    const docs = snapshot.docs;
    console.log(`Found ${docs.length} profiles. Starting batch writes...\n`);

    let stamped = 0;
    let skipped = 0;

    // Process in chunks to stay under Firestore batch limit
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const chunk = docs.slice(i, i + BATCH_SIZE);
        const batch = db.batch();

        for (const docSnap of chunk) {
            if (docSnap.data().isFirstGen === true) {
                skipped++;
                continue;
            }
            batch.update(docSnap.ref, { isFirstGen: true });
            stamped++;
        }

        await batch.commit();
        console.log(`  Batch committed: ${i + chunk.length} / ${docs.length} processed`);
    }

    console.log(`\nDone.`);
    console.log(`  Stamped:  ${stamped} profiles`);
    console.log(`  Skipped:  ${skipped} (already had isFirstGen: true)`);
    console.log(`\nAll first-gen users now have isFirstGen: true in Firestore.\n`);
}

run().catch((err) => {
    console.error('\nScript failed:', err);
    process.exit(1);
});
