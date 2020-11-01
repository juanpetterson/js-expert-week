class VideoMediaPlayer {
  constructor({ manifestJSON, network, videoComponent }) {
    this.manifestJSON = manifestJSON;
    this.network = network;
    this.videoComponent = videoComponent;

    this.videoElement = null;
    this.sourceBuffer = null;
    this.activeItem = {};
    this.selected = {};
    this.videoDuration = 0;
  }

  initializeCodec() {
    this.videoElement = document.getElementById('vid');
    const mediaSourceSupported = !!window.MediaSource;
    if (!mediaSourceSupported) {
      alert('Seu browser ou sistema nao tem suporte a MSE!');
      return;
    }

    const codecSupported = MediaSource.isTypeSupported(this.manifestJSON.codec);
    if (!codecSupported) {
      alert(`Seu browser nao suporta o codec: ${this.manifestJSON.codec}`);
      return;
    }

    const mediaSource = new MediaSource();
    this.videoElement.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener(
      'sourceopen',
      this.sourceOpenWrapper(mediaSource)
    );
  }

  sourceOpenWrapper(mediaSource) {
    return async _ => {
      this.sourceBuffer = mediaSource.addSourceBuffer(this.manifestJSON.codec);
      const selected = (this.selected = this.manifestJSON.intro);
      // evita rodar como "LIVE"
      mediaSource.duration = this.videoDuration;
      await this.fileDownload(selected.url);
      this.waitForQuestions();

      setInterval(this.waitForQuestions.bind(this), 200);
    };
  }

  waitForQuestions() {
    const currentTime = parseInt(this.videoElement.currentTime);
    const option = this.selected.at === currentTime;

    if (!option) return;

    // evita que o modal seja aberto 2 vezes no mesmo segundo
    if (this.activeItem.url === this.selected.url) return;

    this.videoComponent.configureModal(this.selected.option);
    this.activeItem = this.selected;

    this.videoComponent.configureModal(this.selected.options);
  }

  async nextChunk(data) {
    const key = data.toLowerCase();
    const selected = this.manifestJSON[key];

    this.selected = {
      ...selected,
      // ajusta o tempo que o modal vai aparecer, baseado no tempo corrente
      at: parseInt(this.videoElement.currentTime + selected.at),
    };

    // deixa o rstante do video rodar enquanto baixa o novo video
    this.videoElement.play();
    await this.fileDownload(selected.url);
  }

  async fileDownload(url) {
    const prepareUrl = {
      url,
      fileResolution: 360,
      fileResolutionTag: this.manifestJSON.fileResolutionTag,
      hostTag: this.manifestJSON.hostTag,
    };
    const finalUrl = this.network.parseManifestURL(prepareUrl);
    this.setVideoPlayerDuration(finalUrl);
    const data = await this.network.fetchFile(finalUrl);
    return this.processBufferSegments(data);
  }

  setVideoPlayerDuration(finalURL) {
    const bars = finalURL.split('/');
    const [name, videoDuration] = bars[bars.length - 1].split('-');
    this.videoDuration += parseFloat(videoDuration);
  }
  async processBufferSegments(allSegments) {
    const sourceBuffer = this.sourceBuffer;
    sourceBuffer.appendBuffer(allSegments);

    return new Promise((resolve, reject) => {
      const updateEnd = _ => {
        sourceBuffer.removeEventListener('updateend', updateEnd);
        sourceBuffer.timestampOffset = this.videoDuration;

        return resolve();
      };

      sourceBuffer.addEventListener('updateend', updateEnd);
      sourceBuffer.addEventListener('error', reject);
    });
  }
}
