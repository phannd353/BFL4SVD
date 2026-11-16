ARG FLWR_VERSION

FROM flwr/superexec:${FLWR_VERSION:-1.42.0}

# gcc is required for the fastai quickstart example
USER root
RUN apt-get update \
    && apt-get -y --no-install-recommends install \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --chown=app:app ./LICENSE* ./
COPY --chown=app:app ./fl/src/* ./fl/src/
COPY --chown=app:app ./fl/pyproject.toml ./fl/
RUN cd fl \
    && sed -i 's/.*flwr\[simulation\].*//' pyproject.toml \
    && python -m pip install -U --no-cache-dir .

ENTRYPOINT ["flower-superexec"]
