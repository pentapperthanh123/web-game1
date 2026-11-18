FROM pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime

ENV TZ=UTC DEBIAN_FRONTEND=noninteractive

WORKDIR /app

ENV POETRY_VERSION=1.8.3

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    gcc g++ libc-dev libffi-dev libgmp-dev libmpfr-dev libmpc-dev \
    ffmpeg \
    sox \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN pip install --no-cache-dir poetry==${POETRY_VERSION}

ENV POETRY_CACHE_DIR=/tmp/poetry_cache
ENV POETRY_NO_INTERACTION=1
ENV POETRY_VIRTUALENVS_IN_PROJECT=true
ENV POETRY_VIRTUALENVS_CREATE=true
ENV POETRY_REQUESTS_TIMEOUT=30

# Clone official dangvansam/viet-tts repository
RUN git clone --depth 1 https://github.com/dangvansam/viet-tts.git /tmp/viet-tts && \
    cp -r /tmp/viet-tts/* /app/ && \
    rm -rf /tmp/viet-tts

# Patch model.py so FP16 (.half()) is only used when CUDA GPU is available (prevents CPU half-precision crash)
# Patch tts.py to use yaml.Loader with hyperpyyaml (bypasses ruamel.yaml Loader.max_depth conflict)
# Patch common.py to clone inference tensor before inplace fade window multiplication
RUN python -c "import pathlib; p = pathlib.Path('/app/viettts/model.py'); code = p.read_text(encoding='utf-8'); \
code = code.replace('self.llm.half()', 'self.llm.half() if self.device.type == \"cuda\" else None'); \
code = code.replace('embedding=llm_embedding.to(self.device).half()', 'embedding=llm_embedding.to(self.device).half() if self.device.type == \"cuda\" else llm_embedding.to(self.device)'); \
p.write_text(code, encoding='utf-8')" && \
    python -c "import pathlib; p = pathlib.Path('/app/viettts/tts.py'); code = p.read_text(encoding='utf-8'); \
code = code.replace('from hyperpyyaml import load_hyperpyyaml', 'import yaml\nfrom hyperpyyaml import load_hyperpyyaml'); \
code = code.replace('configs = load_hyperpyyaml(f)', 'configs = load_hyperpyyaml(f, loader=yaml.Loader)'); \
p.write_text(code, encoding='utf-8')" && \
    python -c "import pathlib; p = pathlib.Path('/app/viettts/utils/common.py'); code = p.read_text(encoding='utf-8'); \
code = code.replace('audio = audio.squeeze(0).cpu()', 'audio = audio.squeeze(0).cpu().clone()'); \
p.write_text(code, encoding='utf-8')"

# Ensure CPU onnxruntime works seamlessly and resolve silero-vad dependency conflict
RUN sed -i 's/onnxruntime-gpu = "1.16.0"/onnxruntime = ">=1.16.1"/g' /app/pyproject.toml && \
    sed -i 's/onnxruntime = "1.16.0"/onnxruntime = ">=1.16.1"/g' /app/pyproject.toml

RUN pip install --no-cache-dir "setuptools<75" wheel && \
    pip install --no-cache-dir "ruamel.yaml<0.18.0" && \
    pip install --no-cache-dir --no-build-isolation -e . && \
    pip cache purge

EXPOSE 8298

CMD ["viettts", "server", "--host", "0.0.0.0", "--port", "8298", "-w", "1"]
