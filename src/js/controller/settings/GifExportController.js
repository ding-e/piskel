(function () {
  var ns = $.namespace("pskl.controller.settings");

  var URL_MAX_LENGTH = 30;
  var MAX_GIF_COLORS = 256;

  ns.GifExportController = function (piskelController) {
    this.piskelController = piskelController;
  };

  /**
   * List of Resolutions applicable for Gif export
   * @static
   * @type {Array} array of Objects {zoom:{Number}, default:{Boolean}}
   */
  ns.GifExportController.RESOLUTIONS = [
    {
      'zoom' : 1
    },{
      'zoom' : 5
    },{
      'zoom' : 10,
      'default' : true
    },{
      'zoom' : 20
    }
  ];

  ns.GifExportController.prototype.init = function () {
    this.optionTemplate_ = pskl.utils.Template.get("gif-export-option-template");

    this.uploadStatusContainerEl = document.querySelector(".gif-upload-status");

    this.previewContainerEl = document.querySelector(".gif-export-preview");
    this.selectResolutionEl = document.querySelector(".gif-export-select-resolution");

    this.uploadButton = $(".gif-upload-button");
    this.uploadButton.click(this.onUploadButtonClick_.bind(this));

    this.downloadButton = $(".gif-download-button");
    this.downloadButton.click(this.onDownloadButtonClick_.bind(this));

    this.exportForm = $(".gif-export-form");

    this.exportProgressStatusEl = document.querySelector('.gif-export-progress-status');
    this.exportProgressBarEl = document.querySelector('.gif-export-progress-bar');

    this.createOptionElements_();
  };

  ns.GifExportController.prototype.onUploadButtonClick_ = function (evt) {
    evt.originalEvent.preventDefault();
    var zoom = this.getSelectedZoom_(),
        fps = this.piskelController.getFPS();

    this.renderAsImageDataAnimatedGIF(zoom, fps, this.onGifRenderingCompleted_.bind(this));
  };

  ns.GifExportController.prototype.onDownloadButtonClick_ = function (evt) {
    var fileName = this.piskelController.getPiskel().getDescriptor().name + '.gif';
    var zoom = this.getSelectedZoom_(),
        fps = this.piskelController.getFPS();

    this.renderAsImageDataAnimatedGIF(zoom, fps, function (imageData) {
      pskl.app.imageUploadService.upload(imageData, this.onImageUploadCompleted_.bind(this));
      pskl.utils.BlobUtils.dataToBlob(imageData, "image/gif", function(blob) {
        pskl.utils.FileUtils.downloadAsFile(blob, fileName);
      });
    }.bind(this));
  };

  ns.GifExportController.prototype.onGifRenderingCompleted_ = function (imageData) {
    this.updatePreview_(imageData);
    this.previewContainerEl.classList.add("preview-upload-ongoing");
    pskl.app.imageUploadService.upload(imageData, this.onImageUploadCompleted_.bind(this));
  };

  ns.GifExportController.prototype.onImageUploadCompleted_ = function (imageUrl) {
    this.updatePreview_(imageUrl);
    this.updateStatus_(imageUrl);
    this.previewContainerEl.classList.remove("preview-upload-ongoing");
  };

  ns.GifExportController.prototype.updatePreview_ = function (src) {
    this.previewContainerEl.innerHTML = "<div><img style='max-width:32px;' src='"+src+"'/></div>";
  };

  ns.GifExportController.prototype.getSelectedZoom_ = function () {
    return this.selectResolutionEl.value;
  };

  ns.GifExportController.prototype.createOptionElements_ = function () {
    var resolutions = ns.GifExportController.RESOLUTIONS;
    for (var i = 0 ; i < resolutions.length ; i++) {
      var option = this.createOptionForResolution_(resolutions[i]);
      this.selectResolutionEl.appendChild(option);
    }
  };

  ns.GifExportController.prototype.createOptionForResolution_ = function (resolution) {
    var zoom = resolution.zoom;
    var label = zoom*this.piskelController.getWidth() + "x" + zoom*this.piskelController.getHeight();
    var value = zoom;

    var optionHTML = pskl.utils.Template.replace(this.optionTemplate_, {value : value, label : label});
    var optionEl = pskl.utils.Template.createFromHTML(optionHTML);

    return optionEl;
  };

  ns.GifExportController.prototype.renderAsImageDataAnimatedGIF = function(zoom, fps, cb) {
    var colorCount = pskl.app.currentColorsService.getCurrentColors().length;
    var preserveColors = colorCount < MAX_GIF_COLORS;
    var gif = new window.GIF({
      workers: 2,
      quality: 1,
      width: this.piskelController.getWidth()*zoom,
      height: this.piskelController.getHeight()*zoom,
      preserveColors : preserveColors
    });

    for (var i = 0; i < this.piskelController.getFrameCount(); i++) {
      var frame = this.piskelController.getFrameAt(i);
      var canvasRenderer = new pskl.rendering.CanvasRenderer(frame, zoom);
      var canvas = canvasRenderer.render();
      gif.addFrame(canvas.getContext('2d'), {
        delay: 1000 / fps
      });
    }

    gif.on('progress', function(percentage) {
      this.updateProgressStatus_((percentage*100).toFixed(2));
    }.bind(this));

    gif.on('finished', function(blob) {
      this.hideProgressStatus_();
      pskl.utils.FileUtils.readFile(blob, cb);
    }.bind(this));

    gif.render();
  };

  ns.GifExportController.prototype.updateProgressStatus_ = function (percentage) {
    this.exportProgressStatusEl.innerHTML = percentage + '%';
    this.exportProgressBarEl.style.width = percentage + "%";

  };

  ns.GifExportController.prototype.hideProgressStatus_ = function () {
    this.exportProgressStatusEl.innerHTML = '';
    this.exportProgressBarEl.style.width = "0";
  };

  // FIXME : HORRIBLE COPY/PASTA

  ns.GifExportController.prototype.updateStatus_ = function (imageUrl, error) {
    if (imageUrl) {
      var linkTpl = "<a class='image-link' href='{{link}}' target='_blank'>{{shortLink}}</a>";
      var linkHtml = pskl.utils.Template.replace(linkTpl, {
        link : imageUrl,
        shortLink : this.shorten_(imageUrl, URL_MAX_LENGTH, '...')
      });
      this.uploadStatusContainerEl.innerHTML = 'Your image is now available at : ' + linkHtml;
    } else {
      // FIXME : Should display error message instead
    }
  };

  ns.GifExportController.prototype.shorten_ = function (url, maxLength, suffix) {
    if (url.length > maxLength) {
      var index = Math.round((maxLength-suffix.length) / 2);
      var part1 = url.substring(0, index);
      var part2 = url.substring(url.length - index, url.length);
      url = part1 + suffix + part2;
    }
    return url;
  };
})();