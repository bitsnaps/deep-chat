import {RemarkableConfig} from '../../views/chat/messages/remarkable/remarkableConfig';
import {FileServiceIO, ServiceFileTypes, ServiceIO} from '../serviceIO';
import {FilesServiceConfig} from '../../types/fileServiceConfigs';
import {FileAttachments} from '../../types/fileAttachments';
import {RequestSettings} from '../../types/requestSettings';
import {AiAssistant} from '../../aiAssistant';

// WORK - watch the remarkable initializations
export class BuildFileTypes {
  // prettier-ignore
  private static parseConfig(requestSettings: RequestSettings, defFiles: FileAttachments,
      fileType?: boolean | FilesServiceConfig) {
    const fileConfig: FileServiceIO & {files: FileAttachments} = {files: defFiles};
    if (typeof fileType === 'object') {
      const {files, request, button} = fileType;
      if (files) {
        if (files.infoModal) {
          fileConfig.files.infoModal = files.infoModal;
          if (files.infoModal?.textMarkDown) {
            const remarkable = RemarkableConfig.createNew();
            fileConfig.infoModalTextMarkUp = remarkable.render(files.infoModal.textMarkDown);
          }
        }
        if (files.acceptedFormats) fileConfig.files.acceptedFormats = files.acceptedFormats;
        if (files.maxNumberOfFiles) fileConfig.files.maxNumberOfFiles = files.maxNumberOfFiles;
      }
      fileConfig.button = button;
      fileConfig.request = {
        headers: request?.headers || requestSettings.headers,
        method: request?.method || requestSettings.method,
        url: request?.url || requestSettings.url,
      };
    }
    return fileConfig;
  }

  private static processAudioConfig(serviceIO: ServiceIO, aiAssistant: AiAssistant, fileIO?: FileServiceIO) {
    const files = fileIO?.files || {};
    const defaultFormats = {acceptedFormats: 'audio/*', ...files};
    const audio = BuildFileTypes.parseConfig(serviceIO.requestSettings, defaultFormats, aiAssistant.audio);
    // make sure to set these in the right services
    // audio.files.acceptedFormats ??= fileIO?.files?.acceptedFormats || '.4a,.mp3,.webm,.mp4,.mpga,.wav,.mpeg,.m4a';
    // audio.files.maxNumberOfFiles ??= fileIO?.files?.maxNumberOfFiles || 1;
    serviceIO.fileTypes.audio = audio;
  }

  private static processImagesConfig(serviceIO: ServiceIO, aiAssistant: AiAssistant, fileIO?: FileServiceIO) {
    const files = fileIO?.files || {};
    const defaultFormats = {acceptedFormats: 'image/*', ...files};
    const images = BuildFileTypes.parseConfig(serviceIO.requestSettings, defaultFormats, aiAssistant.images);
    // make sure to set these in the right services
    // images.files.acceptedFormats ??= fileIO?.files?.acceptedFormats || '.png,.jpg';
    // images.files.maxNumberOfFiles ??= fileIO?.files?.maxNumberOfFiles || 1;
    serviceIO.fileTypes.images = images;
  }

  // needs to be set after images to overwrite maxNumberOfFiles
  private static processCamera(serviceIO: ServiceIO, camera: AiAssistant['camera'], images?: AiAssistant['images']) {
    const files = serviceIO.fileTypes.images?.files || {};
    const defaultFormats = {acceptedFormats: 'image/*', ...files};
    if (!camera) return;
    if (navigator.mediaDevices.getUserMedia !== undefined) {
      // check how maxNumberOfFiles is set here - if user has set in images - should use that instead
      serviceIO.camera = BuildFileTypes.parseConfig(serviceIO.requestSettings, defaultFormats, camera);
      if (typeof camera === 'object') {
        serviceIO.camera.modalContainerStyle = camera.modalContainerStyle;
        // adding configuration that parseConfig does not add (don't want to overwrite as it may have processed properties)
        if (camera.files) {
          serviceIO.camera.files ??= {}; // for typescript
          serviceIO.camera.files.format = camera.files?.format;
          // this.camera.files.newFilePrefix = customService.camera.files?.newFilePrefix; // can implement in the future
          serviceIO.camera.files.dimensions = camera.files?.dimensions;
        }
      }
      // if camera is not available - fallback to normal image upload
    } else if (!images) {
      serviceIO.fileTypes.images = BuildFileTypes.parseConfig(serviceIO.requestSettings, defaultFormats, camera);
    }
  }

  // needs to be set after audio to overwrite maxNumberOfFiles
  // prettier-ignore
  private static processMicrophone(
      serviceIO: ServiceIO, microphone: AiAssistant['microphoneAudio'], audio: AiAssistant['audio']) {
    const files = serviceIO.fileTypes.audio?.files || {};
    const defaultFormats = {acceptedFormats: 'audio/*', ...files};
    if (!microphone) return;
    if (navigator.mediaDevices.getUserMedia !== undefined) {
      serviceIO.recordAudio = BuildFileTypes.parseConfig(serviceIO.requestSettings, defaultFormats, microphone);
      // adding configuration that parseConfig does not add (don't want to overwrite as it may have processed properties)
      if (typeof microphone === 'object') {
        if (microphone.files) {
          serviceIO.recordAudio.files ??= {}; // for typescript
          serviceIO.recordAudio.files.format = microphone.files?.format;
          // this.recordAudio.files.newFilePrefix = customService.microphoneAudio.files?.newFilePrefix;
          serviceIO.recordAudio.files.maxDurationSeconds = microphone.files?.maxDurationSeconds;
          if (serviceIO.fileTypes.audio?.files) {
            serviceIO.fileTypes.audio.files.maxNumberOfFiles ??= microphone.files.maxNumberOfFiles;
          }
        }
      }
      // if microphone is not available - fallback to normal audio upload
    } else if (!audio) {
      serviceIO.fileTypes.audio = BuildFileTypes.parseConfig(serviceIO.requestSettings, defaultFormats, microphone);
    }
  }

  private static processMixedFiles(serviceIO: ServiceIO, mixedFiles: boolean | FilesServiceConfig) {
    if (mixedFiles) {
      const defFormats = {acceptedFormats: ''};
      serviceIO.fileTypes.mixedFiles = BuildFileTypes.parseConfig(serviceIO.requestSettings, defFormats, mixedFiles);
    }
  }

  public static build(aiAssistant: AiAssistant, serviceIO: ServiceIO, defaultFileTypes?: ServiceFileTypes) {
    if (defaultFileTypes?.images || aiAssistant.images)
      BuildFileTypes.processImagesConfig(serviceIO, aiAssistant, defaultFileTypes?.images);
    BuildFileTypes.processCamera(serviceIO, aiAssistant.camera, aiAssistant.images);
    if (defaultFileTypes?.audio || aiAssistant.audio)
      BuildFileTypes.processAudioConfig(serviceIO, aiAssistant, defaultFileTypes?.audio);
    BuildFileTypes.processMicrophone(serviceIO, aiAssistant.microphoneAudio, aiAssistant.audio);
    if (aiAssistant.mixedFiles) BuildFileTypes.processMixedFiles(serviceIO, aiAssistant.mixedFiles);
  }
}