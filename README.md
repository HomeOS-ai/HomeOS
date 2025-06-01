# HomeOS-AI: Yerel Yapay Zeka Destekli Akıllı Ev Sistemi

HomeOS-AI, Jetson Nano üzerinde çalışan yerel bir yapay zeka modeli (TinyLlama) ile sesli komutları anlayan ve akıllı ev cihazlarını yönetebilen açık kaynaklı bir platformdur. Veri gizliliği, özelleştirilebilirlik ve siber güvenlik odağındadır.

## 🎯 Proje Amacı

* Yerel (bulutsuz) çalışan, doğal dil komutlarını anlayan bir akıllı ev sistemi kurmak
* Home Assistant ile entegre edilmiş cihazları kontrol edebilmek
* Kendi sesli asistanımızı özgürce geliştirebilmek
* Veri gizliliğini ve yerel işlemeyi öncelikli tutmak

## 🧑‍🤝‍🧑 Takım Üyeleri ve Rolleri

| Üye Adı | Rolü                                      | Yetkinlikler                    |
| -------------------- | ---------------------------- | ------------------------------- |
| Ahmet Korkmaz        | Gömülü Sistem & Koordinasyon | Jetson, Docker, Donanım         |
| Musa Adıgüzel        | Flutter Mobil Uygulama       | Flutter, Firebase, UI/UX        |
| Siraç Gezgin         | LLM & CUDA                   | Llama.cpp, Whisper, Jetson CUDA |
| Ertuğrul Çapan       | Siber Güvenlik               | VPN, SSH Hardening, 2FA, Nginx  |
| Kenan Yılmaz         | Veritabanı                   | PostgreSQL, MongoDB, ORM        |
| Ali Erdem Baltacı    | Backend API & MQTT           | FastAPI, MQTT, RESTful API      |

## ⚙ Kullanılan Teknolojiler

* Jetson Nano + Ubuntu 20.04
* Docker + docker-compose
* Llama.cpp + TinyLlama (1.1B) + CUDA
* Home Assistant (Docker içinde)
* MQTT Broker (Mosquitto)
* FastAPI (backend)
* Flutter (mobil uygulama)
* PostgreSQL (veri saklama)
* WireGuard (uzaktan güvenli bağlantı)

## 🧱 Mimarik Yapı

Proje üç temel Docker container üzerinde çalışır:

1. Home Assistant → Akıllı ev cihazlarının kontrolü
2. LLM (llama.cpp) + Whisper → Sesli komutu metne çevirir ve anlar
3. MQTT Broker → Home Assistant ile cihazlar arasında haberleşme

🗺️ Daha fazla detay için → /docs/proje\_brosuru.pdf

## 📦 Docker Kurulumu

Projenizi başlatmak için:

git clone [[https://github.com/kullanici\_adi/homeos-ai.git](https://github.com/HomeOS-ai/HomeOS.git)](https://github.com/HomeOS-ai/HomeOS.git)
cd homeos-ai/config
docker-compose up --build

## 🤝 Katkıda Bulun

Bu proje açık kaynaklıdır. Dünya genelinden geliştiriciler, araştırmacılar ve öğrenciler katkı yapabilir. Ayrıntılı rehber için CONTRIBUTING.md dosyasını inceleyiniz.

## 💡 Destek ve Bağış

HomeOS-AI projesi, özgür yazılım ilkeleriyle geliştirilmektedir.
Eğer siz de yerli yapay zeka ve mahremiyet odaklı teknolojilere destek olmak istiyorsanız GitHub üzerinden yıldız vererek, sosyal medya paylaşımları yaparak veya bağışta bulunarak destek olabilirsiniz.

## 🌐 Sosyal Medya ve Topluluk

LinkedIn Paylaşımı (Tüm ekip + danışman hocamız etiketlenmeli)
Ekran görüntüleri → /screenshots klasörüne yüklenecek

🎯 Danışmanımız: Volkan Altuntaş ([valtuntas@gmail.com](mailto:valtuntas@gmail.com))
📣 LinkedIn: @VolkanAltuntas

📁 Kullanım Kılavuzu (v2.0) → /docs/kullanim\_klavuzu\_v2.0.pdf
📁 Proje Broşürü → /docs/proje\_brosuru.pdf

—

Hazırsan bu yapının ilk klasör ve dosyalarını senin için oluşturabilirim veya .zip halinde paylaşmak istersen yapıyı dışa da aktarabilirim. İstersen ilk adım olarak docker-compose.yml veya README dosyasını da birlikte yazabiliriz.

Ne ile başlamak istersin? Docker klasörleri mi, yoksa README'nin final hali mi?
