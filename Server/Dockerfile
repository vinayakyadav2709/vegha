# ---------- Stage 1: Builder ----------
FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

# Install all build dependencies once
RUN apt-get update && apt-get install -y --no-install-recommends \
        software-properties-common \
        gnupg \
        curl \
        ca-certificates \
        build-essential \
        git && \
    add-apt-repository -y ppa:deadsnakes/ppa && \
    add-apt-repository -y ppa:sumo/stable && \
    apt-get update && apt-get install -y --no-install-recommends \
        python3.12 python3.12-venv python3.12-dev \
        sumo sumo-tools && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create virtual environment and upgrade pip
RUN python3.12 -m venv $VIRTUAL_ENV && \
    pip install --no-cache-dir --upgrade pip setuptools wheel

WORKDIR /app

# Copy only requirements first for cache efficiency
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code last (changes here won’t invalidate deps)
COPY . .

# ---------- Stage 2: Runtime ----------
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    SUMO_HOME=/usr/share/sumo \
    PYTHONPATH="/usr/share/sumo/tools" \
    PYTHONUNBUFFERED=1

# Install minimal runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
        software-properties-common \
        gnupg \
        curl \
        ca-certificates && \
    add-apt-repository -y ppa:deadsnakes/ppa && \
    add-apt-repository -y ppa:sumo/stable && \
    apt-get update && apt-get install -y --no-install-recommends \
        python3.12 python3.12-venv libpython3.12 \
        sumo sumo-tools && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy prebuilt environment + app
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app /app
WORKDIR /app

# Expose app port
EXPOSE 3200

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python3 -c "import requests; requests.get('http://localhost:3000/health')" || exit 1

# Run app via gunicorn
CMD ["python","main.py"]
