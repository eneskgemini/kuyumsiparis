/**
 * migrate-images-to-storage.js
 * ------------------------------------------------------------------
 * Firestore'daki eski ürün/katalog/logo/AI-stüdyo görsellerini (devasa
 * base64 metni olarak saklananları) Firebase Storage'a taşır ve
 * belgedeki alanı kısa bir indirme linkiyle günceller.
 *
 * Bu script SADECE "data:image/..." ile başlayan (yani hâlâ base64
 * olan) alanlara dokunur. Daha önce Storage'a taşınmış (https:// linki
 * olan) belgeleri atlar — güvenle defalarca çalıştırılabilir.
 *
 * KULLANIM
 * ------------------------------------------------------------------
 * 1) Bu klasörde bir kere kur:
 *      npm install firebase-admin
 *
 * 2) Firebase Console'dan bir "servis hesabı" (service account) anahtarı
 *    indir:
 *      Firebase Console → Proje Ayarları (⚙️) → Service accounts
 *      → "Generate new private key" → inen .json dosyasını bu scripts
 *      klasörüne "serviceAccountKey.json" adıyla koy.
 *      (Bu dosyayı ASLA GitHub'a veya paylaşılan bir yere yüklemeyin —
 *      projenizin tam yönetici anahtarıdır.)
 *
 * 3) Önce SADECE ÖNİZLEME (hiçbir şey değiştirmez, sadece ne
 *    yapacağını listeler):
 *      node migrate-images-to-storage.js
 *
 * 4) Çıktıyı kontrol ettikten sonra gerçekten taşımak için:
 *      node migrate-images-to-storage.js --apply
 *
 * İsteğe bağlı bayraklar:
 *   --apply              Gerçekten yaz (yoksa sadece önizleme yapar)
 *   --collection=products,catalogue_images,ai_studio_templates,settings
 *                        Sadece belirtilen koleksiyonları işle (virgülle ayır)
 *   --service-account=./baska-dosya.json
 *                        Farklı bir servis hesabı dosyası kullan
 * ------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---- Ayarlar (projenizin src/utils/constants.js ve src/config/firebase.js ile aynı) ----
const APP_ID = 'sahra-kuyum-app';
const STORAGE_BUCKET = 'sahra-c9ba6.firebasestorage.app';

// ---- Argümanları oku ----
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const collectionArg = args.find((a) => a.startsWith('--collection='));
const ONLY_COLLECTIONS = collectionArg ? collectionArg.split('=')[1].split(',').map((s) => s.trim()) : null;
const serviceAccountArg = args.find((a) => a.startsWith('--service-account='));
const SERVICE_ACCOUNT_PATH = serviceAccountArg
    ? path.resolve(serviceAccountArg.split('=')[1])
    : path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('\n❌ Servis hesabı anahtarı bulunamadı: ' + SERVICE_ACCOUNT_PATH);
    console.error('   Firebase Console → Proje Ayarları → Service accounts → Generate new private key');
    console.error('   ile indirip bu dosyanın yanına "serviceAccountKey.json" adıyla koyun.\n');
    process.exit(1);
}

let admin;
try {
    admin = require('firebase-admin');
} catch (e) {
    console.error('\n❌ "firebase-admin" paketi kurulu değil. Önce şunu çalıştırın:');
    console.error('   npm install firebase-admin\n');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
    storageBucket: STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ---- Taşınacak koleksiyon/alan tanımları ----
// type 'collection' => bu koleksiyondaki HER belge işlenir
// type 'doc'         => tek bir belge işlenir (örn. logo ayarları)
const TARGETS = [
    {
        name: 'products',
        type: 'collection',
        ref: db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('products'),
        field: 'imageUrl',
        folder: 'products',
    },
    {
        name: 'catalogue_images',
        type: 'collection',
        ref: db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('catalogue_images'),
        field: 'imageUrl',
        folder: 'catalogue',
    },
    {
        name: 'ai_studio_templates',
        type: 'collection',
        ref: db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('ai_studio_templates'),
        field: 'bgImage',
        folder: 'ai_studio_templates',
    },
    {
        name: 'settings',
        type: 'doc',
        ref: db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('settings').doc('general'),
        field: 'logoUrl',
        folder: 'logo',
    },
];

const targetsToRun = ONLY_COLLECTIONS ? TARGETS.filter((t) => ONLY_COLLECTIONS.includes(t.name)) : TARGETS;

function parseDataUrl(dataUrl) {
    const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/s.exec(dataUrl);
    if (!match) return null;
    const mime = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
    return { mime, buffer, ext };
}

async function uploadBufferAndGetUrl(buffer, mime, ext, folder, docId) {
    const token = crypto.randomUUID();
    const filePath = `${folder}/migrated_${docId}_${Date.now()}.${ext}`;
    const file = bucket.file(filePath);
    await file.save(buffer, {
        metadata: {
            contentType: mime,
            metadata: { firebaseStorageDownloadTokens: token },
        },
    });
    const encodedPath = encodeURIComponent(filePath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
}

async function processDoc(target, docSnap) {
    const data = docSnap.data();
    const value = data[target.field];
    if (!value || typeof value !== 'string' || !value.startsWith('data:image')) {
        return { skipped: true };
    }

    const parsed = parseDataUrl(value);
    if (!parsed) {
        return { error: 'base64 formatı çözülemedi (beklenmeyen biçim)' };
    }

    const sizeKb = Math.round(parsed.buffer.length / 1024);

    if (!APPLY) {
        return { wouldMigrate: true, sizeKb };
    }

    const url = await uploadBufferAndGetUrl(parsed.buffer, parsed.mime, parsed.ext, target.folder, docSnap.id);
    await docSnap.ref.update({ [target.field]: url });
    return { migrated: true, sizeKb, url };
}

async function run() {
    console.log(`\n${APPLY ? '🚀 UYGULAMA MODU (gerçekten yazılacak)' : '👀 ÖNİZLEME MODU (hiçbir şey değiştirilmeyecek — gerçek taşımak için --apply ekleyin)'}\n`);

    let totalFound = 0;
    let totalMigrated = 0;
    let totalErrors = 0;
    let totalSizeKb = 0;

    for (const target of targetsToRun) {
        console.log(`\n📂 ${target.name}`);

        let docs = [];
        if (target.type === 'collection') {
            const snap = await target.ref.get();
            docs = snap.docs;
        } else {
            const snap = await target.ref.get();
            if (snap.exists) docs = [snap];
        }

        if (docs.length === 0) {
            console.log('   (belge yok, atlanıyor)');
            continue;
        }

        for (const docSnap of docs) {
            try {
                const result = await processDoc(target, docSnap);
                if (result.skipped) continue;
                totalFound++;
                if (result.error) {
                    totalErrors++;
                    console.log(`   ⚠️  ${docSnap.id}: ${result.error}`);
                } else if (result.wouldMigrate) {
                    totalSizeKb += result.sizeKb;
                    console.log(`   → ${docSnap.id} taşınacak (${result.sizeKb} KB)`);
                } else if (result.migrated) {
                    totalMigrated++;
                    totalSizeKb += result.sizeKb;
                    console.log(`   ✅ ${docSnap.id} taşındı (${result.sizeKb} KB) → ${result.url}`);
                }
            } catch (err) {
                totalErrors++;
                console.log(`   ❌ ${docSnap.id}: ${err.message}`);
            }
        }
    }

    console.log('\n----------------------------------------');
    console.log(`Toplam base64 görsel bulundu : ${totalFound}`);
    if (APPLY) {
        console.log(`Başarıyla taşınan            : ${totalMigrated}`);
    }
    console.log(`Hata                          : ${totalErrors}`);
    console.log(`Toplam yaklaşık boyut         : ${(totalSizeKb / 1024).toFixed(1)} MB`);
    console.log('----------------------------------------\n');

    if (!APPLY && totalFound > 0) {
        console.log('Gerçekten taşımak için:  node migrate-images-to-storage.js --apply\n');
    }
}

run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('\n❌ Script hata ile durdu:', err);
        process.exit(1);
    });
