# JetPack 4.6 (L4T 32.6.1) için resmi base image
FROM nvcr.io/nvidia/l4t-base:r32.6.1

# 1. CA sertifikalarını güncelle
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    update-ca-certificates --fresh && \
    rm -rf /var/lib/apt/lists/*

# 2. Temel bağımlılıklar
RUN apt-get update && apt-get install -y --no-install-recommends \
    git build-essential curl python3-pip \
    python3-setuptools python3-wheel libopenblas-dev \
    libcurl4-openssl-dev libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# 3. Python bağımlılıkları
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir numpy==1.19.5

# 4. llama.cpp'i indir ve derle (CMake olmadan)
WORKDIR /opt
RUN git clone https://github.com/ggerganov/llama.cpp --depth 1 --branch master && \
    cd llama.cpp && \
    make -j$(nproc) LLAMA_CUBLAS=1 LLAMA_OPENBLAS=1

# 5. Derlenmiş binary'yi kopyala
RUN cp /opt/llama.cpp/main /usr/local/bin/llamacpp

# 6. Python entegrasyonu
RUN pip3 install --no-cache-dir llama-cpp-python==0.1.78

# 7. Çalışma dizini
WORKDIR /app
VOLUME ["/models"]

# 8. Basit uygulama
COPY app.py /app/
ENTRYPOINT ["python3", "/app/app.py"]
