FROM --platform=linux/arm64 python:3.11-slim

# Sistemde ihtiyaç duyulan paketleri yükle
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    libssl-dev \
    libjpeg-dev \
    zlib1g-dev \
    libjpeg8-dev \
    libxslt1-dev \
    libxml2-dev \
    libbz2-dev \
    tzdata \
    git \
 && apt-get clean

# Çalışma dizinini ayarla
WORKDIR /usr/src/app

# Home Assistant kaynak kodunu çek
RUN git clone --depth=1 https://github.com/home-assistant/core.git .

# Gerekli Python bağımlılıklarını yükle
RUN pip install --no-cache-dir -r requirements.txt

# Ana uygulamayı başlat
CMD [ "python", "-m", "homeassistant", "--config", "/config" ]

