# Görsel taşıma script'i

`migrate-images-to-storage.js`, Firestore'da hâlâ base64 (devasa metin) olarak
duran eski ürün / katalog / logo / AI stüdyo görsellerini Firebase Storage'a
taşır ve belgeleri kısa bir linkle günceller. Bu, ürün listesinin ilk
açılışını daha da hızlandırır.

## Kurulum (bir kere)

```bash
cd scripts
npm install firebase-admin
```

## Servis hesabı anahtarı

1. https://console.firebase.google.com → projenizi seçin
2. ⚙️ Proje Ayarları → **Service accounts** sekmesi
3. **Generate new private key** → inen `.json` dosyasını bu `scripts`
   klasörüne **`serviceAccountKey.json`** adıyla koyun.

Bu dosya projenizin tam yönetici anahtarıdır — kimseyle paylaşmayın, GitHub'a
yüklemeyin. (Projede bir `.git` deposu varsa, bu dosyayı `.gitignore`'a
eklemeyi unutmayın.)

## Kullanım

Önce mutlaka **önizleme** ile ne olacağını görün (hiçbir şeyi değiştirmez):

```bash
node migrate-images-to-storage.js
```

Çıktıyı kontrol ettikten sonra gerçekten taşımak için:

```bash
node migrate-images-to-storage.js --apply
```

Sadece belirli bir bölümü taşımak isterseniz:

```bash
node migrate-images-to-storage.js --apply --collection=products
```

(seçenekler: `products`, `catalogue_images`, `ai_studio_templates`, `settings`)

## Güvenlik notları

- Script sadece **`data:image/...` ile başlayan** (yani hâlâ base64 olan)
  alanlara dokunur; zaten Storage linki olan belgeleri atlar — bu yüzden
  güvenle birden fazla kez çalıştırılabilir.
- Her belge ayrı ayrı işlenir; birinde hata olursa script durmaz, diğerlerine
  devam eder ve sonunda bir hata özeti gösterir.
- Orijinal Firestore belgesi silinmez, sadece görsel alanındaki değer
  (base64 metin → Storage linki) güncellenir.
