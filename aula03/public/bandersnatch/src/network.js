class Network {
  constructor({ host }) {
    this.host = host;
  }

  parseManifestURL({ url, fileResolution, fileResolutionTag, hostTag }) {
    return url
      .replace(fileResolutionTag, fileResolution)
      .replace(hostTag, this.host);
  }

  async fetchFile(url) {
    const response = await fetch(url);
    return response.arrayBuffer();
  }

  async getProperResolution(url) {
    const startMs = Date.now();
    const response = await fetch(url);
    await response.arrayBuffer();
    const endMS = Date.now();
    const durationInMs = endMS - startMs;

    // ao invés de calcular o troughPut, vamos calular pelo tempo
    const resolution = [
      // pior cenário possível, 20 segundos
      { start: 3001, end: 20000, resolution: 144 },
      // at\e 3 segundos
      { start: 901, end: 3000, resolution: 360 },
      // menos de 1 segundo
      { start: 0, end: 900, resolution: 720 },
    ];

    const item = resolution.find(item => {
      return item.start <= durationInMs && item.end >= durationInMs;
    });

    const LOWEST_RESOSUTION = 144;
    // se for mais de 30s
    if (!item) return LOWEST_RESOSUTION;

    return item.resolution;
  }
}
